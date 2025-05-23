import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ShieldCheckIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ServerIcon,
  DocumentTextIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { createLogger } from '../src/utils/logger';

const logger = createLogger('Dashboard');

interface ProjectStats {
  id: string;
  name: string;
  secretCount: number;
  lastActivity: string;
  status: 'healthy' | 'warning' | 'error';
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memoryUsage: number;
  vaultStatus: 'connected' | 'disconnected';
  lastBackup: string;
}

interface RecentActivity {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  project: string;
  type: 'secret_added' | 'secret_updated' | 'secret_deleted' | 'policy_created' | 'backup_completed';
}

const Dashboard: React.FC = () => {
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock project statistics
        const mockProjects: ProjectStats[] = [
          { id: '1', name: 'Production App', secretCount: 45, lastActivity: '2 hours ago', status: 'healthy' },
          { id: '2', name: 'Staging Environment', secretCount: 32, lastActivity: '1 day ago', status: 'healthy' },
          { id: '3', name: 'Development', secretCount: 28, lastActivity: '3 hours ago', status: 'warning' },
          { id: '4', name: 'Testing Suite', secretCount: 15, lastActivity: '1 week ago', status: 'error' }
        ];
        
        // Mock system health
        const mockHealth: SystemHealth = {
          status: 'healthy',
          uptime: 2592000, // 30 days in seconds
          memoryUsage: 45,
          vaultStatus: 'connected',
          lastBackup: '6 hours ago'
        };
        
        // Mock recent activity
        const mockActivity: RecentActivity[] = [
          { id: '1', action: 'Added API key for payment service', user: 'john.doe', timestamp: '2 hours ago', project: 'Production App', type: 'secret_added' },
          { id: '2', action: 'Updated database credentials', user: 'jane.smith', timestamp: '4 hours ago', project: 'Staging Environment', type: 'secret_updated' },
          { id: '3', action: 'Created rotation policy for OAuth tokens', user: 'admin', timestamp: '1 day ago', project: 'Production App', type: 'policy_created' },
          { id: '4', action: 'Automated backup completed', user: 'system', timestamp: '6 hours ago', project: 'All Projects', type: 'backup_completed' },
          { id: '5', action: 'Removed deprecated SSL certificate', user: 'security.team', timestamp: '2 days ago', project: 'Development', type: 'secret_deleted' }
        ];
        
        setProjectStats(mockProjects);
        setSystemHealth(mockHealth);
        setRecentActivity(mockActivity);
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
        logger.error('Dashboard data loading failed', { error: errorMessage });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'degraded': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'secret_added': return <PlusIcon className="h-4 w-4 text-green-600" />;
      case 'secret_updated': return <Cog6ToothIcon className="h-4 w-4 text-blue-600" />;
      case 'secret_deleted': return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
      case 'policy_created': return <ShieldCheckIcon className="h-4 w-4 text-purple-600" />;
      case 'backup_completed': return <ServerIcon className="h-4 w-4 text-indigo-600" />;
      default: return <DocumentTextIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your secrets.</p>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ServerIcon className="h-5 w-5 mr-2 text-indigo-600" />
              System Health
            </h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(systemHealth.status)}`}>
              {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatUptime(systemHealth.uptime)}</div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{systemHealth.memoryUsage}%</div>
              <div className="text-sm text-gray-600">Memory Usage</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${systemHealth.vaultStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                {systemHealth.vaultStatus === 'connected' ? '●' : '○'}
              </div>
              <div className="text-sm text-gray-600">Vault Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{systemHealth.lastBackup}</div>
              <div className="text-sm text-gray-600">Last Backup</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
            <PlusIcon className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-gray-700 font-medium">Add New Secret</span>
          </button>
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
            <ShieldCheckIcon className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-gray-700 font-medium">Create Rotation Policy</span>
          </button>
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
            <DocumentTextIcon className="h-6 w-6 text-gray-400 mr-2" />
            <span className="text-gray-700 font-medium">Import .env File</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Statistics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-indigo-600" />
              Projects Overview
            </h2>
            <ArrowTrendingUpIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {projectStats.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-600">{project.secretCount} secrets</span>
                    <span className="text-sm text-gray-500">{project.lastActivity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2 text-indigo-600" />
              Recent Activity
            </h2>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">{activity.user}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{activity.project}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{activity.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 