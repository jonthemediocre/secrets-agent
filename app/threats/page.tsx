'use client'

import { PageHeader } from '@/components/page-header'
import { Breadcrumb } from '@/components/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExclamationTriangleIcon, ShieldCheckIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function ThreatsPage() {
  const threats = [
    { id: 1, type: 'Critical', description: 'Exposed API keys detected', status: 'active', severity: 'high' },
    { id: 2, type: 'Warning', description: 'Weak password policy', status: 'investigating', severity: 'medium' },
    { id: 3, type: 'Info', description: 'Unusual access pattern', status: 'resolved', severity: 'low' }
  ]

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <PageHeader title="Threat Intelligence" description="AI-powered threat detection and response">
        <Button>
          <ShieldCheckIcon className="mr-2 h-4 w-4" />
          Scan Now
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">3</span>
            </div>
            <p className="text-sm text-muted-foreground">Active Threats</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">7</span>
            </div>
            <p className="text-sm text-muted-foreground">Under Investigation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">24</span>
            </div>
            <p className="text-sm text-muted-foreground">Resolved This Week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Threats</CardTitle>
          <CardDescription>Latest security threats and incidents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {threats.map((threat) => (
              <div key={threat.id} className="flex items-center justify-between border-b pb-4">
                <div>
                  <div className="font-medium">{threat.description}</div>
                  <div className="text-sm text-muted-foreground">{threat.type}</div>
                </div>
                <Badge variant={threat.severity === 'high' ? 'destructive' : 'outline'}>
                  {threat.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 