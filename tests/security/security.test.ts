import { SecurityValidator, SecurityError, ValidationError, SecureCommandExecutor } from '../../src/utils/security';

describe('SecurityValidator', () => {
  describe('sanitizeCommandInput', () => {
    it('should allow safe input', () => {
      const input = 'safe-command_123';
      expect(SecurityValidator.sanitizeCommandInput(input)).toBe(input);
    });

    it('should reject dangerous characters', () => {
      const dangerousInputs = [
        'command; rm -rf /',
        'command | cat /etc/passwd',
        'command && malicious',
        'command `whoami`',
        'command $(id)',
        'command > /dev/null',
        'command < /etc/hosts'
      ];

      dangerousInputs.forEach(input => {
        expect(() => SecurityValidator.sanitizeCommandInput(input))
          .toThrow(SecurityError);
      });
    });

    it('should reject non-string input', () => {
      expect(() => SecurityValidator.sanitizeCommandInput(123 as any))
        .toThrow(ValidationError);
      expect(() => SecurityValidator.sanitizeCommandInput(null as any))
        .toThrow(ValidationError);
    });
  });

  describe('validateFilePath', () => {
    const allowedDirs = ['/allowed/path', '/another/allowed'];

    it('should allow paths within allowed directories', () => {
      const validPath = '/allowed/path/file.txt';
      const result = SecurityValidator.validateFilePath(validPath, allowedDirs);
      expect(result).toContain('allowed/path/file.txt');
    });

    it('should reject path traversal attempts', () => {
      const maliciousPaths = [
        '/allowed/path/../../../etc/passwd',
        '../../../etc/shadow',
        '/allowed/path/../../sensitive',
        '..\\..\\windows\\system32'
      ];

      maliciousPaths.forEach(path => {
        expect(() => SecurityValidator.validateFilePath(path, allowedDirs))
          .toThrow(SecurityError);
      });
    });

    it('should reject paths outside allowed directories', () => {
      const outsidePaths = [
        '/forbidden/path/file.txt',
        '/etc/passwd',
        '/tmp/malicious.sh'
      ];

      outsidePaths.forEach(path => {
        expect(() => SecurityValidator.validateFilePath(path, allowedDirs))
          .toThrow(SecurityError);
      });
    });

    it('should reject invalid input', () => {
      expect(() => SecurityValidator.validateFilePath('', allowedDirs))
        .toThrow(ValidationError);
      expect(() => SecurityValidator.validateFilePath(null as any, allowedDirs))
        .toThrow(ValidationError);
    });
  });

  describe('validateProjectPath', () => {
    const allowedDirs = ['/projects'];

    it('should allow valid project paths', () => {
      const validPath = '/projects/my-project';
      const result = SecurityValidator.validateProjectPath(validPath, allowedDirs);
      expect(result).toContain('projects/my-project');
    });

    it('should reject extremely long paths', () => {
      const longPath = '/projects/' + 'a'.repeat(500);
      expect(() => SecurityValidator.validateProjectPath(longPath, allowedDirs))
        .toThrow(ValidationError);
    });

    it('should reject suspicious system paths', () => {
      const suspiciousPaths = [
        '/projects/../proc/version',
        '/projects/../sys/kernel',
        '/projects/../dev/null',
        '/projects/../etc/passwd',
        '/projects/../home/user/.ssh/id_rsa',
        '/projects/../home/user/.aws/credentials'
      ];

      suspiciousPaths.forEach(path => {
        expect(() => SecurityValidator.validateProjectPath(path, allowedDirs))
          .toThrow(SecurityError);
      });
    });
  });

  describe('sanitizeCommandArgs', () => {
    it('should sanitize array of arguments', () => {
      const args = ['arg1', 'arg2', 'safe-arg_123'];
      const result = SecurityValidator.sanitizeCommandArgs(args);
      expect(result).toEqual(args);
    });

    it('should reject dangerous arguments', () => {
      const dangerousArgs = ['arg1', 'arg2; rm -rf /', 'arg3'];
      expect(() => SecurityValidator.sanitizeCommandArgs(dangerousArgs))
        .toThrow(SecurityError);
    });

    it('should reject non-array input', () => {
      expect(() => SecurityValidator.sanitizeCommandArgs('not-array' as any))
        .toThrow(ValidationError);
    });

    it('should reject non-string arguments', () => {
      const invalidArgs = ['valid', 123, 'also-valid'];
      expect(() => SecurityValidator.sanitizeCommandArgs(invalidArgs as any))
        .toThrow(ValidationError);
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask sensitive fields', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        apiKey: 'api-key-value',
        token: 'jwt-token-here',
        normalField: 'normal-value'
      };

      const masked = SecurityValidator.maskSensitiveData(data);
      expect(masked.username).toBe('john');
      expect(masked.password).toBe('***MASKED***');
      expect(masked.apiKey).toBe('***MASKED***');
      expect(masked.token).toBe('***MASKED***');
      expect(masked.normalField).toBe('normal-value');
    });

    it('should mask token-like strings', () => {
      const tokenLikeString = 'abcd1234567890abcdef1234567890abcdef';
      const masked = SecurityValidator.maskSensitiveData(tokenLikeString);
      expect(masked).toBe('abcd****cdef');
    });

    it('should handle nested objects', () => {
      const data = {
        config: {
          database: {
            password: 'db-secret',
            host: 'localhost'
          }
        },
        user: {
          credentials: {
            apiKey: 'secret-key'
          }
        }
      };

      const masked = SecurityValidator.maskSensitiveData(data);
      expect(masked.config.database.password).toBe('***MASKED***');
      expect(masked.config.database.host).toBe('localhost');
      expect(masked.user.credentials.apiKey).toBe('***MASKED***');
    });

    it('should handle arrays', () => {
      const data = [
        { password: 'secret1' },
        { password: 'secret2' },
        { normalField: 'value' }
      ];

      const masked = SecurityValidator.maskSensitiveData(data);
      expect(masked[0].password).toBe('***MASKED***');
      expect(masked[1].password).toBe('***MASKED***');
      expect(masked[2].normalField).toBe('value');
    });

    it('should prevent infinite recursion', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      // Should not throw due to max depth protection
      expect(() => SecurityValidator.maskSensitiveData(circular)).not.toThrow();
    });
  });

  describe('validateApiParameters', () => {
    const allowedParams = ['name', 'value', 'type'];

    it('should allow valid parameters', () => {
      const params = { name: 'test', value: 'some-value' };
      const result = SecurityValidator.validateApiParameters(params, allowedParams);
      expect(result).toEqual(params);
    });

    it('should reject unknown parameters', () => {
      const params = { name: 'test', forbidden: 'value' };
      expect(() => SecurityValidator.validateApiParameters(params, allowedParams))
        .toThrow(ValidationError);
    });

    it('should detect XSS attempts', () => {
      const maliciousParams = [
        { name: '<script>alert("xss")</script>' },
        { name: 'javascript:alert(1)' },
        { name: 'onclick=alert(1)' }
      ];

      maliciousParams.forEach(params => {
        expect(() => SecurityValidator.validateApiParameters(params, allowedParams))
          .toThrow(SecurityError);
      });
    });
  });

  describe('createRateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = SecurityValidator.createRateLimiter(60000, 3);
      
      expect(limiter.checkLimit('user1')).toBe(true);
      expect(limiter.checkLimit('user1')).toBe(true);
      expect(limiter.checkLimit('user1')).toBe(true);
    });

    it('should block requests exceeding limit', () => {
      const limiter = SecurityValidator.createRateLimiter(60000, 2);
      
      expect(limiter.checkLimit('user1')).toBe(true);
      expect(limiter.checkLimit('user1')).toBe(true);
      expect(limiter.checkLimit('user1')).toBe(false);
    });

    it('should reset after time window', (done) => {
      const limiter = SecurityValidator.createRateLimiter(100, 1);
      
      expect(limiter.checkLimit('user1')).toBe(true);
      expect(limiter.checkLimit('user1')).toBe(false);
      
      setTimeout(() => {
        expect(limiter.checkLimit('user1')).toBe(true);
        done();
      }, 150);
    });

    it('should track different users separately', () => {
      const limiter = SecurityValidator.createRateLimiter(60000, 1);
      
      expect(limiter.checkLimit('user1')).toBe(true);
      expect(limiter.checkLimit('user2')).toBe(true);
      expect(limiter.checkLimit('user1')).toBe(false);
      expect(limiter.checkLimit('user2')).toBe(false);
    });

    it('should report remaining requests correctly', () => {
      const limiter = SecurityValidator.createRateLimiter(60000, 3);
      
      expect(limiter.getRemainingRequests('user1')).toBe(3);
      limiter.checkLimit('user1');
      expect(limiter.getRemainingRequests('user1')).toBe(2);
      limiter.checkLimit('user1');
      expect(limiter.getRemainingRequests('user1')).toBe(1);
      limiter.checkLimit('user1');
      expect(limiter.getRemainingRequests('user1')).toBe(0);
    });
  });
});

describe('SecureCommandExecutor', () => {
  let executor: SecureCommandExecutor;
  const allowedDirs = [process.cwd()];

  beforeEach(() => {
    executor = new SecureCommandExecutor(allowedDirs, { windowMs: 60000, maxRequests: 10 });
  });

  describe('executeCommand', () => {
    it('should execute safe commands', async () => {
      const result = await executor.executeCommand('echo', ['hello', 'world']);
      expect(result.stdout.trim()).toBe('hello world');
    });

    it('should reject dangerous commands', async () => {
      await expect(executor.executeCommand('echo; rm -rf /', []))
        .rejects.toThrow(SecurityError);
    });

    it('should reject dangerous arguments', async () => {
      await expect(executor.executeCommand('echo', ['hello; rm -rf /']))
        .rejects.toThrow(SecurityError);
    });

    it('should enforce rate limiting', async () => {
      const fastExecutor = new SecureCommandExecutor(allowedDirs, { windowMs: 60000, maxRequests: 1 });
      
      await fastExecutor.executeCommand('echo', ['test'], { identifier: 'test-user' });
      
      await expect(fastExecutor.executeCommand('echo', ['test2'], { identifier: 'test-user' }))
        .rejects.toThrow(SecurityError);
    });

    it('should validate working directory', async () => {
      await expect(executor.executeCommand('echo', ['test'], { cwd: '/forbidden/path' }))
        .rejects.toThrow(SecurityError);
    });

    it('should timeout long-running commands', async () => {
      await expect(executor.executeCommand('sleep', ['10'], { timeout: 100 }))
        .rejects.toThrow(SecurityError);
    }, 10000);

    it('should handle command failures', async () => {
      await expect(executor.executeCommand('false', []))
        .rejects.toThrow(SecurityError);
    });

    it('should handle non-existent commands', async () => {
      await expect(executor.executeCommand('non-existent-command-xyz', []))
        .rejects.toThrow(SecurityError);
    });
  });
}); 