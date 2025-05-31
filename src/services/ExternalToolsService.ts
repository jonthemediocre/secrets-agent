import { promises as fs } from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';

const logger = createLogger('ExternalToolsService');

export interface ExternalToolMethod {
  name: string;
  description: string;
}

export interface ExternalTool {
  description: string;
  methods: ExternalToolMethod[];
}

export interface ExternalToolsRegistry {
  version: string;
  description: string;
  tools: Record<string, ExternalTool>;
}

export interface ExternalToolConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ProjectToolConfig {
  requiredTools: string[];
  optionalTools: string[];
  toolConfigs?: Record<string, any>;
}

export interface ProjectConfig {
  tools?: ProjectToolConfig;
}

export class ExternalToolsService extends EventEmitter {
  private registry: ExternalToolsRegistry | null = null;
  private toolProcesses: Map<string, { 
    process: ChildProcess | null; 
    status: 'starting' | 'running' | 'stopped' 
  }> = new Map();
  private toolConfigs: Map<string, ExternalToolConfig> = new Map();
  private projectTools: Map<string, ProjectToolConfig> = new Map();

  constructor() {
    super();
  }

  /**
   * Initialize the service
   */
  public async initialize(): Promise<void> {
    try {
      // Load registry
      const registryPath = path.join(__dirname, '..', 'config', 'external_tools.yaml');
      const registryContent = await fs.readFile(registryPath, 'utf8');
      this.registry = JSON.parse(registryContent) as ExternalToolsRegistry;

      // Load tool configurations
      const mcpConfigPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.cursor', 'mcp.json');
      const mcpConfig = JSON.parse(await fs.readFile(mcpConfigPath, 'utf8'));
      
      if (mcpConfig.mcpServers) {
        Object.entries(mcpConfig.mcpServers).forEach(([name, config]) => {
          this.toolConfigs.set(name, config as ExternalToolConfig);
        });
      }

      logger.info('External tools service initialized', {
        toolCount: Object.keys(this.registry?.tools || {}).length,
        configuredTools: Array.from(this.toolConfigs.keys())
      });
    } catch (error) {
      logger.error('Failed to initialize external tools service', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * List available tools
   */
  public listTools(): { name: string; description: string; methods: ExternalToolMethod[] }[] {
    if (!this.registry) {
      return [];
    }

    return Object.entries(this.registry.tools)
      .filter(([name]) => this.toolConfigs.has(name))
      .map(([name, tool]) => ({
        name,
        description: tool.description,
        methods: tool.methods
      }));
  }

  /**
   * Get tool methods
   */
  public getToolMethods(toolName: string): ExternalToolMethod[] {
    if (!this.registry?.tools[toolName]) {
      return [];
    }
    return this.registry.tools[toolName].methods;
  }

  /**
   * Start tool process
   */
  private async startToolProcess(toolName: string): Promise<void> {
    const config = this.toolConfigs.get(toolName);
    if (!config) {
      throw new Error(`Tool ${toolName} not configured`);
    }

    if (this.toolProcesses.get(toolName)?.status === 'running') {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const childProcess = spawn(config.command, config.args, {
          env: {
            ...process.env,
            ...config.env
          }
        });

        this.toolProcesses.set(toolName, {
          process: childProcess,
          status: 'starting'
        });

        childProcess.stdout?.on('data', (data: Buffer) => {
          logger.debug('Tool process output', {
            tool: toolName,
            output: data.toString()
          });
          if (data.toString().includes('ready')) {
            this.toolProcesses.set(toolName, {
              process: childProcess,
              status: 'running'
            });
            resolve();
          }
        });

        childProcess.stderr?.on('data', (data: Buffer) => {
          logger.error('Tool process error output', {
            tool: toolName,
            output: data.toString()
          });
        });

        childProcess.on('error', (error: Error) => {
          logger.error('Tool process error', {
            tool: toolName,
            error: error.message,
            stack: error.stack
          });
          reject(error);
        });

        childProcess.on('close', (code: number | null) => {
          logger.info('Tool process closed', {
            tool: toolName,
            code
          });
          this.toolProcesses.set(toolName, {
            process: null,
            status: 'stopped'
          });
        });

        // Set timeout for startup
        setTimeout(() => {
          if (this.toolProcesses.get(toolName)?.status === 'starting') {
            reject(new Error(`Tool ${toolName} failed to start within timeout`));
          }
        }, 30000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Execute tool method
   */
  public async executeMethod(
    toolName: string,
    methodName: string,
    parameters: Record<string, any>
  ): Promise<ToolExecutionResult> {
    try {
      // Validate tool and method exist
      if (!this.registry?.tools[toolName]) {
        throw new Error(`Tool ${toolName} not found`);
      }

      const method = this.registry.tools[toolName].methods
        .find(m => m.name === methodName);
      
      if (!method) {
        throw new Error(`Method ${methodName} not found for tool ${toolName}`);
      }

      // Ensure tool process is running
      const toolProcess = this.toolProcesses.get(toolName);
      if (!toolProcess || toolProcess.status !== 'running') {
        await this.startToolProcess(toolName);
      }

      // Execute method
      // Note: This is a simplified example. In reality, you'd need to implement
      // the specific protocol for communicating with each tool process
      const result = await this.sendRequest(toolName, {
        method: methodName,
        parameters
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.error('Failed to execute tool method', {
        error: error instanceof Error ? error.message : String(error),
        tool: toolName,
        method: methodName
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Send request to tool process
   */
  private async sendRequest(toolName: string, request: any): Promise<any> {
    const toolProcess = this.toolProcesses.get(toolName);
    if (!toolProcess || !toolProcess.process) {
      throw new Error(`Tool ${toolName} not running`);
    }

    // This is where you'd implement the specific protocol for
    // communicating with the tool process. This could be:
    // - HTTP requests if the tool exposes an HTTP server
    // - IPC communication
    // - Standard input/output
    // - Custom protocol

    // For now, we'll just return a mock response
    return {
      status: 'success',
      result: `Executed ${request.method} on ${toolName}`
    };
  }

  /**
   * Stop all tool processes
   */
  public async stop(): Promise<void> {
    const stopPromises = Array.from(this.toolProcesses.entries())
      .map(async ([name, { process }]) => {
        if (process) {
          process.kill();
          logger.info(`Stopped ${name} process`);
        }
      });

    await Promise.all(stopPromises);
    this.toolProcesses.clear();
  }

  /**
   * Scan project files to determine required tools
   */
  public async scanProjectTools(projectPath: string): Promise<ProjectToolConfig> {
    try {
      const toolConfig: ProjectToolConfig = {
        requiredTools: [],
        optionalTools: []
      };

      // Check for theplan.md
      const planPath = path.join(projectPath, 'theplan.md');
      if (await fs.access(planPath).then(() => true).catch(() => false)) {
        const planContent = await fs.readFile(planPath, 'utf8');
        toolConfig.requiredTools.push(...this.extractToolsFromPlan(planContent));
      }

      // Check for mcp.yaml or mcp.json
      const mcpConfigPath = path.join(projectPath, 'mcp.yaml');
      const mcpJsonPath = path.join(projectPath, 'mcp.json');
      
      if (await fs.access(mcpConfigPath).then(() => true).catch(() => false)) {
        const mcpConfig = JSON.parse(await fs.readFile(mcpConfigPath, 'utf8')) as ProjectConfig;
        if (mcpConfig.tools) {
          toolConfig.requiredTools.push(...(mcpConfig.tools.requiredTools || []));
          toolConfig.optionalTools.push(...(mcpConfig.tools.optionalTools || []));
          toolConfig.toolConfigs = mcpConfig.tools.toolConfigs;
        }
      } else if (await fs.access(mcpJsonPath).then(() => true).catch(() => false)) {
        const mcpConfig = JSON.parse(await fs.readFile(mcpJsonPath, 'utf8')) as ProjectConfig;
        if (mcpConfig.tools) {
          toolConfig.requiredTools.push(...(mcpConfig.tools.requiredTools || []));
          toolConfig.optionalTools.push(...(mcpConfig.tools.optionalTools || []));
          toolConfig.toolConfigs = mcpConfig.tools.toolConfigs;
        }
      }

      // Deduplicate tools
      toolConfig.requiredTools = [...new Set(toolConfig.requiredTools)];
      toolConfig.optionalTools = [...new Set(toolConfig.optionalTools)];

      // Store project tools
      this.projectTools.set(projectPath, toolConfig);

      logger.info('Scanned project tools', {
        projectPath,
        requiredTools: toolConfig.requiredTools,
        optionalTools: toolConfig.optionalTools
      });

      return toolConfig;
    } catch (error) {
      logger.error('Failed to scan project tools', {
        error: error instanceof Error ? error.message : String(error),
        projectPath
      });
      throw error;
    }
  }

  /**
   * Extract tool requirements from plan markdown
   */
  private extractToolsFromPlan(planContent: string): string[] {
    const tools: string[] = [];
    
    // Look for tool mentions in headers
    const toolHeaders = planContent.match(/^#+\s*Tools?\s*:(.*)$/gim);
    if (toolHeaders) {
      toolHeaders.forEach(header => {
        const toolList = header.split(':')[1];
        tools.push(...this.parseToolList(toolList));
      });
    }

    // Look for tool mentions in lists
    const toolLists = planContent.match(/^[-*]\s*(?:Required\s+)?Tools?\s*:(.*)$/gim);
    if (toolLists) {
      toolLists.forEach(list => {
        const toolList = list.split(':')[1];
        tools.push(...this.parseToolList(toolList));
      });
    }

    return tools;
  }

  /**
   * Parse comma or newline separated tool list
   */
  private parseToolList(toolList: string): string[] {
    return toolList
      .split(/[,\n]/)
      .map(tool => tool.trim())
      .filter(tool => tool && this.registry?.tools[tool]);
  }

  /**
   * Get available tools for a project
   */
  public getProjectTools(projectPath: string): string[] {
    const projectConfig = this.projectTools.get(projectPath);
    if (!projectConfig) {
      return Array.from(this.toolConfigs.keys());
    }
    return [...projectConfig.requiredTools, ...projectConfig.optionalTools];
  }

  /**
   * Check if a tool is available for a project
   */
  public isToolAvailableForProject(projectPath: string, toolName: string): boolean {
    const projectConfig = this.projectTools.get(projectPath);
    if (!projectConfig) {
      return this.toolConfigs.has(toolName);
    }
    return projectConfig.requiredTools.includes(toolName) || 
           projectConfig.optionalTools.includes(toolName);
  }
} 