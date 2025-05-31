import axios, { AxiosInstance } from 'axios';

export interface AIClientConfig {
  gatewayUrl: string;
  appId: string;
  apiKey?: string;
  timeout?: number;
}

export interface VantaChatRequest {
  message: string;
  context?: any;
  stream?: boolean;
}

export interface VantaAnalyzeRequest {
  data: any;
  analysisType: 'security' | 'compliance' | 'vulnerability' | 'code-review';
  options?: any;
}

export interface VantaGenerateRequest {
  prompt: string;
  options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  };
}

export interface AIResponse<T = any> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    tokens: number;
    cost: number;
  };
}

export interface UsageStats {
  appId: string;
  stats: {
    [date: string]: {
      totalTokens: number;
      totalCost: number;
      requestCount: number;
      methods: { [method: string]: number };
    };
  };
}

export class AIClient {
  private client: AxiosInstance;
  private config: AIClientConfig;
  private ws: WebSocket | null = null;

  constructor(config: AIClientConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.gatewayUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-App-ID': config.appId,
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[AI Gateway] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[AI Gateway] Request failed:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Vanta AI Chat
  async chat(request: VantaChatRequest): Promise<AIResponse> {
    try {
      const response = await this.client.post('/ai/vanta/chat', {
        ...request,
        appId: this.config.appId
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Chat request failed: ${error.response?.data?.error || error.message}`);
    }
  }

  // Vanta AI Analysis  
  async analyze(request: VantaAnalyzeRequest): Promise<AIResponse> {
    try {
      const response = await this.client.post('/ai/vanta/analyze', {
        ...request,
        appId: this.config.appId
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Analysis request failed: ${error.response?.data?.error || error.message}`);
    }
  }

  // Vanta AI Generation
  async generate(request: VantaGenerateRequest): Promise<AIResponse> {
    try {
      const response = await this.client.post('/ai/vanta/generate', {
        ...request,
        appId: this.config.appId
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Generation request failed: ${error.response?.data?.error || error.message}`);
    }
  }

  // Generic AI request
  async request(service: string, method: string, parameters: any): Promise<AIResponse> {
    try {
      const response = await this.client.post('/ai/request', {
        service,
        method,
        parameters,
        requesterApp: this.config.appId
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`AI request failed: ${error.response?.data?.error || error.message}`);
    }
  }

  // Get usage statistics
  async getUsageStats(days: number = 7): Promise<UsageStats> {
    try {
      const response = await this.client.get(`/ai/usage/${this.config.appId}?days=${days}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Usage stats request failed: ${error.response?.data?.error || error.message}`);
    }
  }

  // WebSocket connection for real-time AI
  connectWebSocket(onMessage?: (data: any) => void): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.gatewayUrl.replace('http', 'ws');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[AI Gateway] WebSocket connected');
        resolve(this.ws!);
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('[AI Gateway] WebSocket message:', data);
        if (onMessage) {
          onMessage(data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[AI Gateway] WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('[AI Gateway] WebSocket closed');
        this.ws = null;
      };
    });
  }

  // Send real-time AI request via WebSocket
  sendRealtimeRequest(service: string, method: string, parameters: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected. Call connectWebSocket() first.');
    }

    this.ws.send(JSON.stringify({
      type: 'ai_request',
      data: {
        requestId: Math.random().toString(36).substr(2, 9),
        service,
        method,
        parameters,
        requesterApp: this.config.appId
      }
    }));
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  // Disconnect WebSocket
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Convenience functions for ecosystem integration
export class SecretsAgentAI {
  private client: AIClient;

  constructor(gatewayUrl: string = 'http://localhost:3001') {
    this.client = new AIClient({
      gatewayUrl,
      appId: 'secrets-agent-core'
    });
  }

  // Security analysis for secret patterns
  async analyzeSecrets(secrets: any[]): Promise<AIResponse> {
    return this.client.analyze({
      data: secrets,
      analysisType: 'security',
      options: {
        checkPatterns: true,
        detectVulnerabilities: true,
        assessCompliance: true
      }
    });
  }

  // Generate secure configurations
  async generateSecureConfig(prompt: string): Promise<AIResponse> {
    return this.client.generate({
      prompt: `Generate secure configuration for: ${prompt}`,
      options: {
        maxTokens: 1000,
        temperature: 0.3 // Lower temperature for more deterministic security configs
      }
    });
  }

  // Compliance checking
  async checkCompliance(data: any, standard: string): Promise<AIResponse> {
    return this.client.analyze({
      data,
      analysisType: 'compliance',
      options: {
        standard,
        generateReport: true
      }
    });
  }

  // Chat for security assistance
  async securityChat(message: string, context?: any): Promise<AIResponse> {
    return this.client.chat({
      message,
      context: {
        domain: 'security',
        ...context
      }
    });
  }
}

// Export for easy ecosystem integration
export default AIClient; 