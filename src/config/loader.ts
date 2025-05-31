import { promises as fs } from 'fs';
import { SimpleValidator, SyncConfigSchema } from './schema';
import { ValidationError } from '../utils/error-types';
import { createLogger } from '../utils/logger';

const logger = createLogger('ConfigLoader');

export class ConfigLoader {
  static async loadFromFile(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Try to parse as JSON first, then as simple key-value pairs
      let parsedConfig: any;
      try {
        parsedConfig = JSON.parse(content);
      } catch {
        // Parse as simple key-value format
        parsedConfig = this.parseSimpleConfig(content);
      }

      // Validate configuration
      const validation = SimpleValidator.validate(parsedConfig, SyncConfigSchema);
      if (validation.success) {
        return validation.data;
      } else {
        throw new ValidationError('Configuration validation failed', {
          errors: validation.errors
        });
      }
    } catch (error) {
      logger.error('Failed to load configuration from file', { filePath, error });
      throw new ValidationError('Failed to load configuration', {
        filePath,
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  static async loadFromObject(config: any): Promise<any> {
    try {
      const validation = SimpleValidator.validate(config, SyncConfigSchema);
      if (validation.success) {
        return validation.data;
      } else {
        throw new ValidationError('Configuration validation failed', {
          errors: validation.errors
        });
      }
    } catch (error) {
      logger.error('Failed to validate configuration object', { error });
      throw new ValidationError('Configuration validation failed', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private static parseSimpleConfig(content: string): any {
    const config: any = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          
          // Try to parse as JSON value
          try {
            config[key.trim()] = JSON.parse(value);
          } catch {
            // Store as string
            config[key.trim()] = value.replace(/^["']|["']$/g, '');
          }
        }
      }
    }
    
    return config;
  }

  static getDefaultConfig(): any {
    return {
      version: '1.0.0',
      projectId: 'default-project',
      syncStrategy: 'adaptive',
      paths: [],
      security: {
        allowedDirectories: [process.cwd()],
        maxFileSize: 10485760,
        commandTimeout: 30000,
        rateLimiting: { windowMs: 60000, maxRequests: 100 },
        validation: { enabled: true },
        audit: { enabled: true }
      },
      monitoring: {
        enabled: true,
        interval: 30000,
        metrics: [],
        alerts: {}
      },
      ml: {
        enabled: false,
        modelPath: '',
        updateInterval: 3600000,
        features: [],
        thresholds: { confidence: 0.7, errorRate: 0.1 }
      },
      advanced: {
        maxConcurrentSyncs: 5,
        batchSize: 100,
        retryAttempts: 3,
        timeoutMs: 30000
      }
    };
  }
} 