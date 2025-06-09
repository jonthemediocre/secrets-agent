'use client'

import React, { useState, useEffect } from 'react'
import {
  BeakerIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PlusIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowPathIcon,
  PlayIcon,
  PauseIcon,
  CpuChipIcon,
  BoltIcon,
  CommandLineIcon,
  BookOpenIcon,
  CubeIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

// Modern Stats Component
const StatsCard = ({ title, value, subtitle, icon: Icon, trend, className = "" }: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}) => (
  <Card className={className}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          trend === 'up' ? 'bg-green-100 dark:bg-green-900/20' :
          trend === 'down' ? 'bg-red-100 dark:bg-red-900/20' :
          'bg-blue-100 dark:bg-blue-900/20'
        }`}>
          <Icon className={`w-6 h-6 ${
            trend === 'up' ? 'text-green-600 dark:text-green-400' :
            trend === 'down' ? 'text-red-600 dark:text-red-400' :
            'text-blue-600 dark:text-blue-400'
          }`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function MDCDashboard() {
  const stats = {
    totalRules: 636,
    validRules: 589,
    conflictRules: 18,
    pendingRules: 29,
    healthScore: 92.5,
    lastScan: '2 minutes ago'
  }

  const tools = [
    {
      id: 'validator',
      name: 'Rule Validator',
      status: 'active',
      icon: ShieldCheckIcon,
      description: 'Validates syntax and logic',
      lastRun: '2m ago',
      success: true,
      performance: 98
    },
    {
      id: 'generator',
      name: 'AI Generator',
      status: 'idle',
      icon: CpuChipIcon,
      description: 'AI-powered rule creation',
      lastRun: '15m ago',
      success: true,
      performance: 94
    },
    {
      id: 'monitor',
      name: 'Live Monitor',
      status: 'monitoring',
      icon: EyeIcon,
      description: 'Real-time rule monitoring',
      lastRun: 'Active',
      success: true,
      performance: 100
    },
    {
      id: 'optimizer',
      name: 'Performance Optimizer',
      status: 'idle',
      icon: BoltIcon,
      description: 'Rule performance tuning',
      lastRun: '1h ago',
      success: true,
      performance: 87
    }
  ]

  const recentActivity = [
    { 
      id: 1, 
      action: 'Rule validation completed', 
      description: '18 conflicts detected and resolved', 
      time: '2 minutes ago', 
      type: 'success',
      icon: CheckCircleIcon
    },
    { 
      id: 2, 
      action: 'AI rule generated', 
      description: 'Authentication rule for API endpoints', 
      time: '15 minutes ago', 
      type: 'success',
      icon: CpuChipIcon
    },
    { 
      id: 3, 
      action: 'Performance scan', 
      description: '636 rules optimized for speed', 
      time: '30 minutes ago', 
      type: 'info',
      icon: BoltIcon
    },
    { 
      id: 4, 
      action: 'Conflict resolution', 
      description: 'Auto-resolved 3 rule overlaps', 
      time: '1 hour ago', 
      type: 'warning',
      icon: ExclamationTriangleIcon
    }
  ]

  const ruleCategories = [
    { name: 'Authentication', count: 89, percentage: 14, color: 'bg-blue-500', change: '+3' },
    { name: 'Authorization', count: 124, percentage: 19, color: 'bg-green-500', change: '+7' },
    { name: 'Validation', count: 156, percentage: 25, color: 'bg-purple-500', change: '+2' },
    { name: 'Security', count: 98, percentage: 15, color: 'bg-red-500', change: '-1' },
    { name: 'Performance', count: 67, percentage: 11, color: 'bg-orange-500', change: '+5' },
    { name: 'Logging', count: 102, percentage: 16, color: 'bg-cyan-500', change: '+1' }
  ]

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Rules"
          value={stats.totalRules.toLocaleString()}
          subtitle="+12 this week"
          icon={DocumentTextIcon}
          trend="up"
        />
        <StatsCard
          title="Health Score"
          value={`${stats.healthScore}%`}
          subtitle="+2.3% improvement"
          icon={ChartBarIcon}
          trend="up"
        />
        <StatsCard
          title="Active Conflicts"
          value={stats.conflictRules}
          subtitle="3 auto-resolved"
          icon={ExclamationTriangleIcon}
          trend="down"
        />
        <StatsCard
          title="Pending Review"
          value={stats.pendingRules}
          subtitle="Review needed"
          icon={ClockIcon}
          trend="stable"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Tools */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <CubeIcon className="w-5 h-5 mr-2" />
                  MDC System Tools
                </CardTitle>
                <CardDescription>Automated rule management and optimization</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Tool
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map((tool) => (
                <Card key={tool.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          tool.status === 'active' ? 'bg-green-100 dark:bg-green-900/30' :
                          tool.status === 'monitoring' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          'bg-muted'
                        }`}>
                          <tool.icon className={`w-5 h-5 ${
                            tool.status === 'active' ? 'text-green-600' :
                            tool.status === 'monitoring' ? 'text-blue-600' :
                            'text-muted-foreground'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{tool.name}</h4>
                          <p className="text-xs text-muted-foreground">{tool.description}</p>
                        </div>
                      </div>
                      <Badge variant={
                        tool.status === 'active' ? 'default' : 
                        tool.status === 'monitoring' ? 'secondary' : 
                        'outline'
                      }>
                        {tool.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Performance</span>
                        <span>{tool.performance}%</span>
                      </div>
                      <Progress value={tool.performance} className="h-1.5" />
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        {tool.success ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="w-4 h-4 text-destructive" />
                        )}
                        <span className="text-xs text-muted-foreground">{tool.lastRun}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        {tool.status === 'monitoring' ? (
                          <PauseIcon className="w-3 h-3" />
                        ) : (
                          <PlayIcon className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BoltIcon className="w-5 h-5 mr-2" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system events and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'success' ? 'bg-green-100 dark:bg-green-900/20' :
                      activity.type === 'warning' ? 'bg-orange-100 dark:bg-orange-900/20' :
                      'bg-blue-100 dark:bg-blue-900/20'
                    }`}>
                      <activity.icon className={`w-4 h-4 ${
                        activity.type === 'success' ? 'text-green-600 dark:text-green-400' :
                        activity.type === 'warning' ? 'text-orange-600 dark:text-orange-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Rule Categories Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AdjustmentsHorizontalIcon className="w-5 h-5 mr-2" />
            Rule Categories Overview
          </CardTitle>
          <CardDescription>Distribution and trends across rule types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ruleCategories.map((category, index) => (
              <div key={index} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${category.color}`} />
                    <span className="font-medium text-sm">{category.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {category.change}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold">{category.count}</span>
                    <span className="text-sm text-muted-foreground">{category.percentage}%</span>
                  </div>
                  <Progress value={category.percentage} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}