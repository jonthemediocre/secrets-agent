'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Breadcrumb } from '@/components/breadcrumb'
import { PageHeader } from '@/components/page-header'
import { FileText, Shield, CheckCircle, AlertTriangle, Plus, Edit, Eye, Download } from 'lucide-react'

export default function PoliciesPage() {
  const policies = [
    {
      id: 1,
      name: "Data Protection Policy",
      framework: "GDPR",
      status: "Active",
      compliance: 95,
      lastReview: "2 weeks ago",
      version: "v2.1",
      description: "Comprehensive data protection and privacy policy"
    },
    {
      id: 2,
      name: "Access Control Framework",
      framework: "SOC 2",
      status: "Active",
      compliance: 88,
      lastReview: "1 month ago",
      version: "v1.3",
      description: "Enterprise access control and identity management policy"
    },
    {
      id: 3,
      name: "Incident Response Plan",
      framework: "ISO 27001",
      status: "Active",
      compliance: 92,
      lastReview: "3 weeks ago",
      version: "v3.0",
      description: "Security incident response and recovery procedures"
    },
    {
      id: 4,
      name: "Third-Party Risk Assessment",
      framework: "NIST",
      status: "Under Review",
      compliance: 76,
      lastReview: "1 week ago",
      version: "v1.8",
      description: "Vendor and third-party security assessment policy"
    }
  ]

  const policyStats = [
    { name: "Total Policies", value: "24", change: "+3 this quarter", icon: FileText },
    { name: "Active Policies", value: "21", change: "+1 this month", icon: CheckCircle },
    { name: "Avg Compliance", value: "88%", change: "+2% this quarter", icon: Shield },
    { name: "Due for Review", value: "6", change: "+2 this week", icon: AlertTriangle }
  ]

  const complianceFrameworks = [
    { name: "GDPR", policies: 8, compliance: 92, color: "bg-green-500" },
    { name: "SOC 2", policies: 6, compliance: 85, color: "bg-blue-500" },
    { name: "ISO 27001", policies: 7, compliance: 89, color: "bg-purple-500" },
    { name: "NIST", policies: 3, compliance: 78, color: "bg-orange-500" }
  ]

  return (
    <div className="space-y-6">
      <Breadcrumb />
      
      <PageHeader
        title="Policy Management"
        description="Manage security policies and compliance frameworks"
      >
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Policy
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {policyStats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Frameworks */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Frameworks</CardTitle>
          <CardDescription>
            Overview of policies organized by compliance framework
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {complianceFrameworks.map((framework) => (
              <div key={framework.name} className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${framework.color}`}></div>
                  <h3 className="font-semibold">{framework.name}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Policies</span>
                    <span>{framework.policies}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Compliance</span>
                    <span className="font-medium">{framework.compliance}%</span>
                  </div>
                  <Progress value={framework.compliance} className="mt-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Security Policies</CardTitle>
          <CardDescription>
            Currently active policies and their compliance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {policies.map((policy) => (
              <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">{policy.name}</h3>
                    <Badge variant={policy.status === 'Active' ? 'default' : 'secondary'}>
                      {policy.status}
                    </Badge>
                    <Badge variant="outline">{policy.framework}</Badge>
                    <Badge variant="outline">{policy.version}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{policy.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>Compliance: {policy.compliance}%</span>
                    <span>Last review: {policy.lastReview}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <div className="text-right mr-4">
                    <div className="text-sm font-medium">{policy.compliance}%</div>
                    <Progress value={policy.compliance} className="w-20" />
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Policy Alerts & Reviews */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Policy Alerts</CardTitle>
            <CardDescription>Recent policy violations and compliance issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Data Protection Policy: 2 compliance violations detected
                </AlertDescription>
              </Alert>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Access Control Framework: Review required for SOC 2 audit
                </AlertDescription>
              </Alert>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Incident Response Plan: Successfully passed compliance check
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Reviews</CardTitle>
            <CardDescription>Policies scheduled for review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded">
                <div>
                  <div className="font-medium">Third-Party Risk Assessment</div>
                  <div className="text-sm text-muted-foreground">Due in 3 days</div>
                </div>
                <Badge variant="outline">NIST</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded">
                <div>
                  <div className="font-medium">Password Policy</div>
                  <div className="text-sm text-muted-foreground">Due in 1 week</div>
                </div>
                <Badge variant="outline">SOC 2</Badge>
              </div>
              <div className="flex justify-between items-center p-3 border rounded">
                <div>
                  <div className="font-medium">Encryption Standards</div>
                  <div className="text-sm text-muted-foreground">Due in 2 weeks</div>
                </div>
                <Badge variant="outline">ISO 27001</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 