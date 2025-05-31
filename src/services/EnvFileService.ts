import { createLogger } from '../utils/logger';
import { VaultAgent } from '../vault/VaultAgent';
import { SecretEntry } from '../vault/VaultTypes';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { EnvFileServiceInterface } from './interfaces';

const logger = createLogger('EnvFileService');

export interface EnvImportOptions {
  projectName: string;
  envFilePath: string;
  mergeBehavior: 'overwrite' | 'skip' | 'merge';
  preserveComments?: boolean;
  categoryMapping?: Record<string, string>;
}

export interface EnvExportOptions {
  projectName: string;
  outputPath: string;
  includeCategories?: string[];
  excludeCategories?: string[];
  includeMetadata?: boolean;
  templateFormat?: 'standard' | 'example' | 'both';
}

export interface EnvImportResult {
  imported: number;
  skipped: number;
  conflicts: Array<{
    key: string;
    existingValue: string;
    newValue: string;
    action: 'overwrite' | 'skip';
  }>;
  errors: string[];
}

/**
 * EnvFileService - Handles import/export between .env files and vault
 * 
 * Provides seamless integration with existing .env workflows while
 * maintaining vault security and organization benefits.
 */
export class EnvFileService implements EnvFileServiceInterface {
  private vaultAgent: VaultAgent;
  private envFilePath: string;

  constructor(vaultPath: string, envFilePath: string = '.env') {
    this.vaultAgent = new VaultAgent(vaultPath);
    this.envFilePath = path.resolve(envFilePath);
  }

  /**
   * Import secrets from a .env file into the vault
   * 
   * @param options Import configuration options
   * @returns Detailed import results
   */
  async importFromEnvFile(options: EnvImportOptions): Promise<EnvImportResult> {
    try {
      logger.info('Starting .env file import', {
        projectName: options.projectName,
        envFilePath: options.envFilePath,
        mergeBehavior: options.mergeBehavior
      });

      if (!existsSync(options.envFilePath)) {
        throw new Error(`Environment file not found: ${options.envFilePath}`);
      }

      const result: EnvImportResult = {
        imported: 0,
        skipped: 0,
        conflicts: [],
        errors: []
      };

      // Parse .env file
      const envContent = readFileSync(options.envFilePath, 'utf8');
      const parsedEntries = this.parseEnvContent(envContent, options.preserveComments);

      // Load existing vault data
      const vaultData = await this.vaultAgent.loadVault();
      let project = vaultData.projects.find(p => p.name === options.projectName);

      // Create project if it doesn't exist
      if (!project) {
        project = await this.vaultAgent.createProject(
          options.projectName,
          `Imported from ${options.envFilePath}`
        );
      }

      // Process each entry
      for (const entry of parsedEntries) {
        try {
          const existingSecret = project.secrets.find(s => s.key === entry.key);

          if (existingSecret) {
            // Handle conflicts
            const conflict = {
              key: entry.key,
              existingValue: existingSecret.value,
              newValue: entry.value,
              action: options.mergeBehavior as 'overwrite' | 'skip'
            };

            result.conflicts.push(conflict);

            if (options.mergeBehavior === 'skip') {
              result.skipped++;
              continue;
            }
          }

          // Create secret entry
          const secretEntry: Omit<SecretEntry, 'created' | 'lastUpdated'> = {
            key: entry.key,
            value: entry.value,
            description: entry.comment || `Imported from ${options.envFilePath}`,
            tags: ['env-import', this.categorizeFromEnvKey(entry.key, options.categoryMapping)],
            category: this.categorizeFromEnvKey(entry.key, options.categoryMapping),
            source: 'env-import',
            metadata: {
              originalFile: options.envFilePath,
              importedAt: new Date().toISOString(),
              hasComment: !!entry.comment
            }
          };

          // Add or update secret
          if (existingSecret) {
            await this.vaultAgent.updateSecret(options.projectName, entry.key, secretEntry);
          } else {
            await this.vaultAgent.addSecret(options.projectName, secretEntry);
          }

          result.imported++;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to import ${entry.key}: ${errorMessage}`);
          logger.warn('Failed to import secret', { key: entry.key, error: errorMessage });
        }
      }

      logger.info('Environment file import completed', {
        projectName: options.projectName,
        imported: result.imported,
        skipped: result.skipped,
        conflicts: result.conflicts.length,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Environment file import failed', {
        envFilePath: options.envFilePath,
        error: errorMessage
      });
      throw new Error(`Import failed: ${errorMessage}`);
    }
  }

  /**
   * Export vault secrets to .env file format
   * 
   * @param options Export configuration options
   * @returns Path to created .env file
   */
  async exportToEnvFile(options: EnvExportOptions): Promise<string> {
    try {
      logger.info('Starting .env file export', {
        projectName: options.projectName,
        outputPath: options.outputPath
      });

      const vaultData = await this.vaultAgent.loadVault();
      const project = vaultData.projects.find(p => p.name === options.projectName);

      if (!project) {
        throw new Error(`Project not found: ${options.projectName}`);
      }

      // Filter secrets based on options
      let secrets = project.secrets;

      if (options.includeCategories?.length) {
        secrets = secrets.filter(s => 
          options.includeCategories!.includes(s.category || 'general')
        );
      }

      if (options.excludeCategories?.length) {
        secrets = secrets.filter(s => 
          !options.excludeCategories!.includes(s.category || 'general')
        );
      }

      // Generate .env content
      let envContent = this.generateEnvHeader(options);

      // Group by category for organization
      const groupedSecrets = this.groupSecretsByCategory(secrets);

      for (const [category, categorySecrets] of Object.entries(groupedSecrets)) {
        envContent += `\n# ${category.toUpperCase()} Configuration\n`;

        for (const secret of categorySecrets) {
          // Add description as comment
          if (secret.description && options.includeMetadata) {
            envContent += `# ${secret.description}\n`;
          }

          // Add the secret
          if (options.templateFormat === 'example') {
            envContent += `${secret.key}=# TODO: Set your ${secret.key.toLowerCase()}\n`;
          } else if (options.templateFormat === 'both') {
            envContent += `${secret.key}=${secret.value}\n`;
            envContent += `# ${secret.key}_EXAMPLE=# TODO: Set your ${secret.key.toLowerCase()}\n`;
          } else {
            envContent += `${secret.key}=${secret.value}\n`;
          }

          envContent += '\n';
        }
      }

      // Ensure output directory exists
      const outputDir = dirname(options.outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Write file
      writeFileSync(options.outputPath, envContent, 'utf8');

      logger.info('Environment file export completed', {
        projectName: options.projectName,
        outputPath: options.outputPath,
        secretsExported: secrets.length
      });

      return options.outputPath;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Environment file export failed', {
        outputPath: options.outputPath,
        error: errorMessage
      });
      throw new Error(`Export failed: ${errorMessage}`);
    }
  }

  /**
   * Parse .env file content into structured entries
   */
  private parseEnvContent(content: string, preserveComments = false): Array<{
    key: string;
    value: string;
    comment?: string;
  }> {
    const entries: Array<{ key: string; value: string; comment?: string }> = [];
    const lines = content.split('\n');
    let currentComment = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        currentComment = '';
        continue;
      }

      // Handle comments
      if (trimmed.startsWith('#')) {
        if (preserveComments) {
          currentComment = trimmed.substring(1).trim();
        }
        continue;
      }

      // Parse key=value
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex === -1) continue;

      const key = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();

      // Handle quoted values
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      entries.push({
        key,
        value,
        comment: currentComment || undefined
      });

      currentComment = '';
    }

    return entries;
  }

  /**
   * Categorize secret based on key name and mapping
   */
  private categorizeFromEnvKey(key: string, categoryMapping?: Record<string, string>): string {
    // Check explicit mapping first
    if (categoryMapping?.[key]) {
      return categoryMapping[key];
    }

    // Auto-categorize based on common patterns
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes('db') || lowerKey.includes('database') || lowerKey.includes('sql')) {
      return 'database';
    }
    if (lowerKey.includes('api') || lowerKey.includes('key') || lowerKey.includes('token')) {
      return 'api';
    }
    if (lowerKey.includes('auth') || lowerKey.includes('jwt') || lowerKey.includes('secret')) {
      return 'authentication';
    }
    if (lowerKey.includes('redis') || lowerKey.includes('cache')) {
      return 'cache';
    }
    if (lowerKey.includes('mail') || lowerKey.includes('smtp') || lowerKey.includes('email')) {
      return 'email';
    }
    if (lowerKey.includes('aws') || lowerKey.includes('azure') || lowerKey.includes('gcp')) {
      return 'cloud';
    }

    return 'general';
  }

  /**
   * Generate header for .env file
   */
  private generateEnvHeader(options: EnvExportOptions): string {
    const timestamp = new Date().toISOString();
    return `# Environment Configuration
# Generated from Secrets Agent vault
# Project: ${options.projectName}
# Export Date: ${timestamp}
# 
# WARNING: This file contains sensitive information
# Do not commit to version control
#
`;
  }

  /**
   * Group secrets by category for organized output
   */
  private groupSecretsByCategory(secrets: SecretEntry[]): Record<string, SecretEntry[]> {
    const groups: Record<string, SecretEntry[]> = {};

    for (const secret of secrets) {
      const category = secret.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(secret);
    }

    return groups;
  }

  async addSecret(key: string, value: string, description?: string): Promise<void> {
    try {
      const envContent = await this.readEnvFile();
      const lines = envContent.split('\n');
      
      // Add description as comment if provided
      if (description) {
        lines.push(`# ${description}`);
      }
      
      // Add or update the secret
      const existingIndex = lines.findIndex(line => line.startsWith(`${key}=`));
      const secretLine = `${key}=${value}`;
      
      if (existingIndex >= 0) {
        lines[existingIndex] = secretLine;
      } else {
        lines.push(secretLine);
      }
      
      await fs.writeFile(this.envFilePath, lines.join('\n'));
      console.log(`✅ Secret ${key} added to vault`);
      
    } catch (error) {
      console.error(`❌ Failed to add secret ${key}:`, error);
      throw error;
    }
  }

  async getSecret(key: string): Promise<string | null> {
    try {
      const envContent = await this.readEnvFile();
      const lines = envContent.split('\n');
      
      const secretLine = lines.find(line => line.startsWith(`${key}=`));
      if (!secretLine) return null;
      
      return secretLine.split('=').slice(1).join('=');
      
    } catch (error) {
      console.error(`❌ Failed to get secret ${key}:`, error);
      return null;
    }
  }

  async updateSecret(key: string, value: string): Promise<void> {
    await this.addSecret(key, value, `Updated ${new Date().toISOString()}`);
  }

  async deleteSecret(key: string): Promise<void> {
    try {
      const envContent = await this.readEnvFile();
      const lines = envContent.split('\n').filter(line => !line.startsWith(`${key}=`));
      
      await fs.writeFile(this.envFilePath, lines.join('\n'));
      console.log(`✅ Secret ${key} deleted from vault`);
      
    } catch (error) {
      console.error(`❌ Failed to delete secret ${key}:`, error);
      throw error;
    }
  }

  private async readEnvFile(): Promise<string> {
    try {
      return await fs.readFile(this.envFilePath, 'utf-8');
    } catch (error) {
      // File doesn't exist, return empty string
      return '';
    }
  }
} 