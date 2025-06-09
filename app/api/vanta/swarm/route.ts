import { NextRequest, NextResponse } from 'next/server';
import { SwarmIntelligence } from '../../../../src/lib/vanta/SwarmIntelligence';
import { TraceMemory } from '../../../../src/lib/vanta/TraceMemory';
import { createLogger } from '../../../../src/utils/logger';

const logger = createLogger('SwarmIntelligenceAPI');

// Global instance
let swarmIntelligence: SwarmIntelligence | null = null;

function getSwarmIntelligence(): SwarmIntelligence {
  if (!swarmIntelligence) {
    const traceMemory = new TraceMemory();
    swarmIntelligence = new SwarmIntelligence(traceMemory);
  }
  return swarmIntelligence;
}

/**
 * GET /api/vanta/swarm - Get swarm status and metrics
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const swarmId = url.searchParams.get('swarmId');

    const swarmSystem = getSwarmIntelligence();

    switch (action) {
      case 'swarm_status':
        if (!swarmId) {
          return NextResponse.json(
            { success: false, error: 'Swarm ID required for swarm status' },
            { status: 400 }
          );
        }
        const swarmStatus = await swarmSystem.getSwarmStatus(swarmId);
        return NextResponse.json({
          success: true,
          swarmId,
          status: swarmStatus
        });

      case 'swarm_metrics':
        if (!swarmId) {
          return NextResponse.json(
            { success: false, error: 'Swarm ID required for swarm metrics' },
            { status: 400 }
          );
        }
        const metrics = await swarmSystem.generateSwarmMetrics(swarmId);
        return NextResponse.json({
          success: true,
          swarmId,
          metrics
        });

      case 'active_swarms':
        const activeSwarms = swarmSystem.getActiveSwarms();
        const swarmList = Array.from(activeSwarms.entries()).map(([id, swarm]) => ({
          swarmId: id,
          participantCount: swarm.participants.length,
          phase: swarm.convergenceState.phase,
          progress: swarm.convergenceState.progress,
          emergentBehaviors: swarm.emergentBehaviors.length,
          lastUpdate: swarm.lastUpdate
        }));
        
        return NextResponse.json({
          success: true,
          totalSwarms: swarmList.length,
          swarms: swarmList
        });

      case 'emergent_behaviors':
        if (!swarmId) {
          return NextResponse.json(
            { success: false, error: 'Swarm ID required for emergent behaviors' },
            { status: 400 }
          );
        }
        const behaviors = await swarmSystem.detectEmergentBehaviors(swarmId);
        return NextResponse.json({
          success: true,
          swarmId,
          behaviors
        });

      case 'symbolic_narrative':
        if (!swarmId) {
          return NextResponse.json(
            { success: false, error: 'Swarm ID required for symbolic narrative' },
            { status: 400 }
          );
        }
        const narrative = await swarmSystem.evolveSymbolicNarrative(swarmId);
        return NextResponse.json({
          success: true,
          swarmId,
          narrative
        });

      default:
        // Default: return overview of all swarms
        const overview = swarmSystem.getActiveSwarms();
        const overviewData = {
          totalSwarms: overview.size,
          activeSwarms: overview.size,
          swarmSummary: Array.from(overview.entries()).map(([id, swarm]) => ({
            swarmId: id,
            participants: swarm.participants.length,
            phase: swarm.convergenceState.phase,
            emergentBehaviors: swarm.emergentBehaviors.length
          }))
        };
        
        return NextResponse.json({
          success: true,
          overview: overviewData
        });
    }

  } catch (error) {
    logger.error('Swarm Intelligence API error:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Swarm Intelligence operation failed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vanta/swarm - Create swarms and coordinate activities
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, agentIds, purpose, coordinatorId, swarmId, objective, eventData } = body;

    const swarmSystem = getSwarmIntelligence();

    switch (action) {
      case 'form_swarm':
        if (!agentIds || !Array.isArray(agentIds) || agentIds.length < 2) {
          return NextResponse.json(
            { success: false, error: 'At least 2 agent IDs required for swarm formation' },
            { status: 400 }
          );
        }
        if (!purpose) {
          return NextResponse.json(
            { success: false, error: 'Purpose required for swarm formation' },
            { status: 400 }
          );
        }

        const newSwarmId = await swarmSystem.formSwarm(agentIds, purpose, coordinatorId);
        return NextResponse.json({
          success: true,
          swarmId: newSwarmId,
          message: 'Swarm formed successfully',
          participants: agentIds.length,
          purpose
        });

      case 'coordinate_activities':
        if (!swarmId) {
          return NextResponse.json(
            { success: false, error: 'Swarm ID required for coordination' },
            { status: 400 }
          );
        }
        if (!objective) {
          return NextResponse.json(
            { success: false, error: 'Objective required for coordination' },
            { status: 400 }
          );
        }

        const coordinationEvent = await swarmSystem.coordinateSwarmActivities(swarmId, objective);
        return NextResponse.json({
          success: true,
          swarmId,
          coordinationEvent,
          message: 'Swarm coordination initiated'
        });

      case 'detect_behaviors':
        if (!swarmId) {
          return NextResponse.json(
            { success: false, error: 'Swarm ID required for behavior detection' },
            { status: 400 }
          );
        }

        const detectedBehaviors = await swarmSystem.detectEmergentBehaviors(swarmId);
        return NextResponse.json({
          success: true,
          swarmId,
          behaviors: detectedBehaviors,
          behaviorCount: detectedBehaviors.length
        });

      case 'evolve_narrative':
        if (!swarmId) {
          return NextResponse.json(
            { success: false, error: 'Swarm ID required for narrative evolution' },
            { status: 400 }
          );
        }

        const evolvedNarrative = await swarmSystem.evolveSymbolicNarrative(swarmId);
        return NextResponse.json({
          success: true,
          swarmId,
          narrative: evolvedNarrative,
          message: 'Symbolic narrative evolved'
        });

      case 'generate_intelligence_report':
        const allSwarms = swarmSystem.getActiveSwarms();
        const reportData = [];

        for (const [id, swarm] of allSwarms.entries()) {
          const metrics = await swarmSystem.generateSwarmMetrics(id);
          const status = await swarmSystem.getSwarmStatus(id);
          
          reportData.push({
            swarmId: id,
            participants: swarm.participants.length,
            phase: swarm.convergenceState.phase,
            progress: swarm.convergenceState.progress,
            emergentBehaviors: swarm.emergentBehaviors.length,
            metrics,
            recentActivity: status.activeEvents.length
          });
        }

        return NextResponse.json({
          success: true,
          reportTimestamp: new Date().toISOString(),
          totalSwarms: reportData.length,
          swarms: reportData,
          summary: {
            totalParticipants: reportData.reduce((sum, s) => sum + s.participants, 0),
            totalEmergentBehaviors: reportData.reduce((sum, s) => sum + s.emergentBehaviors, 0),
            averageProgress: reportData.length > 0 ? 
              reportData.reduce((sum, s) => sum + s.progress, 0) / reportData.length : 0
          }
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Swarm Intelligence POST error:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Swarm Intelligence operation failed' },
      { status: 500 }
    );
  }
} 