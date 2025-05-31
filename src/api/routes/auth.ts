// auth.ts - Authentication API Routes
// Provides REST endpoints for user signup, login, logout, and token management

import express from 'express';
import { authService } from '../../auth/AuthService';
import { createLogger } from '../../utils/logger';

const router = express.Router();
const logger = createLogger('AuthRoutes');

/**
 * POST /api/auth/signup
 * User registration
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, plan } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'firstName', 'lastName']
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Create user account
    const result = await authService.signup({
      email,
      password,
      firstName,
      lastName,
      plan: plan || 'starter'
    });

    logger.info(`✅ User signed up: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        plan: result.user.plan,
        subscriptionStatus: result.user.subscriptionStatus
      },
      auth: result.auth
    });
  } catch (error: any) {
    logger.error('❌ Signup failed:', error);
    res.status(400).json({
      error: error.message || 'Signup failed',
      code: 'SIGNUP_FAILED'
    });
  }
});

/**
 * POST /api/auth/login
 * User authentication
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Authenticate user
    const result = await authService.login({ email, password });

    logger.info(`✅ User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        plan: result.user.plan,
        subscriptionStatus: result.user.subscriptionStatus,
        lastLoginAt: result.user.lastLoginAt
      },
      auth: result.auth
    });
  } catch (error: any) {
    logger.error('❌ Login failed:', error);
    res.status(401).json({
      error: error.message || 'Login failed',
      code: 'LOGIN_FAILED'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    // Refresh token
    const auth = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      auth
    });
  } catch (error: any) {
    logger.error('❌ Token refresh failed:', error);
    res.status(401).json({
      error: error.message || 'Token refresh failed',
      code: 'TOKEN_REFRESH_FAILED'
    });
  }
});

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error: any) {
    logger.error('❌ Logout failed:', error);
    res.status(500).json({
      error: error.message || 'Logout failed',
      code: 'LOGOUT_FAILED'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error: any) {
    logger.error('❌ Get user info failed:', error);
    res.status(500).json({
      error: error.message || 'Failed to get user info',
      code: 'GET_USER_FAILED'
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email address (placeholder for email verification)
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required'
      });
    }

    // TODO: Implement email verification logic
    logger.info(`📧 Email verification requested with token: ${token}`);

    res.json({
      success: true,
      message: 'Email verification initiated',
      note: 'Email verification is not yet implemented in demo mode'
    });
  } catch (error: any) {
    logger.error('❌ Email verification failed:', error);
    res.status(400).json({
      error: error.message || 'Email verification failed',
      code: 'EMAIL_VERIFICATION_FAILED'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiate password reset (placeholder)
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // TODO: Implement password reset logic
    logger.info(`🔑 Password reset requested for: ${email}`);

    res.json({
      success: true,
      message: 'Password reset email sent',
      note: 'Password reset is not yet implemented in demo mode'
    });
  } catch (error: any) {
    logger.error('❌ Password reset failed:', error);
    res.status(500).json({
      error: error.message || 'Password reset failed',
      code: 'PASSWORD_RESET_FAILED'
    });
  }
});

/**
 * Middleware to authenticate JWT tokens
 */
async function authenticateToken(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access token is required',
        code: 'TOKEN_REQUIRED'
      });
    }

    // Verify token
    const user = await authService.verifyToken(token);
    req.user = user;
    next();
  } catch (error: any) {
    logger.error('❌ Token verification failed:', error);
    res.status(403).json({
      error: 'Invalid or expired token',
      code: 'TOKEN_INVALID'
    });
  }
}

export default router;
export { authenticateToken }; 