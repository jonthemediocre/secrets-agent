import { Request, Response, NextFunction } from 'express';
import { verify, sign, JwtPayload } from 'jsonwebtoken';
import { createLogger } from '../utils/logger';
import { SecurityValidator, SecurityError } from '../utils/security';
import { BaseError, ErrorCategory, ErrorSeverity } from '../utils/error-types';

const logger = createLogger('AuthenticationMiddleware');

export interface UserContext {
  id: string;
  username: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  lastActivity: Date;
}

export interface AuthenticatedRequest extends Request {
  user: UserContext;
}

export class AuthenticationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      details
    });
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      details
    });
  }
}

/**
 * Permission definitions for the secrets management system
 */
export enum Permission {
  // Secret management
  SECRETS_READ = 'secrets:read',
  SECRETS_WRITE = 'secrets:write',
  SECRETS_DELETE = 'secrets:delete',
  SECRETS_EXPORT = 'secrets:export',
  SECRETS_IMPORT = 'secrets:import',
  
  // Project management
  PROJECTS_READ = 'projects:read',
  PROJECTS_WRITE = 'projects:write',
  PROJECTS_DELETE = 'projects:delete',
  PROJECTS_SCAN = 'projects:scan',
  
  // MCP operations
  MCP_READ = 'mcp:read',
  MCP_EXECUTE = 'mcp:execute',
  MCP_CONFIGURE = 'mcp:configure',
  
  // System administration
  SYSTEM_ADMIN = 'system:admin',
  AUDIT_READ = 'audit:read',
  CONFIG_WRITE = 'config:write'
}

/**
 * Role definitions with associated permissions
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  'admin': Object.values(Permission),
  'developer': [
    Permission.SECRETS_READ,
    Permission.SECRETS_WRITE,
    Permission.PROJECTS_READ,
    Permission.PROJECTS_WRITE,
    Permission.PROJECTS_SCAN,
    Permission.MCP_READ,
    Permission.MCP_EXECUTE
  ],
  'viewer': [
    Permission.SECRETS_READ,
    Permission.PROJECTS_READ,
    Permission.MCP_READ,
    Permission.AUDIT_READ
  ],
  'scanner': [
    Permission.PROJECTS_READ,
    Permission.PROJECTS_SCAN,
    Permission.MCP_READ
  ]
};

export class AuthenticationService {
  private activeSessions = new Map<string, UserContext>();
  private rateLimiter = SecurityValidator.createRateLimiter(900000, 5); // 5 attempts per 15 minutes

  constructor(
    private jwtSecret: string,
    private sessionTimeout: number = 3600000 // 1 hour
  ) {
    // Clean up expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 300000);
  }

  /**
   * Authenticate user and create session
   */
  async authenticateUser(username: string, credentials: any): Promise<string> {
    // Rate limiting
    if (!this.rateLimiter.checkLimit(username)) {
      throw new AuthenticationError('Too many authentication attempts', {
        username,
        remaining: this.rateLimiter.getRemainingRequests(username)
      });
    }

    // In a real implementation, this would validate against a user database
    // For now, we'll use environment-based authentication
    const validUsers = this.getValidUsers();
    const user = validUsers.find(u => u.username === username);
    
    if (!user || !this.validateCredentials(user, credentials)) {
      logger.warn('Authentication failed', {
        username,
        timestamp: new Date().toISOString()
      });
      throw new AuthenticationError('Invalid credentials');
    }

    // Create session
    const sessionId = this.generateSessionId();
    const userContext: UserContext = {
      id: user.id,
      username: user.username,
      roles: user.roles,
      permissions: this.getPermissionsForRoles(user.roles),
      sessionId,
      lastActivity: new Date()
    };

    this.activeSessions.set(sessionId, userContext);

    // Generate JWT token
    const token = sign(
      {
        sessionId,
        userId: user.id,
        username: user.username,
        roles: user.roles
      },
      this.jwtSecret,
      { expiresIn: '1h' }
    );

    logger.info('User authenticated successfully', {
      username,
      roles: user.roles,
      sessionId
    });

    return token;
  }

  /**
   * Validate JWT token and return user context
   */
  async validateToken(token: string): Promise<UserContext> {
    try {
      const decoded = verify(token, this.jwtSecret) as JwtPayload;
      
      if (!decoded.sessionId) {
        throw new AuthenticationError('Invalid token format');
      }

      const session = this.activeSessions.get(decoded.sessionId);
      if (!session) {
        throw new AuthenticationError('Session not found or expired');
      }

      // Check session timeout
      const now = new Date();
      const timeDiff = now.getTime() - session.lastActivity.getTime();
      if (timeDiff > this.sessionTimeout) {
        this.activeSessions.delete(decoded.sessionId);
        throw new AuthenticationError('Session expired');
      }

      // Update last activity
      session.lastActivity = now;
      this.activeSessions.set(decoded.sessionId, session);

      return session;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Token validation failed', {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Check if user has required permission
   */
  hasPermission(user: UserContext, permission: Permission): boolean {
    return user.permissions.includes(permission);
  }

  /**
   * Check if user has any of the required permissions
   */
  hasAnyPermission(user: UserContext, permissions: Permission[]): boolean {
    return permissions.some(permission => user.permissions.includes(permission));
  }

  /**
   * Revoke session
   */
  revokeSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    logger.info('Session revoked', { sessionId });
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  private getValidUsers() {
    // In production, this would come from a secure user database
    // For now, using environment variables for demo purposes
    return [
      {
        id: '1',
        username: process.env.ADMIN_USERNAME || 'admin',
        passwordHash: process.env.ADMIN_PASSWORD_HASH || 'admin',
        roles: ['admin']
      },
      {
        id: '2',
        username: process.env.DEV_USERNAME || 'developer',
        passwordHash: process.env.DEV_PASSWORD_HASH || 'developer',
        roles: ['developer']
      }
    ];
  }

  private validateCredentials(user: any, credentials: any): boolean {
    // In production, this would use proper password hashing (bcrypt, etc.)
    // This is a simplified implementation for demonstration
    return user.passwordHash === credentials.password;
  }

  private getPermissionsForRoles(roles: string[]): string[] {
    const permissions = new Set<string>();
    for (const role of roles) {
      const rolePermissions = ROLE_PERMISSIONS[role] || [];
      rolePermissions.forEach(permission => permissions.add(permission));
    }
    return Array.from(permissions);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      const timeDiff = now.getTime() - session.lastActivity.getTime();
      if (timeDiff > this.sessionTimeout) {
        this.activeSessions.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('Cleaned up expired sessions', {
        cleanedCount,
        remainingSessions: this.activeSessions.size
      });
    }
  }
}

/**
 * Express middleware for authentication
 */
export function createAuthenticationMiddleware(authService: AuthenticationService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Missing or invalid authorization header');
      }

      const token = authHeader.substring(7);
      const user = await authService.validateToken(token);
      
      // Add user context to request
      (req as AuthenticatedRequest).user = user;
      
      // Log the authenticated request
      logger.info('Authenticated request', SecurityValidator.maskSensitiveData({
        userId: user.id,
        username: user.username,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }));

      next();
    } catch (error) {
      logger.warn('Authentication failed', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof AuthenticationError) {
        res.status(401).json({
          error: 'Authentication failed',
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'Internal server error'
        });
      }
    }
  };
}

/**
 * Express middleware for authorization
 */
export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (!req.user.permissions.includes(permission)) {
        throw new AuthorizationError('Insufficient permissions', {
          required: permission,
          userPermissions: req.user.permissions,
          userId: req.user.id
        });
      }

      logger.debug('Permission check passed', {
        userId: req.user.id,
        permission,
        path: req.path
      });

      next();
    } catch (error) {
      logger.warn('Authorization failed', {
        userId: req.user?.id,
        permission,
        path: req.path,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof AuthorizationError) {
        res.status(403).json({
          error: 'Access denied',
          message: error.message
        });
      } else {
        res.status(401).json({
          error: 'Authentication required'
        });
      }
    }
  };
}

/**
 * Express middleware to require any of the specified permissions
 */
export function requireAnyPermission(permissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const hasPermission = permissions.some(permission => 
        req.user.permissions.includes(permission)
      );

      if (!hasPermission) {
        throw new AuthorizationError('Insufficient permissions', {
          required: permissions,
          userPermissions: req.user.permissions,
          userId: req.user.id
        });
      }

      logger.debug('Permission check passed', {
        userId: req.user.id,
        requiredPermissions: permissions,
        path: req.path
      });

      next();
    } catch (error) {
      logger.warn('Authorization failed', {
        userId: req.user?.id,
        requiredPermissions: permissions,
        path: req.path,
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof AuthorizationError) {
        res.status(403).json({
          error: 'Access denied',
          message: error.message
        });
      } else {
        res.status(401).json({
          error: 'Authentication required'
        });
      }
    }
  };
} 