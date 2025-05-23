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
  parseEnvFile: jest.fn(), // Mocked for import tests
  serializeEnvFile: jest.fn(), // Mocked for export tests to check inputs/outputs
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
    mockSerializeEnvFile.mockReset(); // Reset if VaultAgent uses it for export

    vaultAgent = new VaultAgent(testVaultPath);
  });

  describe('loadVault', () => {
    it('should load and parse vault data correctly', async () => {
      const mockData: VaultData = { version: 1, projects: { default: { env: { TEST_KEY: { key: 'test_value', source: 'sops', created: '2023-01-01T00:00:00Z', lastUpdated: '2023-01-01T00:00:00Z' } } } }, globalTags: [] };
      mockParseEnvFile.mockResolvedValue(mockData);
      await vaultAgent.loadVault();
      expect(mockParseEnvFile).toHaveBeenCalledWith(testVaultPath);
      expect(vaultAgent.getVaultDataForTesting()).toEqual(mockData);
      expect(vaultAgent.isDirtyForTesting()).toBe(false);
    });

    it('should initialize a new vault if the SOPS file is not found (decrypt throws specific error)', async () => {
      mockParseEnvFile.mockRejectedValue(new Error('sops_read_error: failed to read file'));
      await vaultAgent.loadVault();
      expect(mockParseEnvFile).toHaveBeenCalledWith(testVaultPath);
      expect(vaultAgent.getVaultDataForTesting()).toEqual({ version: 1, projects: {}, globalTags: [] });
      expect(vaultAgent.isDirtyForTesting()).toBe(true); // Should be dirty to save the new vault
    });
    
    it('should initialize a new vault if the SOPS file is not found (error message contains "no such file")', async () => {
        mockParseEnvFile.mockRejectedValue(new Error('Error: no such file or directory'));
        await vaultAgent.loadVault();
        expect(vaultAgent.getVaultDataForTesting()).toEqual({ version: 1, projects: {}, globalTags: [] });
        expect(vaultAgent.isDirtyForTesting()).toBe(true);
      });

    it('should initialize a new vault if decrypted data is an empty object', async () => {
      mockParseEnvFile.mockResolvedValue({}); // SOPS might return empty object for an empty encrypted file
      await vaultAgent.loadVault();
      expect(vaultAgent.getVaultDataForTesting()).toEqual({ version: 1, projects: {}, globalTags: [] });
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });
    
    it('should initialize a new vault if decrypted data is null', async () => {
        mockParseEnvFile.mockResolvedValue(null);
        await vaultAgent.loadVault();
        expect(vaultAgent.getVaultDataForTesting()).toEqual({ version: 1, projects: {}, globalTags: [] });
        expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });

    it('should initialize a new vault for other decryption errors and mark as dirty', async () => {
      mockParseEnvFile.mockRejectedValue(new Error('Some other decryption error'));
      await vaultAgent.loadVault();
      expect(vaultAgent.getVaultDataForTesting()).toEqual({ version: 1, projects: {}, globalTags: [] });
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });
  });

  describe('saveVault', () => {
    beforeEach(async () => {
      // Ensure vaultData is initialized for save tests
      mockParseEnvFile.mockResolvedValue({ version: 1, projects: {}, globalTags: [] });
      await vaultAgent.loadVault();
      mockParseEnvFile.mockClear(); // Clear mock calls from loadVault
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

    it('should initialize and save an empty vault if vaultData is null when save is called (defensive)', async () => {
      (vaultAgent as unknown as { vaultData: null }).vaultData = null; // Force vaultData to be null
      (vaultAgent as unknown as { isDirty: boolean }).isDirty = true; // Force dirty
      await vaultAgent.saveVault();
      expect(mockSerializeEnvFile).toHaveBeenCalledWith({ version: 1, projects: {}, globalTags: [] });
      expect(vaultAgent.isDirtyForTesting()).toBe(false);
    });

    it('should re-throw error if serializeEnvFile fails', async () => {
        vaultAgent.addGlobalTag('dirty_tag'); // Make it dirty
        mockSerializeEnvFile.mockRejectedValue(new Error('Failed to write file'));
        await expect(vaultAgent.saveVault()).rejects.toThrow('Failed to save vault: Failed to write file');
        expect(vaultAgent.isDirtyForTesting()).toBe(true); // Should remain dirty
      });
  });

  describe('importEnvToVault', () => {
    beforeEach(async () => {
      mockParseEnvFile.mockResolvedValue({ version: 1, projects: {}, globalTags: [] });
      await vaultAgent.loadVault();
    });

    it('should import new secrets correctly', () => {
      const envContent = "KEY1=value1\\nKEY2=value2";
      mockParseEnvFile.mockReturnValue({ KEY1: 'value1', KEY2: 'value2' });

      const result = vaultAgent.importEnvToVault(envContent);
      expect(result.imported).toEqual(['KEY1', 'KEY2']);
      expect(result.skipped).toEqual([]);
      expect(result.errors).toEqual([]);
      const vaultContents = vaultAgent.getVaultDataForTesting();
      expect(vaultContents?.projects.default.env.KEY1.key).toBe('value1');
      expect(vaultContents?.projects.default.env.KEY2.key).toBe('value2');
      expect(vaultAgent.isDirtyForTesting()).toBe(true);
    });

    it('should skip existing secrets if overwrite is false', () => {
      // Pre-populate a secret
      vaultAgent.addSecret('default', 'env', 'KEY1', { key: 'original_value', source: 'manual', created: 'c', lastUpdated: 'lu' });
      mockParseEnvFile.mockReturnValue({ KEY1: 'new_value', KEY2: 'value2' });
      
      const result = vaultAgent.importEnvToVault("KEY1=new_value\\nKEY2=value2", { overwrite: false });
      expect(result.imported).toEqual(['KEY2']);
      expect(result.skipped).toEqual(['KEY1']);
      const vaultContents = vaultAgent.getVaultDataForTesting();
      expect(vaultContents?.projects.default.env.KEY1.key).toBe('original_value'); // Should not change
      expect(vaultContents?.projects.default.env.KEY2.key).toBe('value2');
    });

    it('should overwrite existing secrets if overwrite is true', () => {
      vaultAgent.addSecret('default', 'env', 'KEY1', { key: 'original_value', source: 'manual', created: 'c', lastUpdated: 'lu' });
      mockParseEnvFile.mockReturnValue({ KEY1: 'new_value' });
      const result = vaultAgent.importEnvToVault("KEY1=new_value", { overwrite: true });

      expect(result.imported).toEqual(['KEY1']);
      const vaultContents = vaultAgent.getVaultDataForTesting();
      expect(vaultContents?.projects.default.env.KEY1.key).toBe('new_value');
      expect(vaultContents?.projects.default.env.KEY1.lastUpdated).not.toBe('lu'); // lastUpdated should change
      expect(vaultContents?.projects.default.env.KEY1.created).toBe('c'); // created should be preserved
    });

    it('should use custom project and category', () => {
      mockParseEnvFile.mockReturnValue({ CUSTOM_KEY: 'custom_value' });
      vaultAgent.importEnvToVault("CUSTOM_KEY=custom_value", { project: 'my_proj', category: 'my_cat' });
      
      const vaultContents = vaultAgent.getVaultDataForTesting();
      expect(vaultContents?.projects.my_proj.my_cat.CUSTOM_KEY.key).toBe('custom_value');
    });

    it('should handle empty .env content', () => {
        mockParseEnvFile.mockReturnValue({});
        const result = vaultAgent.importEnvToVault("");
        expect(result.imported).toEqual([]);
        expect(result.skipped).toEqual([]);
        expect(result.errors).toEqual([]);
      });
  });

  describe('exportEnvFromVault', () => {
    beforeEach(async () => {
      const initialVault: VaultData = {
        version: 1,
        projects: {
          default: {
            env: {
              KEY1: { key: 'value1', source: 'env', created: 'c1', lastUpdated: 'lu1' },
              KEY2: { key: 'value with spaces', source: 'env', created: 'c2', lastUpdated: 'lu2' },
              KEY3: { key: 'value#with#hash', source: 'env', created: 'c3', lastUpdated: 'lu3' },
              KEY4: { key: 'value="with_quotes"', source: 'env', created: 'c4', lastUpdated: 'lu4' },
            },
            another_cat: {
              OTHER_KEY: { key: 'other_value', source: 'manual', created: 'c', lastUpdated: 'lu' }
            }
          },
          another_proj: {
            env: {
              PROJ_KEY: { key: 'proj_value', source: 'env', created: 'c', lastUpdated: 'lu' }
            }
          }
        },
        globalTags: []
      };
      mockParseEnvFile.mockResolvedValue(initialVault);
      await vaultAgent.loadVault();
      // Crucially, reset serializeEnvFile mock *after* loadVault in beforeEach, 
      // as loadVault might not interact with it, but we want a clean slate for each export test.
      mockSerializeEnvFile.mockReset(); 
    });

    it('should call serializeEnvFile with correct secrets and return its result', () => {
      const expectedSecretsObject = {
        KEY1: 'value1',
        KEY2: 'value with spaces',
        KEY3: 'value#with#hash',
        KEY4: 'value="with_quotes"',
      };
      const mockOutputEnvString = "KEY1=value1\nKEY2=\"value with spaces\"\nKEY3=value#with#hash\nKEY4=\"value=\\\"with_quotes\\\"\"";
      mockSerializeEnvFile.mockReturnValue(mockOutputEnvString);

      const envString = vaultAgent.exportEnvFromVault(); // Uses default project/category
      
      expect(mockSerializeEnvFile).toHaveBeenCalledTimes(1);
      expect(mockSerializeEnvFile).toHaveBeenCalledWith(expectedSecretsObject);
      expect(envString).toBe(mockOutputEnvString);
    });

    it('should correctly handle non-existent project', () => {
      mockSerializeEnvFile.mockReturnValue(''); // Mock behavior for call with {}
      
      const envStringProject = vaultAgent.exportEnvFromVault({ project: 'non_existent_proj', category: 'env' });
      
      expect(mockSerializeEnvFile).toHaveBeenCalledTimes(1);
      expect(mockSerializeEnvFile).toHaveBeenLastCalledWith({}); 
      expect(envStringProject).toBe('');
    });

    it('should correctly handle non-existent category', () => {
      mockSerializeEnvFile.mockReturnValue(''); // Mock behavior for call with {}

      const envStringCat = vaultAgent.exportEnvFromVault({ project: 'default', category: 'non_existent_cat' });
      
      expect(mockSerializeEnvFile).toHaveBeenCalledTimes(1);
      expect(mockSerializeEnvFile).toHaveBeenLastCalledWith({}); 
      expect(envStringCat).toBe('');
    });

    it('should export from custom project and category, calling serializeEnvFile correctly', () => {
      const expectedSecretsObject = { PROJ_KEY: 'proj_value' };
      const mockOutputEnvString = "PROJ_KEY=proj_value";
      mockSerializeEnvFile.mockReturnValue(mockOutputEnvString);

      const envString = vaultAgent.exportEnvFromVault({ project: 'another_proj', category: 'env' });
      expect(mockSerializeEnvFile).toHaveBeenCalledTimes(1);
      expect(mockSerializeEnvFile).toHaveBeenCalledWith(expectedSecretsObject);
      expect(envString).toBe(mockOutputEnvString);
    });
    
    it('should return empty string if category is empty, calling serializeEnvFile with empty object', async () => {
        // Temporarily modify vault data for this specific test case
        const emptyCategoryVault: VaultData = {
          version: 1,
          projects: {
            default: { 
              env: {},
              empty_env: {} // Add the actual empty_env category here
            }
          },
          globalTags: []
        };
        // Create a new VaultAgent instance or re-initialize to ensure clean state for this specific vault data
        const tempVaultAgent = new VaultAgent(testVaultPath);
        mockParseEnvFile.mockResolvedValueOnce(emptyCategoryVault);
        await tempVaultAgent.loadVault();
        
        mockSerializeEnvFile.mockReturnValue('');
        const envString = tempVaultAgent.exportEnvFromVault({ project: 'default', category: 'empty_env'});
        
        expect(mockSerializeEnvFile).toHaveBeenCalledTimes(1);
        expect(mockSerializeEnvFile).toHaveBeenCalledWith({});
        expect(envString).toBe('');
    });
  });
}); 