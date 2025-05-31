import { promises as fs } from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import { MCPEndpointConfig } from '../types/interfaces';
import { BaseError, ErrorCategory, ErrorSeverity } from '../utils/error-types';

const logger = createLogger('MCPBridgesConfig');

export interface MCPBridgeAuthConfig {
  type: 'bearer' | 'api_key' | 'basic' | 'none';
  header?: string;
  prefix?: string;
  value?: string;
  username?: string;
  password?: string;
}

export interface MCPBridgeConnectionConfig {
  url: string;
  api_key?: string;
  timeout: number;
}

export interface MCPBridgeRetryConfig {
  max_retries: number;
  backoff_factor: number;
  max_backoff?: number;
}

export interface MCPBridgeRateLimitConfig {
  requests_per_minute: number;
  burst_limit: number;
}

export interface MCPBridgeSecurityConfig {
  sandbox_enabled?: boolean;
  timeout_per_execution?: number;
  max_memory_usage?: string;
  allowed_packages?: string[];
}

export interface MCPBridgeDefinition {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  enabled: boolean;
  category: 'api' | 'database' | 'ai' | 'tool' | 'custom';
  description: string;
  timeout?: number;
  retryConfig?: {
    maxRetries: number;
    backoffFactor: number;
  };
}

export interface MCPGlobalConfig {
  default_timeout: number;
  default_retry: MCPBridgeRetryConfig;
  security: {
    require_https: boolean;
    validate_certificates: boolean;
    max_request_size: string;
    rate_limiting: MCPBridgeRateLimitConfig;
  };
  monitoring: {
    health_check_interval: number;
    metrics_collection: boolean;
    log_requests: boolean;
    log_responses: boolean;
    performance_tracking: boolean;
  };
}

export interface MCPHealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  tests: Array<{
    name: string;
    type: string;
    description: string;
    max_response_time?: number;
  }>;
}

export interface MCPCircuitBreakerConfig {
  enabled: boolean;
  failure_threshold: number;
  recovery_timeout: number;
  half_open_max_calls: number;
  overrides: Record<string, {
    failure_threshold: number;
  }>;
}

export interface MCPMetricsConfig {
  enabled: boolean;
  collection_interval: number;
  collect: string[];
  export: {
    format: string;
    endpoint: string;
    labels: Record<string, string>;
  };
}

export interface MCPErrorHandlingConfig {
  structured_errors: boolean;
  include_stack_trace: boolean;
  max_error_details_length: number;
  error_types: string[];
  alerting: {
    enabled: boolean;
    channels: Array<{
      type: string;
      level?: string;
      url?: string;
      enabled?: boolean;
    }>;
    conditions: Array<{
      name: string;
      condition: string;
      duration: string;
    }>;
  };
}

export interface MCPBridgesFullConfig {
  version: string;
  bridges: MCPEndpointConfig[];
  globalSettings: {
    timeout: number;
    retryAttempts: number;
    enableLogging: boolean;
    default_timeout: number;
    default_retry: MCPBridgeRetryConfig;
    security: {
      require_https: boolean;
      validate_certificates: boolean;
      max_request_size: string;
      rate_limiting: MCPBridgeRateLimitConfig;
    };
    monitoring: {
      health_check_interval: number;
      metrics_collection: boolean;
      log_requests: boolean;
      log_responses: boolean;
      performance_tracking: boolean;
    };
  };
  health_checks: MCPHealthCheckConfig;
  circuit_breaker: MCPCircuitBreakerConfig;
  metrics: MCPMetricsConfig;
  error_handling: MCPErrorHandlingConfig;
  environments?: Record<string, any>;
}

/**
 * MCPBridgesConfigLoader - Hardened configuration loader for MCP bridges
 * Provides environment-aware configuration with validation and security
 */
export class MCPBridgesConfigLoader {
  private static instance: MCPBridgesConfigLoader;
  private configPath: string;
  private environment: string;
  private config: MCPBridgesFullConfig | null = null;

  private constructor(configPath?: string, environment?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config', 'mcp_bridges.json');
    this.environment = environment || process.env.NODE_ENV || 'development';
  }

  public static getInstance(configPath?: string, environment?: string): MCPBridgesConfigLoader {
    if (!MCPBridgesConfigLoader.instance) {
      MCPBridgesConfigLoader.instance = new MCPBridgesConfigLoader(configPath, environment);
    }
    return MCPBridgesConfigLoader.instance;
  }

  /**
   * Load and parse the MCP bridges configuration
   */
  public async load(): Promise<MCPBridgesFullConfig> {
    try {
      logger.info(`Loading MCP bridges configuration`, {
        config_path: this.configPath,
        environment: this.environment
      });

      // Check if config file exists
      if (!fs.access(this.configPath)) {
        logger.warn(`Configuration file not found: ${this.configPath}, using defaults`);
        return this.getDefaultConfig();
      }

      // Read and parse JSON
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content);

      if (!this.config) {
        throw new Error('Invalid configuration format');
      }

      // Validate required fields
      if (!this.config.version || !Array.isArray(this.config.bridges)) {
        throw new Error('Configuration missing required fields');
      }

      // Process environment variables in the config
      const processedConfig = this.processEnvironmentVariables(this.config);

      // Apply environment-specific overrides
      if (processedConfig.environments && processedConfig.environments[this.environment]) {
        this.applyEnvironmentOverrides(processedConfig, processedConfig.environments[this.environment]);
      }

      // Validate configuration
      this.validateConfig(processedConfig);

      // Cache the configuration
      this.config = processedConfig;

      logger.info(`MCP bridges configuration loaded successfully`, {
        bridgeCount: processedConfig.bridges.length,
        version: processedConfig.version
      });

      return processedConfig;
    } catch (error) {
      logger.error(`Failed to load MCP bridges configuration`, {
        config_path: this.configPath,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get the cached configuration
   */
  public getConfig(): MCPBridgesFullConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Get enabled MCP bridges as AgentBridgeService format
   */
  public getEnabledBridges(): MCPEndpointConfig[] {
    const config = this.getConfig();
    const bridges: MCPEndpointConfig[] = [];

    for (const bridge of config.bridges) {
      if (bridge.enabled) {
        bridges.push({
          id: bridge.id,
          name: bridge.name,
          type: bridge.type,
          baseUrl: bridge.baseUrl || bridge.url || '',
          apiKey: bridge.apiKey,
          enabled: bridge.enabled,
          category: bridge.category,
          description: bridge.description,
          timeout: bridge.timeout,
          retryConfig: bridge.retryConfig
        });
      }
    }

    return bridges;
  }

  /**
   * Get bridge configuration by ID
   */
  public getBridgeConfig(bridgeId: string): MCPEndpointConfig | null {
    const config = this.getConfig();
    return config.bridges.find(b => b.id === bridgeId) || null;
  }

  /**
   * Get global configuration
   */
  public getGlobalConfig(): MCPGlobalConfig {
    const config = this.getConfig();
    return {
      default_timeout: config.globalSettings.default_timeout,
      default_retry: config.globalSettings.default_retry,
      security: config.globalSettings.security,
      monitoring: config.globalSettings.monitoring
    };
  }

  /**
   * Get health check configuration
   */
  public getHealthCheckConfig(): MCPHealthCheckConfig {
    const config = this.getConfig();
    return config.health_checks;
  }

  /**
   * Get circuit breaker configuration
   */
  public getCircuitBreakerConfig(): MCPCircuitBreakerConfig {
    const config = this.getConfig();
    return config.circuit_breaker;
  }

  /**
   * Get metrics configuration
   */
  public getMetricsConfig(): MCPMetricsConfig {
    const config = this.getConfig();
    return config.metrics;
  }

  /**
   * Get error handling configuration
   */
  public getErrorHandlingConfig(): MCPErrorHandlingConfig {
    const config = this.getConfig();
    return config.error_handling;
  }

  /**
   * Reload configuration from file
   */
  public async reload(): Promise<MCPBridgesFullConfig> {
    logger.info('Reloading MCP bridges configuration');
    this.config = null;
    return this.load();
  }

  /**
   * Get configuration summary for logging/debugging
   */
  public getConfigSummary(): any {
    if (!this.config) {
      return { status: 'not_loaded' };
    }

    const bridges = this.config.bridges;
    const enabledBridges = bridges.filter(b => b.enabled);

    return {
      status: 'loaded',
      environment: this.environment,
      bridges_total: bridges.length,
      bridges_enabled: enabledBridges.length,
      categories: Array.from(new Set(enabledBridges.map(b => b.category).filter(Boolean))),
      global_timeout: this.config.globalSettings.timeout,
      health_checks_enabled: this.config.health_checks?.enabled || false,
      circuit_breaker_enabled: this.config.circuit_breaker?.enabled || false,
      metrics_enabled: this.config.metrics?.enabled || false
    };
  }

  /**
   * Process environment variables in configuration values
   */
  private processEnvironmentVariables(config: any): any {
    if (typeof config === 'string') {
      // Handle ${VAR} and ${VAR:-default} patterns
      return config.replace(/\$\{([^}]+)\}/g, (match: string, varExpression: string) => {
        const [varName, defaultValue] = varExpression.split(':-');
        const envValue = process.env[varName];
        
        if (envValue !== undefined) {
          return envValue;
        }
        
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        
        // If no default and env var not set, keep the original placeholder
        logger.warn(`Environment variable ${varName} not set and no default provided`);
        return match;
      });
    }

    if (Array.isArray(config)) {
      return config.map(item => this.processEnvironmentVariables(item));
    }

    if (config && typeof config === 'object') {
      const processed: any = {};
      for (const [key, value] of Object.entries(config)) {
        processed[key] = this.processEnvironmentVariables(value);
      }
      return processed;
    }

    return config;
  }

  /**
   * Apply environment-specific configuration overrides
   */
  private applyEnvironmentOverrides(baseConfig: any, envOverrides: any): void {
    for (const [key, value] of Object.entries(envOverrides)) {
      if (baseConfig[key] && typeof baseConfig[key] === 'object' && typeof value === 'object') {
        // Deep merge for nested objects
        this.deepMerge(baseConfig[key], value);
      } else {
        // Direct override for primitive values
        baseConfig[key] = value;
      }
    }
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): void {
    for (const [key, value] of Object.entries(source)) {
      if (target[key] && typeof target[key] === 'object' && typeof value === 'object') {
        this.deepMerge(target[key], value);
      } else {
        target[key] = value;
      }
    }
  }

  /**
   * Validate configuration structure and required fields
   */
  private validateConfig(config: any): void {
    const errors: string[] = [];

    // Validate global configuration
    if (!config.globalSettings) {
      errors.push('globalSettings configuration is required');
    } else {
      if (typeof config.globalSettings.timeout !== 'number') {
        errors.push('globalSettings.timeout must be a number');
      }
      if (!config.globalSettings.retryAttempts) {
        errors.push('globalSettings.retryAttempts is required');
      }
      if (!config.globalSettings.security) {
        errors.push('globalSettings.security is required');
      }
      if (!config.globalSettings.monitoring) {
        errors.push('globalSettings.monitoring is required');
      }
    }

    // Validate bridges configuration
    if (!config.bridges || !Array.isArray(config.bridges)) {
      errors.push('bridges configuration is required and must be an array');
    } else {
      for (const [bridgeId, bridge] of Object.entries(config.bridges)) {
        this.validateBridgeConfig(bridgeId, bridge as any, errors);
      }
    }

    // Validate health checks configuration
    if (!config.health_checks) {
      errors.push('health_checks configuration is required');
    }

    // Validate circuit breaker configuration
    if (!config.circuit_breaker) {
      errors.push('circuit_breaker configuration is required');
    }

    // Validate metrics configuration
    if (!config.metrics) {
      errors.push('metrics configuration is required');
    }

    // Validate error handling configuration
    if (!config.error_handling) {
      errors.push('error_handling configuration is required');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Validate individual bridge configuration
   */
  private validateBridgeConfig(bridgeId: string, bridge: any, errors: string[]): void {
    const prefix = `bridges.${bridgeId}`;

    if (!bridge.id || bridge.id !== bridgeId) {
      errors.push(`${prefix}.id must match the bridge key`);
    }

    if (!bridge.name) {
      errors.push(`${prefix}.name is required`);
    }

    if (!bridge.category || !['ai', 'database', 'api', 'tool', 'custom'].includes(bridge.category)) {
      errors.push(`${prefix}.category must be one of: ai, database, api, tool, custom`);
    }

    if (typeof bridge.enabled !== 'boolean') {
      errors.push(`${prefix}.enabled must be a boolean`);
    }

    // Validate connection configuration
    if (!bridge.baseUrl) {
      errors.push(`${prefix}.baseUrl is required`);
    } else {
      try {
        new URL(bridge.baseUrl);
      } catch (error) {
        errors.push(`${prefix}.baseUrl must be a valid URL`);
      }
    }

    if (typeof bridge.timeout !== 'number') {
      errors.push(`${prefix}.timeout must be a number`);
    }

    // Validate auth configuration
    if (!bridge.apiKey && !bridge.auth) {
      errors.push(`${prefix}.apiKey or auth is required`);
    }
  }

  /**
   * Get default configuration when file is not found
   */
  private getDefaultConfig(): MCPBridgesFullConfig {
    logger.info('Using default MCP bridges configuration');

    return {
      version: '1.0.0',
      bridges: [
        {
          id: 'openai-default',
          name: 'OpenAI Default',
          type: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: process.env.OPENAI_API_KEY || '',
          enabled: true,
          timeout: 30000,
          rateLimiting: {
            maxRequests: 60,
            windowMs: 60000
          }
        },
        {
          id: 'anthropic-default',
          name: 'Anthropic Default',
          type: 'anthropic',
          baseUrl: 'https://api.anthropic.com/v1',
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          enabled: true,
          timeout: 30000,
          rateLimiting: {
            maxRequests: 50,
            windowMs: 60000
          }
        }
      ],
      globalSettings: {
        timeout: 30000,
        retryAttempts: 3,
        enableLogging: true,
        default_timeout: 30000,
        default_retry: {
          max_retries: 3,
          backoff_factor: 0.5
        },
        security: {
          require_https: true,
          validate_certificates: true,
          max_request_size: '10MB',
          rate_limiting: {
            requests_per_minute: 60,
            burst_limit: 100
          }
        },
        monitoring: {
          health_check_interval: 300,
          metrics_collection: true,
          log_requests: true,
          log_responses: true,
          performance_tracking: true
        }
      },
      health_checks: {
        enabled: true,
        interval: 300,
        timeout: 5000,
        tests: []
      },
      circuit_breaker: {
        enabled: true,
        failure_threshold: 0.5,
        recovery_timeout: 30000,
        half_open_max_calls: 10,
        overrides: {}
      },
      metrics: {
        enabled: true,
        collection_interval: 60000,
        collect: [],
        export: {
          format: 'json',
          endpoint: '',
          labels: {}
        }
      },
      error_handling: {
        structured_errors: true,
        include_stack_trace: true,
        max_error_details_length: 1024,
        error_types: [],
        alerting: {
          enabled: true,
          channels: [],
          conditions: []
        }
      }
    };
  }

  async save(): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration to save');
    }
    
    try {
      const content = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, content);
      logger.info('MCP bridges configuration saved successfully');
    } catch (error) {
      logger.error('Failed to save MCP bridges configuration', { error });
      throw error;
    }
  }

  addBridge(bridge: MCPEndpointConfig): void {
    if (!this.config) {
      this.config = this.getDefaultConfig();
    }
    
    // Check for duplicate IDs
    const existingIndex = this.config.bridges.findIndex(b => b.id === bridge.id);
    if (existingIndex >= 0) {
      this.config.bridges[existingIndex] = bridge;
    } else {
      this.config.bridges.push(bridge);
    }
  }

  removeBridge(bridgeId: string): boolean {
    if (!this.config) {
      return false;
    }
    
    const initialLength = this.config.bridges.length;
    this.config.bridges = this.config.bridges.filter(b => b.id !== bridgeId);
    return this.config.bridges.length < initialLength;
  }

  listBridges(): MCPEndpointConfig[] {
    return this.config?.bridges || [];
  }

  updateGlobalSettings(settings: Partial<MCPBridgesFullConfig['globalSettings']>): void {
    if (!this.config) {
      this.config = this.getDefaultConfig();
    }
    
    this.config.globalSettings = {
      ...this.config.globalSettings,
      ...settings
    };
  }
}

export class MCPBridgesConfig {
  private bridges: Map<string, MCPEndpointConfig> = new Map();

  constructor() {
    this.initializeDefaultBridges();
  }

  private initializeDefaultBridges() {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (openaiApiKey) {
      // Initialize OpenAI bridge
      this.bridges.set('openai', {
        id: 'openai',
        name: 'OpenAI API',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: openaiApiKey,
        enabled: true,
        status: 'active',
        toolCount: 0,
        type: 'custom',
        timeout: 30,
        retryConfig: {
          maxRetries: 3,
          backoffFactor: 0.5
        },
        category: 'ai',
        description: 'OpenAI API Integration'
      });
      logger.info('Initialized OpenAI bridge');
    } else {
      logger.warn('OpenAI API key not found in environment variables');
    }

    if (anthropicApiKey) {
      // Initialize Anthropic bridge
      this.bridges.set('anthropic', {
        id: 'anthropic',
        name: 'Anthropic API',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: anthropicApiKey,
        enabled: true,
        status: 'active',
        toolCount: 0,
        type: 'custom',
        timeout: 30,
        retryConfig: {
          maxRetries: 3,
          backoffFactor: 0.5
        },
        category: 'ai',
        description: 'Anthropic API Integration'
      });
      logger.info('Initialized Anthropic bridge');
    } else {
      logger.warn('Anthropic API key not found in environment variables');
    }
  }

  getBridge(id: string): MCPEndpointConfig | undefined {
    return this.bridges.get(id);
  }

  setBridge(id: string, config: MCPEndpointConfig) {
    this.bridges.set(id, config);
    logger.info(`Bridge ${id} configured`, { bridgeId: id });
  }

  removeBridge(id: string) {
    this.bridges.delete(id);
    logger.info(`Bridge ${id} removed`, { bridgeId: id });
  }

  listBridges(): MCPEndpointConfig[] {
    return Array.from(this.bridges.values());
  }

  updateBridgeStatus(id: string, status: string) {
    const bridge = this.bridges.get(id);
    if (bridge) {
      bridge.status = status;
      this.bridges.set(id, bridge);
      logger.info(`Bridge ${id} status updated to ${status}`, { bridgeId: id, status });
    } else {
      logger.warn(`Bridge ${id} not found for status update`, { bridgeId: id });
    }
  }

  updateBridgeToolCount(id: string, count: number) {
    const bridge = this.bridges.get(id);
    if (bridge) {
      bridge.toolCount = count;
      this.bridges.set(id, bridge);
      logger.info(`Bridge ${id} tool count updated to ${count}`, { bridgeId: id, count });
    } else {
      logger.warn(`Bridge ${id} not found for tool count update`, { bridgeId: id });
    }
  }
} 