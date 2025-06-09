import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '../../../../src/utils/logger';
import AgentOrchestrator from '../../../../src/agents/AgentOrchestrator';

const logger = createLogger('OrchestratorAPI');

// Singleton orchestrator instance
let orchestrator: AgentOrchestrator | null = null;

// GET /api/agents/orchestrator - Get orchestrator status and insights
export async function GET(request: NextRequest) {
  try {
    if (!orchestrator) {
      return NextResponse.json({
        success: false,
        error: 'Orchestrator not initialized',
        message: 'Call POST to initialize the orchestrator first'
      }, { status: 400 });
    }

    const insights = orchestrator.getSystemInsights();
    
    return NextResponse.json({
      success: true,
      data: {
        status: 'running',
        insights,
        timestamp: new Date().toISOString()
      },
      message: 'Orchestrator status retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get orchestrator status:', error as Record<string, any>);
    return NextResponse.json({
      success: false,
      error: 'ORCHESTRATOR_STATUS_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/agents/orchestrator - Initialize or execute orchestrated tasks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'initialize':
        return await initializeOrchestrator();
      
      case 'analyze_secrets_distributed':
        return await analyzeSecretsDistributed(params);
      
      case 'detect_threats_consensus':
        return await detectThreatsWithConsensus();
      
      case 'compliance_multi_framework':
        return await complianceMultiFramework(params);
      
      case 'deploy_agent':
        return await deployAgent(params);
      
      default:
        return NextResponse.json({
          success: false,
          error: 'INVALID_ACTION',
          message: `Unknown action: ${action}`
        }, { status: 400 });
    }

  } catch (error) {
    logger.error('Orchestrator operation failed:', error as Record<string, any>);
    return NextResponse.json({
      success: false,
      error: 'ORCHESTRATOR_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/agents/orchestrator - Shutdown orchestrator
export async function DELETE(request: NextRequest) {
  try {
    if (!orchestrator) {
      return NextResponse.json({
        success: true,
        message: 'Orchestrator already shutdown'
      });
    }

    await orchestrator.shutdown();
    orchestrator = null;

    logger.info('Orchestrator shutdown successfully');

    return NextResponse.json({
      success: true,
      message: 'Orchestrator shutdown successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to shutdown orchestrator:', error as Record<string, any>);
    return NextResponse.json({
      success: false,
      error: 'SHUTDOWN_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions
async function initializeOrchestrator() {
  if (orchestrator) {
    return NextResponse.json({
      success: true,
      message: 'Orchestrator already initialized',
      data: { status: 'running' }
    });
  }

  logger.info('Initializing Agent Orchestrator');

  orchestrator = new AgentOrchestrator();
  await orchestrator.initialize();

  logger.info('Agent Orchestrator initialized successfully');

  return NextResponse.json({
    success: true,
    data: {
      status: 'initialized',
      insights: orchestrator.getSystemInsights()
    },
    message: 'Orchestrator initialized successfully'
  });
}

async function analyzeSecretsDistributed(params: any) {
  if (!orchestrator) {
    throw new Error('Orchestrator not initialized');
  }

  const { secrets, analysis = { depth: 'deep', parallelization: 'moderate', redundancy: 2 } } = params;

  if (!secrets || !Array.isArray(secrets)) {
    return NextResponse.json({
      success: false,
      error: 'INVALID_PARAMETERS',
      message: 'secrets parameter must be an array'
    }, { status: 400 });
  }

  logger.info('Starting distributed secret analysis', {
    secretCount: secrets.length,
    analysis
  });

  const result = await orchestrator.analyzeSecretsDistributed(secrets, analysis);

  return NextResponse.json({
    success: true,
    data: result,
    message: 'Distributed secret analysis completed',
    timestamp: new Date().toISOString()
  });
}

async function detectThreatsWithConsensus() {
  if (!orchestrator) {
    throw new Error('Orchestrator not initialized');
  }

  logger.info('Starting consensus-based threat detection');

  const result = await orchestrator.detectThreatsWithConsensus();

  return NextResponse.json({
    success: true,
    data: result,
    message: 'Consensus threat detection completed',
    timestamp: new Date().toISOString()
  });
}

async function complianceMultiFramework(params: any) {
  if (!orchestrator) {
    throw new Error('Orchestrator not initialized');
  }

  const { frameworks = ['SOC 2 Type II', 'ISO 27001', 'GDPR'] } = params;

  if (!Array.isArray(frameworks)) {
    return NextResponse.json({
      success: false,
      error: 'INVALID_PARAMETERS',
      message: 'frameworks parameter must be an array'
    }, { status: 400 });
  }

  logger.info('Starting multi-framework compliance check', { frameworks });

  const results = await orchestrator.orchestrateMultiFrameworkCompliance(frameworks);

  return NextResponse.json({
    success: true,
    data: {
      frameworks: frameworks.length,
      results,
      summary: {
        totalChecks: results.length,
        successful: results.filter(r => r.success).length,
        averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      }
    },
    message: 'Multi-framework compliance check completed',
    timestamp: new Date().toISOString()
  });
}

async function deployAgent(params: any) {
  if (!orchestrator) {
    throw new Error('Orchestrator not initialized');
  }

  const { agentConfig } = params;

  if (!agentConfig) {
    return NextResponse.json({
      success: false,
      error: 'INVALID_PARAMETERS',
      message: 'agentConfig parameter is required'
    }, { status: 400 });
  }

  logger.info('Deploying new agent', { agentId: agentConfig.identity?.id });

  const agentId = await orchestrator.deployAgent(agentConfig);

  return NextResponse.json({
    success: true,
    data: {
      agentId,
      status: 'deployed'
    },
    message: 'Agent deployed successfully',
    timestamp: new Date().toISOString()
  });
} 