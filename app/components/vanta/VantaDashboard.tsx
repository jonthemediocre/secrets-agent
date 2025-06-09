'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Brain, 
  Shield, 
  Activity, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Zap,
  Network,
  Eye,
  Settings
} from 'lucide-react';

interface VantaStatus {
  status: 'healthy' | 'warning' | 'error' | 'initializing';
  framework: {
    version: string;
    uptime: number;
    adapters: {
      integration: { status: string; lastActivity: string };
      automation: { status: string; lastActivity: string };
      analysis: { status: string; lastActivity: string };
      multiDomain: { status: string; lastActivity: string };
    };
    traceMemory: {
      status: string;
      encryptionEnabled: boolean;
      totalTraces: number;
      storageUsed: string;
    };
  };
  agents: {
    active: number;
    total: number;
    performance: {
      averageResponseTime: number;
      successRate: number;
      tasksCompleted: number;
    };
  };
  security: {
    riskScore: number;
    anomaliesDetected: number;
    complianceScore: number;
    threatLevel: string;
  };
  swarm: {
    activeSwarms: number;
    collaborationScore: number;
    emergentBehaviors: number;
    knowledgeTransfers: number;
  };
}

interface VantaMetrics {
  performance: {
    cpu: number;
    memory: number;
    responseTime: number;
    throughput: number;
  };
  security: {
    riskTrend: number[];
    anomalyTrend: number[];
    complianceTrend: number[];
  };
  agents: {
    activeTasks: number;
    queuedTasks: number;
    completedTasks: number;
    errorRate: number;
  };
}

export default function VantaDashboard() {
  const [vantaStatus, setVantaStatus] = useState<VantaStatus | null>(null);
  const [vantaMetrics, setVantaMetrics] = useState<VantaMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVantaData = async () => {
    try {
      setRefreshing(true);
      
      // Fetch status
      const statusResponse = await fetch('/api/vanta?action=status');
      const statusData = await statusResponse.json();
      
      // Fetch metrics
      const metricsResponse = await fetch('/api/vanta?action=metrics');
      const metricsData = await metricsResponse.json();
      
      setVantaStatus(statusData);
      setVantaMetrics(metricsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch VANTA data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVantaData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchVantaData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'initializing': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'error': return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case 'initializing': return <Badge className="bg-blue-100 text-blue-800">Initializing</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading VANTA Framework...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">VANTA Framework Error</AlertTitle>
        <AlertDescription className="text-red-700">
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchVantaData}
            className="ml-4"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!vantaStatus) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800">VANTA Framework Unavailable</AlertTitle>
        <AlertDescription className="text-yellow-700">
          The VANTA Framework is not responding. Please check the system status.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">VANTA Framework</h1>
            <p className="text-gray-600">Universal Agentic Intelligence Dashboard</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(vantaStatus.status)}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchVantaData}
            disabled={refreshing}
          >
            {refreshing ? (
              <Activity className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Shield className={`h-4 w-4 ${getStatusColor(vantaStatus.status)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vantaStatus.status.toUpperCase()}</div>
            <p className="text-xs text-muted-foreground">
              Uptime: {formatUptime(vantaStatus.framework.uptime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vantaStatus.agents.active}</div>
            <p className="text-xs text-muted-foreground">
              {vantaStatus.agents.performance.successRate * 100}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <TrendingUp className={`h-4 w-4 ${getThreatLevelColor(vantaStatus.security.threatLevel)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(vantaStatus.security.complianceScore * 100)}%</div>
            <p className="text-xs text-muted-foreground">
              Threat Level: {vantaStatus.security.threatLevel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Swarm Intelligence</CardTitle>
            <Network className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vantaStatus.swarm.activeSwarms}</div>
            <p className="text-xs text-muted-foreground">
              {vantaStatus.swarm.emergentBehaviors} emergent behaviors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="swarm">Swarm</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Framework Adapters</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(vantaStatus.framework.adapters).map(([name, adapter]) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        adapter.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <span className="capitalize">{name}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {adapter.lastActivity}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Trace Memory</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <Badge className={
                    vantaStatus.framework.traceMemory.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }>
                    {vantaStatus.framework.traceMemory.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Encryption</span>
                  <div className="flex items-center space-x-1">
                    {vantaStatus.framework.traceMemory.encryptionEnabled ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">
                      {vantaStatus.framework.traceMemory.encryptionEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Traces</span>
                  <span className="font-mono">{vantaStatus.framework.traceMemory.totalTraces.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Storage Used</span>
                  <span className="font-mono">{vantaStatus.framework.traceMemory.storageUsed}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Agent Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Response Time</span>
                    <span>{vantaStatus.agents.performance.averageResponseTime}ms</span>
                  </div>
                  <Progress value={Math.min(100, (1000 - vantaStatus.agents.performance.averageResponseTime) / 10)} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span>{(vantaStatus.agents.performance.successRate * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={vantaStatus.agents.performance.successRate * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tasks Completed</span>
                    <span>{vantaStatus.agents.performance.tasksCompleted.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {vantaStatus.agents.active}/{vantaStatus.agents.total}
                  </div>
                  <p className="text-sm text-gray-600">Active / Total Agents</p>
                </div>
                {vantaMetrics && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Active Tasks</span>
                      <span>{vantaMetrics.agents.activeTasks}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Queued Tasks</span>
                      <span>{vantaMetrics.agents.queuedTasks}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Error Rate</span>
                      <span>{(vantaMetrics.agents.errorRate * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getThreatLevelColor(vantaStatus.security.threatLevel)}`}>
                    {Math.round(vantaStatus.security.riskScore * 100)}%
                  </div>
                  <p className="text-sm text-gray-600">Overall Risk Score</p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Threat Level</span>
                    <Badge className={`${getThreatLevelColor(vantaStatus.security.threatLevel)}`}>
                      {vantaStatus.security.threatLevel.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Anomaly Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {vantaStatus.security.anomaliesDetected}
                  </div>
                  <p className="text-sm text-gray-600">Anomalies Detected</p>
                </div>
                <div className="mt-4">
                  <Alert className={
                    vantaStatus.security.anomaliesDetected > 0 
                      ? "border-orange-200 bg-orange-50" 
                      : "border-green-200 bg-green-50"
                  }>
                    <AlertTriangle className={`h-4 w-4 ${
                      vantaStatus.security.anomaliesDetected > 0 ? 'text-orange-600' : 'text-green-600'
                    }`} />
                    <AlertDescription className={
                      vantaStatus.security.anomaliesDetected > 0 ? 'text-orange-700' : 'text-green-700'
                    }>
                      {vantaStatus.security.anomaliesDetected > 0 
                        ? 'Security anomalies require attention'
                        : 'No security anomalies detected'
                      }
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {Math.round(vantaStatus.security.complianceScore * 100)}%
                  </div>
                  <p className="text-sm text-gray-600">Compliance Score</p>
                </div>
                <div className="mt-4 space-y-2">
                  <Progress value={vantaStatus.security.complianceScore * 100} />
                  <p className="text-xs text-gray-500 text-center">
                    SOX, GDPR, PCI-DSS Compliance
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="swarm" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Swarm Intelligence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {vantaStatus.swarm.activeSwarms}
                    </div>
                    <p className="text-sm text-gray-600">Active Swarms</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(vantaStatus.swarm.collaborationScore * 100)}%
                    </div>
                    <p className="text-sm text-gray-600">Collaboration</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Emergent Behaviors</span>
                    <span>{vantaStatus.swarm.emergentBehaviors}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Knowledge Transfers</span>
                    <span>{vantaStatus.swarm.knowledgeTransfers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Collective Intelligence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-blue-200 bg-blue-50">
                    <Network className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800">Multi-Domain Coordination</AlertTitle>
                    <AlertDescription className="text-blue-700">
                      Agents are collaborating across domains to optimize security operations.
                    </AlertDescription>
                  </Alert>
                  <div className="text-sm text-gray-600">
                    <p>• Cross-domain task coordination active</p>
                    <p>• Swarm decision making enabled</p>
                    <p>• Knowledge transfer protocols running</p>
                    <p>• Emergent behavior monitoring active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {vantaMetrics && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>CPU Usage</span>
                        <span>{vantaMetrics.performance.cpu}%</span>
                      </div>
                      <Progress value={vantaMetrics.performance.cpu} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Memory Usage</span>
                        <span>{vantaMetrics.performance.memory}%</span>
                      </div>
                      <Progress value={vantaMetrics.performance.memory} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Throughput</span>
                        <span>{vantaMetrics.performance.throughput} ops/sec</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Framework Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Version</span>
                    <span className="font-mono">{vantaStatus.framework.version}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Build</span>
                    <span className="font-mono">secrets-agent-integration</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Uptime</span>
                    <span>{formatUptime(vantaStatus.framework.uptime)}</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    VANTA Framework provides universal agentic intelligence capabilities 
                    for enterprise secrets management with AI-powered security analytics, 
                    swarm intelligence, and autonomous operations.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 