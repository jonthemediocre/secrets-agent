import { createLogger } from '../../utils/logger';
import { EventEmitter } from 'events';

const logger = createLogger('MCPProtocol');

/**
 * MCP (Model Context Protocol) Implementation
 * Enables seamless agent-to-model communication and context sharing
 */

export interface MCPContext {
  id: string;
  type: 'task' | 'memory' | 'state' | 'knowledge' | 'capability';
  scope: 'local' | 'shared' | 'global' | 'persistent';
  data: any;
  metadata: {
    created: string;
    updated: string;
    version: string;
    ttl?: number; // Time to live in seconds
    priority: 'low' | 'normal' | 'high' | 'critical';
    tags: string[];
  };
  access: {
    read: string[]; // Agent IDs with read access
    write: string[]; // Agent IDs with write access
    admin: string[]; // Agent IDs with admin access
  };
}

export interface MCPModel {
  id: string;
  name: string;
  type: 'llm' | 'embedding' | 'classification' | 'generation' | 'analysis';
  provider: 'openai' | 'anthropic' | 'local' | 'custom';
  capabilities: ModelCapability[];
  configuration: {
    endpoint?: string;
    apiKey?: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  };
  status: 'online' | 'offline' | 'error' | 'maintenance';
  performance: {
    averageResponseTime: number;
    successRate: number;
    throughput: number;
  };
}

export interface ModelCapability {
  name: string;
  description: string;
  inputFormats: string[];
  outputFormats: string[];
  parameters: CapabilityParameter[];
}

export interface CapabilityParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  defaultValue?: any;
  constraints?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface MCPRequest {
  id: string;
  agentId: string;
  modelId: string;
  capability: string;
  input: any;
  context: MCPContext[];
  parameters?: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  metadata?: {
    trace: boolean;
    stream: boolean;
    cache: boolean;
    [key: string]: any;
  };
}

export interface MCPResponse {
  requestId: string;
  success: boolean;
  output?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  context?: MCPContext[];
  performance: {
    processingTime: number;
    tokensUsed?: number;
    cost?: number;
  };
  metadata?: {
    model: string;
    version: string;
    cached: boolean;
    [key: string]: any;
  };
}

export class MCPProtocol extends EventEmitter {
  private contexts: Map<string, MCPContext> = new Map();
  private models: Map<string, MCPModel> = new Map();
  private activeRequests: Map<string, MCPRequest> = new Map();
  private contextSubscriptions: Map<string, Set<string>> = new Map(); // context -> agentIds
  
  private agentId: string;
  private isInitialized = false;

  constructor(agentId: string) {
    super();
    this.agentId = agentId;
    this.setupEventHandlers();
  }

  /**
   * Initialize MCP Protocol
   */
  async initialize(): Promise<void> {
    logger.info('Initializing MCP Protocol', { agentId: this.agentId });

    try {
      // Load available models
      await this.discoverModels();
      
      // Initialize context store
      await this.initializeContextStore();
      
      // Setup context synchronization
      this.setupContextSync();
      
      this.isInitialized = true;
      this.emit('ready');
      
      logger.info('MCP Protocol initialized successfully');
    } catch (error) {
      logger.error('MCP Protocol initialization failed:', error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Create and store context
   */
  async createContext(context: Omit<MCPContext, 'id' | 'metadata'> & { metadata?: Partial<MCPContext['metadata']> }): Promise<MCPContext> {
    const newContext: MCPContext = {
      id: this.generateContextId(),
      ...context,
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: '1.0.0',
        priority: 'normal',
        tags: [],
        ...(context.metadata || {})
      }
    };

    this.contexts.set(newContext.id, newContext);
    
    logger.debug('Context created', {
      contextId: newContext.id,
      type: newContext.type,
      scope: newContext.scope
    });

    // Emit context created event
    this.emit('context_created', newContext);
    
    // Notify subscribers
    await this.notifyContextSubscribers(newContext, 'created');

    return newContext;
  }

  /**
   * Update existing context
   */
  async updateContext(contextId: string, updates: Partial<MCPContext>): Promise<MCPContext> {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    // Check write permissions
    if (!context.access.write.includes(this.agentId) && 
        !context.access.admin.includes(this.agentId)) {
      throw new Error(`No write access to context ${contextId}`);
    }

    const updatedContext: MCPContext = {
      ...context,
      ...updates,
      metadata: {
        ...context.metadata,
        ...updates.metadata,
        updated: new Date().toISOString(),
        version: this.incrementVersion(context.metadata.version)
      }
    };

    this.contexts.set(contextId, updatedContext);
    
    logger.debug('Context updated', {
      contextId,
      version: updatedContext.metadata.version
    });

    this.emit('context_updated', updatedContext);
    await this.notifyContextSubscribers(updatedContext, 'updated');

    return updatedContext;
  }

  /**
   * Get context by ID
   */
  getContext(contextId: string): MCPContext | null {
    const context = this.contexts.get(contextId);
    
    if (!context) {
      return null;
    }

    // Check read permissions
    if (!context.access.read.includes(this.agentId) && 
        !context.access.write.includes(this.agentId) &&
        !context.access.admin.includes(this.agentId)) {
      throw new Error(`No read access to context ${contextId}`);
    }

    return context;
  }

  /**
   * Query contexts by criteria
   */
  queryContexts(criteria: {
    type?: MCPContext['type'];
    scope?: MCPContext['scope'];
    tags?: string[];
    agentId?: string;
  }): MCPContext[] {
    const results: MCPContext[] = [];

    for (const context of this.contexts.values()) {
      // Check access permissions
      if (!context.access.read.includes(this.agentId) && 
          !context.access.write.includes(this.agentId) &&
          !context.access.admin.includes(this.agentId)) {
        continue;
      }

      // Apply filters
      if (criteria.type && context.type !== criteria.type) continue;
      if (criteria.scope && context.scope !== criteria.scope) continue;
      if (criteria.tags && !criteria.tags.every(tag => context.metadata.tags.includes(tag))) continue;

      results.push(context);
    }

    return results;
  }

  /**
   * Execute model request with context
   */
  async executeRequest(request: Omit<MCPRequest, 'id'>): Promise<MCPResponse> {
    const fullRequest: MCPRequest = {
      id: this.generateRequestId(),
      ...request
    };

    this.activeRequests.set(fullRequest.id, fullRequest);

    logger.info('Executing MCP request', {
      requestId: fullRequest.id,
      modelId: fullRequest.modelId,
      capability: fullRequest.capability
    });

    try {
      const model = this.models.get(fullRequest.modelId);
      if (!model) {
        throw new Error(`Model ${fullRequest.modelId} not found`);
      }

      // Validate capability
      const capability = model.capabilities.find(cap => cap.name === fullRequest.capability);
      if (!capability) {
        throw new Error(`Capability ${fullRequest.capability} not supported by model ${fullRequest.modelId}`);
      }

      // Prepare context for model
      const contextData = this.prepareContextForModel(fullRequest.context);
      
      // Execute model request
      const startTime = Date.now();
      const result = await this.callModel(model, capability, fullRequest.input, contextData, fullRequest.parameters);
      const processingTime = Date.now() - startTime;

      // Process response context updates
      if (result.contextUpdates) {
        await this.processContextUpdates(result.contextUpdates);
      }

      const response: MCPResponse = {
        requestId: fullRequest.id,
        success: true,
        output: result.output,
        context: result.contextUpdates || [],
        performance: {
          processingTime,
          tokensUsed: result.tokensUsed,
          cost: result.cost
        },
        metadata: {
          model: model.name,
          version: model.configuration.model,
          cached: result.cached || false
        }
      };

      logger.debug('MCP request completed', {
        requestId: fullRequest.id,
        processingTime,
        success: true
      });

      this.emit('request_completed', { request: fullRequest, response });
      return response;

    } catch (error) {
      const response: MCPResponse = {
        requestId: fullRequest.id,
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          details: error
        },
        performance: {
          processingTime: Date.now() - new Date().getTime()
        }
      };

      logger.error('MCP request failed', {
        requestId: fullRequest.id,
        error: error instanceof Error ? error.message : String(error)
      });

      this.emit('request_failed', { request: fullRequest, response });
      return response;

    } finally {
      this.activeRequests.delete(fullRequest.id);
    }
  }

  /**
   * Subscribe to context changes
   */
  subscribeToContext(contextId: string): void {
    if (!this.contextSubscriptions.has(contextId)) {
      this.contextSubscriptions.set(contextId, new Set());
    }
    this.contextSubscriptions.get(contextId)!.add(this.agentId);
    
    logger.debug('Subscribed to context', { contextId, agentId: this.agentId });
  }

  /**
   * Unsubscribe from context changes
   */
  unsubscribeFromContext(contextId: string): void {
    const subscribers = this.contextSubscriptions.get(contextId);
    if (subscribers) {
      subscribers.delete(this.agentId);
      if (subscribers.size === 0) {
        this.contextSubscriptions.delete(contextId);
      }
    }
    
    logger.debug('Unsubscribed from context', { contextId, agentId: this.agentId });
  }

  /**
   * Register new model
   */
  registerModel(model: MCPModel): void {
    this.models.set(model.id, model);
    logger.info('Model registered', { modelId: model.id, type: model.type });
    this.emit('model_registered', model);
  }

  /**
   * Get available models
   */
  getAvailableModels(): MCPModel[] {
    return Array.from(this.models.values()).filter(model => model.status === 'online');
  }

  /**
   * Private methods
   */
  private async discoverModels(): Promise<void> {
    // Register default models
    const defaultModels: MCPModel[] = [
      {
        id: 'gpt-4-analysis',
        name: 'GPT-4 Analysis',
        type: 'analysis',
        provider: 'openai',
        capabilities: [
          {
            name: 'analyze_secrets',
            description: 'Analyze secrets for security risks',
            inputFormats: ['text', 'json'],
            outputFormats: ['json'],
            parameters: [
              {
                name: 'depth',
                type: 'string',
                required: false,
                description: 'Analysis depth level',
                defaultValue: 'standard'
              }
            ]
          }
        ],
        configuration: {
          model: 'gpt-4-turbo-preview',
          temperature: 0.1,
          maxTokens: 4000
        },
        status: 'online',
        performance: {
          averageResponseTime: 2500,
          successRate: 0.98,
          throughput: 10
        }
      }
    ];

    for (const model of defaultModels) {
      this.registerModel(model);
    }
  }

  private async initializeContextStore(): Promise<void> {
    // Initialize persistent context storage
    logger.debug('Context store initialized');
  }

  private setupContextSync(): void {
    // Setup context synchronization between agents
    logger.debug('Context sync configured');
  }

  private setupEventHandlers(): void {
    this.on('context_created', (context: MCPContext) => {
      logger.debug('Context created event', { contextId: context.id });
    });

    this.on('context_updated', (context: MCPContext) => {
      logger.debug('Context updated event', { contextId: context.id });
    });
  }

  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private prepareContextForModel(contexts: MCPContext[]): any {
    return contexts.map(ctx => ({
      type: ctx.type,
      data: ctx.data,
      metadata: ctx.metadata
    }));
  }

  private async callModel(
    model: MCPModel, 
    capability: ModelCapability, 
    input: any, 
    context: any, 
    parameters?: Record<string, any>
  ): Promise<any> {
    // Mock model execution - in real implementation, this would call actual models
    return {
      output: {
        analysis: 'Mock analysis result',
        confidence: 0.95,
        recommendations: ['Enable encryption', 'Rotate secrets']
      },
      tokensUsed: 150,
      cost: 0.003,
      cached: false
    };
  }

  private async processContextUpdates(updates: MCPContext[]): Promise<void> {
    for (const update of updates) {
      if (this.contexts.has(update.id)) {
        await this.updateContext(update.id, update);
      } else {
        await this.createContext(update);
      }
    }
  }

  private async notifyContextSubscribers(context: MCPContext, event: 'created' | 'updated'): Promise<void> {
    const subscribers = this.contextSubscriptions.get(context.id);
    if (subscribers) {
      for (const agentId of subscribers) {
        this.emit('context_notification', {
          agentId,
          contextId: context.id,
          event,
          context
        });
      }
    }
  }

  /**
   * Shutdown MCP Protocol
   */
  async shutdown(): Promise<void> {
    // Clear active requests
    for (const request of this.activeRequests.values()) {
      this.emit('request_cancelled', request);
    }
    this.activeRequests.clear();

    // Clear subscriptions
    this.contextSubscriptions.clear();

    this.isInitialized = false;
    logger.info('MCP Protocol shutdown complete');
  }

  /**
   * Get protocol status
   */
  getStatus(): {
    isInitialized: boolean;
    contextsCount: number;
    modelsCount: number;
    activeRequestsCount: number;
    subscriptionsCount: number;
  } {
    return {
      isInitialized: this.isInitialized,
      contextsCount: this.contexts.size,
      modelsCount: this.models.size,
      activeRequestsCount: this.activeRequests.size,
      subscriptionsCount: this.contextSubscriptions.size
    };
  }
}

export default MCPProtocol; 