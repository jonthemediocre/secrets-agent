'use client';

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import useSecurityData from '@/src/hooks/useSecurityData';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  CogIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// Helper function to format time ago
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export default function SecurityPage() {
  const { data, loginData, loading, error, refresh } = useSecurityData();

  // Loading skeleton
  if (loading) {
    return (
      <>
        <PageHeader 
          title="Security Center" 
          description="Monitor threats, vulnerabilities, and compliance status"
        >
          <Button size="sm" variant="outline" disabled>
            <CogIcon className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button size="sm" disabled>
            <PlusIcon className="w-4 h-4 mr-2" />
            New Rule
          </Button>
        </PageHeader>

        <main className="p-6 max-w-7xl mx-auto">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-4 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <PageHeader 
          title="Security Center" 
          description="Monitor threats, vulnerabilities, and compliance status"
        >
          <Button size="sm" variant="outline" onClick={refresh}>
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </PageHeader>

        <main className="p-6 max-w-7xl mx-auto">
          <Alert className="border-red-500">
            <XCircleIcon className="w-4 h-4" />
            <AlertTitle>Error Loading Security Data</AlertTitle>
            <AlertDescription>
              {error}. Click Retry to try again.
            </AlertDescription>
          </Alert>
        </main>
      </>
    );
  }

  // Transform real data into display format
  const securityMetrics = data ? [
    { 
      name: 'Active Threats', 
      value: data.security.threatLevel.count, 
      trend: data.security.threatLevel.status,
      icon: ExclamationTriangleIcon 
    },
    { 
      name: 'Vulnerabilities', 
      value: data.security.vulnerabilities.count, 
      trend: data.security.vulnerabilities.status === 'normal' ? 'good' : 
             data.security.vulnerabilities.status === 'attention' ? 'medium' : 'high',
      icon: ExclamationTriangleIcon 
    },
    { 
      name: 'Secure Connections', 
      value: data.security.secureConnections, 
      trend: 'good',
      icon: LockClosedIcon 
    },
    { 
      name: 'Access Reviews', 
      value: data.security.accessReviews, 
      trend: 'good',
      icon: EyeIcon 
    },
  ] : [];

  // Real alerts from API
  const securityAlerts = data ? [
    ...data.realTimeAlerts.map(alert => ({
      id: alert.id,
      severity: alert.type === 'critical' ? 'high' : alert.type === 'warning' ? 'medium' : 'low',
      title: alert.title,
      description: alert.message,
      time: formatTimeAgo(alert.timestamp),
      resolved: !alert.active,
    })),
    ...(loginData?.securityAlerts.map(alert => ({
      id: alert.id,
      severity: alert.severity === 'high' ? 'high' : alert.severity === 'medium' ? 'medium' : 'low',
      title: alert.title,
      description: alert.message,
      time: formatTimeAgo(alert.timestamp),
      resolved: false,
    })) || [])
  ] : [];

  // Add vault health information as alerts
  if (data && data.security.vulnerabilities.issues.length > 0) {
    data.security.vulnerabilities.issues.forEach((issue, index) => {
      securityAlerts.push({
        id: `vault-issue-${index}`,
        severity: 'medium',
        title: 'Vault Health Issue',
        description: issue,
        time: 'Now',
        resolved: false,
      });
    });
  }

  const complianceChecks = [
    { name: 'SOC 2 Type II', status: 'compliant', score: 98 },
    { name: 'ISO 27001', status: 'compliant', score: 95 },
    { name: 'GDPR', status: 'partial', score: 87 },
    { name: 'HIPAA', status: 'compliant', score: 99 },
  ];

  return (
    <>
      <PageHeader 
        title="Security Center" 
        description={`Real-time monitoring • ${data?.overview.totalVaults || 0} vaults • ${data?.overview.totalSecrets || 0} secrets`}
      >
        <Button size="sm" variant="outline" onClick={refresh}>
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <Button size="sm" variant="outline">
          <CogIcon className="w-4 h-4 mr-2" />
          Settings
        </Button>
        <Button size="sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          New Rule
        </Button>
      </PageHeader>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Security Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {securityMetrics.map((metric, index) => (
              <Card key={index} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                    <metric.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">{metric.value}</div>
                    <Badge 
                      variant={
                        metric.trend === 'good' ? 'default' : 
                        metric.trend === 'medium' ? 'secondary' : 
                        'destructive'
                      }
                      className="text-xs"
                    >
                      {metric.trend === 'good' ? 'Normal' : 
                       metric.trend === 'medium' ? 'Attention' : 
                       'Critical'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="alerts" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            </TabsList>

            {/* Security Alerts Tab */}
            <TabsContent value="alerts" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {securityAlerts.map((alert) => (
                    <Alert 
                      key={alert.id}
                      className={`border-l-4 ${
                        alert.severity === 'high' ? 'border-l-red-500' :
                        alert.severity === 'medium' ? 'border-l-yellow-500' :
                        'border-l-green-500'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {alert.severity === 'high' ? (
                          <XCircleIcon className="w-5 h-5 text-red-500 mt-0.5" />
                        ) : alert.severity === 'medium' ? (
                          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mt-0.5" />
                        ) : (
                          <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <AlertTitle className="text-sm font-medium">
                              {alert.title}
                            </AlertTitle>
                            <Badge 
                              variant={alert.resolved ? 'outline' : 'destructive'}
                              className="text-xs"
                            >
                              {alert.resolved ? 'Resolved' : 'Active'}
                            </Badge>
                          </div>
                          <AlertDescription className="text-sm text-muted-foreground">
                            {alert.description}
                          </AlertDescription>
                          <p className="text-xs text-muted-foreground">{alert.time}</p>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Threat Summary</CardTitle>
                    <CardDescription>Last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>High Risk</span>
                        <span className="font-medium">3</span>
                      </div>
                      <Progress value={20} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Medium Risk</span>
                        <span className="font-medium">8</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Low Risk</span>
                        <span className="font-medium">15</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {complianceChecks.map((check, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{check.name}</CardTitle>
                        <Badge 
                          variant={
                            check.status === 'compliant' ? 'default' : 
                            check.status === 'partial' ? 'secondary' : 
                            'destructive'
                          }
                        >
                          {check.status === 'compliant' ? 'Compliant' :
                           check.status === 'partial' ? 'Partial' :
                           'Non-Compliant'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Compliance Score</span>
                          <span className="font-medium">{check.score}%</span>
                        </div>
                        <Progress value={check.score} className="h-3" />
                        <p className="text-xs text-muted-foreground">
                          Last assessed 2 days ago
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Monitoring Tab */}
            <TabsContent value="monitoring" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Real-time Security Monitoring</CardTitle>
                  <CardDescription>Live security event stream</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <ClockIcon className="w-12 h-12 mx-auto mb-4" />
                    <p>Monitoring dashboard coming soon...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
} 