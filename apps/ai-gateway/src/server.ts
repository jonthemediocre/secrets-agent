import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'redis';
import winston from 'winston';
import joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Types
interface VaultCredentials {
  vantaApiKey: string;
  vantaBaseUrl: string;
  vantaProjectId: string;
}

interface AIRequest {
  requestId: string;
  service: 'vanta';
  method: string;
  parameters: any;
  requesterApp: string;
  userId?: string;
}

interface AIResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    tokens: number;
    cost: number;
  };
}

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'ai-gateway-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'ai-gateway.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class AIGateway {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private redis: Redis.RedisClientType;
  private rateLimiter: RateLimiterRedis;
  private vaultBaseUrl: string;
  private vaultToken: string;

  constructor() {
    this.app = express();
    this.vaultBaseUrl = process.env.VAULT_BASE_URL || 'http://localhost:3000';
    this.vaultToken = process.env.VAULT_ACCESS_TOKEN || '';
    
    this.setupRedis();
    this.setupRateLimiting();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private async setupRedis() {
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.redis.on('error', (err) => {
      logger.error('Redis Client Error', err);
    });

    await this.redis.connect();
    logger.info('Connected to Redis');
  }

  private setupRateLimiting() {
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyPrefix: 'ai_gateway',
      points: 100, // Number of requests
      duration: 60, // Per 60 seconds
    });
  }

  private setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      next();
    });

    // Rate limiting middleware
    this.app.use(async (req, res, next) => {
      try {
        const key = req.ip;
        await this.rateLimiter.consume(key);
        next();
      } catch (rejRes) {
        res.status(429).json({ 
          error: 'Too Many Requests',
          retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 1
        });
      }
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // AI Request endpoint
    this.app.post('/ai/request', this.handleAIRequest.bind(this));

    // Vanta AI specific endpoints
    this.app.post('/ai/vanta/chat', this.handleVantaChat.bind(this));
    this.app.post('/ai/vanta/analyze', this.handleVantaAnalyze.bind(this));
    this.app.post('/ai/vanta/generate', this.handleVantaGenerate.bind(this));

    // Usage statistics
    this.app.get('/ai/usage/:appId', this.getUsageStats.bind(this));

    // Error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        requestId: uuidv4()
      });
    });
  }

  private setupWebSocket() {
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws, req) => {
      logger.info('New WebSocket connection established');

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleWebSocketMessage(ws, message);
        } catch (error) {
          logger.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ 
            error: 'Invalid message format' 
          }));
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
      });
    });
  }

  // Vault integration for credentials
  private async getVaultCredentials(): Promise<VaultCredentials> {
    try {
      const response = await axios.get(`${this.vaultBaseUrl}/api/secrets`, {
        headers: {
          'Authorization': `Bearer ${this.vaultToken}`,
          'Content-Type': 'application/json'
        }
      });

      const secrets = response.data;
      
      return {
        vantaApiKey: secrets.find((s: any) => s.key === 'VANTA_AI_API_KEY')?.value || '',
        vantaBaseUrl: secrets.find((s: any) => s.key === 'VANTA_AI_BASE_URL')?.value || 'https://api.vanta.ai',
        vantaProjectId: secrets.find((s: any) => s.key === 'VANTA_AI_PROJECT_ID')?.value || ''
      };
    } catch (error) {
      logger.error('Failed to fetch credentials from vault:', error);
      throw new Error('Vault authentication failed');
    }
  }

  // AI Request handlers
  private async handleAIRequest(req: express.Request, res: express.Response) {
    const requestId = uuidv4();
    
    try {
      const schema = joi.object({
        service: joi.string().valid('vanta').required(),
        method: joi.string().required(),
        parameters: joi.object().required(),
        requesterApp: joi.string().required(),
        userId: joi.string().optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          error: error.details[0].message,
          requestId 
        });
      }

      const aiRequest: AIRequest = { requestId, ...value };
      const response = await this.processAIRequest(aiRequest);
      
      res.json(response);
    } catch (error) {
      logger.error('AI Request failed:', error);
      res.status(500).json({ 
        error: 'AI request failed',
        requestId 
      });
    }
  }

  private async handleVantaChat(req: express.Request, res: express.Response) {
    const requestId = uuidv4();
    
    try {
      const { message, context, appId } = req.body;
      const credentials = await this.getVaultCredentials();

      const vantaResponse = await axios.post(`${credentials.vantaBaseUrl}/v1/chat`, {
        message,
        context,
        project_id: credentials.vantaProjectId
      }, {
        headers: {
          'Authorization': `Bearer ${credentials.vantaApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // Log usage
      await this.logUsage(appId, 'chat', vantaResponse.data.usage);

      res.json({
        requestId,
        success: true,
        data: vantaResponse.data,
        usage: vantaResponse.data.usage
      });

    } catch (error) {
      logger.error('Vanta Chat failed:', error);
      res.status(500).json({ 
        error: 'Vanta AI chat failed',
        requestId 
      });
    }
  }

  private async handleVantaAnalyze(req: express.Request, res: express.Response) {
    const requestId = uuidv4();
    
    try {
      const { data, analysisType, appId } = req.body;
      const credentials = await this.getVaultCredentials();

      const vantaResponse = await axios.post(`${credentials.vantaBaseUrl}/v1/analyze`, {
        data,
        analysis_type: analysisType,
        project_id: credentials.vantaProjectId
      }, {
        headers: {
          'Authorization': `Bearer ${credentials.vantaApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // Log usage
      await this.logUsage(appId, 'analyze', vantaResponse.data.usage);

      res.json({
        requestId,
        success: true,
        data: vantaResponse.data,
        usage: vantaResponse.data.usage
      });

    } catch (error) {
      logger.error('Vanta Analyze failed:', error);
      res.status(500).json({ 
        error: 'Vanta AI analysis failed',
        requestId 
      });
    }
  }

  private async handleVantaGenerate(req: express.Request, res: express.Response) {
    const requestId = uuidv4();
    
    try {
      const { prompt, options, appId } = req.body;
      const credentials = await this.getVaultCredentials();

      const vantaResponse = await axios.post(`${credentials.vantaBaseUrl}/v1/generate`, {
        prompt,
        options,
        project_id: credentials.vantaProjectId
      }, {
        headers: {
          'Authorization': `Bearer ${credentials.vantaApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // Log usage
      await this.logUsage(appId, 'generate', vantaResponse.data.usage);

      res.json({
        requestId,
        success: true,
        data: vantaResponse.data,
        usage: vantaResponse.data.usage
      });

    } catch (error) {
      logger.error('Vanta Generate failed:', error);
      res.status(500).json({ 
        error: 'Vanta AI generation failed',
        requestId 
      });
    }
  }

  private async processAIRequest(request: AIRequest): Promise<AIResponse> {
    const credentials = await this.getVaultCredentials();

    switch (request.service) {
      case 'vanta':
        return await this.processVantaRequest(request, credentials);
      default:
        throw new Error(`Unsupported AI service: ${request.service}`);
    }
  }

  private async processVantaRequest(request: AIRequest, credentials: VaultCredentials): Promise<AIResponse> {
    try {
      const response = await axios.post(`${credentials.vantaBaseUrl}/v1/${request.method}`, {
        ...request.parameters,
        project_id: credentials.vantaProjectId
      }, {
        headers: {
          'Authorization': `Bearer ${credentials.vantaApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      // Log usage
      await this.logUsage(request.requesterApp, request.method, response.data.usage);

      return {
        requestId: request.requestId,
        success: true,
        data: response.data,
        usage: response.data.usage
      };

    } catch (error) {
      logger.error('Vanta request failed:', error);
      return {
        requestId: request.requestId,
        success: false,
        error: 'Vanta AI request failed'
      };
    }
  }

  private async handleWebSocketMessage(ws: any, message: any) {
    if (message.type === 'ai_request') {
      const response = await this.processAIRequest(message.data);
      ws.send(JSON.stringify({
        type: 'ai_response',
        data: response
      }));
    }
  }

  private async logUsage(appId: string, method: string, usage: any) {
    const usageKey = `usage:${appId}:${new Date().toISOString().split('T')[0]}`;
    const usageData = {
      method,
      tokens: usage?.tokens || 0,
      cost: usage?.cost || 0,
      timestamp: new Date().toISOString()
    };

    await this.redis.lPush(usageKey, JSON.stringify(usageData));
    await this.redis.expire(usageKey, 86400 * 30); // 30 days retention
  }

  private async getUsageStats(req: express.Request, res: express.Response) {
    try {
      const { appId } = req.params;
      const { days = 7 } = req.query;
      
      const stats: any = {};
      const now = new Date();
      
      for (let i = 0; i < Number(days); i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const usageKey = `usage:${appId}:${dateKey}`;
        
        const usageEntries = await this.redis.lRange(usageKey, 0, -1);
        const dayUsage = usageEntries.map(entry => JSON.parse(entry));
        
        stats[dateKey] = {
          totalTokens: dayUsage.reduce((sum, u) => sum + u.tokens, 0),
          totalCost: dayUsage.reduce((sum, u) => sum + u.cost, 0),
          requestCount: dayUsage.length,
          methods: dayUsage.reduce((acc, u) => {
            acc[u.method] = (acc[u.method] || 0) + 1;
            return acc;
          }, {})
        };
      }

      res.json({ appId, stats });
    } catch (error) {
      logger.error('Usage stats failed:', error);
      res.status(500).json({ error: 'Failed to fetch usage stats' });
    }
  }

  public start(port: number = 3001) {
    this.server.listen(port, () => {
      logger.info(`🤖 AI Gateway running on port ${port}`);
      logger.info(`📊 WebSocket server ready for real-time AI requests`);
      logger.info(`🔐 Integrated with Secrets Vault at ${this.vaultBaseUrl}`);
    });
  }
}

// Start the server
const gateway = new AIGateway();
gateway.start(Number(process.env.PORT) || 3001);

export default AIGateway; 