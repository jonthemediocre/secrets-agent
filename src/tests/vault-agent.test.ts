import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VaultAgent, VaultSecret } from '../security/VaultAgent';
import { VaultError } from '../utils/error-types';
import * as fs from 'fs/promises';
import * as YAML from 'yaml';

vi.mock('fs/promises');
vi.mock('yaml');

describe('VaultAgent', () => {
  let vaultAgent: VaultAgent;
  const mockSecrets = {
    secrets: {
      'API_KEY': {
        key: 'API_KEY',
        type: 'api_key',
        patterns: [
          /API_KEY=([^'\s]+)/g
        ],
        metadata: {
          service: 'test-service'
        }
      },
      'DB_PASSWORD': {
        key: 'DB_PASSWORD',
        type: 'password',
        expiresAt: Date.now() + 3600000 // 1 hour from now
      }
    }
  };

  beforeEach(() => {
    vi.mocked(fs.readFile).mockResolvedValue(YAML.stringify(mockSecrets));
    vi.mocked(YAML.parse).mockReturnValue(mockSecrets);
    
    vaultAgent = new VaultAgent({
      vaultPath: '.test-vault.yaml',
      autoRefresh: false
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vaultAgent.stop();
  });

  describe('Initialization', () => {
    it('should load secrets on initialization', async () => {
      const initSpy = vi.fn();
      vaultAgent.on('initialized', initSpy);

      await vaultAgent.initialize();

      expect(initSpy).toHaveBeenCalled();
      expect(vaultAgent.getAllSecretKeys()).toContain('API_KEY');
      expect(vaultAgent.getAllSecretKeys()).toContain('DB_PASSWORD');
    });

    it('should handle missing vault file', async () => {
      vi.mocked(fs.readFile).mockRejectedValueOnce({ code: 'ENOENT' });

      await expect(vaultAgent.initialize()).rejects.toThrow(VaultError);
    });

    it('should handle invalid vault data', async () => {
      vi.mocked(YAML.parse).mockReturnValueOnce({ invalid: 'data' });

      await expect(vaultAgent.initialize()).rejects.toThrow(VaultError);
    });
  });

  describe('Pattern Management', () => {
    it('should compile default patterns for secrets', async () => {
      await vaultAgent.initialize();
      const patterns = vaultAgent.getAllPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toBeInstanceOf(RegExp);
    });

    it('should handle custom patterns', async () => {
      const customPattern = /CUSTOM_KEY=([^'\s]+)/g;
      const customSecrets = {
        secrets: {
          'CUSTOM_KEY': {
            key: 'CUSTOM_KEY',
            type: 'custom',
            patterns: [customPattern]
          }
        }
      };

      vi.mocked(YAML.parse).mockReturnValueOnce(customSecrets);
      await vaultAgent.initialize();

      const patterns = vaultAgent.getAllPatterns();
      expect(patterns).toContainEqual(customPattern);
    });

    it('should cache patterns for performance', async () => {
      await vaultAgent.initialize();
      
      // First call should compute patterns
      const patterns1 = vaultAgent.getAllPatterns();
      
      // Second call should use cache
      const patterns2 = vaultAgent.getAllPatterns();
      
      expect(patterns1).toBe(patterns2);
    });
  });

  describe('Secret Management', () => {
    beforeEach(async () => {
      await vaultAgent.initialize();
    });

    it('should track secret access times', () => {
      const metadata = vaultAgent.getSecretMetadata('API_KEY');
      expect(metadata).toEqual({ service: 'test-service' });
    });

    it('should detect expired secrets', () => {
      const expiredSecret: VaultSecret = {
        key: 'EXPIRED_KEY',
        type: 'api_key',
        expiresAt: Date.now() - 1000 // Expired 1 second ago
      };

      vi.mocked(YAML.parse).mockReturnValueOnce({
        secrets: { 'EXPIRED_KEY': expiredSecret }
      });

      expect(vaultAgent.isSecretExpired('EXPIRED_KEY')).toBe(true);
    });

    it('should handle non-existent secrets', () => {
      expect(vaultAgent.getSecretType('NON_EXISTENT')).toBeUndefined();
      expect(vaultAgent.getSecretMetadata('NON_EXISTENT')).toBeUndefined();
      expect(vaultAgent.isSecretExpired('NON_EXISTENT')).toBe(false);
    });
  });

  describe('Auto Refresh', () => {
    it('should refresh secrets when cache expires', async () => {
      vaultAgent = new VaultAgent({
        vaultPath: '.test-vault.yaml',
        maxCacheAge: 100, // Very short cache age for testing
        autoRefresh: false
      });

      await vaultAgent.initialize();
      
      // Force cache expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const refreshSpy = vi.fn();
      vaultAgent.on('secrets_refreshed', refreshSpy);
      
      vaultAgent.getAllSecretKeys(); // This should trigger a refresh
      
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should handle refresh errors gracefully', async () => {
      vaultAgent = new VaultAgent({
        vaultPath: '.test-vault.yaml',
        maxCacheAge: 100,
        autoRefresh: false
      });

      await vaultAgent.initialize();
      
      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('Refresh failed'));
      
      const errorSpy = vi.fn();
      vaultAgent.on('error', errorSpy);
      
      // Force cache expiration and trigger refresh
      await new Promise(resolve => setTimeout(resolve, 150));
      vaultAgent.getAllSecretKeys();
      
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on stop', async () => {
      const stopSpy = vi.fn();
      vaultAgent.on('stopped', stopSpy);

      await vaultAgent.initialize();
      await vaultAgent.stop();

      expect(stopSpy).toHaveBeenCalled();
      expect(vaultAgent.getAllSecretKeys()).toHaveLength(0);
    });
  });
}); 