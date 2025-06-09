import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '../../../../src/utils/logger';
import CICDIntegration from '../../../../src/services/CICDIntegration';

const logger = createLogger('CICDSetupAPI');

interface CICDSetupRequest {
  enableHooks: boolean;
  enableGitHubActions: boolean;
  notifications: {
    email?: string;
    slack?: string;
    discord?: string;
  };
}

interface CICDSetupResult {
  success: boolean;
  hooksInstalled: string[];
  workflowsCreated: string[];
  notificationsConfigured: string[];
  nextSteps: string[];
}

// POST /api/cicd/setup - Setup CI/CD integration
export async function POST(request: NextRequest) {
  try {
    const body: CICDSetupRequest = await request.json();
    logger.info('Setting up CI/CD integration', { config: body });

    // Simulate CI/CD setup process
    await new Promise(resolve => setTimeout(resolve, 1500));

    const setupResult: CICDSetupResult = {
      success: true,
      hooksInstalled: [
        'pre-commit secret scanning',
        'pre-push vulnerability check',
        'post-merge secret rotation trigger'
      ],
      workflowsCreated: [
        '.github/workflows/secret-scan.yml',
        '.github/workflows/vault-sync.yml',
        '.github/workflows/security-audit.yml'
      ],
      notificationsConfigured: [
        body.notifications.email ? 'Email notifications' : null,
        body.notifications.slack ? 'Slack integration' : null,
        body.notifications.discord ? 'Discord webhooks' : null
      ].filter(Boolean) as string[],
      nextSteps: [
        'Configure repository secrets in GitHub',
        'Test the secret scanning workflow',
        'Review and adjust notification preferences',
        'Set up automated secret rotation schedule'
      ]
    };

    logger.info('CI/CD integration setup completed successfully', { 
      hooksInstalled: setupResult.hooksInstalled.length,
      workflowsCreated: setupResult.workflowsCreated.length
    });

    return NextResponse.json({
      success: true,
      data: setupResult,
      message: 'CI/CD integration setup completed successfully'
    });

  } catch (error) {
    logger.error('CI/CD setup failed', { error });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to setup CI/CD integration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/cicd/setup - Get current CI/CD setup status
export async function GET(request: NextRequest) {
  try {
    logger.info('Fetching CI/CD setup status');

    const status = {
      isConfigured: true,
      activeHooks: [
        'pre-commit',
        'pre-push',
        'post-merge'
      ],
      workflows: [
        {
          name: 'Secret Scan',
          status: 'active',
          lastRun: '2 hours ago',
          success: true
        },
        {
          name: 'Vault Sync',
          status: 'active',
          lastRun: '1 day ago',
          success: true
        },
        {
          name: 'Security Audit',
          status: 'active',
          lastRun: '3 hours ago',
          success: false
        }
      ],
      notifications: {
        email: true,
        slack: false,
        discord: true
      }
    };

    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to fetch CI/CD status', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch CI/CD status' },
      { status: 500 }
    );
  }
} 