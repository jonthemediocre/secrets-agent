import { NextRequest, NextResponse } from 'next/server';

// Import the audit sessions from the start route (in production, use shared storage)
const auditSessions = new Map<string, any>();

// Simulate audit progression
function simulateAuditProgress(auditId: string) {
  const session = auditSessions.get(auditId);
  if (!session) return;

  const phases = [
    'INITIALIZATION',
    'RESEARCH', 
    'STRUCTURE',
    'EXECUTION',
    'INTEGRATION_VALIDATION',
    'REVIEW_RECURSION',
    'REINFORCEMENT_LOOP',
    'GOVERNANCE_CHECKPOINT',
    'DOCUMENT_AND_BIND',
    'COMPLETED'
  ];

  const currentPhaseIndex = phases.indexOf(session.status.phase);
  const nextPhaseIndex = Math.min(currentPhaseIndex + 1, phases.length - 1);
  
  // Update metrics progressively
  session.status.metrics.deltaReduction += 0.015;
  session.status.metrics.testCoverage += 0.05;
  session.status.metrics.crossPlatformParity += 0.03;
  session.status.metrics.performanceGain += 0.02;
  session.status.metrics.userExperienceScore += 0.02;

  // Add findings based on phase
  const phaseFindings = {
    'RESEARCH': ['Analyzed codebase structure', 'Identified platform inconsistencies'],
    'STRUCTURE': ['Refactored common utilities', 'Standardized API patterns'],
    'EXECUTION': ['Implemented missing CLI commands', 'Updated VS Code extension'],
    'INTEGRATION_VALIDATION': ['Validated cross-platform compatibility', 'Tested feature parity'],
    'REVIEW_RECURSION': ['Reviewed code quality improvements', 'Optimized performance'],
    'REINFORCEMENT_LOOP': ['Applied ML optimizations', 'Enhanced user experience'],
    'GOVERNANCE_CHECKPOINT': ['Awaiting governance approval', 'Prepared deployment plan'],
    'DOCUMENT_AND_BIND': ['Updated documentation', 'Finalized audit report']
  };

  if (phaseFindings[session.status.phase as keyof typeof phaseFindings]) {
    session.status.findings.push(...phaseFindings[session.status.phase as keyof typeof phaseFindings]);
  }

  // Progress to next phase
  if (nextPhaseIndex > currentPhaseIndex) {
    session.status.phase = phases[nextPhaseIndex];
    session.status.iteration += 1;
    session.status.nextPhase = phases[Math.min(nextPhaseIndex + 1, phases.length - 1)];
  }

  // Mark as completed
  if (session.status.phase === 'COMPLETED') {
    session.status.success = true;
    session.status.completedAt = new Date().toISOString();
  }

  auditSessions.set(auditId, session);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { auditId: string } }
) {
  try {
    const { auditId } = params;

    let session = auditSessions.get(auditId);
    
    // If session doesn't exist, create a mock one for demo purposes
    if (!session) {
      session = {
        id: auditId,
        projectPath: '.',
        status: {
          phase: 'EXECUTION',
          iteration: 3,
          success: false,
          startedAt: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
          metrics: {
            deltaReduction: 0.045,
            testCoverage: 0.92,
            crossPlatformParity: 0.88,
            securityScore: 0.95,
            performanceGain: 0.120,
            userExperienceScore: 0.87
          },
          findings: [
            'Refactored authentication module for consistency',
            'Added missing CLI commands for vault operations',
            'Improved error handling in web interface',
            'Standardized MCP integration patterns',
            'Enhanced cross-platform feature parity'
          ],
          nextPhase: 'INTEGRATION_VALIDATION'
        }
      };
      auditSessions.set(auditId, session);
    }

    // Simulate progress if not completed
    if (session.status.phase !== 'COMPLETED' && session.status.phase !== 'GOVERNANCE_CHECKPOINT') {
      simulateAuditProgress(auditId);
      session = auditSessions.get(auditId);
    }

    return NextResponse.json({
      success: true,
      data: {
        status: session.status,
        auditId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Domino audit status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get audit status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 