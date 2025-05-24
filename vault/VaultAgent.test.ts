// vault/VaultAgent.test.ts
import { VaultAgent } from './VaultAgent';
import { VaultData } from './VaultTypes';
import { parseEnvFile, serializeEnvFile } from '../src/utils/EnvFileParser';

// Mock child_process.exec
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

// Mock fs
jest.mock('fs');

// Mock SOPSIntegration
jest.mock('./SOPSIntegration');

// Mock EnvFileParser
jest.mock('../src/utils/EnvFileParser', () => ({
  parseEnvFile: jest.fn(),
  serializeEnvFile: jest.fn(),
}));

// Get typed mocks for EnvFileParser functions
const mockParseEnvFile = parseEnvFile as jest.Mock;
const mockSerializeEnvFile = serializeEnvFile as jest.Mock;

describe('VaultAgent', () => {
  let vaultAgent: VaultAgent;
  const testVaultPath = 'test-vault.sops.yaml';

  beforeEach(() => {
    // Reset mocks before each test
    mockParseEnvFile.mockReset();
    mockSerializeEnvFile.mockReset();

    vaultAgent = new VaultAgent(testVaultPath);
  });

  describe('loadVault', () => {
    it('should load and parse vault data correctly', async () => {
      const mockData: VaultData = {
        version: 1,
        projects: [
          {
            name: 'default',
            description: 'Default project',
            secrets: [
              { 
                key: 'TEST_KEY', 
                value: 'test_value', 
                source: 'sops', 
                created: '2023-01-01T00:00:00Z', 
                lastUpdated: '2023-01-01T00:00:00Z'
              }
            ],
            created: 1672531200000, // 2023-01-01T00:00:00Z as timestamp
            lastUpdated: 1672531200000
          }
        ],
        globalTags: [],
        metadata: {
          created: 1672531200000,
          lastUpdated: 1672531200000
        }
      };
      
      mockParseEnvFile.mockResolvedValue(mockData);
      await vaultAgent.loadVault();
      
      expect(mockParseEnvFile).toHaveBeenCalledWith(testVaultPath);
      expect(vaultAgent.getVaultDataForTesting()).toEqual(mockData);
      expect(vaultAgent.isDirtyForTesting()).toBe(false);
    });

    it('should initialize a new vault if the SOPS file is not found', async () => {
      mockParseEnvFile.mockRejectedValue(new Error('sops_read_error: failed to read file'));
      await vaultAgent.loadVault();
      
      expect(mockParseEnvFile).toHaveBeenCalledWith(testVaultPath);
      
      const vaultData = vaultAgent.getVaultDataForTesting();
      expect(vaultData).toEqual({
        version: 1,
        projects: [],
        globalTags: [],
        metadata: expect.objectContaining({
          created: expect.any(Number),
          lastUpdated: expect.any(Number)
        })
      });
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });
    
    it('should initialize a new vault if decrypted data is empty', async () => {
      mockParseEnvFile.mockResolvedValue({});
      await vaultAgent.loadVault();
      
      const vaultData = vaultAgent.getVaultDataForTesting();
      expect(vaultData).toEqual({
        version: 1,
        projects: [],
        globalTags: [],
        metadata: expect.objectContaining({
          created: expect.any(Number),
          lastUpdated: expect.any(Number)
        })
      });
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });
  });

  describe('saveVault', () => {
    beforeEach(async () => {
      // Initialize with empty vault
      const emptyVault: VaultData = {
        version: 1,
        projects: [],
        globalTags: [],
        metadata: {
          created: Date.now(),
          lastUpdated: Date.now()
        }
      };
      mockParseEnvFile.mockResolvedValue(emptyVault);
      await vaultAgent.loadVault();
      mockParseEnvFile.mockClear();
    });

    it('should save vault data if dirty', async () => {
      vaultAgent.addGlobalTag('new_tag'); // Make it dirty
      await vaultAgent.saveVault();
      
      expect(mockSerializeEnvFile).toHaveBeenCalledWith(vaultAgent.getVaultDataForTesting());
      expect(vaultAgent.isDirtyForTesting()).toBe(false);
    });

    it('should not save vault data if not dirty', async () => {
      await vaultAgent.saveVault(); // Not dirty initially after load
      expect(mockSerializeEnvFile).not.toHaveBeenCalled();
      });
  });

  describe('importEnvToVault', () => {
    beforeEach(async () => {
      const emptyVault: VaultData = {
        version: 1,
        projects: [],
        globalTags: [],
        metadata: {
          created: Date.now(),
          lastUpdated: Date.now()
        }
      };
      mockParseEnvFile.mockResolvedValue(emptyVault);
      await vaultAgent.loadVault();
    });

    it('should import new secrets correctly', () => {
      const envContent = "KEY1=value1\nKEY2=value2";
      mockParseEnvFile.mockReturnValue({ KEY1: 'value1', KEY2: 'value2' });

      vaultAgent.importEnvToVault(envContent);
      
      const vaultContents = vaultAgent.getVaultDataForTesting();
      const defaultProject = vaultContents?.projects.find(p => p.name === 'default');
      
      expect(defaultProject).toBeDefined();
      expect(defaultProject?.secrets).toHaveLength(2);
      expect(defaultProject?.secrets.find(s => s.key === 'KEY1')?.value).toBe('value1');
      expect(defaultProject?.secrets.find(s => s.key === 'KEY2')?.value).toBe('value2');
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });

    it('should create project if it does not exist', () => {
      mockParseEnvFile.mockReturnValue({ CUSTOM_KEY: 'custom_value' });
      
      vaultAgent.importEnvToVault("CUSTOM_KEY=custom_value", { project: 'my_proj', category: 'my_cat' });
      
      const vaultContents = vaultAgent.getVaultDataForTesting();
      const customProject = vaultContents?.projects.find(p => p.name === 'my_proj');
      
      expect(customProject).toBeDefined();
      expect(customProject?.secrets.find(s => s.key === 'CUSTOM_KEY')?.value).toBe('custom_value');
      expect(customProject?.secrets.find(s => s.key === 'CUSTOM_KEY')?.category).toBe('my_cat');
      });
  });

  describe('exportEnvFromVault', () => {
    beforeEach(async () => {
      const initialVault: VaultData = {
        version: 1,
        projects: [
          {
            name: 'default',
            secrets: [
              { key: 'KEY1', value: 'value1', source: 'env', created: '2023-01-01T00:00:00Z', lastUpdated: '2023-01-01T00:00:00Z' },
              { key: 'KEY2', value: 'value with spaces', source: 'env', created: '2023-01-01T00:00:00Z', lastUpdated: '2023-01-01T00:00:00Z' }
            ],
            created: Date.now(),
            lastUpdated: Date.now()
          }
        ],
        globalTags: [],
        metadata: {
          created: Date.now(),
          lastUpdated: Date.now()
        }
      };
      
      mockParseEnvFile.mockResolvedValue(initialVault);
      await vaultAgent.loadVault();
      mockSerializeEnvFile.mockReset(); 
    });

    it('should export secrets correctly', () => {
      const expectedSecretsObject = {
        KEY1: 'value1',
        KEY2: 'value with spaces'
      };
      const mockOutputEnvString = "KEY1=value1\nKEY2=\"value with spaces\"";
      mockSerializeEnvFile.mockReturnValue(mockOutputEnvString);

      const envString = vaultAgent.exportEnvFromVault();
      
      expect(mockSerializeEnvFile).toHaveBeenCalledTimes(1);
      expect(mockSerializeEnvFile).toHaveBeenCalledWith(expectedSecretsObject);
      expect(envString).toBe(mockOutputEnvString);
    });

    it('should handle non-existent project', () => {
      mockSerializeEnvFile.mockReturnValue('');
      
      const envString = vaultAgent.exportEnvFromVault({ project: 'non_existent_proj' });
      
      expect(mockSerializeEnvFile).toHaveBeenCalledWith({});
      expect(envString).toBe('');
    });
  });

  describe('createProject', () => {
    beforeEach(async () => {
      const emptyVault: VaultData = {
        version: 1,
        projects: [],
        globalTags: [],
        metadata: {
          created: Date.now(),
          lastUpdated: Date.now()
        }
      };
      mockParseEnvFile.mockResolvedValue(emptyVault);
      await vaultAgent.loadVault();
    });

    it('should create a new project', async () => {
      const project = await vaultAgent.createProject('test-project', 'Test description');
      
      expect(project.name).toBe('test-project');
      expect(project.description).toBe('Test description');
      expect(project.secrets).toEqual([]);
      expect(project.created).toBeGreaterThan(0);
      expect(project.lastUpdated).toBeGreaterThan(0);
      
      const vaultData = vaultAgent.getVaultDataForTesting();
      expect(vaultData?.projects).toHaveLength(1);
      expect(vaultData?.projects[0]).toEqual(project);
    });
  });

  describe('addSecret', () => {
    beforeEach(async () => {
      const vaultWithProject: VaultData = {
          version: 1,
        projects: [
          {
            name: 'test-project',
            secrets: [],
            created: Date.now(),
            lastUpdated: Date.now()
          }
        ],
        globalTags: [],
        metadata: {
          created: Date.now(),
          lastUpdated: Date.now()
        }
      };
      mockParseEnvFile.mockResolvedValue(vaultWithProject);
      await vaultAgent.loadVault();
    });

    it('should add a secret to existing project', async () => {
      await vaultAgent.addSecret('test-project', {
        key: 'TEST_SECRET',
        value: 'secret_value',
        source: 'manual'
      });
      
      const vaultData = vaultAgent.getVaultDataForTesting();
      const project = vaultData?.projects.find(p => p.name === 'test-project');
        
      expect(project?.secrets).toHaveLength(1);
      expect(project?.secrets[0].key).toBe('TEST_SECRET');
      expect(project?.secrets[0].value).toBe('secret_value');
      expect(project?.secrets[0].source).toBe('manual');
      expect(project?.secrets[0].created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(project?.secrets[0].lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
}); 