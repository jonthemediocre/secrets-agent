// VaultAgent.ts - Production Grade Unified Vault Management
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger';
import { VaultData, SecretEntry, Project, HarvestedCredential, normalizeDate, parseDate } from './VaultTypes';

const logger = createLogger('VaultAgent');

export class VaultAgent {
  private vaultPath: string;
  private vaultData: VaultData | null = null;
  private isDirty = false;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  private _initializeEmptyVault(): VaultData {
    return { 
      version: "2.0.0", // Updated version for new format
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

      const content = fs.readFileSync(this.vaultPath, 'utf-8');
      const data = JSON.parse(content) as VaultData;
      
      // Validate data structure
      if (!data.projects || !Array.isArray(data.projects)) {
        throw new Error('Invalid vault data structure: missing or invalid projects array');
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

      // Update metadata - handle both legacy and new formats
      if (vaultData.metadata && typeof vaultData.metadata === 'object' && 'lastUpdated' in vaultData.metadata) {
        (vaultData.metadata as any).lastUpdated = Date.now();
      }
      if (vaultData.lastUpdated !== undefined) {
        vaultData.lastUpdated = Date.now();
      }
      
      // Create backup
      const backupPath = `${this.vaultPath}.backup.${Date.now()}`;
      if (fs.existsSync(this.vaultPath)) {
        fs.copyFileSync(this.vaultPath, backupPath);
      }

      // Write new data
      const tempPath = `${this.vaultPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(vaultData, null, 2));
      
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

  // --- CRUD Methods ---

  async createProject(projectName: string, description?: string): Promise<Project> {
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

    const newProject: Project = {
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

  async getProject(projectName: string): Promise<Project | null> {
    if (!this.vaultData) {
      await this.loadVault();
    }

    if (!this.vaultData) {
      return null;
    }

    return this.vaultData.projects.find(p => p.name === projectName) || null;
  }

  async addSecret(projectName: string, secret: Omit<SecretEntry, 'created' | 'lastUpdated'> | HarvestedCredential): Promise<void> {
    if (!this.vaultData) {
      await this.loadVault();
    }

    if (!this.vaultData) {
      throw new Error('Failed to load vault data');
    }

    let project = this.vaultData.projects.find(p => p.name === projectName);
    if (!project) {
      // Auto-create project if it doesn't exist
      project = await this.createProject(projectName);
    }

    // Check for existing secret with same key
    const existingIndex = project.secrets.findIndex(s => s.key === secret.key);
    if (existingIndex >= 0) {
      throw new Error(`Secret '${secret.key}' already exists in project '${projectName}'`);
    }

    // Create the new secret with proper timestamps
    const now = new Date();
    const newSecret: SecretEntry = {
      ...secret,
      created: now,
      lastUpdated: now,
      tags: secret.tags || []
    };

    project.secrets.push(newSecret);
    project.lastUpdated = Date.now();
    this.isDirty = true;
    
    await this.saveVault();
    
    logger.info('Secret added successfully', { 
      projectName, 
      secretKey: secret.key,
      source: secret.source || 'unknown'
    });
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

    const secretIndex = project.secrets.findIndex(s => s.key === secretKey);
    if (secretIndex < 0) {
      throw new Error(`Secret '${secretKey}' not found in project '${projectName}'`);
    }

    // Update secret
    project.secrets[secretIndex] = {
      ...project.secrets[secretIndex],
      ...updates,
      lastUpdated: new Date()
    };

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
    if (secretIndex < 0) {
      throw new Error(`Secret '${secretKey}' not found in project '${projectName}'`);
    }

    project.secrets.splice(secretIndex, 1);
    project.lastUpdated = Date.now();
    this.isDirty = true;
    
    await this.saveVault();
    
    logger.info('Secret deleted successfully', { projectName, secretKey });
  }

  getGlobalTags(): string[] {
    if (!this.vaultData?.globalTags) {
      return [];
    }
    return this.vaultData.globalTags;
  }

  addGlobalTag(tag: string): void {
    if (!this.vaultData) {
      throw new Error('Vault data not loaded');
    }
    
    if (!this.vaultData.globalTags) {
      this.vaultData.globalTags = [];
    }
    
    if (!this.vaultData.globalTags.includes(tag)) {
      this.vaultData.globalTags.push(tag);
      this.isDirty = true;
    }
  }

  removeGlobalTag(tag: string): void {
    if (!this.vaultData?.globalTags) {
      return;
    }
    
    const index = this.vaultData.globalTags.indexOf(tag);
    if (index >= 0) {
      this.vaultData.globalTags.splice(index, 1);
      this.isDirty = true;
    }
  }

  private cleanupBackups(): void {
    try {
      const vaultDir = path.dirname(this.vaultPath);
      const vaultName = path.basename(this.vaultPath);
      const files = fs.readdirSync(vaultDir);
      
      const backupFiles = files
        .filter(f => f.startsWith(`${vaultName}.backup.`))
        .map(f => ({
          name: f,
          time: parseInt(f.split('.backup.')[1]) || 0
        }))
        .sort((a, b) => b.time - a.time);
      
      // Keep only the 5 most recent backups
      const filesToDelete = backupFiles.slice(5);
      
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(path.join(vaultDir, file.name));
        } catch (error) {
          logger.warn('Failed to delete backup file', { file: file.name, error });
        }
      });
      
    } catch (error) {
      logger.warn('Failed to cleanup backups', { error });
    }
  }

  // Testing methods
  getVaultDataForTesting(): VaultData | null {
    return this.vaultData;
  }

  isDirtyForTesting(): boolean {
    return this.isDirty;
  }
} 