import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

export async function GET(request: NextRequest) {
  try {
    console.log('Domino governance list request received');

    // Read governance decisions from file
    const governanceFile = 'vault/domino_governance.json';
    let governanceData: any[] = [];

    if (existsSync(governanceFile)) {
      try {
        const content = await readFile(governanceFile, 'utf-8');
        governanceData = JSON.parse(content);
      } catch (error) {
        console.log('No existing governance data found, starting fresh');
      }
    }

    return NextResponse.json({
      success: true,
      data: governanceData,
      count: governanceData.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Domino governance list error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to load governance decisions',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auditId, decision, comment, decidedBy = 'system' } = body;

    if (!auditId || !decision) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'auditId and decision are required' 
        },
        { status: 400 }
      );
    }

    console.log(`Recording governance decision for audit ${auditId}: ${decision}`);

    // Read existing governance decisions
    const governanceFile = 'vault/domino_governance.json';
    let governanceData: any[] = [];

    if (existsSync(governanceFile)) {
      try {
        const content = await readFile(governanceFile, 'utf-8');
        governanceData = JSON.parse(content);
      } catch (error) {
        console.log('No existing governance data found, starting fresh');
      }
    }

    // Create new governance decision
    const governanceDecision = {
      id: `gov_${Date.now()}`,
      auditId,
      decision,
      comment: comment || '',
      decidedBy,
      decidedAt: new Date().toISOString(),
      status: 'recorded'
    };

    // Add to governance data
    governanceData.push(governanceDecision);

    // Write back to file
    await writeFile(governanceFile, JSON.stringify(governanceData, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: `Governance decision recorded for audit ${auditId}`,
      data: governanceDecision,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Domino governance decision error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to record governance decision',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 