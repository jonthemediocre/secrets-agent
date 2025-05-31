import { promises as fs } from 'fs';
import { join } from 'path';
import { createLogger } from '../utils/logger';
import { EventEmitter } from 'events';

const logger = createLogger('GovernanceService');

export interface GovernanceConfig {
  version: string;
  system: {
    roles: Record<string, {
      description: string;
      permissions: string[];
    }>;
    policies: Record<string, string[]>;
  };
  project: {
    roles: Record<string, {
      description: string;
      permissions: string[];
    }>;
    policies: Record<string, string[]>;
  };
  agent: {
    types: Record<string, {
      description: string;
      capabilities: string[];
    }>;
    policies: Record<string, string[]>;
  };
  mcp: {
    registration: {
      required_metadata: string[];
      validation_rules: string[];
    };
    lifecycle: {
      states: string[];
      transitions: Array<{
        from: string;
        to: string;
        requires: string[];
      }>;
    };
  };
  rules: {
    categories: Record<string, {
      description: string;
      priority: number;
    }>;
    enforcement: {
      levels: string[];
      actions: string[];
    };
  };
  vault: {
    secret_types: string[];
    access_patterns: Array<{
      pattern: string;
      description: string;
    }>;
    rotation_policies: Record<string, string>;
  };
}

export interface ProjectGovernance {
  projectId: string;
  roles: Map<string, string[]>; // user -> roles
  agents: Map<string, string>; // agentId -> type
  tools: Set<string>;
  rules: Set<string>;
}

interface MCPConfig {
  governance?: {
    roles?: Record<string, string[]>;
    agents?: Record<string, string>;
    tools?: string[];
    rules?: string[];
  };
}

export interface ProjectEnforcements {
  rules: Record<string, string>;
  policies: Record<string, string[]>;
}

export interface CursorProjectConfig {
  version: string;
  project: {
    cursor: {
      rules_dir: string;
      config_dir: string;
      plugins_dir: string;
      cache_dir: string;
    };
    tools: {
      required: Array<{
        name: string;
        config: string;
      }>;
      optional: Array<{
        name: string;
        config: string;
      }>;
    };
    agents: {
      workspace: Array<{
        name: string;
        type: string;
        rules: string;
      }>;
    };
    rules: Record<string, {
      file: string;
      enforcement: string;
    }>;
    access: {
      roles: Array<{
        name: string;
        permissions: string[];
      }>;
    };
    limits: {
      memory: string;
      cpu: string;
      storage: string;
      concurrent_tools: number;
    };
    integrations: {
      vscode: {
        extensions: string[];
      };
      git: {
        hooks: Record<string, string>;
      };
    };
    monitoring: {
      metrics: string[];
      alerts: string[];
    };
    audit: {
      events: string[];
      retention: string;
      export: {
        format: string;
        location: string;
      };
    };
  };
}

export class GovernanceService extends EventEmitter {
  private config: GovernanceConfig | null = null;
  private cursorConfig: Map<string, CursorProjectConfig> = new Map();
  private projectGovernance: Map<string, ProjectGovernance> = new Map();

  constructor() {
    super();
  }

  /**
   * Initialize governance service
   */
  public async initialize(): Promise<void> {
    try {
      // Load system governance
      const configPath = join(__dirname, '..', 'config', 'governance.yaml');
      const configContent = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configContent) as GovernanceConfig;

      logger.info('Governance service initialized', {
        version: this.config.version
      });
    } catch (error) {
      logger.error('Failed to initialize governance service', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Initialize project governance
   */
  public async initializeProject(projectPath: string): Promise<void> {
    try {
      const projectId = this.getProjectId(projectPath);
      
      // Create default project governance
      const governance: ProjectGovernance = {
        projectId,
        roles: new Map(),
        agents: new Map(),
        tools: new Set(),
        rules: new Set()
      };

      // Load Cursor-specific governance if exists
      const cursorConfigPath = join(projectPath, '.cursor', 'governance.yaml');
      if (await fs.access(cursorConfigPath).then(() => true).catch(() => false)) {
        const cursorConfig = JSON.parse(await fs.readFile(cursorConfigPath, 'utf8')) as CursorProjectConfig;
        this.cursorConfig.set(projectId, cursorConfig);
        
        // Apply Cursor-specific governance
        await this.applyCursorGovernance(governance, cursorConfig, projectPath);
      }

      // Load general MCP governance if exists
      const mcpPath = join(projectPath, 'mcp.yaml');
      if (await fs.access(mcpPath).then(() => true).catch(() => false)) {
        const mcpConfig = JSON.parse(await fs.readFile(mcpPath, 'utf8')) as MCPConfig;
        if (mcpConfig?.governance) {
          this.applyProjectGovernance(governance, mcpConfig.governance);
        }
      }

      this.projectGovernance.set(projectId, governance);

      logger.info('Project governance initialized', {
        projectId,
        hasCursorConfig: this.cursorConfig.has(projectId),
        roles: Array.from(governance.roles.keys()),
        agents: Array.from(governance.agents.keys()),
        tools: Array.from(governance.tools),
        rules: Array.from(governance.rules)
      });
    } catch (error) {
      logger.error('Failed to initialize project governance', {
        error: error instanceof Error ? error.message : String(error),
        projectPath
      });
      throw error;
    }
  }

  /**
   * Apply Cursor-specific governance
   */
  private async applyCursorGovernance(
    governance: ProjectGovernance,
    cursorConfig: CursorProjectConfig,
    projectPath: string
  ): Promise<void> {
    const { project } = cursorConfig;

    // Create Cursor directories if they don't exist
    await Promise.all([
      fs.mkdir(join(projectPath, project.cursor.rules_dir), { recursive: true }),
      fs.mkdir(join(projectPath, project.cursor.config_dir), { recursive: true }),
      fs.mkdir(join(projectPath, project.cursor.plugins_dir), { recursive: true }),
      fs.mkdir(join(projectPath, project.cursor.cache_dir), { recursive: true })
    ]);

    // Apply tool configurations
    [...project.tools.required, ...project.tools.optional].forEach(tool => {
      governance.tools.add(tool.name);
    });

    // Apply agent configurations
    project.agents.workspace.forEach(agent => {
      governance.agents.set(agent.name, agent.type);
    });

    // Apply role configurations
    project.access.roles.forEach(role => {
      governance.roles.set(role.name, role.permissions);
    });

    // Apply rule configurations
    Object.keys(project.rules).forEach(rule => {
      governance.rules.add(rule);
    });
  }

  /**
   * Get Cursor-specific configuration
   */
  public getCursorConfig(projectId: string): CursorProjectConfig | null {
    return this.cursorConfig.get(projectId) || null;
  }

  /**
   * Check if tool is allowed in Cursor context
   */
  public isCursorToolAllowed(projectId: string, toolName: string): boolean {
    const config = this.cursorConfig.get(projectId);
    if (!config) return false;

    const allTools = [
      ...config.project.tools.required,
      ...config.project.tools.optional
    ];

    return allTools.some(tool => tool.name === toolName);
  }

  /**
   * Get Cursor tool configuration path
   */
  public getCursorToolConfig(projectId: string, toolName: string): string | null {
    const config = this.cursorConfig.get(projectId);
    if (!config) return null;

    const tool = [
      ...config.project.tools.required,
      ...config.project.tools.optional
    ].find(t => t.name === toolName);

    return tool?.config || null;
  }

  /**
   * Apply project-specific governance settings
   */
  private applyProjectGovernance(governance: ProjectGovernance, config: any): void {
    // Apply roles
    if (config.roles) {
      Object.entries(config.roles).forEach(([user, roles]) => {
        governance.roles.set(user, roles as string[]);
      });
    }

    // Apply agents
    if (config.agents) {
      Object.entries(config.agents).forEach(([agentId, type]) => {
        governance.agents.set(agentId, type as string);
      });
    }

    // Apply tools
    if (config.tools) {
      config.tools.forEach((tool: string) => {
        governance.tools.add(tool);
      });
    }

    // Apply rules
    if (config.rules) {
      config.rules.forEach((rule: string) => {
        governance.rules.add(rule);
      });
    }
  }

  /**
   * Get project ID from path
   */
  private getProjectId(projectPath: string): string {
    return Buffer.from(projectPath).toString('base64');
  }

  /**
   * Check if user has permission
   */
  public hasPermission(projectId: string, user: string, permission: string): boolean {
    const governance = this.projectGovernance.get(projectId);
    if (!governance) return false;

    const userRoles = governance.roles.get(user);
    if (!userRoles) return false;

    return userRoles.some(role => {
      const roleConfig = this.config?.project.roles[role];
      return roleConfig?.permissions.includes(permission);
    });
  }

  /**
   * Check if agent has capability
   */
  public hasCapability(projectId: string, agentId: string, capability: string): boolean {
    const governance = this.projectGovernance.get(projectId);
    if (!governance) return false;

    const agentType = governance.agents.get(agentId);
    if (!agentType) return false;

    const typeConfig = this.config?.agent.types[agentType];
    return typeConfig?.capabilities.includes(capability) || false;
  }

  /**
   * Check if tool is allowed
   */
  public isToolAllowed(projectId: string, toolName: string): boolean {
    const governance = this.projectGovernance.get(projectId);
    return governance?.tools.has(toolName) || false;
  }

  /**
   * Get rule enforcement level
   */
  public getRuleEnforcement(projectId: string, rule: string): string {
    const governance = this.projectGovernance.get(projectId);
    if (!governance?.rules.has(rule)) return 'strict';

    // Get rule category and priority
    const category = Object.entries(this.config?.rules.categories || {})
      .find(([_, config]) => config.description.includes(rule))?.[0];

    if (!category) return 'strict';

    // Map priority to enforcement level
    const priority = this.config?.rules.categories[category].priority || 1;
    const levels = this.config?.rules.enforcement.levels || [];
    return levels[priority - 1] || 'strict';
  }

  /**
   * Get vault access pattern
   */
  public getVaultPattern(projectId: string, secretType: string): string | null {
    const pattern = this.config?.vault.access_patterns
      .find(p => p.pattern.includes('{project_id}'))?.pattern;

    if (!pattern) return null;

    return pattern
      .replace('{project_id}', projectId)
      .replace('{secret_type}', secretType);
  }

  /**
   * Check if project governance exists
   */
  public hasProject(projectId: string): boolean {
    return this.projectGovernance.has(projectId);
  }

  /**
   * Get all rule enforcements for a project
   */
  public getProjectEnforcements(projectId: string): ProjectEnforcements {
    const governance = this.projectGovernance.get(projectId);
    if (!governance) {
      return {
        rules: {},
        policies: {}
      };
    }

    const enforcements: ProjectEnforcements = {
      rules: {},
      policies: {}
    };

    // Get rule enforcements
    governance.rules.forEach(rule => {
      enforcements.rules[rule] = this.getRuleEnforcement(projectId, rule);
    });

    // Get policy enforcements
    Object.entries(this.config?.project.policies || {}).forEach(([policy, rules]) => {
      enforcements.policies[policy] = rules;
    });

    return enforcements;
  }
} 