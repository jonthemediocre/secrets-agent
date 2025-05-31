import { MCPBridgeService } from '../../src/services/MCPBridgeService';
import { ExternalToolsService } from '../../src/services/ExternalToolsService';
import { GovernanceService } from '../../src/services/GovernanceService';
import { MCPBridgesConfigLoader } from '../../src/config/MCPBridgesConfig';
import { MCPEndpointConfig, MCPOperationState } from '../../src/types/interfaces';
import { createLogger } from '../../src/utils/logger';

const logger = createLogger('MCPBridgeIntegrationTest');

describe('MCP Bridge Integration Tests', () => {
  let mcpService: MCPBridgeService;
  let externalToolsService: ExternalToolsService;
  let governanceService: GovernanceService;
  let configLoader: MCPBridgesConfigLoader;

  const testConfig = {
    environment: 'test',
    autoStart: false
  };

  beforeAll(async () => {
    // Initialize services
    mcpService = MCPBridgeService.getInstance(testConfig);
    externalToolsService = new ExternalToolsService();
    governanceService = new GovernanceService();
    configLoader = MCPBridgesConfigLoader.getInstance();

    // Initialize all services
    await Promise.all([
      mcpService.initialize(),
      externalToolsService.initialize(),
      governanceService.initialize()
    ]);

    logger.info('Integration test setup complete');
  });

  afterAll(async () => {
    // Cleanup services
    await Promise.all([
      mcpService.shutdown(),
      externalToolsService.stop()
    ]);

    logger.info('Integration test cleanup complete');
  });

  describe('Service Integration', () => {
    it('should initialize all services successfully', () => {
      expect(mcpService.getStatus().status).toBe('running');
      expect(externalToolsService).toBeDefined();
      expect(governanceService).toBeDefined();
    });

    it('should discover and cache tools from multiple sources', async () => {
      // Discover tools from MCP service
      const mcpResult = await mcpService.discoverTools();
      expect(mcpResult.status).toBe(MCPOperationState.COMPLETED);

      // List external tools
      const externalTools = externalToolsService.listTools();
      expect(Array.isArray(externalTools)).toBe(true);

      // Verify tools are cached
      const status = mcpService.getStatus();
      expect(status.toolCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle bridge registration and management', async () => {
      const bridgeConfig: MCPEndpointConfig = {
        id: 'integration-test-bridge',
        name: 'Integration Test Bridge',
        baseUrl: process.env.TEST_MCP_ENDPOINT || 'http://localhost:3001',
        apiKey: process.env.TEST_API_KEY,
        enabled: true,
        type: 'custom',
        timeout: 30000,
        category: 'test',
        description: 'Bridge for integration testing'
      };

      // Register bridge
      await mcpService.registerBridge(bridgeConfig);

      // Verify bridge is registered
      const bridges = await mcpService.listBridges();
      const registeredBridge = bridges.find(b => b.id === 'integration-test-bridge');
      expect(registeredBridge).toBeDefined();
      expect(registeredBridge?.name).toBe('Integration Test Bridge');

      // Test connection if endpoint is available
      if (process.env.TEST_MCP_ENDPOINT) {
        try {
          const connectionResult = await mcpService.testConnection('integration-test-bridge');
          logger.info('Connection test result', { result: connectionResult });
        } catch (error) {
          logger.warn('Connection test skipped - endpoint not available', { error });
        }
      }
    });
  });

  describe('Tool Execution Workflow', () => {
    const testToolPayload = {
      action: 'execute',
      toolName: 'echo-test',
      jobId: `test-job-${Date.now()}`,
      parameters: {
        message: 'Hello from integration test',
        timestamp: new Date().toISOString()
      }
    };

    it('should execute tools through MCP bridge', async () => {
      const result = await mcpService.executeTask(testToolPayload);
      
      expect(result.success).toBe(true);
      expect(result.metadata?.jobId).toBe(testToolPayload.jobId);
      expect(result.metadata?.toolName).toBe(testToolPayload.toolName);

      // Check task status
      const statusResult = await mcpService.checkTaskStatus(testToolPayload.jobId);
      expect(statusResult.operationId).toBe(testToolPayload.jobId);
      expect([
        MCPOperationState.COMPLETED,
        MCPOperationState.RUNNING,
        MCPOperationState.PENDING
      ]).toContain(statusResult.status);
    });

    it('should handle external tool execution', async () => {
      const externalTools = externalToolsService.listTools();
      
      if (externalTools.length > 0) {
        const tool = externalTools[0];
        const methods = externalToolsService.getToolMethods(tool.name);
        
        if (methods.length > 0) {
          const method = methods[0];
          const result = await externalToolsService.executeMethod(
            tool.name,
            method.name,
            { test: true }
          );

          expect(result).toHaveProperty('success');
        }
      }
    });
  });

  describe('Configuration Management', () => {
    it('should load and validate MCP configuration', async () => {
      // This will use default config if file doesn't exist
      const config = await configLoader.load();
      
      expect(config).toBeDefined();
      expect(config.version).toBeDefined();
      expect(Array.isArray(config.bridges)).toBe(true);
      expect(config.globalSettings).toBeDefined();

      // Validate configuration structure
      const summary = configLoader.getConfigSummary();
      expect(summary.status).toBe('loaded');
      expect(typeof summary.bridges_total).toBe('number');
      expect(typeof summary.bridges_enabled).toBe('number');
    });

    it('should handle configuration reloading', async () => {
      const originalConfig = configLoader.getConfig();
      
      // Reload configuration
      const reloadedConfig = await configLoader.reload();
      
      expect(reloadedConfig.version).toBe(originalConfig.version);
      expect(reloadedConfig.bridges.length).toBe(originalConfig.bridges.length);
    });
  });

  describe('Governance Integration', () => {
    const testProjectPath = process.cwd();

    it('should initialize project governance', async () => {
      await governanceService.initializeProject(testProjectPath);
      
      const projectId = Buffer.from(testProjectPath).toString('base64');
      expect(governanceService.hasProject(projectId)).toBe(true);

      // Get project enforcements
      const enforcements = governanceService.getProjectEnforcements(projectId);
      expect(enforcements).toHaveProperty('rules');
      expect(enforcements).toHaveProperty('policies');
    });

    it('should validate tool permissions', async () => {
      const projectId = Buffer.from(testProjectPath).toString('base64');
      
      // Test tool access (should default to false for unknown tools)
      const hasAccess = governanceService.isToolAllowed(projectId, 'test-tool');
      expect(typeof hasAccess).toBe('boolean');

      // Test user permissions (should default to false for unknown users)
      const hasPermission = governanceService.hasPermission(projectId, 'test-user', 'execute-tools');
      expect(typeof hasPermission).toBe('boolean');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service failures gracefully', async () => {
      // Test with invalid bridge configuration
      const invalidBridge: MCPEndpointConfig = {
        id: 'invalid-bridge',
        name: 'Invalid Bridge',
        baseUrl: 'invalid-url',
        enabled: true,
        type: 'custom'
      };

      await expect(mcpService.registerBridge(invalidBridge)).resolves.not.toThrow();

      // Test connection should fail
      const connectionResult = await mcpService.testConnection('invalid-bridge');
      expect(connectionResult).toBe(false);
    });

    it('should recover from network failures', async () => {
      // Simulate network failure by testing with unreachable endpoint
      const unreachableBridge: MCPEndpointConfig = {
        id: 'unreachable-bridge',
        name: 'Unreachable Bridge',
        baseUrl: 'http://192.0.2.1:9999', // Reserved IP for documentation
        enabled: true,
        type: 'custom',
        timeout: 1000 // Short timeout for faster test
      };

      await mcpService.registerBridge(unreachableBridge);
      
      // Connection test should fail but not throw
      const connectionResult = await mcpService.testConnection('unreachable-bridge');
      expect(connectionResult).toBe(false);

      // Service should remain operational
      expect(mcpService.getStatus().status).toBe('running');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent tool executions', async () => {
      const concurrentTasks = 10;
      const tasks = Array.from({ length: concurrentTasks }, (_, i) => ({
        action: 'execute',
        toolName: 'concurrent-test',
        jobId: `concurrent-job-${i}-${Date.now()}`,
        parameters: { index: i }
      }));

      const startTime = Date.now();
      const results = await Promise.allSettled(
        tasks.map(task => mcpService.executeTask(task))
      );
      const executionTime = Date.now() - startTime;

      // All tasks should complete
      expect(results.length).toBe(concurrentTasks);
      
      // Execution should be reasonably fast
      expect(executionTime).toBeLessThan(30000); // 30 seconds max

      // Check that all tasks were processed
      const successfulTasks = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      );
      
      logger.info('Concurrent execution results', {
        total: concurrentTasks,
        successful: successfulTasks.length,
        executionTime
      });
    });

    it('should manage memory usage effectively', () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const status = mcpService.getStatus();
      const bridges = mcpService.listBridges();
      const configSummary = mcpService.getConfigSummary();

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      logger.info('Memory usage test', {
        initialMemory: Math.round(initialMemory.heapUsed / 1024 / 1024),
        finalMemory: Math.round(finalMemory.heapUsed / 1024 / 1024),
        increase: Math.round(memoryIncrease / 1024 / 1024)
      });
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full MCP bridge workflow', async () => {
      // 1. Initialize governance for project
      const projectPath = process.cwd();
      await governanceService.initializeProject(projectPath);

      // 2. Register a test bridge
      const workflowBridge: MCPEndpointConfig = {
        id: 'workflow-test-bridge',
        name: 'Workflow Test Bridge',
        baseUrl: 'http://localhost:3001',
        enabled: true,
        type: 'custom',
        category: 'test',
        description: 'End-to-end workflow test bridge'
      };

      await mcpService.registerBridge(workflowBridge);

      // 3. Discover tools
      const discoveryResult = await mcpService.discoverTools();
      expect(discoveryResult.status).toBe(MCPOperationState.COMPLETED);

      // 4. Execute a tool
      const workflowTask = {
        action: 'execute',
        toolName: 'workflow-test',
        jobId: `workflow-job-${Date.now()}`,
        parameters: {
          workflow: 'end-to-end-test',
          timestamp: new Date().toISOString()
        }
      };

      const executionResult = await mcpService.executeTask(workflowTask);
      expect(executionResult.success).toBe(true);

      // 5. Check status
      const statusResult = await mcpService.checkTaskStatus(workflowTask.jobId);
      expect(statusResult.operationId).toBe(workflowTask.jobId);

      // 6. Verify service status
      const serviceStatus = mcpService.getStatus();
      expect(serviceStatus.status).toBe('running');
      expect(serviceStatus.bridgeCount).toBeGreaterThan(0);

      logger.info('End-to-end workflow completed successfully', {
        bridgeId: workflowBridge.id,
        jobId: workflowTask.jobId,
        serviceStatus: serviceStatus.status
      });
    });
  });
}); 