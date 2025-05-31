import { Command } from 'commander';
import { createLogger } from '../utils/logger';
import { MCPBridgeService } from '../services/MCPBridgeService';
import { table } from 'console';
import { MCPEndpointConfig, MCPToolDefinition } from '../types/interfaces';

const logger = createLogger('MCPCommands');
const mcpService = MCPBridgeService.getInstance({
  environment: process.env.NODE_ENV || 'development',
  autoStart: true
});

export function createMCPCommands(): Command {
  const mcpCmd = new Command('mcp');
  mcpCmd.description('MCP Bridge management commands');

  // List bridges command
  mcpCmd
    .command('bridges')
    .description('List all configured MCP bridges')
    .action(async () => {
      try {
        const bridges = await mcpService.listBridges();
        
        if (bridges.length === 0) {
          console.log('No bridges configured');
          return;
        }

        const tableData = bridges.map((bridge: MCPEndpointConfig) => [
          bridge.id,
          bridge.name,
          bridge.type,
          bridge.enabled ? 'Enabled' : 'Disabled'
        ]);

        console.log('\nConfigured MCP Bridges:');
        console.table(tableData);
      } catch (error) {
        logger.error('Failed to list bridges', { error: error instanceof Error ? error.message : String(error) });
        console.error('Failed to list bridges:', error instanceof Error ? error.message : String(error));
      }
    });

  // List tools command
  mcpCmd
    .command('tools')
    .description('List all available MCP tools')
    .option('-b, --bridge <bridgeId>', 'Filter by bridge ID')
    .action(async (options) => {
      try {
        const tools = await mcpService.listTools(options.bridge);
        
        if (tools.length === 0) {
          console.log('No tools available');
          return;
        }

        const tableData = tools.map((tool: MCPToolDefinition) => [
          tool.name,
          tool.description,
          tool.category,
          tool.enabled ? 'Enabled' : 'Disabled'
        ]);

        console.log('\nAvailable MCP Tools:');
        console.table(tableData);
      } catch (error) {
        logger.error('Failed to list tools', { error: error instanceof Error ? error.message : String(error) });
        console.error('Failed to list tools:', error instanceof Error ? error.message : String(error));
      }
    });

  // Test connection command
  mcpCmd
    .command('test <bridgeId>')
    .description('Test connection to a specific bridge')
    .action(async (bridgeId: string) => {
      try {
        console.log(`Testing connection to bridge: ${bridgeId}`);
        const isConnected = await mcpService.testConnection(bridgeId);
        
        if (isConnected) {
          console.log('✅ Connection successful');
        } else {
          console.log('❌ Connection failed');
        }
      } catch (error) {
        logger.error('Connection test failed', { bridgeId, error });
        console.error('Connection test failed:', error instanceof Error ? error.message : String(error));
      }
    });

  // Status command
  mcpCmd
    .command('status')
    .description('Show MCP service status')
    .action(async () => {
      try {
        const status = mcpService.getStatus();
        
        console.log('\nMCP Service Status:');
        console.log(`Status: ${status.status}`);
        console.log(`Uptime: ${Math.floor(status.uptime / 1000)}s`);
        console.log(`Bridges: ${status.bridgeCount}`);
        console.log(`Tools: ${status.toolCount}`);
        console.log(`Active Jobs: ${status.activeJobs}`);
        
        if (status.lastError) {
          console.log(`Last Error: ${status.lastError}`);
        }
      } catch (error) {
        logger.error('Failed to get status', { error });
        console.error('Failed to get status:', error instanceof Error ? error.message : String(error));
      }
    });

  // Discover tools command
  mcpCmd
    .command('discover')
    .description('Discover and cache available tools')
    .action(async () => {
      try {
        console.log('Discovering tools...');
        const result = await mcpService.discoverTools();
        
        console.log(`✅ Discovery completed: ${result.status}`);
        if (result.result) {
          console.log(`Found ${result.result.length} tools`);
        }
      } catch (error) {
        logger.error('Tool discovery failed', { error });
        console.error('Tool discovery failed:', error instanceof Error ? error.message : String(error));
      }
    });

  // Execute tool command
  mcpCmd
    .command('execute <bridgeId> <toolName>')
    .description('Execute a specific tool')
    .option('-p, --params <params>', 'Tool parameters as JSON string')
    .action(async (bridgeId: string, toolName: string, options) => {
      try {
        let parameters = {};
        if (options.params) {
          try {
            parameters = JSON.parse(options.params);
          } catch (parseError) {
            console.error('Invalid JSON parameters:', parseError);
            return;
          }
        }

        console.log(`Executing tool: ${toolName} on bridge: ${bridgeId}`);
        const result = await mcpService.executeTool(bridgeId, toolName, parameters);
        
        console.log('\nExecution Result:');
        console.log(`Success: ${result.success}`);
        console.log(`Execution Time: ${result.executionTime}ms`);
        
        if (result.success && result.data) {
          console.log('Result:', JSON.stringify(result.data, null, 2));
        } else if (result.error) {
          console.log('Error:', result.error);
        }
      } catch (error) {
        logger.error('Tool execution failed', { bridgeId, toolName, error });
        console.error('Tool execution failed:', error instanceof Error ? error.message : String(error));
      }
    });

  // Reload command
  mcpCmd
    .command('reload')
    .description('Reload MCP service configuration')
    .action(async () => {
      try {
        console.log('Reloading MCP service...');
        await mcpService.reload();
        console.log('✅ Service reloaded successfully');
      } catch (error) {
        logger.error('Service reload failed', { error });
        console.error('Service reload failed:', error instanceof Error ? error.message : String(error));
      }
    });

  return mcpCmd;
} 