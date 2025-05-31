import { createLogger } from '../utils/logger';
import { MCPToolsRegistryLoader } from '../config/MCPToolsRegistry';
import { EventEmitter } from 'events';

const logger = createLogger('MCPServer');

export interface MCPRequest {
  toolCategory: string;
  toolName: string;
  parameters: Record<string, any>;
  metadata?: {
    agentId?: string;
    sessionId?: string;
    timestamp?: number;
  };
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime?: number;
    toolVersion?: string;
    timestamp?: number;
  };
}

export interface MCPServerConfig {
  port?: number;
  host?: string;
  maxConcurrentRequests?: number;
  timeoutMs?: number;
}

export class MCPServer extends EventEmitter {
  public registry: MCPToolsRegistryLoader;
  private config: Required<MCPServerConfig>;
  private activeRequests: Set<string> = new Set();

  constructor(config: MCPServerConfig = {}) {
    super();
    this.registry = MCPToolsRegistryLoader.getInstance();
    this.config = {
      port: config.port || 3000,
      host: config.host || 'localhost',
      maxConcurrentRequests: config.maxConcurrentRequests || 100,
      timeoutMs: config.timeoutMs || 30000
    };
  }

  /**
   * Initialize the MCP server
   */
  public async initialize(): Promise<void> {
    try {
      await this.registry.loadRegistry();
      logger.info('MCP Server initialized', {
        version: this.registry.getVersion(),
        config: this.config
      });
      this.emit('ready');
    } catch (error) {
      logger.error('Failed to initialize MCP Server', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Handle an incoming request from an AI agent
   */
  public async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const requestId = `${request.toolCategory}.${request.toolName}-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Check concurrent request limit
      if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
        throw new Error('Maximum concurrent requests exceeded');
      }

      this.activeRequests.add(requestId);
      logger.info('Processing MCP request', { requestId, request });

      // Validate the tool exists
      const tool = this.registry.getTool(request.toolCategory, request.toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${request.toolCategory}.${request.toolName}`);
      }

      // Validate parameters
      const validation = this.registry.validateParameters(
        request.toolCategory,
        request.toolName,
        request.parameters
      );

      if (!validation.valid) {
        throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
      }

      // Get implementation details
      const implementation = this.registry.getImplementation(tool.implementation);
      if (!implementation) {
        throw new Error(`Implementation not found: ${tool.implementation}`);
      }

      // Execute the tool
      const result = await this.executeTool(tool, implementation, request.parameters);

      const response: MCPResponse = {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
          toolVersion: this.registry.getVersion()
        }
      };

      logger.info('MCP request completed', { 
        requestId, 
        executionTime: response.metadata?.executionTime 
      });
      return response;

    } catch (error) {
      logger.error('MCP request failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          toolVersion: this.registry.getVersion()
        }
      };

    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Execute a tool based on its implementation type
   */
  private async executeTool(
    tool: any,
    implementation: any,
    parameters: Record<string, any>
  ): Promise<any> {
    switch (implementation.type) {
      case 'internal':
        return this.executeInternalTool(implementation, parameters);
      
      case 'cli':
        return this.executeCliTool(implementation, parameters);
      
      default:
        throw new Error(`Unsupported implementation type: ${implementation.type}`);
    }
  }

  /**
   * Execute an internal tool implementation
   */
  private async executeInternalTool(
    implementation: any,
    parameters: Record<string, any>
  ): Promise<any> {
    // If module is specified, dynamically import and execute
    if (implementation.module) {
      const module = await import(`../implementations/${implementation.module}`);
      return module.default(parameters);
    }

    // Otherwise execute native implementation
    return this.executeNativeImplementation(parameters);
  }

  /**
   * Execute a CLI tool implementation
   */
  private async executeCliTool(
    implementation: any,
    parameters: Record<string, any>
  ): Promise<any> {
    // Implementation for CLI tool execution
    throw new Error('CLI tool execution not implemented yet');
  }

  /**
   * Execute native tool implementation
   */
  private async executeNativeImplementation(parameters: Record<string, any>): Promise<any> {
    // Implementation for native tool execution
    throw new Error('Native implementation not implemented yet');
  }

  /**
   * Stop the MCP server
   */
  public async stop(): Promise<void> {
    logger.info('Stopping MCP Server');
    // Cleanup code here
    this.emit('stopped');
  }
} 