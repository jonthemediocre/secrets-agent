import { createLogger } from '../utils/logger';
import { 
  MCPToolDefinition, 
  MCPOperationStatus, 
  MCPOperationState,
  MCPTaskPayload,
  MCPTaskResult
} from '../types/interfaces';
import { MCPBridgeCore } from '../services/MCPBridgeCore';
import { MCPBridgeConfig } from '../config/MCPBridgeConfig';

const logger = createLogger('MCPBridgeAgent');

export class MCPBridgeAgent {
  private bridgeCore: MCPBridgeCore;
  private initialized = false;

  constructor(private config: MCPBridgeConfig) {
    this.bridgeCore = new MCPBridgeCore(config.getCoreConfig());
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing MCPBridgeAgent');
      await this.bridgeCore.initialize();
      this.initialized = true;
      logger.info('MCPBridgeAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MCPBridgeAgent', { error });
      throw error;
    }
  }

  async listTools(): Promise<MCPToolDefinition[]> {
    if (!this.initialized) {
      throw new Error('MCPBridgeAgent not initialized');
    }

    try {
      const tools = await this.bridgeCore.listTools();
      return tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        required: [],
        endpoint: 'default',
        category: tool.category || 'general',
        version: '1.0.0',
        enabled: true
      }));
    } catch (error) {
      logger.error('Failed to list tools', { error });
      throw error;
    }
  }

  async executeTask(payload: MCPTaskPayload): Promise<MCPTaskResult> {
    if (!this.initialized) {
      throw new Error('MCPBridgeAgent not initialized');
    }

    const startTime = Date.now();
    
    try {
      logger.info('Executing task', { payload });
      
      const result = await this.bridgeCore.executeTool(
        payload.toolName,
        payload.parameters || {}
      );

      const executionTime = Date.now() - startTime;

      return {
        success: result.status === 'success',
        data: result.result,
        executionTime,
        metadata: {
          jobId: payload.jobId,
          toolName: payload.toolName
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Failed to execute task', { error, payload });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        metadata: {
          jobId: payload.jobId,
          toolName: payload.toolName
        }
      };
    }
  }

  async checkTaskStatus(taskId: string): Promise<MCPOperationStatus> {
    if (!this.initialized) {
      throw new Error('MCPBridgeAgent not initialized');
    }

    try {
      const status = await this.bridgeCore.getStatus(taskId);
      return {
        operationId: taskId,
        status: this.mapJobStatusToOperationState(status.status),
        startTime: status.start_time,
        endTime: status.end_time,
        progress: status.progress || 0,
        bridgeId: 'default',
        toolName: 'unknown',
        result: status.result,
        error: status.error
      };
    } catch (error) {
      logger.error('Failed to check task status', { error, taskId });
      return {
        operationId: taskId,
        status: MCPOperationState.FAILED,
        startTime: new Date(),
        progress: 0,
        bridgeId: 'default',
        toolName: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private mapJobStatusToOperationState(status: string): MCPOperationState {
    switch (status.toLowerCase()) {
      case 'pending':
        return MCPOperationState.PENDING;
      case 'running':
        return MCPOperationState.RUNNING;
      case 'completed':
        return MCPOperationState.COMPLETED;
      case 'failed':
      case 'error':
        return MCPOperationState.FAILED;
      case 'cancelled':
        return MCPOperationState.CANCELLED;
      default:
        return MCPOperationState.PENDING;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down MCPBridgeAgent');
    this.initialized = false;
    // Additional cleanup if needed
  }
} 