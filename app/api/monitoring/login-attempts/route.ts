import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../../../src/utils/logger';

const prisma = new PrismaClient();
const logger = createLogger('LoginAttemptTracking');

// In-memory store for login attempts (in production, use Redis or database)
const loginAttempts = new Map<string, {
  attempts: number;
  lastAttempt: Date;
  blocked: boolean;
  successfulLogins: number;
}>();

// Configuration
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const SUSPICIOUS_THRESHOLD = 3;

// POST /api/monitoring/login-attempts - Track login attempt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, success, ipAddress, userAgent } = body;

    logger.info('Tracking login attempt', { email, success, ipAddress });

    // Get client IP if not provided
    const clientIP = ipAddress || 
      request.headers.get('x-forwarded-for') || 
      request.headers.get('x-real-ip') || 
      'unknown';

    // Track attempt
    const attemptData = loginAttempts.get(email) || {
      attempts: 0,
      lastAttempt: new Date(),
      blocked: false,
      successfulLogins: 0
    };

    const now = new Date();
    
    if (success) {
      // Successful login - reset attempts
      attemptData.attempts = 0;
      attemptData.blocked = false;
      attemptData.successfulLogins++;
      attemptData.lastAttempt = now;

      logger.info('Successful login recorded', { email, ipAddress: clientIP });
    } else {
      // Failed login - increment attempts
      attemptData.attempts++;
      attemptData.lastAttempt = now;

      // Check if should be blocked
      if (attemptData.attempts >= MAX_ATTEMPTS) {
        attemptData.blocked = true;
        logger.warn('Account blocked due to excessive failed attempts', { 
          email, 
          attempts: attemptData.attempts,
          ipAddress: clientIP 
        });
      }

      logger.warn('Failed login attempt recorded', { 
        email, 
        attempts: attemptData.attempts,
        ipAddress: clientIP 
      });
    }

    loginAttempts.set(email, attemptData);

    // Generate alert if suspicious activity
    const isSuspicious = detectSuspiciousActivity(email, attemptData, clientIP);

    return NextResponse.json({
      success: true,
      data: {
        tracked: true,
        blocked: attemptData.blocked,
        attempts: attemptData.attempts,
        suspicious: isSuspicious,
        nextAllowedTime: attemptData.blocked ? 
          new Date(now.getTime() + BLOCK_DURATION).toISOString() : null
      },
      timestamp: now.toISOString()
    });

  } catch (error) {
    logger.error('Failed to track login attempt', { 
      error: error instanceof Error ? error.message : error 
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to track login attempt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/monitoring/login-attempts - Get login attempt statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '24h';
    
    logger.info('Fetching login attempt statistics', { timeframe });

    // Calculate timeframe
    const now = new Date();
    const timeframePeriod = parseTimeframe(timeframe);
    const since = new Date(now.getTime() - timeframePeriod);

    // Analyze current login attempts
    const stats = analyzeLoginAttempts(since);

    // Get suspicious activities
    const suspiciousActivities = getSuspiciousActivities(since);

    // Generate security alerts
    const securityAlerts = generateSecurityAlerts(stats, suspiciousActivities);

    return NextResponse.json({
      success: true,
      data: {
        timeframe,
        since: since.toISOString(),
        statistics: stats,
        suspiciousActivities,
        securityAlerts,
        activeBlocks: getActiveBlocks()
      },
      timestamp: now.toISOString()
    });

  } catch (error) {
    logger.error('Failed to fetch login attempt statistics', { 
      error: error instanceof Error ? error.message : error 
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve login attempt statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions
function detectSuspiciousActivity(email: string, attemptData: any, ipAddress: string): boolean {
  // Multiple failed attempts
  if (attemptData.attempts >= SUSPICIOUS_THRESHOLD) {
    return true;
  }

  // Rapid succession attempts (more than 3 in 5 minutes)
  const recentWindow = 5 * 60 * 1000; // 5 minutes
  const now = new Date();
  if (attemptData.lastAttempt && (now.getTime() - attemptData.lastAttempt.getTime()) < recentWindow) {
    if (attemptData.attempts >= 3) {
      return true;
    }
  }

  return false;
}

function parseTimeframe(timeframe: string): number {
  const timeframes: { [key: string]: number } = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };

  return timeframes[timeframe] || timeframes['24h'];
}

function analyzeLoginAttempts(since: Date): any {
  const now = new Date();
  let totalAttempts = 0;
  let failedAttempts = 0;
  let successfulAttempts = 0;
  let uniqueEmails = 0;
  let blockedAccounts = 0;

  loginAttempts.forEach((data, email) => {
    if (data.lastAttempt >= since) {
      uniqueEmails++;
      totalAttempts += data.attempts + data.successfulLogins;
      failedAttempts += data.attempts;
      successfulAttempts += data.successfulLogins;
      
      if (data.blocked) {
        blockedAccounts++;
      }
    }
  });

  const successRate = totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 100;

  return {
    totalAttempts,
    failedAttempts,
    successfulAttempts,
    successRate,
    uniqueEmails,
    blockedAccounts,
    failureRate: totalAttempts > 0 ? Math.round((failedAttempts / totalAttempts) * 100) : 0
  };
}

function getSuspiciousActivities(since: Date): any[] {
  const suspicious: any[] = [];

  loginAttempts.forEach((data, email) => {
    if (data.lastAttempt >= since) {
      if (data.attempts >= SUSPICIOUS_THRESHOLD) {
        suspicious.push({
          email: email.replace(/(.{2}).+(@.+)/, '$1***$2'), // Mask email for privacy
          attempts: data.attempts,
          lastAttempt: data.lastAttempt.toISOString(),
          blocked: data.blocked,
          severity: data.attempts >= MAX_ATTEMPTS ? 'high' : 'medium'
        });
      }
    }
  });

  return suspicious.sort((a, b) => b.attempts - a.attempts);
}

function generateSecurityAlerts(stats: any, suspicious: any[]): any[] {
  const alerts: any[] = [];

  // High failure rate alert
  if (stats.failureRate > 50 && stats.totalAttempts > 5) {
    alerts.push({
      id: 'high-failure-rate',
      type: 'warning',
      title: 'High Login Failure Rate',
      message: `${stats.failureRate}% of login attempts are failing`,
      severity: 'medium',
      timestamp: new Date().toISOString()
    });
  }

  // Multiple blocked accounts
  if (stats.blockedAccounts > 0) {
    alerts.push({
      id: 'blocked-accounts',
      type: 'critical',
      title: 'Blocked Accounts Detected',
      message: `${stats.blockedAccounts} account(s) currently blocked due to failed login attempts`,
      severity: 'high',
      timestamp: new Date().toISOString()
    });
  }

  // Suspicious activity patterns
  if (suspicious.length > 3) {
    alerts.push({
      id: 'suspicious-patterns',
      type: 'warning',
      title: 'Suspicious Login Patterns',
      message: `${suspicious.length} accounts showing suspicious login behavior`,
      severity: 'medium',
      timestamp: new Date().toISOString()
    });
  }

  return alerts;
}

function getActiveBlocks(): any[] {
  const blocks: any[] = [];
  const now = new Date();

  loginAttempts.forEach((data, email) => {
    if (data.blocked) {
      const blockExpiry = new Date(data.lastAttempt.getTime() + BLOCK_DURATION);
      if (now < blockExpiry) {
        blocks.push({
          email: email.replace(/(.{2}).+(@.+)/, '$1***$2'),
          blockedAt: data.lastAttempt.toISOString(),
          expiresAt: blockExpiry.toISOString(),
          attempts: data.attempts
        });
      } else {
        // Block expired, remove it
        data.blocked = false;
        data.attempts = 0;
      }
    }
  });

  return blocks;
} 