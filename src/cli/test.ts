import { Command } from 'commander';
import { createLogger } from '../utils/logger';
import { AgentBridgeService } from '../services/AgentBridgeService';
import { MCPBridgeService } from '../services/MCPBridgeService';

const logger = createLogger('TestCommands');

export function createTestCommands(): Command {
  const testCmd = new Command('test');
  testCmd.description('Test MCP Bridge and Agent functionality');

  testCmd
    .command('agent')
    .description('Test AgentBridgeService functionality')
    .action(async () => {
      try {
        console.log('🧪 Testing AgentBridgeService...');
        
        // Initialize agent service
        const agentService = new AgentBridgeService({
          allowedDirectories: [process.cwd()],
          maxConcurrentJobs: 5,
          jobTimeout: 30000,
          enableSecurityScanning: true,
          rateLimitConfig: {
            windowMs: 60000,
            maxRequests: 10
          }
        });
        
        await agentService.initialize();
        console.log('✅ AgentBridgeService initialized');

        // Test service status
        const status = agentService.getServiceStatus();
        console.log('📊 Service Status:', {
          status: status.status,
          uptime: Math.floor(status.uptime / 1000) + 's',
          bridgeCount: status.bridgeCount,
          toolCount: status.toolCount,
          activeJobs: status.activeJobs
        });

        // Test project scanning
        console.log('🔍 Testing project scanning...');
        const scanResult = await agentService.scanProject(process.cwd(), 'all');
        console.log('✅ Scan completed:', {
          success: scanResult.success,
          path: scanResult.path,
          scanType: scanResult.scanType,
          executionTime: scanResult.executionTime + 'ms'
        });

        // Test MCP tool execution
        console.log('🔧 Testing MCP tool execution...');
        try {
          const execResult = await agentService.executeMCPTool(
            'default',
            'test-tool',
            { message: 'Hello from test' }
          );
          console.log('✅ Tool execution result:', {
            success: execResult.success,
            status: execResult.status,
            executionTime: execResult.executionTime + 'ms'
          });
        } catch (execError) {
          console.log('⚠️ Tool execution failed (expected):', execError instanceof Error ? execError.message : String(execError));
        }

        await agentService.shutdown();
        console.log('✅ AgentBridgeService test completed');

      } catch (error) {
        logger.error('AgentBridgeService test failed', { error });
        console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
      }
    });

  testCmd
    .command('mcp')
    .description('Test MCPBridgeService functionality')
    .action(async () => {
      try {
        console.log('🧪 Testing MCPBridgeService...');
        
        // Initialize MCP service
        const mcpService = MCPBridgeService.getInstance({
          environment: 'test',
          autoStart: true
        });
        
        await mcpService.initialize();
        console.log('✅ MCPBridgeService initialized');

        // Test service status
        const status = mcpService.getStatus();
        console.log('📊 Service Status:', {
          status: status.status,
          uptime: Math.floor(status.uptime / 1000) + 's',
          bridgeCount: status.bridgeCount,
          toolCount: status.toolCount
        });

        // Test bridge listing
        const bridges = await mcpService.listBridges();
        console.log('🌉 Bridges:', bridges.length);

        // Test tool listing
        const tools = await mcpService.listTools();
        console.log('🔧 Tools:', tools.length);

        // Test tool discovery
        console.log('🔍 Testing tool discovery...');
        const discoveryResult = await mcpService.discoverTools();
        console.log('✅ Discovery result:', discoveryResult.status);

        await mcpService.shutdown();
        console.log('✅ MCPBridgeService test completed');

      } catch (error) {
        logger.error('MCPBridgeService test failed', { error });
        console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
      }
    });

  testCmd
    .command('all')
    .description('Run all tests')
    .action(async () => {
      console.log('🧪 Running comprehensive test suite...');
      
      // Run agent test
      const agentCmd = testCmd.commands.find(cmd => cmd.name() === 'agent');
      if (agentCmd) {
        await agentCmd.parseAsync(['agent'], { from: 'user' });
      }
      
      console.log('\n' + '='.repeat(50) + '\n');
      
      // Run MCP test
      const mcpCmd = testCmd.commands.find(cmd => cmd.name() === 'mcp');
      if (mcpCmd) {
        await mcpCmd.parseAsync(['mcp'], { from: 'user' });
      }
      
      console.log('\n✅ All tests completed!');
    });

  return testCmd;
} 