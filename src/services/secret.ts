import { promises as fs } from 'fs';
import { createLogger } from '../utils/logger';

const logger = createLogger('SecretService');

export interface Secret {
  id: string;
  name: string;
  value: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  encrypted: boolean;
}

export interface SecretMetadata {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class SecretService {
  private secrets: Map<string, Secret> = new Map();
  private secretsFile: string;

  constructor(secretsFile = 'secrets.json') {
    this.secretsFile = secretsFile;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadSecrets();
      logger.info('SecretService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SecretService', { error });
      throw error;
    }
  }

  async createSecret(name: string, value: string, options?: {
    description?: string;
    tags?: string[];
    encrypt?: boolean;
  }): Promise<Secret> {
    const secret: Secret = {
      id: this.generateId(),
      name,
      value: options?.encrypt ? this.encrypt(value) : value,
      description: options?.description,
      tags: options?.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      encrypted: options?.encrypt || false
    };

    this.secrets.set(secret.id, secret);
    await this.saveSecrets();
    
    logger.info('Secret created', { secretId: secret.id, name });
    return secret;
  }

  async getSecret(id: string): Promise<Secret | null> {
    const secret = this.secrets.get(id);
    if (secret && secret.encrypted) {
      return {
        ...secret,
        value: this.decrypt(secret.value)
      };
    }
    return secret || null;
  }

  async listSecrets(): Promise<SecretMetadata[]> {
    return Array.from(this.secrets.values()).map(secret => ({
      id: secret.id,
      name: secret.name,
      description: secret.description,
      tags: secret.tags,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt
    }));
  }

  async updateSecret(id: string, updates: Partial<Pick<Secret, 'value' | 'description' | 'tags'>>): Promise<Secret | null> {
    const secret = this.secrets.get(id);
    if (!secret) return null;

    const updatedSecret: Secret = {
      ...secret,
      ...updates,
      updatedAt: new Date()
    };

    if (updates.value && secret.encrypted) {
      updatedSecret.value = this.encrypt(updates.value);
    }

    this.secrets.set(id, updatedSecret);
    await this.saveSecrets();
    
    logger.info('Secret updated', { secretId: id });
    return updatedSecret;
  }

  async deleteSecret(id: string): Promise<boolean> {
    const deleted = this.secrets.delete(id);
    if (deleted) {
      await this.saveSecrets();
      logger.info('Secret deleted', { secretId: id });
    }
    return deleted;
  }

  private async loadSecrets(): Promise<void> {
    try {
      const content = await fs.readFile(this.secretsFile, 'utf-8');
      const data = JSON.parse(content);
      
      this.secrets.clear();
      for (const secretData of data.secrets || []) {
        this.secrets.set(secretData.id, {
          ...secretData,
          createdAt: new Date(secretData.createdAt),
          updatedAt: new Date(secretData.updatedAt)
        });
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, start with empty secrets
        this.secrets.clear();
      } else {
        throw error;
      }
    }
  }

  private async saveSecrets(): Promise<void> {
    const data = {
      version: '1.0.0',
      secrets: Array.from(this.secrets.values())
    };
    
    await fs.writeFile(this.secretsFile, JSON.stringify(data, null, 2));
  }

  private generateId(): string {
    return `secret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private encrypt(value: string): string {
    // Simple base64 encoding for demo purposes
    // In production, use proper encryption
    return Buffer.from(value).toString('base64');
  }

  private decrypt(encryptedValue: string): string {
    // Simple base64 decoding for demo purposes
    // In production, use proper decryption
    return Buffer.from(encryptedValue, 'base64').toString('utf-8');
  }
} 