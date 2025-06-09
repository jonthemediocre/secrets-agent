'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Breadcrumb } from '@/components/breadcrumb'
import { PageHeader } from '@/components/page-header'
import { TrendingUp, TrendingDown, BarChart3, Activity, Download, RefreshCw } from 'lucide-react'

export default function AnalyticsPage() {
  const metrics = [
    { name: "Security Score", value: "94.2", change: "+2.1%", trend: "up", icon: TrendingUp },
    { name: "Threat Detection", value: "99.7%", change: "+0.3%", trend: "up", icon: Activity },
    { name: "Response Time", value: "1.2s", change: "-0.2s", trend: "down", icon: TrendingDown },
    { name: "System Uptime", value: "99.98%", change: "+0.01%", trend: "up", icon: BarChart3 }
  ]

  const trends = [
    { period: "Last 7 days", threats: 142, incidents: 3, resolved: 98.2 },
    { period: "Last 30 days", threats: 847, incidents: 12, resolved: 97.8 },
    { period: "Last 90 days", threats: 2534, incidents: 28, resolved: 97.4 },
    { period: "Last year", threats: 12847, incidents: 156, resolved: 96.9 }
  ]

  return (
    <div className="space-y-6">
      <Breadcrumb />
      
      <PageHeader
        title="Security Analytics"
        description="Performance insights and security trends"
      >
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className={`text-xs ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {metric.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Security Trends</CardTitle>
          <CardDescription>Historical security metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trends.map((trend, index) => (
              <div key={trend.period} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{trend.period}</h3>
                    <p className="text-sm text-muted-foreground">
                      {trend.threats} threats detected • {trend.incidents} incidents
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-lg">{trend.resolved}%</div>
                  <div className="text-sm text-muted-foreground">Resolution Rate</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Threat Detection Over Time</CardTitle>
            <CardDescription>Daily threat detection rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chart visualization would be rendered here</p>
                <p className="text-sm">Integration with charting library needed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
            <CardDescription>Resource utilization and response times</CardDescription>
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
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Disk Usage</span>
                <span>67%</span>
              </div>
              <Progress value={67} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 