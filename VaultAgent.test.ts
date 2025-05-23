import { VaultAgent } from './vault/VaultAgent';
import fs from 'fs/promises';
import yaml from 'js-yaml';

// Mock the fs/promises module
jest.mock('fs/promises');

const mockVaultPath = './test-vault.yaml';

describe('VaultAgent', () => {
  let vaultAgent: VaultAgent;
  const initialVaultData = {
    version: 1,
    projects: {},
    globalTags: [],
  };

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Default mock for readFile (file not found)
    (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });
    // Default mock for writeFile (successful)
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

    vaultAgent = new VaultAgent(mockVaultPath);
    // Load vault will initialize an empty one if readFile mock remains as ENOENT
    await vaultAgent.loadVault(); 
  });

  describe('Initialization and Loading', () => {
    it('should initialize an empty vault if file does not exist', async () => {
      // beforeEach already calls loadVault which initializes if file not found
      const data = vaultAgent.getVaultDataForTesting(); // Helper method needed
      expect(data).toEqual(initialVaultData);
      expect(fs.readFile).toHaveBeenCalledWith(mockVaultPath, 'utf-8');
    });

    it('should load vault data from an existing valid YAML file', async () => {
      const existingData = {
        version: 1,
        projects: { testProject: {} },
        globalTags: ['test'],
      };
      (fs.readFile as jest.Mock).mockResolvedValue(yaml.dump(existingData));
      
      await vaultAgent.loadVault(); // Re-load with new mock
      const data = vaultAgent.getVaultDataForTesting();
      expect(data).toEqual(existingData);
      expect(fs.readFile).toHaveBeenCalledWith(mockVaultPath, 'utf-8');
    });

    it('should initialize an empty vault if file content is invalid YAML', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue('invalid yaml content: - ');
      await vaultAgent.loadVault();
      const data = vaultAgent.getVaultDataForTesting();
      expect(data).toEqual(initialVaultData);
    });

    it('should initialize an empty vault if loaded data has no version number', async () => {
      const invalidData = { projects: {} }; // Missing version
      (fs.readFile as jest.Mock).mockResolvedValue(yaml.dump(invalidData));
      await vaultAgent.loadVault();
      const data = vaultAgent.getVaultDataForTesting();
      expect(data).toEqual(initialVaultData);
    });
  });

  describe('Saving Vault', () => {
    it('should not save if not dirty', async () => {
      await vaultAgent.saveVault();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should save vault data to YAML file when dirty', async () => {
      // Make it dirty by adding a project (or any other operation)
      await vaultAgent.addProject('testProject'); // This sets isDirty = true
      await vaultAgent.saveVault();
      
      const expectedDataToSave = {
        ...initialVaultData,
        projects: { testProject: {} }
      };
      expect(fs.writeFile).toHaveBeenCalledWith(mockVaultPath, yaml.dump(expectedDataToSave), 'utf-8');
    });
  });

  describe('Project Management', () => {
    it('should add a new project', async () => {
      await vaultAgent.addProject('proj1');
      const data = vaultAgent.getVaultDataForTesting();
      expect(data).not.toBeNull();
      expect(data!.projects.proj1).toEqual({});
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });

    it('should not add a project if it already exists', async () => {
      await vaultAgent.addProject('proj1');
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      await vaultAgent.addProject('proj1'); // Try adding again
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Secret Management', () => {
    const projectName = 'secrets-app';
    const category = 'openai';
    const identifier = 'default';
    
    // Create a complete SecretEntry object for testing
    const createTestSecret = () => {
      const now = new Date().toISOString().split('T')[0];
      return {
        key: 'sk-abc123',
        source: 'env' as const,
        notes: 'Test note',
        created: now,
        lastUpdated: now,
      };
    };

    beforeEach(async () => {
      await vaultAgent.addProject(projectName); // Ensure project exists
    });

    it('should add a new secret and set created/lastUpdated dates', async () => {
      const secretPayload = createTestSecret();
      await vaultAgent.addSecret(projectName, category, identifier, secretPayload);
      const secret = vaultAgent.getSecret(projectName, category, identifier);
      const today = new Date().toISOString().split('T')[0];

      expect(secret).toBeDefined();
      expect(secret?.key).toBe(secretPayload.key);
      expect(secret?.source).toBe(secretPayload.source);
      expect(secret?.created).toBe(today);
      expect(secret?.lastUpdated).toBe(today);
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });

    it('should get an existing secret', async () => {
      const secretPayload = createTestSecret();
      await vaultAgent.addSecret(projectName, category, identifier, secretPayload);
      const secret = vaultAgent.getSecret(projectName, category, identifier);
      expect(secret).toBeDefined();
      expect(secret?.key).toBe(secretPayload.key);
    });

    it('should return undefined for a non-existent secret', () => {
      const secret = vaultAgent.getSecret(projectName, category, 'nonexistent');
      expect(secret).toBeUndefined();
    });

    it('should update secret metadata and lastUpdated date', async () => {
      const secretPayload = createTestSecret();
      await vaultAgent.addSecret(projectName, category, identifier, secretPayload);
      const originalSecret = vaultAgent.getSecret(projectName, category, identifier);
      
      // Simulate time passing for lastUpdated check
      jest.useFakeTimers().setSystemTime(new Date('2050-01-02'));
      const newNote = 'Updated note';
      await vaultAgent.updateSecret(projectName, category, identifier, { notes: newNote });
      const updatedSecret = vaultAgent.getSecret(projectName, category, identifier);
      const futureDate = new Date('2050-01-02').toISOString().split('T')[0];

      expect(updatedSecret?.notes).toBe(newNote);
      expect(updatedSecret?.key).toBe(originalSecret?.key); // Key should not change
      expect(updatedSecret?.created).toBe(originalSecret?.created); // Created should not change
      expect(updatedSecret?.lastUpdated).toBe(futureDate);
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
      jest.useRealTimers();
    });

    it('should update secret value (key) and lastUpdated date', async () => {
      const secretPayload = createTestSecret();
      await vaultAgent.addSecret(projectName, category, identifier, secretPayload);
      const originalSecret = vaultAgent.getSecret(projectName, category, identifier);
      
      jest.useFakeTimers().setSystemTime(new Date('2050-01-03'));
      const newKeyValue = 'sk-newkey456';
      await vaultAgent.updateSecretValue(projectName, category, identifier, newKeyValue);
      const updatedSecret = vaultAgent.getSecret(projectName, category, identifier);
      const futureDate = new Date('2050-01-03').toISOString().split('T')[0];
      
      expect(updatedSecret?.key).toBe(newKeyValue);
      expect(updatedSecret?.created).toBe(originalSecret?.created);
      expect(updatedSecret?.lastUpdated).toBe(futureDate);
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
      jest.useRealTimers();
    });

    it('should delete an existing secret', async () => {
      const secretPayload = createTestSecret();
      await vaultAgent.addSecret(projectName, category, identifier, secretPayload);
      await vaultAgent.deleteSecret(projectName, category, identifier);
      const secret = vaultAgent.getSecret(projectName, category, identifier);
      expect(secret).toBeUndefined();
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });
  });

  describe('Global Tag Management', () => {
    it('should add and get global tags', async () => {
      await vaultAgent.addGlobalTag('prod');
      await vaultAgent.addGlobalTag('shared');
      expect(vaultAgent.getGlobalTags()).toEqual(['prod', 'shared']);
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });

    it('should not add duplicate global tags', async () => {
      await vaultAgent.addGlobalTag('prod');
      await vaultAgent.addGlobalTag('prod');
      expect(vaultAgent.getGlobalTags()).toEqual(['prod']);
    });

    it('should remove an existing global tag', async () => {
      await vaultAgent.addGlobalTag('prod');
      await vaultAgent.addGlobalTag('internal');
      await vaultAgent.removeGlobalTag('prod');
      expect(vaultAgent.getGlobalTags()).toEqual(['internal']);
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });

    it('should handle removing a non-existent global tag gracefully', async () => {
      await vaultAgent.addGlobalTag('prod');
      await vaultAgent.removeGlobalTag('nonexistent');
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