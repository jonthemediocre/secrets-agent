import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { auditId: string } }
) {
  try {
    const { auditId } = params;
    const body = await request.json();
    const { approved, comment = '' } = body;

    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid governance decision. "approved" must be a boolean value.'
        },
        { status: 400 }
      );
    }

    // Log governance decision
    console.log('Domino governance decision:', { 
      auditId, 
      approved, 
      comment,
      timestamp: new Date().toISOString()
    });

    // Determine impact based on decision
    const impact = {
      nextPhase: approved ? 'DOCUMENT_AND_BIND' : 'STRUCTURE',
      estimatedTime: approved ? '5-10 minutes' : '15-20 minutes',
      reasoning: approved 
        ? 'Proceeding to finalization phase with approved changes'
        : 'Returning to structure phase for revisions based on governance feedback'
    };

    return NextResponse.json({
      success: true,
      data: {
        auditId,
        decision: approved ? 'APPROVED' : 'DENIED',
        comment,
        timestamp: new Date().toISOString(),
        message: `Governance decision recorded: ${approved ? 'APPROVED' : 'DENIED'}`,
        impact
      }
    });

  } catch (error) {
    console.error('Domino governance error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process governance decision',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 