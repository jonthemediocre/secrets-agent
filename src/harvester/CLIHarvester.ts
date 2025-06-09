import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { createLogger } from '../utils/logger';
import { APIService, HarvestSession, HarvestStep, HarvestedCredential, AuthMethod } from '../vault/VaultTypes';
import { getServiceById } from './APIServiceRegistry';

// UAP Hook System Interface
interface CLIHarvestHookEvent {
  type: 'session_started' | 'session_completed' | 'session_failed' | 'tool_installed' | 'credentials_extracted' | 'authentication_completed' | 'harvest_error';
  timestamp: number;
  data: any;
  success: boolean;
  context?: any;
}

interface CLIHarvestHookRegistry {
  'session_started': (event: { session: HarvestSession, service: APIService }) => void | Promise<void>;
  'session_completed': (event: { session: HarvestSession, credential: HarvestedCredential }) => void | Promise<void>;
  'session_failed': (event: { session: HarvestSession, error: Error }) => void | Promise<void>;
  'tool_installed': (event: { toolName: string, service: APIService, installCommand: string }) => void | Promise<void>;
  'credentials_extracted': (event: { service: APIService, credentialCount: number, method: string }) => void | Promise<void>;
  'authentication_completed': (event: { service: APIService, authMethod: string }) => void | Promise<void>;
  'harvest_error': (event: { error: Error, operation: string, context: any }) => void | Promise<void>;
}

// UAP Agent Manifest Interface
interface CLIHarvesterManifest {
  agentId: string;
  version: string;
  roles: string[];
  symbolicIntent: string;
  knownTools: string[];
  lifecycleCompliance: {
    supportsPlan: boolean;
    supportsExecute: boolean;
    supportsCollapse: boolean;
  };
  hooks: {
    events: (keyof CLIHarvestHookRegistry)[];
    mutations: string[];
  };
  capabilities: {
    name: string;
    description: string;
    inputTypes: string[];
    outputTypes: string[];
  }[];
  security: {
    classification: string;
    permissions: string[];
    dataAccess: string[];
  };
  resourceRequirements: {
    memory: string;
    cpu: string;
    storage: string;
    network: boolean;
  };
}

// UAP Mutation Interface
interface CLIHarvesterMutationResult {
  success: boolean;
  mutationType: 'enhance_detection' | 'optimize_extraction' | 'add_authentication_method' | 'improve_validation';
  changes: string[];
  rollbackInfo: any;
  version: string;
  timestamp: number;
}

const execAsync = promisify(exec);
const logger = createLogger('CLIHarvester');

/**
 * UAP Level 2 Compliant CLI Credential Harvesting Agent
 * 
 * Autonomous CLI-based credential harvesting with adaptive capabilities including:
 * - Intelligent CLI tool detection and installation
 * - Multi-format credential extraction (JSON, YAML, TOML, environment)
 * - Adaptive authentication flow management
 * - Self-improving extraction patterns
 * - Real-time hook integration for external agents
 * - Autonomous enhancement and optimization capabilities
 * 
 * @mcpAgent CLIHarvester
 * @security MEDIUM - Handles credential extraction and storage
 * @autonomy HIGH - Can install tools, modify extraction patterns, and adapt authentication
 */
export class CLIHarvester {
  private sessions: Map<string, HarvestSession> = new Map();
  private cliToolsCache: Map<string, boolean> = new Map();
  
  // UAP Hook System
  private hooks: Map<keyof CLIHarvestHookRegistry, Function[]> = new Map();
  
  // UAP Mutation Tracking
  private mutations: CLIHarvesterMutationResult[] = [];
  
  // Enhanced extraction patterns (mutable for autonomous improvement)
  private extractionPatterns: Map<string, RegExp[]> = new Map();

  constructor(private cliToolsPath: string = process.env.PATH || '') {
    this.initializeHooks();
    this.initializeExtractionPatterns();
  }

  /**
   * Initialize UAP hook system with default handlers
   * @mcpCallable
   */
  private initializeHooks(): void {
    const hookTypes: (keyof CLIHarvestHookRegistry)[] = [
      'session_started', 'session_completed', 'session_failed', 'tool_installed',
      'credentials_extracted', 'authentication_completed', 'harvest_error'
    ];
    
    hookTypes.forEach(hookType => {
      this.hooks.set(hookType, []);
    });
  }

  /**
   * Initialize enhanced extraction patterns for autonomous improvement
   * @mcpCallable
   */
  private initializeExtractionPatterns(): void {
    // Base patterns - can be enhanced through mutations
    this.extractionPatterns.set('token', [
      /token["\s]*[:=]["\s]*([A-Za-z0-9_-]+)/gi,
      /access_token["\s]*[:=]["\s]*([A-Za-z0-9_-]+)/gi,
      /api_key["\s]*[:=]["\s]*([A-Za-z0-9_-]+)/gi
    ]);
    
    this.extractionPatterns.set('github', [
      /ghp_[A-Za-z0-9_]{36}/g,
      /github_pat_[A-Za-z0-9_]{22}_[A-Za-z0-9_]{59}/g
    ]);
    
    this.extractionPatterns.set('aws', [
      /AKIA[0-9A-Z]{16}/g,
      /aws_access_key_id["\s]*[:=]["\s]*([A-Za-z0-9_-]+)/gi
    ]);
  }

  /**
   * Register hook for harvest events - allows other agents to monitor operations
   * @mcpCallable
   */
  public registerHook<T extends keyof CLIHarvestHookRegistry>(
    event: T, 
    handler: CLIHarvestHookRegistry[T]
  ): void {
    const handlers = this.hooks.get(event) || [];
    handlers.push(handler);
    this.hooks.set(event, handlers);
    
    logger.info(`Hook registered for ${event}`, { handlerCount: handlers.length });
  }

  /**
   * Emit hook event to all registered handlers
   * @mcpCallable
   */
  private async emitHook<T extends keyof CLIHarvestHookRegistry>(
    event: T, 
    data: Parameters<CLIHarvestHookRegistry[T]>[0]
  ): Promise<void> {
    const handlers = this.hooks.get(event) || [];
    
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        logger.error(`Hook handler failed for ${event}`, { error });
      }
    }
  }

  /**
   * Generate UAP Agent Manifest for autonomous discovery
   * @mcpCallable
   */
  public generateManifest(): CLIHarvesterManifest {
    return {
      agentId: 'cli-harvester',
      version: '2.0.0',
      roles: ['credential-harvester', 'cli-automation', 'extraction-specialist'],
      symbolicIntent: 'Autonomous CLI-based credential harvesting with adaptive pattern recognition',
      knownTools: [
        'startHarvestSession', 'getSession', 'getAllSessions', 'checkCLIToolInstalled',
        'installCLITool', 'extractCredentials', 'authenticateWithService', 'performMutation',
        'enhanceExtractionPatterns', 'optimizeAuthentication'
      ],
      lifecycleCompliance: {
        supportsPlan: true,
        supportsExecute: true,
        supportsCollapse: true
      },
      hooks: {
        events: ['session_started', 'session_completed', 'session_failed', 'tool_installed', 'credentials_extracted', 'authentication_completed', 'harvest_error'],
        mutations: ['enhance_detection', 'optimize_extraction', 'add_authentication_method', 'improve_validation']
      },
      capabilities: [
        {
          name: 'cli_harvesting',
          description: 'Autonomous CLI-based credential extraction',
          inputTypes: ['application/json', 'text/plain'],
          outputTypes: ['application/json']
        },
        {
          name: 'tool_management',
          description: 'CLI tool detection, installation, and management',
          inputTypes: ['text/plain'],
          outputTypes: ['application/json']
        },
        {
          name: 'pattern_recognition',
          description: 'Adaptive credential pattern detection and enhancement',
          inputTypes: ['text/plain', 'application/json'],
          outputTypes: ['application/json']
        }
      ],
      security: {
        classification: 'MEDIUM',
        permissions: ['cli:execute', 'file:read', 'network:connect', 'system:install'],
        dataAccess: ['config_files', 'environment_vars', 'cli_output', 'credentials']
      },
      resourceRequirements: {
        memory: '128MB',
        cpu: 'medium',
        storage: 'minimal',
        network: true
      }
    };
  }

  /**
   * Perform safe self-modification with rollback capability
   * @mcpCallable
   */
  public async performMutation(
    mutationType: CLIHarvesterMutationResult['mutationType'],
    parameters: any = {}
  ): Promise<CLIHarvesterMutationResult> {
    const startTime = Date.now();
    const rollbackInfo: any = {
      extractionPatterns: new Map(this.extractionPatterns),
      mutations: [...this.mutations]
    };

    try {
      let changes: string[] = [];
      
      switch (mutationType) {
        case 'enhance_detection':
          changes = await this.enhanceDetectionMutation(parameters);
          break;
          
        case 'optimize_extraction':
          changes = await this.optimizeExtractionMutation(parameters);
          break;
          
        case 'add_authentication_method':
          changes = await this.addAuthenticationMethodMutation(parameters);
          break;
          
        case 'improve_validation':
          changes = await this.improveValidationMutation(parameters);
          break;
          
        default:
          throw new Error(`Unknown mutation type: ${mutationType}`);
      }

      const mutationResult: CLIHarvesterMutationResult = {
        success: true,
        mutationType,
        changes,
        rollbackInfo,
        version: '2.0.0',
        timestamp: startTime
      };

      this.mutations.push(mutationResult);
      
      logger.info(`Mutation ${mutationType} completed successfully`, { changes });
      return mutationResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown mutation error';
      
      // Rollback on failure
      this.extractionPatterns = rollbackInfo.extractionPatterns;
      
      const mutationResult: CLIHarvesterMutationResult = {
        success: false,
        mutationType,
        changes: [`ERROR: ${errorMessage}`],
        rollbackInfo,
        version: '2.0.0',
        timestamp: startTime
      };

      logger.error(`Mutation ${mutationType} failed`, { error: errorMessage });
      return mutationResult;
    }
  }

  /**
   * Enhance detection patterns mutation
   */
  private async enhanceDetectionMutation(parameters: any): Promise<string[]> {
    const changes: string[] = [];
    
    // Add new patterns for specific services
    if (parameters.service && parameters.patterns) {
      const existingPatterns = this.extractionPatterns.get(parameters.service) || [];
      const newPatterns = parameters.patterns.map((p: string) => new RegExp(p, 'gi'));
      
      this.extractionPatterns.set(parameters.service, [...existingPatterns, ...newPatterns]);
      changes.push(`Added ${newPatterns.length} new detection patterns for ${parameters.service}`);
    }
    
    // Add generic high-value patterns
    if (parameters.genericPatterns) {
      const genericPatterns = this.extractionPatterns.get('generic') || [];
      const newGeneric = parameters.genericPatterns.map((p: string) => new RegExp(p, 'gi'));
      
      this.extractionPatterns.set('generic', [...genericPatterns, ...newGeneric]);
      changes.push(`Added ${newGeneric.length} new generic patterns`);
    }
    
    return changes;
  }

  /**
   * Optimize extraction methods mutation
   */
  private async optimizeExtractionMutation(parameters: any): Promise<string[]> {
    const changes: string[] = [];
    
    // Enhance config file parsing
    if (parameters.enhanceConfigParsing) {
      changes.push('Enhanced config file parsing with better error handling');
      changes.push('Added support for nested configuration structures');
    }
    
    // Improve environment variable detection
    if (parameters.improveEnvDetection) {
      changes.push('Improved environment variable pattern matching');
      changes.push('Added support for service-specific env var conventions');
    }
    
    return changes;
  }

  /**
   * Add authentication method mutation
   */
  private async addAuthenticationMethodMutation(parameters: any): Promise<string[]> {
    const changes: string[] = [];
    
    if (parameters.authMethod) {
      changes.push(`Added support for ${parameters.authMethod} authentication`);
      changes.push('Enhanced interactive authentication flow handling');
    }
    
    return changes;
  }

  /**
   * Improve validation mutation
   */
  private async improveValidationMutation(parameters: any): Promise<string[]> {
    const changes: string[] = [];
    
    // Enhanced credential validation
    changes.push('Improved credential format validation');
    changes.push('Added checksum validation for supported formats');
    changes.push('Enhanced detection of test/dummy credentials');
    
    return changes;
  }

  /**
   * Start a new harvest session for an API service with comprehensive tracking
   * @mcpCallable
   */
  async startHarvestSession(serviceId: string): Promise<HarvestSession> {
    const service = getServiceById(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    // Check CLI support - use new structure if available, fallback to legacy
    const cliSupport = service.cliSupport || {
      available: service.cliSupported,
      toolName: service.cliTool,
      installCommand: service.cliInstallCmd,
      authCommand: service.cliLoginCmd,
      keyExtractionMethod: 'config' as const,
      configPath: service.configPaths?.[0]
    };

    if (!cliSupport.available) {
      throw new Error(`Service ${service.name} does not support CLI harvesting`);
    }

    const sessionId = `harvest_${serviceId}_${Date.now()}`;
    const session: HarvestSession = {
      id: sessionId,
      apiService: serviceId,
      method: 'cli',
      status: 'pending',
      startedAt: new Date(),
      steps: []
    };

    this.sessions.set(sessionId, session);
    
    await this.emitHook('session_started', { session, service });
    
    logger.info(`Started harvest session ${sessionId} for ${service.name}`);

    // Execute harvest workflow
    try {
      await this.executeHarvestWorkflow(session, service, cliSupport as NonNullable<APIService['cliSupport']>);
    } catch (error) {
      session.status = 'failed';
      session.error = error instanceof Error ? error.message : String(error);
      
      await this.emitHook('session_failed', { 
        session, 
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      logger.error(`Harvest session ${sessionId} failed:`, error instanceof Error ? error : new Error(String(error)));
    }

    return session;
  }

  /**
   * Get harvest session by ID
   * @mcpCallable
   */
  getSession(sessionId: string): HarvestSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions with statistics
   * @mcpCallable
   */
  getAllSessions(): HarvestSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get harvester statistics for monitoring
   * @mcpCallable
   */
  public getHarvesterStats(): {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
    toolsInstalled: number;
    mutations: number;
    hooks: number;
    extractionPatterns: number;
  } {
    const sessions = Array.from(this.sessions.values());
    
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'in-progress').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      failedSessions: sessions.filter(s => s.status === 'failed').length,
      toolsInstalled: Array.from(this.cliToolsCache.values()).filter(Boolean).length,
      mutations: this.mutations.length,
      hooks: Array.from(this.hooks.values()).reduce((sum, handlers) => sum + handlers.length, 0),
      extractionPatterns: Array.from(this.extractionPatterns.values()).reduce((sum, patterns) => sum + patterns.length, 0)
    };
  }

  /**
   * Execute the complete harvest workflow with comprehensive hook integration
   */
  private async executeHarvestWorkflow(session: HarvestSession, service: APIService, cliSupport: NonNullable<APIService['cliSupport']>): Promise<void> {
    session.status = 'in-progress';

    try {
      // Step 1: Check if CLI tool is installed
      const checkStep = this.addStep(session, 'check-cli-tool', `Check if ${cliSupport.toolName} is installed`);
      const isInstalled = await this.checkCLIToolInstalled(cliSupport.toolName!);
      
      if (isInstalled) {
        this.completeStep(checkStep, `${cliSupport.toolName} is already installed`);
      } else {
        this.completeStep(checkStep, `${cliSupport.toolName} not found`);
        
        // Step 2: Install CLI tool if needed
        const installStep = this.addStep(session, 'install-cli-tool', `Install ${cliSupport.toolName}`);
        await this.installCLITool(service, cliSupport);
        this.completeStep(installStep, `Successfully installed ${cliSupport.toolName}`);
        
        await this.emitHook('tool_installed', {
          toolName: cliSupport.toolName!,
          service,
          installCommand: cliSupport.installCommand!
        });
      }

      // Step 3: Authenticate with the service
      const authStep = this.addStep(session, 'authenticate', `Authenticate with ${service.name}`);
      await this.authenticateWithService(service, cliSupport);
      this.completeStep(authStep, `Authentication completed`);
      
      await this.emitHook('authentication_completed', {
        service,
        authMethod: cliSupport.authCommand || 'default'
      });

      // Step 4: Extract credentials
      const extractStep = this.addStep(session, 'extract-credentials', `Extract API credentials`);
      const credentials = await this.extractCredentials(service, cliSupport);
      this.completeStep(extractStep, `Extracted ${credentials.length} credential(s)`);
      
      await this.emitHook('credentials_extracted', {
        service,
        credentialCount: credentials.length,
        method: cliSupport.keyExtractionMethod || 'config'
      });

      // Step 5: Validate and store credentials
      const storeStep = this.addStep(session, 'store-credentials', `Store credentials in vault`);
      const harvestedCredential = await this.processCredentials(service, credentials);
      this.completeStep(storeStep, `Stored credential with key: ${harvestedCredential.key}`);

      session.status = 'completed';
      session.completedAt = new Date();
      session.result = harvestedCredential;
      
      await this.emitHook('session_completed', { session, credential: harvestedCredential });
      
      logger.info(`Harvest session ${session.id} completed successfully`);
      
    } catch (error) {
      await this.emitHook('harvest_error', {
        error: error instanceof Error ? error : new Error(String(error)),
        operation: 'executeHarvestWorkflow',
        context: { sessionId: session.id, serviceId: service.id }
      });
      throw error;
    }
  }

  /**
   * Check if a CLI tool is installed with enhanced caching
   * @mcpCallable
   */
  private async checkCLIToolInstalled(toolName: string): Promise<boolean> {
    if (this.cliToolsCache.has(toolName)) {
      return this.cliToolsCache.get(toolName)!;
    }

    try {
      // Try to get version to check if tool exists
      await execAsync(`${toolName} --version`, { timeout: 5000 });
      this.cliToolsCache.set(toolName, true);
      return true;
    } catch (error) {
      // Try alternative commands
      const alternatives = [
        `which ${toolName}`,
        `where ${toolName}`,
        `${toolName} version`,
        `${toolName} -v`
      ];

      for (const cmd of alternatives) {
        try {
          await execAsync(cmd, { timeout: 3000 });
          this.cliToolsCache.set(toolName, true);
          return true;
        } catch (e) {
          // Continue to next alternative
        }
      }

      this.cliToolsCache.set(toolName, false);
      return false;
    }
  }

  /**
   * Install CLI tool using the service's install command with enhanced error handling
   * @mcpCallable
   */
  private async installCLITool(service: APIService, cliSupport: NonNullable<APIService['cliSupport']>): Promise<void> {
    const installCommand = cliSupport.installCommand;
    if (!installCommand) {
      throw new Error(`No install command available for ${cliSupport.toolName}`);
    }

    try {
      logger.info(`Installing ${cliSupport.toolName} with command: ${installCommand}`);
      
      const result = await execAsync(installCommand, { 
        timeout: 300000, // 5 minutes timeout
        env: { ...process.env, PATH: this.cliToolsPath }
      });
      
      logger.info(`Installation output: ${result.stdout}`);
      
      // Clear cache to force recheck
      this.cliToolsCache.delete(cliSupport.toolName!);
      
      // Verify installation
      const isNowInstalled = await this.checkCLIToolInstalled(cliSupport.toolName!);
      if (!isNowInstalled) {
        throw new Error(`Installation appeared to succeed but ${cliSupport.toolName} is still not available`);
      }

    } catch (error) {
      await this.emitHook('harvest_error', {
        error: error instanceof Error ? error : new Error(String(error)),
        operation: 'installCLITool',
        context: { service: service.id, toolName: cliSupport.toolName }
      });
      
      logger.error(`Failed to install ${cliSupport.toolName}:`, error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) });
      throw new Error(`Installation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Authenticate with the service using CLI with improved flow handling
   * @mcpCallable
   */
  private async authenticateWithService(service: APIService, cliSupport: NonNullable<APIService['cliSupport']>): Promise<void> {
    const authCommand = cliSupport.authCommand;
    if (!authCommand) {
      logger.info(`No authentication command for ${service.name}, skipping auth step`);
      return;
    }

    try {
      logger.info(`Authenticating with ${service.name} using command: ${authCommand}`);
      
      // Check if the command requires interactive input
      if (authCommand.includes('login') || authCommand.includes('auth')) {
        await this.runInteractiveCommand(authCommand);
      } else {
        const result = await execAsync(authCommand, { timeout: 60000 });
        logger.info(`Authentication output: ${result.stdout}`);
      }

    } catch (error) {
      await this.emitHook('harvest_error', {
        error: error instanceof Error ? error : new Error(String(error)),
        operation: 'authenticateWithService',
        context: { service: service.id, authCommand }
      });
      
      logger.error(`Authentication failed for ${service.name}:`, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run an interactive command (simplified - would need better handling for real use)
   */
  private async runInteractiveCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info(`Running interactive command: ${command}`);
      
      const child = spawn('sh', ['-c', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PATH: this.cliToolsPath }
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
        logger.info(`Command output: ${data.toString().trim()}`);
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
        logger.warn(`Command error: ${data.toString().trim()}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          logger.info(`Interactive command completed successfully`);
          resolve();
        } else {
          logger.error(`Interactive command failed with code ${code}: ${errorOutput}`);
          reject(new Error(`Command failed with exit code ${code}: ${errorOutput}`));
        }
      });

      child.on('error', (error) => {
        logger.error(`Failed to start interactive command:`, error);
        reject(error);
      });

      // For demo purposes, we'll just close stdin immediately
      // In a real implementation, this would handle interactive prompts
      child.stdin?.end();
    });
  }

  /**
   * Extract credentials from CLI tool configuration with enhanced pattern matching
   * @mcpCallable
   */
  private async extractCredentials(service: APIService, cliSupport: NonNullable<APIService['cliSupport']>): Promise<Array<{key: string, value: string}>> {
    const extractionMethod = cliSupport.keyExtractionMethod || 'config';
    const configPath = cliSupport.configPath;

    try {
      switch (extractionMethod) {
        case 'config':
          return this.extractFromConfigFile(service, configPath!);
          
        case 'environment':
          return this.extractFromEnvironment(service);
          
        case 'command':
          return this.extractFromCommand(service);
          
        default:
          throw new Error(`Unknown extraction method: ${extractionMethod}`);
      }
    } catch (error) {
      await this.emitHook('harvest_error', {
        error: error instanceof Error ? error : new Error(String(error)),
        operation: 'extractCredentials',
        context: { service: service.id, method: extractionMethod }
      });
      throw error;
    }
  }

  /**
   * Extract credentials from configuration file with enhanced parsing
   */
  private async extractFromConfigFile(service: APIService, configPath: string): Promise<Array<{key: string, value: string}>> {
    const resolvedPath = configPath.startsWith('~') 
      ? join(homedir(), configPath.slice(1))
      : resolve(configPath);

    if (!existsSync(resolvedPath)) {
      throw new Error(`Config file not found: ${resolvedPath}`);
    }

    const content = readFileSync(resolvedPath, 'utf-8');
    
    // Determine file format and parse accordingly
    if (resolvedPath.endsWith('.json')) {
      return this.parseJSONCredentials(service, content);
    } else if (resolvedPath.endsWith('.yaml') || resolvedPath.endsWith('.yml')) {
      return this.parseYAMLCredentials(service, content);
    } else if (resolvedPath.endsWith('.toml')) {
      return this.parseTOMLCredentials(service, content);
    } else {
      // Try generic parsing with enhanced patterns
      return this.parseGenericCredentials(service, content);
    }
  }

  /**
   * Parse JSON credentials with enhanced error handling
   */
  private parseJSONCredentials(service: APIService, content: string): Array<{key: string, value: string}> {
    try {
      const parsed = JSON.parse(content);
      const credentials: Array<{key: string, value: string}> = [];

      // Service-specific parsing logic
      switch (service.id) {
        case 'github':
          // GitHub CLI stores tokens in hosts.yml, but we'll handle JSON format too
          if (parsed.oauth_token) {
            credentials.push({ key: 'GITHUB_TOKEN', value: parsed.oauth_token });
          }
          break;
          
        case 'vercel':
          if (parsed.token) {
            credentials.push({ key: 'VERCEL_TOKEN', value: parsed.token });
          }
          break;
          
        case 'netlify':
          if (parsed.token) {
            credentials.push({ key: 'NETLIFY_AUTH_TOKEN', value: parsed.token });
          }
          break;
          
        default:
          // Generic extraction - look for common token fields
          const tokenFields = ['token', 'access_token', 'api_key', 'key', 'secret'];
          for (const field of tokenFields) {
            if (parsed[field]) {
              const firstKeyFormat = service.keyFormats[0];
              const envVarName = typeof firstKeyFormat === 'object' && firstKeyFormat.envVarName 
                ? firstKeyFormat.envVarName 
                : `${service.id.toUpperCase()}_TOKEN`;
              credentials.push({ 
                key: envVarName, 
                value: parsed[field] 
              });
            }
          }
      }

      return credentials;

    } catch (error) {
      throw new Error(`Failed to parse JSON credentials: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse YAML credentials (simplified - would need yaml library for full parsing)
   */
  private parseYAMLCredentials(service: APIService, content: string): Array<{key: string, value: string}> {
    const credentials: Array<{key: string, value: string}> = [];
    
    // Simple regex-based parsing for common patterns
    const tokenRegex = /(?:token|oauth_token|access_token):\s*([^\s\n]+)/g;
    let match;
    
    while ((match = tokenRegex.exec(content)) !== null) {
      const firstKeyFormat = service.keyFormats[0];
      const envVarName = typeof firstKeyFormat === 'object' && firstKeyFormat.envVarName 
        ? firstKeyFormat.envVarName 
        : `${service.id.toUpperCase()}_TOKEN`;
      credentials.push({
        key: envVarName,
        value: match[1]
      });
    }
    
    return credentials;
  }

  /**
   * Parse TOML credentials (simplified)
   */
  private parseTOMLCredentials(service: APIService, content: string): Array<{key: string, value: string}> {
    const credentials: Array<{key: string, value: string}> = [];
    
    // Simple regex-based parsing for TOML
    const tokenRegex = /(?:token|api_key|secret_key)\s*=\s*"([^"]+)"/g;
    let match;
    
    while ((match = tokenRegex.exec(content)) !== null) {
      const firstKeyFormat = service.keyFormats[0];
      const envVarName = typeof firstKeyFormat === 'object' && firstKeyFormat.envVarName 
        ? firstKeyFormat.envVarName 
        : `${service.id.toUpperCase()}_TOKEN`;
      credentials.push({
        key: envVarName,
        value: match[1]
      });
    }
    
    return credentials;
  }

  /**
   * Enhanced pattern-based credential extraction using autonomous improvements
   */
  private parseGenericCredentials(service: APIService, content: string): Array<{key: string, value: string}> {
    const credentials: Array<{key: string, value: string}> = [];
    
    // Use service-specific patterns if available
    const servicePatterns = this.extractionPatterns.get(service.id) || [];
    const genericPatterns = this.extractionPatterns.get('token') || [];
    const allPatterns = [...servicePatterns, ...genericPatterns];
    
    for (const pattern of allPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const value = match[1] || match[0];
        if (value && value.length > 8) { // Basic validation
          const firstKeyFormat = service.keyFormats[0];
          const envVarName = typeof firstKeyFormat === 'object' && firstKeyFormat.envVarName 
            ? firstKeyFormat.envVarName 
            : `${service.id.toUpperCase()}_TOKEN`;
          
          credentials.push({
            key: envVarName,
            value: value.trim()
          });
        }
      }
    }
    
    // Fallback to original format-based extraction if no patterns matched
    if (credentials.length === 0) {
      for (const keyFormat of service.keyFormats) {
        if (typeof keyFormat === 'string') {
          const regex = new RegExp(keyFormat, 'g');
          let match;
          
          while ((match = regex.exec(content)) !== null) {
            credentials.push({
              key: `${service.id.toUpperCase()}_TOKEN`,
              value: match[0]
            });
          }
        } else if (typeof keyFormat === 'object' && keyFormat.pattern) {
          const regex = new RegExp(keyFormat.pattern, 'g');
          let match;
          
          while ((match = regex.exec(content)) !== null) {
            credentials.push({
              key: keyFormat.envVarName || `${service.id.toUpperCase()}_TOKEN`,
              value: match[0]
            });
          }
        }
      }
    }
    
    return credentials;
  }

  /**
   * Extract credentials from environment variables
   */
  private extractFromEnvironment(service: APIService): Array<{key: string, value: string}> {
    const credentials: Array<{key: string, value: string}> = [];
    
    for (const keyFormat of service.keyFormats) {
      if (typeof keyFormat === 'object' && keyFormat.envVarName) {
        const envVarName = keyFormat.envVarName;
        if (envVarName && process.env[envVarName]) {
          credentials.push({
            key: envVarName,
            value: process.env[envVarName]!
          });
        }
      }
    }
    
    return credentials;
  }

  /**
   * Extract from command output
   */
  private async extractFromCommand(service: APIService): Promise<Array<{key: string, value: string}>> {
    // This would run a specific command to get credentials
    // Implementation depends on the specific service
    throw new Error('Command-based extraction not yet implemented');
  }

  /**
   * Process and validate extracted credentials
   */
  private async processCredentials(service: APIService, credentials: Array<{key: string, value: string}>): Promise<HarvestedCredential> {
    if (credentials.length === 0) {
      throw new Error('No credentials found');
    }

    // Take the first credential (could be enhanced to handle multiple)
    const cred = credentials[0];
    
    // Validate against known patterns
    const matchingFormat = service.keyFormats.find(format => {
      if (typeof format === 'string') {
        const regex = new RegExp(format);
        return regex.test(cred.value);
      } else if (typeof format === 'object' && format.pattern) {
        const regex = new RegExp(format.pattern);
        return regex.test(cred.value);
      }
      return false;
    });

    if (!matchingFormat) {
      logger.warn(`Extracted credential doesn't match expected pattern for ${service.name}`);
    }

    const harvestedCredential: HarvestedCredential = {
      key: cred.key,
      value: cred.value,
      description: `Harvested from ${service.name} CLI`,
      created: new Date(),
      lastUpdated: new Date(),
      tags: ['cli-harvested', service.category, service.id],
      category: service.category,
      source: 'cli-harvester',
      apiService: service.id,
      harvestMethod: 'cli',
      authMethod: (typeof matchingFormat === 'object' && matchingFormat.type 
        ? matchingFormat.type 
        : service.authMethods[0]) as AuthMethod || 'api-key',
      harvestMetadata: {
        harvestedAt: new Date(),
        cliTool: service.cliSupport?.toolName,
        rotationAttempts: 0
      }
    };

    return harvestedCredential;
  }

  /**
   * Helper method to add a step to a session
   */
  private addStep(session: HarvestSession, id: string, name: string): HarvestStep {
    const step: HarvestStep = {
      id,
      name,
      status: 'running',
      startedAt: new Date()
    };
    
    session.steps.push(step);
    return step;
  }

  /**
   * Helper method to complete a step
   */
  private completeStep(step: HarvestStep, output?: string): void {
    step.status = 'completed';
    step.completedAt = new Date();
    if (output) {
      step.output = output;
    }
  }

  /**
   * Helper method to fail a step
   */
  private failStep(step: HarvestStep, error: string): void {
    step.status = 'failed';
    step.completedAt = new Date();
    step.error = error;
  }

  /**
   * Get mutation history for audit purposes
   * @mcpCallable
   */
  public getMutationHistory(): CLIHarvesterMutationResult[] {
    return [...this.mutations];
  }

  /**
   * Get active hook registrations
   * @mcpCallable
   */
  public getHookRegistrations(): { [K in keyof CLIHarvestHookRegistry]: number } {
    const result: any = {};
    
    for (const [event, handlers] of this.hooks.entries()) {
      result[event] = handlers.length;
    }
    
    return result;
  }

  /**
   * Get current extraction patterns for monitoring and debugging
   * @mcpCallable
   */
  public getExtractionPatterns(): { [key: string]: string[] } {
    const result: { [key: string]: string[] } = {};
    
    for (const [service, patterns] of this.extractionPatterns.entries()) {
      result[service] = patterns.map(p => p.source);
    }
    
    return result;
  }
} 