import { NextRequest, NextResponse } from 'next/server'
import { aiProjectScanner } from '@/src/lib/ai-project-scanner'
import { createLogger } from '@/src/utils/logger'
import * as path from 'path'
import * as fs from 'fs'

const logger = createLogger('AIScanAPI')

// UAP Hook System Interface
interface HookManager {
  trigger(event: string, data: any): Promise<void>
  register(event: string, handler: (data: any) => void | Promise<void>): void
}

// UAP Agent Manifest Interface  
interface UAPAgentManifest {
  title: string
  version: string
  agent_roles: string[]
  symbolic_intent: {
    goal: string
    scope: string
  }
  known_tools: string[]
  lifecycle_compliance: string
  trace_id?: string
  symbolic_hash?: string
  mutation_lineage?: string[]
}

// UAP Mutation Result Interface
interface MutationResult {
  diff: string
  symbolic_delta: string
  status: 'pending' | 'applied' | 'rejected'
  version_lineage: string[]
  reason_for_change: string
}

/**
 * UAP-compliant AI Scan API with intelligent project analysis
 * Provides RESTful interface for AI-powered project scanning and insights
 */
class AIScanAPIController {
  private readonly hooks: HookManager
  private readonly version_lineage: string[] = ['1.0.0']

  constructor() {
    this.hooks = this.createHookManager()
    this.initializeHooks()
  }

  private createHookManager(): HookManager {
    const handlers: Map<string, Array<(data: any) => void | Promise<void>>> = new Map()
    
    return {
      async trigger(event: string, data: any): Promise<void> {
        const eventHandlers = handlers.get(event) || []
        for (const handler of eventHandlers) {
          await handler(data)
        }
      },
      
      register(event: string, handler: (data: any) => void | Promise<void>): void {
        if (!handlers.has(event)) {
          handlers.set(event, [])
        }
        handlers.get(event)!.push(handler)
      }
    }
  }

  private initializeHooks(): void {
    this.hooks.register('before_scan_request', (data) => {
      logger.info('🔍 AI scan request initiated', {
        projectPath: data.projectPath,
        scanType: data.scanType
      })
    })
    
    this.hooks.register('after_scan_complete', (data) => {
      logger.info('✅ AI scan completed successfully', {
        scanId: data.scanId,
        patterns: data.patterns,
        security: data.security,
        duration: data.duration
      })
    })
    
    this.hooks.register('on_pattern_detection', (data) => {
      logger.debug('🎯 Pattern detected', {
        pattern: data.pattern,
        confidence: data.confidence,
        riskLevel: data.riskLevel
      })
    })
    
    this.hooks.register('on_security_finding', (data) => {
      logger.warn('🚨 Security finding detected', {
        type: data.type,
        severity: data.severity,
        file: data.file
      })
    })
    
    this.hooks.register('on_ai_suggestion', (data) => {
      logger.info('💡 AI suggestion generated', {
        category: data.category,
        priority: data.priority,
        description: data.description
      })
    })
    
    this.hooks.register('on_scan_error', (data) => {
      logger.error('❌ Scan error occurred', {
        error: data.error,
        projectPath: data.projectPath,
        phase: data.phase
      })
    })
  }

  /**
   * Generate UAP agent manifest for AI Scan API
   */
  generateManifest(): UAPAgentManifest {
    return {
      title: 'AIScanAPIController',
      version: this.version_lineage[this.version_lineage.length - 1],
      agent_roles: [
        'scan_coordinator', 
        'pattern_analyzer', 
        'ai_advisor', 
        'scan_api_gateway'
      ],
      symbolic_intent: {
        goal: 'Provide intelligent AI-powered project scanning with pattern detection and security analysis',
        scope: 'project_scanning_api'
      },
      known_tools: [
        'ai_project_scanner',
        'pattern_detector',
        'security_analyzer',
        'suggestion_engine',
        'metrics_calculator'
      ],
      lifecycle_compliance: 'plan|execute|collapse',
      trace_id: this.generateTraceId(),
      symbolic_hash: this.generateSymbolicHash(),
      mutation_lineage: this.version_lineage
    }
  }

  /**
   * UAP Mutation Mode: Safe self-modification with version tracking
   */
  async mutate(mutationType: 'enhance_patterns' | 'improve_scanning' | 'optimize_api', 
               context: any = {}): Promise<MutationResult> {
    
    await this.hooks.trigger('before_mutation', { mutationType, context })
    
    try {
      let proposedChange = ''
      let symbolicDelta = ''
      
      switch (mutationType) {
        case 'enhance_patterns':
          proposedChange = this.generatePatternEnhancement(context)
          symbolicDelta = 'Enhanced pattern detection algorithms for better accuracy'
          break
          
        case 'improve_scanning':
          proposedChange = this.generateScanningImprovement(context)
          symbolicDelta = 'Improved scanning performance and coverage'
          break
          
        case 'optimize_api':
          proposedChange = this.generateAPIOptimization(context)
          symbolicDelta = 'Optimized API response times and resource usage'
          break
          
        default:
          throw new Error(`Unknown mutation type: ${mutationType}`)
      }
      
      const newVersion = this.generateNextVersion()
      
      const result: MutationResult = {
        diff: proposedChange,
        symbolic_delta: symbolicDelta,
        status: 'pending',
        version_lineage: [...this.version_lineage, newVersion],
        reason_for_change: `Mutation requested: ${mutationType} with context: ${JSON.stringify(context)}`
      }
      
      await this.hooks.trigger('after_mutation', result)
      
      return result
      
    } catch (error) {
      await this.hooks.trigger('on_mutation_error', { error: error.message, mutationType })
      throw error
    }
  }

  private generatePatternEnhancement(context: any): string {
    return `
    // Enhanced pattern detection for ${context.pattern_type || 'general'}
    const enhancedPatterns = {
      detection_algorithms: [
        '${context.algorithm || 'symbolic_analysis'}',
        'ml_pattern_recognition',
        'semantic_code_analysis'
      ],
      confidence_thresholds: {
        high: ${context.high_threshold || 0.8},
        medium: ${context.medium_threshold || 0.6},
        low: ${context.low_threshold || 0.4}
      }
    }
    `
  }

  private generateScanningImprovement(context: any): string {
    return `
    // Improved scanning configuration
    const scanningImprovements = {
      parallel_processing: ${context.parallel !== false},
      cache_enabled: ${context.cache !== false},
      max_file_size: '${context.max_file_size || '10MB'}',
      scan_depth: ${context.depth || 10}
    }
    `
  }

  private generateAPIOptimization(context: any): string {
    return `
    // API optimization settings
    const apiOptimizations = {
      response_compression: ${context.compression !== false},
      result_pagination: ${context.pagination !== false},
      streaming_enabled: ${context.streaming === true},
      cache_duration: '${context.cache_duration || '5m'}'
    }
    `
  }

  private generateNextVersion(): string {
    const current = this.version_lineage[this.version_lineage.length - 1]
    const [major, minor, patch] = current.split('.').map(Number)
    return `${major}.${minor}.${patch + 1}`
  }

  private generateTraceId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSymbolicHash(): string {
    const manifest = {
      roles: ['scan_coordinator', 'pattern_analyzer'],
      intent: 'ai_scanning_api',
      timestamp: Date.now()
    }
    return Buffer.from(JSON.stringify(manifest)).toString('base64').substring(0, 16)
  }

  /**
   * UAP Agent-callable scan request handler with lifecycle compliance
   */
  async handleScanRequest(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now()
    
    // UAP Lifecycle: Plan Phase
    await this.hooks.trigger('before_plan', { method: 'POST', url: request.url })
    
    const planResult = await this.planScanRequest(request)
    
    await this.hooks.trigger('after_plan', planResult)

    // UAP Lifecycle: Execute Phase  
    await this.hooks.trigger('before_execute', { plan: planResult })

    try {
      const { 
        projectPath, 
        includeAI = true,
        includeDependencies = true,
        includeRules = true,
        generateSuggestions = true,
        scanType = 'full'
      } = await request.json()

      await this.hooks.trigger('before_scan_request', {
        projectPath,
        scanType,
        includeAI,
        includeDependencies,
        includeRules,
        generateSuggestions
      })

      if (!projectPath) {
        return NextResponse.json(
          { success: false, error: 'Project path is required' },
          { status: 400 }
        )
      }

      // Validate and resolve project path
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

      // Perform the AI-powered scan with hooks
      const scanResult = await aiProjectScanner.scanProject(resolvedPath, {
        includeAI,
        includeDependencies,
        includeRules,
        generateSuggestions
      })

      // Trigger scan completion hooks
      await this.hooks.trigger('after_scan_complete', {
        scanId: scanResult.scanId,
        patterns: scanResult.symbolicPatterns.length,
        security: scanResult.securityFindings.length,
        duration: Date.now() - startTime
      })

      // Trigger pattern detection hooks
      for (const pattern of scanResult.symbolicPatterns) {
        await this.hooks.trigger('on_pattern_detection', {
          pattern: pattern.type,
          confidence: pattern.confidence,
          riskLevel: pattern.riskLevel
        })
      }

      // Trigger security finding hooks
      for (const finding of scanResult.securityFindings) {
        await this.hooks.trigger('on_security_finding', {
          type: finding.type,
          severity: finding.severity,
          file: finding.file
        })
      }

      // Trigger AI suggestion hooks
      for (const suggestion of scanResult.aiSuggestions) {
        await this.hooks.trigger('on_ai_suggestion', {
          category: suggestion.category,
          priority: suggestion.priority,
          description: suggestion.description
        })
      }

      // Store scan result
      await storeScanResult(scanResult)

      const response = NextResponse.json({
        success: true,
        data: {
          scanId: scanResult.scanId,
          projectPath: scanResult.projectPath,
          scanTime: scanResult.scanTime,
          archetype: scanResult.archetype,
          symbolicPatterns: scanResult.symbolicPatterns.slice(0, 20), // Limit for response size
          securityFindings: scanResult.securityFindings,
          aiSuggestions: scanResult.aiSuggestions.slice(0, 10), // Top suggestions
          metrics: scanResult.metrics,
          summary: {
            totalPatterns: scanResult.symbolicPatterns.length,
            totalSuggestions: scanResult.aiSuggestions.length,
            totalSecurityFindings: scanResult.securityFindings.length,
            highRiskPatterns: scanResult.symbolicPatterns.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical').length,
            criticalSecurityFindings: scanResult.securityFindings.filter(f => f.severity === 'critical').length
          }
        }
      })

      await this.hooks.trigger('after_execute', { response, success: true })

      // UAP Lifecycle: Collapse Phase
      await this.hooks.trigger('before_collapse', { response, duration: Date.now() - startTime })
      
      const collapsedResponse = await this.collapseResponse(response, Date.now() - startTime)
      
      await this.hooks.trigger('after_collapse', collapsedResponse)
      await this.hooks.trigger('on_success', collapsedResponse)

      return collapsedResponse

    } catch (error) {
      const duration = Date.now() - startTime

      await this.hooks.trigger('on_scan_error', {
        error: error.message,
        phase: 'execution',
        duration
      })

      await this.hooks.trigger('after_execute', { error: error.message, success: false })
      
      logger.error('AI scan request failed', { error: error.message, duration })
      
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  private async planScanRequest(request: NextRequest): Promise<any> {
    return {
      method: 'POST',
      url: request.url,
      estimatedDuration: '30-60s',
      phases: ['validation', 'scanning', 'analysis', 'response_formatting']
    }
  }

  private async collapseResponse(response: NextResponse, responseTime: number): Promise<NextResponse> {
    // Add UAP metadata to response headers
    response.headers.set('X-UAP-Manifest', Buffer.from(JSON.stringify(this.generateManifest())).toString('base64'))
    response.headers.set('X-Response-Time', responseTime.toString())
    response.headers.set('X-UAP-Version', this.version_lineage[this.version_lineage.length - 1])
    response.headers.set('X-Scan-API-Version', '2.0')
    
    return response
  }

  /**
   * UAP Agent-callable query handler
   */
  async handleQuery(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now()
    
    try {
      const { searchParams } = new URL(request.url)
      const action = searchParams.get('action')
      const scanId = searchParams.get('scanId')
      const projectPath = searchParams.get('projectPath')

      switch (action) {
        case 'get_scan':
          if (!scanId) {
            return NextResponse.json(
              { success: false, error: 'Scan ID is required' },
              { status: 400 }
            )
          }
          return await getScanResult(scanId)

        case 'list_scans':
          return await listRecentScans(projectPath)

        case 'compare_projects':
          const projectPath1 = searchParams.get('projectPath1')
          const projectPath2 = searchParams.get('projectPath2')
          if (!projectPath1 || !projectPath2) {
            return NextResponse.json(
              { success: false, error: 'Both project paths are required for comparison' },
              { status: 400 }
            )
          }
          return await compareProjects(projectPath1, projectPath2)

        case 'get_suggestions':
          return await getAISuggestions(scanId)

        case 'get_metrics':
          return await getProjectMetrics(scanId)

        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
          )
      }

    } catch (error) {
      logger.error('AI scan query failed', { error: error.message })
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// Create UAP-compliant API controller instance
const scanAPIController = new AIScanAPIController()

// UAP-compliant exports that delegate to the controller
export async function POST(request: NextRequest) {
  return await scanAPIController.handleScanRequest(request)
}

export async function GET(request: NextRequest) {
  return await scanAPIController.handleQuery(request)
}

// Helper functions for scan data management
async function storeScanResult(scanResult: any): Promise<void> {
  // Store scan results to file system (in production, use a database)
  const scanDir = path.join(process.cwd(), 'data', 'ai-scans')
  await fs.promises.mkdir(scanDir, { recursive: true })
  
  const scanFile = path.join(scanDir, `${scanResult.scanId}.json`)
  await fs.promises.writeFile(scanFile, JSON.stringify(scanResult, null, 2))
}

async function getScanResult(scanId: string): Promise<NextResponse> {
  try {
    const scanFile = path.join(process.cwd(), 'data', 'ai-scans', `${scanId}.json`)
    const data = await fs.promises.readFile(scanFile, 'utf8')
    const scanResult = JSON.parse(data)

    return NextResponse.json({
      success: true,
      data: scanResult
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Scan not found' },
      { status: 404 }
    )
  }
}

async function listRecentScans(projectPath?: string | null): Promise<NextResponse> {
  try {
    const scanDir = path.join(process.cwd(), 'data', 'ai-scans')
    
    if (!fs.existsSync(scanDir)) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const files = await fs.promises.readdir(scanDir)
    const scans = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(scanDir, file)
          const data = await fs.promises.readFile(filePath, 'utf8')
          const scanResult = JSON.parse(data)
          
          if (!projectPath || scanResult.projectPath === projectPath) {
            scans.push({
              scanId: scanResult.scanId,
              projectPath: scanResult.projectPath,
              scanTime: scanResult.scanTime,
              archetype: scanResult.archetype,
              metrics: scanResult.metrics
            })
          }
        } catch (error) {
          // Skip invalid files
          continue
        }
      }
    }

    // Sort by scan time, most recent first
    scans.sort((a, b) => new Date(b.scanTime).getTime() - new Date(a.scanTime).getTime())

    return NextResponse.json({
      success: true,
      data: scans.slice(0, 20) // Return last 20 scans
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to list scans' },
      { status: 500 }
    )
  }
}

async function compareProjects(projectPath1: string, projectPath2: string): Promise<NextResponse> {
  try {
    // Find scans for both projects
    const scans = await listRecentScans()
    const scansData = await scans.json()
    
    const project1Scans = scansData.data.filter((s: any) => s.projectPath === projectPath1)
    const project2Scans = scansData.data.filter((s: any) => s.projectPath === projectPath2)
    
    if (project1Scans.length === 0 || project2Scans.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Both projects must have existing scans for comparison' },
        { status: 400 }
      )
    }

    const comparison = {
      project1: project1Scans[0],
      project2: project2Scans[0],
      comparison: {
        codeQuality: {
          project1: project1Scans[0].metrics.codeQuality,
          project2: project2Scans[0].metrics.codeQuality,
          difference: project1Scans[0].metrics.codeQuality - project2Scans[0].metrics.codeQuality
        },
        securityScore: {
          project1: project1Scans[0].metrics.securityScore,
          project2: project2Scans[0].metrics.securityScore,
          difference: project1Scans[0].metrics.securityScore - project2Scans[0].metrics.securityScore
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: comparison
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to compare projects' },
      { status: 500 }
    )
  }
}

async function getAISuggestions(scanId?: string | null): Promise<NextResponse> {
  if (!scanId) {
    // Return general AI suggestions
    return NextResponse.json({
      success: true,
      data: {
        suggestions: [
          {
            category: 'security',
            priority: 1,
            description: 'Implement secret scanning in your CI/CD pipeline',
            implementation: [
              'Add pre-commit hooks for secret detection',
              'Configure secret scanning tools like GitLeaks or TruffleHog',
              'Set up alerts for detected secrets'
            ]
          },
          {
            category: 'performance', 
            priority: 2,
            description: 'Optimize bundle size and loading performance',
            implementation: [
              'Implement code splitting',
              'Use lazy loading for components',
              'Optimize images and assets'
            ]
          },
          {
            category: 'structure',
            priority: 3,
            description: 'Improve code organization and maintainability',
            implementation: [
              'Implement consistent naming conventions',
              'Add comprehensive documentation',
              'Refactor duplicate code patterns'
            ]
          }
        ]
      }
    })
  }

  try {
    const scanResult = await getScanResult(scanId)
    const scanData = await scanResult.json()
    
    if (!scanData.success) {
      return scanResult
    }

    return NextResponse.json({
      success: true,
      data: {
        scanId: scanId,
        suggestions: scanData.data.aiSuggestions || []
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get AI suggestions' },
      { status: 500 }
    )
  }
}

async function getProjectMetrics(scanId?: string | null): Promise<NextResponse> {
  if (!scanId) {
    return NextResponse.json(
      { success: false, error: 'Scan ID is required for metrics' },
      { status: 400 }
    )
  }

  try {
    const scanResult = await getScanResult(scanId)
    const scanData = await scanResult.json()
    
    if (!scanData.success) {
      return scanResult
    }

    const metrics = scanData.data.metrics
    const patterns = scanData.data.symbolicPatterns || []
    const findings = scanData.data.securityFindings || []

    const enhancedMetrics = {
      ...metrics,
      patterns: {
        total: patterns.length,
        highRisk: patterns.filter((p: any) => p.riskLevel === 'high' || p.riskLevel === 'critical').length,
        lowRisk: patterns.filter((p: any) => p.riskLevel === 'low').length
      },
      security: {
        total: findings.length,
        critical: findings.filter((f: any) => f.severity === 'critical').length,
        high: findings.filter((f: any) => f.severity === 'high').length,
        medium: findings.filter((f: any) => f.severity === 'medium').length,
        low: findings.filter((f: any) => f.severity === 'low').length
      },
      recommendations: generateMetricRecommendations(metrics, patterns, findings)
    }

    return NextResponse.json({
      success: true,
      data: enhancedMetrics
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get project metrics' },
      { status: 500 }
    )
  }
}

function generateMetricRecommendations(metrics: any, patterns: any[], findings: any[]): string[] {
  const recommendations = []

  if (metrics.codeQuality < 70) {
    recommendations.push('Focus on improving code quality through refactoring and testing')
  }

  if (metrics.securityScore < 80) {
    recommendations.push('Address security vulnerabilities to improve overall security posture')
  }

  if (patterns.filter((p: any) => p.riskLevel === 'high').length > 5) {
    recommendations.push('Review and mitigate high-risk patterns found in the codebase')
  }

  if (findings.filter((f: any) => f.severity === 'critical').length > 0) {
    recommendations.push('Immediately address critical security findings')
  }

  if (recommendations.length === 0) {
    recommendations.push('Project appears to be in good health. Continue monitoring and maintaining quality standards.')
  }

  return recommendations
}

// Note: UAP-compliant API controller is available as scanAPIController within this module 