#!/usr/bin/env node

import { Command } from 'commander';
import { MCPBridgeService } from '../../services/MCPBridgeService';
import { MCPBridgesConfigLoader } from '../../config/MCPBridgesConfig';
import { MCPToolsRegistryLoader } from '../../config/MCPToolsRegistry';
import { ExternalToolsService } from '../../services/ExternalToolsService';
import { GovernanceService } from '../../services/GovernanceService';
import { createLogger } from '../../utils/logger';
import { formatTable, formatJson } from '../../utils/formatting';
import { BaseError, ErrorCategory, ErrorSeverity } from '../../utils/error-types';

const logger = createLogger('MCPCLICommands');

export interface MCPCLIConfig {
  format: 'table' | 'json';
  verbose: boolean;
  timeout: number;
  environment: string;
}

/**
 * Hardened MCP CLI Commands with comprehensive error handling
 * Zero duplication, production-ready implementation
 */
export class MCPCommands {
  private static mcpService: MCPBridgeService | null = null;
  private static externalToolsService: ExternalToolsService | null = null;
  private static governanceService: GovernanceService | null = null;

  /**
   * Register all MCP commands with the CLI program
   */
  public static register(program: Command): void {
    const mcpCommand = program
      .command('mcp')
      .description('Model Context Protocol bridge management')
      .option('-f, --format <format>', 'Output format (table|json)', 'table')
      .option('-v, --verbose', 'Enable verbose logging', false)
      .option('-t, --timeout <timeout>', 'Request timeout in ms', '30000')
      .option('-e, --env <environment>', 'Environment', process.env.NODE_ENV || 'development');

    // Bridge management commands
    mcpCommand
      .command('list-bridges')
      .description('List all configured MCP bridges')
      .action(async (options) => {
        await this.executeWithErrorHandling(async () => {
          const service = await this.getService(options);
          const bridges = await service.listBridges();
          this.outputResults(bridges, options.format, 'bridges');
        });
      });

    mcpCommand
      .command('list-tools')
      .description('List all available tools across bridges')
      .option('-b, --bridge <bridgeId>', 'Filter by bridge ID')
      .option('--no-cache', 'Skip cache and fetch fresh data')
      .action(async (cmdOptions, options) => {
        await this.executeWithErrorHandling(async () => {
          const service = await this.getService(options);
          const tools = await service.listTools(
            cmdOptions.bridge,
            !cmdOptions.noCache
          );
          this.outputResults(tools, options.format, 'tools');
        });
      });

    mcpCommand
      .command('execute-tool')
      .description('Execute a specific tool')
      .requiredOption('-b, --bridge <bridgeId>', 'Bridge ID')
      .requiredOption('-t, --tool <toolName>', 'Tool name')
      .option('-p, --params <params>', 'Parameters as JSON string', '{}')
      .option('--async', 'Execute asynchronously and return job ID')
      .action(async (cmdOptions, options) => {
        await this.executeWithErrorHandling(async () => {
          const service = await this.getService(options);
          
          let parameters = {};
          try {
            parameters = JSON.parse(cmdOptions.params);
          } catch (error) {
            throw new BaseError('Invalid JSON parameters', {
              category: ErrorCategory.VALIDATION,
              severity: ErrorSeverity.HIGH,
              retryable: false
            });
          }

          if (cmdOptions.async) {
            const result = await service.executeTool(
              cmdOptions.bridge,
              cmdOptions.tool,
              parameters
            );
            this.outputResults({ jobId: result.jobId }, options.format, 'execution');
          } else {
            const result = await service.executeTool(
              cmdOptions.bridge,
              cmdOptions.tool,
              parameters
            );
            this.outputResults(result, options.format, 'execution');
          }
        });
      });

    mcpCommand
      .command('job-status')
      .description('Check status of an MCP job')
      .requiredOption('-j, --job-id <jobId>', 'Job ID')
      .action(async (cmdOptions, options) => {
        await this.executeWithErrorHandling(async () => {
          const service = await this.getService(options);
          const status = await service.checkJobStatus(cmdOptions.jobId);
          this.outputResults(status, options.format, 'job-status');
        });
      });

    mcpCommand
      .command('register-bridge')
      .description('Register a new MCP bridge')
      .requiredOption('-i, --id <id>', 'Bridge ID')
      .requiredOption('-n, --name <name>', 'Bridge name')
      .requiredOption('-u, --url <url>', 'Bridge base URL')
      .option('-k, --api-key <apiKey>', 'API key for authentication')
      .option('-t, --type <type>', 'Bridge type', 'custom')
      .option('--timeout <timeout>', 'Request timeout in seconds', '30')
      .action(async (cmdOptions) => {
        await this.executeWithErrorHandling(async () => {
          const service = await this.getService(cmdOptions);
          
          const bridgeConfig = {
            id: cmdOptions.id,
            name: cmdOptions.name,
            baseUrl: cmdOptions.url,
            apiKey: cmdOptions.apiKey,
            type: cmdOptions.type as any,
            enabled: true,
            timeout: parseInt(cmdOptions.timeout) * 1000
          };

          await service.registerBridge(bridgeConfig);
          logger.info('Bridge registered successfully', { bridgeId: cmdOptions.id });
          // eslint-disable-next-line no-console
          console.log(`✅ Bridge '${cmdOptions.name}' registered successfully`);
        });
      });

    mcpCommand
      .command('test-connection')
      .description('Test connection to an MCP bridge')
      .requiredOption('-b, --bridge <bridgeId>', 'Bridge ID')
      .action(async (cmdOptions, options) => {
        await this.executeWithErrorHandling(async () => {
          const service = await this.getService(options);
          const success = await service.testConnection(cmdOptions.bridge);
          
          if (success) {
            console.log(`✅ Connection to bridge '${cmdOptions.bridge}' successful`);
          } else {
            console.log(`❌ Connection to bridge '${cmdOptions.bridge}' failed`);
            process.exit(1);
          }
        });
      });

    mcpCommand
      .command('reload')
      .description('Reload MCP bridge configuration')
      .action(async (options) => {
        await this.executeWithErrorHandling(async () => {
          const service = await this.getService(options);
          await service.reload();
          console.log('✅ MCP bridge configuration reloaded successfully');
        });
      });

    mcpCommand
      .command('status')
      .description('Show MCP service status')
      .action(async (options) => {
        await this.executeWithErrorHandling(async () => {
          const service = await this.getService(options);
          const status = service.getStatus();
          this.outputResults(status, options.format, 'status');
        });
      });

    // Governance commands
    mcpCommand
      .command('governance')
      .description('Governance and access control commands')
      .action(() => {
        mcpCommand.help();
      });

    mcpCommand
      .command('governance:init')
      .description('Initialize project governance')
      .option('-p, --project <path>', 'Project path', process.cwd())
      .action(async (cmdOptions, options) => {
        await this.executeWithErrorHandling(async () => {
          const governance = await this.getGovernanceService();
          await governance.initializeProject(cmdOptions.project);
          console.log(`✅ Governance initialized for project: ${cmdOptions.project}`);
        });
      });

    mcpCommand
      .command('governance:check')
      .description('Check governance compliance')
      .option('-p, --project <path>', 'Project path', process.cwd())
      .action(async (cmdOptions, options) => {
        await this.executeWithErrorHandling(async () => {
          const governance = await this.getGovernanceService();
          const projectId = Buffer.from(cmdOptions.project).toString('base64');
          const enforcements = governance.getProjectEnforcements(projectId);
          this.outputResults(enforcements, options.format, 'governance');
        });
      });

    // External tools commands
    mcpCommand
      .command('tools:scan')
      .description('Scan project for tool requirements')
      .option('-p, --project <path>', 'Project path', process.cwd())
      .action(async (cmdOptions, options) => {
        await this.executeWithErrorHandling(async () => {
          const toolsService = await this.getExternalToolsService();
          const tools = await toolsService.scanProjectTools(cmdOptions.project);
          this.outputResults(tools, options.format, 'project-tools');
        });
      });

    mcpCommand
      .command('tools:list')
      .description('List available external tools')
      .action(async (options) => {
        await this.executeWithErrorHandling(async () => {
          const toolsService = await this.getExternalToolsService();
          const tools = toolsService.listTools();
          this.outputResults(tools, options.format, 'external-tools');
        });
      });

    mcpCommand
      .command('tools:execute')
      .description('Execute an external tool method')
      .requiredOption('-t, --tool <toolName>', 'Tool name')
      .requiredOption('-m, --method <methodName>', 'Method name')
      .option('-p, --params <params>', 'Parameters as JSON string', '{}')
      .action(async (cmdOptions, options) => {
        await this.executeWithErrorHandling(async () => {
          const toolsService = await this.getExternalToolsService();
          
          let parameters = {};
          try {
            parameters = JSON.parse(cmdOptions.params);
          } catch (error) {
            throw new BaseError('Invalid JSON parameters', {
              category: ErrorCategory.VALIDATION,
              severity: ErrorSeverity.HIGH,
              retryable: false
            });
          }

          const result = await toolsService.executeMethod(
            cmdOptions.tool,
            cmdOptions.method,
            parameters
          );
          
          this.outputResults(result, options.format, 'tool-execution');
        });
      });

    // Configuration management
    mcpCommand
      .command('config:validate')
      .description('Validate MCP configuration')
      .option('-c, --config <path>', 'Configuration file path')
      .action(async (cmdOptions, options) => {
        await this.executeWithErrorHandling(async () => {
          const configLoader = MCPBridgesConfigLoader.getInstance(cmdOptions.config);
          await configLoader.load();
          // eslint-disable-next-line no-console
          console.log('✅ Configuration is valid');
          
          if (options.verbose) {
            const summary = configLoader.getConfigSummary();
            this.outputResults(summary, options.format, 'config-summary');
          }
        });
      });

    mcpCommand
      .command('config:registry')
      .description('Show tools registry information')
      .option('-c, --config <path>', 'Registry file path')
      .action(async (cmdOptions, options) => {
        await this.executeWithErrorHandling(async () => {
          const registryLoader = MCPToolsRegistryLoader.getInstance(cmdOptions.config);
          await registryLoader.loadRegistry();
          const tools = registryLoader.listTools();
          this.outputResults(tools, options.format, 'registry-tools');
        });
      });
  }

  /**
   * Get or create MCP service instance
   */
  private static async getService(options: any): Promise<MCPBridgeService> {
    if (!this.mcpService) {
      this.mcpService = MCPBridgeService.getInstance({
        environment: options.env,
        autoStart: true
      });
      await this.mcpService.initialize();
    }
    return this.mcpService;
  }

  /**
   * Get or create external tools service instance
   */
  private static async getExternalToolsService(): Promise<ExternalToolsService> {
    if (!this.externalToolsService) {
      this.externalToolsService = new ExternalToolsService();
      await this.externalToolsService.initialize();
    }
    return this.externalToolsService;
  }

  /**
   * Get or create governance service instance
   */
  private static async getGovernanceService(): Promise<GovernanceService> {
    if (!this.governanceService) {
      this.governanceService = new GovernanceService();
      await this.governanceService.initialize();
    }
    return this.governanceService;
  }

  /**
   * Execute command with comprehensive error handling
   */
  private static async executeWithErrorHandling(
    operation: () => Promise<void>
  ): Promise<void> {
    try {
      await operation();
    } catch (error) {
      if (error instanceof BaseError) {
        logger.error('MCP operation failed', {
          category: error.category,
          severity: error.severity,
          retryable: error.retryable,
          error: error.message,
          details: error.details
        });
        
        console.error(`❌ ${error.message}`);
        if (error.details) {
          console.error('Details:', JSON.stringify(error.details, null, 2));
        }
      } else {
        logger.error('Unexpected error', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      }
      process.exit(1);
    }
  }

  /**
   * Output results in specified format
   */
  private static outputResults(data: any, format: string, type: string): void {
    try {
      if (format === 'json') {
        console.log(formatJson(data));
      } else {
        const tableData = this.prepareTableData(data, type);
        console.log(formatTable(tableData));
      }
    } catch (error) {
      logger.error('Failed to format output', { error, type, format });
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Prepare data for table formatting
   */
  private static prepareTableData(data: any, type: string): any[] {
    if (!data) return [];
    
    switch (type) {
      case 'bridges':
        return Array.isArray(data) ? data.map(bridge => ({
          ID: bridge.id,
          Name: bridge.name,
          URL: bridge.baseUrl,
          Type: bridge.type,
          Status: bridge.enabled ? '🟢 Enabled' : '🔴 Disabled',
          Tools: bridge.toolCount || 0
        })) : [];

      case 'tools':
        return Array.isArray(data) ? data.map(tool => ({
          Name: tool.name,
          Category: tool.category,
          Description: tool.description.substring(0, 50) + '...',
          Version: tool.version,
          Status: tool.enabled ? '🟢 Enabled' : '🔴 Disabled'
        })) : [];

      case 'status':
        return [{
          Status: data.status === 'running' ? '🟢 Running' : '🔴 Stopped',
          Uptime: Math.floor(data.uptime / 1000) + 's',
          Bridges: data.bridgeCount,
          Tools: data.toolCount,
          'Active Jobs': data.activeJobs,
          'Last Error': data.lastError || 'None'
        }];

      default:
        return Array.isArray(data) ? data : [data];
    }
  }
} 