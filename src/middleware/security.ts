import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('SecurityMiddleware');

// Request with user context
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
  startTime?: number;
}

// Security headers middleware
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Be more restrictive in production
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
    
    res.setHeader('Content-Security-Policy', csp);
    
    // HSTS - only in production with HTTPS
    if (process.env.NODE_ENV === 'production' && req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Permissions Policy (formerly Feature Policy)
    res.setHeader('Permissions-Policy', 
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=()');
    
    next();
  };
}

// Input sanitization
export function sanitizeInput() {
  return (req: Request, res: Response, next: NextFunction): void => {
        // Sanitize query parameters    if (req.query) {      req.query = sanitizeObject(req.query) as typeof req.query;    }    // Sanitize body    if (req.body) {      req.body = sanitizeObject(req.body);    }        // Sanitize params    if (req.params) {      req.params = sanitizeObject(req.params) as typeof req.params;    }
    
    next();
  };
}

function sanitizeObject(obj: unknown): unknown {  if (typeof obj !== 'object' || obj === null) {    return sanitizeValue(obj);  }    if (Array.isArray(obj)) {    return obj.map(item => sanitizeObject(item));  }
  
    const sanitized: Record<string, unknown> = {};  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {    const sanitizedKey = sanitizeKey(key);    sanitized[sanitizedKey] = sanitizeObject(value);  }
  
  return sanitized;
}

function sanitizeKey(key: string): string {
  // Remove potentially dangerous characters from object keys
  return key.replace(/[<>'"&]/g, '');
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  // Basic XSS prevention
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Request size limits
export function requestSizeLimits() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const maxSize = parseInt(process.env.MAX_REQUEST_SIZE || '1048576'); // 1MB default
    
    if (req.headers['content-length']) {
      const contentLength = parseInt(req.headers['content-length']);
      if (contentLength > maxSize) {
        logger.warn('Request size limit exceeded', {
          contentLength,
          maxSize,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
        });
        
        res.status(413).json({
          error: 'Request entity too large',
          message: 'Request size exceeds maximum allowed limit',
        });
        return;
      }
    }

    next();
  };
}

// IP whitelist/blacklist
export function ipFilter(options: { whitelist?: string[]; blacklist?: string[] }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                     'unknown';

    // Check blacklist first
    if (options.blacklist && options.blacklist.includes(clientIp)) {
      logger.warn('Blocked IP attempted access', {
        ip: clientIp,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      
      res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not allowed to access this resource',
      });
      return;
    }

    // Check whitelist if provided
    if (options.whitelist && !options.whitelist.includes(clientIp)) {
      logger.warn('Non-whitelisted IP attempted access', {
        ip: clientIp,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      
      res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not authorized to access this resource',
      });
      return;
    }

    next();
  };
}

// Request validation
interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'uuid';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean | string;
}

export function validateRequest(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    
    for (const rule of rules) {
      const value = getNestedValue(req.body, rule.field);
      
      // Check required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${rule.field}' is required`);
        continue;
      }
      
      // Skip validation if field is not required and not provided
      if (!rule.required && (value === undefined || value === null)) {
        continue;
      }
      
      // Type validation
      if (rule.type && !validateType(value, rule.type)) {
        errors.push(`Field '${rule.field}' must be of type ${rule.type}`);
        continue;
      }
      
      // Length validation for strings
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`Field '${rule.field}' must be at least ${rule.minLength} characters long`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`Field '${rule.field}' must be at most ${rule.maxLength} characters long`);
        }
      }
      
      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors.push(`Field '${rule.field}' does not match required pattern`);
      }
      
      // Custom validation
      if (rule.custom) {
        const customResult = rule.custom(value);
        if (customResult !== true) {
          errors.push(typeof customResult === 'string' ? customResult : `Field '${rule.field}' failed custom validation`);
        }
      }
    }
    
    if (errors.length > 0) {
      logger.warn('Request validation failed', {
        errors,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });
      
      res.status(400).json({
        error: 'Validation failed',
        message: 'Request data is invalid',
        details: errors,
      });
      return;
    }
    
    next();
  };
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function validateType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'email':
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'uuid':
      return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    default:
      return true;
  }
}

// Audit logging middleware
export function auditLog() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    // Log request
    logger.info('Request received', {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
    
    // Capture response
    const originalSend = res.send.bind(res);
    res.send = function(this: Response, body: string | Buffer | object) {
      const duration = Date.now() - startTime;
      
      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        statusCode: this.statusCode,
        duration,
        ip: req.ip,
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
      });
      
      return originalSend(body);
    };
    
    next();
  };
}

// Combined security middleware
export function securityMiddleware() {
  return [
    securityHeaders(),
    requestSizeLimits(),
    sanitizeInput(),
    auditLog(),
  ];
}

export type { AuthenticatedRequest, ValidationRule }; 