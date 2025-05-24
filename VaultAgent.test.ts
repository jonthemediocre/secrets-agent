import { VaultAgent } from './vault/VaultAgent';
import { VaultData } from './vault/VaultTypes';
import * as fs from 'fs/promises';
import * as yaml from 'yaml';

// Mock file system
jest.mock('fs/promises');
jest.mock('./vault/SOPSIntegration');

const mockVaultPath = './test_vault.yaml';

describe('VaultAgent', () => {
  let vaultAgent: VaultAgent;

  const initialVaultData: VaultData = {
    version: 1,
    metadata: { created: Date.now(), lastUpdated: Date.now() },
    projects: [],
    globalTags: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    vaultAgent = new VaultAgent(mockVaultPath);
    
    // Setup default file system mocks
    (fs.readFile as jest.Mock).mockResolvedValue(yaml.stringify(initialVaultData));
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
  });

  describe('Loading Vault', () => {
    it('should load vault data successfully', async () => {
      await vaultAgent.loadVault();
      const data = vaultAgent.getVaultDataForTesting();
      expect(data).toBeDefined();
      expect(data?.version).toBe(1);
      expect(Array.isArray(data?.projects)).toBe(true);
      expect(vaultAgent.isDirtyForTesting()).toBe(false);
    });

    it('should load vault data from an existing valid file', async () => {
      const existingData: VaultData = {
        version: 1,
        metadata: { created: Date.now(), lastUpdated: Date.now() },
        projects: [
          { name: 'testProject', secrets: [], created: Date.now(), lastUpdated: Date.now() }
        ],
        globalTags: ['test'],
      };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingData));
      
      await vaultAgent.loadVault();
      const data = vaultAgent.getVaultDataForTesting();
      expect(data?.projects).toHaveLength(1);
      expect(data?.projects[0].name).toBe('testProject');
    });
  });

  describe('Saving Vault', () => {
    it('should save vault data when dirty', async () => {
      await vaultAgent.loadVault();
      vaultAgent.addGlobalTag('test'); // Make it dirty
      await vaultAgent.saveVault();
      expect(fs.writeFile).toHaveBeenCalled();
      expect(vaultAgent.isDirtyForTesting()).toBe(false);
    });
  });

  describe('Project Management', () => {
    beforeEach(async () => {
      await vaultAgent.loadVault();
    });

    it('should create a new project', async () => {
      const project = await vaultAgent.createProject('proj1', 'Test project');
      expect(project.name).toBe('proj1');
      expect(project.description).toBe('Test project');
      expect(project.secrets).toEqual([]);
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });

    it('should get an existing project', async () => {
      await vaultAgent.createProject('proj1');
      const project = await vaultAgent.getProject('proj1');
      expect(project).toBeTruthy();
      expect(project?.name).toBe('proj1');
    });

    it('should return null for non-existent project', async () => {
      const project = await vaultAgent.getProject('nonexistent');
      expect(project).toBeNull();
    });
  });

  describe('Secret Management', () => {
    beforeEach(async () => {
      await vaultAgent.loadVault();
      await vaultAgent.createProject('test-project');
    });

    it('should add a new secret', async () => {
      await vaultAgent.addSecret('test-project', {
        key: 'TEST_KEY',
        value: 'test-value',
        source: 'manual',
        description: 'Test secret'
      });

      const project = await vaultAgent.getProject('test-project');
      expect(project?.secrets).toHaveLength(1);
      expect(project?.secrets[0].key).toBe('TEST_KEY');
      expect(project?.secrets[0].value).toBe('test-value');
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });

    it('should update an existing secret', async () => {
      await vaultAgent.addSecret('test-project', {
        key: 'TEST_KEY',
        value: 'test-value',
        source: 'manual'
      });

      await vaultAgent.updateSecret('test-project', 'TEST_KEY', {
        value: 'updated-value',
        description: 'Updated description'
      });

      const project = await vaultAgent.getProject('test-project');
      const secret = project?.secrets.find(s => s.key === 'TEST_KEY');
      expect(secret?.value).toBe('updated-value');
      expect(secret?.description).toBe('Updated description');
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });

    it('should delete an existing secret', async () => {
      await vaultAgent.addSecret('test-project', {
        key: 'TEST_KEY',
        value: 'test-value',
        source: 'manual'
      });

      await vaultAgent.deleteSecret('test-project', 'TEST_KEY');

      const project = await vaultAgent.getProject('test-project');
      expect(project?.secrets).toHaveLength(0);
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });

    it('should throw error when adding duplicate secret', async () => {
      await vaultAgent.addSecret('test-project', {
        key: 'TEST_KEY',
        value: 'test-value',
        source: 'manual'
      });

      await expect(vaultAgent.addSecret('test-project', {
        key: 'TEST_KEY',
        value: 'duplicate-value',
        source: 'manual'
      })).rejects.toThrow('already exists');
    });
  });

  describe('Global Tag Management', () => {
    beforeEach(async () => {
      await vaultAgent.loadVault();
    });

    it('should add and get global tags', () => {
      vaultAgent.addGlobalTag('prod');
      vaultAgent.addGlobalTag('shared');
      expect(vaultAgent.getGlobalTags()).toEqual(['prod', 'shared']);
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });

    it('should not add duplicate global tags', () => {
      vaultAgent.addGlobalTag('prod');
      vaultAgent.addGlobalTag('prod');
      expect(vaultAgent.getGlobalTags()).toEqual(['prod']);
    });

    it('should remove an existing global tag', () => {
      vaultAgent.addGlobalTag('prod');
      vaultAgent.addGlobalTag('internal');
      vaultAgent.removeGlobalTag('prod');
      expect(vaultAgent.getGlobalTags()).toEqual(['internal']);
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });

    it('should handle removing a non-existent global tag gracefully', () => {
      vaultAgent.addGlobalTag('prod');
      vaultAgent.removeGlobalTag('nonexistent');
      expect(vaultAgent.getGlobalTags()).toEqual(['prod']);
    });
  });
});

// To make these tests work, VaultAgent needs helper methods to expose internal state for testing:
// class VaultAgent {
//   // ... existing code ...
//   public getVaultDataForTesting(): VaultData | null { return this.vaultData; }
//   public isDirtyForTesting(): boolean { return this.isDirty; }
// } 