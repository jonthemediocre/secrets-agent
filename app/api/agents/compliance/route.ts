import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '../../../../src/utils/logger';
import ComplianceAgentService from '../../../../src/services/ComplianceAgentService';

const logger = createLogger('ComplianceAgentAPI');
const complianceService = new ComplianceAgentService();

// POST /api/agents/compliance - Generate compliance report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { framework = 'SOC 2 Type II' } = body;

    logger.info('Generating compliance report', { framework });

    const report = await complianceService.generateComplianceReport(framework);

    return NextResponse.json({
      success: true,
      data: report,
      message: 'Compliance report generated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Compliance report generation failed', {
      error: error instanceof Error ? error.message : error
    });

    return NextResponse.json(
      {
        error: 'Failed to generate compliance report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/agents/compliance - Get supported frameworks
export async function GET() {
  try {
    const frameworks = complianceService.getSupportedFrameworks();

    return NextResponse.json({
      success: true,
      data: {
        frameworks,
        supportedFrameworks: frameworks.map(f => f.name)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get compliance frameworks', {
      error: error instanceof Error ? error.message : error
    });

    return NextResponse.json(
      {
        error: 'Failed to get compliance frameworks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 