import { NextRequest, NextResponse } from 'next/server';
import { VantaEnhancedAgent, VantaEnhancementConfig } from '../../../../src/lib/vanta/VantaEnhancedAgent';
import { HybridAgent, HybridAgentConfig } from '../../../../src/agents/HybridAgent';
import { createLogger } from '../../../../src/utils/logger';
import { registerAgentForTrinityManagement } from '../trinity/route';

const logger = createLogger('VantaAgentAPI');

// Global VANTA agent registry
const vantaAgents = new Map<string, VantaEnhancedAgent>();

/**
 * GET /api/vanta/agent - List all VANTA agents and their status
 */
export async function GET() {
  try {
    const agentStatuses = [];
    
    for (const [agentId, agent] of vantaAgents.entries()) {
      const status = await agent.getEnhancedStatus();
      const learningStats = await agent.getLearningStats();
      
      agentStatuses.push({
        agentId,
        status: status.status,
        health: status.health,
        vanta: {
          ...status.vanta,
          ...learningStats
        }
      });
    }

    return NextResponse.json({
      success: true,
      agents: agentStatuses,
      totalAgents: agentStatuses.length,
      activeAgents: agentStatuses.filter(a => a.status === 'online').length
    });

  } catch (error) {
    logger.error('Failed to get VANTA agent status:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Failed to get agent status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vanta/agent - Create or configure VANTA enhanced agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, action, config, vantaConfig } = body;

    switch (action) {
      case 'create':
        return await createVantaAgent(agentId, config, vantaConfig);
      
      case 'execute_task':
        return await executeVantaTask(agentId, body.task);
      
      case 'get_learning_stats':
        return await getAgentLearningStats(agentId);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('VANTA agent API error:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * CREATE VANTA AGENT
 */
async function createVantaAgent(
  agentId: string,
  hybridConfig: HybridAgentConfig,
  vantaConfig: Partial<VantaEnhancementConfig> = {}
): Promise<NextResponse> {
  try {
    if (vantaAgents.has(agentId)) {
      return NextResponse.json(
        { success: false, error: 'Agent already exists' },
        { status: 409 }
      );
    }

    // Default hybrid agent configuration if not provided
    const defaultHybridConfig: HybridAgentConfig = {
      identity: {
        id: agentId,
        type: 'secrets_manager',
        version: '1.0.0',
        capabilities: ['secret_analysis', 'threat_detection', 'compliance_check']
      },
      capabilities: [
        {
          name: 'secret_analysis',
          description: 'Analyze secrets for security issues',
          inputTypes: ['secret_data'],
          outputTypes: ['analysis_result'],
          requiresModel: true,
          modelType: 'analysis',
          contextTypes: ['task', 'memory'],
          collaborativeMode: 'autonomous'
        }
      ],
      models: [
        {
          id: 'analysis_model',
          name: 'Security Analysis Model',
          type: 'analysis',
          capabilities: ['text_analysis', 'pattern_recognition'],
          version: '1.0.0'
        }
      ],
      ...hybridConfig
    };

    // Create the hybrid agent first
    const hybridAgent = new HybridAgent(defaultHybridConfig);
    
    // Then wrap it with VANTA enhancement
    const vantaAgent = new VantaEnhancedAgent(hybridAgent);
    await vantaAgent.initialize();
    
    vantaAgents.set(agentId, vantaAgent);

    // Register agent for Trinity Node management
    registerAgentForTrinityManagement(agentId, vantaAgent);

    logger.info('VANTA enhanced agent created and registered', { agentId });

    return NextResponse.json({
      success: true,
      agentId,
      status: 'created',
      vanta: {
        learningEnabled: vantaConfig.enableLearning !== false,
        learningRate: vantaConfig.learningRate || 0.1,
        adaptationThreshold: vantaConfig.adaptationThreshold || 0.15,
        trinityManagement: true
      }
    });

  } catch (error) {
    logger.error('Failed to create VANTA agent:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}

/**
 * EXECUTE TASK
 */
async function executeVantaTask(agentId: string, task: any): Promise<NextResponse> {
  try {
    const agent = vantaAgents.get(agentId);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    const taskWithId = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: task.type || 'analysis',
      priority: task.priority || 'normal',
      input: task.input || {},
      ...task
    };

    const result = await agent.executeTask(taskWithId);

    return NextResponse.json({
      success: true,
      taskId: taskWithId.id,
      result: {
        ...result,
        vantaEnhanced: true,
        trinitySupervised: true
      }
    });

  } catch (error) {
    logger.error('Failed to execute VANTA task:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Task execution failed' },
      { status: 500 }
    );
  }
}

/**
 * GET LEARNING STATS
 */
async function getAgentLearningStats(agentId: string): Promise<NextResponse> {
  try {
    const agent = vantaAgents.get(agentId);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    const stats = await agent.getLearningStats();

    return NextResponse.json({
      success: true,
      agentId,
      learningStats: stats
    });

  } catch (error) {
    logger.error('Failed to get learning stats:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Failed to get learning stats' },
      { status: 500 }
    );
  }
} 