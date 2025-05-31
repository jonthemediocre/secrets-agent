import { randomBytes, createCipheriv, createDecipheriv, scrypt } from 'crypto';
import { promisify } from 'util';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { constants } from 'fs';

const scryptAsync = promisify(scrypt);

export interface VaultData {
  version: string;
  created: number;
  lastModified: number;
  sealed: boolean;
  secrets: Record<string, any>;
}

interface VaultStatus {
  initialized: boolean;
  sealed: boolean;
  version: string;
  totalSecrets: number;
  created: Date;
  lastModified: Date;
}

export class VaultService {
  private readonly vaultPath: string;
  private data: VaultData | null = null;
  private key: Buffer | null = null;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  async getData(): Promise<VaultData> {
    if (!this.data) {
      this.data = await this.loadVaultData();
    }
    return this.data;
  }

  async saveData(data: VaultData): Promise<void> {
    if (!this.key) {
      throw new Error('Vault must be unsealed to save data');
    }
    await this.saveVaultData(data, this.key);
    this.data = data;
  }

  async initialize(keyFile: string): Promise<void> {
    try {
      // Check if vault already exists
      try {
        await access(this.vaultPath, constants.F_OK);
        throw new Error('Vault already exists');
      } catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
      }

      // Generate master key
      const masterKey = randomBytes(32);
      
      // Create initial vault data
      const vaultData: VaultData = {
        version: '1.0',
        created: Date.now(),
        lastModified: Date.now(),
        sealed: true,
        secrets: {}
      };

      // Ensure directories exist
      await mkdir(dirname(this.vaultPath), { recursive: true });
      await mkdir(dirname(keyFile), { recursive: true });

      // Save master key
      await writeFile(keyFile, masterKey.toString('hex'));

      // Encrypt and save vault
      await this.saveVaultData(vaultData, masterKey);

    } catch (error) {
      throw new Error(`Failed to initialize vault: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getStatus(): Promise<VaultStatus> {
    try {
      const vaultData = await this.loadVaultData();
      return {
        initialized: true,
        sealed: vaultData.sealed,
        version: vaultData.version,
        totalSecrets: Object.keys(vaultData.secrets).length,
        created: new Date(vaultData.created),
        lastModified: new Date(vaultData.lastModified)
      };
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return {
          initialized: false,
          sealed: true,
          version: '0',
          totalSecrets: 0,
          created: new Date(0),
          lastModified: new Date(0)
        };
      }
      throw error;
    }
  }

  async seal(): Promise<void> {
    if (!this.data) {
      throw new Error('Vault not loaded');
    }
    this.data.sealed = true;
    await this.saveVaultData(this.data, this.key!);
    this.key = null;
    this.data = null;
  }

  async unseal(keyFile: string): Promise<void> {
    try {
      const keyHex = await readFile(keyFile, 'utf8');
      this.key = Buffer.from(keyHex, 'hex');
      this.data = await this.loadVaultData();
      this.data.sealed = false;
      await this.saveVaultData(this.data, this.key);
    } catch (error) {
      throw new Error(`Failed to unseal vault: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async backup(outputPath: string): Promise<void> {
    if (!this.data || !this.key) {
      throw new Error('Vault must be unsealed to create backup');
    }
    await writeFile(outputPath, JSON.stringify(this.data, null, 2));
  }

  async restore(inputPath: string): Promise<void> {
    if (!this.key) {
      throw new Error('Vault must be unsealed to restore backup');
    }
    const backupData = JSON.parse(await readFile(inputPath, 'utf8'));
    await this.saveVaultData(backupData, this.key);
    this.data = backupData;
  }

  async rotateMasterKey(keyFile: string): Promise<void> {
    if (!this.data || !this.key) {
      throw new Error('Vault must be unsealed to rotate master key');
    }

    // Generate new master key
    const newKey = randomBytes(32);
    
    // Save vault with new key
    await this.saveVaultData(this.data, newKey);
    
    // Save new key file
    await writeFile(keyFile, newKey.toString('hex'));
    
    this.key = newKey;
  }

  private async loadVaultData(): Promise<VaultData> {
    if (!this.key) {
      throw new Error('Vault key not loaded');
    }

    const encryptedData = await readFile(this.vaultPath);
    const iv = encryptedData.slice(0, 16);
    const data = encryptedData.slice(16);

    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString());
  }

  private async saveVaultData(data: VaultData, key: Buffer): Promise<void> {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data)),
      cipher.final()
    ]);

    const fullData = Buffer.concat([iv, encrypted]);
    await writeFile(this.vaultPath, fullData);
  }
} 