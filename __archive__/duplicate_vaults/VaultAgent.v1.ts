// VaultAgent.ts
import fs from 'fs';
import path from 'path';
import { createLogger } from '../src/utils/logger';
import { SOPSIntegration } from './SOPSIntegration';
import { parseEnvFile, serializeEnvFile } from '../src/utils/EnvFileParser';
import { VaultData, SecretEntry, VaultProject } from './VaultTypes';

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
    return { 
      version: 1,
      metadata: {
        created: Date.now(),
        lastUpdated: Date.now()
      },
      projects: [],
      globalTags: []
    }; 
  }

  async initializeVault(): Promise<void> {
    try {
      if (!fs.existsSync(this.vaultPath)) {
        const initialData: VaultData = this._initializeEmptyVault();

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

      this.vaultData = data;
      this.isDirty = false;
      
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

  async saveVault(data?: VaultData): Promise<void> {
    try {
      const vaultData = data || this.vaultData;
      if (!vaultData) {
        throw new Error('No vault data to save');
      }

      // Update metadata
      vaultData.metadata.lastUpdated = Date.now();
      
      // Create backup
      const backupPath = `${this.vaultPath}.backup.${Date.now()}`;
      if (fs.existsSync(this.vaultPath)) {
        fs.copyFileSync(this.vaultPath, backupPath);
      }

      // Write new data
      const tempPath = `${this.vaultPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(vaultData, null, 2));
      
      // Encrypt with SOPS
      await this.sopsIntegration.encrypt(tempPath);
      
      // Atomic move
      fs.renameSync(tempPath, this.vaultPath);
      
      // Update internal state
      this.vaultData = vaultData;
      this.isDirty = false;
      
      // Clean up old backup (keep only last 5)
      this.cleanupBackups();
      
      logger.info('Vault saved successfully', { 
        vaultPath: this.vaultPath,
        projectCount: vaultData.projects.length 
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

  async createProject(projectName: string, description?: string): Promise<VaultProject> {
    if (!this.vaultData) {
      await this.loadVault();
    }

    if (!this.vaultData) {
      throw new Error('Failed to load vault data');
    }

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
    
    logger.info('Project created successfully', { projectName });
    return newProject;
  }

  async getProject(projectName: string): Promise<VaultProject | null> {
    if (!this.vaultData) {
      await this.loadVault();
    }

    if (!this.vaultData) {
      return null;
    }

    const project = this.vaultData.projects.find(p => p.name === projectName);
    return project || null;
  }

  async addSecret(projectName: string, secret: Omit<SecretEntry, 'created' | 'lastUpdated'>): Promise<void> {
    if (!this.vaultData) {
      await this.loadVault();
    }

    if (!this.vaultData) {
      throw new Error('Failed to load vault data');
    }

    const project = this.vaultData.projects.find(p => p.name === projectName);
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }

    const existingSecret = project.secrets.find(s => s.key === secret.key);
    if (existingSecret) {
      throw new Error(`Secret with key '${secret.key}' already exists in project '${projectName}'`);
    }

    const newSecret: SecretEntry = {
      ...secret,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    project.secrets.push(newSecret);
    project.lastUpdated = Date.now();
    this.isDirty = true;
    
    await this.saveVault();
    
    logger.info('Secret added successfully', { projectName, secretKey: secret.key });
  }

  async updateSecret(projectName: string, secretKey: string, updates: Partial<Omit<SecretEntry, 'key' | 'created' | 'lastUpdated'>>): Promise<void> {
    if (!this.vaultData) {
      await this.loadVault();
    }

    if (!this.vaultData) {
      throw new Error('Failed to load vault data');
    }

    const project = this.vaultData.projects.find(p => p.name === projectName);
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }

    const secret = project.secrets.find(s => s.key === secretKey);
    if (!secret) {
      throw new Error(`Secret with key '${secretKey}' not found in project '${projectName}'`);
    }

    Object.assign(secret, updates, { lastUpdated: new Date().toISOString() });
    project.lastUpdated = Date.now();
    this.isDirty = true;
    
    await this.saveVault();
    
    logger.info('Secret updated successfully', { projectName, secretKey });
  }

  async deleteSecret(projectName: string, secretKey: string): Promise<void> {
    if (!this.vaultData) {
      await this.loadVault();
    }

    if (!this.vaultData) {
      throw new Error('Failed to load vault data');
    }

    const project = this.vaultData.projects.find(p => p.name === projectName);
    if (!project) {
      throw new Error(`Project '${projectName}' not found`);
    }

    const secretIndex = project.secrets.findIndex(s => s.key === secretKey);
    if (secretIndex === -1) {
      throw new Error(`Secret with key '${secretKey}' not found in project '${projectName}'`);
    }

    project.secrets.splice(secretIndex, 1);
    project.lastUpdated = Date.now();
    this.isDirty = true;
    
    await this.saveVault();
    
    logger.info('Secret deleted successfully', { projectName, secretKey });
  }

  getGlobalTags(): string[] {
    return this.vaultData?.globalTags || [];
  }

  addGlobalTag(tag: string): void {
    if (!this.vaultData) {
      this.vaultData = this._initializeEmptyVault();
    }
    if (!this.vaultData.globalTags.includes(tag)) {
      this.vaultData.globalTags.push(tag);
      this.isDirty = true;
    }
  }

  removeGlobalTag(tag: string): void {
    if (!this.vaultData) return;
    const index = this.vaultData.globalTags.indexOf(tag);
    if (index > -1) {
      this.vaultData.globalTags.splice(index, 1);
      this.isDirty = true;
    }
  }

  importEnvToVault(envContent: string, options?: { project?: string; category?: string; overwrite?: boolean }): void {
    const envVars = parseEnvFile(envContent);
    const project = options?.project || 'default';
    const category = options?.category || 'environment';
    const overwrite = options?.overwrite || false;

    if (!this.vaultData) {
      this.vaultData = this._initializeEmptyVault();
    }

    // Find or create project
    let targetProject = this.vaultData.projects.find(p => p.name === project);
    if (!targetProject) {
      targetProject = {
        name: project,
        secrets: [],
        created: Date.now(),
        lastUpdated: Date.now()
      };
      this.vaultData.projects.push(targetProject);
    }

    const now = new Date().toISOString();
    
    for (const [key, value] of Object.entries(envVars)) {
      const existingSecret = targetProject.secrets.find(s => s.key === key);
      
      if (existingSecret && !overwrite) {
        logger.warn('Secret already exists and overwrite is false', { key, project, category });
        continue;
      }

      const secretEntry: SecretEntry = {
        key,
        value,
        source: 'env',
        category,
        created: existingSecret?.created || now,
        lastUpdated: now,
        tags: [category]
      };

      if (existingSecret) {
        Object.assign(existingSecret, secretEntry);
      } else {
        targetProject.secrets.push(secretEntry);
      }
    }

    targetProject.lastUpdated = Date.now();
    this.isDirty = true;
  }

  exportEnvFromVault(options?: { project?: string; category?: string }): string {
    if (!this.vaultData) return '';
    
    const project = options?.project || 'default';
    const category = options?.category;
    
    const targetProject = this.vaultData.projects.find(p => p.name === project);
    if (!targetProject) {
      logger.warn('Project not found for export', { project });
      return '';
    }

    let secrets = targetProject.secrets;
    if (category) {
      secrets = secrets.filter(s => s.category === category);
    }

    const envObject: Record<string, string> = {};
    for (const secret of secrets) {
      if (secret.value !== undefined) {
        envObject[secret.key] = secret.value;
      }
    }

    return serializeEnvFile(envObject);
  }

  private cleanupBackups(): void {
    try {
      const vaultDir = path.dirname(this.vaultPath);
      const vaultFilename = path.basename(this.vaultPath);
      const files = fs.readdirSync(vaultDir);
      
      const backupFiles = files
        .filter(f => f.startsWith(`${vaultFilename}.backup.`))
        .map(f => ({
          name: f,
          timestamp: parseInt(f.split('.backup.')[1] || '0')
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      // Keep only the latest 5 backups
      const filesToDelete = backupFiles.slice(5);
      for (const file of filesToDelete) {
        const filePath = path.join(vaultDir, file.name);
        fs.unlinkSync(filePath);
        logger.debug('Cleaned up old backup', { filePath });
      }
         } catch (error) {       logger.warn('Failed to cleanup backups', { error: error instanceof Error ? error.message : String(error) });
    }
  }
} 