import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../../../src/utils/encryption';
import { createLogger } from '../../../../src/utils/logger';

const prisma = new PrismaClient();
const logger = createLogger('DemoUserAPI');

// POST /api/auth/demo - Create demo user for testing
export async function POST(request: NextRequest) {
  try {
    const demoEmail = 'test@example.com';
    const demoPassword = 'password123';

    // Check if demo user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: demoEmail }
    });

    if (existingUser) {
      logger.info('Demo user already exists');
      return NextResponse.json({
        success: true,
        message: 'Demo user already exists',
        data: { email: demoEmail }
      });
    }

    // Hash the password
    const passwordHash = await hashPassword(demoPassword);

    // Create demo user
    const user = await prisma.user.create({
      data: {
        email: demoEmail,
        passwordHash,
        role: 'user'
      }
    });

    logger.info('Demo user created successfully', { userId: user.id, email: user.email });

    return NextResponse.json({
      success: true,
      message: 'Demo user created successfully',
      data: {
        email: demoEmail,
        password: demoPassword,
        userId: user.id
      }
    });

  } catch (error) {
    logger.error('Failed to create demo user', { error: error instanceof Error ? error.message : error });
    
    return NextResponse.json(
      { 
        error: 'Failed to create demo user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 