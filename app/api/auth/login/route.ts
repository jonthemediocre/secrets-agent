import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../../../src/utils/logger';
import { verifyPassword } from '../../../../src/utils/encryption';
import { generateTokens } from '../../../../lib/auth';
import { authRateLimiter } from '../../../../lib/rateLimiter';

const prisma = new PrismaClient();
const logger = createLogger('AuthLoginAPI');

// Development bypass for quick testing
const DEV_CREDENTIALS = {
  'admin@secretsagent.com': 'admin123',
  'test@example.com': 'password123',
  'demo@secretsagent.com': 'demo123'
};

// POST /api/auth/login - User login with rate limiting
export async function POST(request: NextRequest) {
  // Apply rate limiting first
  const rateLimitResult = authRateLimiter.check(request);
  if (!rateLimitResult.success) {
    logger.warn('Login rate limit exceeded', { 
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      remaining: rateLimitResult.remaining,
      resetTime: new Date(rateLimitResult.resetTime).toISOString()
    });
    
    return authRateLimiter.createResponse(
      rateLimitResult.success, 
      rateLimitResult.remaining, 
      rateLimitResult.resetTime
    )!;
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    logger.info('User login attempt', { email });

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'email and password are required' },
        { status: 400 }
      );
    }

    // Development bypass - check dev credentials first
    if (process.env.NODE_ENV === 'development' && DEV_CREDENTIALS[email as keyof typeof DEV_CREDENTIALS]) {
      if (DEV_CREDENTIALS[email as keyof typeof DEV_CREDENTIALS] === password) {
        // Create mock user for dev mode
        const mockUser = {
          id: `dev-${email.split('@')[0]}`,
          email,
          role: email.includes('admin') ? 'ADMIN' : 'USER',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const tokens = generateTokens({
          userId: mockUser.id,
          email: mockUser.email,
          role: mockUser.role
        });

        logger.info('Development login successful', { email });

        return NextResponse.json({
          success: true,
          data: {
            user: mockUser,
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn
          },
          message: 'Development login successful',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      logger.warn('Login attempt with non-existent email', { email });
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      logger.warn('Login attempt with invalid password', { email, userId: user.id });
      
      // Track failed login attempt
      try {
        await fetch(`${request.nextUrl.origin}/api/monitoring/login-attempts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            success: false,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          })
        });
      } catch (trackingError) {
        logger.error('Failed to track failed login attempt', { trackingError });
      }
      
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT tokens using the centralized auth service
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Prepare user data for response (exclude password hash)
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    logger.info('User logged in successfully', { 
      userId: user.id, 
      email: user.email,
      role: user.role
    });

    // Track successful login attempt
    try {
      await fetch(`${request.nextUrl.origin}/api/monitoring/login-attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          success: true,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        })
      });
    } catch (trackingError) {
      logger.error('Failed to track successful login attempt', { trackingError });
    }

    // Create successful response with rate limit headers
    const response = NextResponse.json({
      success: true,
      data: {
        user: userData,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      },
      message: 'Login successful',
      timestamp: new Date().toISOString()
    });

    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', authRateLimiter.options.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime / 1000).toString());

    return response;

  } catch (error) {
    logger.error('Failed to login user', { error: error instanceof Error ? error.message : error });
    
    return NextResponse.json(
      { 
        error: 'Login failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 