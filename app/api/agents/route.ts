import { NextRequest, NextResponse } from 'next/server'
import { agentSystem } from '@/src/lib/agent-system'
import { createLogger } from '@/src/utils/logger'

const logger = createLogger('AgentsAPI')

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
 * UAP-compliant Agents API with distributed agent management
 * Provides RESTful interface for agent orchestration and task delegation
 */
class AgentsAPIController {
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
    this.hooks.register('before_api_request', (data) => {
      logger.info('🌐 API request initiated', data)
    })
    
    this.hooks.register('after_api_response', (data) => {
      logger.info('✅ API response sent', {
        method: data.method,
        action: data.action,
        success: data.success,
        responseTime: data.responseTime
      })
    })
    
    this.hooks.register('on_agent_api_created', (data) => {
      logger.info('🤖 Agent created via API', {
        agentId: data.agentId,
        type: data.type,
        source: 'api'
      })
    })
    
    this.hooks.register('on_task_api_delegated', (data) => {
      logger.debug('📋 Task delegated via API', {
        taskId: data.taskId,
        taskType: data.taskType,
        priority: data.priority,
        source: 'api'
      })
    })
    
    this.hooks.register('on_api_error', (data) => {
      logger.error('❌ API error occurred', {
        method: data.method,
        action: data.action,
        error: data.error,
        statusCode: data.statusCode
      })
    })
  }

  /**
   * Generate UAP agent manifest for Agents API
   */
  generateManifest(): UAPAgentManifest {
    return {
      title: 'AgentsAPIController',
      version: this.version_lineage[this.version_lineage.length - 1],
      agent_roles: [
        'api_gateway', 
        'agent_coordinator', 
        'task_dispatcher', 
        'rest_interface'
      ],
      symbolic_intent: {
        goal: 'Provide RESTful API interface for distributed agent management and task orchestration',
        scope: 'api_gateway'
      },
      known_tools: [
        'rest_handler',
        'agent_delegator',
        'task_dispatcher',
        'response_formatter',
        'error_handler'
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
  async mutate(mutationType: 'add_endpoint' | 'enhance_validation' | 'optimize_response', 
               context: any = {}): Promise<MutationResult> {
    
    await this.hooks.trigger('before_mutation', { mutationType, context })
    
    try {
      let proposedChange = ''
      let symbolicDelta = ''
      
      switch (mutationType) {
        case 'add_endpoint':
          proposedChange = this.generateEndpointAddition(context)
          symbolicDelta = 'Added new API endpoint with validation'
          break
          
        case 'enhance_validation':
          proposedChange = this.generateValidationEnhancement(context)
          symbolicDelta = 'Enhanced request validation and error handling'
          break
          
        case 'optimize_response':
          proposedChange = this.generateResponseOptimization(context)
          symbolicDelta = 'Optimized API response formatting and caching'
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

  private generateEndpointAddition(context: any): string {
    return `
    case '${context.action || 'new_action'}':
      // New endpoint: ${context.description || 'Custom endpoint'}
      const { ${context.params?.join(', ') || 'param'} } = data
      ${context.validation || '// Add validation logic'}
      
      const result = await ${context.handler || 'customHandler'}(${context.params?.join(', ') || 'param'})
      
      return NextResponse.json({
        success: true,
        data: result
      })
    `
  }

  private generateValidationEnhancement(context: any): string {
    return `
    // Enhanced validation for ${context.endpoint || 'endpoint'}
    const validationRules = {
      required: ${JSON.stringify(context.required || [])},
      types: ${JSON.stringify(context.types || {})},
      patterns: ${JSON.stringify(context.patterns || {})}
    }
    `
  }

  private generateResponseOptimization(context: any): string {
    return `
    // Optimized response formatting
    const responseOptimization = {
      caching: ${context.caching !== false},
      compression: ${context.compression !== false},
      pagination: ${context.pagination !== false}
    }
    `
  }

  private generateNextVersion(): string {
    const current = this.version_lineage[this.version_lineage.length - 1]
    const [major, minor, patch] = current.split('.').map(Number)
    return `${major}.${minor}.${patch + 1}`
  }

  private generateTraceId(): string {
    return `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSymbolicHash(): string {
    const manifest = {
      roles: ['api_gateway', 'agent_coordinator'],
      intent: 'rest_api_management',
      timestamp: Date.now()
    }
    return Buffer.from(JSON.stringify(manifest)).toString('base64').substring(0, 16)
  }

  /**
   * UAP Agent-callable API request handler with lifecycle compliance
   */
  async handleRequest(method: string, request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now()
    
    // UAP Lifecycle: Plan Phase
    await this.hooks.trigger('before_plan', { method, url: request.url })
    
    const planResult = await this.planRequest(method, request)
    
    await this.hooks.trigger('after_plan', planResult)

    // UAP Lifecycle: Execute Phase  
    await this.hooks.trigger('before_execute', { plan: planResult })

    try {
      await this.hooks.trigger('before_api_request', { method, url: request.url, timestamp: new Date() })

      let response: NextResponse

      switch (method) {
        case 'GET':
          response = await this.handleGET(request)
          break
        case 'POST':
          response = await this.handlePOST(request)
          break
        case 'DELETE':
          response = await this.handleDELETE(request)
          break
        default:
          response = NextResponse.json(
            { success: false, error: 'Method not allowed' },
            { status: 405 }
          )
      }

      const responseTime = Date.now() - startTime

      await this.hooks.trigger('after_api_response', {
        method,
        success: true,
        responseTime,
        statusCode: response.status
      })

      await this.hooks.trigger('after_execute', { response, success: true })

      // UAP Lifecycle: Collapse Phase
      await this.hooks.trigger('before_collapse', { response, responseTime })
      
      const collapsedResponse = await this.collapseResponse(response, responseTime)
      
      await this.hooks.trigger('after_collapse', collapsedResponse)
      await this.hooks.trigger('on_success', collapsedResponse)

      return collapsedResponse

    } catch (error) {
      const responseTime = Date.now() - startTime

      await this.hooks.trigger('on_api_error', {
        method,
        error: error.message,
        responseTime,
        statusCode: 500
      })

      await this.hooks.trigger('after_execute', { error: error.message, success: false })
      
      logger.error('API request failed', { method, error: error.message, responseTime })
      
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  private async planRequest(method: string, request: NextRequest): Promise<any> {
    const url = new URL(request.url)
    return {
      method,
      url: request.url,
      searchParams: Object.fromEntries(url.searchParams),
      estimatedDuration: '100-500ms',
      phases: ['validation', 'processing', 'response_formatting']
    }
  }

  private async collapseResponse(response: NextResponse, responseTime: number): Promise<NextResponse> {
    // Add UAP metadata to response headers
    response.headers.set('X-UAP-Manifest', Buffer.from(JSON.stringify(this.generateManifest())).toString('base64'))
    response.headers.set('X-Response-Time', responseTime.toString())
    response.headers.set('X-UAP-Version', this.version_lineage[this.version_lineage.length - 1])
    
    return response
  }

  private async handleGET(request: NextRequest): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(request.url)
      const action = searchParams.get('action')
      const agentId = searchParams.get('agentId')
      const taskId = searchParams.get('taskId')
      const status = searchParams.get('status')

      switch (action) {
        case 'list_agents':
          const agents = await agentSystem.getAgents()
          return NextResponse.json({
            success: true,
            data: agents
          })

        case 'get_agent':
          if (!agentId) {
            return NextResponse.json(
              { success: false, error: 'Agent ID is required' },
              { status: 400 }
            )
          }
          const agent = await agentSystem.getAgent(agentId)
          return NextResponse.json({
            success: true,
            data: agent
          })

        case 'list_tasks':
          const tasks = await agentSystem.getTasks(status as any)
          return NextResponse.json({
            success: true,
            data: tasks
          })

        case 'get_task':
          if (!taskId) {
            return NextResponse.json(
              { success: false, error: 'Task ID is required' },
              { status: 400 }
            )
          }
          const task = await agentSystem.getTask(taskId)
          return NextResponse.json({
            success: true,
            data: task
          })

        case 'get_metrics':
          const metrics = await agentSystem.getMetrics()
          return NextResponse.json({
            success: true,
            data: metrics
          })

        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
          )
      }

    } catch (error) {
      logger.error('Agent API error', { error: error.message })
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  private async handlePOST(request: NextRequest): Promise<NextResponse> {
    try {
      const { action, ...data } = await request.json()

      switch (action) {
        case 'create_agent':
          const { type, config } = data
          if (!type) {
            return NextResponse.json(
              { success: false, error: 'Agent type is required' },
              { status: 400 }
            )
          }

          const agent = await agentSystem.createAgent(type, config)
          
          await this.hooks.trigger('on_agent_api_created', {
            agentId: agent.id,
            type,
            config
          })
          
          return NextResponse.json({
            success: true,
            data: agent
          })

        case 'delegate_task':
          const { taskType, payload, priority = 3, maxRetries = 3, metadata = {} } = data
          if (!taskType) {
            return NextResponse.json(
              { success: false, error: 'Task type is required' },
              { status: 400 }
            )
          }

          const taskId = await agentSystem.delegateTaskWithHooks({
            type: taskType,
            payload: payload || {},
            priority,
            maxRetries,
            metadata: { ...metadata, source: 'api' }
          })

          await this.hooks.trigger('on_task_api_delegated', {
            taskId,
            taskType,
            priority
          })
          
          return NextResponse.json({
            success: true,
            data: { taskId }
          })

        case 'quick_scan':
          // Convenience method for quick project scanning
          const { projectPath } = data
          if (!projectPath) {
            return NextResponse.json(
              { success: false, error: 'Project path is required' },
              { status: 400 }
            )
          }

          const scanTaskId = await agentSystem.delegateTask({
            type: 'scan-project',
            payload: { projectPath },
            priority: 2,
            maxRetries: 2,
            metadata: { source: 'api', requestTime: new Date().toISOString() }
          })

          return NextResponse.json({
            success: true,
            data: { taskId: scanTaskId, message: 'Project scan initiated' }
          })

        case 'quick_security_check':
          // Convenience method for security monitoring
          const { target } = data
          const securityTaskId = await agentSystem.delegateTask({
            type: 'monitor-security',
            payload: { target: target || 'system' },
            priority: 1,
            maxRetries: 1,
            metadata: { source: 'api', requestTime: new Date().toISOString() }
          })

          return NextResponse.json({
            success: true,
            data: { taskId: securityTaskId, message: 'Security check initiated' }
          })

        case 'ai_analyze':
          // Convenience method for AI analysis
          const { codeSnippet, analysisType = 'general' } = data
          if (!codeSnippet) {
            return NextResponse.json(
              { success: false, error: 'Code snippet is required' },
              { status: 400 }
            )
          }

          const aiTaskId = await agentSystem.delegateTask({
            type: 'ai-analyze',
            payload: { code: codeSnippet, analysisType },
            priority: 3,
            maxRetries: 2,
            metadata: { source: 'api', requestTime: new Date().toISOString() }
          })

          return NextResponse.json({
            success: true,
            data: { taskId: aiTaskId, message: 'AI analysis initiated' }
          })

        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
          )
      }

    } catch (error) {
      logger.error('Agent POST API error', { error: error.message })
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  private async handleDELETE(request: NextRequest): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(request.url)
      const agentId = searchParams.get('agentId')

      if (!agentId) {
        return NextResponse.json(
          { success: false, error: 'Agent ID is required' },
          { status: 400 }
        )
      }

      const removed = await agentSystem.removeAgent(agentId)
      
      if (removed) {
        logger.info('Agent removed via API', { agentId })
        return NextResponse.json({
          success: true,
          message: 'Agent removed successfully'
        })
      } else {
        return NextResponse.json(
          { success: false, error: 'Agent not found or cannot be removed' },
          { status: 404 }
        )
      }

    } catch (error) {
      logger.error('Agent DELETE API error', { error: error.message })
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

// Create the API controller instance
const apiController = new AgentsAPIController()

// Original handlers (to be used by the UAP controller)
async function originalGETHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const agentId = searchParams.get('agentId')
    const taskId = searchParams.get('taskId')
    const status = searchParams.get('status')

    switch (action) {
      case 'list_agents':
        const agents = await agentSystem.getAgents()
        return NextResponse.json({
          success: true,
          data: agents
        })

      case 'get_agent':
        if (!agentId) {
          return NextResponse.json(
            { success: false, error: 'Agent ID is required' },
            { status: 400 }
          )
        }
        const agent = await agentSystem.getAgent(agentId)
        return NextResponse.json({
          success: true,
          data: agent
        })

      case 'list_tasks':
        const tasks = await agentSystem.getTasks(status as any)
        return NextResponse.json({
          success: true,
          data: tasks
        })

      case 'get_task':
        if (!taskId) {
          return NextResponse.json(
            { success: false, error: 'Task ID is required' },
            { status: 400 }
          )
        }
        const task = await agentSystem.getTask(taskId)
        return NextResponse.json({
          success: true,
          data: task
        })

      case 'get_metrics':
        const metrics = await agentSystem.getMetrics()
        return NextResponse.json({
          success: true,
          data: metrics
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    logger.error('Agent API error', { error: error.message })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function originalPOSTHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const { action, ...data } = await request.json()

    switch (action) {
      case 'quick_scan':
        // Convenience method for quick project scanning
        const { projectPath } = data
        if (!projectPath) {
          return NextResponse.json(
            { success: false, error: 'Project path is required' },
            { status: 400 }
          )
        }

        const scanTaskId = await agentSystem.delegateTask({
          type: 'scan-project',
          payload: { projectPath },
          priority: 2,
          maxRetries: 2,
          metadata: { source: 'api', requestTime: new Date().toISOString() }
        })

        return NextResponse.json({
          success: true,
          data: { taskId: scanTaskId, message: 'Project scan initiated' }
        })

      case 'quick_security_check':
        // Convenience method for security monitoring
        const { target } = data
        const securityTaskId = await agentSystem.delegateTask({
          type: 'monitor-security',
          payload: { target: target || 'system' },
          priority: 1,
          maxRetries: 1,
          metadata: { source: 'api', requestTime: new Date().toISOString() }
        })

        return NextResponse.json({
          success: true,
          data: { taskId: securityTaskId, message: 'Security check initiated' }
        })

      case 'ai_analyze':
        // Convenience method for AI analysis
        const { codeSnippet, analysisType = 'general' } = data
        if (!codeSnippet) {
          return NextResponse.json(
            { success: false, error: 'Code snippet is required' },
            { status: 400 }
          )
        }

        const aiTaskId = await agentSystem.delegateTask({
          type: 'ai-analyze',
          payload: { code: codeSnippet, analysisType },
          priority: 3,
          maxRetries: 2,
          metadata: { source: 'api', requestTime: new Date().toISOString() }
        })

        return NextResponse.json({
          success: true,
          data: { taskId: aiTaskId, message: 'AI analysis initiated' }
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    logger.error('Agent POST API error', { error: error.message })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function originalDELETEHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID is required' },
        { status: 400 }
      )
    }

    const removed = await agentSystem.removeAgent(agentId)
    
    if (removed) {
      logger.info('Agent removed via API', { agentId })
      return NextResponse.json({
        success: true,
        message: 'Agent removed successfully'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Agent not found or cannot be removed' },
        { status: 404 }
      )
    }

  } catch (error) {
    logger.error('Agent DELETE API error', { error: error.message })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// UAP-compliant exports that delegate to the controller
export async function GET(request: NextRequest) {
  return await apiController.handleRequest('GET', request)
}

export async function POST(request: NextRequest) {
  return await apiController.handleRequest('POST', request)
}

export async function DELETE(request: NextRequest) {
  return await apiController.handleRequest('DELETE', request)
}

// Initialize some default agents when the API loads
async function initializeDefaultAgents() {
  try {
    const existingAgents = await agentSystem.getAgents()
    
    if (existingAgents.length === 0) {
      // Create default agents
      await agentSystem.createAgent('secret-scanner', {
        name: 'Primary Secret Scanner',
        tags: ['default', 'production']
      })

      await agentSystem.createAgent('vault-manager', {
        name: 'Primary Vault Manager',
        tags: ['default', 'production']
      })

      await agentSystem.createAgent('security-monitor', {
        name: 'Security Monitor',
        tags: ['default', 'security']
      })

      await agentSystem.createAgent('ai-assistant', {
        name: 'AI Analysis Assistant',
        tags: ['default', 'ai']
      })

      await agentSystem.createAgent('project-analyzer', {
        name: 'Project Structure Analyzer',
        tags: ['default', 'analysis']
      })

      logger.info('Default agents initialized')
    }
  } catch (error) {
    logger.error('Failed to initialize default agents', { error: error.message })
  }
}

// Initialize default agents
initializeDefaultAgents()

// Note: UAP-compliant API controller is available as apiController within this module 