import { createLogger } from '../utils/logger';
import { BaseError, ErrorCategory, ErrorSeverity, ErrorMetadata } from '../utils/error-types';

const logger = createLogger('MCPBridgeCore');

export interface MCPBridgeCoreConfig {
  environment: string;
  autoStart: boolean;
  mcp_api_url?: string;
  mcp_api_key?: string;
  timeout?: number;
  retry_config?: {
    max_retries: number;
    backoff_factor: number;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  category?: string;
  metadata?: Record<string, any>;
}

export interface MCPJobStatus {
  job_id: string;
  status: string;
  progress?: number;
  result?: any;
  error?: string;
  start_time: Date;
  end_time?: Date;
}

export interface MCPJobRequest {
  job_id: string;
  tool_name: string;
  parameters: Record<string, any>;
}

export interface MCPBridgeError {
  status: 'error' | 'failure';
  message: string;
  details: string;
  mcp_response_text?: string;
}

/**
 * MCPBridgeCore - Low-level HTTP communication with external MCP services
 * Based on FamilyDocRepo documentation patterns
 */
export class MCPBridgeCore {
  private config: Required<MCPBridgeCoreConfig>;
  private isInitialized = false;

  constructor(config: MCPBridgeCoreConfig) {
    this.config = {
      ...config,
      mcp_api_url: config.mcp_api_url || process.env.MCP_API_URL || 'http://localhost:3000',
      mcp_api_key: config.mcp_api_key || process.env.MCP_API_KEY || '',
      timeout: config.timeout || 30000,
      retry_config: {
        max_retries: config.retry_config?.max_retries || 3,
        backoff_factor: config.retry_config?.backoff_factor || 0.5
      }
    };
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('MCPBridgeCore is already initialized');
      return;
    }

    try {
      logger.info('Initializing MCPBridgeCore');
      await this.validateConfig();
      this.isInitialized = true;
      logger.info('MCPBridgeCore initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MCPBridgeCore', { error });
      throw error;
    }
  }

  private async validateConfig(): Promise<void> {
    if (!this.config.environment) {
      throw new BaseError('Environment is required', {
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retryable: false
      });
    }

    if (!this.config.mcp_api_url) {
      throw new BaseError('MCP API URL is required', {
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retryable: false
      });
    }

    if (this.config.environment === 'production' && !this.config.mcp_api_key) {
      throw new BaseError('MCP API Key is required in production environment', {
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retryable: false
      });
    }
  }

  public async listTools(): Promise<MCPTool[]> {
    if (!this.isInitialized) {
      throw new Error('MCPBridgeCore is not initialized');
    }

    try {
      logger.info('Listing available tools');
      const response = await this.makeRequest('GET', '/tools');
      return response.tools || [];
    } catch (error) {
      logger.error('Failed to list tools', { error });
      throw this.handleError('Failed to list tools', error);
    }
  }

  public async executeJob(jobId: string, toolName: string, parameters: Record<string, any>): Promise<MCPJobStatus> {
    if (!this.isInitialized) {
      throw new Error('MCPBridgeCore is not initialized');
    }

    try {
      logger.info('Executing job', { jobId, toolName, parameters });
      const jobRequest: MCPJobRequest = {
        job_id: jobId,
        tool_name: toolName,
        parameters
      };

      const response = await this.makeRequest('POST', '/jobs', jobRequest);

      return {
        job_id: jobId,
        status: response.status || 'completed',
        result: response.result,
        start_time: new Date(),
        end_time: response.status === 'completed' ? new Date() : undefined
      };
    } catch (error) {
      logger.error('Failed to execute job', { error, jobId, toolName });
      throw this.handleError('Failed to execute job', error);
    }
  }

  public async checkJobStatus(jobId: string): Promise<MCPJobStatus> {
    if (!this.isInitialized) {
      throw new Error('MCPBridgeCore is not initialized');
    }

    try {
      logger.info('Checking job status', { jobId });
      const response = await this.makeRequest('GET', `/jobs/${jobId}`);

      return {
        job_id: jobId,
        status: response.status || 'completed',
        progress: response.progress,
        result: response.result,
        error: response.error,
        start_time: new Date(response.start_time || Date.now()),
        end_time: response.end_time ? new Date(response.end_time) : undefined
      };
    } catch (error) {
      logger.error('Failed to check job status', { error, jobId });
      throw this.handleError('Failed to check job status', error);
    }
  }

  private async makeRequest(method: string, path: string, body?: Record<string, any>): Promise<any> {
    const url = new URL(path, this.config.mcp_api_url);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'MCP-Bridge/1.0'
    };

    if (this.config.mcp_api_key) {
      headers['Authorization'] = `Bearer ${this.config.mcp_api_key}`;
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw this.handleError('Request failed', error);
    }
  }

  private handleError(message: string, error: unknown): BaseError {
    if (error instanceof BaseError) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const metadata: ErrorMetadata = {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      source: 'MCPBridgeCore',
      details: { error: errorMessage }
    };

    return new BaseError(message, metadata);
  }

  public getConfig(): MCPBridgeCoreConfig {
    return this.config;
  }

  async discoverTools(): Promise<{ status: string; result?: MCPTool[]; error_message?: string }> {
    try {
      // Implementation would go here
      // For now, return mock data
      return {
        status: 'success',
        result: [
          {
            name: 'file_read',
            description: 'Read file contents',
            category: 'file_operations',
            parameters: {
              path: { type: 'string', required: true }
            }
          },
          {
            name: 'file_write',
            description: 'Write file contents',
            category: 'file_operations',
            parameters: {
              path: { type: 'string', required: true },
              content: { type: 'string', required: true }
            }
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to discover tools', { error });
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async executeTool(
    toolName: string,
    parameters: Record<string, any>
  ): Promise<{ status: string; result?: any; error_message?: string }> {
    try {
      // Implementation would go here
      // For now, return mock success
      return {
        status: 'success',
        result: { message: 'Tool executed successfully' }
      };
    } catch (error) {
      logger.error('Failed to execute tool', { toolName, error });
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get status of a running job
   */
  async getStatus(jobId: string): Promise<MCPJobStatus> {
    if (!this.isInitialized) {
      throw new Error('MCPBridgeCore is not initialized');
    }

    try {
      logger.info('Getting job status', { jobId });
      const response = await this.makeRequest('GET', `/jobs/${jobId}/status`);
      
      return {
        job_id: jobId,
        status: response.status || 'completed',
        progress: response.progress,
        result: response.result,
        error: response.error,
        start_time: new Date(response.start_time || Date.now()),
        end_time: response.end_time ? new Date(response.end_time) : undefined
      };
    } catch (error) {
      logger.error('Failed to get job status', { error, jobId });
      throw this.handleError('Failed to get job status', error);
    }
  }

  /**
   * Test connection to MCP service
   */
  async testConnection(): Promise<boolean> {
    logger.info('Testing MCP connection');
    
    try {
      await this.listTools();
      logger.info('MCP connection test successful');
      return true;
    } catch (error) {
      logger.error('MCP connection test failed', { error: String(error) });
      return false;
    }
  }

  /**
   * Create standardized MCP error
   */
  private createMCPError(action: string, originalError: Error | unknown): Error {
    const errorMessage = originalError instanceof Error ? originalError.message : String(originalError);
    
    return new BaseError(`MCP Bridge error during ${action}: ${errorMessage}`, {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      details: {
        action,
        originalError: errorMessage
      }
    });
  }
} 