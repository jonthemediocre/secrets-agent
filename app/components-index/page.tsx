'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from '@/components/breadcrumb'
import { PageHeader } from '@/components/page-header'

export default function IndexPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb />
      
      <PageHeader
        title="Component Index"
        description="Comprehensive application overview"
      />

      <Card>
        <CardHeader>
          <CardTitle>Application Overview</CardTitle>
          <CardDescription>Complete system documentation and component index</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-semibold">Secrets Agent Enterprise Platform</h3>
            <p className="text-muted-foreground">
              A comprehensive security platform built with Next.js, TypeScript, and shadcn/ui components.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Application Pages</h4>
                <div className="space-y-1">
                  <Badge variant="outline">Dashboard (/)</Badge>
                  <Badge variant="outline">Security (/security)</Badge>
                  <Badge variant="outline">Vaults (/vaults)</Badge>
                  <Badge variant="outline">Agents (/agents)</Badge>
                  <Badge variant="outline">Rules (/rules)</Badge>
                  <Badge variant="outline">Policies (/policies)</Badge>
                  <Badge variant="outline">Analytics (/analytics)</Badge>
                  <Badge variant="outline">Research (/research)</Badge>
                  <Badge variant="outline">Developer (/developer)</Badge>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Core Components</h4>
                <div className="space-y-1">
                  <Badge>Card</Badge>
                  <Badge>Button</Badge>
                  <Badge>Badge</Badge>
                  <Badge>Alert</Badge>
                  <Badge>Progress</Badge>
                  <Badge>Table</Badge>
                  <Badge>SideNav</Badge>
                  <Badge>PageHeader</Badge>
                  <Badge>Breadcrumb</Badge>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-medium mb-2">Technical Stack</h4>
              <div className="flex flex-wrap gap-2">
                <Badge>Next.js 14</Badge>
                <Badge>React 18</Badge>
                <Badge>TypeScript</Badge>
                <Badge>shadcn/ui</Badge>
                <Badge>Tailwind CSS</Badge>
                <Badge>Heroicons</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 