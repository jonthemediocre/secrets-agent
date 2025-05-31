'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Key, 
  Database, 
  Settings, 
  RefreshCw, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Terminal,
  Cpu,
  Network,
  FileText,
  Download,
  Upload,
  Calendar
} from 'lucide-react';

interface VaultStatus {
  sopsConfigured: boolean;
  vaultPathAccessible: boolean;
  encryptionWorking: boolean;
  keyCount: number;
  lastBackup?: string;
  vaultSize?: string;
  agentStatus: {
    vaultAgent: boolean;
    rotationAgent: boolean;
    mcpBridge: boolean;
  };
  dominoMode: {
    enabled: boolean;
    lastAudit?: string;
    auditStatus: string;
  };
}

interface VaultSecret {
  key: string;
  environment: string;
  lastModified: string;
  rotationPolicy?: string;
  status: 'active' | 'expired' | 'pending';
  source: 'manual' | 'scaffold' | 'import';
  tags?: string[];
}

interface MCPTool {
  name: string;
  description: string;
  category: string;
  status: 'available' | 'error' | 'loading';
}

export default function VaultManagementPage() {
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [secrets, setSecrets] = useState<VaultSecret[]>([]);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'secrets' | 'agents' | 'mcp' | 'domino' | 'config'>('overview');

  useEffect(() => {
    loadVaultData();
  }, []);

  const loadVaultData = async () => {
    try {
      setLoading(true);
      
      // Load vault status from real VANTA API
      const [statusRes, secretsRes, mcpRes] = await Promise.allSettled([
        fetch('/api/vault/status'),
        fetch('/api/vault/secrets'),
        fetch('/api/v1/mcp/tools')
      ]);

      if (statusRes.status === 'fulfilled') {
        const statusData = await statusRes.value.json();
        if (statusData.success) {
          setVaultStatus(statusData.data);
        }
      }

      if (secretsRes.status === 'fulfilled') {
        const secretsData = await secretsRes.value.json();
        if (secretsData.success) {
          setSecrets(secretsData.data || []);
        }
      }

      if (mcpRes.status === 'fulfilled') {
        const mcpData = await mcpRes.value.json();
        if (mcpData.success) {
          setMcpTools(mcpData.tools || []);
        }
      }

    } catch (err) {
      setError('Failed to load vault data');
      console.error('Vault data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDominoAudit = async () => {
    try {
      const response = await fetch('/api/v1/domino/audit/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: '.',
          platforms: ['web', 'cli', 'vscode', 'windows'],
          governance: true
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Domino Audit Started!\n\nAudit ID: ${result.auditId}\nStatus: ${result.status}\n\nMonitor progress in the Domino tab.`);
        loadVaultData(); // Refresh status
      } else {
        alert(`❌ Audit Failed: ${result.error}`);
      }
    } catch (err) {
      alert('❌ Failed to start domino audit: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleMCPToolExecute = async (toolName: string) => {
    try {
      const response = await fetch('/api/v1/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName,
          params: {}
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ MCP Tool Executed!\n\nTool: ${toolName}\nResult: ${JSON.stringify(result.result, null, 2)}`);
      } else {
        alert(`❌ Tool Execution Failed: ${result.error}`);
      }
    } catch (err) {
      alert('❌ Failed to execute MCP tool: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleAddSecret = async () => {
    const key = prompt('Enter secret key (e.g., API_KEY):');
    const value = prompt('Enter secret value:');
    const environment = prompt('Enter environment (default: default):') || 'default';
    
    if (!key || !value) {
      alert('❌ Key and value are required');
      return;
    }

    try {
      const response = await fetch('/api/vault/secrets/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value,
          environment,
          tags: ['manual']
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Secret Added!\n\nKey: ${key}\nEnvironment: ${environment}`);
        loadVaultData(); // Refresh data
      } else {
        alert(`❌ Failed to add secret: ${result.error}`);
      }
    } catch (err) {
      alert('❌ Failed to add secret: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleImportEnv = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.env';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const environment = prompt('Enter environment for import (default: default):') || 'default';
      const overwrite = confirm('Overwrite existing secrets?');

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('environment', environment);
        formData.append('overwrite', overwrite.toString());

        const response = await fetch('/api/vault/secrets/import', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        if (result.success) {
          alert(`✅ Import Complete!\n\nImported: ${result.data.imported}\nUpdated: ${result.data.updated}\nConflicts: ${result.data.conflicts}`);
          loadVaultData(); // Refresh data
        } else {
          alert(`❌ Import failed: ${result.error}`);
        }
      } catch (err) {
        alert('❌ Failed to import .env file: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };
    input.click();
  };

  const handleCreateBackup = async () => {
    const description = prompt('Enter backup description (optional):') || 'Manual backup';
    
    try {
      const response = await fetch('/api/vault/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          includeMetadata: true
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Backup Created!\n\nBackup ID: ${result.data.backupId}\nSize: ${result.data.size} bytes\nSecrets: ${result.data.secretCount}`);
        loadVaultData(); // Refresh data
      } else {
        alert(`❌ Backup failed: ${result.error}`);
      }
    } catch (err) {
      alert('❌ Failed to create backup: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleRestoreBackup = async () => {
    alert('🚧 Restore functionality coming soon!\n\nThis will allow you to restore from previous backups.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center space-y-4 pt-6">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <h2 className="text-xl font-semibold">VANTA Vault Management</h2>
              <p className="text-muted-foreground">Loading vault status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center space-y-4 pt-6">
            <XCircle className="h-8 w-8 text-destructive" />
            <div className="text-center">
              <h2 className="text-xl font-semibold text-destructive">Vault Error</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">VANTA Vault Management</h1>
            <p className="text-muted-foreground">
              Secure secrets management with AI-powered agents and MCP integration
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => window.history.back()}>
              ← Back
            </Button>
            <Button onClick={handleDominoAudit} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Cpu className="w-4 h-4 mr-2" />
              Run Domino Audit
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/domino'}>
              📊 Domino Dashboard
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        {vaultStatus && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="flex items-center space-x-2 pt-6">
                <Shield className={`h-5 w-5 ${vaultStatus.sopsConfigured ? 'text-green-500' : 'text-red-500'}`} />
                <div>
                  <p className="text-sm font-medium">SOPS Encryption</p>
                  <p className="text-xs text-muted-foreground">
                    {vaultStatus.sopsConfigured ? 'Configured' : 'Not Configured'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center space-x-2 pt-6">
                <Database className={`h-5 w-5 ${vaultStatus.vaultPathAccessible ? 'text-green-500' : 'text-red-500'}`} />
                <div>
                  <p className="text-sm font-medium">Vault Access</p>
                  <p className="text-xs text-muted-foreground">
                    {vaultStatus.vaultPathAccessible ? 'Accessible' : 'Not Accessible'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center space-x-2 pt-6">
                <Key className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Keys</p>
                  <p className="text-xs text-muted-foreground">{vaultStatus.keyCount} configured</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center space-x-2 pt-6">
                <Network className={`h-5 w-5 ${vaultStatus.agentStatus.mcpBridge ? 'text-green-500' : 'text-yellow-500'}`} />
                <div>
                  <p className="text-sm font-medium">MCP Bridge</p>
                  <p className="text-xs text-muted-foreground">
                    {vaultStatus.agentStatus.mcpBridge ? 'Connected' : 'Disconnected'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'overview' | 'secrets' | 'agents' | 'mcp' | 'domino' | 'config')} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="secrets">Secrets</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="mcp">MCP Tools</TabsTrigger>
            <TabsTrigger value="domino">Domino Mode</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Vault Statistics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Secrets:</span>
                    <span className="font-medium">{secrets.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Secrets:</span>
                    <span className="font-medium text-green-600">
                      {secrets.filter(s => s.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expired Secrets:</span>
                    <span className="font-medium text-red-600">
                      {secrets.filter(s => s.status === 'expired').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MCP Tools:</span>
                    <span className="font-medium">{mcpTools.length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Cpu className="h-5 w-5" />
                    <span>Agent Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {vaultStatus && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Vault Agent:</span>
                        <Badge variant={vaultStatus.agentStatus.vaultAgent ? "default" : "destructive"}>
                          {vaultStatus.agentStatus.vaultAgent ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Rotation Agent:</span>
                        <Badge variant={vaultStatus.agentStatus.rotationAgent ? "default" : "destructive"}>
                          {vaultStatus.agentStatus.rotationAgent ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">MCP Bridge:</span>
                        <Badge variant={vaultStatus.agentStatus.mcpBridge ? "default" : "secondary"}>
                          {vaultStatus.agentStatus.mcpBridge ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Domino Mode:</span>
                        <Badge variant={vaultStatus.dominoMode.enabled ? "default" : "outline"}>
                          {vaultStatus.dominoMode.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="secrets" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Vault Secrets</h3>
              <div className="space-x-2">
                <Button variant="outline" onClick={handleImportEnv}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import .env
                </Button>
                <Button onClick={handleAddSecret}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Secret
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="p-4 font-medium">Secret Key</th>
                        <th className="p-4 font-medium">Environment</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Source</th>
                        <th className="p-4 font-medium">Last Modified</th>
                        <th className="p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {secrets.map((secret, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-mono text-sm">{secret.key}</td>
                          <td className="p-4">
                            <Badge variant="outline">{secret.environment}</Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={
                              secret.status === 'active' ? 'default' :
                              secret.status === 'expired' ? 'destructive' : 'secondary'
                            }>
                              {secret.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">{secret.source}</Badge>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(secret.lastModified).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Settings className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">VANTA Agents</h3>
              <Button onClick={() => loadVaultData()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Status
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Vault Agent */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <span>Vault Agent</span>
                  </CardTitle>
                  <CardDescription>Manages vault operations and secret access</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    <Badge variant={vaultStatus?.agentStatus.vaultAgent ? "default" : "destructive"}>
                      {vaultStatus?.agentStatus.vaultAgent ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Uptime:</span>
                    <span className="text-sm text-muted-foreground">24h 15m</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Operations:</span>
                    <span className="text-sm text-muted-foreground">1,247</span>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">
                    <Settings className="w-3 h-3 mr-2" />
                    Configure
                  </Button>
                </CardContent>
              </Card>

              {/* Rotation Agent */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <RefreshCw className="h-5 w-5 text-green-500" />
                    <span>Rotation Agent</span>
                  </CardTitle>
                  <CardDescription>Automated secret rotation and lifecycle management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    <Badge variant={vaultStatus?.agentStatus.rotationAgent ? "default" : "destructive"}>
                      {vaultStatus?.agentStatus.rotationAgent ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Next Rotation:</span>
                    <span className="text-sm text-muted-foreground">2 days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Policies:</span>
                    <span className="text-sm text-muted-foreground">3 active</span>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">
                    <Calendar className="w-3 h-3 mr-2" />
                    Schedule
                  </Button>
                </CardContent>
              </Card>

              {/* MCP Bridge Agent */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Network className="h-5 w-5 text-purple-500" />
                    <span>MCP Bridge</span>
                  </CardTitle>
                  <CardDescription>External tool orchestration and integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    <Badge variant={vaultStatus?.agentStatus.mcpBridge ? "default" : "secondary"}>
                      {vaultStatus?.agentStatus.mcpBridge ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tools:</span>
                    <span className="text-sm text-muted-foreground">{mcpTools.length} available</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Executions:</span>
                    <span className="text-sm text-muted-foreground">42 today</span>
                  </div>
                  <Button variant="outline" className="w-full" size="sm">
                    <Terminal className="w-3 h-3 mr-2" />
                    Console
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Agent Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Recent Agent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <div className="flex items-center space-x-2 text-sm">
                    <Badge variant="outline" className="text-xs">VAULT</Badge>
                    <span className="text-muted-foreground">2025-05-26 04:16:59</span>
                    <span>Secret access: API_KEY</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Badge variant="outline" className="text-xs">MCP</Badge>
                    <span className="text-muted-foreground">2025-05-26 04:16:45</span>
                    <span>Tool executed: vault-scan</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Badge variant="outline" className="text-xs">ROTATION</Badge>
                    <span className="text-muted-foreground">2025-05-26 04:15:30</span>
                    <span>Policy check: quarterly rotation</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Badge variant="outline" className="text-xs">VAULT</Badge>
                    <span className="text-muted-foreground">2025-05-26 04:14:25</span>
                    <span>Vault loaded successfully</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mcp" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">MCP Tools</h3>
              <Button onClick={() => loadVaultData()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Tools
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mcpTools.map((tool, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-sm">{tool.name}</CardTitle>
                    <CardDescription className="text-xs">{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">{tool.category}</Badge>
                      <Button 
                        size="sm" 
                        onClick={() => handleMCPToolExecute(tool.name)}
                        disabled={tool.status !== 'available'}
                      >
                        <Terminal className="w-3 h-3 mr-1" />
                        Execute
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {mcpTools.length === 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No MCP tools available. Check your MCP bridge configuration.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="domino" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Domino Mode - Universal Audit</h3>
              <Button onClick={handleDominoAudit} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Cpu className="w-4 h-4 mr-2" />
                Start New Audit
              </Button>
            </div>

            {vaultStatus?.dominoMode && (
              <Card>
                <CardHeader>
                  <CardTitle>Audit Status</CardTitle>
                  <CardDescription>
                    Cross-platform feature parity and governance audit
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Domino Mode:</span>
                    <Badge variant={vaultStatus.dominoMode.enabled ? "default" : "outline"}>
                      {vaultStatus.dominoMode.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Last Audit:</span>
                    <span className="text-sm text-muted-foreground">
                      {vaultStatus.dominoMode.lastAudit || 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    <Badge variant="outline">{vaultStatus.dominoMode.auditStatus}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            <Alert>
              <Cpu className="h-4 w-4" />
              <AlertDescription>
                Domino Mode provides automated cross-platform feature parity auditing with AI-powered governance decisions.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <h3 className="text-lg font-semibold">Vault Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>SOPS Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    <Badge variant={vaultStatus?.sopsConfigured ? "default" : "destructive"}>
                      {vaultStatus?.sopsConfigured ? 'Configured' : 'Not Configured'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Keys:</span>
                    <span>{vaultStatus?.keyCount || 0} configured</span>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure SOPS
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Backup & Recovery</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Last Backup:</span>
                    <span className="text-sm text-muted-foreground">
                      {vaultStatus?.lastBackup || 'Never'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={handleCreateBackup}>
                      <Download className="w-4 h-4 mr-2" />
                      Create Backup
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleRestoreBackup}>
                      <Upload className="w-4 h-4 mr-2" />
                      Restore Backup
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 