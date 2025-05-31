'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Cpu, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  BarChart3,
  GitBranch,
  Users,
  Settings,
  RefreshCw,
  Play,
  Pause,
  Square,
  Eye,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface DominoAudit {
  auditId: string;
  project: string;
  phase: string;
  status: string;
  started: string;
  duration: string;
  platforms: string[];
  metrics?: {
    deltaReduction: number;
    testCoverage: number;
    crossPlatformParity: number;
    securityScore: number;
    performanceGain: number;
    uxScore: number;
  };
}

interface GovernanceDecision {
  auditId: string;
  decision: 'pending' | 'approved' | 'denied';
  comment?: string;
  decidedBy?: string;
  decidedAt?: string;
}

export default function DominoModePage() {
  const [audits, setAudits] = useState<DominoAudit[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<DominoAudit | null>(null);
  const [governance, setGovernance] = useState<GovernanceDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'audits' | 'governance' | 'analytics'>('overview');

  useEffect(() => {
    loadDominoData();
  }, []);

  const loadDominoData = async () => {
    try {
      setLoading(true);
      
      const [auditsRes, governanceRes] = await Promise.allSettled([
        fetch('/api/v1/domino/audits'),
        fetch('/api/v1/domino/governance')
      ]);

      if (auditsRes.status === 'fulfilled') {
        const auditsData = await auditsRes.value.json();
        if (auditsData.success) {
          setAudits(auditsData.data || []);
        }
      }

      if (governanceRes.status === 'fulfilled') {
        const governanceData = await governanceRes.value.json();
        if (governanceData.success) {
          setGovernance(governanceData.data || []);
        }
      }

    } catch (err) {
      setError('Failed to load domino data');
      console.error('Domino data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAudit = async () => {
    try {
      const response = await fetch('/api/v1/domino/audit/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: '.',
          platforms: ['web', 'cli', 'vscode', 'windows'],
          governance: true,
          enableRL: true
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Domino Audit Started!\n\nAudit ID: ${result.auditId}\nStatus: ${result.status}`);
        loadDominoData(); // Refresh data
      } else {
        alert(`❌ Audit Failed: ${result.error}`);
      }
    } catch (err) {
      alert('❌ Failed to start domino audit: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleGovernanceDecision = async (auditId: string, decision: 'approve' | 'deny', comment: string = '') => {
    try {
      const response = await fetch(`/api/v1/domino/audit/${auditId}/governance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          comment,
          decidedBy: 'vault-ui'
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Governance Decision Recorded!\n\nAudit: ${auditId}\nDecision: ${decision}\nStatus: ${result.status}`);
        loadDominoData(); // Refresh data
      } else {
        alert(`❌ Governance Failed: ${result.error}`);
      }
    } catch (err) {
      alert('❌ Failed to record governance decision: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleViewAuditDetails = async (auditId: string) => {
    try {
      const response = await fetch(`/api/v1/domino/audit/${auditId}/status`);
      const result = await response.json();
      
      if (result.success) {
        setSelectedAudit(result.data);
      } else {
        alert(`❌ Failed to load audit details: ${result.error}`);
      }
    } catch (err) {
      alert('❌ Failed to load audit details: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending_approval':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'default';
      case 'running':
      case 'in_progress':
        return 'secondary';
      case 'pending_approval':
        return 'outline';
      case 'failed':
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center space-y-4 pt-6">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <h2 className="text-xl font-semibold">Domino Mode Dashboard</h2>
              <p className="text-muted-foreground">Loading audit data...</p>
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
              <h2 className="text-xl font-semibold text-destructive">Domino Error</h2>
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
            <h1 className="text-3xl font-bold tracking-tight">Domino Mode Dashboard</h1>
            <p className="text-muted-foreground">
              Universal cross-platform audit and governance system
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => window.history.back()}>
              ← Back
            </Button>
            <Button onClick={handleStartAudit} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Play className="w-4 h-4 mr-2" />
              Start New Audit
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center space-x-2 pt-6">
              <Cpu className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Audits</p>
                <p className="text-2xl font-bold">{audits.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center space-x-2 pt-6">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">
                  {audits.filter(a => a.status.toLowerCase().includes('success') || a.status.toLowerCase().includes('completed')).length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center space-x-2 pt-6">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Running</p>
                <p className="text-2xl font-bold">
                  {audits.filter(a => a.status.toLowerCase().includes('running') || a.status.toLowerCase().includes('progress')).length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center space-x-2 pt-6">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Pending Approval</p>
                <p className="text-2xl font-bold">
                  {audits.filter(a => a.status.toLowerCase().includes('pending')).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="audits">Audit History</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Recent Audit Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {audits.slice(0, 5).map((audit, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(audit.status)}
                          <span className="text-sm font-medium">{audit.auditId}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusColor(audit.status)}>{audit.status}</Badge>
                          <span className="text-xs text-muted-foreground">{audit.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <GitBranch className="h-5 w-5" />
                    <span>Platform Coverage</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['web', 'cli', 'vscode', 'windows'].map((platform) => {
                      const auditCount = audits.filter(a => a.platforms?.includes(platform)).length;
                      const percentage = audits.length > 0 ? (auditCount / audits.length) * 100 : 0;
                      
                      return (
                        <div key={platform} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{platform}</span>
                            <span>{auditCount} audits</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audits" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Audit History</h3>
              <Button onClick={() => loadDominoData()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="p-4 font-medium">Audit ID</th>
                        <th className="p-4 font-medium">Project</th>
                        <th className="p-4 font-medium">Phase</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Started</th>
                        <th className="p-4 font-medium">Duration</th>
                        <th className="p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audits.map((audit, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-mono text-sm">{audit.auditId}</td>
                          <td className="p-4">{audit.project}</td>
                          <td className="p-4">
                            <Badge variant="outline">{audit.phase}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(audit.status)}
                              <Badge variant={getStatusColor(audit.status)}>{audit.status}</Badge>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {new Date(audit.started).toLocaleString()}
                          </td>
                          <td className="p-4 text-sm">{audit.duration}</td>
                          <td className="p-4">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleViewAuditDetails(audit.auditId)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="governance" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Governance Decisions</h3>
              <div className="flex space-x-2">
                <Badge variant="outline">
                  {audits.filter(a => a.status.toLowerCase().includes('pending')).length} Pending
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {audits
                .filter(audit => audit.status.toLowerCase().includes('pending'))
                .map((audit, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Audit {audit.auditId}</span>
                        <Badge variant="outline">{audit.phase}</Badge>
                      </CardTitle>
                      <CardDescription>
                        Started: {new Date(audit.started).toLocaleString()} • Duration: {audit.duration}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleGovernanceDecision(audit.auditId, 'approve', 'Approved via UI')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleGovernanceDecision(audit.auditId, 'deny', 'Denied via UI')}
                        >
                          <ThumbsDown className="w-3 h-3 mr-1" />
                          Deny
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewAuditDetails(audit.auditId)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>

            {audits.filter(a => a.status.toLowerCase().includes('pending')).length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  No pending governance decisions. All audits are either completed or in progress.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <h3 className="text-lg font-semibold">Audit Analytics</h3>
            
            {selectedAudit && selectedAudit.metrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Audit Metrics - {selectedAudit.auditId}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {(selectedAudit.metrics.deltaReduction * 100).toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Delta Reduction</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {selectedAudit.metrics.testCoverage.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Test Coverage</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedAudit.metrics.crossPlatformParity.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Platform Parity</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {selectedAudit.metrics.securityScore.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Security Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-cyan-600">
                        {(selectedAudit.metrics.performanceGain * 100).toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">Performance Gain</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-pink-600">
                        {selectedAudit.metrics.uxScore.toFixed(1)}%
                      </p>
                      <p className="text-sm text-muted-foreground">UX Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Alert>
              <BarChart3 className="h-4 w-4" />
              <AlertDescription>
                Select an audit from the Audit History tab to view detailed metrics and analytics.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 