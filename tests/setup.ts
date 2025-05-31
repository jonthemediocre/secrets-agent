import { jest } from '@jest/globals';

// Global test setup for security-focused testing

// Mock sensitive environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests

// Security test utilities
export const testUtils = {
  /**
   * Generate test JWT token
   */
  generateTestToken(payload: Record<string, any> = {}): string {
    const jwt = require('jsonwebtoken');
    return jwt.sign({
      userId: 'test-user-123',
      username: 'testuser',
      roles: ['developer'],
      sessionId: 'test-session-123',
      ...payload
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
  },

  /**
   * Generate malicious input patterns for security testing
   */
  getMaliciousInputs(): string[] {
    return [
      // Command injection
      '; rm -rf /',
      '| cat /etc/passwd',
      '&& malicious-command',
      '`whoami`',
      '$(id)',
      
      // Path traversal
      '../../../etc/passwd',
      '..\\..\\windows\\system32',
      '/etc/shadow',
      
      // XSS patterns
      '<script>alert("xss")</script>',
      'javascript:alert(1)',
      'onclick=alert(1)',
      
      // SQL injection
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "UNION SELECT * FROM secrets",
      
      // NoSQL injection
      '{"$ne": null}',
      '{"$regex": ".*"}',
      
      // LDAP injection
      '*)(uid=*',
      '*)(|(password=*))',
      
      // Buffer overflow attempts
      'A'.repeat(10000),
      '\x00\x01\x02\x03',
      
      // NULL bytes
      'file.txt\x00.jpg',
      'test\0admin'
    ];
  },

  /**
   * Generate safe test inputs
   */
  getSafeInputs(): string[] {
    return [
      'valid-filename.txt',
      'safe_variable_name',
      'normal text content',
      '12345',
      'user@example.com',
      '/safe/project/path',
      'API_KEY_NAME',
      'test-project-123'
    ];
  },

  /**
   * Create test user context
   */
  createTestUser(overrides: Record<string, any> = {}) {
    return {
      id: 'test-user-123',
      username: 'testuser',
      roles: ['developer'],
      permissions: ['secrets:read', 'secrets:write', 'projects:read', 'projects:scan'],
      sessionId: 'test-session-123',
      lastActivity: new Date(),
      ...overrides
    };
  },

  /**
   * Create test admin user
   */
  createTestAdmin(overrides: Record<string, any> = {}) {
    return {
      id: 'test-admin-123',
      username: 'testadmin',
      roles: ['admin'],
      permissions: ['*'], // All permissions
      sessionId: 'test-admin-session-123',
      lastActivity: new Date(),
      ...overrides
    };
  },

  /**
   * Assert that function throws security error
   */
  async expectSecurityError(fn: () => Promise<any>, expectedMessage?: string): Promise<void> {
    await expect(fn()).rejects.toThrow();
    
    if (expectedMessage) {
      await expect(fn()).rejects.toThrow(expectedMessage);
    }
  },

  /**
   * Test rate limiting functionality
   */
  async testRateLimit(
    limiter: { checkLimit: (id: string) => boolean },
    identifier: string,
    maxRequests: number
  ): Promise<void> {
    // Test that requests within limit are allowed
    for (let i = 0; i < maxRequests; i++) {
      expect(limiter.checkLimit(identifier)).toBe(true);
    }
    
    // Test that requests exceeding limit are blocked
    expect(limiter.checkLimit(identifier)).toBe(false);
  },

  /**
   * Clean up test data and resources
   */
  cleanup(): void {
    // Reset mocks
    jest.clearAllMocks();
    
    // Clear any test files or temporary data
    // This would include cleaning up test databases, files, etc.
  },

  /**
   * Mock secure file operations
   */
  mockFileSystem() {
    const fs = require('fs').promises;
    
    jest.spyOn(fs, 'readFile').mockImplementation(async (path: string) => {
      if (path.includes('malicious') || path.includes('..')) {
        throw new Error('Access denied');
      }
      return 'test file content';
    });
    
    jest.spyOn(fs, 'writeFile').mockImplementation(async (path: string, data: any) => {
      if (path.includes('malicious') || path.includes('..')) {
        throw new Error('Access denied');
      }
      return;
    });
    
    jest.spyOn(fs, 'stat').mockImplementation(async (path: string) => {
      if (path.includes('malicious') || path.includes('..')) {
        throw new Error('Path not found');
      }
      return {
        isDirectory: () => !path.includes('.'),
        isFile: () => path.includes('.'),
        size: 1024,
        mtime: new Date(),
        ctime: new Date()
      };
    });
  },

  /**
   * Mock command execution
   */
  mockCommandExecution() {
    const { spawn } = require('child_process');
    
    jest.spyOn(require('child_process'), 'spawn').mockImplementation((command: string, args: string[]) => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event: string, callback: Function) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('test output')), 10);
            }
          })
        },
        stderr: {
          on: jest.fn((event: string, callback: Function) => {
            if (event === 'data') {
              setTimeout(() => callback(Buffer.from('')), 10);
            }
          })
        },
        on: jest.fn((event: string, callback: Function) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 20);
          }
        })
      };
      
      return mockProcess;
    });
  },

  /**
   * Generate test configuration
   */
  generateTestConfig() {
    return {
      allowedDirectories: [process.cwd(), '/tmp/test'],
      maxConcurrentJobs: 2,
      jobTimeout: 5000,
      enableSecurityScanning: true,
      rateLimitConfig: {
        windowMs: 1000,
        maxRequests: 3
      }
    };
  }
};

// Global test hooks
beforeEach(() => {
  // Reset environment for each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  testUtils.cleanup();
});

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log
});

// Extend Jest matchers for security testing
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeSecureString(): R;
      toContainNoSecrets(): R;
      toBeValidPath(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeSecureString(received: string) {
    const dangerousPatterns = [
      /[;&|`$(){}[\]\\><]/,
      /<script/i,
      /javascript:/i,
      /on\w+=/i
    ];
    
    const isDangerous = dangerousPatterns.some(pattern => pattern.test(received));
    
    if (isDangerous) {
      return {
        message: () => `Expected "${received}" to be secure, but it contains dangerous characters`,
        pass: false
      };
    }
    
    return {
      message: () => `Expected "${received}" not to be secure`,
      pass: true
    };
  },

  toContainNoSecrets(received: string) {
    const secretPatterns = [
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token/i,
      /[A-Za-z0-9]{32,}/,  // Long alphanumeric strings (potential tokens)
      /sk-[A-Za-z0-9]{48}/,  // OpenAI API key pattern
      /xox[baprs]-[A-Za-z0-9-]+/,  // Slack token pattern
    ];
    
    const containsSecret = secretPatterns.some(pattern => pattern.test(received));
    
    if (containsSecret) {
      return {
        message: () => `Expected "${received}" to contain no secrets, but found potential secret`,
        pass: false
      };
    }
    
    return {
      message: () => `Expected "${received}" to contain secrets`,
      pass: true
    };
  },

  toBeValidPath(received: string) {
    const invalidPathPatterns = [
      /\.\./,  // Path traversal
      /^\/etc/,  // System directories
      /^\/proc/,
      /^\/sys/,
      /^\/dev/,
      /^C:\\Windows/,  // Windows system directories
      /^C:\\Program Files/,
    ];
    
    const isInvalid = invalidPathPatterns.some(pattern => pattern.test(received));
    
    if (isInvalid) {
      return {
        message: () => `Expected "${received}" to be a valid path, but it appears dangerous`,
        pass: false
      };
    }
    
    return {
      message: () => `Expected "${received}" not to be a valid path`,
      pass: true
    };
  }
});

export default testUtils; 