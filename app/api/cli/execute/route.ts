import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

interface CLIExecuteRequest {
  command: string;
  parameters: Record<string, string>;
  category: string;
}

export async function POST(request: NextRequest) {
  try {
    const { command, parameters, category }: CLIExecuteRequest = await request.json();
    
    // Security: Validate command against allowed commands
    const allowedCommands = [
      'bootstrap', 'link', 'sync_shared_resources',
      'vault_rotate', 'vault_backup', 'vault_restore', 
      'mcp_start', 'mcp_stop', 'mcp_status',
      'domino_audit', 'domino_approve', 'domino_policy'
    ];
    
    if (!allowedCommands.includes(command)) {
      return NextResponse.json(
        { error: 'Command not allowed', command },
        { status: 403 }
      );
    }
    
    // Build CLI command with parameters
    const cliArgs = buildCLIArgs(command, parameters, category);
    
    // Execute CLI command
    const result = await executeCLICommand(cliArgs);
    
    return NextResponse.json({
      success: true,
      command,
      category,
      output: result.output,
      exitCode: result.exitCode,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('CLI execution error:', error);
    return NextResponse.json(
      { 
        error: 'CLI execution failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

function buildCLIArgs(command: string, parameters: Record<string, string>, category: string): string[] {
  const baseArgs = ['python', 'cli_enhanced.py'];
  
  // Map commands to CLI structure
  switch (category) {
    case 'admin':
      baseArgs.push('admin', command);
      break;
    case 'vault':
      baseArgs.push('vault', command.replace('vault_', ''));
      break;
    case 'mcp':
      baseArgs.push('mcp', command.replace('mcp_', ''));
      break;
    case 'domino':
      baseArgs.push('domino', command.replace('domino_', ''));
      break;
    default:
      baseArgs.push(command);
  }
  
  // Add parameters as CLI flags
  Object.entries(parameters).forEach(([key, value]) => {
    if (value && value.trim()) {
      baseArgs.push(`--${key.replace(/_/g, '-')}`, value);
    }
  });
  
  return baseArgs;
}

async function executeCLICommand(args: string[]): Promise<{ output: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(args[0], args.slice(1), {
      cwd: process.cwd(),
      stdio: 'pipe',
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      const finalOutput = output || errorOutput || `Command completed with exit code ${code}`;
      resolve({
        output: finalOutput,
        exitCode: code || 0
      });
    });
    
    child.on('error', (error) => {
      reject(new Error(`Failed to execute command: ${error.message}`));
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      child.kill();
      reject(new Error('Command execution timed out'));
    }, 30000);
  });
}

// GET endpoint to list available CLI commands
export async function GET() {
  try {
    const commands = {
      admin: [
        { name: 'bootstrap', description: 'Initialize new project', parameters: ['project_name', 'template'] },
        { name: 'link', description: 'Link environments', parameters: ['source_env', 'target_env'] },
        { name: 'sync_shared_resources', description: 'Sync resources', parameters: ['resource_type'] }
      ],
      vault: [
        { name: 'vault_rotate', description: 'Rotate secrets', parameters: ['secret_path', 'policy'] },
        { name: 'vault_backup', description: 'Backup vault', parameters: ['location'] },
        { name: 'vault_restore', description: 'Restore vault', parameters: ['backup_file'] }
      ],
      mcp: [
        { name: 'mcp_start', description: 'Start MCP server', parameters: ['config'] },
        { name: 'mcp_stop', description: 'Stop MCP server', parameters: ['server_id'] },
        { name: 'mcp_status', description: 'Get MCP status', parameters: [] }
      ],
      domino: [
        { name: 'domino_audit', description: 'Run security audit', parameters: ['scope'] },
        { name: 'domino_approve', description: 'Process approvals', parameters: ['request_id'] },
        { name: 'domino_policy', description: 'Manage policies', parameters: ['policy_name'] }
      ]
    };
    
    return NextResponse.json({
      success: true,
      commands,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list commands' },
      { status: 500 }
    );
  }
} 