// VaultAgent.ts
import fs from 'fs';
import path from 'path';
import { createLogger } from '../src/utils/logger';
import { SOPSIntegration } from './SOPSIntegration';
import { parseEnvFile, serializeEnvFile } from '../src/utils/EnvFileParser';
import { VaultData, SecretEntry, VaultProject, VaultCategory } from './VaultTypes';

const logger = createLogger('VaultAgent');

export class VaultAgent {
  private vaultPath: string;
  private vaultData: VaultData | null = null;
  private isDirty = false;
  private sopsIntegration: SOPSIntegration;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
    this.sopsIntegration = new SOPSIntegration();
  }

  private _initializeEmptyVault(): VaultData {
    // Ensure a version number is part of the initial vault structure
    return { 
      projects: [], 
      metadata: { 
        version: '1.0.0', 
        created: Date.now(), 
        lastUpdated: Date.now() 
      } 
    }; 
  }

  async initializeVault(): Promise<void> {
    try {
      if (!fs.existsSync(this.vaultPath)) {
        const initialData: VaultData = {
          projects: [],
          metadata: {
            version: '1.0.0',
            created: Date.now(),
            lastUpdated: Date.now(),
          },
        };

        // Create directory if it doesn't exist
        const vaultDir = path.dirname(this.vaultPath);
        if (!fs.existsSync(vaultDir)) {
          fs.mkdirSync(vaultDir, { recursive: true });
        }

        // Write initial data
        fs.writeFileSync(this.vaultPath, JSON.stringify(initialData, null, 2));
        
        // Encrypt with SOPS
        await this.sopsIntegration.encrypt(this.vaultPath);
        
        logger.info('Vault initialized successfully', { vaultPath: this.vaultPath });
      } else {
        logger.info('Vault already exists', { vaultPath: this.vaultPath });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      logger.error('Failed to initialize vault', { 
        vaultPath: this.vaultPath,
        error: errorMessage 
      });
      throw new Error(`Vault initialization failed: ${errorMessage}`);
    }
  }

  async loadVault(): Promise<VaultData> {
    try {
      if (!fs.existsSync(this.vaultPath)) {
        await this.initializeVault();
      }

      // Check if file is encrypted
      const isEncrypted = await this.sopsIntegration.isEncrypted(this.vaultPath);
      
      let content: string;
      if (isEncrypted) {
        content = await this.sopsIntegration.decrypt(this.vaultPath);
      } else {
        content = fs.readFileSync(this.vaultPath, 'utf-8');
      }

      const data = JSON.parse(content) as VaultData;
      
      // Validate data structure
      if (!data.projects || !Array.isArray(data.projects)) {
        throw new Error('Invalid vault data structure: missing or invalid projects array');
      }
      
      if (!data.metadata || typeof data.metadata !== 'object') {
        throw new Error('Invalid vault data structure: missing or invalid metadata');
      }

      logger.info('Vault loaded successfully', { 
        vaultPath: this.vaultPath,
        projectCount: data.projects.length 
      });
      
      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown load error';
      logger.error('Failed to load vault', { 
        vaultPath: this.vaultPath,
        error: errorMessage 
      });
      throw new Error(`Vault load failed: ${errorMessage}`);
    }
  }

  async saveVault(data: VaultData): Promise<void> {
    try {
      // Update metadata
      data.metadata.lastUpdated = Date.now();
      
      // Create backup
      const backupPath = `${this.vaultPath}.backup.${Date.now()}`;
      if (fs.existsSync(this.vaultPath)) {
        fs.copyFileSync(this.vaultPath, backupPath);
      }

      // Write new data
      const tempPath = `${this.vaultPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
      
      // Encrypt with SOPS
      await this.sopsIntegration.encrypt(tempPath);
      
      // Atomic move
      fs.renameSync(tempPath, this.vaultPath);
      
      // Clean up old backup (keep only last 5)
      this.cleanupBackups();
      
      logger.info('Vault saved successfully', { 
        vaultPath: this.vaultPath,
        projectCount: data.projects.length 
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown save error';
      logger.error('Failed to save vault', { 
        vaultPath: this.vaultPath,
        error: errorMessage 
      });
      throw new Error(`Vault save failed: ${errorMessage}`);
    }
  }

  getVaultDataForTesting(): VaultData | null {
    return this.vaultData;
  }

  isDirtyForTesting(): boolean {
    return this.isDirty;
  }

  // --- CRUD Methods ---

  getSecret(project: string, category: string, identifier: string): SecretEntry | null {
    if (!this.vaultData) return null; // Should be initialized by loadVault
    return this.vaultData.projects?.[project]?.[category]?.[identifier] || null;
  }

  addProject(project: string): void {
    if (!this.vaultData) this.vaultData = this._initializeEmptyVault();
    if (!this.vaultData.projects[project]) {
      this.vaultData.projects[project] = {} as VaultProject; // Assuming VaultProject is a map of categories
      this.isDirty = true;
    }
  }

  addSecret(project: string, category: string, identifier: string, secret: SecretEntry): void {
    if (!this.vaultData) this.vaultData = this._initializeEmptyVault();
    
    if (!this.vaultData.projects[project]) {
      this.vaultData.projects[project] = {} as VaultProject;
    }
    if (!this.vaultData.projects[project][category]) {
      this.vaultData.projects[project][category] = {} as VaultCategory; // Assuming VaultCategory is a map of secrets
    }
    const now = new Date().toISOString();
    // Ensure created and lastUpdated are set
    const newSecret: SecretEntry = {
        ...secret, // Spread incoming secret first
        created: secret.created || now, // Preserve if provided, else new
        lastUpdated: now, // Always update lastUpdated
    };
    this.vaultData.projects[project][category][identifier] = newSecret;
    this.isDirty = true;
  }

  updateSecret(project: string, category: string, identifier: string, updates: Partial<SecretEntry>): void {
    if (!this.vaultData) return; // Or initialize: this.vaultData = this._initializeEmptyVault();
    const secret = this.getSecret(project, category, identifier);
    if (!secret) {
        return;
    }
    Object.assign(secret, updates);
    secret.lastUpdated = new Date().toISOString();
    this.isDirty = true;
  }

  updateSecretValue(project: string, category: string, identifier: string, newKey: string): void {
    if (!this.vaultData) return;
    const secret = this.getSecret(project, category, identifier);
    if (!secret) {
        return;
    }
    secret.key = newKey; 
    secret.lastUpdated = new Date().toISOString();
    this.isDirty = true;
  }

  deleteSecret(project: string, category: string, identifier: string): void {
    if (!this.vaultData || !this.vaultData.projects?.[project]?.[category]?.[identifier]) {
        return;
    }
    
    delete this.vaultData.projects[project][category][identifier];
    this.isDirty = true;

    if (Object.keys(this.vaultData.projects[project][category]).length === 0) {
      delete this.vaultData.projects[project][category];
    }
    if (Object.keys(this.vaultData.projects[project]).length === 0) {
      delete this.vaultData.projects[project];
    }
  }

  getGlobalTags(): string[] {
    if (!this.vaultData) return []; // Should be initialized
    return this.vaultData.globalTags;
  }

  addGlobalTag(tag: string): void {
    if (!this.vaultData) this.vaultData = this._initializeEmptyVault();
    if (this.vaultData.globalTags.includes(tag)) return;
    this.vaultData.globalTags.push(tag);
    this.isDirty = true;
  }

  removeGlobalTag(tag: string): void {
    if (!this.vaultData || !this.vaultData.globalTags) return; // Check globalTags existence
    this.vaultData.globalTags = this.vaultData.globalTags.filter((t: string) => t !== tag);
    this.isDirty = true;
  }

  /**
   * Import .env file content into the vault under a default project/category.
   * @param envContent The raw .env file content as a string
   * @param options Optional: { project, category, overwrite }
   * @returns { imported: string[], skipped: string[], errors: string[] }
   */
  importEnvToVault(envContent: string, options?: { project?: string; category?: string; overwrite?: boolean }) {
    const project = options?.project || 'default';
    const category = options?.category || 'env';
    const overwrite = options?.overwrite ?? false;
    const parsed = parseEnvFile(envContent);
    const imported: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];
    const now = new Date().toISOString();
    if (!this.vaultData) this.vaultData = this._initializeEmptyVault();
    if (!this.vaultData.projects[project]) this.vaultData.projects[project] = {};
    if (!this.vaultData.projects[project][category]) this.vaultData.projects[project][category] = {};
    for (const [key, value] of Object.entries(parsed)) {
      try {
        const exists = this.vaultData.projects[project][category][key];
        if (exists && !overwrite) {
          skipped.push(key);
          continue;
        }
        this.vaultData.projects[project][category][key] = {
          key: value,
          source: 'env',
          envFile: '.env',
          created: exists?.created || now,
          lastUpdated: now,
        };
        imported.push(key);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(key + ': ' + errorMessage);
      }
    }
    this.isDirty = true;
    return { imported, skipped, errors };
  }

  /**
   * Export vault secrets as .env file content from a default project/category.
   * @param options Optional: { project, category }
   * @returns .env file string
   */
  exportEnvFromVault(options?: { project?: string; category?: string }): string {
    const project = options?.project || 'default';
    const category = options?.category || 'env';
    if (!this.vaultData || 
        !this.vaultData.projects[project] || 
        !this.vaultData.projects[project][category]) {
      return serializeEnvFile({}); // Ensure serializeEnvFile is called for non-existent paths
    }
    const secretsToExport: Record<string, string> = {};
    const secrets = this.vaultData.projects[project][category];
    for (const identifier in secrets) {
        secretsToExport[identifier] = secrets[identifier].key;
    }
    return serializeEnvFile(secretsToExport);
  }

  private cleanupBackups(): void {
    try {
      const vaultDir = path.dirname(this.vaultPath);
      const vaultName = path.basename(this.vaultPath);
      const backupPattern = `${vaultName}.backup.`;
      
      const files = fs.readdirSync(vaultDir)
        .filter(file => file.startsWith(backupPattern))
        .map(file => ({
          name: file,
          path: path.join(vaultDir, file),
          time: parseInt(file.replace(backupPattern, ''), 10)
        }))
        .sort((a, b) => b.time - a.time);

      // Keep only the 5 most recent backups
      const filesToDelete = files.slice(5);
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        logger.debug('Backup file deleted', { file: file.name });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown cleanup error';
      logger.warn('Failed to cleanup backups', { error: errorMessage });
    }
  }

  async createProject(projectName: string, description?: string): Promise<VaultProject> {
    await this.loadVault();
    if (!this.vaultData) {
      throw new Error('Vault data not loaded');
    }

    // Check if project already exists
    const existingProject = this.vaultData.projects.find(p => p.name === projectName);
    if (existingProject) {
      throw new Error(`Project '${projectName}' already exists`);
    }

    const newProject: VaultProject = {
      name: projectName,
      description,
      secrets: [],
      created: Date.now(),
      lastUpdated: Date.now(),
    };

    this.vaultData.projects.push(newProject);
    this.isDirty = true;
    await this.saveVault();
    
    return newProject;
  }

  async getProject(projectName: string): Promise<VaultProject | null> {
    await this.loadVault();
    if (!this.vaultData) {
      return null;
    }

    const project = this.vaultData.projects.find(p => p.name === projectName);
    return project || null;
  }

  async addSecret(projectName: string, secret: Omit<SecretEntry, 'created' | 'lastUpdated'>): Promise<void> {
    await this.loadVault();
    if (!this.vaultData) {
      throw new Error('Vault data not loaded');
    }

    const project = this.vaultData.projects.find(p => p.name === projectName);
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }

    // Check if secret already exists
    const existingSecret = project.secrets.find(s => s.key === secret.key);
    if (existingSecret) {
      throw new Error(`Secret '${secret.key}' already exists in project '${projectName}'`);
    }

    const newSecret: SecretEntry = {
      ...secret,
      created: Date.now(),
      lastUpdated: Date.now(),
    };

    project.secrets.push(newSecret);
    project.lastUpdated = Date.now();
    this.isDirty = true;
    await this.saveVault();
  }

  async updateSecret(projectName: string, secretKey: string, updates: Partial<Omit<SecretEntry, 'key' | 'created' | 'lastUpdated'>>): Promise<void> {
    await this.loadVault();
    if (!this.vaultData) {
      throw new Error('Vault data not loaded');
    }

    const project = this.vaultData.projects.find(p => p.name === projectName);
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }

    const secret = project.secrets.find(s => s.key === secretKey);
    if (!secret) {
      throw new Error(`Secret '${secretKey}' not found in project '${projectName}'`);
    }

    // Apply updates
    Object.assign(secret, updates, { lastUpdated: Date.now() });
    project.lastUpdated = Date.now();
    this.isDirty = true;
    await this.saveVault();
  }

  async deleteSecret(projectName: string, secretKey: string): Promise<void> {
    await this.loadVault();
    if (!this.vaultData) {
      throw new Error('Vault data not loaded');
    }

    const project = this.vaultData.projects.find(p => p.name === projectName);
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }

    const secretIndex = project.secrets.findIndex(s => s.key === secretKey);
    if (secretIndex === -1) {
      throw new Error(`Secret '${secretKey}' not found in project '${projectName}'`);
    }

    project.secrets.splice(secretIndex, 1);
    project.lastUpdated = Date.now();
    this.isDirty = true;
    await this.saveVault();
  }
} 