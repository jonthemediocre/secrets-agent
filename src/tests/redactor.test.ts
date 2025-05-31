import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Redactor, RedactorConfig } from '../security/Redactor';
import { VaultAgent } from '../security/VaultAgent';

describe('Redactor', () => {
  let redactor: Redactor;
  let mockVaultAgent: VaultAgent;

  beforeEach(() => {
    mockVaultAgent = {
      on: vi.fn(),
      emit: vi.fn(),
      initialize: vi.fn(),
      addSecret: vi.fn(),
      removeSecret: vi.fn(),
      getSecret: vi.fn(),
      getAllSecrets: vi.fn()
    } as unknown as VaultAgent;

    redactor = new Redactor({
      vaultAgent: mockVaultAgent,
      preserveLength: true,
      maskChar: '*'
    });
  });

  describe('Default Rules', () => {
    it('should mask API keys', () => {
      const input = 'api_key="secret123"';
      const output = redactor.mask(input);
      expect(output).toMatch(/api_key="\*{9}"/);
    });

    it('should mask passwords', () => {
      const input = 'password="mypass123"';
      const output = redactor.mask(input);
      expect(output).toMatch(/password="\*{9}"/);
    });

    it('should mask tokens', () => {
      const input = 'token="abc123xyz"';
      const output = redactor.mask(input);
      expect(output).toMatch(/token="\*{9}"/);
    });

    it('should mask private keys', () => {
      const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1234567890\n-----END RSA PRIVATE KEY-----';
      const output = redactor.mask(input);
      expect(output).toMatch(/\*+/);
      expect(output.length).toBe(input.length);
    });

    it('should mask JWTs', () => {
      const input = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const output = redactor.mask(input);
      expect(output).toMatch(/\*+/);
      expect(output.length).toBe(input.length);
    });

    it('should mask email addresses', () => {
      const input = 'user@example.com';
      const output = redactor.mask(input);
      expect(output).toMatch(/\*+/);
      expect(output.length).toBe(input.length);
    });
  });

  describe('Custom Rules', () => {
    it('should add and apply custom patterns', () => {
      const redactor = new Redactor({
        customPatterns: [/custom-secret=([^;]+)/g]
      });

      const input = 'custom-secret=mysecret;';
      const output = redactor.mask(input);
      expect(output).toMatch(/custom-secret=\*+;/);
    });

    it('should allow adding rules manually', () => {
      redactor.addRule({
        name: 'test_rule',
        pattern: /test=([^;]+)/g,
        replacement: 'test=[REDACTED]'
      });

      const input = 'test=secret;';
      const output = redactor.mask(input);
      expect(output).toBe('test=[REDACTED];');
    });

    it('should allow removing rules', () => {
      redactor.addRule({
        name: 'test_rule',
        pattern: /test=([^;]+)/g,
        replacement: 'test=[REDACTED]'
      });

      redactor.removeRule('test_rule');
      const input = 'test=secret;';
      const output = redactor.mask(input);
      expect(output).toBe(input);
    });
  });

  describe('Vault Integration', () => {
    it('should set up vault sync when vault agent is provided', () => {
      expect(mockVaultAgent.on).toHaveBeenCalledWith('secret_added', expect.any(Function));
      expect(mockVaultAgent.on).toHaveBeenCalledWith('secret_removed', expect.any(Function));
    });

    it('should add rules when secrets are added to vault', () => {
      const secretAddedHandler = vi.mocked(mockVaultAgent.on).mock.calls.find(
        call => call[0] === 'secret_added'
      )?.[1];

      if (secretAddedHandler) {
        secretAddedHandler({
          key: 'test_secret',
          patterns: [/secret=([^;]+)/g]
        });

        const input = 'secret=mysecret;';
        const output = redactor.mask(input);
        expect(output).toMatch(/secret=\*+;/);
      }
    });

    it('should remove rules when secrets are removed from vault', () => {
      // First add a rule via vault
      const secretAddedHandler = vi.mocked(mockVaultAgent.on).mock.calls.find(
        call => call[0] === 'secret_added'
      )?.[1];

      if (secretAddedHandler) {
        secretAddedHandler({
          key: 'test_secret',
          patterns: [/secret=([^;]+)/g]
        });

        // Then remove it
        const secretRemovedHandler = vi.mocked(mockVaultAgent.on).mock.calls.find(
          call => call[0] === 'secret_removed'
        )?.[1];

        if (secretRemovedHandler) {
          secretRemovedHandler('test_secret');

          const input = 'secret=mysecret;';
          const output = redactor.mask(input);
          expect(output).toBe(input);
        }
      }
    });
  });

  describe('Object Masking', () => {
    it('should mask sensitive data in objects', () => {
      const input = {
        api_key: 'secret123',
        user: {
          email: 'user@example.com',
          password: 'pass123'
        },
        safe: 'not-secret'
      };

      const output = redactor.maskObject(input);
      expect(output.api_key).toMatch(/\*+/);
      expect(output.user.email).toMatch(/\*+/);
      expect(output.user.password).toMatch(/\*+/);
      expect(output.safe).toBe('not-secret');
    });
  });

  describe('Stats and Utilities', () => {
    it('should return correct stats', () => {
      const stats = redactor.getStats();
      expect(stats).toEqual({
        ruleCount: expect.any(Number),
        vaultEnabled: true,
        preserveLength: true
      });
    });

    it('should clear rules', () => {
      redactor.clearRules();
      const stats = redactor.getStats();
      expect(stats.ruleCount).toBe(0);
    });

    it('should get all rules', () => {
      const rules = redactor.getRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty('name');
      expect(rules[0]).toHaveProperty('pattern');
      expect(rules[0]).toHaveProperty('replacement');
    });
  });
}); 