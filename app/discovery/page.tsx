'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/page-header';
import {
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  DocumentMagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

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

export default function DiscoveryPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgentStatus();
  }, []);

  const fetchAgentStatus = async () => {
    try {
      const response = await fetch('/api/agents/discover');
      const data = await response.json();
      
      if (data.success) {
        setAgentStatus(data.data);
      } else {
        setError(data.error || 'Failed to fetch agent status');
      }
    } catch (err) {
      setError('Failed to connect to agent system');
    }
  };

  const startDiscovery = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      const response = await fetch('/api/agents/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDiscoveryResult(data.data);
        await fetchAgentStatus(); // Refresh status
      } else {
        setError(data.error || 'Discovery failed');
      }
    } catch (err) {
      setError('Failed to start discovery process');
    } finally {
      setIsScanning(false);
    }
  };

  const setupCICD = async () => {
    try {
      setError(null);
      const response = await fetch('/api/cicd/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableHooks: true,
          enableGitHubActions: true,
          notifications: {}
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('CI/CD integration setup completed successfully!');
      } else {
        setError(data.error || 'CI/CD setup failed');
      }
    } catch (err) {
      setError('Failed to setup CI/CD integration');
    }
  };

  const autoImportSecrets = async (secrets: any[], vaultId?: string) => {
    try {
      // If no vault ID provided, find the first available vault
      if (!vaultId) {
        const vaultResponse = await fetch('/api/vault');
        const vaultData = await vaultResponse.json();
        if (vaultData.success && vaultData.data.length > 0) {
          vaultId = vaultData.data[0].id;
        } else {
          setError('No vault available for auto-import');
          return;
        }
      }

      // Import each secret
      let importedCount = 0;
      for (const secret of secrets) {
        try {
          const response = await fetch('/api/secrets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${secret.service}_${secret.type}`,
              value: secret.value,
              vaultId: vaultId,
              description: `Auto-imported from ${secret.location}`,
              metadata: {
                autoImported: true,
                originalLocation: secret.location,
                risk: secret.risk,
                confidence: secret.confidence,
                importedAt: new Date().toISOString()
              }
            })
          });

          if (response.ok) {
            importedCount++;
          }
        } catch (err) {
          console.error(`Failed to import secret ${secret.id}:`, err);
        }
      }

      alert(`Successfully imported ${importedCount} secrets to vault!`);
    } catch (err) {
      setError('Failed to auto-import secrets');
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <>
      <PageHeader 
        title="Secret Discovery" 
        description="AI-powered agent system for automatic secret detection and management across your projects"
      >
        <Button 
          onClick={startDiscovery}
          disabled={isScanning}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isScanning ? (
            <>
              <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
              Start Discovery
            </>
          )}
        </Button>
        <Button 
          onClick={setupCICD}
          variant="outline"
          className="ml-2"
        >
          <ShieldCheckIcon className="w-4 h-4 mr-2" />
          Setup CI/CD
        </Button>
      </PageHeader>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700 dark:text-red-400">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Agent System Status */}
        {agentStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CpuChipIcon className="w-4 h-4 mr-2" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={agentStatus.agentSystemStatus === 'ready' ? 
                  'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                }>
                  {agentStatus.agentSystemStatus}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Projects Monitored</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agentStatus.statistics.totalProjectsMonitored}</div>
                <div className="text-xs text-muted-foreground">Active projects</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Secrets Managed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agentStatus.statistics.secretsManaged}</div>
                <div className="text-xs text-muted-foreground">Total discovered</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Automation Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agentStatus.statistics.automationLevel}%</div>
                <Progress value={agentStatus.statistics.automationLevel} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Agents */}
        {agentStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShieldCheckIcon className="w-5 h-5 mr-2" />
                Active AI Agents
              </CardTitle>
              <CardDescription>
                Multi-agent system for intelligent secret discovery and management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentStatus.activeAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium capitalize">
                        {agent.id.replace('-', ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Confidence: {Math.round(agent.confidence * 100)}%
                      </div>
                    </div>
                    <Badge className={agent.status === 'ready' ? 
                      'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                    }>
                      {agent.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Discovery Results */}
        {discoveryResult && (
          <div className="space-y-6">
            {/* Discovery Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DocumentMagnifyingGlassIcon className="w-5 h-5 mr-2" />
                  Discovery Summary
                </CardTitle>
                <CardDescription>
                  Latest scan results from the AI agent system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{discoveryResult.projectsScanned}</div>
                    <div className="text-sm text-muted-foreground">Projects Scanned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{discoveryResult.secretsFound}</div>
                    <div className="text-sm text-muted-foreground">Secrets Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{discoveryResult.credentialsExtracted}</div>
                    <div className="text-sm text-muted-foreground">Credentials Extracted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{discoveryResult.servicesDiscovered}</div>
                    <div className="text-sm text-muted-foreground">Services Discovered</div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Automation Level: {discoveryResult.automation.level}</div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round(discoveryResult.automation.confidence * 100)}% confidence, 
                        {discoveryResult.automation.timeReduction}% time reduction
                      </div>
                    </div>
                    <CheckCircleIcon className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Discovered Secrets */}
            <Card>
              <CardHeader>
                <CardTitle>Discovered Secrets</CardTitle>
                <CardDescription>
                  Secrets found in your codebase that should be moved to the vault
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {discoveryResult.discoveries.map((discovery, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{discovery.service}</div>
                          <Badge variant="outline" className="text-xs">
                            {discovery.type}
                          </Badge>
                          <Badge className={getRiskColor(discovery.risk)}>
                            {discovery.risk}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {discovery.location}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Move to Vault
                      </Button>
                    </div>
                  ))}
                  
                  {/* Bulk Auto-Import Button */}
                  {discoveryResult.discoveries.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        onClick={() => autoImportSecrets(discoveryResult.discoveries)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                        Auto-Import All {discoveryResult.discoveries.length} Secrets
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
                <CardDescription>
                  Intelligent suggestions from the agent system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {discoveryResult.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">{recommendation}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Call to Action if no results */}
        {!discoveryResult && !isScanning && (
          <Card className="text-center py-12">
            <CardContent>
              <MagnifyingGlassIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Ready to Discover Secrets</h3>
              <p className="text-muted-foreground mb-6">
                Use our AI-powered agent system to automatically scan and discover secrets across your projects.
              </p>
              <Button onClick={startDiscovery} size="lg" className="bg-blue-600 hover:bg-blue-700">
                <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                Start First Discovery Scan
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
} 