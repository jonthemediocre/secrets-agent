import { describe, it, expect, beforeEach } from 'vitest';
import { Redactor, RedactionRule } from '../security/Redactor';

describe('Redactor', () => {
  let redactor: Redactor;

  beforeEach(() => {
    redactor = new Redactor({
      rules: Redactor.getDefaultRules(),
      maskChar: '•'
    });
  });

  describe('API Key Redaction', () => {
    it('should redact API keys in various formats', () => {
      const testCases = [
        {
          input: 'api_key="abc123def456"',
          expected: 'api_key="••••••"'
        },
        {
          input: 'apiKey: xyz789',
          expected: 'apiKey: ••••••'
        },
        {
          input: 'token=secret_token_123',
          expected: 'token=••••••'
        }
      ];

      for (const { input, expected } of testCases) {
        expect(redactor.mask(input)).toBe(expected);
      }
    });
  });

  describe('Password Redaction', () => {
    it('should redact passwords in various formats', () => {
      const testCases = [
        {
          input: 'password="mySecret123"',
          expected: 'password="••••••"'
        },
        {
          input: 'password: complexPass123!',
          expected: 'password: ••••••'
        }
      ];

      for (const { input, expected } of testCases) {
        expect(redactor.mask(input)).toBe(expected);
      }
    });
  });

  describe('Private Key Redaction', () => {
    it('should redact private keys', () => {
      const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890
abcdefghijklmnopqrstuvwxyz
-----END RSA PRIVATE KEY-----`;
      
      const expected = '-----REDACTED PRIVATE KEY-----';
      expect(redactor.mask(privateKey)).toBe(expected);
    });
  });

  describe('Environment Variable Redaction', () => {
    it('should hash environment variables', () => {
      const input = 'DATABASE_URL=postgresql://user:pass@localhost:5432/db';
      const masked = redactor.mask(input);
      
      // Should preserve the variable name but hash the value
      expect(masked).toMatch(/^DATABASE_URL=[a-f0-9]{8}$/);
    });
  });

  describe('Custom Rules', () => {
    it('should allow adding custom redaction rules', () => {
      const customRule: RedactionRule = {
        name: 'credit_card',
        pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
        replacement: '****-****-****-****'
      };

      redactor.addRule(customRule);
      
      const input = 'Card: 1234-5678-9012-3456';
      const expected = 'Card: ****-****-****-****';
      expect(redactor.mask(input)).toBe(expected);
    });
  });

  describe('Multiple Patterns', () => {
    it('should handle multiple sensitive patterns in the same string', () => {
      const input = `
        api_key="secret123"
        password="pass456"
        DATABASE_URL=postgres://user:pass@localhost
      `.trim();

      const masked = redactor.mask(input);
      
      expect(masked).toMatch(/api_key="••••••"/);
      expect(masked).toMatch(/password="••••••"/);
      expect(masked).toMatch(/DATABASE_URL=[a-f0-9]{8}/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      expect(redactor.mask('')).toBe('');
    });

    it('should handle strings with no sensitive data', () => {
      const input = 'This is a regular log message';
      expect(redactor.mask(input)).toBe(input);
    });

    it('should handle malformed sensitive data patterns', () => {
      const input = 'api_key=';
      expect(redactor.mask(input)).toBe(input);
    });
  });
}); 