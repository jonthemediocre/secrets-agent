import { NextRequest, NextResponse } from 'next/server';
import { TrinityNode, TrinityNodeDecision, AgentCollaborationRequest } from '../../../../src/lib/vanta/TrinityNode';
import { VantaEnhancedAgent } from '../../../../src/lib/vanta/VantaEnhancedAgent';
import { TrinityNodeConfig } from '../../../../src/lib/vanta/types';
import { createLogger } from '../../../../src/utils/logger';

const logger = createLogger('TrinityNodeAPI');

// Global Trinity Nodes registry
const trinityNodes = new Map<string, TrinityNode>();
const registeredAgents = new Map<string, VantaEnhancedAgent>();

/**
 * GET /api/vanta/trinity - List all Trinity Nodes and their status
 */
export async function GET() {
  try {
    const nodeStatuses = [];
    
    for (const [nodeId, node] of trinityNodes.entries()) {
      const status = await node.getSupervisionStatus();
      nodeStatuses.push(status);
    }

    return NextResponse.json({
      success: true,
      trinityNodes: nodeStatuses,
      totalNodes: nodeStatuses.length,
      activeNodes: nodeStatuses.filter(n => n.active).length,
      totalManagedAgents: nodeStatuses.reduce((sum, n) => sum + n.managedAgents, 0)
    });

  } catch (error) {
    logger.error('Failed to get Trinity Node status:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Failed to get node status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vanta/trinity - Create, configure, or command Trinity Nodes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, nodeId, config, agentId, taskData, collaborationRequest } = body;

    switch (action) {
      case 'create_node':
        return await createTrinityNode(nodeId, config);
      
      case 'register_agent':
        return await registerAgentWithNode(nodeId, agentId);
      
      case 'supervise_task':
        return await superviseAgentTask(nodeId, agentId, taskData);
      
      case 'facilitate_collaboration':
        return await facilitateAgentCollaboration(nodeId, collaborationRequest);
      
      case 'get_node_metrics':
        return await getNodeMetrics(nodeId);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Trinity Node API error:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * CREATE TRINITY NODE
 */
async function createTrinityNode(
  nodeId: string,
  config: Partial<TrinityNodeConfig> = {}
): Promise<NextResponse> {
  try {
    if (trinityNodes.has(nodeId)) {
      return NextResponse.json(
        { success: false, error: 'Trinity Node already exists' },
        { status: 409 }
      );
    }

    const defaultConfig: TrinityNodeConfig = {
      nodeId,
      role: config.role || 'core',
      managedAgents: config.managedAgents || [],
      supervisionLevel: config.supervisionLevel || 'moderate'
    };

    const trinityNode = new TrinityNode(defaultConfig);
    await trinityNode.initialize();
    
    trinityNodes.set(nodeId, trinityNode);

    logger.info('Trinity Node created', { nodeId, role: defaultConfig.role });

    return NextResponse.json({
      success: true,
      nodeId,
      config: defaultConfig,
      status: 'created'
    });

  } catch (error) {
    logger.error('Failed to create Trinity Node:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Failed to create node' },
      { status: 500 }
    );
  }
}

/**
 * REGISTER AGENT WITH TRINITY NODE
 */
async function registerAgentWithNode(
  nodeId: string,
  agentId: string
): Promise<NextResponse> {
  try {
    const node = trinityNodes.get(nodeId);
    if (!node) {
      return NextResponse.json(
        { success: false, error: 'Trinity Node not found' },
        { status: 404 }
      );
    }

    const agent = registeredAgents.get(agentId);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found. Register agent first.' },
        { status: 404 }
      );
    }

    await node.registerAgent(agent);

    return NextResponse.json({
      success: true,
      nodeId,
      agentId,
      status: 'registered'
    });

  } catch (error) {
    logger.error('Failed to register agent with Trinity Node:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Failed to register agent' },
      { status: 500 }
    );
  }
}

/**
 * SUPERVISE AGENT TASK
 */
async function superviseAgentTask(
  nodeId: string,
  agentId: string,
  taskData: any
): Promise<NextResponse> {
  try {
    const node = trinityNodes.get(nodeId);
    if (!node) {
      return NextResponse.json(
        { success: false, error: 'Trinity Node not found' },
        { status: 404 }
      );
    }

    const decision = await node.superviseAgentTask(agentId, taskData);

    return NextResponse.json({
      success: true,
      nodeId,
      agentId,
      decision: {
        ...decision,
        timestamp: decision.timestamp.toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to supervise task:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Task supervision failed' },
      { status: 500 }
    );
  }
}

/**
 * FACILITATE AGENT COLLABORATION
 */
async function facilitateAgentCollaboration(
  nodeId: string,
  collaborationRequest: AgentCollaborationRequest
): Promise<NextResponse> {
  try {
    const node = trinityNodes.get(nodeId);
    if (!node) {
      return NextResponse.json(
        { success: false, error: 'Trinity Node not found' },
        { status: 404 }
      );
    }

    const result = await node.facilitateCollaboration(collaborationRequest);

    return NextResponse.json({
      success: true,
      nodeId,
      collaborationId: collaborationRequest.requestId,
      result
    });

  } catch (error) {
    logger.error('Failed to facilitate collaboration:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Collaboration failed' },
      { status: 500 }
    );
  }
}

/**
 * GET NODE METRICS
 */
async function getNodeMetrics(nodeId: string): Promise<NextResponse> {
  try {
    const node = trinityNodes.get(nodeId);
    if (!node) {
      return NextResponse.json(
        { success: false, error: 'Trinity Node not found' },
        { status: 404 }
      );
    }

    const metrics = await node.getSupervisionStatus();

    return NextResponse.json({
      success: true,
      nodeId,
      metrics
    });

  } catch (error) {
    logger.error('Failed to get node metrics:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Failed to get metrics' },
      { status: 500 }
    );
  }
} 