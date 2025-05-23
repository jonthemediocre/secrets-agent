import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../src/utils/logger';

const logger = createLogger('SOPSIntegration');
const execAsync = promisify(exec);

interface SOPSConfig {
  keyGroups: Array<{
    pgp?: string[];
    kms?: string[];
    age?: string[];
    hc_vault?: string[];
  }>;
  shamir_threshold?: number;
}

interface SOPSMetadata {
  kms?: Array<{ arn: string; created_at: string; enc: string }>;
  gcp_kms?: Array<{ resource_id: string; created_at: string; enc: string }>;
  azure_kv?: Array<{ vault_url: string; name: string; created_at: string; enc: string }>;
  hc_vault?: Array<{ vault_url: string; engine_path: string; key_name: string; created_at: string; enc: string }>;
  age?: Array<{ recipient: string; enc: string }>;
  pgp?: Array<{ fp: string; created_at: string; enc: string }>;
  encrypted_regex?: string;
  version: string;
}

export class SOPSIntegration {
  private sopsPath: string;

  constructor(sopsPath = 'sops') {
    this.sopsPath = sopsPath;
  }

  async encrypt(filePath: string, keyGroups?: SOPSConfig['keyGroups']): Promise<void> {
    try {
      let command = `${this.sopsPath} -e -i ${filePath}`;
      
      if (keyGroups && keyGroups.length > 0) {
        // Add key groups to command
        const keyArgs = this.buildKeyArguments(keyGroups);
        command = `${this.sopsPath} -e ${keyArgs} -i ${filePath}`;
      }

      logger.info('Encrypting file with SOPS', { filePath, command: command.replace(/--[a-z-]+ [^\\s]+/g, '--*** ***') });
      
      const { stderr } = await execAsync(command);
      
      if (stderr) {
        logger.warn('SOPS encryption completed with warnings', { stderr });
      }
      
      logger.info('File encrypted successfully', { filePath });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown encryption error';
      logger.error('SOPS encryption failed', { 
        filePath, 
        error: errorMessage 
      });
      throw new Error(`SOPS encryption failed: ${errorMessage}`);
    }
  }

  async decrypt(filePath: string, outputPath?: string): Promise<string> {
    try {
      const command = outputPath 
        ? `${this.sopsPath} -d ${filePath} > ${outputPath}`
        : `${this.sopsPath} -d ${filePath}`;

      logger.info('Decrypting file with SOPS', { filePath, outputPath });
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        logger.warn('SOPS decryption completed with warnings', { stderr });
      }
      
      logger.info('File decrypted successfully', { filePath, outputPath });
      return stdout;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown decryption error';
      logger.error('SOPS decryption failed', { 
        filePath, 
        outputPath,
        error: errorMessage 
      });
      throw new Error(`SOPS decryption failed: ${errorMessage}`);
    }
  }

  async updateKeys(filePath: string, newKeyGroups: SOPSConfig['keyGroups']): Promise<void> {
    try {
      const keyArgs = this.buildKeyArguments(newKeyGroups);
      const command = `${this.sopsPath} updatekeys ${keyArgs} ${filePath}`;

      logger.info('Updating SOPS keys', { filePath });
      
      const { stderr } = await execAsync(command);
      
      if (stderr) {
        logger.warn('SOPS key update completed with warnings', { stderr });
      }
      
      logger.info('SOPS keys updated successfully', { filePath });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown key update error';
      logger.error('SOPS key update failed', { 
        filePath, 
        error: errorMessage 
      });
      throw new Error(`SOPS key update failed: ${errorMessage}`);
    }
  }

  async rotate(filePath: string): Promise<void> {
    try {
      const command = `${this.sopsPath} -r ${filePath}`;

      logger.info('Rotating SOPS data keys', { filePath });
      
      const { stderr } = await execAsync(command);
      
      if (stderr) {
        logger.warn('SOPS rotation completed with warnings', { stderr });
      }
      
      logger.info('SOPS data keys rotated successfully', { filePath });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown rotation error';
      logger.error('SOPS rotation failed', { 
        filePath, 
        error: errorMessage 
      });
      throw new Error(`SOPS rotation failed: ${errorMessage}`);
    }
  }

  private buildKeyArguments(keyGroups: SOPSConfig['keyGroups']): string {
    const args: string[] = [];
    
    for (const group of keyGroups) {
      if (group.kms && group.kms.length > 0) {
        args.push(`--kms ${group.kms.join(',')}`);
      }
      if (group.pgp && group.pgp.length > 0) {
        args.push(`--pgp ${group.pgp.join(',')}`);
      }
      if (group.age && group.age.length > 0) {
        args.push(`--age ${group.age.join(',')}`);
      }
      if (group.hc_vault && group.hc_vault.length > 0) {
        args.push(`--hc-vault-transit ${group.hc_vault.join(',')}`);
      }
    }
    
    return args.join(' ');
  }

  async getMetadata(filePath: string): Promise<SOPSMetadata | null> {
    try {
      const command = `${this.sopsPath} -d --extract '["sops"]' ${filePath}`;
      
      const { stdout } = await execAsync(command);
      const metadata = JSON.parse(stdout) as SOPSMetadata;
      
      return metadata;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown metadata error';
      logger.error('Failed to get SOPS metadata', { 
        filePath, 
        error: errorMessage 
      });
      return null;
    }
  }

  async isEncrypted(filePath: string): Promise<boolean> {
    try {
      const metadata = await this.getMetadata(filePath);
      return metadata !== null && metadata.version !== undefined;
    } catch {
      return false;
    }
  }
} 