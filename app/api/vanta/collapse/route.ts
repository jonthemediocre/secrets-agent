import { NextRequest, NextResponse } from 'next/server';
import { CollapseEvaluation } from '../../../../src/lib/vanta/CollapseEvaluation';
import { TraceMemory } from '../../../../src/lib/vanta/TraceMemory';
import { createLogger } from '../../../../src/utils/logger';

const logger = createLogger('CollapseEvaluationAPI');

// Global instance
let collapseEvaluation: CollapseEvaluation | null = null;

function getCollapseEvaluation(): CollapseEvaluation {
  if (!collapseEvaluation) {
    const traceMemory = new TraceMemory();
    collapseEvaluation = new CollapseEvaluation(traceMemory);
  }
  return collapseEvaluation;
}

/**
 * GET /api/vanta/collapse - Get system stability report
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const agentId = url.searchParams.get('agentId');

    const evaluation = getCollapseEvaluation();

    switch (action) {
      case 'system_report':
        const systemReport = await evaluation.generateSystemStabilityReport();
        return NextResponse.json({
          success: true,
          report: systemReport
        });

      case 'agent_stability':
        if (!agentId) {
          return NextResponse.json(
            { success: false, error: 'Agent ID required for agent stability check' },
            { status: 400 }
          );
        }
        const agentMetrics = await evaluation.evaluateAgentStability(agentId);
        return NextResponse.json({
          success: true,
          agentId,
          metrics: agentMetrics
        });

      case 'predict_collapse':
        if (!agentId) {
          return NextResponse.json(
            { success: false, error: 'Agent ID required for collapse prediction' },
            { status: 400 }
          );
        }
        const predictors = await evaluation.predictCollapseRisk(agentId);
        return NextResponse.json({
          success: true,
          agentId,
          predictors
        });

      default:
        // Default: return system stability report
        const defaultReport = await evaluation.generateSystemStabilityReport();
        return NextResponse.json({
          success: true,
          report: defaultReport
        });
    }

  } catch (error) {
    logger.error('Collapse evaluation API error:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Collapse evaluation failed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vanta/collapse - Trigger stability evaluation or handle collapse events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, agentId, eventData } = body;

    const evaluation = getCollapseEvaluation();

    switch (action) {
      case 'evaluate_stability':
        if (!agentId) {
          return NextResponse.json(
            { success: false, error: 'Agent ID required' },
            { status: 400 }
          );
        }

        const metrics = await evaluation.evaluateAgentStability(agentId);
        return NextResponse.json({
          success: true,
          agentId,
          metrics,
          evaluationTime: new Date().toISOString()
        });

      case 'handle_collapse_event':
        if (!eventData) {
          return NextResponse.json(
            { success: false, error: 'Event data required' },
            { status: 400 }
          );
        }

        await evaluation.handleCollapseEvent(eventData);
        return NextResponse.json({
          success: true,
          message: 'Collapse event handled',
          eventId: eventData.eventId
        });

      case 'force_stability_check':
        const systemReport = await evaluation.generateSystemStabilityReport();
        const unstableAgents = [];
        
        for (const [agentId, stability] of systemReport.agentStabilities.entries()) {
          if (stability < 0.7) {
            const agentMetrics = await evaluation.evaluateAgentStability(agentId);
            unstableAgents.push({
              agentId,
              stability,
              metrics: agentMetrics
            });
          }
        }

        return NextResponse.json({
          success: true,
          systemStability: systemReport.overallStability,
          riskLevel: systemReport.riskLevel,
          unstableAgents,
          recommendations: systemReport.recommendations
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Collapse evaluation POST error:', error as Record<string, any>);
    return NextResponse.json(
      { success: false, error: 'Collapse evaluation operation failed' },
      { status: 500 }
    );
  }
} 