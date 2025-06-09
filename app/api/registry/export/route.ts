import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('RegistryExportAPI');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const type = searchParams.get('type') || 'all';

    logger.info('Registry export requested', { format, type });

    // Generate registry data
    const registryData = await generateRegistryData(type);

    if (format === 'csv') {
      const csv = convertToCSV(registryData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="registry-export-${Date.now()}.csv"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: registryData,
      exportTime: new Date().toISOString(),
      format,
      type
    });

  } catch (error) {
    logger.error('Registry export failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: 'Export failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'schedule_export':
        return await scheduleExport(data);
      
      case 'bulk_export':
        return await bulkExport(data);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Registry export operation failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: 'Operation failed' },
      { status: 500 }
    );
  }
}

async function generateRegistryData(type: string) {
  // Simulate registry data - in real app this would come from database
  const baseData = {
    agents: [
      { id: 'agent_001', name: 'Secret Scanner', type: 'scanner', status: 'active', lastSeen: new Date() },
      { id: 'agent_002', name: 'Vault Manager', type: 'vault', status: 'active', lastSeen: new Date() },
      { id: 'agent_003', name: 'Discovery Agent', type: 'discovery', status: 'idle', lastSeen: new Date() }
    ],
    secrets: [
      { id: 'secret_001', key: 'API_KEY', environment: 'production', lastAccessed: new Date() },
      { id: 'secret_002', key: 'DB_PASSWORD', environment: 'staging', lastAccessed: new Date() }
    ],
    projects: [
      { id: 'proj_001', name: 'Web App', path: '/projects/webapp', lastScan: new Date() },
      { id: 'proj_002', name: 'API Service', path: '/projects/api', lastScan: new Date() }
    ]
  };

  switch (type) {
    case 'agents':
      return { agents: baseData.agents };
    case 'secrets':
      return { secrets: baseData.secrets };
    case 'projects':
      return { projects: baseData.projects };
    default:
      return baseData;
  }
}

function convertToCSV(data: any): string {
  const items = [];
  
  if (data.agents) {
    items.push('Type,ID,Name,Status,Last Seen');
    data.agents.forEach(agent => {
      items.push(`agent,${agent.id},${agent.name},${agent.status},${agent.lastSeen}`);
    });
  }
  
  if (data.secrets) {
    items.push('Type,ID,Key,Environment,Last Accessed');
    data.secrets.forEach(secret => {
      items.push(`secret,${secret.id},${secret.key},${secret.environment},${secret.lastAccessed}`);
    });
  }
  
  if (data.projects) {
    items.push('Type,ID,Name,Path,Last Scan');
    data.projects.forEach(project => {
      items.push(`project,${project.id},${project.name},${project.path},${project.lastScan}`);
    });
  }
  
  return items.join('\n');
}

async function scheduleExport(data: any) {
  // Implement scheduled export logic
  return NextResponse.json({
    success: true,
    message: 'Export scheduled successfully',
    scheduledFor: data.scheduleTime
  });
}

async function bulkExport(data: any) {
  // Implement bulk export logic
  return NextResponse.json({
    success: true,
    message: 'Bulk export completed',
    exported: data.items?.length || 0
  });
} 