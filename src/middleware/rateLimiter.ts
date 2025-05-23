import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('RateLimiter');

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
}

interface RateLimitStore {
  increment: (key: string) => Promise<{ totalHits: number; timeToExpire?: number }>;
  decrement: (key: string) => Promise<void>;
  resetKey: (key: string) => Promise<void>;
  resetAll?: () => Promise<void>;
}

// Simple in-memory store for rate limiting
class MemoryStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  async increment(key: string): Promise<{ totalHits: number; timeToExpire?: number }> {
    const now = Date.now();
    const existing = this.store.get(key);
    
    if (!existing || now > existing.resetTime) {
      // New window or expired
      this.store.set(key, { count: 1, resetTime: now + (15 * 60 * 1000) }); // 15 minutes
      return { totalHits: 1, timeToExpire: 15 * 60 * 1000 };
    }
    
    existing.count++;
    this.store.set(key, existing);
    return { 
      totalHits: existing.count, 
      timeToExpire: existing.resetTime - now 
    };
  }

  async decrement(key: string): Promise<void> {
    const existing = this.store.get(key);
    if (existing) {
      existing.count--;
      this.store.set(key, existing);
    }
  }

  async resetKey(key: string): Promise<void> {
    this.store.delete(key);
  }

  async resetAll(): Promise<void> {
    this.store.clear();
  }
}

class RateLimiter {
  private store: RateLimitStore;
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.store = new MemoryStore();
    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      message: options.message || 'Too many requests, please try again later.',
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      skipFailedRequests: options.skipFailedRequests || false,
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator,
    };

    // Clean up expired entries every minute
    setInterval(() => this.cleanupExpiredEntries(), 60000);
  }

  private defaultKeyGenerator(req: Request): string {
    // Use user ID if authenticated, otherwise fall back to IP
    const userId = (req as { user?: { id?: string } }).user?.id;
    if (userId) {
      return `user:${userId}`;
    }
    
    // Get IP address (handle proxies)
    const ip = req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
               'unknown';
    
    return `ip:${ip}`;
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys = Object.keys(this.store).filter(
      key => this.store[key].resetTime <= now
    );
    
    expiredKeys.forEach(key => {
      delete this.store[key];
    });

    if (expiredKeys.length > 0) {
      logger.debug(`Cleaned up ${expiredKeys.length} expired rate limit entries`);
    }
  }

  public middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const key = this.options.keyGenerator(req);
      const now = Date.now();
      
      // Initialize or get existing entry
      if (!this.store[key] || this.store[key].resetTime <= now) {
        this.store[key] = {
          count: 0,
          resetTime: now + this.options.windowMs,
        };
      }

      const entry = this.store[key];
      
      // Check if limit exceeded
      if (entry.count >= this.options.maxRequests) {
        const resetTimeSeconds = Math.ceil((entry.resetTime - now) / 1000);
        
        logger.warn('Rate limit exceeded', {
          key,
          count: entry.count,
          maxRequests: this.options.maxRequests,
          resetIn: resetTimeSeconds,
          userAgent: req.get('User-Agent'),
          path: req.path,
        });

        // Set standard rate limiting headers
        res.set({
          'X-RateLimit-Limit': this.options.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
          'Retry-After': resetTimeSeconds.toString(),
        });

        res.status(429).json({
          error: 'Rate limit exceeded',
          message: this.options.message,
          retryAfter: resetTimeSeconds,
        });
        return;
      }

      // Increment counter (will be decremented if needed after response)
      entry.count++;

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': this.options.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, this.options.maxRequests - entry.count).toString(),
        'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
      });

      // Handle skipSuccessfulRequests and skipFailedRequests
      const originalSend = res.send.bind(res);
      const rateLimiterOptions = this.options; // Capture this context
      
      res.send = function(this: Response, body: string | Buffer | object) {
        const statusCode = this.statusCode;
        const isSuccessful = statusCode >= 200 && statusCode < 300;
        const isFailed = statusCode >= 400;

        // Decrement if we should skip this request
        if ((isSuccessful && rateLimiterOptions.skipSuccessfulRequests) ||
            (isFailed && rateLimiterOptions.skipFailedRequests)) {
          entry.count--;
        }

        return originalSend(body);
      };

      next();
    };
  }
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // Strict limits for authentication endpoints
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
  }),

  // Moderate limits for API endpoints
  api: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    message: 'API rate limit exceeded, please try again later.',
  }),

  // Strict limits for password reset
  passwordReset: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 attempts per hour
    message: 'Too many password reset attempts, please try again later.',
  }),

  // Very strict limits for vault operations
  vault: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20, // 20 vault operations per 5 minutes
    message: 'Vault operation rate limit exceeded, please try again later.',
    keyGenerator: (req: Request) => {
      // Always use user ID for vault operations
      const userId = (req as { user?: { id?: string } }).user?.id;
      if (!userId) {
        throw new Error('Authentication required for vault operations');
      }
      return `vault:user:${userId}`;
    },
  }),

  // Liberal limits for general endpoints
  general: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes
    message: 'Rate limit exceeded, please try again later.',
  }),

  // Very strict limits for admin operations
  admin: new RateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 10, // 10 admin operations per 10 minutes
    message: 'Admin operation rate limit exceeded.',
    keyGenerator: (req: Request) => {
      const userId = (req as { user?: { id?: string } }).user?.id;
      if (!userId) {
        throw new Error('Authentication required for admin operations');
      }
      return `admin:user:${userId}`;
    },
  }),
};

// Helper function to create custom rate limiter
export function createRateLimiter(options: RateLimitOptions) {
  return new RateLimiter(options);
}

// Middleware factory for easy use
export function rateLimit(config: keyof typeof rateLimitConfigs) {
  return rateLimitConfigs[config].middleware();
}

export default RateLimiter; 