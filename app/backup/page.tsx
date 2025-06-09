'use client'

import { PageHeader } from '@/components/page-header'
import { Breadcrumb } from '@/components/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CloudIcon, ArrowDownTrayIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function BackupPage() {
  const backups = [
    { id: 1, name: 'Daily Vault Backup', lastRun: '2025-06-08 02:00', status: 'success', size: '2.3 GB' },
    { id: 2, name: 'Secrets Archive', lastRun: '2025-06-08 01:30', status: 'success', size: '450 MB' },
    { id: 3, name: 'Config Backup', lastRun: '2025-06-07 23:45', status: 'pending', size: '12 MB' }
  ]

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <PageHeader title="Backup & Recovery" description="Automated backup and disaster recovery">
        <Button>
          <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
          Create Backup
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CloudIcon className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">12</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Backups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">99.9%</span>
            </div>
            <p className="text-sm text-muted-foreground">Success Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">5.2 GB</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Size</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Backups</CardTitle>
          <CardDescription>Latest backup operations and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between border-b pb-4">
                <div>
                  <div className="font-medium">{backup.name}</div>
                  <div className="text-sm text-muted-foreground">Last run: {backup.lastRun}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{backup.size}</span>
                  <div className={`h-2 w-2 rounded-full ${backup.status === 'success' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 