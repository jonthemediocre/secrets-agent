'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  PlayIcon,
  StopIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BoltIcon,
  UsersIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface SystemInsights {
  networkHealth: {
    overall: 'healthy' | 'degraded' | 'critical';
    agentCount: number;
    onlineAgents: number;
    systemLoad: number;
  };
  performance: {
    totalTasksProcessed: number;
    averageTaskTime: number;
    systemThroughput: number;
    errorRate: number;
  };
  capabilities: {
    totalCapabilities: number;
    availableModels: number;
    bottlenecks: string[];
    recommendations: string[];
  };
  security: {
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    activeIncidents: number;
    vulnerabilities: string[];
    mitigations: string[];
  };
}

interface OrchestratorStatus {
  status: 'running' | 'stopped' | 'initializing';
  insights?: SystemInsights;
  timestamp: string;
}

export default function OrchestratorPage() {
  const [orchestratorStatus, setOrchestratorStatus] = useState<OrchestratorStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeOperations, setActiveOperations] = useState<string[]>([]);

  // Fetch orchestrator status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/agents/orchestrator');
      const data = await response.json();
      
      if (data.success) {
        setOrchestratorStatus(data.data);
        setError(null);
      } else {
        setOrchestratorStatus({ status: 'stopped', timestamp: new Date().toISOString() });
      }
    } catch (err) {
      setError('Failed to fetch orchestrator status');
      setOrchestratorStatus({ status: 'stopped', timestamp: new Date().toISOString() });
    }
  };

  // Initialize orchestrator
  const initializeOrchestrator = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/agents/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' })
      });

      const data = await response.json();
      
      if (data.success) {
        setOrchestratorStatus(data.data);
        await fetchStatus(); // Refresh status
      } else {
        setError(data.message || 'Failed to initialize orchestrator');
      }
    } catch (err) {
      setError('Failed to initialize orchestrator');
    } finally {
      setIsLoading(false);
    }
  };

  // Shutdown orchestrator
  const shutdownOrchestrator = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/agents/orchestrator', {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setOrchestratorStatus({ status: 'stopped', timestamp: new Date().toISOString() });
      } else {
        setError(data.message || 'Failed to shutdown orchestrator');
      }
    } catch (err) {
      setError('Failed to shutdown orchestrator');
    } finally {
      setIsLoading(false);
    }
  };

  // Execute distributed secret analysis
  const executeDistributedAnalysis = async () => {
    const operationId = 'distributed-analysis';
    setActiveOperations(prev => [...prev, operationId]);
    
    try {
      const response = await fetch('/api/agents/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_secrets_distributed',
          secrets: [
            { value: 'demo-api-key-123', type: 'api_key', location: 'config.json' },
            { value: 'sk-demo-openai-key', type: 'openai_key', location: '.env' }
          ],
          analysis: {
            depth: 'comprehensive',
            parallelization: 'aggressive',
            redundancy: 3
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Distributed Analysis Complete!\nConfidence: ${(data.data.confidence * 100).toFixed(1)}%\nAgents: ${data.data.collaborationMetrics.agentsInvolved.length}`);
      } else {
        setError(data.message || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to execute distributed analysis');
    } finally {
      setActiveOperations(prev => prev.filter(id => id !== operationId));
    }
  };

  // Execute threat detection with consensus
  const executeConsensusDetection = async () => {
    const operationId = 'consensus-detection';
    setActiveOperations(prev => [...prev, operationId]);
    
    try {
      const response = await fetch('/api/agents/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'detect_threats_consensus'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Threat Detection Complete!\nConfidence: ${(data.data.confidence * 100).toFixed(1)}%\nThreats Found: ${data.data.output?.threats?.length || 0}`);
      } else {
        setError(data.message || 'Threat detection failed');
      }
    } catch (err) {
      setError('Failed to execute threat detection');
    } finally {
      setActiveOperations(prev => prev.filter(id => id !== operationId));
    }
  };

  // Execute multi-framework compliance
  const executeMultiCompliance = async () => {
    const operationId = 'multi-compliance';
    setActiveOperations(prev => [...prev, operationId]);
    
    try {
      const response = await fetch('/api/agents/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compliance_multi_framework',
          frameworks: ['SOC 2 Type II', 'ISO 27001', 'GDPR', 'HIPAA']
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Multi-Framework Compliance Complete!\nFrameworks: ${data.data.frameworks}\nSuccess Rate: ${((data.data.summary.successful / data.data.summary.totalChecks) * 100).toFixed(1)}%`);
      } else {
        setError(data.message || 'Compliance check failed');
      }
    } catch (err) {
      setError('Failed to execute compliance check');
    } finally {
      setActiveOperations(prev => prev.filter(id => id !== operationId));
    }
  };

  // Auto-refresh status
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">UAP-MCP Agent Orchestrator</h1>
          <p className="text-muted-foreground">
            Advanced multi-agent coordination with Level A2A and Model Context Protocol
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge 
            variant={orchestratorStatus?.status === 'running' ? 'default' : 'secondary'}
            className="px-3 py-1"
          >
            {orchestratorStatus?.status === 'running' ? (
              <>
                <BoltIcon className="w-4 h-4 mr-1" />
                Online
              </>
            ) : (
              <>
                <StopIcon className="w-4 h-4 mr-1" />
                Offline
              </>
            )}
          </Badge>

          {orchestratorStatus?.status === 'running' ? (
            <Button 
              onClick={shutdownOrchestrator} 
              disabled={isLoading}
              variant="destructive"
              size="sm"
            >
              <StopIcon className="w-4 h-4 mr-2" />
              Shutdown
            </Button>
          ) : (
            <Button 
              onClick={initializeOrchestrator} 
              disabled={isLoading}
              size="sm"
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              {isLoading ? 'Initializing...' : 'Initialize'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="operations">Agent Operations</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
          <TabsTrigger value="security">Security Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Network Health</CardTitle>
                <ShieldCheckIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getHealthColor(orchestratorStatus?.insights?.networkHealth.overall || 'unknown')}`}>
                  {orchestratorStatus?.insights?.networkHealth.overall || 'Unknown'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {orchestratorStatus?.insights?.networkHealth.onlineAgents || 0} / {orchestratorStatus?.insights?.networkHealth.agentCount || 0} agents online
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Load</CardTitle>
                <CpuChipIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {orchestratorStatus?.insights?.networkHealth.systemLoad?.toFixed(1) || '0'}%
                </div>
                <Progress 
                  value={orchestratorStatus?.insights?.networkHealth.systemLoad || 0} 
                  className="w-full h-2 mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks Processed</CardTitle>
                <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {orchestratorStatus?.insights?.performance.totalTasksProcessed || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {((1 - (orchestratorStatus?.insights?.performance.errorRate || 0)) * 100).toFixed(1)}% success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(orchestratorStatus?.insights?.performance.averageTaskTime || 0) / 1000}s
                </div>
                <p className="text-xs text-muted-foreground">
                  Throughput: {orchestratorStatus?.insights?.performance.systemThroughput || 0}/min
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Capabilities & Models</CardTitle>
                <CardDescription>Available agent capabilities and AI models</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Capabilities</span>
                  <Badge variant="secondary">{orchestratorStatus?.insights?.capabilities.totalCapabilities || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Available Models</span>
                  <Badge variant="secondary">{orchestratorStatus?.insights?.capabilities.availableModels || 0}</Badge>
                </div>
                
                {orchestratorStatus?.insights?.capabilities.recommendations?.length ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recommendations:</p>
                    {orchestratorStatus.insights.capabilities.recommendations.map((rec, index) => (
                      <div key={index} className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                        {rec}
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Status</CardTitle>
                <CardDescription>System-wide security monitoring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Threat Level</span>
                  <Badge 
                    variant={orchestratorStatus?.insights?.security.threatLevel === 'low' ? 'default' : 'destructive'}
                    className={getThreatColor(orchestratorStatus?.insights?.security.threatLevel || 'low')}
                  >
                    {orchestratorStatus?.insights?.security.threatLevel || 'Low'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Incidents</span>
                  <Badge variant="secondary">{orchestratorStatus?.insights?.security.activeIncidents || 0}</Badge>
                </div>
                
                {orchestratorStatus?.insights?.security.mitigations?.length ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Security Mitigations:</p>
                    {orchestratorStatus.insights.security.mitigations.map((mitigation, index) => (
                      <div key={index} className="text-xs text-muted-foreground bg-green-50 p-2 rounded">
                        {mitigation}
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Agent Operations</CardTitle>
                <CardDescription>Execute sophisticated multi-agent tasks with UAP-MCP coordination</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Button 
                    onClick={executeDistributedAnalysis}
                    disabled={orchestratorStatus?.status !== 'running' || activeOperations.includes('distributed-analysis')}
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <UsersIcon className="w-6 h-6" />
                    <span className="text-sm">Distributed Secret Analysis</span>
                  </Button>

                  <Button 
                    onClick={executeConsensusDetection}
                    disabled={orchestratorStatus?.status !== 'running' || activeOperations.includes('consensus-detection')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <ShieldCheckIcon className="w-6 h-6" />
                    <span className="text-sm">Consensus Threat Detection</span>
                  </Button>

                  <Button 
                    onClick={executeMultiCompliance}
                    disabled={orchestratorStatus?.status !== 'running' || activeOperations.includes('multi-compliance')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <CheckCircleIcon className="w-6 h-6" />
                    <span className="text-sm">Multi-Framework Compliance</span>
                  </Button>
                </div>

                {activeOperations.length > 0 && (
                  <Alert>
                    <BoltIcon className="h-4 w-4" />
                    <AlertTitle>Operations in Progress</AlertTitle>
                    <AlertDescription>
                      {activeOperations.length} agent operation(s) currently executing. Please wait for completion.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>System performance metrics and bottleneck analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">System Bottlenecks</h4>
                  {orchestratorStatus?.insights?.capabilities.bottlenecks?.length ? (
                    orchestratorStatus.insights.capabilities.bottlenecks.map((bottleneck, index) => (
                      <div key={index} className="text-xs p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <ExclamationTriangleIcon className="w-4 h-4 inline mr-2 text-yellow-600" />
                        {bottleneck}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs p-3 bg-green-50 border border-green-200 rounded">
                      <CheckCircleIcon className="w-4 h-4 inline mr-2 text-green-600" />
                      No bottlenecks detected
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Performance Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Task Time</span>
                      <span className="text-sm font-mono">
                        {(orchestratorStatus?.insights?.performance.averageTaskTime || 0) / 1000}s
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">System Throughput</span>
                      <span className="text-sm font-mono">
                        {orchestratorStatus?.insights?.performance.systemThroughput || 0} tasks/min
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Error Rate</span>
                      <span className="text-sm font-mono">
                        {((orchestratorStatus?.insights?.performance.errorRate || 0) * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Dashboard</CardTitle>
              <CardDescription>Real-time security monitoring and threat assessment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Threat Assessment</h4>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Current Threat Level</span>
                      <Badge 
                        variant={orchestratorStatus?.insights?.security.threatLevel === 'low' ? 'default' : 'destructive'}
                        className={getThreatColor(orchestratorStatus?.insights?.security.threatLevel || 'low')}
                      >
                        {(orchestratorStatus?.insights?.security.threatLevel || 'low').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Incidents</span>
                      <span className="text-sm font-mono">{orchestratorStatus?.insights?.security.activeIncidents || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Security Vulnerabilities</h4>
                  {orchestratorStatus?.insights?.security.vulnerabilities?.length ? (
                    orchestratorStatus.insights.security.vulnerabilities.map((vuln, index) => (
                      <div key={index} className="text-xs p-3 bg-red-50 border border-red-200 rounded">
                        <ExclamationTriangleIcon className="w-4 h-4 inline mr-2 text-red-600" />
                        {vuln}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs p-3 bg-green-50 border border-green-200 rounded">
                      <CheckCircleIcon className="w-4 h-4 inline mr-2 text-green-600" />
                      No known vulnerabilities
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 