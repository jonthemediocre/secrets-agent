/**
 * Simple schema validation without external dependencies
 */

export interface ValidationResult {
  success: boolean;
  errors: string[];
  data?: any;
}

export interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  default?: any;
  validate?: (value: any) => boolean;
  message?: string;
}

export interface Schema {
  [key: string]: SchemaField;
}

export class SimpleValidator {
  static validate(data: any, schema: Schema): ValidationResult {
    const errors: string[] = [];
    const result: any = {};

    // Check required fields
    for (const [key, field] of Object.entries(schema)) {
      const value = data[key];
      
      if (field.required && (value === undefined || value === null)) {
        errors.push(`Field '${key}' is required`);
        continue;
      }
      
      if (value === undefined || value === null) {
        if (field.default !== undefined) {
          result[key] = field.default;
        }
        continue;
      }
      
      // Type validation
      if (!this.validateType(value, field.type)) {
        errors.push(`Field '${key}' must be of type ${field.type}`);
        continue;
      }
      
      // Custom validation
      if (field.validate && !field.validate(value)) {
        errors.push(field.message || `Field '${key}' failed validation`);
        continue;
      }
      
      result[key] = value;
    }

    return {
      success: errors.length === 0,
      errors,
      data: errors.length === 0 ? result : undefined
    };
  }

  private static validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }
}

// Common schemas
export const MCPBridgeConfigSchema: Schema = {
  id: { type: 'string', required: true },
  name: { type: 'string', required: true },
  type: { 
    type: 'string', 
    required: true,
    validate: (value) => ['openai', 'anthropic', 'custom'].includes(value),
    message: 'Type must be one of: openai, anthropic, custom'
  },
  baseUrl: { type: 'string', required: true },
  apiKey: { type: 'string', required: true },
  enabled: { type: 'boolean', default: true },
  timeout: { type: 'number', default: 30000 }
};

export const SecurityConfigSchema: Schema = {
  allowedDirectories: { type: 'array', required: true },
  maxFileSize: { type: 'number', default: 10485760 }, // 10MB
  commandTimeout: { type: 'number', default: 30000 },
  rateLimiting: { type: 'object', required: true },
  validation: { type: 'object', required: true },
  audit: { type: 'object', required: true }
};

// Sync strategy validation
export const SyncStrategyOptions = ['realtime', 'batch', 'adaptive'] as const;
export type SyncStrategy = typeof SyncStrategyOptions[number];

export function validateSyncStrategy(value: any): value is SyncStrategy {
  return SyncStrategyOptions.includes(value);
}

// Monitoring configuration
export const MonitoringConfigSchema: Schema = {
  enabled: { type: 'boolean', default: true },
  interval: { type: 'number', default: 30000 },
  metrics: { type: 'array', default: [] },
  alerts: { type: 'object', default: {} }
};

export const MLConfigSchema: Schema = {
  enabled: { type: 'boolean', default: true },
  modelPath: { type: 'string' },
  updateInterval: { type: 'number', default: 3600000 },
  features: { type: 'array', default: ['fileSize', 'changeFrequency', 'errorRate', 'syncHistory'] },
  thresholds: { type: 'object', default: { confidence: 0.7, errorRate: 0.1 } }
};

export const SyncConfigSchema: Schema = {
  version: { type: 'string', required: true },
  projectId: { type: 'string', required: true },
  syncStrategy: { type: 'string', default: 'adaptive', validate: validateSyncStrategy },
  paths: { type: 'array', required: true },
  security: { type: 'object', required: true },
  monitoring: { type: 'object', required: true },
  ml: { type: 'object', required: true },
  advanced: { type: 'object', default: {} }
};

export type SyncConfig = any; // Replace with the actual type inferred from SyncConfigSchema
export type SecurityConfig = any; // Replace with the actual type inferred from SecurityConfigSchema
export type MonitoringConfig = any; // Replace with the actual type inferred from MonitoringConfigSchema
export type MLConfig = any; // Replace with the actual type inferred from MLConfigSchema 