'use client';

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ShieldCheckIcon,
  BoltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CircleStackIcon,
  LockClosedIcon,
  EyeIcon,
  ArrowPathIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageHeader } from '@/components/page-header'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Shield, 
  Bot, 
  Database, 
  Activity, 
  Users, 
  Lock, 
  AlertTriangle, 
  TrendingUp,
  Download,
  RefreshCw,
  Cpu,
  Network,
  Zap,
  Settings,
  Search,
  Globe,
  Terminal,
  Code,
  ArrowLeftRight,
  FileText
} from 'lucide-react'

// Modern Chart Component
const MetricChart = ({ title, value, change, trend, className = "", loading = false }: { 
  title: string; 
  value: string; 
  change: string; 
  trend: 'up' | 'down';
  className?: string;
  loading?: boolean;
}) => (
  <div className={`bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-900/20 rounded-lg p-4 ${className}`}>
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      {!loading && (trend === 'up' ? (
        <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
      ) : (
        <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
      ))}
    </div>
    <div className="space-y-1">
      {loading ? (
        <>
          <div className="h-8 bg-muted rounded animate-pulse"></div>
          <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
        </>
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          <div className={`text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </div>
        </>
      )}
    </div>
  </div>
);

interface DashboardStats {
  totalUsers: number
  totalVaults: number
  totalSecrets: number
  threatLevel: {
    level: string
    count: number
    status: string
  }
}

interface AgentStatus {
  totalAgents: number
  activeAgents: number
  operatorOmega: {
    status: string
    projectsManaged: number
    secretsDistributed: number
    vantaApisDeployed: number
  }
  harvester: {
    status: string
    servicesRegistered: number
    cliToolsInstalled: number
    harvestSessions: number
  }
  syncEngine: {
    status: string
    rulesSynced: number
    agentsSynced: number
    crossProjectSync: boolean
  }
}

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTimeout, setLoadingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [deploying, setDeploying] = useState(false)

  // Helper function to show notifications
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Handler for Sync All button
  const handleSyncAll = async () => {
    setSyncing(true)
    showNotification('Starting ecosystem sync...', 'info')
    
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000))
      showNotification('All agents and rules synchronized successfully!', 'success')
    } catch (error) {
      showNotification('Sync failed. Please try again.', 'error')
    } finally {
      setSyncing(false)
    }
  }

  // Handler for Deploy Agent button
  const handleDeployAgent = async () => {
    setDeploying(true)
    showNotification('Initiating agent deployment...', 'info')
    
    try {
      // Simulate deployment process
      await new Promise(resolve => setTimeout(resolve, 2500))
      showNotification('New agent deployed successfully!', 'success')
    } catch (error) {
      showNotification('Deployment failed. Please try again.', 'error')
    } finally {
      setDeploying(false)
    }
  }

  // Handler for Browse Service Registry
  const handleBrowseRegistry = () => {
    router.push('/harvester?tab=services')
  }

  // Handler for Start Harvest Session
  const handleStartHarvest = () => {
    router.push('/harvester?action=start')
  }

  // Handler for Analyze Codebase
  const handleAnalyzeCodebase = () => {
    router.push('/discovery?action=analyze')
  }

  useEffect(() => {
    // Set a timeout to force stop loading after 5 seconds (reduced from 10)
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout reached, forcing data initialization')
        setStats({
          totalUsers: 2,
          totalVaults: 1,
          totalSecrets: 1,
          threatLevel: {
            level: 'Low',
            count: 0,
            status: 'low'
          }
        })
        setAgentStatus({
          totalAgents: 12,
          activeAgents: 9,
          operatorOmega: {
            status: 'active',
            projectsManaged: 93,
            secretsDistributed: 247,
            vantaApisDeployed: 85
          },
          harvester: {
            status: 'active',
            servicesRegistered: 100,
            cliToolsInstalled: 45,
            harvestSessions: 12
          },
          syncEngine: {
            status: 'active',
            rulesSynced: 158,
            agentsSynced: 9,
            crossProjectSync: true
          }
        })
        setLoading(false)
      }
    }, 5000) // Reduced to 5 seconds
    
    setLoadingTimeout(timeout)

    const fetchStats = async () => {
      try {
        // Add timeout to fetch request
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
        
        const response = await fetch('/api/monitoring/stats', {
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const result = await response.json()
          console.log('API Response:', result) // Debug log
          
          // Handle different possible response structures
          if (result.data) {
            // If API returns { data: { ... } }
            setStats(result.data)
          } else if (result.totalUsers !== undefined) {
            // If API returns the stats directly
            setStats(result)
          } else {
            // Fallback with default structure to prevent infinite loading
            console.warn('Unexpected API response structure, using fallback data')
            setStats({
              totalUsers: result.totalUsers || 2,
              totalVaults: result.totalVaults || 1,
              totalSecrets: result.totalSecrets || 1,
              threatLevel: result.threatLevel || {
                level: 'Low',
                count: 0,
                status: 'low'
              }
            })
          }
        } else {
          // If API fails, set fallback data to prevent infinite loading
          console.warn('API request failed, using fallback data')
          setStats({
            totalUsers: 2,
            totalVaults: 1,
            totalSecrets: 1,
            threatLevel: {
              level: 'Medium',
              count: 1,
              status: 'medium'
            }
          })
        }
        
        // Mock agent status data - optimized
        setAgentStatus({
          totalAgents: 12,
          activeAgents: 9,
          operatorOmega: {
            status: 'active',
            projectsManaged: 93,
            secretsDistributed: 247,
            vantaApisDeployed: 85
          },
          harvester: {
            status: 'active',
            servicesRegistered: 100,
            cliToolsInstalled: 45,
            harvestSessions: 12
          },
          syncEngine: {
            status: 'active',
            rulesSynced: 158,
            agentsSynced: 9,
            crossProjectSync: true
          }
        })
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to fetch stats:', error)
        }
        // Set fallback data even on error to prevent infinite loading
        setStats({
          totalUsers: 2,
          totalVaults: 1,
          totalSecrets: 1,
          threatLevel: {
            level: 'High',
            count: 2,
            status: 'high'
          }
        })
        setAgentStatus({
          totalAgents: 12,
          activeAgents: 9,
          operatorOmega: {
            status: 'active',
            projectsManaged: 93,
            secretsDistributed: 247,
            vantaApisDeployed: 85
          },
          harvester: {
            status: 'active',
            servicesRegistered: 100,
            cliToolsInstalled: 45,
            harvestSessions: 12
          },
          syncEngine: {
            status: 'active',
            rulesSynced: 158,
            agentsSynced: 9,
            crossProjectSync: true
          }
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 60000) // Increased to 60 seconds to reduce load

    return () => {
      clearInterval(interval)
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
      }
    }
  }, [])

  if (loading || !stats || !agentStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  // Additional safety check for threatLevel - provide fallback instead of loading
  if (!stats.threatLevel) {
    stats.threatLevel = {
      level: 'Unknown',
      count: 0,
      status: 'unknown'
    }
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
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className={
            notification.type === 'success' ? 'text-green-700 dark:text-green-400' :
            notification.type === 'error' ? 'text-red-700 dark:text-red-400' :
            'text-blue-700 dark:text-blue-400'
          }>
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Secrets Agent Command Center</h1>
          <p className="text-muted-foreground">
            Advanced agent-based secrets management with ecosystem orchestration
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </Button>
          <Button size="sm" onClick={handleDeployAgent} disabled={deploying}>
            <Bot className="mr-2 h-4 w-4" />
            {deploying ? 'Deploying...' : 'Deploy Agent'}
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      <Alert className={`border-l-4 ${
        stats.threatLevel?.status === 'high' ? 'border-l-red-500 bg-red-50' :
        stats.threatLevel?.status === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
        'border-l-green-500 bg-green-50'
      }`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Status:</strong> {stats.threatLevel?.level} threat level detected. 
          {agentStatus?.operatorOmega?.projectsManaged} projects under active management, 
          {agentStatus?.harvester?.harvestSessions} active harvest sessions running.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agent System</TabsTrigger>
          <TabsTrigger value="harvester">Harvester</TabsTrigger>
          <TabsTrigger value="sync">Sync Engine</TabsTrigger>
          <TabsTrigger value="ecosystem">Ecosystem</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Core Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last week
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Managed Secrets</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSecrets}</div>
                <p className="text-xs text-muted-foreground">
                  Across {stats.totalVaults} vaults
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects Orchestrated</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agentStatus?.operatorOmega?.projectsManaged}</div>
                <p className="text-xs text-muted-foreground">
                  Multi-project ecosystem
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agent Uptime</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">99.1%</div>
                <p className="text-xs text-muted-foreground">
                  {agentStatus?.activeAgents}/{agentStatus?.totalAgents} active
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Agent System Overview */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  OperatorOmega Runtime
                </CardTitle>
                <CardDescription>UAP Level 3 Ecosystem Orchestrator</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Status</span>
                  <Badge variant={agentStatus.operatorOmega.status === 'active' ? 'default' : 'secondary'}>
                    {agentStatus.operatorOmega.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Projects Managed</span>
                    <span>{agentStatus.operatorOmega.projectsManaged}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Secrets Distributed</span>
                    <span>{agentStatus.operatorOmega.secretsDistributed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VANTA APIs Deployed</span>
                    <span>{agentStatus.operatorOmega.vantaApisDeployed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  CLI Harvester System
                </CardTitle>
                <CardDescription>Automated secret discovery and setup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Status</span>
                  <Badge variant={agentStatus.harvester.status === 'active' ? 'default' : 'secondary'}>
                    {agentStatus.harvester.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Services Registry</span>
                    <span>{agentStatus.harvester.servicesRegistered}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>CLI Tools Installed</span>
                    <span className="font-semibold">{agentStatus.harvester.cliToolsInstalled}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Active Sessions</span>
                    <span>{agentStatus.harvester.harvestSessions}</span>
                  </div>
                  <Button className="w-full" onClick={handleStartHarvest}>
                    <Download className="mr-2 h-4 w-4" />
                    Start Harvest Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>OperatorOmega</CardTitle>
                <CardDescription>Level 3 Runtime Orchestrator</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={95} className="h-2" />
                  <p className="text-sm text-muted-foreground">Managing 93 projects</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>VANTA Hybrid Agent</CardTitle>
                <CardDescription>Multi-protocol integration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={88} className="h-2" />
                  <p className="text-sm text-muted-foreground">Cross-protocol sync</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Agent Orchestrator</CardTitle>
                <CardDescription>Agent coordination system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={92} className="h-2" />
                  <p className="text-sm text-muted-foreground">9 agents active</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="harvester" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Top 100 API Services
                </CardTitle>
                <CardDescription>Automated service discovery and setup</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>GitHub, GitLab, Bitbucket</span>
                    <Badge variant="outline">CLI Ready</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>AWS, Azure, GCP</span>
                    <Badge variant="outline">Auto Setup</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>OpenAI, Anthropic, HuggingFace</span>
                    <Badge variant="outline">API Keys</Badge>
                  </div>
                  <Button className="w-full" variant="outline" onClick={handleBrowseRegistry}>
                    <Search className="mr-2 h-4 w-4" />
                    Browse Service Registry
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  CLI Tool Management
                </CardTitle>
                <CardDescription>Automated CLI installation and authentication</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>CLI Tools Detected</span>
                    <span className="font-semibold">{agentStatus.harvester.cliToolsInstalled}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto-install Available</span>
                    <span className="font-semibold">55</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guided Setup Required</span>
                    <span className="font-semibold">15</span>
                  </div>
                  <Button className="w-full" onClick={handleStartHarvest}>
                    <Download className="mr-2 h-4 w-4" />
                    Start Harvest Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5" />
                  Rule Synchronization
                </CardTitle>
                <CardDescription>Cross-project governance sync</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Rules Synced</span>
                    <span className="font-semibold">{agentStatus.syncEngine.rulesSynced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Agents Synced</span>
                    <span className="font-semibold">{agentStatus.syncEngine.agentsSynced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cross-Project Sync</span>
                    <Badge variant={agentStatus.syncEngine.crossProjectSync ? 'default' : 'secondary'}>
                      {agentStatus.syncEngine.crossProjectSync ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Proactive Analysis
                </CardTitle>
                <CardDescription>Codebase scanning and secret generation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Codebases Analyzed</span>
                    <span className="font-semibold">47</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Secrets Generated</span>
                    <span className="font-semibold">134</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Env Replacements</span>
                    <span className="font-semibold">89</span>
                  </div>
                  <Button className="w-full" variant="outline" onClick={handleAnalyzeCodebase}>
                    <Search className="mr-2 h-4 w-4" />
                    Analyze Codebase
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ecosystem" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Project Ecosystem Map</CardTitle>
              <CardDescription>Real-time view of managed project ecosystem</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {agentStatus.operatorOmega.projectsManaged}
                    </div>
                    <p className="text-sm text-muted-foreground">Projects Managed</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {agentStatus.operatorOmega.vantaApisDeployed}
                    </div>
                    <p className="text-sm text-muted-foreground">VANTA APIs Deployed</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {agentStatus.operatorOmega.secretsDistributed}
                    </div>
                    <p className="text-sm text-muted-foreground">Secrets Distributed</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Recent Ecosystem Activity</h4>
                  <div className="space-y-2">
                    <Alert>
                      <Network className="h-4 w-4" />
                      <AlertDescription>
                        Auto-deployed VANTA API to 3 new projects in development environment
                      </AlertDescription>
                    </Alert>
                    <Alert>
                      <ArrowLeftRight className="h-4 w-4" />
                      <AlertDescription>
                        Synchronized 15 governance rules across production ecosystem
                      </AlertDescription>
                    </Alert>
                    <Alert>
                      <Bot className="h-4 w-4" />
                      <AlertDescription>
                        Harvested and distributed 8 new API credentials via CLI automation
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ecosystem Tab Content */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Managed Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">93</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Active</span>
                    <span className="font-semibold">89</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Discovered</span>
                    <span className="font-semibold">4</span>
                  </div>
                  <Progress value={96} className="h-1" />
                  <Button size="sm" className="w-full mt-2" asChild>
                    <Link href="/ecosystem">
                      Manage Ecosystem
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  ID File Injection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">89/93</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Coverage</span>
                    <span className="font-semibold">95.7%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending</span>
                    <span className="font-semibold text-orange-600">4</span>
                  </div>
                  <Progress value={95.7} className="h-1" />
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => showNotification('Auto-injecting ID files to 4 pending projects...', 'info')}>
                    Auto-Inject Pending
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Cross-Project Sync
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">158</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Rules Synced</span>
                    <span className="font-semibold">158</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Sync</span>
                    <span className="font-semibold">3m ago</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Status</span>
                    <Badge variant="default" className="text-xs px-1">Active</Badge>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={handleSyncAll}>
                    Force Full Sync
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  External Imports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">12</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>This Month</span>
                    <span className="font-semibold">3</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span className="font-semibold">91.7%</span>
                  </div>
                  <Progress value={91.7} className="h-1" />
                  <Button size="sm" className="w-full mt-2" asChild>
                    <Link href="/ecosystem?tab=import">
                      Import Project
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Vault Deployment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">78%</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Deployed</span>
                    <span className="font-semibold">73/93</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending</span>
                    <span className="font-semibold text-orange-600">20</span>
                  </div>
                  <Progress value={78} className="h-1" />
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => showNotification('Deploying vaults to 20 remaining projects...', 'info')}>
                    Deploy to Remaining
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Ecosystem Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2 text-green-600">Optimal</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uptime</span>
                    <span className="font-semibold">99.8%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Errors</span>
                    <span className="font-semibold text-green-600">0</span>
                  </div>
                  <Progress value={99.8} className="h-1" />
                  <Button size="sm" variant="outline" className="w-full mt-2" asChild>
                    <Link href="/ecosystem?tab=orchestration">
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 