import { createLogger } from '../utils/logger';
import { EventEmitter } from 'events';
import { MCPServer, MCPRequest, MCPResponse } from './MCPServer';

const logger = createLogger('APIGateway');

export interface APIGatewayConfig {
  auth?: {
    enabled: boolean;
    apiKeyHeader?: string;
    jwtSecret?: string;
  };
  rateLimit?: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
  cors?: {
    enabled: boolean;
    origins: string[];
  };
}

export interface APIRequest extends MCPRequest {
  headers: Record<string, string>;
  ip?: string;
  path: string;
}

export interface APIResponse extends MCPResponse {
  statusCode: number;
  headers?: Record<string, string>;
}

export class APIGateway extends EventEmitter {
  private mcpServer: MCPServer;
  private config: APIGatewayConfig;
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(mcpServer: MCPServer, config: APIGatewayConfig = {}) {
    super();
    this.mcpServer = mcpServer;
    this.config = {
      auth: {
        enabled: true,
        apiKeyHeader: 'X-API-Key',
        ...config.auth
      },
      rateLimit: {
        enabled: true,
        maxRequests: 100,
        windowMs: 60000,
        ...config.rateLimit
      },
      cors: {
        enabled: true,
        origins: ['*'],
        ...config.cors
      }
    };
  }

  /**
   * Handle incoming API request
   */
  public async handleRequest(request: APIRequest): Promise<APIResponse> {
    const startTime = Date.now();

    try {
      // CORS check
      if (this.config.cors?.enabled) {
        const origin = request.headers['origin'];
        if (origin && !this.isOriginAllowed(origin)) {
          return this.createErrorResponse(403, 'Origin not allowed');
        }
      }

      // Authentication
      if (this.config.auth?.enabled) {
        const authResult = await this.authenticate(request);
        if (!authResult.success) {
          return this.createErrorResponse(401, authResult.error || 'Unauthorized');
        }
      }

      // Rate limiting
      if (this.config.rateLimit?.enabled) {
        const rateLimitResult = this.checkRateLimit(request);
        if (!rateLimitResult.success) {
          return this.createErrorResponse(429, rateLimitResult.error || 'Too many requests');
        }
      }

      // Route the request to MCP server
      const mcpResponse = await this.mcpServer.handleRequest({
        toolCategory: request.toolCategory,
        toolName: request.toolName,
        parameters: request.parameters,
        metadata: {
          ...request.metadata,
          timestamp: startTime
        }
      });

      // Transform MCP response to API response
      return {
        ...mcpResponse,
        statusCode: mcpResponse.success ? 200 : 400,
        headers: this.getResponseHeaders(request)
      };

    } catch (error) {
      logger.error('API Gateway error', {
        error: error instanceof Error ? error.message : String(error),
        path: request.path
      });

      return this.createErrorResponse(
        500,
        'Internal server error',
        error instanceof Error ? error.message : undefined
      );
    }
  }

  /**
   * Authenticate the request
   */
  private async authenticate(request: APIRequest): Promise<{ success: boolean; error?: string }> {
    if (!this.config.auth?.enabled) {
      return { success: true };
    }

    const apiKey = request.headers[this.config.auth.apiKeyHeader || 'X-API-Key'];
    if (!apiKey) {
      return { success: false, error: 'API key missing' };
    }

    // Production API key validation
    const validApiKeys = [
      process.env.SECRETS_AGENT_API_KEY,
      process.env.VANTA_API_KEY,
      process.env.MASTER_API_KEY
    ].filter(Boolean); // Remove undefined values

    // Fallback for development/testing
    if (validApiKeys.length === 0) {
      logger.warn('No valid API keys configured. Using fallback validation.');
      if (['test-key', 'dev-key', 'secrets-agent-dev'].includes(apiKey)) {
        return { success: true };
      }
    }

    // Secure comparison to prevent timing attacks
    for (const validKey of validApiKeys) {
      if (this.secureCompare(apiKey, validKey!)) {
        logger.audit('API key authentication', {
          success: true,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          severity: 'low'
        });
        return { success: true };
      }
    }

    logger.audit('API key authentication failed', {
      success: false,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      severity: 'medium',
      data: { keyPrefix: apiKey.substring(0, 8) + '...' }
    });

    return { success: false, error: 'Invalid API key' };
  }

  /**
   * Secure string comparison to prevent timing attacks
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Check rate limit for the request
   */
  private checkRateLimit(request: APIRequest): { success: boolean; error?: string } {
    if (!this.config.rateLimit?.enabled) {
      return { success: true };
    }

    const key = request.ip || 'default';
    const now = Date.now();
    const limit = this.rateLimitStore.get(key);

    if (!limit || now > limit.resetTime) {
      // Reset or initialize rate limit
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + (this.config.rateLimit.windowMs || 60000)
      });
      return { success: true };
    }

    if (limit.count >= (this.config.rateLimit.maxRequests || 100)) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((limit.resetTime - now) / 1000)}s`
      };
    }

    limit.count++;
    return { success: true };
  }

  /**
   * Check if origin is allowed (CORS)
   */
  private isOriginAllowed(origin: string): boolean {
    if (!this.config.cors?.enabled) {
      return true;
    }

    const allowedOrigins = this.config.cors.origins || ['*'];
    return allowedOrigins.includes('*') || allowedOrigins.includes(origin);
  }

  /**
   * Get response headers
   */
  private getResponseHeaders(request: APIRequest): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add CORS headers if enabled
    if (this.config.cors?.enabled && request.headers['origin']) {
      headers['Access-Control-Allow-Origin'] = this.isOriginAllowed(request.headers['origin'])
        ? request.headers['origin']
        : '';
      headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    }

    return headers;
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    statusCode: number,
    message: string,
    details?: string
  ): APIResponse {
    return {
      success: false,
      statusCode,
      error: message,
      data: details ? { details } : undefined,
      metadata: {
        timestamp: Date.now()
      }
    };
  }
} 