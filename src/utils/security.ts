import { normalize, resolve, relative } from 'path';
import { BaseError, ErrorCategory, ErrorSeverity } from './error-types';

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

export class ValidationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      details
    });
  }
}

export class SecurityValidator {
  private static readonly DANGEROUS_CHARS = /[;&|`$(){}[\]\\><]/g;
  private static readonly SENSITIVE_FIELDS = new Set([
    'password', 'token', 'key', 'secret', 'api_key', 'apiKey',
    'auth', 'credential', 'pass', 'pwd', 'privateKey', 'private_key'
  ]);

  /**
   * Sanitize command line input to prevent injection attacks
   */
  static sanitizeCommandInput(input: string): string {
    if (typeof input !== 'string') {
      throw new ValidationError('Input must be a string');
    }

    // Remove dangerous shell metacharacters
    const sanitized = input.replace(this.DANGEROUS_CHARS, '');
    
    // Additional validation
    if (sanitized !== input) {
      throw new SecurityError('Input contains potentially dangerous characters', {
        original: input,
        sanitized
      });
    }

    return sanitized;
  }

  /**
   * Validate file path against allowed directories with security checks
   */
  static validateFilePath(filePath: string, allowedDirectories: string[]): string {
    if (!filePath || typeof filePath !== 'string') {
      throw new ValidationError('File path must be a non-empty string');
    }

    // Normalize and resolve the path
    const normalizedPath = normalize(resolve(filePath));
    
    // Check for path traversal attempts
    if (normalizedPath.includes('..') || relative('.', normalizedPath).startsWith('..')) {
      throw new SecurityError('Path traversal detected', { path: filePath });
    }

    // Validate against allowed directories
    const isAllowed = allowedDirectories.some(allowedDir => {
      const normalizedAllowed = normalize(resolve(allowedDir));
      return normalizedPath.startsWith(normalizedAllowed);
    });

    if (!isAllowed) {
      throw new SecurityError('Path outside allowed directories', {
        path: normalizedPath,
        allowedDirectories
      });
    }

    return normalizedPath;
  }

  /**
   * Validate project path with additional security checks
   */
  static validateProjectPath(projectPath: string, allowedDirectories: string[]): string {
    const validatedPath = this.validateFilePath(projectPath, allowedDirectories);

    // Additional project-specific validations
    if (validatedPath.length > 500) {
      throw new ValidationError('Project path too long', { length: validatedPath.length });
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /proc\//, /sys\//, /dev\//, /etc\/passwd/, /etc\/shadow/,
      /\.ssh\//, /\.aws\//, /\.config\//
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(validatedPath)) {
        throw new SecurityError('Project path matches suspicious pattern', {
          path: validatedPath,
          pattern: pattern.source
        });
      }
    }

    return validatedPath;
  }

  /**
   * Sanitize command arguments array
   */
  static sanitizeCommandArgs(args: string[]): string[] {
    if (!Array.isArray(args)) {
      throw new ValidationError('Command arguments must be an array');
    }

    return args.map((arg, index) => {
      if (typeof arg !== 'string') {
        throw new ValidationError(`Argument at index ${index} must be a string`);
      }
      return this.sanitizeCommandInput(arg);
    });
  }

  /**
   * Mask sensitive data in objects for logging
   */
  static maskSensitiveData(obj: any, depth = 0): any {
    if (depth > 10) return '[Max Depth Reached]';
    
    if (obj === null || obj === undefined) return obj;
    
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
 * Secure command execution wrapper
 */
export class SecureCommandExecutor {
  private rateLimiter: ReturnType<typeof SecurityValidator.createRateLimiter>;
  
  constructor(
    private allowedDirectories: string[],
    rateLimitConfig = { windowMs: 60000, maxRequests: 10 }
  ) {
    this.rateLimiter = SecurityValidator.createRateLimiter(
      rateLimitConfig.windowMs,
      rateLimitConfig.maxRequests
    );
  }

  /**
   * Safely execute command with validation and rate limiting
   */
  async executeCommand(
    command: string,
    args: string[],
    options: {
      timeout?: number;
      cwd?: string;
      identifier?: string;
    } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    // Rate limiting check
    const identifier = options.identifier || 'default';
    if (!this.rateLimiter.checkLimit(identifier)) {
      throw new SecurityError('Rate limit exceeded', {
        identifier,
        remaining: this.rateLimiter.getRemainingRequests(identifier)
      });
    }

    // Validate command
    const sanitizedCommand = SecurityValidator.sanitizeCommandInput(command);
    const sanitizedArgs = SecurityValidator.sanitizeCommandArgs(args);
    
    // Validate working directory if provided
    let cwd = options.cwd;
    if (cwd) {
      cwd = SecurityValidator.validateFilePath(cwd, this.allowedDirectories);
    }

    // Import spawn here to avoid circular dependencies
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 30000;
      
      const process = spawn(sanitizedCommand, sanitizedArgs, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout
      });

      let stdout = '';
      let stderr = '';

      if (process.stdout) {
        process.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });
      }

      if (process.stderr) {
        process.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      }

      process.on('close', (code: number | null) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new SecurityError(`Command failed with code ${code}`, {
            command: sanitizedCommand,
            args: sanitizedArgs,
            code,
            stderr
          }));
        }
      });

      process.on('error', (error: Error) => {
        reject(new SecurityError('Command execution failed', {
          command: sanitizedCommand,
          args: sanitizedArgs,
          originalError: error.message
        }));
      });
    });
  }
} 