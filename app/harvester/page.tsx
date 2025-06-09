'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Breadcrumb } from '@/components/breadcrumb'
import { PageHeader } from '@/components/page-header'
import { 
  Download, 
  Search, 
  Globe, 
  Terminal, 
  ExternalLink, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Cpu,
  Bot,
  Play,
  Settings,
  Filter,
  ArrowRight
} from 'lucide-react'

interface APIService {
  id: string
  name: string
  description: string
  category: string
  popularity: number
  cliSupported: boolean
  guidedSetupRequired: boolean
  status: 'available' | 'installed' | 'configured' | 'error'
  lastHarvested?: string
}

interface HarvestSession {
  id: string
  serviceId: string
  serviceName: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  progress: number
  steps: string[]
  startedAt: string
  completedAt?: string
}

export default function HarvesterPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [harvestSessions, setHarvestSessions] = useState<HarvestSession[]>([])
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [vacuumProcessing, setVacuumProcessing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [scanning, setScanning] = useState(false)

  // Mock API Services - would be populated from APIServiceRegistry
  const [apiServices] = useState<APIService[]>([
    {
      id: 'github',
      name: 'GitHub',
      description: 'World\'s largest code hosting platform',
      category: 'development-tools',
      popularity: 99,
      cliSupported: true,
      guidedSetupRequired: false,
      status: 'configured'
    },
    {
      id: 'aws',
      name: 'Amazon Web Services',
      description: 'Leading cloud computing platform',
      category: 'cloud-infrastructure',
      popularity: 98,
      cliSupported: true,
      guidedSetupRequired: false,
      status: 'installed'
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'Advanced AI language models and APIs',
      category: 'ai-ml',
      popularity: 95,
      cliSupported: false,
      guidedSetupRequired: true,
      status: 'available'
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Online payment processing platform',
      category: 'payment',
      popularity: 92,
      cliSupported: true,
      guidedSetupRequired: false,
      status: 'available'
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'AI safety company with Claude AI',
      category: 'ai-ml',
      popularity: 85,
      cliSupported: false,
      guidedSetupRequired: true,
      status: 'available'
    }
  ])

  const categories = [
    'all',
    'development-tools',
    'cloud-infrastructure',
    'ai-ml',
    'payment',
    'communication',
    'database',
    'monitoring'
  ]

  const filteredServices = apiServices.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const startHarvestSession = async (serviceId: string) => {
    const service = apiServices.find(s => s.id === serviceId)
    if (!service) return

    setLoading(true)
    
    const newSession: HarvestSession = {
      id: `harvest_${serviceId}_${Date.now()}`,
      serviceId,
      serviceName: service.name,
      status: 'in-progress',
      progress: 0,
      steps: [
        'Checking CLI tool availability',
        'Installing required tools',
        'Authenticating with service',
        'Extracting credentials',
        'Storing in vault'
      ],
      startedAt: new Date().toISOString()
    }

    setHarvestSessions(prev => [newSession, ...prev])

    // Simulate harvest progress
    let progress = 0
    const interval = setInterval(() => {
      progress += 20
      setHarvestSessions(prev => 
        prev.map(session => 
          session.id === newSession.id 
            ? { ...session, progress }
            : session
        )
      )

      if (progress >= 100) {
        clearInterval(interval)
        setHarvestSessions(prev => 
          prev.map(session => 
            session.id === newSession.id 
              ? { 
                  ...session, 
                  status: 'completed',
                  progress: 100,
                  completedAt: new Date().toISOString()
                }
              : session
          )
        )
        setLoading(false)
      }
    }, 1000)
  }

  const launchGuidedSetup = (serviceId: string) => {
    const service = apiServices.find(s => s.id === serviceId)
    if (!service) return

    // This would launch a browser window with guided setup
    alert(`Launching guided setup for ${service.name}...`)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'installed': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Download className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'configured': return <Badge variant="default" className="bg-green-100 text-green-700">Configured</Badge>
      case 'installed': return <Badge variant="secondary">CLI Installed</Badge>
      case 'error': return <Badge variant="destructive">Error</Badge>
      default: return <Badge variant="outline">Available</Badge>
    }
  }

  // Helper function to show notifications
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Start Vacuum Process
  const startVacuumProcess = async () => {
    setVacuumProcessing(true)
    showNotification('Starting cross-app secret vacuum process...', 'info')
    
    try {
      // Simulate vacuum process
      await new Promise(resolve => setTimeout(resolve, 3000))
      showNotification('Secret vacuum completed! Discovered 23 new secrets across 5 applications.', 'success')
    } catch (error) {
      showNotification('Vacuum process failed. Please try again.', 'error')
    } finally {
      setVacuumProcessing(false)
    }
  }

  // Configure Deployment
  const configureDeployment = () => {
    showNotification('Opening deployment configuration panel...', 'info')
    // In a real app, this would open a modal or navigate to config page
    setTimeout(() => {
      showNotification('Deployment configuration updated. Auto-deployment enabled for 8 new applications.', 'success')
    }, 1500)
  }

  // Analyze Current Codebase
  const analyzeCurrentCodebase = async () => {
    setAnalyzing(true)
    showNotification('Analyzing current codebase for missing secrets...', 'info')
    
    try {
      // Simulate analysis process
      await new Promise(resolve => setTimeout(resolve, 2500))
      showNotification('Analysis complete! Found 12 API endpoints needing authentication. Generated 8 secrets, 4 require manual review.', 'success')
    } catch (error) {
      showNotification('Codebase analysis failed. Please try again.', 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  // Scan All Projects
  const scanAllProjects = async () => {
    setScanning(true)
    showNotification('Scanning all projects in ecosystem...', 'info')
    
    try {
      // Simulate scanning process
      await new Promise(resolve => setTimeout(resolve, 4000))
      showNotification('Project scan complete! Analyzed 93 projects, identified 47 missing secrets, auto-generated 34 configurations.', 'success')
    } catch (error) {
      showNotification('Project scan failed. Please try again.', 'error')
    } finally {
      setScanning(false)
    }
  }

  // Handle service settings
  const handleServiceSettings = (serviceId: string, serviceName: string) => {
    showNotification(`Opening settings for ${serviceName}...`, 'info')
    // In a real app, this would open service-specific settings
  }

  // Export Registry
  const exportRegistry = () => {
    showNotification('Generating service registry export...', 'info')
    
    // Create a mock CSV export
    const csvContent = `Service,Category,Status,CLI Support,Popularity
GitHub,Development Tools,Configured,Yes,99%
AWS,Cloud Infrastructure,Installed,Yes,98%
OpenAI,AI/ML,Available,No,95%
Stripe,Payment,Available,Yes,92%
Anthropic,AI/ML,Available,No,85%`
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'service-registry-export.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    showNotification('Registry exported successfully!', 'success')
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <Alert className={`${
          notification.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
          notification.type === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
          'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
        }`}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className={
            notification.type === 'success' ? 'text-green-700 dark:text-green-400' :
            notification.type === 'error' ? 'text-red-700 dark:text-red-400' :
            'text-blue-700 dark:text-blue-400'
          }>
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      <Breadcrumb />
      
      <PageHeader
        title="Harvester Control Center"
        description="Automated secret discovery, CLI tool management, and guided setup for 100+ services"
      >
        <Button onClick={exportRegistry}>
          <Download className="mr-2 h-4 w-4" />
          Export Registry
        </Button>
      </PageHeader>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="services">Service Registry</TabsTrigger>
          <TabsTrigger value="sessions">Harvest Sessions</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : 
                   category.split('-').map(word => 
                     word.charAt(0).toUpperCase() + word.slice(1)
                   ).join(' ')
                  }
                </option>
              ))}
            </select>
          </div>

          {/* Service Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => (
              <Card key={service.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(service.status)}
                        {service.name}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {service.description}
                      </CardDescription>
                    </div>
                    {getStatusBadge(service.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Popularity</span>
                      <span className="font-semibold">{service.popularity}%</span>
                    </div>
                    <Progress value={service.popularity} className="h-1" />
                    
                    <div className="flex justify-between text-sm">
                      <span>CLI Support</span>
                      {service.cliSupported ? (
                        <Badge variant="outline" className="text-xs">
                          <Terminal className="mr-1 h-3 w-3" />
                          Available
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Manual
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      {service.cliSupported ? (
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => startHarvestSession(service.id)}
                          disabled={loading || service.status === 'configured'}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Harvest
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={() => launchGuidedSetup(service.id)}
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Setup
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleServiceSettings(service.id, service.name)}>
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Harvest Sessions</CardTitle>
              <CardDescription>Real-time monitoring of automated credential harvesting</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {harvestSessions.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{session.serviceName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Started {new Date(session.startedAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={
                          session.status === 'completed' ? 'default' :
                          session.status === 'failed' ? 'destructive' :
                          session.status === 'in-progress' ? 'secondary' :
                          'outline'
                        }>
                          {session.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{session.progress}%</span>
                        </div>
                        <Progress value={session.progress} className="h-2" />
                        
                        <div className="text-xs text-muted-foreground">
                          Current step: {session.steps[Math.floor(session.progress / 20)] || 'Complete'}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {harvestSessions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No active harvest sessions. Start one from the Service Registry tab.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Cross-App Secret Vacuum
                </CardTitle>
                <CardDescription>Automatically discover and import secrets from other applications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Applications Scanned</span>
                    <span className="font-semibold">47</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Secrets Discovered</span>
                    <span className="font-semibold">134</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto-imported</span>
                    <span className="font-semibold">89</span>
                  </div>
                </div>
                <Button className="w-full" onClick={startVacuumProcess} disabled={vacuumProcessing}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  {vacuumProcessing ? 'Processing...' : 'Start Vacuum Process'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Auto Vault Deployment
                </CardTitle>
                <CardDescription>Deploy vault access to other applications automatically</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Target Applications</span>
                    <span className="font-semibold">93</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vault Access Deployed</span>
                    <span className="font-semibold">85</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Env Replacements</span>
                    <span className="font-semibold">247</span>
                  </div>
                </div>
                <Button className="w-full" variant="outline" onClick={configureDeployment}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Deployment
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Proactive Codebase Analysis</CardTitle>
              <CardDescription>Analyze codebases to identify missing secrets and suggest configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Latest Analysis:</strong> Found 23 potential API endpoints requiring authentication in 
                  5 codebases. 12 secrets auto-generated, 11 require manual review.
                </AlertDescription>
              </Alert>
              
              <div className="mt-4 space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={analyzeCurrentCodebase} disabled={analyzing}>
                  <Search className="mr-2 h-4 w-4" />
                  {analyzing ? 'Analyzing...' : 'Analyze Current Codebase'}
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={scanAllProjects} disabled={scanning}>
                  <Globe className="mr-2 h-4 w-4" />
                  {scanning ? 'Scanning...' : 'Scan All Projects'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 