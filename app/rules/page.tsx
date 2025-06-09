'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Breadcrumb } from '@/components/breadcrumb'
import { PageHeader } from '@/components/page-header'
import { Shield, AlertTriangle, CheckCircle, Clock, Plus, Edit, Play, Pause } from 'lucide-react'

export default function RulesPage() {
  const rules = [
    {
      id: 1,
      name: "Password Complexity Check",
      category: "Authentication",
      status: "Active",
      priority: "High",
      violations: 12,
      lastTriggered: "5 minutes ago",
      description: "Enforces minimum password complexity requirements"
    },
    {
      id: 2,
      name: "Secret Rotation Policy",
      category: "Secrets Management",
      status: "Active",
      priority: "Critical",
      violations: 3,
      lastTriggered: "1 hour ago",
      description: "Ensures secrets are rotated within specified timeframes"
    },
    {
      id: 3,
      name: "Access Permission Audit",
      category: "Access Control",
      status: "Active",
      priority: "Medium",
      violations: 8,
      lastTriggered: "15 minutes ago",
      description: "Monitors and validates user access permissions"
    },
    {
      id: 4,
      name: "Network Security Scan",
      category: "Network Security",
      status: "Paused",
      priority: "High",
      violations: 0,
      lastTriggered: "2 hours ago",
      description: "Scans for network vulnerabilities and misconfigurations"
    }
  ]

  const ruleStats = [
    { name: "Total Rules", value: "42", change: "+5 this week", icon: Shield },
    { name: "Active Rules", value: "38", change: "+2 today", icon: CheckCircle },
    { name: "Rule Violations", value: "23", change: "-7 from yesterday", icon: AlertTriangle },
    { name: "Avg Response Time", value: "1.2s", change: "+0.1s this week", icon: Clock }
  ]

  const ruleCategories = [
    { name: "Authentication", count: 8, active: 7 },
    { name: "Secrets Management", count: 12, active: 11 },
    { name: "Access Control", count: 15, active: 14 },
    { name: "Network Security", count: 7, active: 6 }
  ]

  return (
    <div className="space-y-6">
      <Breadcrumb />
      
      <PageHeader
        title="Rule Engine"
        description="Manage and monitor security rules and compliance policies"
      >
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {ruleStats.map((stat) => (
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

      {/* Rule Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Rule Categories</CardTitle>
          <CardDescription>
            Overview of rules organized by security category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {ruleCategories.map((category) => (
              <div key={category.name} className="p-4 border rounded-lg">
                <h3 className="font-semibold">{category.name}</h3>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Total Rules</span>
                    <span>{category.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Active</span>
                    <span className="text-green-600">{category.active}</span>
                  </div>
                  <Progress value={(category.active / category.count) * 100} className="mt-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Security Rules</CardTitle>
          <CardDescription>
            Currently configured security rules and policies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">{rule.name}</h3>
                    <Badge variant={rule.status === 'Active' ? 'default' : 'secondary'}>
                      {rule.status}
                    </Badge>
                    <Badge variant={
                      rule.priority === 'Critical' ? 'destructive' :
                      rule.priority === 'High' ? 'default' : 'outline'
                    }>
                      {rule.priority}
                    </Badge>
                    <Badge variant="outline">{rule.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>Violations: {rule.violations}</span>
                    <span>Last triggered: {rule.lastTriggered}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  {rule.status === 'Active' ? (
                    <Button variant="outline" size="sm">
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Violations */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Violations</CardTitle>
            <CardDescription>Latest rule violations and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Password Complexity Check: 3 weak passwords detected
                </AlertDescription>
              </Alert>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Secret Rotation Policy: 2 secrets exceeded rotation window
                </AlertDescription>
              </Alert>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Access Permission Audit: 5 unauthorized access attempts blocked
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rule Performance</CardTitle>
            <CardDescription>System performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Rule Processing Time</span>
                <span>1.2s avg</span>
              </div>
              <Progress value={75} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Detection Accuracy</span>
                <span>97.3%</span>
              </div>
              <Progress value={97} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>False Positive Rate</span>
                <span>2.1%</span>
              </div>
              <Progress value={21} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 