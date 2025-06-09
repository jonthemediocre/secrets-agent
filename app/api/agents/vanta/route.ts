/**
 * VANTA Framework API
 * Provides endpoints for VANTA agent management and Trinity Node operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { KernelEventBus } from '../../../../src/agents/core/KernelEventBus';
import { TrinityNode } from '../../../../src/agents/core/TrinityNode';
import { VANTAHybridAgent, VANTAAgentConfig } from '../../../../src/agents/VANTAHybridAgent';

// Global instances (in production, these would be managed differently)
let kernelEventBus: KernelEventBus | null = null;
let trinityNode: TrinityNode | null = null;
const vantaAgents: Map<string, VANTAHybridAgent> = new Map();

/**
 * Initialize VANTA Framework
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, ...params } = body;

    switch (operation) {
      case 'initialize_framework':
        return await initializeFramework();
        
      case 'create_agent':
        return await createAgent(params);
        
      case 'start_agent':
        return await startAgent(params.agentId);
        
      case 'stop_agent':
        return await stopAgent(params.agentId);
        
      case 'execute_task':
        return await executeAgentTask(params.agentId, params.task);
        
      case 'get_agent_insights':
        return await getAgentInsights(params.agentId);
        
      case 'optimize_learning':
        return await optimizeLearning(params.agentId);
        
      case 'check_drift':
        return await checkDrift(params.agentId);
        
      default:
        return NextResponse.json(
          { success: false, error: 'Unknown operation' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('VANTA Framework API error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Get VANTA Framework status
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const operation = url.searchParams.get('operation');

    switch (operation) {
      case 'framework_status':
        return await getFrameworkStatus();
        
      case 'trinity_status':
        return await getTrinityStatus();
        
      case 'agent_list':
        return await getAgentList();
        
      case 'agent_health':
        const agentId = url.searchParams.get('agentId');
        if (!agentId) {
          return NextResponse.json(
            { success: false, error: 'Agent ID required' },
            { status: 400 }
          );
        }
        return await getAgentHealth(agentId);
        
      case 'system_metrics':
        return await getSystemMetrics();
        
      default:
        return NextResponse.json(
          { success: false, error: 'Unknown operation' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('VANTA Framework API error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Initialize the VANTA Framework
 */
async function initializeFramework() {
  try {
    // Initialize Kernel Event Bus
    kernelEventBus = new KernelEventBus();
    // KernelEventBus is ready immediately after construction

    // Initialize Trinity Node
    trinityNode = new TrinityNode(kernelEventBus);
    await trinityNode.initialize();

    return NextResponse.json({
      success: true,
      message: 'VANTA Framework initialized successfully',
      timestamp: new Date().toISOString(),
      components: {
        kernelEventBus: 'active',
        trinityNode: 'active',
        agentCount: 0
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Framework initialization failed: ${(error as Error).message}` 
      },
      { status: 500 }
    );
  }
}

/**
 * Create a new VANTA agent
 */
async function createAgent(params: {
  agentId: string;
  archetype: string;
  role: 'planner' | 'executor' | 'collapser' | 'hybrid';
  capabilities: string[];
  traceDirectory?: string;
}) {
  if (!kernelEventBus) {
    return NextResponse.json(
      { success: false, error: 'Framework not initialized' },
      { status: 400 }
    );
  }

  try {
    const config: VANTAAgentConfig = {
      agentId: params.agentId,
      archetype: params.archetype,
      role: params.role,
      capabilities: params.capabilities,
      traceDirectory: params.traceDirectory,
      rflThreshold: 0.7,
      driftThreshold: 0.3,
      learningRate: 0.4
    };

    const agent = new VANTAHybridAgent(config, kernelEventBus);
    await agent.initialize();

    vantaAgents.set(params.agentId, agent);

    // Register with Trinity Node
    if (trinityNode) {
      await trinityNode.registerAgent(params.agentId);
    }

    return NextResponse.json({
      success: true,
      message: `VANTA agent ${params.agentId} created successfully`,
      agent: {
        agentId: params.agentId,
        archetype: params.archetype,
        role: params.role,
        capabilities: params.capabilities,
        status: 'initialized',
        health: agent.getHealth()
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Agent creation failed: ${(error as Error).message}` 
      },
      { status: 500 }
    );
  }
}

/**
 * Start a VANTA agent
 */
async function startAgent(agentId: string) {
  const agent = vantaAgents.get(agentId);
  if (!agent) {
    return NextResponse.json(
      { success: false, error: 'Agent not found' },
      { status: 404 }
    );
  }

  try {
    await agent.start();
    
    return NextResponse.json({
      success: true,
      message: `VANTA agent ${agentId} started successfully`,
      health: agent.getHealth()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Agent start failed: ${(error as Error).message}` 
      },
      { status: 500 }
    );
  }
}

/**
 * Stop a VANTA agent
 */
async function stopAgent(agentId: string) {
  const agent = vantaAgents.get(agentId);
  if (!agent) {
    return NextResponse.json(
      { success: false, error: 'Agent not found' },
      { status: 404 }
    );
  }

  try {
    await agent.stop();
    
    return NextResponse.json({
      success: true,
      message: `VANTA agent ${agentId} stopped successfully`,
      finalHealth: agent.getHealth()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Agent stop failed: ${(error as Error).message}` 
      },
      { status: 500 }
    );
  }
}

/**
 * Execute a task with a VANTA agent
 */
async function executeAgentTask(agentId: string, task: {
  id: string;
  type: string;
  description: string;
  parameters: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  requiresCollaboration?: boolean;
  expectedDuration?: number;
}) {
  const agent = vantaAgents.get(agentId);
  if (!agent) {
    return NextResponse.json(
      { success: false, error: 'Agent not found' },
      { status: 404 }
    );
  }

  try {
    const result = await agent.executeTask(task);
    
    return NextResponse.json({
      success: true,
      message: `Task ${task.id} executed by agent ${agentId}`,
      result: {
        taskId: task.id,
        success: result.success,
        duration: result.duration,
        learningEventsCount: result.learningEvents.length,
        tracesCount: result.traces.length
      },
      health: agent.getHealth()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Task execution failed: ${(error as Error).message}` 
      },
      { status: 500 }
    );
  }
}

/**
 * Get agent insights and analytics
 */
async function getAgentInsights(agentId: string) {
  const agent = vantaAgents.get(agentId);
  if (!agent) {
    return NextResponse.json(
      { success: false, error: 'Agent not found' },
      { status: 404 }
    );
  }

  try {
    const insights = agent.getInsights();
    
    return NextResponse.json({
      success: true,
      insights: {
        agentId,
        behaviorPolicies: insights.behaviorPolicies,
        convergenceScore: insights.convergenceScore,
        continuityScore: insights.continuityScore,
        recentLearning: insights.recentLearning,
        communicationStats: insights.communicationStats,
        performanceMetrics: insights.performanceMetrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to get insights: ${(error as Error).message}` 
      },
      { status: 500 }
    );
  }
}

/**
 * Trigger learning optimization
 */
async function optimizeLearning(agentId: string) {
  const agent = vantaAgents.get(agentId);
  if (!agent) {
    return NextResponse.json(
      { success: false, error: 'Agent not found' },
      { status: 404 }
    );
  }

  try {
    const mutations = await agent.optimizeLearning();
    
    return NextResponse.json({
      success: true,
      message: `Learning optimization applied to agent ${agentId}`,
      mutations: mutations,
      mutationCount: mutations.length,
      health: agent.getHealth()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Learning optimization failed: ${(error as Error).message}` 
      },
      { status: 500 }
    );
  }
}

/**
 * Check for agent drift
 */
async function checkDrift(agentId: string) {
  const agent = vantaAgents.get(agentId);
  if (!agent) {
    return NextResponse.json(
      { success: false, error: 'Agent not found' },
      { status: 404 }
    );
  }

  try {
    await agent.checkDrift();
    
    return NextResponse.json({
      success: true,
      message: `Drift check completed for agent ${agentId}`,
      health: agent.getHealth(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Drift check failed: ${(error as Error).message}` 
      },
      { status: 500 }
    );
  }
}

/**
 * Get framework status
 */
async function getFrameworkStatus() {
  return NextResponse.json({
    success: true,
    framework: {
      kernelEventBus: kernelEventBus ? 'active' : 'inactive',
      trinityNode: trinityNode ? 'active' : 'inactive',
      agentCount: vantaAgents.size,
      agents: Array.from(vantaAgents.keys()),
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Get Trinity Node status
 */
async function getTrinityStatus() {
  if (!trinityNode) {
    return NextResponse.json(
      { success: false, error: 'Trinity Node not initialized' },
      { status: 400 }
    );
  }

  try {
    const status = trinityNode.getStatus();
    
    return NextResponse.json({
      success: true,
      trinityNode: status
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to get Trinity status: ${(error as Error).message}` 
      },
      { status: 500 }
    );
  }
}

/**
 * Get list of all agents
 */
async function getAgentList() {
  const agentList = Array.from(vantaAgents.entries()).map(([agentId, agent]) => ({
    agentId,
    health: agent.getHealth(),
    insights: agent.getInsights()
  }));

  return NextResponse.json({
    success: true,
    agents: agentList,
    count: agentList.length
  });
}

/**
 * Get specific agent health
 */
async function getAgentHealth(agentId: string) {
  const agent = vantaAgents.get(agentId);
  if (!agent) {
    return NextResponse.json(
      { success: false, error: 'Agent not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    agentId,
    health: agent.getHealth(),
    timestamp: new Date().toISOString()
  });
}

/**
 * Get comprehensive system metrics
 */
async function getSystemMetrics() {
  const metrics = {
    framework: {
      isInitialized: kernelEventBus !== null && trinityNode !== null,
      uptime: new Date().toISOString(),
      components: {
        kernelEventBus: kernelEventBus ? 'active' : 'inactive',
        trinityNode: trinityNode ? 'active' : 'inactive'
      }
    },
    agents: {
      total: vantaAgents.size,
      byRole: {} as Record<string, number>,
      averageHealth: 0,
      healthDistribution: {
        excellent: 0, // > 0.8
        good: 0,      // 0.6 - 0.8
        fair: 0,      // 0.4 - 0.6
        poor: 0       // < 0.4
      }
    },
    trinity: trinityNode ? trinityNode.getStatus() : null
  };

  // Calculate agent metrics
  if (vantaAgents.size > 0) {
    let totalHealth = 0;
    const roleCount: Record<string, number> = {};

    for (const [agentId, agent] of vantaAgents) {
      const health = agent.getHealth();
      const insights = agent.getInsights();
      
      totalHealth += health.overall;
      
      // Count by role (would need to access agent config)
      // For now, we'll use a placeholder
      
      // Health distribution
      if (health.overall > 0.8) metrics.agents.healthDistribution.excellent++;
      else if (health.overall > 0.6) metrics.agents.healthDistribution.good++;
      else if (health.overall > 0.4) metrics.agents.healthDistribution.fair++;
      else metrics.agents.healthDistribution.poor++;
    }

    metrics.agents.averageHealth = totalHealth / vantaAgents.size;
  }

  return NextResponse.json({
    success: true,
    metrics,
    timestamp: new Date().toISOString()
  });
} 