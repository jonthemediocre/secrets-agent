import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock audit history data
    const audits = [
      {
        id: 'audit_1234567890_abc123def',
        projectPath: '.',
        currentPhase: 'COMPLETED',
        status: 'success',
        startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        completedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        duration: '30 minutes',
        success: true,
        metrics: {
          deltaReduction: 0.089,
          testCoverage: 0.95,
          crossPlatformParity: 0.92,
          securityScore: 0.98,
          performanceGain: 0.156,
          userExperienceScore: 0.91
        }
      },
      {
        id: 'audit_0987654321_xyz789ghi',
        projectPath: '.',
        currentPhase: 'EXECUTION',
        status: 'running',
        startedAt: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        duration: '15 minutes',
        success: false,
        metrics: {
          deltaReduction: 0.045,
          testCoverage: 0.88,
          crossPlatformParity: 0.85,
          securityScore: 0.92,
          performanceGain: 0.078,
          userExperienceScore: 0.84
        }
      },
      {
        id: 'audit_5678901234_def456abc',
        projectPath: '.',
        currentPhase: 'GOVERNANCE_CHECKPOINT',
        status: 'pending_approval',
        startedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        duration: '25 minutes',
        success: false,
        metrics: {
          deltaReduction: 0.067,
          testCoverage: 0.91,
          crossPlatformParity: 0.89,
          securityScore: 0.94,
          performanceGain: 0.112,
          userExperienceScore: 0.88
        }
      }
    ];

    return NextResponse.json({
      success: true,
      data: {
        audits,
        total: audits.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Domino audits list error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve audit history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 