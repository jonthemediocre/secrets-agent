import { MCPBridgeService } from '../../../src/services/MCPBridgeService';
import { MCPBridgeCore } from '../../../src/services/MCPBridgeCore';
import { MCPOperationState, MCPEndpointConfig } from '../../../src/types/interfaces';
import { BaseError, ErrorCategory, ErrorSeverity } from '../../../src/utils/error-types';

// Mock dependencies
jest.mock('../../../src/services/MCPBridgeCore');
jest.mock('../../../src/utils/logger');

describe('MCPBridgeService', () => {
  let service: MCPBridgeService;
  let mockBridgeCore: jest.Mocked<MCPBridgeCore>;

  const mockConfig = {
    environment: 'test',
    autoStart: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (MCPBridgeService as any).instance = null;
    
    // Setup mock bridge core
    mockBridgeCore = {
      initialize: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue([
        {
          name: 'test-tool',
          description: 'Test tool description',
          parameters: { param1: 'string' },
          category: 'test'
        }
      ]),
      executeTool: jest.fn().mockResolvedValue({
        status: 'success',
        result: { message: 'Tool executed successfully' }
      }),
      getStatus: jest.fn().mockResolvedValue({
        job_id: 'test-job',
        status: 'completed',
        start_time: new Date(),
        progress: 100
      }),
      testConnection: jest.fn().mockResolvedValue(true)
    } as any;

    (MCPBridgeCore as jest.MockedClass<typeof MCPBridgeCore>).mockImplementation(() => mockBridgeCore);
    
    service = MCPBridgeService.getInstance(mockConfig);
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await service.initialize();
      
      expect(mockBridgeCore.initialize).toHaveBeenCalledTimes(1);
      expect(service.getStatus().status).toBe('running');
    });

    it('should handle initialization errors', async () => {
      const error = new BaseError('Initialization failed', {
        category: ErrorCategory.INITIALIZATION,
        severity: ErrorSeverity.HIGH,
        retryable: false
      });
      
      mockBridgeCore.initialize.mockRejectedValue(error);
      
      await expect(service.initialize()).rejects.toThrow('Initialization failed');
      expect(service.getStatus().status).toBe('error');
      expect(service.getStatus().lastError).toBe('Initialization failed');
    });

    it('should not initialize twice', async () => {
      await service.initialize();
      await service.initialize(); // Second call
      
      expect(mockBridgeCore.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Tool Discovery', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should discover tools successfully', async () => {
      const result = await service.discoverTools();
      
      expect(mockBridgeCore.listTools).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(MCPOperationState.COMPLETED);
      expect(result.result).toHaveLength(1);
      expect(result.result[0]).toMatchObject({
        name: 'test-tool',
        description: 'Test tool description',
        category: 'test'
      });
    });

    it('should handle tool discovery errors', async () => {
      const error = new Error('Discovery failed');
      mockBridgeCore.listTools.mockRejectedValue(error);
      
      const result = await service.discoverTools();
      
      expect(result.status).toBe(MCPOperationState.FAILED);
      expect(result.error).toBe('Discovery failed');
    });

    it('should cache discovered tools', async () => {
      await service.discoverTools();
      const status = service.getStatus();
      
      expect(status.toolCount).toBe(1);
      expect(status.toolsCached).toBe(1);
    });
  });

  describe('Task Execution', () => {
    const mockPayload = {
      action: 'execute',
      toolName: 'test-tool',
      jobId: 'test-job-123',
      parameters: { param1: 'value1' }
    };

    beforeEach(async () => {
      await service.initialize();
    });

    it('should execute task successfully', async () => {
      const result = await service.executeTask(mockPayload);
      
      expect(mockBridgeCore.executeTool).toHaveBeenCalledWith(
        'test-tool',
        { param1: 'value1' }
      );
      expect(result.success).toBe(true);
      expect(result.metadata).toMatchObject({
        jobId: 'test-job-123',
        toolName: 'test-tool'
      });
    });

    it('should handle task execution errors', async () => {
      mockBridgeCore.executeTool.mockResolvedValue({
        status: 'error',
        error_message: 'Execution failed'
      });
      
      const result = await service.executeTask(mockPayload);
      
      expect(result.success).toBe(false);
    });

    it('should handle missing parameters', async () => {
      const payloadWithoutParams = {
        ...mockPayload,
        parameters: undefined
      };
      
      const result = await service.executeTask(payloadWithoutParams);
      
      expect(mockBridgeCore.executeTool).toHaveBeenCalledWith('test-tool', {});
      expect(result.success).toBe(true);
    });
  });

  describe('Task Status Checking', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should check task status successfully', async () => {
      const result = await service.checkTaskStatus('test-job');
      
      expect(mockBridgeCore.getStatus).toHaveBeenCalledWith('test-job');
      expect(result.operationId).toBe('test-job');
      expect(result.status).toBe(MCPOperationState.COMPLETED);
      expect(result.progress).toBe(100);
    });

    it('should handle status check errors', async () => {
      const error = new Error('Status check failed');
      mockBridgeCore.getStatus.mockRejectedValue(error);
      
      const result = await service.checkTaskStatus('test-job');
      
      expect(result.status).toBe(MCPOperationState.FAILED);
      expect(result.error).toBe('Status check failed');
    });

    it('should map job status correctly', async () => {
      const testCases = [
        { jobStatus: 'pending', expected: MCPOperationState.PENDING },
        { jobStatus: 'running', expected: MCPOperationState.RUNNING },
        { jobStatus: 'completed', expected: MCPOperationState.COMPLETED },
        { jobStatus: 'failed', expected: MCPOperationState.FAILED },
        { jobStatus: 'error', expected: MCPOperationState.FAILED },
        { jobStatus: 'cancelled', expected: MCPOperationState.CANCELLED },
        { jobStatus: 'unknown', expected: MCPOperationState.PENDING }
      ];

      for (const testCase of testCases) {
        mockBridgeCore.getStatus.mockResolvedValue({
          job_id: 'test-job',
          status: testCase.jobStatus,
          start_time: new Date()
        });

        const result = await service.checkTaskStatus('test-job');
        expect(result.status).toBe(testCase.expected);
      }
    });
  });

  describe('Bridge Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should list bridges', async () => {
      const bridges = await service.listBridges();
      expect(Array.isArray(bridges)).toBe(true);
    });

    it('should list tools', async () => {
      const tools = await service.listTools();
      expect(Array.isArray(tools)).toBe(true);
    });

    it('should list tools for specific bridge', async () => {
      const tools = await service.listTools('test-bridge');
      expect(Array.isArray(tools)).toBe(true);
    });

    it('should register bridge successfully', async () => {
      const bridgeConfig: MCPEndpointConfig = {
        id: 'test-bridge',
        name: 'Test Bridge',
        baseUrl: 'http://localhost:3000',
        enabled: true,
        type: 'custom'
      };

      await expect(service.registerBridge(bridgeConfig)).resolves.not.toThrow();
    });

    it('should validate bridge configuration', async () => {
      const invalidConfig = {
        id: '',
        name: '',
        baseUrl: '',
        enabled: true,
        type: 'custom'
      } as MCPEndpointConfig;

      await expect(service.registerBridge(invalidConfig))
        .rejects.toThrow('Invalid bridge configuration');
    });

    it('should test connection successfully', async () => {
      const bridgeConfig: MCPEndpointConfig = {
        id: 'test-bridge',
        name: 'Test Bridge',
        baseUrl: 'http://localhost:3000',
        enabled: true,
        type: 'custom'
      };

      await service.registerBridge(bridgeConfig);
      const result = await service.testConnection('test-bridge');
      
      expect(result).toBe(true);
      expect(mockBridgeCore.testConnection).toHaveBeenCalledTimes(1);
    });

    it('should handle connection test for non-existent bridge', async () => {
      await expect(service.testConnection('non-existent'))
        .rejects.toThrow('Bridge not found: non-existent');
    });
  });

  describe('Service Status', () => {
    it('should return correct status when stopped', () => {
      const status = service.getStatus();
      
      expect(status.status).toBe('stopped');
      expect(status.bridgeCount).toBe(0);
      expect(status.toolCount).toBe(0);
      expect(status.activeJobs).toBe(0);
    });

    it('should return correct status when running', async () => {
      await service.initialize();
      const status = service.getStatus();
      
      expect(status.status).toBe('running');
      expect(status.uptime).toBeGreaterThan(0);
    });

    it('should calculate uptime correctly', async () => {
      await service.initialize();
      
      // Wait a bit to ensure uptime changes
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const status = service.getStatus();
      expect(status.uptime).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return configuration summary', () => {
      const summary = service.getConfigSummary();
      
      expect(summary).toHaveProperty('bridges');
      expect(summary).toHaveProperty('tools');
      expect(summary).toHaveProperty('environment');
      expect(typeof summary.bridges).toBe('number');
      expect(typeof summary.tools).toBe('number');
    });

    it('should reload configuration', async () => {
      await expect(service.reload()).resolves.not.toThrow();
      expect(service.getStatus().status).toBe('running');
    });
  });

  describe('Shutdown and Cleanup', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should shutdown gracefully', async () => {
      expect(service.getStatus().status).toBe('running');
      
      await service.shutdown();
      
      expect(service.getStatus().status).toBe('stopped');
    });

    it('should handle multiple shutdown calls', async () => {
      await service.shutdown();
      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when not initialized', async () => {
      await expect(service.discoverTools())
        .rejects.toThrow('MCPBridgeService is not initialized');
    });

    it('should handle core service errors gracefully', async () => {
      mockBridgeCore.initialize.mockResolvedValue(undefined);
      await service.initialize();
      
      const error = new BaseError('Core service error', {
        category: ErrorCategory.RUNTIME,
        severity: ErrorSeverity.HIGH,
        retryable: true
      });
      
      mockBridgeCore.listTools.mockRejectedValue(error);
      
      const result = await service.discoverTools();
      expect(result.status).toBe(MCPOperationState.FAILED);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = MCPBridgeService.getInstance(mockConfig);
      const instance2 = MCPBridgeService.getInstance(mockConfig);
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', async () => {
      const instance1 = MCPBridgeService.getInstance(mockConfig);
      await instance1.initialize();
      
      const instance2 = MCPBridgeService.getInstance(mockConfig);
      expect(instance2.getStatus().status).toBe('running');
    });
  });
}); 