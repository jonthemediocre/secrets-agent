import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Redactor } from '../security/Redactor';
import { VaultAgent } from '../security/VaultAgent';

// Mock VaultAgent
vi.mock('../security/VaultAgent', () => {
  return {
    VaultAgent: vi.fn().mockImplementation(() => ({
      initialize: vi.fn(),
      getAllPatterns: vi.fn().mockReturnValue([
        /GITHUB_TOKEN=([^'\s]+)/g,
        /AWS_KEY=([^'\s]+)/g
      ]),
      on: vi.fn(),
      emit: vi.fn()
    }))
  };
});

describe('Redactor with VaultAgent', () => {
  let redactor: Redactor;
  let vaultAgent: VaultAgent;

  beforeEach(() => {
    redactor = new Redactor({
      rules: Redactor.getDefaultRules(),
      vaultEnabled: false
    });

    vaultAgent = new VaultAgent();
  });

  describe('Vault Mode', () => {
    it('should enable vault mode and sync rules', () => {
      redactor.enableVaultMode(vaultAgent);
      
      const rules = redactor.getRedactionRules();
      const vaultRules = rules.filter(r => r.name.startsWith('vault:'));
      
      expect(vaultRules.length).toBe(2); // Two patterns from mock
    });

    it('should mask content using vault patterns', () => {
      redactor.enableVaultMode(vaultAgent);
      
      const content = 'GITHUB_TOKEN=abc123\nAWS_KEY=xyz789';
      const masked = redactor.mask(content);
      
      expect(masked).toMatch(/GITHUB_TOKEN=••••••/);
      expect(masked).toMatch(/AWS_KEY=••••••/);
    });

    it('should combine vault and default rules', () => {
      redactor.enableVaultMode(vaultAgent);
      
      const content = `
        GITHUB_TOKEN=abc123
        password="secret123"
        AWS_KEY=xyz789
      `.trim();
      
      const masked = redactor.mask(content);
      
      expect(masked).toMatch(/GITHUB_TOKEN=••••••/);
      expect(masked).toMatch(/password="••••••"/);
      expect(masked).toMatch(/AWS_KEY=••••••/);
    });
  });

  describe('Rule Management', () => {
    it('should preserve custom rules when syncing vault rules', () => {
      // Add custom rule
      redactor.addRule({
        name: 'custom',
        pattern: /CUSTOM_SECRET=([^'\s]+)/g,
        replacement: 'CUSTOM_SECRET=****'
      });

      redactor.enableVaultMode(vaultAgent);
      
      const content = `
        GITHUB_TOKEN=abc123
        CUSTOM_SECRET=xyz789
      `.trim();
      
      const masked = redactor.mask(content);
      
      expect(masked).toMatch(/GITHUB_TOKEN=••••••/);
      expect(masked).toMatch(/CUSTOM_SECRET=\*\*\*\*/);
    });

    it('should update rules when vault refreshes', () => {
      redactor.enableVaultMode(vaultAgent);
      
      // Simulate vault refresh with new patterns
      const mockEmit = vi.mocked(vaultAgent.emit);
      const mockGetPatterns = vi.mocked(vaultAgent.getAllPatterns);
      
      mockGetPatterns.mockReturnValueOnce([
        /NEW_SECRET=([^'\s]+)/g
      ]);
      
      // Trigger refresh
      mockEmit.mock.calls[0][1](); // Call the refresh callback
      
      const rules = redactor.getRedactionRules();
      const vaultRules = rules.filter(r => r.name.startsWith('vault:'));
      
      expect(vaultRules.length).toBe(1); // One new pattern
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty vault patterns', () => {
      vi.mocked(vaultAgent.getAllPatterns).mockReturnValueOnce([]);
      
      redactor.enableVaultMode(vaultAgent);
      
      const content = 'SOME_TOKEN=abc123';
      const masked = redactor.mask(content);
      
      // Should still mask with default rules
      expect(masked).toMatch(/SOME_TOKEN=[a-f0-9]{8}/);
    });

    it('should handle vault mode disable/re-enable', () => {
      redactor.enableVaultMode(vaultAgent);
      
      // Simulate disabling vault mode
      Object.defineProperty(redactor, 'vaultEnabled', { value: false });
      
      const content = 'GITHUB_TOKEN=abc123';
      let masked = redactor.mask(content);
      
      // Should not use vault patterns
      expect(masked).toBe(content);
      
      // Re-enable vault mode
      redactor.enableVaultMode(vaultAgent);
      masked = redactor.mask(content);
      
      // Should use vault patterns again
      expect(masked).toMatch(/GITHUB_TOKEN=••••••/);
    });
  });
}); 