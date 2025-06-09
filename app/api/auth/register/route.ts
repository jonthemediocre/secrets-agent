import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../../../src/utils/logger';
import { hashPassword } from '../../../../src/utils/encryption';

const prisma = new PrismaClient();
const logger = createLogger('AuthRegisterAPI');

// POST /api/auth/register - Register new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role = 'user' } = body;

    logger.info('User registration attempt', { email, role });

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'email and password are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
        // Note: passwordHash is intentionally excluded from response
      }
    });

    logger.info('User registered successfully', { 
      userId: user.id, 
      email: user.email,
      role: user.role
    });

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User registered successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to register user', { error: error instanceof Error ? error.message : error });

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to register user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 