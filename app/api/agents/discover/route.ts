import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '../../../../src/utils/logger';
import AgentBridge from '../../../../src/services/AgentBridge';

const logger = createLogger('AgentsDiscoveryAPI');

// Initialize the agent bridge
const agentBridge = new AgentBridge();

interface DiscoveryResult {
  projectsScanned: number;
  secretsFound: number;
  credentialsExtracted: number;
  servicesDiscovered: number;
  automation: {
    level: string;
    confidence: number;
    timeReduction: number;
  };
  discoveries: Array<{
    type: string;
    service: string;
    location: string;
    risk: 'low' | 'medium' | 'high' | 'critical';
  }>;
  recommendations: string[];
}

interface AgentStatus {
  agentSystemStatus: string;
  lastDiscovery: string;
  nextScheduledScan: string;
  activeAgents: Array<{
    id: string;
    status: string;
    confidence: number;
  }>;
  statistics: {
    totalProjectsMonitored: number;
    secretsManaged: number;
    automationLevel: number;
    lastVacuumOperation: string;
  };
}

// POST /api/agents/discover - Trigger agent-based secret discovery
export async function POST(request: NextRequest) {
  try {
    logger.info('Starting real agent-based secret discovery');

    // Execute real discovery using the agent system
    const discoveryResult = await agentBridge.executeRealDiscovery();

    // Auto-import discovered secrets if a vault is available
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      // Find the first available vault for auto-import
      const vault = await prisma.vault.findFirst();
      
      if (vault && discoveryResult.discoveries.length > 0) {
        const importedCount = await agentBridge.autoImportSecrets(
          discoveryResult.discoveries, 
          vault.id
        );
        
        logger.info(`Auto-imported ${importedCount} secrets to vault ${vault.name}`);
        
        // Add import info to the response
        discoveryResult.recommendations.push(
          `Automatically imported ${importedCount} secrets to vault "${vault.name}"`
        );
      }
    } catch (importError) {
      logger.warn('Failed to auto-import secrets:', importError);
    }

    logger.info('Real agent discovery completed', {
      projectsScanned: discoveryResult.projectsScanned,
      secretsFound: discoveryResult.secretsFound,
      automationLevel: discoveryResult.automation.level
    });

    return NextResponse.json({
      success: true,
      data: discoveryResult,
      message: 'Real agent discovery completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Real agent discovery failed', {
      error: error instanceof Error ? error.message : error
    });

    return NextResponse.json(
      {
        error: 'Agent discovery failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET /api/agents/discover - Get agent discovery status
export async function GET(request: NextRequest) {
  try {
    logger.info('Fetching agent discovery status');

    // Mock agent status data
    const agentStatus: AgentStatus = {
      agentSystemStatus: 'Active',
      lastDiscovery: '2 hours ago',
      nextScheduledScan: 'In 4 hours',
      activeAgents: [
        {
          id: 'scanner-001',
          status: 'scanning',
          confidence: 92
        },
        {
          id: 'analyzer-002',
          status: 'idle',
          confidence: 88
        },
        {
          id: 'harvester-003',
          status: 'processing',
          confidence: 95
        }
      ],
      statistics: {
        totalProjectsMonitored: 93,
        secretsManaged: 247,
        automationLevel: 85,
        lastVacuumOperation: '6 hours ago'
      }
    };

    logger.info('Agent discovery status compiled successfully', { agentStatus });

    return NextResponse.json({
      success: true,
      data: agentStatus
    });

  } catch (error) {
    logger.error('Failed to fetch agent discovery status', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agent status' },
      { status: 500 }
    );
  }
} 