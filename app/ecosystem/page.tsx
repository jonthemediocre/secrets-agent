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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Breadcrumb } from '@/components/breadcrumb'
import { PageHeader } from '@/components/page-header'
import { 
  FolderOpen, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Settings, 
  Network, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  GitBranch,
  Cpu,
  Shield,
  Code,
  Database,
  ArrowRight,
  Search,
  RefreshCw,
  Globe,
  Terminal
} from 'lucide-react'

interface Project {
  id: string
  name: string
  path: string
  type: 'node' | 'python' | 'unknown'
  status: 'managed' | 'discovered' | 'external' | 'error'
  hasVault: boolean
  hasVanta: boolean
  hasPackageJson: boolean
  hasPython: boolean
  secretsCount: number
  agentsCount: number
  rulesCount: number
  toolsCount: number
  identificationFile?: string
  lastSync?: string
  vaultAdoption: number
}

interface EcosystemStats {
  totalProjects: number
  managedProjects: number
  discoveredProjects: number
  externalProjects: number
  vaultAdoption: number
  vantaCoverage: number
  totalSecrets: number
  totalAgents: number
}

export default function EcosystemPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<EcosystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [newProjectPath, setNewProjectPath] = useState('')
  const [newProjectType, setNewProjectType] = useState<'auto' | 'node' | 'python'>('auto')
  const [importSource, setImportSource] = useState('')
  const [importType, setImportType] = useState<'git' | 'local' | 'archive'>('git')
  const [importTarget, setImportTarget] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  // Mock data - would be fetched from API
  useEffect(() => {
    const fetchEcosystemData = async () => {
      // Simulate API call
      const mockProjects: Project[] = [
        {
          id: 'secrets-agent',
          name: 'Secrets Agent',
          path: '/users/dev/secrets-agent',
          type: 'node',
          status: 'managed',
          hasVault: true,
          hasVanta: true,
          hasPackageJson: true,
          hasPython: true,
          secretsCount: 23,
          agentsCount: 8,
          rulesCount: 15,
          toolsCount: 12,
          identificationFile: '.vanta.yaml',
          lastSync: '2 minutes ago',
          vaultAdoption: 95
        },
        {
          id: 'ai-research-platform',
          name: 'AI Research Platform',
          path: '/users/dev/ai-research-platform',
          type: 'python',
          status: 'managed',
          hasVault: true,
          hasVanta: true,
          hasPackageJson: false,
          hasPython: true,
          secretsCount: 18,
          agentsCount: 5,
          rulesCount: 8,
          toolsCount: 7,
          identificationFile: '.secrets-agent.config.json',
          lastSync: '5 minutes ago',
          vaultAdoption: 87
        },
        {
          id: 'webapp-frontend',
          name: 'WebApp Frontend',
          path: '/users/dev/webapp-frontend',
          type: 'node',
          status: 'discovered',
          hasVault: false,
          hasVanta: false,
          hasPackageJson: true,
          hasPython: false,
          secretsCount: 5,
          agentsCount: 0,
          rulesCount: 2,
          toolsCount: 3,
          vaultAdoption: 0
        },
        {
          id: 'external-api',
          name: 'External API Service',
          path: '/external/projects/api-service',
          type: 'node',
          status: 'external',
          hasVault: true,
          hasVanta: false,
          hasPackageJson: true,
          hasPython: false,
          secretsCount: 12,
          agentsCount: 2,
          rulesCount: 5,
          toolsCount: 8,
          identificationFile: 'custom-config.yaml',
          lastSync: '1 hour ago',
          vaultAdoption: 65
        }
      ]

      const mockStats: EcosystemStats = {
        totalProjects: 93,
        managedProjects: 85,
        discoveredProjects: 5,
        externalProjects: 3,
        vaultAdoption: 78,
        vantaCoverage: 92,
        totalSecrets: 247,
        totalAgents: 34
      }

      setProjects(mockProjects)
      setStats(mockStats)
      setLoading(false)
    }

    fetchEcosystemData()
  }, [])

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.path.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || project.type === selectedType
    const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'managed': return <Badge variant="default" className="bg-green-100 text-green-700">Managed</Badge>
      case 'discovered': return <Badge variant="secondary">Discovered</Badge>
      case 'external': return <Badge variant="outline">External</Badge>
      case 'error': return <Badge variant="destructive">Error</Badge>
      default: return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'node': return <Terminal className="h-4 w-4 text-green-600" />
      case 'python': return <Code className="h-4 w-4 text-blue-600" />
      default: return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const addProjectToEcosystem = async () => {
    if (!newProjectPath) return
    
    // Simulate adding project
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: newProjectPath.split('/').pop() || 'New Project',
      path: newProjectPath,
      type: newProjectType === 'auto' ? 'unknown' : newProjectType,
      status: 'discovered',
      hasVault: false,
      hasVanta: false,
      hasPackageJson: newProjectType === 'node',
      hasPython: newProjectType === 'python',
      secretsCount: 0,
      agentsCount: 0,
      rulesCount: 0,
      toolsCount: 0,
      vaultAdoption: 0
    }
    
    setProjects(prev => [...prev, newProject])
    setNewProjectPath('')
    setNewProjectType('auto')
    setIsAddDialogOpen(false)
  }

  const injectIdentificationFile = async (projectId: string) => {
    // Simulate injecting identification file
    setProjects(prev => 
      prev.map(project => 
        project.id === projectId 
          ? { 
              ...project, 
              identificationFile: '.vanta.yaml',
              status: 'managed' as const,
              hasVanta: true,
              lastSync: 'just now'
            }
          : project
      )
    )
  }

  const removeFromEcosystem = async (projectId: string) => {
    setProjects(prev => prev.filter(project => project.id !== projectId))
  }

  const importExternalProject = async () => {
    if (!importSource || !importTarget) return
    
    setIsImporting(true)
    
    try {
      // Simulate import process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const importedProject: Project = {
        id: `imported-${Date.now()}`,
        name: importTarget.split('/').pop() || 'Imported Project',
        path: importTarget,
        type: 'unknown',
        status: 'external',
        hasVault: false,
        hasVanta: false,
        hasPackageJson: false,
        hasPython: false,
        secretsCount: 0,
        agentsCount: 0,
        rulesCount: 0,
        toolsCount: 0,
        vaultAdoption: 0
      }
      
      setProjects(prev => [...prev, importedProject])
      setImportSource('')
      setImportTarget('')
      setIsImportDialogOpen(false)
      
      // Show success notification
      alert(`Successfully imported project from ${importSource}`)
    } catch (error) {
      alert('Failed to import project. Please try again.')
    } finally {
      setIsImporting(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />
      
      <PageHeader
        title="Project Ecosystem Manager"
        description="Manage, discover, and orchestrate projects across your development ecosystem"
      >
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Project to Ecosystem</DialogTitle>
                <DialogDescription>
                  Add an existing project to the managed ecosystem
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Project Path</label>
                  <Input
                    placeholder="/path/to/project"
                    value={newProjectPath}
                    onChange={(e) => setNewProjectPath(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Project Type</label>
                  <Select value={newProjectType} onValueChange={(value: any) => setNewProjectType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="node">Node.js</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addProjectToEcosystem} className="w-full">
                  Add Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Import External
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import External Project</DialogTitle>
                <DialogDescription>
                  Import a project from an external source or repository
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Source Type</label>
                  <Select value={importType} onValueChange={(value: 'git' | 'local' | 'archive') => setImportType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="git">Git Repository</SelectItem>
                      <SelectItem value="local">Local Directory</SelectItem>
                      <SelectItem value="archive">Archive File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Source URL/Path</label>
                  <Input 
                    placeholder="https://github.com/user/repo.git" 
                    value={importSource}
                    onChange={(e) => setImportSource(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Target Directory</label>
                  <Input 
                    placeholder="/local/projects/imported-project" 
                    value={importTarget}
                    onChange={(e) => setImportTarget(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={importExternalProject}
                  disabled={isImporting || !importSource || !importTarget}
                >
                  {isImporting ? 'Importing...' : 'Import Project'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="orchestration">Orchestration</TabsTrigger>
          <TabsTrigger value="identification">Identification Files</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Ecosystem Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProjects}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.managedProjects} managed, {stats.discoveredProjects} discovered
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vault Adoption</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.vaultAdoption}%</div>
                <Progress value={stats.vaultAdoption} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">VANTA Coverage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.vantaCoverage}%</div>
                <Progress value={stats.vantaCoverage} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Secrets</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSecrets}</div>
                <p className="text-xs text-muted-foreground">
                  Across {stats.totalAgents} agents
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Ecosystem Activity</CardTitle>
              <CardDescription>Latest project management and synchronization activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Injected VANTA identification files into 3 newly discovered projects
                  </AlertDescription>
                </Alert>
                <Alert>
                  <Network className="h-4 w-4" />
                  <AlertDescription>
                    Synchronized vault configurations across 15 managed projects
                  </AlertDescription>
                </Alert>
                <Alert>
                  <Download className="h-4 w-4" />
                  <AlertDescription>
                    Imported 2 external projects from GitHub repositories
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="node">Node.js</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="managed">Managed</SelectItem>
                <SelectItem value="discovered">Discovered</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Projects Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getTypeIcon(project.type)}
                        {project.name}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {project.path}
                      </CardDescription>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Secrets</span>
                        <span className="font-semibold">{project.secretsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Agents</span>
                        <span className="font-semibold">{project.agentsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rules</span>
                        <span className="font-semibold">{project.rulesCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tools</span>
                        <span className="font-semibold">{project.toolsCount}</span>
                      </div>
                    </div>
                    
                    {project.hasVault && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Vault Adoption</span>
                          <span>{project.vaultAdoption}%</span>
                        </div>
                        <Progress value={project.vaultAdoption} className="h-1" />
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {project.status === 'discovered' && (
                        <Button 
                          size="sm" 
                          onClick={() => injectIdentificationFile(project.id)}
                          className="flex-1"
                        >
                          <FileText className="mr-1 h-3 w-3" />
                          Inject ID File
                        </Button>
                      )}
                      
                      {project.status === 'managed' && (
                        <Button size="sm" variant="outline" className="flex-1">
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Sync
                        </Button>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => removeFromEcosystem(project.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orchestration" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Cross-Project Synchronization
                </CardTitle>
                <CardDescription>Sync vaults, rules, and configurations across projects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Projects Synced</span>
                    <span className="font-semibold">{stats.managedProjects}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Full Sync</span>
                    <span className="font-semibold">15 minutes ago</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sync Status</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
                <Button className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Force Full Sync
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  VANTA API Deployment
                </CardTitle>
                <CardDescription>Deploy VANTA APIs to compatible projects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>APIs Deployed</span>
                    <span className="font-semibold">85</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Compatible Projects</span>
                    <span className="font-semibold">89</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Coverage</span>
                    <span className="font-semibold">{stats.vantaCoverage}%</span>
                  </div>
                </div>
                <Button className="w-full" variant="outline">
                  <Globe className="mr-2 h-4 w-4" />
                  Deploy to Remaining
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="identification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Identification Files</CardTitle>
              <CardDescription>
                Manage identification files that mark projects as part of the managed ecosystem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Identification Files:</strong> Projects are marked as managed through 
                    identification files like <code>.vanta.yaml</code> or <code>.secrets-agent.config.json</code> 
                    that contain project metadata and configuration.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Default Templates</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <FileText className="mr-2 h-4 w-4" />
                        .vanta.yaml (VANTA Projects)
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <FileText className="mr-2 h-4 w-4" />
                        .secrets-agent.config.json (General)
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <FileText className="mr-2 h-4 w-4" />
                        vault.config.yaml (Vault-focused)
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Bulk Operations</h4>
                    <div className="space-y-2">
                      <Button className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Inject Files to All Discovered
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Upload className="mr-2 h-4 w-4" />
                        Update All Identification Files
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Search className="mr-2 h-4 w-4" />
                        Scan for Missing Files
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Projects with Identification Files</h4>
                  <div className="space-y-2">
                    {projects
                      .filter(p => p.identificationFile)
                      .map((project) => (
                        <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getTypeIcon(project.type)}
                            <div>
                              <div className="font-medium">{project.name}</div>
                              <div className="text-sm text-muted-foreground">{project.path}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{project.identificationFile}</Badge>
                            <Button size="sm" variant="outline">
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 