import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../utils/logger';
import { join } from 'path';

const logger = createLogger('AgentBridgeService');
const execAsync = promisify(exec);

export interface SecretSuggestion {
  key: string;
  suggestedValue?: string;
  source: 'env' | 'manual' | 'api' | 'sops' | 'vault' | 'scaffold';
  confidence: number; // 0-1
  category?: string;
  description?: string;
}

export interface ProjectConfig {
  name: string;
  path: string;
  environment: 'dev' | 'staging' | 'prod';
  secrets: Record<string, string>;
  tools: string[];
}

export interface SyncResult {
  success: boolean;
  syncedItems: Array<{
    source: string;
    target: string;
    status: 'success' | 'error' | 'skipped';
    message?: string;
  }>;
  timestamp: string;
}

export interface SharedResourceManifest {
  version: string;
  shared_resources: Array<{
    type: 'symlink_file' | 'symlink_dir' | 'copy_file' | 'copy_dir';
    source: string;
    target: string;
    description?: string;
  }>;
}

/**
 * AgentBridgeService - Bridge between Python CLI and TypeScript agents
 * 
 * This service leverages the existing production-ready Python CLI infrastructure
 * (cli.py, secret_broker.py, env_scanner.py) and integrates it with the
 * TypeScript agent ecosystem using the Kernel Event Bus (KEB).
 */
export class AgentBridgeService {
  private pythonExecutable: string;
  private cliPath: string;
  
  constructor(pythonExecutable = 'python3', cliPath = './cli.py') {
    this.pythonExecutable = pythonExecutable;
    this.cliPath = cliPath;
  }

  /**
   * Scan a project directory for secret requirements using the Python env_scanner
   * 
   * @param projectPath - Path to the project directory
   * @returns Array of secret suggestions with confidence scores
   */
  async scanProjectSecrets(projectPath: string): Promise<SecretSuggestion[]> {
    try {
      logger.info('Scanning project for secret requirements', { projectPath });
      
      const command = `${this.pythonExecutable} ${this.cliPath} scan "${projectPath}"`;
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        logger.warn('Scanner produced warnings', { stderr });
      }

      // Parse the CLI output - expects JSON format from Python scanner
      const scanResult = JSON.parse(stdout);
      
      const suggestions: SecretSuggestion[] = [];
      
      // Convert env_keys to suggestions
      if (scanResult.env_keys) {
        for (const key of scanResult.env_keys) {
          suggestions.push({
            key,
            source: 'env',
            confidence: 0.9,
            category: this.categorizeSecretKey(key),
            description: `Environment variable found in project files`
          });
        }
      }
      
      // Convert tools to suggestions (they might need API keys)
      if (scanResult.tools) {
        for (const tool of scanResult.tools) {
          const toolSecrets = this.getToolSecretRequirements(tool);
          suggestions.push(...toolSecrets);
        }
      }
      
      logger.info('Secret scan completed', { 
        projectPath, 
        suggestionsCount: suggestions.length 
      });
      
      return suggestions;
      
    } catch (error) {
      logger.error('Failed to scan project secrets', { 
        projectPath, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw new Error(`Secret scanning failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Bind project configuration using Python CLI link functionality
   * 
   * @param projectName - Name of the project
   * @param config - Project configuration including secrets and tools
   * @returns Success status
   */
  async bindProjectConfiguration(projectName: string, config: ProjectConfig): Promise<void> {
    try {
      logger.info('Binding project configuration', { projectName, configPath: config.path });
      
      // First, add secrets to the secure broker
      for (const [key, value] of Object.entries(config.secrets)) {
        await this.addSecretToBroker(key, value, true); // Use secure mode
      }
      
      // Then link the project using Python CLI
      const linkCommand = `${this.pythonExecutable} ${this.cliPath} link "${config.path}" --secure`;
      const { stdout, stderr } = await execAsync(linkCommand);
      
      if (stderr) {
        logger.warn('Link command produced warnings', { stderr });
      }
      
      logger.info('Project configuration bound successfully', { 
        projectName, 
        secretsCount: Object.keys(config.secrets).length,
        toolsCount: config.tools.length 
      });
      
    } catch (error) {
      logger.error('Failed to bind project configuration', { 
        projectName, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw new Error(`Project binding failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Synchronize shared resources using Python CLI sync functionality
   * 
   * @param manifest - Shared resource manifest
   * @returns Sync result with detailed status
   */
  async syncSharedResources(manifest: SharedResourceManifest): Promise<SyncResult> {
    try {
      logger.info('Syncing shared resources', { manifestVersion: manifest.version });
      
      // Create temporary manifest file for Python CLI
      const tempManifestPath = join(process.cwd(), '.temp_shared_resources.yaml');
      const yaml = require('js-yaml');
      const fs = require('fs').promises;
      
      await fs.writeFile(tempManifestPath, yaml.dump(manifest));
      
      const syncCommand = `${this.pythonExecutable} ${this.cliPath} sync-shared-resources . "${tempManifestPath}"`;
      const { stdout, stderr } = await execAsync(syncCommand);
      
      // Clean up temp file
      await fs.unlink(tempManifestPath);
      
      if (stderr) {
        logger.warn('Sync command produced warnings', { stderr });
      }
      
      // Parse sync result from CLI output
      const syncResult: SyncResult = {
        success: true,
        syncedItems: [],
        timestamp: new Date().toISOString()
      };
      
      // Extract sync status from stdout (Python CLI should output JSON)
      try {
        const cliResult = JSON.parse(stdout);
        if (cliResult.synced_items) {
          syncResult.syncedItems = cliResult.synced_items.map((item: any) => ({
            source: item.source || '',
            target: item.target || '',
            status: item.status || 'unknown',
            message: item.message
          }));
        }
      } catch (parseError) {
        logger.warn('Could not parse CLI sync output as JSON', { stdout });
      }
      
      logger.info('Shared resources sync completed', { 
        itemsCount: syncResult.syncedItems.length 
      });
      
      return syncResult;
      
    } catch (error) {
      logger.error('Failed to sync shared resources', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      return {
        success: false,
        syncedItems: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Add a secret to the Python SecretBroker in secure mode
   * 
   * @param key - Secret key
   * @param value - Secret value
   * @param secure - Use secure encryption
   * @returns Success status
   */
  async addSecretToBroker(key: string, value: string, secure = true): Promise<boolean> {
    try {
      const secureFlag = secure ? '--secure' : '';
      const command = `${this.pythonExecutable} ${this.cliPath} add-secret "${key}" "${value}" ${secureFlag}`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        logger.warn('Add secret command produced warnings', { stderr });
      }
      
      logger.info('Secret added to broker', { key, secure });
      return true;
      
    } catch (error) {
      logger.error('Failed to add secret to broker', { 
        key, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Bootstrap a project using Python CLI bootstrap functionality
   * 
   * @param projectPath - Path to the project
   * @param secure - Use secure mode
   * @returns Success status
   */
  async bootstrapProject(projectPath: string, secure = true): Promise<boolean> {
    try {
      logger.info('Bootstrapping project', { projectPath, secure });
      
      const secureFlag = secure ? '--secure' : '';
      const command = `${this.pythonExecutable} ${this.cliPath} bootstrap "${projectPath}" ${secureFlag}`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        logger.warn('Bootstrap command produced warnings', { stderr });
      }
      
      logger.info('Project bootstrapped successfully', { projectPath });
      return true;
      
    } catch (error) {
      logger.error('Failed to bootstrap project', { 
        projectPath, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Categorize a secret key based on common patterns
   * 
   * @param key - Secret key to categorize
   * @returns Category string
   */
  private categorizeSecretKey(key: string): string {
    const keyLower = key.toLowerCase();
    
    if (keyLower.includes('api') || keyLower.includes('token')) {
      return 'api_credentials';
    } else if (keyLower.includes('db') || keyLower.includes('database')) {
      return 'database';
    } else if (keyLower.includes('auth') || keyLower.includes('secret') || keyLower.includes('key')) {
      return 'authentication';
    } else if (keyLower.includes('url') || keyLower.includes('endpoint')) {
      return 'endpoints';
    } else if (keyLower.includes('email') || keyLower.includes('smtp')) {
      return 'communication';
    } else {
      return 'general';
    }
  }

  /**
   * Get secret requirements for a specific tool
   * 
   * @param tool - Tool name
   * @returns Array of secret suggestions for the tool
   */
  private getToolSecretRequirements(tool: string): SecretSuggestion[] {
    const suggestions: SecretSuggestion[] = [];
    
    // Common tool secret patterns
    const toolSecrets: Record<string, string[]> = {
      'docker': ['DOCKER_HUB_TOKEN', 'DOCKER_REGISTRY_URL'],
      'github': ['GITHUB_TOKEN', 'GITHUB_API_KEY'],
      'aws': ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
      'stripe': ['STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET'],
      'openai': ['OPENAI_API_KEY', 'OPENAI_ORG_ID'],
      'anthropic': ['ANTHROPIC_API_KEY'],
      'redis': ['REDIS_URL', 'REDIS_PASSWORD'],
      'mongodb': ['MONGODB_URI', 'MONGODB_PASSWORD'],
      'postgresql': ['DATABASE_URL', 'DB_PASSWORD'],
      'sendgrid': ['SENDGRID_API_KEY'],
      'slack': ['SLACK_BOT_TOKEN', 'SLACK_WEBHOOK_URL']
    };
    
    const toolLower = tool.toLowerCase();
    for (const [toolPattern, secrets] of Object.entries(toolSecrets)) {
      if (toolLower.includes(toolPattern)) {
        for (const secret of secrets) {
                    suggestions.push({            key: secret,            source: 'scaffold',            confidence: 0.7,            category: 'api_credentials',            description: `${tool} integration secret`          });
        }
        break;
      }
    }
    
    return suggestions;
  }

  /**
   * Check if Python CLI is available and functional
   * 
   * @returns True if CLI is available
   */
  async checkCliAvailability(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`${this.pythonExecutable} ${this.cliPath} list`);
      return true;
    } catch (error) {
      logger.warn('Python CLI not available', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }
} 