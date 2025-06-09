'use client'

import React, { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Breadcrumb } from '@/components/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CogIcon
} from '@heroicons/react/24/outline'

export default function CompliancePage() {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  const complianceFrameworks = [
    { name: 'SOC 2', score: 95, status: 'compliant', issues: 2 },
    { name: 'ISO 27001', score: 88, status: 'compliant', issues: 5 },
    { name: 'GDPR', score: 92, status: 'compliant', issues: 3 },
    { name: 'HIPAA', score: 78, status: 'warning', issues: 8 },
    { name: 'PCI DSS', score: 85, status: 'compliant', issues: 4 }
  ]

  const recentAudits = [
    { id: 1, type: 'SOC 2 Type II', date: '2025-01-15', status: 'passed', auditor: 'Deloitte' },
    { id: 2, type: 'GDPR Assessment', date: '2025-01-10', status: 'passed', auditor: 'Internal' },
    { id: 3, type: 'Security Review', date: '2025-01-05', status: 'passed', auditor: 'PwC' }
  ]

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true)
    // Simulate report generation
    setTimeout(() => {
      setIsGeneratingReport(false)
      alert('Compliance report generated successfully!')
    }, 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-100 text-green-700">Compliant</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-700">Needs Attention</Badge>
      case 'non-compliant':
        return <Badge variant="destructive">Non-Compliant</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />
      
      <PageHeader
        title="Compliance Monitoring"
        description="Automated compliance monitoring and reporting across multiple frameworks"
      >
        <div className="flex gap-2">
          <Button variant="outline">
            <ArrowPathIcon className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleGenerateReport} disabled={isGeneratingReport}>
            <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
            {isGeneratingReport ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
          <TabsTrigger value="audits">Audits</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">87%</span>
                </div>
                <p className="text-sm text-muted-foreground">Overall Compliance</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">22</span>
                </div>
                <p className="text-sm text-muted-foreground">Open Issues</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold">5</span>
                </div>
                <p className="text-sm text-muted-foreground">Frameworks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-purple-500" />
                  <span className="text-2xl font-bold">12</span>
                </div>
                <p className="text-sm text-muted-foreground">Reports Generated</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Score by Framework</CardTitle>
              <CardDescription>Current compliance status across all monitored frameworks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceFrameworks.map((framework) => (
                  <div key={framework.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-20 font-medium">{framework.name}</div>
                      <div className="flex-1 max-w-xs">
                        <Progress value={framework.score} className="h-2" />
                      </div>
                      <div className="text-sm font-medium">{framework.score}%</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(framework.status)}
                      <span className="text-sm text-muted-foreground">
                        {framework.issues} issues
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frameworks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {complianceFrameworks.map((framework) => (
              <Card key={framework.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{framework.name}</CardTitle>
                    {getStatusBadge(framework.status)}
                  </div>
                  <CardDescription>Compliance score: {framework.score}%</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={framework.score} />
                    <div className="flex justify-between text-sm">
                      <span>Issues to resolve: {framework.issues}</span>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Audits</CardTitle>
              <CardDescription>History of compliance audits and assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAudits.map((audit) => (
                  <div key={audit.id} className="flex items-center justify-between border-b pb-4">
                    <div>
                      <div className="font-medium">{audit.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {audit.date} • {audit.auditor}
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      {audit.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Settings</CardTitle>
              <CardDescription>Configure compliance monitoring and reporting settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button variant="outline">
                  <CogIcon className="mr-2 h-4 w-4" />
                  Configure Frameworks
                </Button>
                <Button variant="outline">
                  <ChartBarIcon className="mr-2 h-4 w-4" />
                  Set Thresholds
                </Button>
                <Button variant="outline">
                  <DocumentTextIcon className="mr-2 h-4 w-4" />
                  Report Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 