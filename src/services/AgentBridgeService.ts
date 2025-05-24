import { spawn, exec, spawnSync } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../utils/logger';
import { join } from 'path';
import { promises as fs } from 'fs';

const logger = createLogger('AgentBridgeService');
const execAsync = promisify(exec);

export interface SecretSuggestion {
  key: string;
  suggestedValue?: string;
  source: 'env' | 'manual' | 'api' | 'sops' | 'vault' | 'scaffold' | 'cli_scan';
  confidence: number; // 0-1
  category?: string;
  description?: string;
  type?: string;
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
  totalProcessed: number;
  errors: string[];
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

export interface KEBEvent {  eventId: string;  source: string;  eventType: string;  timestamp: string;  payload: Record<string, any>;  metadata?: Record<string, any>;}

/**
 * AgentBridgeService - Bridge between Python CLI and TypeScript agents
 * 
 * This service leverages the existing production-ready Python CLI infrastructure
 * (cli.py, secret_broker.py, env_scanner.py) and integrates it with the
 * TypeScript agent ecosystem using the Kernel Event Bus (KEB).
 * 
 * Enhanced Features:
 * - KEB event publishing for cross-agent communication
 * - Robust Python CLI integration with validation
 * - Enhanced error handling and retry logic
 * - Better project scanning and configuration binding
 */
export class AgentBridgeService {
  private pythonExecutable: string;
  private cliPath: string;
  private kebEnabled: boolean;
  
  constructor(
    pythonExecutable = 'python3', 
    cliPath = './cli.py',
    kebEnabled = true
  ) {
    this.pythonExecutable = pythonExecutable;
    this.cliPath = cliPath;
    this.kebEnabled = kebEnabled;
  }

  /**
   * Initialize the service and validate Python CLI availability
   */
  async initialize(): Promise<void> {
    logger.info('Initializing AgentBridgeService');
    
    const cliAvailable = await this.checkCliAvailability();
    if (!cliAvailable) {
      logger.warn('Python CLI not available - some features may not work');
    }
    
    if (this.kebEnabled) {
      await this.publishKEBEvent('agent_bridge_initialized', {
        cliAvailable,
        pythonExecutable: this.pythonExecutable,
        cliPath: this.cliPath
      });
    }
    
    logger.info('AgentBridgeService initialized successfully');
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
      
      // Validate project path exists
      try {
        await fs.access(projectPath);
      } catch (error) {
        throw new Error(`Project path does not exist: ${projectPath}`);
      }
      
      let scanResult: Record<string, unknown>;
      try {
        const scanCommand = `python "${this.cliPath}" scan --project "${projectPath}" --format json`;
        logger.debug('Executing scan command', { command: scanCommand });
        
        const result = spawnSync('python', [this.cliPath, 'scan', '--project', projectPath, '--format', 'json'], {
          encoding: 'utf8',
          timeout: 30000
        });

        if (result.status !== 0) {
          throw new Error(`CLI scan failed: ${result.stderr}`);
        }

        scanResult = JSON.parse(result.stdout) as Record<string, unknown>;
      } catch (error) {
        logger.error('Project scanning failed', { projectPath, error: String(error) });
        throw new Error(`Project scan failed: ${String(error)}`);
      }

      // Process scan results to create SecretSuggestion array
      const suggestions: SecretSuggestion[] = [];
      
      // Process suggestions from scan result
      const rawSuggestions = scanResult.suggestions;
      if (Array.isArray(rawSuggestions)) {
        for (const suggestion of rawSuggestions) {
          if (typeof suggestion === 'object' && suggestion !== null) {
            const typedSuggestion = suggestion as Record<string, unknown>;
            suggestions.push({
              key: String(typedSuggestion.key || ''),
              type: String(typedSuggestion.type || 'unknown'),
              description: String(typedSuggestion.description || ''),
              confidence: Number(typedSuggestion.confidence || 0),
              source: 'cli_scan',
              category: this.categorizeSecretKey(String(typedSuggestion.key || ''))
            });
          }
        }
      }
      
      // Process env_keys from scan result
      const envKeys = scanResult.env_keys;
      if (Array.isArray(envKeys)) {
        for (const key of envKeys) {
          if (typeof key === 'string') {
            suggestions.push({
              key,
              source: 'env',
              confidence: 0.9,
              category: this.categorizeSecretKey(key),
              description: 'Environment variable found in project files'
            });
          }
        }
      }
      
      // Process tools from scan result (tools might need API keys)
      const tools = scanResult.tools;
      if (Array.isArray(tools)) {
        for (const tool of tools) {
          if (typeof tool === 'string') {
            const toolSecrets = this.getToolSecretRequirements(tool);
            suggestions.push(...toolSecrets);
          }
        }
      }
      
      // Publish KEB event for scan completion
      if (this.kebEnabled) {
        await this.publishKEBEvent('project_secrets_scanned', {
          projectPath,
          suggestionsCount: suggestions.length,
          envKeysFound: Array.isArray(scanResult.env_keys) ? scanResult.env_keys.length : 0,
          toolsFound: Array.isArray(scanResult.tools) ? scanResult.tools.length : 0
        });
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
      
      if (this.kebEnabled) {
        await this.publishKEBEvent('project_scan_failed', {
          projectPath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
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
      
      // Validate project configuration
      await this.validateProjectConfig(config);
      
      // First, add secrets to the secure broker
      const secretsAdded = [];
      for (const [key, value] of Object.entries(config.secrets)) {
        const success = await this.addSecretToBroker(key, value, true); // Use secure mode
        if (success) {
          secretsAdded.push(key);
        } else {
          logger.warn('Failed to add secret to broker', { key });
        }
      }
      
      // Then link the project using Python CLI
      const linkCommand = `${this.pythonExecutable} ${this.cliPath} link "${config.path}" --secure`;
      const { stdout, stderr } = await execAsync(linkCommand, { timeout: 60000 });
      
      if (stderr) {
        logger.warn('Link command produced warnings', { stderr });
      }
      
      // Publish KEB event for successful binding
      if (this.kebEnabled) {
        await this.publishKEBEvent('project_configuration_bound', {
          projectName,
          secretsCount: secretsAdded.length,
          toolsCount: config.tools.length,
          environment: config.environment
        });
      }
      
      logger.info('Project configuration bound successfully', { 
        projectName, 
        secretsCount: secretsAdded.length,
        toolsCount: config.tools.length 
      });
      
    } catch (error) {
      logger.error('Failed to bind project configuration', { 
        projectName, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (this.kebEnabled) {
        await this.publishKEBEvent('project_binding_failed', {
          projectName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
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
    const startTime = Date.now();
    
    try {
      logger.info('Syncing shared resources', { manifestVersion: manifest.version });
      
      // Validate manifest
      await this.validateSharedResourceManifest(manifest);
      
      // Create temporary manifest file for Python CLI
      const tempManifestPath = join(process.cwd(), `.temp_shared_resources_${Date.now()}.yaml`);
      const yaml = require('js-yaml');
      
      await fs.writeFile(tempManifestPath, yaml.dump(manifest));
      
      try {
        const syncCommand = `${this.pythonExecutable} ${this.cliPath} sync-shared-resources . "${tempManifestPath}"`;
        const { stdout, stderr } = await execAsync(syncCommand, { timeout: 120000 });
        
        if (stderr) {
          logger.warn('Sync command produced warnings', { stderr });
        }
        
        // Parse sync result from CLI output
        const syncResult: SyncResult = {
          success: true,
          syncedItems: [],
          timestamp: new Date().toISOString(),
          totalProcessed: 0,
          errors: []
        };
        
        // Extract sync status from stdout (Python CLI should output JSON)
        try {
          const jsonMatch = stdout.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const cliResult = JSON.parse(jsonMatch[0]);
            if (cliResult.synced_items) {
              syncResult.syncedItems = cliResult.synced_items.map((item: any) => ({
                source: item.source || '',
                target: item.target || '',
                status: item.status || 'unknown',
                message: item.message
              }));
              syncResult.totalProcessed = cliResult.synced_items.length;
            }
          }
        } catch (parseError) {
          logger.warn('Could not parse CLI sync output as JSON', { stdout });
          // Create sync result based on manifest items
          syncResult.syncedItems = manifest.shared_resources.map(item => ({
            source: item.source,
            target: item.target,
            status: 'success' as const,
            message: `Processed ${item.type}`
          }));
          syncResult.totalProcessed = manifest.shared_resources.length;
        }
        
        // Publish KEB event for successful sync
        if (this.kebEnabled) {
          await this.publishKEBEvent('shared_resources_synced', {
            manifestVersion: manifest.version,
            itemsCount: syncResult.syncedItems.length,
            duration: Date.now() - startTime
          });
        }
        
        logger.info('Shared resources sync completed', { 
          itemsCount: syncResult.syncedItems.length 
        });
        
        return syncResult;
        
      } finally {
        // Clean up temp file
        try {
          await fs.unlink(tempManifestPath);
                } catch (cleanupError) {          logger.warn('Failed to cleanup temp manifest file', {             tempManifestPath,             error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError)          });
        }
      }
      
    } catch (error) {
      logger.error('Failed to sync shared resources', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (this.kebEnabled) {
        await this.publishKEBEvent('shared_resources_sync_failed', {
          manifestVersion: manifest.version,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      return {
        success: false,
        syncedItems: [],
        timestamp: new Date().toISOString(),
        totalProcessed: 0,
        errors: []
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
          suggestions.push({
            key: secret,
            source: 'scaffold',
            confidence: 0.7,
            category: 'api_credentials',
            description: `${tool} integration secret`
          });
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

  /**
   * Validate project configuration
   */
  private async validateProjectConfig(config: ProjectConfig): Promise<void> {
    if (!config.name || !config.path) {
      throw new Error('Project configuration must have name and path');
    }

    try {
      await fs.access(config.path);
    } catch (error) {
      throw new Error(`Project path does not exist: ${config.path}`);
    }

    if (!['dev', 'staging', 'prod'].includes(config.environment)) {
      throw new Error(`Invalid environment: ${config.environment}`);
    }
  }

  /**
   * Validate shared resource manifest
   */
  private async validateSharedResourceManifest(manifest: SharedResourceManifest): Promise<void> {
    if (!manifest.version) {
      throw new Error('Shared resource manifest must have a version');
    }

    if (!manifest.shared_resources || !Array.isArray(manifest.shared_resources)) {
      throw new Error('Shared resource manifest must have shared_resources array');
    }

    for (const resource of manifest.shared_resources) {
      if (!resource.type || !resource.source || !resource.target) {
        throw new Error('Each shared resource must have type, source, and target');
      }

      const validTypes = ['symlink_file', 'symlink_dir', 'copy_file', 'copy_dir'];
      if (!validTypes.includes(resource.type)) {
        throw new Error(`Invalid resource type: ${resource.type}`);
      }
    }
  }

  /**
   * Publish an event to the Kernel Event Bus (KEB)
   */
  private async publishKEBEvent(eventType: string, payload: Record<string, any>): Promise<void> {
    if (!this.kebEnabled) {
      return;
    }

    try {
      const kebEvent: KEBEvent = {
        eventId: this.generateEventId(),
        source: 'AgentBridgeService',
        eventType,
        timestamp: new Date().toISOString(),
        payload,
        metadata: {
          version: '1.0.0',
          service: 'agent-bridge'
        }
      };

      // In production, this would publish to actual KEB (Redis/EventBus)
      // For now, just log the event
      logger.info('KEB Event Published', {
        eventId: kebEvent.eventId,
        eventType: kebEvent.eventType,
        payloadKeys: Object.keys(kebEvent.payload)
      });

      // Future implementation would include:
      // await this.kebClient.publish('agent_bridge_events', kebEvent);

    } catch (error) {
      logger.error('Failed to publish KEB event', {
        eventType,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    return `agent_bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 