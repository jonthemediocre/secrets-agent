'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Breadcrumb } from '@/components/breadcrumb'
import { PageHeader } from '@/components/page-header'
import { Users, Bot, Shield, Activity, Plus, Settings, Play, Pause } from 'lucide-react'

export default function AgentsPage() {
  const agents = [
    {
      id: 1,
      name: "Security Scanner",
      type: "Security",
      status: "Active",
      uptime: "99.8%",
      lastRun: "2 minutes ago",
      description: "Continuously scans for security vulnerabilities and compliance violations"
    },
    {
      id: 2,
      name: "Secret Rotator",
      type: "Automation",
      status: "Active", 
      uptime: "99.5%",
      lastRun: "5 minutes ago",
      description: "Automatically rotates secrets and API keys on scheduled intervals"
    },
    {
      id: 3,
      name: "Compliance Monitor",
      type: "Compliance",
      status: "Active",
      uptime: "100%",
      lastRun: "1 minute ago",
      description: "Monitors compliance with security policies and regulatory requirements"
    },
    {
      id: 4,
      name: "Access Validator",
      type: "Access Control",
      status: "Paused",
      uptime: "98.2%",
      lastRun: "1 hour ago",
      description: "Validates access permissions and identifies anomalous access patterns"
    }
  ]

  const agentStats = [
    { name: "Total Agents", value: "12", change: "+2 this week", icon: Bot },
    { name: "Active Agents", value: "9", change: "+1 today", icon: Activity },
    { name: "Security Agents", value: "5", change: "No change", icon: Shield },
    { name: "Average Uptime", value: "99.1%", change: "+0.3% this month", icon: Users }
  ]

  return (
    <div className="space-y-6">
      <Breadcrumb />
      
      <PageHeader
        title="Agent Management"
        description="Manage and monitor your automated security agents"
      >
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Deploy Agent
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {agentStats.map((stat) => (
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

      {/* Active Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Active Agents</CardTitle>
          <CardDescription>
            Currently deployed and running security agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">{agent.name}</h3>
                    <Badge variant={agent.status === 'Active' ? 'default' : 'secondary'}>
                      {agent.status}
                    </Badge>
                    <Badge variant="outline">{agent.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>Uptime: {agent.uptime}</span>
                    <span>Last run: {agent.lastRun}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                  {agent.status === 'Active' ? (
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

      {/* Agent Health */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Overall agent system performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>CPU Usage</span>
                <span>23%</span>
              </div>
              <Progress value={23} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Memory Usage</span>
                <span>45%</span>
              </div>
              <Progress value={45} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Network I/O</span>
                <span>12%</span>
              </div>
              <Progress value={12} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest agent actions and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  Security Scanner detected 3 new vulnerabilities
                </AlertDescription>
              </Alert>
              <Alert>
                <Bot className="h-4 w-4" />
                <AlertDescription>
                  Secret Rotator successfully updated 15 API keys
                </AlertDescription>
              </Alert>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Compliance Monitor found 2 policy violations
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 