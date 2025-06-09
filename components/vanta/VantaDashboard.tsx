'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Brain, TrendingUp, Activity, Zap, Settings, Play, Pause, Network, Users, Shield } from 'lucide-react';

interface VantaAgent {
  agentId: string;
  status: 'online' | 'offline' | 'learning';
  health: number;
  vanta: {
    learningEnabled: boolean;
    performanceTrend: 'improving' | 'stable' | 'degrading';
    currentScore: number;
    improvementRate: number;
    continuityScore: number;
    totalExperiences: number;
    lastUpdate: string | null;
  };
}

interface TrinityNode {
  nodeId: string;
  role: 'aggregator' | 'core' | 'mediator';
  active: boolean;
  managedAgents: number;
  recentDecisions: number;
  collaborationRequests: number;
  supervisionLevel: 'light' | 'moderate' | 'strict';
  swarmIntelligence: {
    emergentBehaviors: string[];
    convergenceMetrics: Record<string, number>;
    symbolicNarrative: string;
    evolutionPhase: 'exploration' | 'optimization' | 'convergence';
  } | null;
}

interface VantaLearningStats {
  learningEnabled: boolean;
  totalExperiences: number;
  averageReward: number;
  improvementRate: number;
  continuityScore: {
    score: number;
    factors: {
      memoryCoherence: number;
      behaviorStability: number;
      knowledgeRetention: number;
      goalAlignment: number;
    };
    trend: 'improving' | 'stable' | 'degrading';
  } | null;
  lastLearningUpdate: string | null;
}

export function VantaDashboard() {
  const [agents, setAgents] = useState<VantaAgent[]>([]);
  const [trinityNodes, setTrinityNodes] = useState<TrinityNode[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [learningStats, setLearningStats] = useState<VantaLearningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVantaData();
    const interval = setInterval(loadVantaData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      loadLearningStats(selectedAgent);
    }
  }, [selectedAgent]);

  const loadVantaData = async () => {
    try {
      // Load agents
      const agentsResponse = await fetch('/api/vanta/agent');
      const agentsData = await agentsResponse.json();
      
      // Load Trinity Nodes
      const nodesResponse = await fetch('/api/vanta/trinity');
      const nodesData = await nodesResponse.json();
      
      if (agentsData.success) {
        setAgents(agentsData.agents || []);
        if (agentsData.agents?.length > 0 && !selectedAgent) {
          setSelectedAgent(agentsData.agents[0].agentId);
        }
      }

      if (nodesData.success) {
        setTrinityNodes(nodesData.trinityNodes || []);
        if (nodesData.trinityNodes?.length > 0 && !selectedNode) {
          setSelectedNode(nodesData.trinityNodes[0].nodeId);
        }
      }

      if (!agentsData.success || !nodesData.success) {
        setError('Failed to load VANTA system data');
      }
    } catch (err) {
      setError('Failed to connect to VANTA system');
      console.error('VANTA loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLearningStats = async (agentId: string) => {
    try {
      const response = await fetch('/api/vanta/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_learning_stats',
          agentId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setLearningStats(data.learningStats);
      }
    } catch (err) {
      console.error('Failed to load learning stats:', err);
    }
  };

  const createDemoAgent = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vanta/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          agentId: `vanta_agent_${Date.now()}`,
          vantaConfig: {
            enableLearning: true,
            learningRate: 0.15,
            adaptationThreshold: 0.1
          }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        await loadVantaData();
      } else {
        setError(data.error || 'Failed to create agent');
      }
    } catch (err) {
      setError('Failed to create demo agent');
    } finally {
      setLoading(false);
    }
  };

  const createTrinityNode = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vanta/trinity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_node',
          nodeId: `trinity_node_${Date.now()}`,
          config: {
            role: 'core',
            supervisionLevel: 'moderate'
          }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        await loadVantaData();
      } else {
        setError(data.error || 'Failed to create Trinity Node');
      }
    } catch (err) {
      setError('Failed to create Trinity Node');
    } finally {
      setLoading(false);
    }
  };

  const executeTestTask = async (agentId: string) => {
    try {
      const response = await fetch('/api/vanta/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_task',
          agentId,
          task: {
            type: 'analysis',
            priority: 'normal',
            input: {
              data: 'test_secret_analysis',
              timestamp: new Date().toISOString()
            }
          }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        await loadVantaData();
        await loadLearningStats(agentId);
      }
    } catch (err) {
      console.error('Failed to execute test task:', err);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'degrading': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'learning': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'aggregator': return <Network className="h-4 w-4 text-purple-500" />;
      case 'mediator': return <Users className="h-4 w-4 text-blue-500" />;
      default: return <Shield className="h-4 w-4 text-green-500" />;
    }
  };

  if (loading && agents.length === 0 && trinityNodes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 animate-pulse text-blue-500" />
          <p>Loading VANTA Framework...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-500" />
            VANTA Framework
          </h1>
          <p className="text-muted-foreground">
            Agent learning, adaptation & Trinity Node supervision
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={createDemoAgent} disabled={loading} size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
          <Button onClick={createTrinityNode} disabled={loading} size="sm" variant="outline">
            <Network className="h-4 w-4 mr-2" />
            Create Trinity Node
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Enhanced Agents</p>
                <p className="text-2xl font-bold">{agents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Trinity Nodes</p>
                <p className="text-2xl font-bold">{trinityNodes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Supervised Agents</p>
                <p className="text-2xl font-bold">
                  {trinityNodes.reduce((sum, n) => sum + n.managedAgents, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Learning</p>
                <p className="text-2xl font-bold">
                  {agents.filter(a => a.vanta.learningEnabled).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {agents.length === 0 && trinityNodes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">No VANTA Components</h3>
            <p className="text-muted-foreground mb-4">
              Create your first VANTA enhanced agent and Trinity Node to begin
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={createDemoAgent}>
                Create Demo Agent
              </Button>
              <Button onClick={createTrinityNode} variant="outline">
                Create Trinity Node
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="agents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="agents">Enhanced Agents</TabsTrigger>
            <TabsTrigger value="trinity">Trinity Nodes</TabsTrigger>
            <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agent List */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Enhanced Agents</h2>
                {agents.map((agent) => (
                  <Card 
                    key={agent.agentId}
                    className={`cursor-pointer transition-colors ${
                      selectedAgent === agent.agentId ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedAgent(agent.agentId)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
                          <span className="font-medium">{agent.agentId}</span>
                        </div>
                        {getTrendIcon(agent.vanta.performanceTrend)}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Performance</span>
                          <span>{Math.round(agent.vanta.currentScore * 100)}%</span>
                        </div>
                        <Progress value={agent.vanta.currentScore * 100} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Health: {agent.health}%</span>
                          <span>{agent.vanta.totalExperiences} experiences</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Agent Details */}
              <div className="lg:col-span-2">
                {selectedAgent && (
                  <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="learning">Learning</TabsTrigger>
                      <TabsTrigger value="actions">Actions</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Agent Overview</CardTitle>
                          <CardDescription>Current status and performance</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const agent = agents.find(a => a.agentId === selectedAgent);
                            if (!agent) return null;
                            
                            return (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Status</h4>
                                  <Badge variant={agent.status === 'online' ? 'default' : 'secondary'}>
                                    {agent.status}
                                  </Badge>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Learning</h4>
                                  <Badge variant={agent.vanta.learningEnabled ? 'default' : 'secondary'}>
                                    {agent.vanta.learningEnabled ? 'Enabled' : 'Disabled'}
                                  </Badge>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Performance Score</h4>
                                  <div className="text-2xl font-bold">
                                    {Math.round(agent.vanta.currentScore * 100)}%
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Improvement Rate</h4>
                                  <div className="text-2xl font-bold flex items-center gap-1">
                                    {agent.vanta.improvementRate > 0 ? '+' : ''}{Math.round(agent.vanta.improvementRate * 100)}%
                                    {getTrendIcon(agent.vanta.performanceTrend)}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="learning" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Learning Statistics</CardTitle>
                          <CardDescription>Detailed learning metrics and continuity</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {learningStats ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Total Experiences</h4>
                                  <div className="text-2xl font-bold">{learningStats.totalExperiences}</div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Average Reward</h4>
                                  <div className="text-2xl font-bold">
                                    {learningStats.averageReward.toFixed(3)}
                                  </div>
                                </div>
                              </div>
                              
                              {learningStats.continuityScore && (
                                <div>
                                  <h4 className="font-semibold mb-2">Continuity Factors</h4>
                                  <div className="space-y-2">
                                    {Object.entries(learningStats.continuityScore.factors).map(([factor, value]) => (
                                      <div key={factor} className="flex justify-between items-center">
                                        <span className="capitalize">{factor.replace(/([A-Z])/g, ' $1')}</span>
                                        <div className="flex items-center gap-2">
                                          <Progress value={value * 100} className="w-20 h-2" />
                                          <span className="text-sm w-12">{Math.round(value * 100)}%</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">Loading learning statistics...</p>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="actions" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Agent Actions</CardTitle>
                          <CardDescription>Test and manage agent capabilities</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Button 
                            onClick={() => executeTestTask(selectedAgent)}
                            className="w-full"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Execute Test Task
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => loadLearningStats(selectedAgent)}
                            className="w-full"
                          >
                            <Activity className="h-4 w-4 mr-2" />
                            Refresh Statistics
                          </Button>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trinity" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trinity Node List */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Trinity Nodes</h2>
                {trinityNodes.map((node) => (
                  <Card 
                    key={node.nodeId}
                    className={`cursor-pointer transition-colors ${
                      selectedNode === node.nodeId ? 'ring-2 ring-purple-500' : ''
                    }`}
                    onClick={() => setSelectedNode(node.nodeId)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${node.active ? 'bg-green-500' : 'bg-gray-500'}`} />
                          <span className="font-medium">{node.nodeId}</span>
                        </div>
                        {getRoleIcon(node.role)}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Role</span>
                          <Badge variant="outline">{node.role}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Managed Agents</span>
                          <span>{node.managedAgents}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Decisions: {node.recentDecisions}</span>
                          <span>{node.supervisionLevel} supervision</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Trinity Node Details */}
              <div className="lg:col-span-2">
                {selectedNode && (
                  <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="swarm">Swarm Intelligence</TabsTrigger>
                      <TabsTrigger value="actions">Actions</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Trinity Node Overview</CardTitle>
                          <CardDescription>Node supervision and orchestration status</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const node = trinityNodes.find(n => n.nodeId === selectedNode);
                            if (!node) return null;
                            
                            return (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Status</h4>
                                  <Badge variant={node.active ? 'default' : 'secondary'}>
                                    {node.active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Role</h4>
                                  <div className="flex items-center gap-2">
                                    {getRoleIcon(node.role)}
                                    <span className="capitalize">{node.role}</span>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Managed Agents</h4>
                                  <div className="text-2xl font-bold">{node.managedAgents}</div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Recent Decisions</h4>
                                  <div className="text-2xl font-bold">{node.recentDecisions}</div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Supervision Level</h4>
                                  <Badge variant="outline" className="capitalize">
                                    {node.supervisionLevel}
                                  </Badge>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Collaboration Queue</h4>
                                  <div className="text-2xl font-bold">{node.collaborationRequests}</div>
                                </div>
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="swarm" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Swarm Intelligence</CardTitle>
                          <CardDescription>Emergent behaviors and convergence metrics</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            const node = trinityNodes.find(n => n.nodeId === selectedNode);
                            const swarm = node?.swarmIntelligence;
                            if (!swarm) {
                              return <p className="text-muted-foreground">No swarm intelligence data available</p>;
                            }
                            
                            return (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Evolution Phase</h4>
                                  <Badge className="capitalize">{swarm.evolutionPhase}</Badge>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Symbolic Narrative</h4>
                                  <p className="text-sm text-muted-foreground">{swarm.symbolicNarrative}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Emergent Behaviors</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {swarm.emergentBehaviors.map((behavior, index) => (
                                      <Badge key={index} variant="outline">{behavior}</Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Convergence Metrics</h4>
                                  <div className="space-y-2">
                                    {Object.entries(swarm.convergenceMetrics).map(([metric, value]) => (
                                      <div key={metric} className="flex justify-between items-center">
                                        <span className="capitalize">{metric.replace(/([A-Z])/g, ' $1')}</span>
                                        <span className="font-mono">{typeof value === 'number' ? value.toFixed(3) : value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="actions" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Trinity Node Actions</CardTitle>
                          <CardDescription>Manage and test node capabilities</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Button className="w-full" variant="outline">
                            <Network className="h-4 w-4 mr-2" />
                            View Agent Collaborations
                          </Button>
                          <Button className="w-full" variant="outline">
                            <Activity className="h-4 w-4 mr-2" />
                            Monitor Supervision
                          </Button>
                          <Button className="w-full" variant="outline">
                            <Settings className="h-4 w-4 mr-2" />
                            Configure Node
                          </Button>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="collaboration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Collaboration</CardTitle>
                <CardDescription>Real-time agent-to-agent coordination via Trinity Nodes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Network className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">Collaboration Dashboard</h3>
                  <p className="text-muted-foreground mb-4">
                    Monitor and facilitate agent collaborations across Trinity Nodes
                  </p>
                  <Button>
                    <Play className="h-4 w-4 mr-2" />
                    Start Collaboration Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 