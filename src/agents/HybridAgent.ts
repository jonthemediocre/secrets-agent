import { createLogger } from '../utils/logger';
import { EventEmitter } from 'events';
import UAPProtocol, { AgentIdentity, AgentCapability, UAPMessage, UAPResponse } from './protocols/UAPProtocol';
import MCPProtocol, { MCPContext, MCPRequest, MCPResponse, MCPModel } from './protocols/MCPProtocol';

const logger = createLogger('HybridAgent');

/**
 * Hybrid Agent: Combines UAP Level A2A and MCP capabilities
 * Provides seamless integration between agent-to-agent and agent-to-model communication
 */

export interface HybridAgentConfig {
  identity: AgentIdentity;
  capabilities: HybridCapability[];
  models: MCPModel[];
  networkConfig?: {
    maxConnections: number;
    heartbeatInterval: number;
    timeoutMs: number;
  };
  mcpConfig?: {
    contextTtl: number;
    maxContexts: number;
    enablePersistence: boolean;
  };
}

export interface HybridCapability extends AgentCapability {
  requiresModel?: boolean;
  modelType?: MCPModel['type'];
  contextTypes?: MCPContext['type'][];
  collaborativeMode?: 'autonomous' | 'supervised' | 'manual';
}

export interface HybridTask {
  id: string;
  type: 'analysis' | 'discovery' | 'security_scan' | 'compliance_check' | 'optimization';
  priority: 'low' | 'normal' | 'high' | 'critical' | 'emergency';
  input: any;
  context?: MCPContext[];
  collaboration?: {
    requiredAgents: string[];
    requiredModels: string[];
    coordinationMode: 'sequential' | 'parallel' | 'pipeline';
  };
  constraints?: {
    maxExecutionTime: number;
    maxCost: number;
    requiredConfidence: number;
  };
  metadata?: {
    initiatedBy: string;
    deadline?: string;
    tags: string[];
  };
}

export interface HybridTaskResult {
  taskId: string;
  success: boolean;
  output?: any;
  confidence: number;
  context: MCPContext[];
  collaborationMetrics: {
    agentsInvolved: string[];
    modelsUsed: string[];
    totalCost: number;
    executionTime: number;
  };
  insights?: {
    patterns: string[];
    recommendations: string[];
    risks: string[];
  };
  error?: {
    code: string;
    message: string;
    details: any;
  };
}

export class HybridAgent extends EventEmitter {
  private uapProtocol: UAPProtocol;
  private mcpProtocol: MCPProtocol;
  private config: HybridAgentConfig;
  private activeTasks: Map<string, HybridTask> = new Map();
  private knowledgeBase: Map<string, any> = new Map();
  private isOnline = false;

  constructor(config: HybridAgentConfig) {
    super();
    this.config = config;
    this.uapProtocol = new UAPProtocol(config.identity);
    this.mcpProtocol = new MCPProtocol(config.identity.id);
    this.setupEventHandlers();
  }

  /**
   * Initialize the hybrid agent with both protocols
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Hybrid Agent', {
      agentId: this.config.identity.id,
      type: this.config.identity.type,
      capabilities: this.config.capabilities.length
    });

    try {
      // Initialize UAP Protocol for agent-to-agent communication
      await this.uapProtocol.initialize();
      
      // Initialize MCP Protocol for agent-to-model communication  
      await this.mcpProtocol.initialize();
      
      // Register models
      for (const model of this.config.models) {
        this.mcpProtocol.registerModel(model);
      }
      
      // Setup cross-protocol integration
      this.setupProtocolIntegration();
      
      // Initialize knowledge base
      await this.initializeKnowledgeBase();
      
      this.isOnline = true;
      this.emit('ready');
      
      logger.info('Hybrid Agent initialized successfully');
    } catch (error) {
      logger.error('Hybrid Agent initialization failed:', error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Execute a hybrid task using both agent collaboration and model inference
   */
  async executeTask(task: HybridTask): Promise<HybridTaskResult> {
    const startTime = Date.now();
    this.activeTasks.set(task.id, task);
    
    logger.info('Executing hybrid task', {
      taskId: task.id,
      type: task.type,
      priority: task.priority
    });

    try {
      // Phase 1: Context Preparation
      const contexts = await this.prepareTaskContext(task);
      
      // Phase 2: Agent Collaboration (if required)
      let collaborationResults: any[] = [];
      if (task.collaboration?.requiredAgents.length) {
        collaborationResults = await this.coordinateWithAgents(task, contexts);
      }
      
      // Phase 3: Model Inference (if required)
      let modelResults: MCPResponse[] = [];
      if (task.collaboration?.requiredModels.length) {
        modelResults = await this.executeModelInference(task, contexts);
      }
      
      // Phase 4: Result Synthesis
      const synthesizedResult = await this.synthesizeResults(
        task,
        collaborationResults,
        modelResults,
        contexts
      );
      
      // Phase 5: Knowledge Base Update
      await this.updateKnowledgeBase(task, synthesizedResult);
      
      const executionTime = Date.now() - startTime;
      
      const result: HybridTaskResult = {
        taskId: task.id,
        success: true,
        output: synthesizedResult.output,
        confidence: synthesizedResult.confidence,
        context: synthesizedResult.contexts,
        collaborationMetrics: {
          agentsInvolved: collaborationResults.map(r => r.agentId).filter((id): id is string => Boolean(id)),
          modelsUsed: modelResults.map(r => r.metadata?.model).filter((model): model is string => Boolean(model)),
          totalCost: modelResults.reduce((sum, r) => sum + (r.performance.cost || 0), 0),
          executionTime
        },
        insights: synthesizedResult.insights
      };

      logger.info('Hybrid task completed successfully', {
        taskId: task.id,
        executionTime,
        confidence: result.confidence
      });

      this.emit('task_completed', result);
      return result;

    } catch (error) {
      const result: HybridTaskResult = {
        taskId: task.id,
        success: false,
        confidence: 0,
        context: [],
        collaborationMetrics: {
          agentsInvolved: [],
          modelsUsed: [],
          totalCost: 0,
          executionTime: Date.now() - startTime
        },
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          details: error
        }
      };

      logger.error('Hybrid task failed', {
        taskId: task.id,
        error: error instanceof Error ? error.message : String(error)
      });

      this.emit('task_failed', result);
      return result;

    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Advanced capability: Multi-agent secret analysis with model validation
   */
  async analyzeSecretsWithCollaboration(secrets: any[], analysisDepth: 'basic' | 'deep' | 'comprehensive' = 'deep'): Promise<HybridTaskResult> {
    const task: HybridTask = {
      id: this.generateTaskId(),
      type: 'analysis',
      priority: 'high',
      input: { secrets, analysisDepth },
      collaboration: {
        requiredAgents: ['security-agent', 'compliance-agent'],
        requiredModels: ['gpt-4-analysis'],
        coordinationMode: 'parallel'
      },
      constraints: {
        maxExecutionTime: 300000, // 5 minutes
        maxCost: 1.0,
        requiredConfidence: 0.85
      },
      metadata: {
        initiatedBy: this.config.identity.id,
        tags: ['security', 'analysis', 'collaboration']
      }
    };

    return this.executeTask(task);
  }

  /**
   * Advanced capability: Real-time threat detection with agent network
   */
  async detectThreatsInNetwork(): Promise<HybridTaskResult> {
    const task: HybridTask = {
      id: this.generateTaskId(),
      type: 'security_scan',
      priority: 'critical',
      input: { scope: 'network_wide', realtime: true },
      collaboration: {
        requiredAgents: ['monitor-agent', 'security-agent'],
        requiredModels: ['threat-detection-model'],
        coordinationMode: 'pipeline'
      },
      constraints: {
        maxExecutionTime: 60000, // 1 minute
        maxCost: 0.5,
        requiredConfidence: 0.90
      },
      metadata: {
        initiatedBy: this.config.identity.id,
        tags: ['threat-detection', 'real-time', 'network']
      }
    };

    return this.executeTask(task);
  }

  /**
   * Advanced capability: Automated compliance orchestration
   */
  async orchestrateComplianceCheck(framework: string): Promise<HybridTaskResult> {
    const task: HybridTask = {
      id: this.generateTaskId(),
      type: 'compliance_check',
      priority: 'high',
      input: { framework, automated: true },
      collaboration: {
        requiredAgents: ['compliance-agent', 'discovery-agent'],
        requiredModels: ['compliance-analysis-model'],
        coordinationMode: 'sequential'
      },
      constraints: {
        maxExecutionTime: 600000, // 10 minutes
        maxCost: 2.0,
        requiredConfidence: 0.95
      },
      metadata: {
        initiatedBy: this.config.identity.id,
        tags: ['compliance', 'automation', 'orchestration']
      }
    };

    return this.executeTask(task);
  }

  /**
   * Private methods for task execution
   */
  private async prepareTaskContext(task: HybridTask): Promise<MCPContext[]> {
    const contexts: MCPContext[] = [];

    // Create task context
    const taskContext = await this.mcpProtocol.createContext({
      type: 'task',
      scope: 'local',
      data: {
        task,
        timestamp: new Date().toISOString(),
        agentId: this.config.identity.id
      },
      access: {
        read: [this.config.identity.id],
        write: [this.config.identity.id],
        admin: [this.config.identity.id]
      }
    });
    contexts.push(taskContext);

    // Add existing contexts if provided
    if (task.context) {
      contexts.push(...task.context);
    }

    // Create knowledge context
    const relevantKnowledge = this.getRelevantKnowledge(task);
    if (relevantKnowledge) {
      const knowledgeContext = await this.mcpProtocol.createContext({
        type: 'knowledge',
        scope: 'shared',
        data: relevantKnowledge,
        access: {
          read: [this.config.identity.id],
          write: [this.config.identity.id],
          admin: [this.config.identity.id]
        }
      });
      contexts.push(knowledgeContext);
    }

    return contexts;
  }

  private async coordinateWithAgents(task: HybridTask, contexts: MCPContext[]): Promise<any[]> {
    const results: any[] = [];
    const requiredAgents = task.collaboration?.requiredAgents || [];

    if (task.collaboration?.coordinationMode === 'parallel') {
      // Execute agent requests in parallel
      const promises = requiredAgents.map(agentId => 
        this.requestAgentCollaboration(agentId, task, contexts)
      );
      const parallelResults = await Promise.allSettled(promises);
      
      for (const result of parallelResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.warn('Agent collaboration failed', { 
            error: result.reason,
            task: task.id 
          });
        }
      }
    } else {
      // Execute agent requests sequentially
      for (const agentId of requiredAgents) {
        try {
          const result = await this.requestAgentCollaboration(agentId, task, contexts);
          results.push(result);
        } catch (error) {
          logger.warn('Agent collaboration failed', { 
            agentId,
            task: task.id,
            error
          });
        }
      }
    }

    return results;
  }

  private async requestAgentCollaboration(agentId: string, task: HybridTask, contexts: MCPContext[]): Promise<any> {
    try {
      const response = await this.uapProtocol.sendMessage(
        agentId,
        'request',
        {
          action: 'collaborate',
          task: {
            id: task.id,
            type: task.type,
            input: task.input,
            context: contexts.map(ctx => ({ id: ctx.id, type: ctx.type }))
          }
        },
        {
          priority: task.priority,
          timeout: 30000,
          encryption: true
        }
      );

      return {
        agentId,
        success: response.success,
        data: response.data,
        performance: response.performance
      };
    } catch (error) {
      throw new Error(`Collaboration with agent ${agentId} failed: ${error}`);
    }
  }

  private async executeModelInference(task: HybridTask, contexts: MCPContext[]): Promise<MCPResponse[]> {
    const results: MCPResponse[] = [];
    const requiredModels = task.collaboration?.requiredModels || [];

    for (const modelId of requiredModels) {
      try {
        const capability = this.selectCapabilityForTask(task, modelId);
        
        if (!capability) {
          logger.warn('No suitable capability found for task', { taskId: task.id, modelId });
          continue;
        }
        
        const response = await this.mcpProtocol.executeRequest({
          agentId: this.config.identity.id,
          modelId,
          capability,
          input: task.input,
          context: contexts,
          priority: task.priority === 'emergency' ? 'critical' : task.priority,
          timeout: task.constraints?.maxExecutionTime || 30000
        });

        results.push(response);
      } catch (error) {
        logger.warn('Model inference failed', {
          modelId,
          task: task.id,
          error
        });
      }
    }

    return results;
  }

  private async synthesizeResults(
    task: HybridTask,
    agentResults: any[],
    modelResults: MCPResponse[],
    contexts: MCPContext[]
  ): Promise<any> {
    // Combine results from agents and models
    const combinedData = {
      agentContributions: agentResults.filter(r => r.success).map(r => r.data),
      modelInferences: modelResults.filter(r => r.success).map(r => r.output),
      contexts: contexts.map(ctx => ctx.data)
    };

    // Calculate confidence based on consensus
    const confidence = this.calculateConsensusConfidence(agentResults, modelResults);

    // Generate insights
    const insights = this.generateInsights(combinedData, task);

    return {
      output: combinedData,
      confidence,
      contexts,
      insights
    };
  }

  private calculateConsensusConfidence(agentResults: any[], modelResults: MCPResponse[]): number {
    const agentSuccessRate = agentResults.filter(r => r.success).length / Math.max(agentResults.length, 1);
    const modelSuccessRate = modelResults.filter(r => r.success).length / Math.max(modelResults.length, 1);
    
    // Weight model results higher for technical tasks
    const weightedConfidence = (agentSuccessRate * 0.4) + (modelSuccessRate * 0.6);
    return Math.min(Math.max(weightedConfidence, 0), 1);
  }

  private generateInsights(combinedData: any, task: HybridTask): any {
    return {
      patterns: ['Multi-agent collaboration pattern detected'],
      recommendations: ['Increase model confidence thresholds for critical tasks'],
      risks: ['Monitor agent network latency for real-time tasks']
    };
  }

  private selectCapabilityForTask(task: HybridTask, modelId: string): string {
    // Select appropriate model capability based on task type
    const capabilityMap: Record<string, string> = {
      'analysis': 'analyze_secrets',
      'security_scan': 'detect_threats',
      'compliance_check': 'validate_compliance',
      'discovery': 'discover_patterns',
      'optimization': 'optimize_performance'
    };

    return capabilityMap[task.type] || 'general_analysis';
  }

  private getRelevantKnowledge(task: HybridTask): any {
    // Retrieve relevant knowledge from knowledge base
    const relevantEntries = Array.from(this.knowledgeBase.entries())
      .filter(([key, value]) => 
        task.metadata?.tags.some(tag => key.includes(tag))
      )
      .map(([key, value]) => value);

    return relevantEntries.length > 0 ? relevantEntries : null;
  }

  private async updateKnowledgeBase(task: HybridTask, result: any): Promise<void> {
    const key = `${task.type}_${Date.now()}`;
    this.knowledgeBase.set(key, {
      task: task.id,
      type: task.type,
      result: result.output,
      confidence: result.confidence,
      timestamp: new Date().toISOString()
    });

    // Limit knowledge base size
    if (this.knowledgeBase.size > 1000) {
      const oldestKey = this.knowledgeBase.keys().next().value;
      this.knowledgeBase.delete(oldestKey);
    }
  }

  private async initializeKnowledgeBase(): Promise<void> {
    // Initialize with agent-specific knowledge
    this.knowledgeBase.set('agent_identity', this.config.identity);
    this.knowledgeBase.set('agent_capabilities', this.config.capabilities);
    logger.debug('Knowledge base initialized');
  }

  private setupProtocolIntegration(): void {
    // Bridge UAP and MCP events
    this.uapProtocol.on('execute_capability', async (event) => {
      try {
        const result = await this.handleCapabilityRequest(event);
        event.resolve(result);
      } catch (error) {
        event.reject(error);
      }
    });

    // Forward important events
    this.uapProtocol.on('emergency', (message) => {
      this.emit('emergency', message);
    });

    this.mcpProtocol.on('context_notification', (notification) => {
      this.emit('context_update', notification);
    });
  }

  private async handleCapabilityRequest(event: any): Promise<any> {
    const { capability, parameters } = event;
    
    // Find matching hybrid capability
    const hybridCapability = this.config.capabilities.find(cap => cap.name === capability);
    if (!hybridCapability) {
      throw new Error(`Capability ${capability} not supported`);
    }

    // Execute capability with model assistance if required
    if (hybridCapability.requiresModel) {
      const availableModels = this.mcpProtocol.getAvailableModels()
        .filter(model => model.type === hybridCapability.modelType);
      
      if (availableModels.length === 0) {
        throw new Error(`No available models for capability ${capability}`);
      }

      const response = await this.mcpProtocol.executeRequest({
        agentId: this.config.identity.id,
        modelId: availableModels[0].id,
        capability: capability,
        input: parameters,
        context: [],
        priority: 'normal'
      });

      return response.output;
    }

    // Execute capability locally
    return this.executeLocalCapability(capability, parameters);
  }

  private async executeLocalCapability(capability: string, parameters: any): Promise<any> {
    // Local capability execution
    switch (capability) {
      case 'health_check':
        return this.getAgentHealth();
      case 'status_report':
        return this.getAgentStatus();
      default:
        throw new Error(`Local capability ${capability} not implemented`);
    }
  }

  private setupEventHandlers(): void {
    this.on('ready', () => {
      logger.info('Hybrid Agent ready for operations');
    });

    this.on('task_completed', (result: HybridTaskResult) => {
      logger.info('Task completed successfully', {
        taskId: result.taskId,
        confidence: result.confidence,
        agentsInvolved: result.collaborationMetrics.agentsInvolved.length
      });
    });

    this.on('emergency', (message: UAPMessage) => {
      logger.error('Emergency situation detected', {
        source: message.source.id,
        payload: message.payload
      });
    });
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get agent health status
   */
  getAgentHealth(): any {
    const uapStatus = this.uapProtocol.getNetworkStatus();
    const mcpStatus = this.mcpProtocol.getStatus();

    return {
      isOnline: this.isOnline,
      protocols: {
        uap: uapStatus,
        mcp: mcpStatus
      },
      activeTasks: this.activeTasks.size,
      knowledgeBaseSize: this.knowledgeBase.size,
      lastHealthCheck: new Date().toISOString()
    };
  }

  /**
   * Get comprehensive agent status
   */
  getAgentStatus(): any {
    return {
      identity: this.config.identity,
      health: this.getAgentHealth(),
      capabilities: this.config.capabilities.map(cap => ({
        name: cap.name,
        requiresModel: cap.requiresModel,
        collaborativeMode: cap.collaborativeMode
      })),
      performance: {
        tasksCompleted: this.knowledgeBase.size,
        averageExecutionTime: 0, // Would track this in real implementation
        successRate: 0.95 // Would calculate from actual metrics
      }
    };
  }

  /**
   * Shutdown the hybrid agent
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Hybrid Agent');

    // Cancel active tasks
    for (const task of this.activeTasks.values()) {
      this.emit('task_cancelled', { taskId: task.id, reason: 'Agent shutdown' });
    }
    this.activeTasks.clear();

    // Shutdown protocols
    await this.uapProtocol.shutdown();
    await this.mcpProtocol.shutdown();

    // Clear knowledge base
    this.knowledgeBase.clear();

    this.isOnline = false;
    logger.info('Hybrid Agent shutdown complete');
  }
}

export default HybridAgent; 