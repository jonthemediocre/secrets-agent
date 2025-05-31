import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface MCPTool {
  name: string;
  description: string;
  category: string;
  status: 'available' | 'error' | 'loading';
  parameters?: any;
  bridge?: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('MCP tools v1 request received');

    const tools: MCPTool[] = [];

    // Try to get tools from VANTA CLI first
    try {
      const { stdout } = await execAsync('python cli_enhanced.py mcp list-tools --no-cache', {
        timeout: 3000,
        cwd: process.cwd()
      });

      // Parse the CLI output to extract tools
      try {
        // Try to parse JSON output first
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const toolsData = JSON.parse(jsonMatch[0]);
          if (toolsData.tools && Array.isArray(toolsData.tools)) {
            tools.push(...toolsData.tools.map((tool: any) => ({
              name: tool.name || 'Unknown Tool',
              description: tool.description || 'No description available',
              category: tool.category || 'general',
              status: 'available' as const,
              parameters: tool.parameters,
              bridge: tool.bridge || 'vanta'
            })));
          }
        } else {
          // Parse table output if JSON not available
          const lines = stdout.split('\n');
          let inTable = false;
          
          for (const line of lines) {
            if (line.includes('Tool Name') || line.includes('---')) {
              inTable = true;
              continue;
            }
            
            if (inTable && line.trim()) {
              const parts = line.split('|').map(p => p.trim()).filter(p => p);
              if (parts.length >= 3) {
                tools.push({
                  name: parts[0] || 'Unknown',
                  description: parts[1] || 'No description',
                  category: parts[2] || 'general',
                  status: 'available',
                  bridge: 'vanta'
                });
              }
            }
          }
        }
      } catch (parseError) {
        console.log('Failed to parse MCP tools output, using fallback');
      }
    } catch (cliError) {
      console.log('CLI command failed, using fallback tools');
    }

    // If no tools found from CLI, add some default ones
    if (tools.length === 0) {
      tools.push(
        {
          name: 'vault-scan',
          description: 'Scan project for secrets and vault configuration',
          category: 'vault',
          status: 'available',
          bridge: 'vanta'
        },
        {
          name: 'secret-rotate',
          description: 'Rotate secrets based on policies',
          category: 'vault',
          status: 'available',
          bridge: 'vanta'
        },
        {
          name: 'domino-audit',
          description: 'Run cross-platform feature parity audit',
          category: 'governance',
          status: 'available',
          bridge: 'vanta'
        },
        {
          name: 'project-analyze',
          description: 'Analyze project structure and dependencies',
          category: 'analysis',
          status: 'available',
          bridge: 'vanta'
        }
      );
    }

    console.log(`Found ${tools.length} MCP tools`);

    // Return in the format expected by both CLI and frontend
    return NextResponse.json({
      success: true,
      tools,
      data: {
        tools,
        cached: false,
        timestamp: new Date().toISOString()
      },
      count: tools.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('MCP tools v1 error:', error);
    
    // Return fallback tools even on error
    const fallbackTools: MCPTool[] = [
      {
        name: 'vault-status',
        description: 'Check vault status (fallback mode)',
        category: 'vault',
        status: 'error',
        bridge: 'vanta'
      },
      {
        name: 'mcp-bridge',
        description: 'MCP bridge connection (offline)',
        category: 'system',
        status: 'error',
        bridge: 'vanta'
      }
    ];

    return NextResponse.json({
      success: false,
      tools: fallbackTools,
      data: {
        tools: fallbackTools,
        cached: false,
        timestamp: new Date().toISOString()
      },
      count: fallbackTools.length,
      error: 'Failed to load MCP tools',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 