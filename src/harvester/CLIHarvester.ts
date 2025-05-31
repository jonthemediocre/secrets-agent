import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { createLogger } from '../utils/logger';
import { APIService, HarvestSession, HarvestStep, HarvestedCredential } from '../vault/VaultTypes';
import { getServiceById } from './APIServiceRegistry';

const execAsync = promisify(exec);
const logger = createLogger('CLIHarvester');

export class CLIHarvester {
  private sessions: Map<string, HarvestSession> = new Map();
  private cliToolsCache: Map<string, boolean> = new Map();

  constructor(private cliToolsPath: string = process.env.PATH || '') {
  }

  /**
   * Start a new harvest session for an API service
   */
  async startHarvestSession(serviceId: string): Promise<HarvestSession> {
    const service = getServiceById(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    if (!service.cliSupport.available) {
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
    logger.info(`Started harvest session ${sessionId} for ${service.name}`);

    // Execute harvest workflow
    try {
      await this.executeHarvestWorkflow(session, service);
    } catch (error) {
      session.status = 'failed';
      session.error = error instanceof Error ? error.message : String(error);
      logger.error(`Harvest session ${sessionId} failed:`, error instanceof Error ? error : new Error(String(error)));
    }

    return session;
  }

  /**
   * Get harvest session by ID
   */
  getSession(sessionId: string): HarvestSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): HarvestSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Execute the complete harvest workflow
   */
  private async executeHarvestWorkflow(session: HarvestSession, service: APIService): Promise<void> {
    session.status = 'in-progress';

    // Step 1: Check if CLI tool is installed
    const checkStep = this.addStep(session, 'check-cli-tool', `Check if ${service.cliSupport.toolName} is installed`);
    const isInstalled = await this.checkCLIToolInstalled(service.cliSupport.toolName!);
    
    if (isInstalled) {
      this.completeStep(checkStep, `${service.cliSupport.toolName} is already installed`);
    } else {
      this.completeStep(checkStep, `${service.cliSupport.toolName} not found`);
      
      // Step 2: Install CLI tool if needed
      const installStep = this.addStep(session, 'install-cli-tool', `Install ${service.cliSupport.toolName}`);
      await this.installCLITool(service);
      this.completeStep(installStep, `Successfully installed ${service.cliSupport.toolName}`);
    }

    // Step 3: Authenticate with the service
    const authStep = this.addStep(session, 'authenticate', `Authenticate with ${service.name}`);
    await this.authenticateWithService(service);
    this.completeStep(authStep, `Authentication completed`);

    // Step 4: Extract credentials
    const extractStep = this.addStep(session, 'extract-credentials', `Extract API credentials`);
    const credentials = await this.extractCredentials(service);
    this.completeStep(extractStep, `Extracted ${credentials.length} credential(s)`);

    // Step 5: Validate and store credentials
    const storeStep = this.addStep(session, 'store-credentials', `Store credentials in vault`);
    const harvestedCredential = await this.processCredentials(service, credentials);
    this.completeStep(storeStep, `Stored credential with key: ${harvestedCredential.key}`);

    session.status = 'completed';
    session.completedAt = new Date();
    session.result = harvestedCredential;
    
    logger.info(`Harvest session ${session.id} completed successfully`);
  }

  /**
   * Check if a CLI tool is installed
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
   * Install CLI tool using the service's install command
   */
  private async installCLITool(service: APIService): Promise<void> {
    const installCommand = service.cliSupport.installCommand;
    if (!installCommand) {
      throw new Error(`No install command available for ${service.cliSupport.toolName}`);
    }

    try {
      logger.info(`Installing ${service.cliSupport.toolName} with command: ${installCommand}`);
      
      const result = await execAsync(installCommand, { 
        timeout: 300000, // 5 minutes timeout
        env: { ...process.env, PATH: this.cliToolsPath }
      });
      
      logger.info(`Installation output: ${result.stdout}`);
      
      // Clear cache to force recheck
      this.cliToolsCache.delete(service.cliSupport.toolName!);
      
      // Verify installation
      const isNowInstalled = await this.checkCLIToolInstalled(service.cliSupport.toolName!);
      if (!isNowInstalled) {
        throw new Error(`Installation appeared to succeed but ${service.cliSupport.toolName} is still not available`);
      }

    } catch (error) {
      logger.error(`Failed to install ${service.cliSupport.toolName}:`, error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) });
      throw new Error(`Installation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Authenticate with the service using CLI
   */
  private async authenticateWithService(service: APIService): Promise<void> {
    const authCommand = service.cliSupport.authCommand;
    if (!authCommand) {
      throw new Error(`No auth command available for ${service.name}`);
    }

    try {
      logger.info(`Authenticating with ${service.name} using: ${authCommand}`);
      
      // For interactive auth commands, we might need special handling
      if (authCommand.includes('login')) {
        // Interactive authentication - this would typically open a browser
        // For automation, we'd need to handle this differently
        logger.warn(`Interactive authentication required for ${service.name}. Manual intervention may be needed.`);
        
        // Spawn interactive process
        await this.runInteractiveCommand(authCommand);
      } else {
        // Non-interactive auth
        const result = await execAsync(authCommand, { 
          timeout: 60000,
          env: { ...process.env, PATH: this.cliToolsPath }
        });
        logger.info(`Auth output: ${result.stdout}`);
      }

    } catch (error) {
      logger.error(`Authentication failed for ${service.name}:`, error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) });
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run interactive command that might require user input
   */
  private async runInteractiveCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('cmd', ['/c', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PATH: this.cliToolsPath }
      });

      let output = '';
      let errorOutput = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
        logger.info(`Command output: ${data.toString()}`);
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
        logger.warn(`Command error: ${data.toString()}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Set timeout for interactive commands
      setTimeout(() => {
        child.kill();
        reject(new Error('Interactive command timed out'));
      }, 120000); // 2 minutes
    });
  }

  /**
   * Extract credentials from CLI tool configuration
   */
  private async extractCredentials(service: APIService): Promise<Array<{key: string, value: string}>> {
    const extractionMethod = service.cliSupport.keyExtractionMethod;
    const configPath = service.cliSupport.configPath;

    switch (extractionMethod) {
      case 'config-file':
        return this.extractFromConfigFile(service, configPath!);
        
      case 'env-var':
        return this.extractFromEnvironment(service);
        
      case 'stdout':
        return this.extractFromCommand(service);
        
      case 'interactive':
        throw new Error('Interactive extraction not yet implemented');
        
      default:
        throw new Error(`Unknown extraction method: ${extractionMethod}`);
    }
  }

  /**
   * Extract credentials from config file
   */
  private async extractFromConfigFile(service: APIService, configPath: string): Promise<Array<{key: string, value: string}>> {
    try {
      // Resolve home directory path
      const resolvedPath = configPath.startsWith('~') 
        ? join(homedir(), configPath.slice(1))
        : resolve(configPath);

      if (!existsSync(resolvedPath)) {
        throw new Error(`Config file not found: ${resolvedPath}`);
      }

      const content = readFileSync(resolvedPath, 'utf8');
      logger.info(`Reading config from: ${resolvedPath}`);

      // Parse based on file extension or service type
      if (resolvedPath.endsWith('.json')) {
        return this.parseJSONCredentials(service, content);
      } else if (resolvedPath.endsWith('.yml') || resolvedPath.endsWith('.yaml')) {
        return this.parseYAMLCredentials(service, content);
      } else if (resolvedPath.endsWith('.toml')) {
        return this.parseTOMLCredentials(service, content);
      } else {
        return this.parseGenericCredentials(service, content);
      }

    } catch (error) {
      logger.error(`Failed to extract from config file:`, error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) });
      throw new Error(`Config file extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse JSON credentials
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
              credentials.push({ 
                key: service.keyFormats[0]?.envVarName || `${service.id.toUpperCase()}_TOKEN`, 
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
      credentials.push({
        key: service.keyFormats[0]?.envVarName || `${service.id.toUpperCase()}_TOKEN`,
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
      credentials.push({
        key: service.keyFormats[0]?.envVarName || `${service.id.toUpperCase()}_TOKEN`,
        value: match[1]
      });
    }
    
    return credentials;
  }

  /**
   * Parse generic text-based credentials
   */
  private parseGenericCredentials(service: APIService, content: string): Array<{key: string, value: string}> {
    const credentials: Array<{key: string, value: string}> = [];
    
    // Look for patterns matching the service's key formats
    for (const keyFormat of service.keyFormats) {
      const regex = new RegExp(keyFormat.pattern, 'g');
      let match;
      
      while ((match = regex.exec(content)) !== null) {
        credentials.push({
          key: keyFormat.envVarName || `${service.id.toUpperCase()}_TOKEN`,
          value: match[0]
        });
      }
    }
    
    return credentials;
  }

  /**
   * Extract from environment variables
   */
  private extractFromEnvironment(service: APIService): Array<{key: string, value: string}> {
    const credentials: Array<{key: string, value: string}> = [];
    
    for (const keyFormat of service.keyFormats) {
      const envVarName = keyFormat.envVarName;
      if (envVarName && process.env[envVarName]) {
        credentials.push({
          key: envVarName,
          value: process.env[envVarName]!
        });
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
      const regex = new RegExp(format.pattern);
      return regex.test(cred.value);
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
      authMethod: matchingFormat?.type || 'api-key',
      harvestMetadata: {
        harvestedAt: new Date(),
        cliTool: service.cliSupport.toolName,
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
} 