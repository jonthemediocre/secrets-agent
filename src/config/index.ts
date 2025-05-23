import { createLogger } from '../utils/logger';

const logger = createLogger('Config');

// Configuration interface with all required and optional settings
interface AppConfig {
  // Server Configuration
  port: number;
  host: string;
  nodeEnv: 'development' | 'test' | 'staging' | 'production';
  
  // Database/Vault Configuration
  vaultPath: string;
  backupPath: string;
  
  // Security Configuration
  jwtSecret: string;
  sessionSecret: string;
  encryptionKey: string;
  
  // Authentication Configuration
  googleClientId: string;
  googleClientSecret?: string;
  
  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  
  // Request Limits
  maxRequestSize: number;
  maxFileUploadSize: number;
  
  // Logging Configuration
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFormat: 'json' | 'human';
  
  // Monitoring Configuration
  healthCheckTimeout: number;
  metricsEnabled: boolean;
  
  // CORS Configuration
  corsOrigins: string[];
  corsCredentials: boolean;
  
  // Feature Flags
  features: {
    rotationScheduler: boolean;
    auditLogging: boolean;
    rateLimiting: boolean;
    ipFiltering: boolean;
  };
  
  // External Services (optional)
  sentry?: {
    dsn: string;
    environment: string;
  };
  
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
}

// Default configuration values
const defaultConfig: Partial<AppConfig> = {
  port: 3000,
  host: '0.0.0.0',
  nodeEnv: 'development',
  vaultPath: './vault/secrets.sops.yaml',
  backupPath: './vault/backups',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 100,
  maxRequestSize: 1024 * 1024, // 1MB
  maxFileUploadSize: 10 * 1024 * 1024, // 10MB
  logLevel: 'info',
  logFormat: 'json',
  healthCheckTimeout: 5000,
  metricsEnabled: true,
  corsOrigins: ['http://localhost:3000'],
  corsCredentials: true,
  features: {
    rotationScheduler: true,
    auditLogging: true,
    rateLimiting: true,
    ipFiltering: false,
  },
};

// Required environment variables by environment
const requiredEnvVars: Record<string, string[]> = {
  development: [
    'GOOGLE_CLIENT_ID',
  ],
  test: [
    'GOOGLE_CLIENT_ID',
    'JWT_SECRET',
  ],
  staging: [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'JWT_SECRET',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
  ],
  production: [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'JWT_SECRET',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
    'VAULT_PATH',
  ],
};

// Configuration validation rules
const validationRules: Record<string, (value: unknown) => boolean> = {
  port: (value: unknown) => typeof value === 'number' && value > 0 && value < 65536,
  vaultPath: (value: unknown) => typeof value === 'string' && value.length > 0,
  jwtSecret: (value: unknown) => typeof value === 'string' && value.length >= 32,
  sessionSecret: (value: unknown) => typeof value === 'string' && value.length >= 32,
  encryptionKey: (value: unknown) => typeof value === 'string' && value.length >= 32,
  googleClientId: (value: unknown) => typeof value === 'string' && value.includes('.apps.googleusercontent.com'),
  logLevel: (value: unknown) => typeof value === 'string' && ['debug', 'info', 'warn', 'error'].includes(value),
  nodeEnv: (value: unknown) => typeof value === 'string' && ['development', 'test', 'staging', 'production'].includes(value),
};

// Parse boolean environment variables
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

// Parse number environment variables
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Parse JSON environment variables
function parseJSON<T>(value: string | undefined, defaultValue: T): T {
  if (value === undefined) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    logger.warn(`Failed to parse JSON environment variable, using default`, { value });
    return defaultValue;
  }
}

// Load and validate configuration
function loadConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV || 'development') as AppConfig['nodeEnv'];
  
  // Check required environment variables
  const required = requiredEnvVars[nodeEnv] || [];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Build configuration object
  const config: AppConfig = {
    // Server Configuration
    port: parseNumber(process.env.PORT, defaultConfig.port!),
    host: process.env.HOST || defaultConfig.host!,
    nodeEnv,
    
    // Vault Configuration
    vaultPath: process.env.VAULT_PATH || defaultConfig.vaultPath!,
    backupPath: process.env.BACKUP_PATH || defaultConfig.backupPath!,
    
    // Security Configuration
    jwtSecret: process.env.JWT_SECRET || (nodeEnv === 'development' ? 'dev-jwt-secret-change-in-production' : ''),
    sessionSecret: process.env.SESSION_SECRET || (nodeEnv === 'development' ? 'dev-session-secret-change-in-production' : ''),
    encryptionKey: process.env.ENCRYPTION_KEY || (nodeEnv === 'development' ? 'dev-encryption-key-change-in-production' : ''),
    
    // Authentication Configuration
    googleClientId: process.env.GOOGLE_CLIENT_ID!,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    
    // Rate Limiting
    rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, defaultConfig.rateLimitWindowMs!),
    rateLimitMaxRequests: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, defaultConfig.rateLimitMaxRequests!),
    
    // Request Limits
    maxRequestSize: parseNumber(process.env.MAX_REQUEST_SIZE, defaultConfig.maxRequestSize!),
    maxFileUploadSize: parseNumber(process.env.MAX_FILE_UPLOAD_SIZE, defaultConfig.maxFileUploadSize!),
    
    // Logging Configuration
    logLevel: (process.env.LOG_LEVEL as AppConfig['logLevel']) || defaultConfig.logLevel!,
    logFormat: (process.env.LOG_FORMAT as AppConfig['logFormat']) || defaultConfig.logFormat!,
    
    // Monitoring Configuration
    healthCheckTimeout: parseNumber(process.env.HEALTH_CHECK_TIMEOUT, defaultConfig.healthCheckTimeout!),
    metricsEnabled: parseBoolean(process.env.METRICS_ENABLED, defaultConfig.metricsEnabled!),
    
    // CORS Configuration
    corsOrigins: parseJSON(process.env.CORS_ORIGINS, defaultConfig.corsOrigins!),
    corsCredentials: parseBoolean(process.env.CORS_CREDENTIALS, defaultConfig.corsCredentials!),
    
    // Feature Flags
    features: {
      rotationScheduler: parseBoolean(process.env.FEATURE_ROTATION_SCHEDULER, defaultConfig.features!.rotationScheduler),
      auditLogging: parseBoolean(process.env.FEATURE_AUDIT_LOGGING, defaultConfig.features!.auditLogging),
      rateLimiting: parseBoolean(process.env.FEATURE_RATE_LIMITING, defaultConfig.features!.rateLimiting),
      ipFiltering: parseBoolean(process.env.FEATURE_IP_FILTERING, defaultConfig.features!.ipFiltering),
    },
    
    // External Services
    sentry: process.env.SENTRY_DSN ? {
      dsn: process.env.SENTRY_DSN,
      environment: nodeEnv,
    } : undefined,
    
    redis: process.env.REDIS_HOST ? {
      host: process.env.REDIS_HOST,
      port: parseNumber(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD,
    } : undefined,
  };
  
  // Validate configuration
  validateConfig(config);
  
  return config;
}

// Validate configuration values
function validateConfig(config: AppConfig): void {
  const errors: string[] = [];
  
  // Validate using rules
  Object.entries(validationRules).forEach(([key, validator]) => {
    const value = (config as unknown as Record<string, unknown>)[key];
    if (value !== undefined && !validator(value)) {
      errors.push(`Invalid configuration for ${key}: ${value}`);
    }
  });
  
  // Additional validation
  if (config.nodeEnv === 'production') {
    if (config.jwtSecret.includes('dev-')) {
      errors.push('JWT secret must be changed for production');
    }
    if (config.sessionSecret.includes('dev-')) {
      errors.push('Session secret must be changed for production');
    }
    if (config.encryptionKey.includes('dev-')) {
      errors.push('Encryption key must be changed for production');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
  
  logger.info('Configuration validated successfully', {
    nodeEnv: config.nodeEnv,
    featuresEnabled: Object.entries(config.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature),
  });
}

// Load configuration once at startup
let appConfig: AppConfig;

try {
  appConfig = loadConfig();
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown configuration error';
  logger.error('Failed to load configuration', { error: errorMessage });
  process.exit(1);
}

// Export configuration
export default appConfig;

// Export helper functions for testing
export { loadConfig, validateConfig, parseBoolean, parseNumber, parseJSON };

// Export types
export type { AppConfig }; 