'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Search,
  Filter,
  ExternalLink,
  Settings,
  Zap,
  Code
} from 'lucide-react'

interface UIElement {
  id: string
  location: string
  type: 'button' | 'input' | 'form' | 'modal' | 'toggle' | 'link' | 'dropdown'
  element: string
  expectedAction: string
  actualBinding: string
  status: 'working' | 'broken' | 'missing' | 'partial'
  priority: 'high' | 'medium' | 'low'
  lastTested?: string
  notes?: string
}

export const UIAuditReport = () => {
  const [elements, setElements] = useState<UIElement[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    // Comprehensive audit of all UI elements across the app
    const auditData: UIElement[] = [
      // Dashboard (app/page.tsx)
      {
        id: 'dashboard-sync-all',
        location: 'app/page.tsx',
        type: 'button',
        element: 'Sync All Button',
        expectedAction: 'Sync all services and refresh data',
        actualBinding: 'handleSyncAll() - Working',
        status: 'working',
        priority: 'high',
        lastTested: '2025-06-08'
      },
      {
        id: 'dashboard-deploy-agent',
        location: 'app/page.tsx',
        type: 'button',
        element: 'Deploy Agent Button',
        expectedAction: 'Deploy new agent instance',
        actualBinding: 'handleDeployAgent() - Working',
        status: 'working',
        priority: 'high',
        lastTested: '2025-06-08'
      },
      {
        id: 'dashboard-browse-registry',
        location: 'app/page.tsx',
        type: 'button',
        element: 'Browse Service Registry',
        expectedAction: 'Navigate to /harvester?tab=services',
        actualBinding: 'Link component - Working',
        status: 'working',
        priority: 'medium',
        lastTested: '2025-06-08'
      },
      {
        id: 'dashboard-start-harvest',
        location: 'app/page.tsx',
        type: 'button',
        element: 'Start Harvest Session',
        expectedAction: 'Navigate to /harvester?action=start',
        actualBinding: 'Link component - Working',
        status: 'working',
        priority: 'medium',
        lastTested: '2025-06-08'
      },

      // Harvester Page (app/harvester/page.tsx)
      {
        id: 'harvester-vacuum-process',
        location: 'app/harvester/page.tsx',
        type: 'button',
        element: 'Start Vacuum Process',
        expectedAction: 'Start cross-app secret vacuum',
        actualBinding: 'startVacuumProcess() - Working',
        status: 'working',
        priority: 'high',
        lastTested: '2025-06-08'
      },
      {
        id: 'harvester-export-registry',
        location: 'app/harvester/page.tsx',
        type: 'button',
        element: 'Export Registry',
        expectedAction: 'Download CSV export',
        actualBinding: 'exportRegistry() - Working',
        status: 'working',
        priority: 'medium',
        lastTested: '2025-06-08'
      },
      {
        id: 'harvester-harvest-service',
        location: 'app/harvester/page.tsx',
        type: 'button',
        element: 'Harvest Service Buttons',
        expectedAction: 'Start harvest session for service',
        actualBinding: 'startHarvestSession() - Working',
        status: 'working',
        priority: 'high',
        lastTested: '2025-06-08'
      },

      // Ecosystem Page (app/ecosystem/page.tsx)
      {
        id: 'ecosystem-add-project',
        location: 'app/ecosystem/page.tsx',
        type: 'button',
        element: 'Add Project Button',
        expectedAction: 'Open add project dialog',
        actualBinding: 'setIsAddDialogOpen(true) - Missing implementation',
        status: 'broken',
        priority: 'high',
        notes: 'Dialog opens but form submission not wired'
      },
      {
        id: 'ecosystem-import-project',
        location: 'app/ecosystem/page.tsx',
        type: 'button',
        element: 'Import Project Button',
        expectedAction: 'Open import dialog',
        actualBinding: 'setIsImportDialogOpen(true) - Missing implementation',
        status: 'broken',
        priority: 'high',
        notes: 'Dialog opens but import logic not implemented'
      },
      {
        id: 'ecosystem-project-actions',
        location: 'app/ecosystem/page.tsx',
        type: 'button',
        element: 'Project Action Buttons',
        expectedAction: 'Remove/sync/inject for projects',
        actualBinding: 'Functions defined but API calls missing',
        status: 'partial',
        priority: 'high',
        notes: 'UI feedback works but no actual API integration'
      },

      // Discovery Page (app/discovery/page.tsx)
      {
        id: 'discovery-start-scan',
        location: 'app/discovery/page.tsx',
        type: 'button',
        element: 'Start Discovery Scan',
        expectedAction: 'Initiate AI discovery process',
        actualBinding: 'startDiscovery() - API integration incomplete',
        status: 'broken',
        priority: 'high',
        notes: 'Makes API call but endpoint returns 404'
      },
      {
        id: 'discovery-setup-cicd',
        location: 'app/discovery/page.tsx',
        type: 'button',
        element: 'Setup CI/CD Integration',
        expectedAction: 'Configure CI/CD hooks',
        actualBinding: 'setupCICD() - API integration incomplete',
        status: 'broken',
        priority: 'medium',
        notes: 'API endpoint not implemented'
      },

      // Side Navigation (components/side-nav.tsx)
      {
        id: 'sidenav-theme-toggle',
        location: 'components/side-nav.tsx',
        type: 'toggle',
        element: 'Dark/Light Mode Toggle',
        expectedAction: 'Switch between dark/light themes',
        actualBinding: 'toggleTheme() prop - Working',
        status: 'working',
        priority: 'low',
        lastTested: '2025-06-08'
      },
      {
        id: 'sidenav-notifications',
        location: 'components/side-nav.tsx',
        type: 'button',
        element: 'Notifications Bell',
        expectedAction: 'Show notifications panel',
        actualBinding: 'onClick handler with mock notifications',
        status: 'working',
        priority: 'medium',
        lastTested: '2025-06-08',
        notes: 'Now shows mock notification content'
      },
      {
        id: 'sidenav-navigation-links',
        location: 'components/side-nav.tsx',
        type: 'link',
        element: 'Navigation Menu Items',
        expectedAction: 'Navigate to respective pages',
        actualBinding: 'Link components - Working',
        status: 'working',
        priority: 'high',
        lastTested: '2025-06-08'
      },

      // Auth/Login Page (app/auth/login/page.tsx)
      {
        id: 'auth-login-form',
        location: 'app/auth/login/page.tsx',
        type: 'form',
        element: 'Login Form',
        expectedAction: 'Authenticate user',
        actualBinding: 'handleSubmit() - Working with dev credentials',
        status: 'working',
        priority: 'high',
        lastTested: '2025-06-08',
        notes: 'Dev credentials work, production auth needs testing'
      },

      // Vault Pages (app/vault/page.tsx, app/vaults/page.tsx)
      {
        id: 'vault-crud-operations',
        location: 'app/vault/page.tsx, app/vaults/page.tsx',
        type: 'button',
        element: 'Vault CRUD Buttons',
        expectedAction: 'Create/Read/Update/Delete vaults and secrets',
        actualBinding: 'API integration needed',
        status: 'missing',
        priority: 'high',
        notes: 'Large pages need comprehensive audit'
      },

      // Loading Screen (components/LoadingScreen.tsx)
      {
        id: 'loading-screen',
        location: 'components/LoadingScreen.tsx',
        type: 'button',
        element: 'Skip Loading Button',
        expectedAction: 'Skip to main app',
        actualBinding: 'No skip functionality',
        status: 'missing',
        priority: 'low',
        notes: 'Consider adding skip button for development'
      },

      // Settings Page (app/settings/page.tsx)
      {
        id: 'settings-profile-form',
        location: 'app/settings/page.tsx',
        type: 'form',
        element: 'Profile Information Form',
        expectedAction: 'Update user profile data',
        actualBinding: 'API integration with /api/settings - Working',
        status: 'working',
        priority: 'medium',
        lastTested: '2025-06-08'
      },
      {
        id: 'settings-preferences',
        location: 'app/settings/page.tsx',
        type: 'toggle',
        element: 'Preference Toggles & Sliders',
        expectedAction: 'Update user preferences',
        actualBinding: 'State management with API persistence - Working',
        status: 'working',
        priority: 'medium',
        lastTested: '2025-06-08'
      },
      {
        id: 'settings-security',
        location: 'app/settings/page.tsx',
        type: 'toggle',
        element: 'Security Settings',
        expectedAction: 'Configure security preferences',
        actualBinding: 'Switch components with validation - Working',
        status: 'working',
        priority: 'high',
        lastTested: '2025-06-08'
      },
      {
        id: 'settings-admin-controls',
        location: 'app/settings/page.tsx',
        type: 'form',
        element: 'Admin System Controls',
        expectedAction: 'Configure system-wide settings',
        actualBinding: 'Role-based access with API integration - Working',
        status: 'working',
        priority: 'high',
        lastTested: '2025-06-08'
      },
      {
        id: 'settings-save-reset',
        location: 'app/settings/page.tsx',
        type: 'button',
        element: 'Save/Reset/Import/Export Buttons',
        expectedAction: 'Manage settings persistence',
        actualBinding: 'API calls with loading states - Working',
        status: 'working',
        priority: 'high',
        lastTested: '2025-06-08'
      }
    ]

    setElements(auditData)
  }, [])

  const filteredElements = elements.filter(element => {
    const matchesSearch = element.element.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         element.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || element.status === filterStatus
    const matchesType = filterType === 'all' || element.type === filterType
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'broken': return <XCircle className="h-4 w-4 text-red-500" />
      case 'missing': return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'working': return <Badge className="bg-green-100 text-green-700">Working</Badge>
      case 'broken': return <Badge variant="destructive">Broken</Badge>
      case 'missing': return <Badge variant="secondary">Missing</Badge>
      case 'partial': return <Badge className="bg-yellow-100 text-yellow-700">Partial</Badge>
      default: return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">High</Badge>
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-700">Medium</Badge>
      case 'low': return <Badge variant="outline">Low</Badge>
      default: return <Badge variant="outline">Unknown</Badge>
    }
  }

  const stats = {
    total: elements.length,
    working: elements.filter(e => e.status === 'working').length,
    broken: elements.filter(e => e.status === 'broken').length,
    missing: elements.filter(e => e.status === 'missing').length,
    partial: elements.filter(e => e.status === 'partial').length
  }

  const completionRate = Math.round((stats.working / stats.total) * 100)

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Elements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Working
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.working}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Broken/Missing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.broken + stats.missing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search elements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-input bg-background rounded-md"
        >
          <option value="all">All Status</option>
          <option value="working">Working</option>
          <option value="broken">Broken</option>
          <option value="missing">Missing</option>
          <option value="partial">Partial</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-input bg-background rounded-md"
        >
          <option value="all">All Types</option>
          <option value="button">Buttons</option>
          <option value="form">Forms</option>
          <option value="link">Links</option>
          <option value="modal">Modals</option>
          <option value="toggle">Toggles</option>
        </select>
      </div>

      {/* Elements Table */}
      <Card>
        <CardHeader>
          <CardTitle>UI Elements Audit</CardTitle>
          <CardDescription>
            Comprehensive audit of all interactive elements across the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {filteredElements.map((element) => (
                <div key={element.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(element.status)}
                        <h4 className="font-semibold">{element.element}</h4>
                        <Badge variant="outline" className="text-xs">
                          {element.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{element.location}</p>
                      <p className="text-sm">{element.expectedAction}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(element.status)}
                      {getPriorityBadge(element.priority)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Current Binding: </span>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {element.actualBinding}
                      </code>
                    </div>
                    
                    {element.notes && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Notes: </span>
                        {element.notes}
                      </div>
                    )}
                    
                    {element.lastTested && (
                      <div className="text-xs text-muted-foreground">
                        Last tested: {element.lastTested}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredElements.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No elements match your current filters.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
} 