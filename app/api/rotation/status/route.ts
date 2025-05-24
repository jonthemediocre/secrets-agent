import { NextRequest, NextResponse } from 'next/server';
import { VaultAgent } from '../../../../vault/VaultAgent';
import { SecretRotatorAgent } from '../../../../apps/api/agents/secrets/SecretRotatorAgent';
import { RotationSchedulerService } from '../../../../apps/api/agents/secrets/services/RotationSchedulerService';
import { createLogger } from '../../../../src/utils/logger';

const logger = createLogger('RotationStatusAPI');

// Initialize services
const vaultPath = process.env.VAULT_PATH || './vault/secrets.sops.yaml';
const vaultAgent = new VaultAgent(vaultPath);
const secretRotatorAgent = new SecretRotatorAgent(vaultAgent);
const rotationScheduler = new RotationSchedulerService();

export async function GET(request: NextRequest) {
  try {
    logger.info('Rotation status request');

    // Load vault and get rotation data
    await vaultAgent.loadVault();
    await secretRotatorAgent.initialize();
    
    // Get all rotation policies
    const allPolicies = await secretRotatorAgent.getAllPolicies();
    const enabledPolicies = allPolicies.filter(p => p.isEnabled);
    const disabledPolicies = allPolicies.filter(p => !p.isEnabled);
    
    // Get policies due for rotation
    const policiesDue = rotationScheduler.getPoliciesDueForRotation();
    
    // Calculate status summary
    const now = new Date();
    const recentRotations = allPolicies.filter(p => {
      if (!p.lastRotationDate) return false;
      const lastRotation = new Date(p.lastRotationDate);
      const daysSince = (now.getTime() - lastRotation.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7; // Within last 7 days
    });

    const upcomingRotations = allPolicies.filter(p => {
      if (!p.nextRotationDate) return false;
      const nextRotation = new Date(p.nextRotationDate);
      const daysUntil = (nextRotation.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil <= 7 && daysUntil >= 0; // Within next 7 days
    });

    // Group policies by project
    const projectStats = allPolicies.reduce((acc, policy) => {
      if (!acc[policy.project]) {
        acc[policy.project] = {
          project: policy.project,
          totalPolicies: 0,
          enabledPolicies: 0,
          recentRotations: 0,
          upcomingRotations: 0
        };
      }
      
      acc[policy.project].totalPolicies++;
      if (policy.isEnabled) acc[policy.project].enabledPolicies++;
      
      // Check if this policy had a recent rotation
      if (policy.lastRotationDate) {
        const lastRotation = new Date(policy.lastRotationDate);
        const daysSince = (now.getTime() - lastRotation.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince <= 7) acc[policy.project].recentRotations++;
      }
      
      // Check if this policy has an upcoming rotation
      if (policy.nextRotationDate) {
        const nextRotation = new Date(policy.nextRotationDate);
        const daysUntil = (nextRotation.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntil <= 7 && daysUntil >= 0) acc[policy.project].upcomingRotations++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Get recent activity
    const recentActivity = allPolicies
      .filter(p => p.lastRotationDate)
      .sort((a, b) => new Date(b.lastRotationDate!).getTime() - new Date(a.lastRotationDate!).getTime())
      .slice(0, 10)
      .map(p => ({
        policyId: p.policyId,
        secretName: p.secretName,
        project: p.project,
        category: p.category,
        lastRotationDate: p.lastRotationDate,
        nextRotationDate: p.nextRotationDate,
        isEnabled: p.isEnabled
      }));

    const status = {
      infrastructure: {
        isInitialized: true,
        totalPolicies: allPolicies.length,
        enabledPolicies: enabledPolicies.length,
        disabledPolicies: disabledPolicies.length,
        vaultConnected: true
      },
      dashboard: {
        recentRotations: recentRotations.length,
        upcomingRotations: upcomingRotations.length,
        policiesDue: policiesDue.length,
        healthStatus: policiesDue.length === 0 ? 'healthy' : 'attention_required'
      },
      projects: Object.values(projectStats),
      recentActivity,
      summary: {
        rotationInfrastructure: allPolicies.length > 0 ? 'complete' : 'needs_setup',
        pythonCliIntegration: 'complete', // AgentBridgeService is connected
        uiComponentIntegration: 'in_progress' // We're connecting it now
      }
    };

    logger.info('Rotation status successful', { 
      totalPolicies: allPolicies.length,
      enabledPolicies: enabledPolicies.length,
      recentRotations: recentRotations.length,
      upcomingRotations: upcomingRotations.length
    });

    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'X-Secrets-Agent': 'real-rotation-status',
        'X-Total-Policies': allPolicies.length.toString(),
        'X-Health-Status': status.dashboard.healthStatus
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Rotation status failed', { error: errorMessage });

    // Handle specific errors
    if (errorMessage.includes('Vault load failed') || errorMessage.includes('sops')) {
      return NextResponse.json(
        { 
          error: 'Vault access failed',
          details: 'Unable to decrypt vault. Ensure SOPS keys are configured and vault exists.',
          suggestion: 'Run vault initialization or check SOPS configuration',
          status: {
            infrastructure: { isInitialized: false, vaultConnected: false },
            summary: { rotationInfrastructure: 'vault_error' }
          }
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Rotation status failed',
        details: errorMessage,
        status: {
          infrastructure: { isInitialized: false },
          summary: { rotationInfrastructure: 'error' }
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, policyId } = body;

    logger.info('Rotation action request', { action, policyId });

    if (!action) {
      return NextResponse.json(
        { error: 'Action parameter is required' },
        { status: 400 }
      );
    }

    await vaultAgent.loadVault();
    await secretRotatorAgent.initialize();

    let result;

    switch (action) {
      case 'trigger_rotation':
        if (!policyId) {
          return NextResponse.json(
            { error: 'Policy ID is required for rotation trigger' },
            { status: 400 }
          );
        }

        const policy = await secretRotatorAgent.getPolicy(policyId);
        if (!policy) {
          return NextResponse.json(
            { error: `Policy not found: ${policyId}` },
            { status: 404 }
          );
        }

        result = await secretRotatorAgent.rotateSecret(policyId);
        
        logger.info('Manual rotation triggered', { policyId, success: result });
        
        return NextResponse.json({
          success: true,
          message: `Rotation ${result ? 'completed successfully' : 'failed'} for policy ${policyId}`,
          result,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Rotation action failed', { error: errorMessage });

    return NextResponse.json(
      { 
        error: 'Rotation action failed',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
} 