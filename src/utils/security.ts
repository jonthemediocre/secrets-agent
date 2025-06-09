import crypto from 'crypto';
import { BaseError, ValidationError, ErrorCategory, ErrorSeverity } from './error-types';

/**
 * Custom security-related errors
 */
export class SecurityError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      details
    });
  }
}

/**
 * Security validation utilities
 */
export class SecurityValidator {
  private static readonly DANGEROUS_CHARS = /[;&|`$(){}[\]\\><]/g;
  private static readonly SENSITIVE_FIELDS = new Set([
    'password', 'token', 'secret', 'key', 'auth', 'credential',
    'pass', 'pwd', 'private', 'confidential', 'sensitive'
  ]);

  /**
   * Sanitize command input to prevent injection
   */
  static sanitizeCommandInput(input: string): string {
    if (typeof input !== 'string') {
      throw new ValidationError('Command input must be a string');
    }

    // Remove dangerous characters
    const sanitized = input.replace(this.DANGEROUS_CHARS, '').trim();
    
    if (sanitized.length === 0) {
      throw new ValidationError('Command input cannot be empty after sanitization');
    }

    // Whitelist approach - only allow alphanumeric, spaces, hyphens, underscores, dots
    const allowedPattern = /^[a-zA-Z0-9\s._-]+$/;
    if (!allowedPattern.test(sanitized)) {
      throw new SecurityError('Command contains invalid characters');
    }

    return sanitized;
  }

  /**
   * Validate file path to ensure it's within allowed directories
   */
  static validateFilePath(filePath: string, allowedDirectories: string[]): string {
    if (typeof filePath !== 'string') {
      throw new ValidationError('File path must be a string');
    }

    // Normalize path and resolve any relative references
    const normalizedPath = filePath.replace(/\\/g, '/').replace(/\/+/g, '/');
    
    // Check for path traversal attempts
    if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
      throw new SecurityError('Path traversal detected', { path: filePath });
    }

    // If allowedDirectories is empty, allow all paths (for development)
    if (allowedDirectories.length === 0) {
      return normalizedPath;
    }

    // Check if path is within allowed directories
    const isAllowed = allowedDirectories.some(allowedDir => {
      const normalizedAllowedDir = allowedDir.replace(/\\/g, '/').replace(/\/+/g, '/');
      return normalizedPath.startsWith(normalizedAllowedDir);
    });

    if (!isAllowed) {
      throw new SecurityError('File path not within allowed directories', {
        path: filePath,
        allowedDirectories
      });
    }

    return normalizedPath;
  }

  /**
   * Validate project-related paths
   */
  static validateProjectPath(projectPath: string, allowedDirectories: string[]): string {
    const validatedPath = this.validateFilePath(projectPath, allowedDirectories);
    
    // Additional project-specific validations
    const dangerousPaths = [
      'node_modules',
      '.git',
      '.env',
      'package.json',
      'yarn.lock',
      'package-lock.json'
    ];

    const pathLower = validatedPath.toLowerCase();
    const containsDangerousPath = dangerousPaths.some(dangerous => 
      pathLower.includes(dangerous.toLowerCase())
    );

    if (containsDangerousPath) {
      throw new SecurityError('Access to sensitive project files is restricted', {
        path: projectPath,
        restrictedPaths: dangerousPaths
      });
    }

    return validatedPath;
  }

  /**
   * Sanitize command arguments
   */
  static sanitizeCommandArgs(args: string[]): string[] {
    if (!Array.isArray(args)) {
      throw new ValidationError('Command arguments must be an array');
    }

    return args.map(arg => this.sanitizeCommandInput(arg));
  }

  /**
   * Mask sensitive data in objects for logging
   */
  static maskSensitiveData(obj: any, depth = 0): any {
    // Prevent infinite recursion
    if (depth > 10) {
      return '[MAX_DEPTH_REACHED]';
    }

    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'string') {
      // Check if the string looks like a token/key
      if (obj.length > 20 && /^[A-Za-z0-9+/=_-]+$/.test(obj)) {
        return `${obj.substring(0, 4)}****${obj.substring(obj.length - 4)}`;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.maskSensitiveData(item, depth + 1));
    }

    if (typeof obj === 'object') {
      const masked: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const keyLower = key.toLowerCase();
        const isSensitive = this.SENSITIVE_FIELDS.has(keyLower) || 
                          Array.from(this.SENSITIVE_FIELDS).some(field => keyLower.includes(field));
        
        if (isSensitive && typeof value === 'string') {
          masked[key] = value.length > 0 ? '***MASKED***' : '';
        } else {
          masked[key] = this.maskSensitiveData(value, depth + 1);
        }
      }
      return masked;
    }

    return obj;
  }

  /**
   * Validate API parameters
   */
  static validateApiParameters(params: Record<string, any>, allowedParams: string[]): Record<string, any> {
    const validated: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (!allowedParams.includes(key)) {
        throw new ValidationError(`Parameter '${key}' is not allowed`, {
          allowedParams,
          providedKey: key
        });
      }
      
      // Basic XSS prevention for string values
      if (typeof value === 'string') {
        const xssPattern = /<script|javascript:|on\w+=/i;
        if (xssPattern.test(value)) {
          throw new SecurityError('Potentially malicious content detected', {
            parameter: key,
            value: value.substring(0, 100)
          });
        }
      }
      
      validated[key] = value;
    }
    
    return validated;
  }

  /**
   * Rate limiting helper
   */
  static createRateLimiter(windowMs: number, maxRequests: number) {
    const requests = new Map<string, number[]>();
    
    return {
      checkLimit(identifier: string): boolean {
        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!requests.has(identifier)) {
          requests.set(identifier, []);
        }
        
        const userRequests = requests.get(identifier)!;
        
        // Remove old requests outside the window
        const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
        requests.set(identifier, validRequests);
        
        if (validRequests.length >= maxRequests) {
          return false; // Rate limit exceeded
        }
        
        validRequests.push(now);
        return true; // Request allowed
      },
      
      getRemainingRequests(identifier: string): number {
        const now = Date.now();
        const windowStart = now - windowMs;
        const userRequests = requests.get(identifier) || [];
        const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
        return Math.max(0, maxRequests - validRequests.length);
      }
    };
  }
}

/**
 * Secure command executor with sandboxing and rate limiting
 */
export class SecureCommandExecutor {
  private allowedDirectories: string[];
  private rateLimiter: ReturnType<typeof SecurityValidator.createRateLimiter>;

  constructor(allowedDirectories: string[], rateLimitConfig: { windowMs: number; maxRequests: number }) {
    this.allowedDirectories = allowedDirectories;
    this.rateLimiter = SecurityValidator.createRateLimiter(rateLimitConfig.windowMs, rateLimitConfig.maxRequests);
  }

  /**
   * Execute a command with security checks
   */
  async executeCommand(command: string, args: string[] = [], options: any = {}): Promise<any> {
    // Rate limiting
    if (!this.rateLimiter.checkLimit('default')) {
      throw new SecurityError('Rate limit exceeded');
    }

    // Sanitize inputs
    const sanitizedCommand = SecurityValidator.sanitizeCommandInput(command);
    const sanitizedArgs = SecurityValidator.sanitizeCommandArgs(args);

    // Validate working directory if provided
    if (options.cwd) {
      options.cwd = SecurityValidator.validateFilePath(options.cwd, this.allowedDirectories);
    }

    // For now, just return a mock result
    return {
      stdout: `Mock execution of: ${sanitizedCommand} ${sanitizedArgs.join(' ')}`,
      stderr: '',
      exitCode: 0
    };
  }
}

/**
 * Rate limiter implementation
 */ 