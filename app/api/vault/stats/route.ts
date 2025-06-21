import { NextRequest, NextResponse } from 'next/server';

interface VaultStats {
  activeAgents: number;
  secretsManaged: number;
  systemHealth: number;
  integrations: number;
  totalConnections: number;
  dataTransferred: number;
  apiCalls: number;
  uptime: string;
  lastSync: string;
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    timestamp: string;
  }>;
  recentActivity: Array<{
    id: string;
    user: string;
    action: string;
    resource: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
  }>;
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
  trends: {
    agentsGrowth: number;
    secretsGrowth: number;
    healthTrend: number;
    integrationsGrowth: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Simulate realistic data with some variation
    const stats: VaultStats = {
      activeAgents: 24 + Math.floor(Math.random() * 3),
      secretsManaged: 1247 + Math.floor(Math.random() * 50),
      systemHealth: 98 + Math.floor(Math.random() * 2),
      integrations: 16 + Math.floor(Math.random() * 2),
      totalConnections: 156 + Math.floor(Math.random() * 20),
      dataTransferred: 45.2 + Math.random() * 5,
      apiCalls: 234 + Math.floor(Math.random() * 50),
      uptime: '99.9%',
      lastSync: '2 minutes ago',
      alerts: [
        {
          id: '1',
          type: 'success',
          message: 'AWS integration successfully deployed',
          timestamp: '2 minutes ago'
        },
        {
          id: '2',
          type: 'warning',
          message: 'SSL certificate expiring in 7 days',
          timestamp: '1 hour ago'
        },
        {
          id: '3',
          type: 'info',
          message: 'New team member added to vault access',
          timestamp: '3 hours ago'
        }
      ],
      recentActivity: [
        {
          id: '1',
          user: 'John Doe',
          action: 'Created secret',
          resource: 'AWS_ACCESS_KEY',
          timestamp: '5 minutes ago',
          status: 'success'
        },
        {
          id: '2',
          user: 'Jane Smith',
          action: 'Updated integration',
          resource: 'GitHub Connection',
          timestamp: '15 minutes ago',
          status: 'success'
        },
        {
          id: '3',
          user: 'Mike Johnson',
          action: 'Deployed agent',
          resource: 'Security Scanner',
          timestamp: '1 hour ago',
          status: 'success'
        },
        {
          id: '4',
          user: 'Sarah Wilson',
          action: 'Rotated secret',
          resource: 'DATABASE_PASSWORD',
          timestamp: '2 hours ago',
          status: 'warning'
        },
        {
          id: '5',
          user: 'System',
          action: 'Auto-backup',
          resource: 'Vault Data',
          timestamp: '4 hours ago',
          status: 'success'
        }
      ],
      performance: {
        cpuUsage: 45 + Math.floor(Math.random() * 20),
        memoryUsage: 62 + Math.floor(Math.random() * 15),
        diskUsage: 38 + Math.floor(Math.random() * 10),
        networkLatency: 23 + Math.floor(Math.random() * 10)
      },
      trends: {
        agentsGrowth: 12,
        secretsGrowth: 8,
        healthTrend: 2,
        integrationsGrowth: 15
      }
    };

    // Add cache headers for performance
    const response = NextResponse.json(stats);
    response.headers.set('Cache-Control', 's-maxage=30, stale-while-revalidate');
    
    return response;
  } catch (error) {
    console.error('Error fetching vault stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vault stats' },
      { status: 500 }
    );
  }
}

export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
} 