// AuthService.ts - Complete SaaS Authentication System
// Handles user registration, login, JWT tokens, and session management

import { createLogger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const logger = createLogger('AuthService');
const scryptAsync = promisify(scrypt);

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  plan: 'starter' | 'professional' | 'enterprise';
  stripeCustomerId?: string;
  paypalCustomerId?: string;
  createdAt: Date;
  lastLoginAt: Date;
  isEmailVerified: boolean;
  isActive: boolean;
  trialEndsAt?: Date;
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trial' | 'none';
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  plan?: 'starter' | 'professional' | 'enterprise';
}

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly JWT_EXPIRES_IN = '1h';
  private readonly JWT_REFRESH_EXPIRES_IN = '7d';
  private users = new Map<string, User>();
  private refreshTokens = new Map<string, string>(); // refreshToken -> userId

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
    
    if (this.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      logger.warn('⚠️ Using default JWT secret - CHANGE IN PRODUCTION!');
    }
    
    this.initializeDemoUsers();
  }

  /**
   * Initialize demo users for testing
   */
  private async initializeDemoUsers(): Promise<void> {
    const demoUsers = [
      {
        email: 'demo@apiharvester.com',
        password: 'demo123',
        firstName: 'Demo',
        lastName: 'User',
        plan: 'professional' as const
      },
      {
        email: 'admin@apiharvester.com', 
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        plan: 'enterprise' as const
      }
    ];

    for (const userData of demoUsers) {
      const hashedPassword = await this.hashPassword(userData.password);
      const user: User = {
        id: this.generateUserId(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        plan: userData.plan,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isEmailVerified: true,
        isActive: true,
        subscriptionStatus: userData.plan === 'professional' || userData.plan === 'enterprise' ? 'active' : 'trial',
        trialEndsAt: userData.plan === 'professional' || userData.plan === 'enterprise' ? undefined : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      };
      
      this.users.set(user.id, user);
      
      // Store hashed password separately (in production use database)
      this.users.set(`password:${user.id}`, hashedPassword as any);
    }

    logger.info(`✅ Initialized ${demoUsers.length} demo users`);
  }

  /**
   * User signup
   */
  async signup(data: SignupData): Promise<{ user: User; auth: AuthToken }> {
    try {
      // Check if user already exists
      const existingUser = Array.from(this.users.values()).find(u => u.email === data.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(data.password);

      // Create user
      const user: User = {
        id: this.generateUserId(),
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        plan: data.plan || 'starter',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isEmailVerified: false,
        isActive: true,
        subscriptionStatus: (data.plan || 'starter') === 'starter' ? 'trial' : 'none',
        trialEndsAt: (data.plan || 'starter') === 'starter' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : undefined
      };

      // Store user and password
      this.users.set(user.id, user);
      this.users.set(`password:${user.id}`, hashedPassword as any);

      // Generate tokens
      const auth = await this.generateTokens(user);

      logger.info(`✅ User signed up: ${user.email} (${user.plan} plan)`);
      
      return { user, auth };
    } catch (error: unknown) {
      logger.error('❌ Signup failed:', error as Error);
      throw error;
    }
  }

  /**
   * User login
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; auth: AuthToken }> {
    try {
      // Find user by email
      const user = Array.from(this.users.values()).find(u => u.email === credentials.email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const storedPassword = this.users.get(`password:${user.id}`) as any;
      if (!storedPassword || !await this.verifyPassword(credentials.password, storedPassword)) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Update last login
      user.lastLoginAt = new Date();
      this.users.set(user.id, user);

      // Generate tokens
      const auth = await this.generateTokens(user);

      logger.info(`✅ User logged in: ${user.email}`);
      
      return { user, auth };
    } catch (error: unknown) {
      logger.error('❌ Login failed:', error as Error);
      throw error;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthToken> {
    try {
      const userId = this.refreshTokens.get(refreshToken);
      if (!userId) {
        throw new Error('Invalid refresh token');
      }

      const user = this.users.get(userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Remove old refresh token
      this.refreshTokens.delete(refreshToken);

      // Generate new tokens
      const auth = await this.generateTokens(user);
      
      logger.info(`✅ Token refreshed for user: ${user.email}`);
      
      return auth;
    } catch (error: unknown) {
      logger.error('❌ Token refresh failed:', error as Error);
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      const user = this.users.get(decoded.userId);
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return user;
    } catch (error: unknown) {
      logger.error('❌ Token verification failed:', error as Error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<void> {
    this.refreshTokens.delete(refreshToken);
    logger.info('✅ User logged out');
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  /**
   * Update user subscription
   */
  async updateUserSubscription(userId: string, plan: 'starter' | 'professional' | 'enterprise', status: User['subscriptionStatus']): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.plan = plan;
    user.subscriptionStatus = status;
    this.users.set(userId, user);

    logger.info(`✅ Updated subscription for ${user.email}: ${plan} (${status})`);
    
    return user;
  }

  /**
   * Generate secure tokens
   */
  private async generateTokens(user: User): Promise<AuthToken> {
    const payload = {
      userId: user.id,
      email: user.email,
      plan: user.plan
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, { expiresIn: this.JWT_REFRESH_EXPIRES_IN });

    // Store refresh token
    this.refreshTokens.set(refreshToken, user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
      tokenType: 'Bearer'
    };
  }

  /**
   * Hash password securely
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  /**
   * Verify password
   */
  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const [salt, key] = hashedPassword.split(':');
    const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
    return timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${randomBytes(16).toString('hex')}`;
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => typeof u === 'object' && 'email' in u);
  }
}

// Singleton instance
export const authService = new AuthService(); 