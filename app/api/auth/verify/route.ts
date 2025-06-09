import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createLogger } from '../../../../src/utils/logger';
import { getConfig, getDevConfig } from '../../../../src/config/bootstrap';

const logger = createLogger('AuthVerifyAPI');

// POST /api/auth/verify - Verify JWT token
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header missing or invalid' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Get secure configuration (or dev fallback)
    let config;
    try {
      config = await getConfig();
    } catch {
      // Fallback to dev config if secure config doesn't exist
      config = getDevConfig();
    }

    // Verify JWT token
    const jwtSecret = config.jwt.secret as string;
    
    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      logger.info('Token verified successfully', { 
        userId: decoded.userId,
        email: decoded.email 
      });

      return NextResponse.json({
        success: true,
        data: {
          valid: true,
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          expiresAt: new Date(decoded.exp * 1000).toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (jwtError) {
      logger.warn('Invalid token provided', { 
        error: jwtError instanceof Error ? jwtError.message : jwtError 
      });
      
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

  } catch (error) {
    logger.error('Token verification failed', { 
      error: error instanceof Error ? error.message : error 
    });
    
    return NextResponse.json(
      { 
        error: 'Token verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 