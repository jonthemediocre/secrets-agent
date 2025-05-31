import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

// In-memory storage for audit sessions (in production, use a database)
const auditSessions = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      projectPath = '.', 
      platforms = ['web', 'cli', 'vscode', 'windows'],
      governance = true,
      maxIterations = 10,
      coverageThreshold = 0.90,
      enableRL = false,
      dryRun = false
    } = body;

    console.log('Starting domino audit with params:', { projectPath, platforms, governance });

    // Generate audit ID
    const auditId = uuidv4();

    // Build CLI command
    const platformsStr = platforms.join(',');
    const cliCommand = [
      'python cli_enhanced.py domino audit',
      `--project-path "${projectPath}"`,
      `--max-iterations ${maxIterations}`,
      `--platforms "${platformsStr}"`,
      `--coverage-threshold ${coverageThreshold}`,
      governance ? '--governance' : '',
      enableRL ? '--enable-rl' : '',
      dryRun ? '--dry-run' : ''
    ].filter(Boolean).join(' ');

    console.log('Executing domino audit command:', cliCommand);

    // Start the audit process (non-blocking)
    const auditPromise = execAsync(cliCommand, {
      timeout: 300000, // 5 minutes timeout
      cwd: process.cwd()
    });

    // Don't wait for completion, return immediately with audit ID
    auditPromise.then((result) => {
      console.log(`Domino audit ${auditId} completed successfully`);
      console.log('Audit output:', result.stdout);
    }).catch((error) => {
      console.error(`Domino audit ${auditId} failed:`, error);
    });

    // Return audit started response
    return NextResponse.json({
      success: true,
      auditId,
      status: 'started',
      message: 'Domino audit initiated successfully',
      parameters: {
        projectPath,
        platforms,
        governance,
        maxIterations,
        coverageThreshold,
        enableRL,
        dryRun
      },
      estimatedDuration: '2-5 minutes',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Domino audit start error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to start domino audit',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 