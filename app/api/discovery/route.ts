import { NextRequest, NextResponse } from 'next/server'
import { secretScanner } from '@/src/lib/secret-scanner'
import { createLogger } from '@/src/utils/logger'
import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

const logger = createLogger('DiscoveryAPI')

interface ProjectStructure {
  name: string
  path: string
  type: 'web' | 'api' | 'mobile' | 'desktop' | 'library' | 'unknown'
  framework?: string
  language: string[]
  packageManagers: string[]
  configFiles: string[]
  secretsFound: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  size: {
    files: number
    lines: number
    bytes: number
  }
  dependencies: string[]
  cicdFiles: string[]
  dockerized: boolean
  lastModified: Date
}

export async function POST(request: NextRequest) {
  try {
    const { projectPath, scanType = 'full', includeSecrets = true } = await request.json()

    if (!projectPath) {
      return NextResponse.json(
        { success: false, error: 'Project path is required' },
        { status: 400 }
      )
    }

    // Validate path
    const resolvedPath = path.resolve(projectPath)
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { success: false, error: 'Project path does not exist' },
        { status: 400 }
      )
    }

    if (!fs.statSync(resolvedPath).isDirectory()) {
      return NextResponse.json(
        { success: false, error: 'Project path must be a directory' },
        { status: 400 }
      )
    }

    logger.info('Starting project discovery', { projectPath: resolvedPath, scanType })

    // Discover project structure
    const projectStructure = await discoverProjectStructure(resolvedPath)

    // Scan for secrets if requested
    let secretScanResult = null
    if (includeSecrets) {
      secretScanResult = await secretScanner.scanProject(resolvedPath)
      projectStructure.secretsFound = secretScanResult.secretsFound
      projectStructure.riskLevel = calculateRiskLevel(secretScanResult)
    }

    logger.info('Project discovery completed', {
      projectName: projectStructure.name,
      type: projectStructure.type,
      framework: projectStructure.framework,
      secretsFound: projectStructure.secretsFound,
      riskLevel: projectStructure.riskLevel
    })

    return NextResponse.json({
      success: true,
      data: {
        project: projectStructure,
        secrets: includeSecrets ? {
          scanId: secretScanResult?.scanId,
          found: secretScanResult?.secretsFound || 0,
          summary: secretScanResult ? generateSecretSummary(secretScanResult) : null
        } : null,
        recommendations: generateRecommendations(projectStructure, secretScanResult)
      }
    })

  } catch (error) {
    logger.error('Project discovery failed', { error: error.message })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const basePath = searchParams.get('basePath')

    switch (action) {
      case 'scan_directory':
        return await scanDirectory(basePath)
      
      case 'detect_projects':
        return await detectProjects(basePath)
      
      case 'validate_path':
        return await validatePath(basePath)
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    logger.error('Discovery query failed', { error: error.message })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function discoverProjectStructure(projectPath: string): Promise<ProjectStructure> {
  const projectName = path.basename(projectPath)
  const stats = fs.statSync(projectPath)

  // Get all files
  const allFiles = await glob('**/*', {
    cwd: projectPath,
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
    nodir: true,
    absolute: false
  })

  // Analyze project type and framework
  const analysis = await analyzeProject(projectPath, allFiles)

  // Calculate project size
  const size = await calculateProjectSize(projectPath, allFiles)

  // Find CI/CD files
  const cicdFiles = allFiles.filter(file => 
    file.includes('.github/workflows/') ||
    file.includes('.gitlab-ci.yml') ||
    file.includes('Jenkinsfile') ||
    file.includes('.travis.yml') ||
    file.includes('azure-pipelines.yml') ||
    file.includes('.circleci/config.yml')
  )

  // Check for Docker
  const dockerized = allFiles.some(file => 
    file === 'Dockerfile' || 
    file === 'docker-compose.yml' || 
    file === 'docker-compose.yaml'
  )

  return {
    name: projectName,
    path: projectPath,
    type: analysis.type,
    framework: analysis.framework,
    language: analysis.languages,
    packageManagers: analysis.packageManagers,
    configFiles: analysis.configFiles,
    secretsFound: 0, // Will be updated if secrets scan is performed
    riskLevel: 'low', // Will be updated based on secrets scan
    size,
    dependencies: analysis.dependencies,
    cicdFiles,
    dockerized,
    lastModified: stats.mtime
  }
}

async function analyzeProject(projectPath: string, files: string[]): Promise<{
  type: ProjectStructure['type']
  framework?: string
  languages: string[]
  packageManagers: string[]
  configFiles: string[]
  dependencies: string[]
}> {
  const languages = new Set<string>()
  const packageManagers = new Set<string>()
  const configFiles: string[] = []
  const dependencies: string[] = []
  let framework: string | undefined
  let type: ProjectStructure['type'] = 'unknown'

  // Analyze files
  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    const basename = path.basename(file).toLowerCase()

    // Detect languages
    if (ext === '.js' || ext === '.jsx') languages.add('JavaScript')
    if (ext === '.ts' || ext === '.tsx') languages.add('TypeScript')
    if (ext === '.py') languages.add('Python')
    if (ext === '.java') languages.add('Java')
    if (ext === '.cs') languages.add('C#')
    if (ext === '.go') languages.add('Go')
    if (ext === '.rs') languages.add('Rust')
    if (ext === '.php') languages.add('PHP')
    if (ext === '.rb') languages.add('Ruby')
    if (ext === '.cpp' || ext === '.c') languages.add('C++')

    // Detect package managers
    if (basename === 'package.json') {
      packageManagers.add('npm')
      await analyzePackageJson(path.join(projectPath, file), dependencies)
    }
    if (basename === 'yarn.lock') packageManagers.add('yarn')
    if (basename === 'pnpm-lock.yaml') packageManagers.add('pnpm')
    if (basename === 'requirements.txt' || basename === 'pyproject.toml') packageManagers.add('pip')
    if (basename === 'composer.json') packageManagers.add('composer')
    if (basename === 'gemfile') packageManagers.add('bundler')
    if (basename === 'go.mod') packageManagers.add('go modules')
    if (basename === 'cargo.toml') packageManagers.add('cargo')

    // Detect config files
    if (basename.includes('config') || basename.includes('.env') || ext === '.ini' || ext === '.conf') {
      configFiles.push(file)
    }

    // Detect frameworks
    if (file.includes('next.config.js') || file.includes('.next/')) framework = 'Next.js'
    if (file.includes('nuxt.config.js') || file.includes('.nuxt/')) framework = 'Nuxt.js'
    if (file.includes('angular.json') || file.includes('@angular/')) framework = 'Angular'
    if (file.includes('vue.config.js') || dependencies.includes('vue')) framework = 'Vue.js'
    if (file.includes('gatsby-config.js')) framework = 'Gatsby'
    if (dependencies.includes('react')) framework = framework || 'React'
    if (dependencies.includes('express')) framework = framework || 'Express.js'
    if (file.includes('django') || basename === 'manage.py') framework = 'Django'
    if (file.includes('flask') || dependencies.includes('flask')) framework = 'Flask'
    if (file.includes('spring') || file.includes('pom.xml')) framework = 'Spring'
  }

  // Determine project type
  if (files.some(f => f.includes('package.json')) && (languages.has('JavaScript') || languages.has('TypeScript'))) {
    if (files.some(f => f.includes('public/') && f.includes('index.html'))) {
      type = 'web'
    } else if (files.some(f => f.includes('server') || f.includes('api'))) {
      type = 'api'
    } else {
      type = 'library'
    }
  } else if (languages.has('Python')) {
    if (files.some(f => f.includes('templates/') || f.includes('static/'))) {
      type = 'web'
    } else if (files.some(f => f.includes('api') || f.includes('server'))) {
      type = 'api'
    } else {
      type = 'library'
    }
  } else if (languages.has('Java')) {
    if (files.some(f => f.includes('src/main/webapp/'))) {
      type = 'web'
    } else if (files.some(f => f.includes('controller') || f.includes('service'))) {
      type = 'api'
    } else {
      type = 'library'
    }
  }

  return {
    type,
    framework,
    languages: Array.from(languages),
    packageManagers: Array.from(packageManagers),
    configFiles,
    dependencies
  }
}

async function analyzePackageJson(packageJsonPath: string, dependencies: string[]): Promise<void> {
  try {
    const content = await fs.promises.readFile(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(content)
    
    if (packageJson.dependencies) {
      dependencies.push(...Object.keys(packageJson.dependencies))
    }
    if (packageJson.devDependencies) {
      dependencies.push(...Object.keys(packageJson.devDependencies))
    }
  } catch (error) {
    // Ignore errors reading package.json
  }
}

async function calculateProjectSize(projectPath: string, files: string[]): Promise<ProjectStructure['size']> {
  let totalBytes = 0
  let totalLines = 0

  for (const file of files) {
    try {
      const filePath = path.join(projectPath, file)
      const stats = fs.statSync(filePath)
      totalBytes += stats.size

      // Count lines for text files
      const ext = path.extname(file).toLowerCase()
      if (['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cs', '.go', '.rs', '.php', '.rb'].includes(ext)) {
        const content = await fs.promises.readFile(filePath, 'utf8')
        totalLines += content.split('\n').length
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  return {
    files: files.length,
    lines: totalLines,
    bytes: totalBytes
  }
}

function calculateRiskLevel(scanResult: any): ProjectStructure['riskLevel'] {
  if (!scanResult || scanResult.secretsFound === 0) return 'low'
  
  const criticalSecrets = scanResult.secrets.filter(s => s.severity === 'critical').length
  const highSecrets = scanResult.secrets.filter(s => s.severity === 'high').length
  
  if (criticalSecrets > 0) return 'critical'
  if (highSecrets > 2) return 'high'
  if (scanResult.secretsFound > 5) return 'medium'
  return 'low'
}

function generateSecretSummary(scanResult: any): any {
  const summary = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }

  scanResult.secrets.forEach(secret => {
    summary[secret.severity]++
  })

  return summary
}

function generateRecommendations(project: ProjectStructure, scanResult: any): string[] {
  const recommendations = []

  if (project.secretsFound > 0) {
    recommendations.push('🔒 Remove hardcoded secrets and use environment variables')
    recommendations.push('🔐 Implement a secrets management solution')
  }

  if (!project.dockerized && project.type !== 'library') {
    recommendations.push('🐳 Consider containerizing the application with Docker')
  }

  if (project.cicdFiles.length === 0) {
    recommendations.push('🚀 Set up CI/CD pipeline for automated testing and deployment')
  }

  if (project.packageManagers.length > 1) {
    recommendations.push('📦 Standardize on a single package manager')
  }

  if (project.configFiles.some(f => f.includes('.env'))) {
    recommendations.push('⚙️ Ensure .env files are in .gitignore')
  }

  if (project.type === 'web' && !project.framework) {
    recommendations.push('🎯 Consider using a modern web framework')
  }

  return recommendations
}

async function scanDirectory(basePath: string | null): Promise<NextResponse> {
  if (!basePath) {
    return NextResponse.json(
      { success: false, error: 'Base path is required' },
      { status: 400 }
    )
  }

  try {
    const items = await fs.promises.readdir(basePath, { withFileTypes: true })
    const directories = items
      .filter(item => item.isDirectory() && !item.name.startsWith('.'))
      .map(item => ({
        name: item.name,
        path: path.join(basePath, item.name),
        isDirectory: true
      }))

    return NextResponse.json({
      success: true,
      data: directories
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to scan directory' },
      { status: 500 }
    )
  }
}

async function detectProjects(basePath: string | null): Promise<NextResponse> {
  if (!basePath) {
    return NextResponse.json(
      { success: false, error: 'Base path is required' },
      { status: 400 }
    )
  }

  try {
    const projects = []
    const items = await fs.promises.readdir(basePath, { withFileTypes: true })

    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('.')) {
        const dirPath = path.join(basePath, item.name)
        const isProject = await isProjectDirectory(dirPath)
        
        if (isProject) {
          const projectInfo = await getQuickProjectInfo(dirPath)
          projects.push(projectInfo)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: projects
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to detect projects' },
      { status: 500 }
    )
  }
}

async function validatePath(basePath: string | null): Promise<NextResponse> {
  if (!basePath) {
    return NextResponse.json(
      { success: false, error: 'Path is required' },
      { status: 400 }
    )
  }

  try {
    const exists = fs.existsSync(basePath)
    const isDirectory = exists ? fs.statSync(basePath).isDirectory() : false

    return NextResponse.json({
      success: true,
      data: {
        exists,
        isDirectory,
        readable: exists && fs.constants.R_OK
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: {
        exists: false,
        isDirectory: false,
        readable: false
      }
    })
  }
}

async function isProjectDirectory(dirPath: string): Promise<boolean> {
  try {
    const files = await fs.promises.readdir(dirPath)
    
    // Check for common project indicators
    const projectIndicators = [
      'package.json', 'requirements.txt', 'composer.json', 'Gemfile',
      'go.mod', 'Cargo.toml', 'pom.xml', 'build.gradle', 'project.clj',
      '.git', 'src/', 'lib/', 'app/'
    ]

    return projectIndicators.some(indicator => files.includes(indicator))
  } catch {
    return false
  }
}

async function getQuickProjectInfo(dirPath: string): Promise<any> {
  const name = path.basename(dirPath)
  const stats = fs.statSync(dirPath)
  
  try {
    const files = await fs.promises.readdir(dirPath)
    let type = 'unknown'
    let language = 'unknown'

    if (files.includes('package.json')) {
      type = 'web/api'
      language = 'JavaScript/TypeScript'
    } else if (files.includes('requirements.txt') || files.includes('pyproject.toml')) {
      type = 'api/script'
      language = 'Python'
    } else if (files.includes('pom.xml') || files.includes('build.gradle')) {
      type = 'api/library'
      language = 'Java'
    } else if (files.includes('Cargo.toml')) {
      type = 'library/cli'
      language = 'Rust'
    } else if (files.includes('go.mod')) {
      type = 'api/cli'
      language = 'Go'
    }

    return {
      name,
      path: dirPath,
      type,
      language,
      lastModified: stats.mtime,
      hasGit: files.includes('.git')
    }
  } catch {
    return {
      name,
      path: dirPath,
      type: 'unknown',
      language: 'unknown',
      lastModified: stats.mtime,
      hasGit: false
    }
  }
} 