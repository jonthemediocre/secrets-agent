import { readFileSync, writeFileSync, existsSync } from 'fs';
import { generateEncryptionKey, encrypt, decrypt } from '../utils/encryption';
import { createLogger } from '../utils/logger';

const logger = createLogger('Bootstrap');

interface AppConfig {
  database: {
    url: string;
    type: 'sqlite' | 'postgresql' | 'mysql';
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  encryption: {
    masterKey: string;
  };
  server: {
    port: number;
    host: string;
  };
}

const CONFIG_FILE = './app-config.json';
const MASTER_KEY_FILE = './master.key';

/**
 * Bootstrap the application configuration
 * This eliminates the need for environment variables by using encrypted config files
 */
export async function bootstrapConfig(): Promise<AppConfig> {
  try {
    // Check if this is first run
    if (!existsSync(CONFIG_FILE) || !existsSync(MASTER_KEY_FILE)) {
      logger.info('First run detected - generating secure configuration');
      return await generateInitialConfig();
    }

    // Load existing configuration
    return await loadExistingConfig();

  } catch (error) {
    logger.error('Failed to bootstrap configuration', { error });
    throw new Error('Configuration bootstrap failed');
  }
}

/**
 * Generate initial configuration on first run
 */
async function generateInitialConfig(): Promise<AppConfig> {
  logger.info('Generating initial secure configuration...');

  // Generate master encryption key
  const masterKey = generateEncryptionKey(64); // 512-bit master key
  
  // Generate application secrets
  const config: AppConfig = {
    database: {
      url: 'file:./secrets-agent.db',
      type: 'sqlite'
    },
    jwt: {
      secret: generateEncryptionKey(32), // 256-bit JWT secret
      expiresIn: '24h'
    },
    encryption: {
      masterKey: generateEncryptionKey(32) // 256-bit encryption master key
    },
    server: {
      port: 3000,
      host: 'localhost'
    }
  };

  // Encrypt the configuration
  const configJson = JSON.stringify(config, null, 2);
  const encryptedConfig = await encrypt(configJson, masterKey);

  // Save encrypted config and master key separately
  writeFileSync(CONFIG_FILE, encryptedConfig);
  writeFileSync(MASTER_KEY_FILE, masterKey);

  logger.info('Secure configuration generated successfully');
  logger.warn('IMPORTANT: Backup the master.key file - it cannot be recovered if lost!');

  return config;
}

/**
 * Load existing encrypted configuration
 */
async function loadExistingConfig(): Promise<AppConfig> {
  try {
    // Read master key
    const masterKey = readFileSync(MASTER_KEY_FILE, 'utf8');
    
    // Read and decrypt configuration
    const encryptedConfig = readFileSync(CONFIG_FILE, 'utf8');
    const configJson = await decrypt(encryptedConfig, masterKey);
    
    const config: AppConfig = JSON.parse(configJson);
    
    logger.info('Configuration loaded successfully');
    return config;

  } catch (error) {
    logger.error('Failed to load configuration', { error });
    throw new Error('Configuration decryption failed - check master.key file');
  }
}

/**
 * Update configuration (re-encrypt with master key)
 */
export async function updateConfig(newConfig: Partial<AppConfig>): Promise<void> {
  const currentConfig = await loadExistingConfig();
  const updatedConfig = { ...currentConfig, ...newConfig };
  
  const masterKey = readFileSync(MASTER_KEY_FILE, 'utf8');
  const configJson = JSON.stringify(updatedConfig, null, 2);
  const encryptedConfig = await encrypt(configJson, masterKey);
  
  writeFileSync(CONFIG_FILE, encryptedConfig);
  logger.info('Configuration updated successfully');
}

/**
 * Get current configuration
 */
export async function getConfig(): Promise<AppConfig> {
  return await loadExistingConfig();
}

/**
 * Development mode fallback (when no config exists and we're in dev)
 */
export function getDevConfig(): AppConfig {
  logger.warn('Using development configuration - NOT SECURE FOR PRODUCTION');
  
  return {
    database: {
      url: 'file:./dev.db',
      type: 'sqlite'
    },
    jwt: {
      secret: 'dev-jwt-secret-not-secure',
      expiresIn: '24h'
    },
    encryption: {
      masterKey: 'dev-master-key-not-secure'
    },
    server: {
      port: 3000,
      host: 'localhost'
    }
  };
} 