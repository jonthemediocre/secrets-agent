import { NextRequest, NextResponse } from 'next/server'

// Mock data - would be replaced with database operations
let ecosystemProjects: any[] = [
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
    vaultAdoption: 95,
    dateAdded: new Date().toISOString(),
    lastModified: new Date().toISOString()
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
    vaultAdoption: 87,
    dateAdded: new Date().toISOString(),
    lastModified: new Date().toISOString()
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let filteredProjects = [...ecosystemProjects]

    // Filter by type
    if (type && type !== 'all') {
      filteredProjects = filteredProjects.filter(project => project.type === type)
    }

    // Filter by status
    if (status && status !== 'all') {
      filteredProjects = filteredProjects.filter(project => project.status === status)
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase()
      filteredProjects = filteredProjects.filter(project =>
        project.name.toLowerCase().includes(searchLower) ||
        project.path.toLowerCase().includes(searchLower)
      )
    }

    // Calculate stats
    const stats = {
      totalProjects: ecosystemProjects.length,
      managedProjects: ecosystemProjects.filter(p => p.status === 'managed').length,
      discoveredProjects: ecosystemProjects.filter(p => p.status === 'discovered').length,
      externalProjects: ecosystemProjects.filter(p => p.status === 'external').length,
      vaultAdoption: Math.round(
        ecosystemProjects.filter(p => p.hasVault).length / ecosystemProjects.length * 100
      ),
      vantaCoverage: Math.round(
        ecosystemProjects.filter(p => p.hasVanta).length / ecosystemProjects.length * 100
      ),
      totalSecrets: ecosystemProjects.reduce((sum, p) => sum + p.secretsCount, 0),
      totalAgents: ecosystemProjects.reduce((sum, p) => sum + p.agentsCount, 0)
    }

    return NextResponse.json({
      projects: filteredProjects,
      stats,
      total: filteredProjects.length
    })
  } catch (error) {
    console.error('Error fetching ecosystem projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ecosystem projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { path, type = 'auto', name } = await request.json()

    if (!path) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      )
    }

    // Simulate project analysis
    const detectedType = type === 'auto' ? 'unknown' : type
    const projectName = name || path.split('/').pop() || 'New Project'

    const newProject = {
      id: `project-${Date.now()}`,
      name: projectName,
      path,
      type: detectedType,
      status: 'discovered',
      hasVault: false,
      hasVanta: false,
      hasPackageJson: detectedType === 'node',
      hasPython: detectedType === 'python',
      secretsCount: 0,
      agentsCount: 0,
      rulesCount: 0,
      toolsCount: 0,
      vaultAdoption: 0,
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }

    ecosystemProjects.push(newProject)

    return NextResponse.json(newProject)
  } catch (error) {
    console.error('Error adding project:', error)
    return NextResponse.json(
      { error: 'Failed to add project' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { projectId, action, data } = await request.json()

    if (!projectId || !action) {
      return NextResponse.json(
        { error: 'Project ID and action are required' },
        { status: 400 }
      )
    }

    const projectIndex = ecosystemProjects.findIndex(p => p.id === projectId)
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'inject_identification_file':
        ecosystemProjects[projectIndex] = {
          ...ecosystemProjects[projectIndex],
          identificationFile: '.vanta.yaml',
          status: 'managed',
          hasVanta: true,
          lastSync: 'just now',
          lastModified: new Date().toISOString()
        }
        break

      case 'sync':
        ecosystemProjects[projectIndex] = {
          ...ecosystemProjects[projectIndex],
          lastSync: 'just now',
          lastModified: new Date().toISOString()
        }
        break

      case 'update':
        ecosystemProjects[projectIndex] = {
          ...ecosystemProjects[projectIndex],
          ...data,
          lastModified: new Date().toISOString()
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json(ecosystemProjects[projectIndex])
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const projectIndex = ecosystemProjects.findIndex(p => p.id === projectId)
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const removedProject = ecosystemProjects.splice(projectIndex, 1)[0]

    return NextResponse.json({
      message: 'Project removed from ecosystem',
      project: removedProject
    })
  } catch (error) {
    console.error('Error removing project:', error)
    return NextResponse.json(
      { error: 'Failed to remove project' },
      { status: 500 }
    )
  }
} 