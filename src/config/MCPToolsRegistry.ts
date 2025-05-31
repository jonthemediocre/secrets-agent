import { promises as fs } from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/logger';

const logger = createLogger('MCPToolsRegistry');

export interface MCPToolParameter {
  type: string;
  description: string;
  required?: boolean;
  default?: any;
  enum?: string[];
}

export interface MCPToolDefinition {
  description: string;
  implementation: string;
  parameters: Record<string, MCPToolParameter>;
}

export interface MCPToolCategory {
  description: string;
  tools: Record<string, MCPToolDefinition>;
}

export interface MCPImplementation {
  type: 'internal' | 'cli';
  description: string;
  command?: string;
  version_required?: string;
  module?: string;
}

export interface MCPToolsRegistry {
  version: string;
  description: string;
  categories: Record<string, MCPToolCategory>;
  implementations: Record<string, MCPImplementation>;
}

export class MCPToolsRegistryLoader {
  private static instance: MCPToolsRegistryLoader;
  private registry: MCPToolsRegistry | null = null;
  private registryPath: string;

  private constructor(configPath?: string) {
    this.registryPath = configPath || path.join(__dirname, 'mcp_tools.yaml');
  }

  public static getInstance(configPath?: string): MCPToolsRegistryLoader {
    if (!MCPToolsRegistryLoader.instance) {
      MCPToolsRegistryLoader.instance = new MCPToolsRegistryLoader(configPath);
    }
    return MCPToolsRegistryLoader.instance;
  }

  /**
   * Load the MCP tools registry
   */
  public async loadRegistry(): Promise<MCPToolsRegistry> {
    try {
      logger.info('Loading MCP tools registry', { path: this.registryPath });

      const content = await fs.readFile(this.registryPath, 'utf-8');
      this.registry = JSON.parse(content) as MCPToolsRegistry;

      logger.info('MCP tools registry loaded', {
        version: this.registry.version,
        categoryCount: Object.keys(this.registry.categories).length,
        implementationCount: Object.keys(this.registry.implementations).length
      });

      return this.registry;
    } catch (error) {
      logger.error('Failed to load MCP tools registry', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get tool definition by category and name
   */
  public getTool(category: string, toolName: string): MCPToolDefinition | null {
    if (!this.registry) {
      throw new Error('Registry not loaded. Call loadRegistry() first.');
    }

    return this.registry.categories[category]?.tools[toolName] || null;
  }

  /**
   * Get implementation details
   */
  public getImplementation(name: string): MCPImplementation | null {
    if (!this.registry) {
      throw new Error('Registry not loaded. Call loadRegistry() first.');
    }

    return this.registry.implementations[name] || null;
  }

  /**
   * List all available tools
   */
  public listTools(): Array<{
    category: string;
    name: string;
    definition: MCPToolDefinition;
  }> {
    if (!this.registry) {
      throw new Error('Registry not loaded. Call loadRegistry() first.');
    }

    const tools = [];
    for (const [category, categoryDef] of Object.entries(this.registry.categories)) {
      for (const [name, definition] of Object.entries(categoryDef.tools)) {
        tools.push({ category, name, definition });
      }
    }
    return tools;
  }

  /**
   * Validate tool parameters
   */
  public validateParameters(
    category: string,
    toolName: string,
    params: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const tool = this.getTool(category, toolName);
    if (!tool) {
      return { valid: false, errors: [`Tool not found: ${category}.${toolName}`] };
    }

    const errors: string[] = [];

    // Check required parameters
    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      if (paramDef.required !== false && !(paramName in params)) {
        errors.push(`Missing required parameter: ${paramName}`);
        continue;
      }

      if (paramName in params) {
        const value = params[paramName];

        // Type validation
        switch (paramDef.type) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push(`Parameter ${paramName} must be a string`);
            }
            break;
          case 'number':
            if (typeof value !== 'number') {
              errors.push(`Parameter ${paramName} must be a number`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              errors.push(`Parameter ${paramName} must be a boolean`);
            }
            break;
          case 'object':
            if (typeof value !== 'object' || value === null) {
              errors.push(`Parameter ${paramName} must be an object`);
            }
            break;
          case 'array':
            if (!Array.isArray(value)) {
              errors.push(`Parameter ${paramName} must be an array`);
            }
            break;
        }

        // Enum validation
        if (paramDef.enum && !paramDef.enum.includes(value)) {
          errors.push(`Parameter ${paramName} must be one of: ${paramDef.enum.join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get registry version
   */
  public getVersion(): string {
    if (!this.registry) {
      throw new Error('Registry not loaded. Call loadRegistry() first.');
    }
    return this.registry.version;
  }
} 