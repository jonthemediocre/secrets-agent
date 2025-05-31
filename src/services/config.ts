import { createLogger } from '../utils/logger';
import { BaseError, ErrorCategory, ErrorSeverity } from '../utils/error-types';

const logger = createLogger('ConfigService');

export class ConfigService {
  private static instance: ConfigService;
  private config: Record<string, any> = {};

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  async load(configPath: string): Promise<void> {
    try {
      // Implementation would go here
      logger.info(`Loading configuration from ${configPath}`);
    } catch (error) {
      throw new BaseError(`Failed to load configuration: ${error}`, {
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retryable: false,
      });
    }
  }

  get<T>(key: string, defaultValue?: T): T {
    const value = this.config[key];
    if (value === undefined && defaultValue === undefined) {
      throw new BaseError(`Configuration key not found: ${key}`, {
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
      });
    }
    return (value === undefined ? defaultValue : value) as T;
  }

  set(key: string, value: any): void {
    this.config[key] = value;
    logger.debug(`Updated configuration key: ${key}`);
  }
} 