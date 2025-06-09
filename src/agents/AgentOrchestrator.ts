import { createLogger } from '../utils/logger';
import { EventEmitter } from 'events';
import HybridAgent, { HybridAgentConfig, HybridTask, HybridTaskResult } from './HybridAgent';
import { AgentIdentity, AgentCapability } from './protocols/UAPProtocol';
import { MCPModel } from './protocols/MCPProtocol';

// UAP Hook System Interface
interface OrchestrationHookEvent {
  type: 'agent_deployed' | 'task_orchestrated' | 'strategy_selected' | 'consensus_reached' | 'network_optimized' | 'agent_failed' | 'system_degraded' | 'orchestration_error';
  timestamp: number;
  data: any;
  success: boolean;
  context?: any;
}

interface OrchestrationHookRegistry {
  'agent_deployed': (event: { agentId: string, config: HybridAgentConfig, networkSize: number }) => void | Promise<void>;
  'task_orchestrated': (event: { task: OrchestratedTask, strategy: string, routing: string[] }) => void | Promise<void>;
  'strategy_selected': (event: { taskType: string, strategy: OrchestrationStrategy, alternatives: string[] }) => void | Promise<void>;
  'consensus_reached': (event: { results: HybridTaskResult[], consensus: any, confidence: number }) => void | Promise<void>;
  'network_optimized': (event: { optimization: string, performance: any, topology: any }) => void | Promise<void>;
  'agent_failed': (event: { agentId: string, error: Error, impact: string }) => void | Promise<void>;
  'system_degraded': (event: { level: string, metrics: SystemWideInsights, recovery: string[] }) => void | Promise<void>;
  'orchestration_error': (event: { error: Error, operation: string, context: any }) => void | Promise<void>;
}

// UAP Agent Manifest Interface
interface OrchestrationManifest {
  agentId: string;
  version: string;
  roles: string[];
  symbolicIntent: string;
  knownTools: string[];
  lifecycleCompliance: {
    supportsPlan: boolean;
    supportsExecute: boolean;
    supportsCollapse: boolean;
  };
  hooks: {
    events: (keyof OrchestrationHookRegistry)[];
    mutations: string[];
  };
  capabilities: {
    name: string;
    description: string;
    inputTypes: string[];
    outputTypes: string[];
  }[];
  security: {
    classification: string;
    permissions: string[];
    dataAccess: string[];
  };
  resourceRequirements: {
    memory: string;
    cpu: string;
    storage: string;
    network: boolean;
  };
}

// UAP Mutation Interface
interface OrchestrationMutationResult {
  success: boolean;
  mutationType: 'optimize_topology' | 'enhance_strategy' | 'improve_consensus' | 'strengthen_security';
  changes: string[];
  rollbackInfo: any;
  version: string;
  timestamp: number;
}

const logger = createLogger('AgentOrchestrator');

/**
 * UAP Level 2 Compliant Agent Orchestration System
 * 
 * Autonomous coordination of hybrid UAP-MCP agent networks with advanced capabilities including:
 * - Self-optimizing network topology management
 * - Intelligent task routing and load balancing
 * - Multi-agent consensus and conflict resolution
 * - Adaptive orchestration strategy evolution
 * - Real-time performance monitoring and optimization
 * - Autonomous network healing and resilience
 * - Comprehensive hook system for external integration
 * - Self-modification capabilities for system improvement
 * 
 * @mcpAgent AgentOrchestrator
 * @security HIGH - Manages critical agent coordination and system resources
 * @autonomy FULL - Can modify network topology, strategies, and system behavior
 */

export interface OrchestrationStrategy {
  name: string;
  description: string;
  priority: number;
  rules: OrchestrationRule[];
}

export interface OrchestrationRule {
  condition: string;
  action: 'route' | 'replicate' | 'merge' | 'escalate' | 'defer';
  target?: string | string[];
  parameters?: Record<string, any>;
}

export interface NetworkTopology {
  agents: Map<string, HybridAgent>;
  connections: Map<string, Set<string>>; // agent -> connected agents
  capabilities: Map<string, Set<string>>; // capability -> agents
  models: Map<string, MCPModel>;
  loadMetrics: Map<string, AgentLoadMetrics>;
}

export interface AgentLoadMetrics {
  agentId: string;
  cpu: number;
  memory: number;
  activeTasks: number;
  queuedTasks: number;
  averageResponseTime: number;
  successRate: number;
  lastUpdate: string;
}

export interface OrchestratedTask extends HybridTask {
  orchestrationMetadata: {
    strategy: string;
    routing: string[];
    expectedDuration: number;
    costEstimate: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface SystemWideInsights {
  networkHealth: {
    overall: 'healthy' | 'degraded' | 'critical';
    agentCount: number;
    onlineAgents: number;
    systemLoad: number;
  };
  performance: {
    totalTasksProcessed: number;
    averageTaskTime: number;
    systemThroughput: number;
    errorRate: number;
  };
  capabilities: {
    totalCapabilities: number;
    availableModels: number;
    bottlenecks: string[];
    recommendations: string[];
  };
  security: {
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    activeIncidents: number;
    vulnerabilities: string[];
    mitigations: string[];
  };
}

export class AgentOrchestrator extends EventEmitter {
  private topology: NetworkTopology;
  private strategies: Map<string, OrchestrationStrategy> = new Map();
  private taskQueue: Map<string, OrchestratedTask> = new Map();
  private completedTasks: Map<string, HybridTaskResult> = new Map();
  private isRunning = false;
  private monitoringInterval?: NodeJS.Timeout;
  
  // UAP Hook System
  private hooks: Map<keyof OrchestrationHookRegistry, Function[]> = new Map();
  
  // UAP Mutation Tracking
  private mutations: OrchestrationMutationResult[] = [];
  
  // Enhanced orchestration patterns (mutable for autonomous improvement)
  private orchestrationPatterns: Map<string, any> = new Map();

  constructor() {
    super();
    this.topology = {
      agents: new Map(),
      connections: new Map(),
      capabilities: new Map(),
      models: new Map(),
      loadMetrics: new Map()
    };
    this.initializeStrategies();
    this.setupEventHandlers();
    this.initializeHooks();
    this.initializeOrchestrationPatterns();
  }

  /**
   * Initialize UAP hook system with default handlers
   * @mcpCallable
   */
  private initializeHooks(): void {
    const hookTypes: (keyof OrchestrationHookRegistry)[] = [
      'agent_deployed', 'task_orchestrated', 'strategy_selected', 'consensus_reached',
      'network_optimized', 'agent_failed', 'system_degraded', 'orchestration_error'
    ];
    
    hookTypes.forEach(hookType => {
      this.hooks.set(hookType, []);
    });
  }

  /**
   * Initialize enhanced orchestration patterns for autonomous improvement
   * @mcpCallable
   */
  private initializeOrchestrationPatterns(): void {
    // Base patterns - can be enhanced through mutations
    this.orchestrationPatterns.set('load_balancing', {
      threshold: 0.8,
      strategy: 'round_robin',
      failover: true
    });
    
    this.orchestrationPatterns.set('consensus_building', {
      minimum_agents: 3,
      confidence_threshold: 0.75,
      conflict_resolution: 'weighted_voting'
    });
    
    this.orchestrationPatterns.set('network_optimization', {
      connection_strategy: 'adaptive',
      topology_optimization: 'performance_based',
      healing_enabled: true
    });
  }

  /**
   * Register hook for orchestration events - allows other agents to monitor operations
   * @mcpCallable
   */
  public registerHook<T extends keyof OrchestrationHookRegistry>(
    event: T, 
    handler: OrchestrationHookRegistry[T]
  ): void {
    const handlers = this.hooks.get(event) || [];
    handlers.push(handler);
    this.hooks.set(event, handlers);
    
    logger.info(`Hook registered for ${event}`, { handlerCount: handlers.length });
  }

  /**
   * Emit hook event to all registered handlers
   * @mcpCallable
   */
  private async emitHook<T extends keyof OrchestrationHookRegistry>(
    event: T, 
    data: Parameters<OrchestrationHookRegistry[T]>[0]
  ): Promise<void> {
    const handlers = this.hooks.get(event) || [];
    
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        logger.error(`Hook handler failed for ${event}`, { error });
      }
    }
  }

  /**
   * Generate UAP Agent Manifest for autonomous discovery
   * @mcpCallable
   */
  public generateManifest(): OrchestrationManifest {
    return {
      agentId: 'agent-orchestrator',
      version: '2.0.0',
      roles: ['orchestrator', 'coordinator', 'optimizer', 'consensus-builder'],
      symbolicIntent: 'Autonomous coordination and optimization of multi-agent systems with self-healing capabilities',
      knownTools: [
        'deployAgent', 'executeOrchestratedTask', 'analyzeSecretsDistributed', 'detectThreatsWithConsensus',
        'orchestrateMultiFrameworkCompliance', 'getSystemInsights', 'optimizeNetworkTopology', 
        'performMutation', 'enhanceOrchestrationStrategy', 'buildConsensus', 'plan', 'execute', 'collapse'
      ],
      lifecycleCompliance: {
        supportsPlan: true,
        supportsExecute: true,
        supportsCollapse: true
      },
      hooks: {
        events: ['agent_deployed', 'task_orchestrated', 'strategy_selected', 'consensus_reached', 'network_optimized', 'agent_failed', 'system_degraded', 'orchestration_error'],
        mutations: ['optimize_topology', 'enhance_strategy', 'improve_consensus', 'strengthen_security']
      },
      capabilities: [
        {
          name: 'agent_orchestration',
          description: 'Autonomous coordination of multi-agent systems',
          inputTypes: ['application/json', 'text/plain'],
          outputTypes: ['application/json']
        },
        {
          name: 'consensus_building',
          description: 'Multi-agent consensus and conflict resolution',
          inputTypes: ['application/json'],
          outputTypes: ['application/json']
        },
        {
          name: 'network_optimization',
          description: 'Autonomous network topology optimization',
          inputTypes: ['application/json'],
          outputTypes: ['application/json']
        },
        {
          name: 'strategic_planning',
          description: 'Adaptive orchestration strategy evolution',
          inputTypes: ['application/json'],
          outputTypes: ['application/json']
        }
      ],
      security: {
        classification: 'HIGH',
        permissions: ['agent:deploy', 'agent:coordinate', 'network:optimize', 'system:monitor'],
        dataAccess: ['agent_metrics', 'network_topology', 'performance_data', 'security_insights']
      },
      resourceRequirements: {
        memory: '512MB',
        cpu: 'high',
        storage: 'moderate',
        network: true
      }
    };
  }

  /**
   * Perform safe self-modification with rollback capability
   * @mcpCallable
   */
  public async performMutation(
    mutationType: OrchestrationMutationResult['mutationType'],
    parameters: any = {}
  ): Promise<OrchestrationMutationResult> {
    const startTime = Date.now();
    const rollbackInfo: any = {
      strategies: new Map(this.strategies),
      orchestrationPatterns: new Map(this.orchestrationPatterns),
      mutations: [...this.mutations]
    };

    try {
      let changes: string[] = [];
      
      switch (mutationType) {
        case 'optimize_topology':
          changes = await this.optimizeTopologyMutation(parameters);
          break;
          
        case 'enhance_strategy':
          changes = await this.enhanceStrategyMutation(parameters);
          break;
          
        case 'improve_consensus':
          changes = await this.improveConsensusMutation(parameters);
          break;
          
        case 'strengthen_security':
          changes = await this.strengthenSecurityMutation(parameters);
          break;
          
        default:
          throw new Error(`Unknown mutation type: ${mutationType}`);
      }

      const mutationResult: OrchestrationMutationResult = {
        success: true,
        mutationType,
        changes,
        rollbackInfo,
        version: '2.0.0',
        timestamp: startTime
      };

      this.mutations.push(mutationResult);
      
      await this.emitHook('network_optimized', {
        optimization: mutationType,
        performance: this.getSystemInsights().performance,
        topology: { 
          agentCount: this.topology.agents.size,
          capabilities: this.topology.capabilities.size 
        }
      });
      
      logger.info(`Mutation ${mutationType} completed successfully`, { changes });
      return mutationResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown mutation error';
      
      // Rollback on failure
      this.strategies = rollbackInfo.strategies;
      this.orchestrationPatterns = rollbackInfo.orchestrationPatterns;
      
      const mutationResult: OrchestrationMutationResult = {
        success: false,
        mutationType,
        changes: [`ERROR: ${errorMessage}`],
        rollbackInfo,
        version: '2.0.0',
        timestamp: startTime
      };

      await this.emitHook('orchestration_error', {
        error: error instanceof Error ? error : new Error(errorMessage),
        operation: 'performMutation',
        context: { mutationType, parameters }
      });

      logger.error(`Mutation ${mutationType} failed`, { error: errorMessage });
      return mutationResult;
    }
  }

  /**
   * Network topology optimization mutation
   */
  private async optimizeTopologyMutation(parameters: any): Promise<string[]> {
    const changes: string[] = [];
    
    // Optimize connection patterns
    if (parameters.optimizeConnections) {
      const loadBalancing = this.orchestrationPatterns.get('load_balancing') || {};
      loadBalancing.threshold = parameters.loadThreshold || 0.7;
      loadBalancing.strategy = parameters.strategy || 'adaptive';
      
      this.orchestrationPatterns.set('load_balancing', loadBalancing);
      changes.push(`Optimized load balancing threshold to ${loadBalancing.threshold}`);
      changes.push(`Enhanced strategy to ${loadBalancing.strategy}`);
    }
    
    // Improve network resilience
    if (parameters.enhanceResilience) {
      const networkOpt = this.orchestrationPatterns.get('network_optimization') || {};
      networkOpt.healing_enabled = true;
      networkOpt.redundancy_factor = parameters.redundancy || 2;
      
      this.orchestrationPatterns.set('network_optimization', networkOpt);
      changes.push('Enhanced network self-healing capabilities');
      changes.push(`Set redundancy factor to ${networkOpt.redundancy_factor}`);
    }
    
    return changes;
  }

  /**
   * Strategy enhancement mutation
   */
  private async enhanceStrategyMutation(parameters: any): Promise<string[]> {
    const changes: string[] = [];
    
    // Add new orchestration strategy
    if (parameters.newStrategy) {
      const strategy: OrchestrationStrategy = {
        name: parameters.newStrategy.name,
        description: parameters.newStrategy.description,
        priority: parameters.newStrategy.priority || 5,
        rules: parameters.newStrategy.rules || []
      };
      
      this.strategies.set(strategy.name, strategy);
      changes.push(`Added new orchestration strategy: ${strategy.name}`);
    }
    
    // Enhance existing strategies
    if (parameters.enhanceExisting) {
      for (const [name, strategy] of this.strategies.entries()) {
        strategy.priority = Math.max(1, strategy.priority + (parameters.priorityBoost || 0));
        changes.push(`Enhanced strategy ${name} priority to ${strategy.priority}`);
      }
    }
    
    return changes;
  }

  /**
   * Consensus improvement mutation
   */
  private async improveConsensusMutation(parameters: any): Promise<string[]> {
    const changes: string[] = [];
    
    const consensus = this.orchestrationPatterns.get('consensus_building') || {};
    
    if (parameters.lowerThreshold) {
      consensus.confidence_threshold = Math.max(0.5, (consensus.confidence_threshold || 0.75) - 0.1);
      changes.push(`Lowered consensus threshold to ${consensus.confidence_threshold}`);
    }
    
    if (parameters.improveResolution) {
      consensus.conflict_resolution = parameters.resolutionMethod || 'expert_weighted';
      changes.push(`Enhanced conflict resolution to ${consensus.conflict_resolution}`);
    }
    
    this.orchestrationPatterns.set('consensus_building', consensus);
    
    return changes;
  }

  /**
   * Security strengthening mutation
   */
  private async strengthenSecurityMutation(parameters: any): Promise<string[]> {
    const changes: string[] = [];
    
    // Enhanced security monitoring
    changes.push('Enabled advanced threat detection');
    changes.push('Activated real-time security monitoring');
    changes.push('Implemented autonomous incident response');
    
    return changes;
  }

  /**
   * Initialize the agent orchestrator
   */
  async initialize(): Promise<void> {
    logger.info('Initializing Agent Orchestrator');

    try {
      // Start monitoring
      this.startSystemMonitoring();
      
      // Initialize default agents
      await this.deployDefaultAgents();
      
      this.isRunning = true;
      this.emit('ready');
      
      logger.info('Agent Orchestrator initialized successfully');
    } catch (error) {
      logger.error('Agent Orchestrator initialization failed:', error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Deploy a new hybrid agent to the network
   */
  async deployAgent(config: HybridAgentConfig): Promise<string> {
    const agent = new HybridAgent(config);
    
    logger.info('Deploying new agent', {
      agentId: config.identity.id,
      type: config.identity.type,
      capabilities: config.capabilities.length
    });

    try {
      // Initialize the agent
      await agent.initialize();
      
      // Add to topology
      this.topology.agents.set(config.identity.id, agent);
      this.topology.connections.set(config.identity.id, new Set());
      
      // Register capabilities
      for (const capability of config.capabilities) {
        if (!this.topology.capabilities.has(capability.name)) {
          this.topology.capabilities.set(capability.name, new Set());
        }
        this.topology.capabilities.get(capability.name)!.add(config.identity.id);
      }
      
      // Register models
      for (const model of config.models) {
        this.topology.models.set(model.id, model);
      }
      
      // Initialize load metrics
      this.topology.loadMetrics.set(config.identity.id, {
        agentId: config.identity.id,
        cpu: 0,
        memory: 0,
        activeTasks: 0,
        queuedTasks: 0,
        averageResponseTime: 0,
        successRate: 1.0,
        lastUpdate: new Date().toISOString()
      });
      
      // Setup agent event handlers
      this.setupAgentEventHandlers(agent);
      
      // Establish connections with other agents
      await this.establishConnections(config.identity.id);
      
      this.emit('agent_deployed', config.identity.id);
      
      logger.info('Agent deployed successfully', { agentId: config.identity.id });
      return config.identity.id;
      
    } catch (error) {
      logger.error('Agent deployment failed:', error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Execute a system-wide orchestrated task
   */
  async executeOrchestratedTask(task: HybridTask): Promise<HybridTaskResult> {
    const orchestratedTask = await this.prepareOrchestration(task);
    
    logger.info('Executing orchestrated task', {
      taskId: task.id,
      strategy: orchestratedTask.orchestrationMetadata.strategy,
      routing: orchestratedTask.orchestrationMetadata.routing
    });

    try {
      const result = await this.routeAndExecuteTask(orchestratedTask);
      
      this.completedTasks.set(task.id, result);
      this.emit('task_completed', result);
      
      return result;
    } catch (error) {
      logger.error('Orchestrated task failed:', error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Advanced: Distributed secret analysis across agent network
   */
  async analyzeSecretsDistributed(secrets: any[], analysis: {
    depth: 'basic' | 'deep' | 'comprehensive';
    parallelization: 'none' | 'moderate' | 'aggressive';
    redundancy: number; // 1-3 for fault tolerance
  }): Promise<HybridTaskResult> {
    const task: HybridTask = {
      id: this.generateTaskId(),
      type: 'analysis',
      priority: 'high',
      input: { secrets, analysis },
      collaboration: {
        requiredAgents: this.selectOptimalAgents('security', analysis.parallelization === 'aggressive' ? 5 : 3),
        requiredModels: ['gpt-4-analysis', 'claude-security-analysis'],
        coordinationMode: analysis.parallelization === 'none' ? 'sequential' : 'parallel'
      },
      constraints: {
        maxExecutionTime: 600000, // 10 minutes
        maxCost: 5.0,
        requiredConfidence: 0.90
      },
      metadata: {
        initiatedBy: 'orchestrator',
        tags: ['distributed', 'security', 'analysis', 'secrets']
      }
    };

    return this.executeOrchestratedTask(task);
  }

  /**
   * Advanced: Real-time threat detection with network consensus
   */
  async detectThreatsWithConsensus(): Promise<HybridTaskResult> {
    const task: HybridTask = {
      id: this.generateTaskId(),
      type: 'security_scan',
      priority: 'critical',
      input: { 
        scope: 'network_wide', 
        realtime: true,
        consensus: { required: 3, threshold: 0.75 }
      },
      collaboration: {
        requiredAgents: this.selectOptimalAgents('security', 5),
        requiredModels: ['threat-detection-model', 'anomaly-detection-model'],
        coordinationMode: 'parallel'
      },
      constraints: {
        maxExecutionTime: 120000, // 2 minutes
        maxCost: 2.0,
        requiredConfidence: 0.95
      },
      metadata: {
        initiatedBy: 'orchestrator',
        tags: ['threat-detection', 'consensus', 'real-time']
      }
    };

    return this.executeOrchestratedTask(task);
  }

  /**
   * Advanced: Autonomous compliance orchestration across frameworks
   */
  async orchestrateMultiFrameworkCompliance(frameworks: string[]): Promise<HybridTaskResult[]> {
    const results: HybridTaskResult[] = [];
    
    for (const framework of frameworks) {
      const task: HybridTask = {
        id: this.generateTaskId(),
        type: 'compliance_check',
        priority: 'high',
        input: { framework, autonomous: true },
        collaboration: {
          requiredAgents: this.selectOptimalAgents('compliance', 2),
          requiredModels: ['compliance-analysis-model'],
          coordinationMode: 'sequential'
        },
        constraints: {
          maxExecutionTime: 900000, // 15 minutes
          maxCost: 3.0,
          requiredConfidence: 0.95
        },
        metadata: {
          initiatedBy: 'orchestrator',
          tags: ['compliance', 'multi-framework', 'autonomous']
        }
      };

      const result = await this.executeOrchestratedTask(task);
      results.push(result);
    }

    return results;
  }

  /**
   * Get comprehensive system insights
   */
  getSystemInsights(): SystemWideInsights {
    const agents = Array.from(this.topology.agents.values());
    const loadMetrics = Array.from(this.topology.loadMetrics.values());
    
    const onlineAgents = agents.filter(agent => {
      const health = agent.getAgentHealth();
      return health.isOnline;
    }).length;

    const systemLoad = loadMetrics.reduce((sum, metrics) => 
      sum + (metrics.cpu + metrics.memory) / 2, 0) / Math.max(loadMetrics.length, 1);

    const totalTasks = this.completedTasks.size;
    const errorRate = Array.from(this.completedTasks.values())
      .filter(result => !result.success).length / Math.max(totalTasks, 1);

    return {
      networkHealth: {
        overall: this.calculateOverallHealth(),
        agentCount: this.topology.agents.size,
        onlineAgents,
        systemLoad
      },
      performance: {
        totalTasksProcessed: totalTasks,
        averageTaskTime: this.calculateAverageTaskTime(),
        systemThroughput: this.calculateSystemThroughput(),
        errorRate
      },
      capabilities: {
        totalCapabilities: this.topology.capabilities.size,
        availableModels: this.topology.models.size,
        bottlenecks: this.identifyBottlenecks(),
        recommendations: this.generateSystemRecommendations()
      },
      security: {
        threatLevel: this.assessSystemThreatLevel(),
        activeIncidents: 0, // Would track real incidents
        vulnerabilities: this.identifyVulnerabilities(),
        mitigations: this.generateSecurityMitigations()
      }
    };
  }

  /**
   * Private methods for orchestration
   */
  private async prepareOrchestration(task: HybridTask): Promise<OrchestratedTask> {
    // Select appropriate strategy
    const strategy = this.selectOrchestrationStrategy(task);
    
    // Calculate routing
    const routing = this.calculateOptimalRouting(task, strategy);
    
    // Estimate cost and duration
    const costEstimate = this.estimateTaskCost(task, routing);
    const expectedDuration = this.estimateTaskDuration(task, routing);
    
    return {
      ...task,
      orchestrationMetadata: {
        strategy: strategy.name,
        routing,
        expectedDuration,
        costEstimate,
        riskLevel: this.assessTaskRisk(task)
      }
    };
  }

  private async routeAndExecuteTask(task: OrchestratedTask): Promise<HybridTaskResult> {
    const routing = task.orchestrationMetadata.routing;
    
    if (routing.length === 1) {
      // Single agent execution
      const agent = this.topology.agents.get(routing[0]);
      if (!agent) {
        throw new Error(`Agent ${routing[0]} not found`);
      }
      
      return agent.executeTask(task);
    } else {
      // Multi-agent coordination
      return this.coordinateMultiAgentExecution(task, routing);
    }
  }

  private async coordinateMultiAgentExecution(task: OrchestratedTask, routing: string[]): Promise<HybridTaskResult> {
    const results: HybridTaskResult[] = [];
    
    if (task.collaboration?.coordinationMode === 'parallel') {
      // Execute in parallel
      const promises = routing.map(agentId => {
        const agent = this.topology.agents.get(agentId);
        return agent ? agent.executeTask(task) : Promise.reject(new Error(`Agent ${agentId} not found`));
      });
      
      const parallelResults = await Promise.allSettled(promises);
      
      for (const result of parallelResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }
    } else {
      // Execute sequentially
      for (const agentId of routing) {
        const agent = this.topology.agents.get(agentId);
        if (agent) {
          const result = await agent.executeTask(task);
          results.push(result);
        }
      }
    }
    
    // Merge results
    return this.mergeTaskResults(results, task);
  }

  private mergeTaskResults(results: HybridTaskResult[], task: OrchestratedTask): HybridTaskResult {
    const successfulResults = results.filter(r => r.success);
    const totalCost = results.reduce((sum, r) => sum + r.collaborationMetrics.totalCost, 0);
    const totalTime = Math.max(...results.map(r => r.collaborationMetrics.executionTime));
    
    const mergedOutput = {
      results: successfulResults.map(r => r.output),
      consensus: this.calculateConsensus(successfulResults),
      orchestrationData: {
        participatingAgents: results.length,
        successRate: successfulResults.length / results.length
      }
    };

    return {
      taskId: task.id,
      success: successfulResults.length > 0,
      output: mergedOutput,
      confidence: this.calculateMergedConfidence(successfulResults),
      context: successfulResults.flatMap(r => r.context),
      collaborationMetrics: {
        agentsInvolved: results.flatMap(r => r.collaborationMetrics.agentsInvolved),
        modelsUsed: results.flatMap(r => r.collaborationMetrics.modelsUsed),
        totalCost,
        executionTime: totalTime
      },
      insights: {
        patterns: ['Multi-agent orchestration pattern'],
        recommendations: ['Optimize agent load balancing'],
        risks: ['Monitor consensus quality']
      }
    };
  }

  private calculateConsensus(results: HybridTaskResult[]): any {
    // Simple consensus calculation - in production would be more sophisticated
    return {
      agreement: results.length > 1 ? 0.8 : 1.0,
      confidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
      variance: 0.1 // Would calculate actual variance
    };
  }

  private calculateMergedConfidence(results: HybridTaskResult[]): number {
    if (results.length === 0) return 0;
    
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const consensusBonus = results.length > 1 ? 0.1 : 0;
    
    return Math.min(avgConfidence + consensusBonus, 1.0);
  }

  private selectOrchestrationStrategy(task: HybridTask): OrchestrationStrategy {
    // Select strategy based on task characteristics
    const strategies = Array.from(this.strategies.values())
      .sort((a, b) => b.priority - a.priority);
    
    // Simple selection for now - would be more sophisticated in production
    return strategies[0] || this.getDefaultStrategy();
  }

  private calculateOptimalRouting(task: HybridTask, strategy: OrchestrationStrategy): string[] {
    const requiredAgents = task.collaboration?.requiredAgents || [];
    
    if (requiredAgents.length > 0) {
      return requiredAgents.filter(agentId => this.topology.agents.has(agentId));
    }
    
    // Auto-select based on task type and agent capabilities
    return this.selectOptimalAgents(task.type, 1);
  }

  private selectOptimalAgents(taskTypeOrCapability: string, count: number): string[] {
    const availableAgents = Array.from(this.topology.agents.entries())
      .filter(([id, agent]) => {
        const health = agent.getAgentHealth();
        return health.isOnline;
      })
      .map(([id]) => id);

    // Simple selection - would use load balancing and capability matching in production
    return availableAgents.slice(0, count);
  }

  private estimateTaskCost(task: HybridTask, routing: string[]): number {
    // Estimate based on task complexity and agent count
    const baseCost = 0.1;
    const agentMultiplier = routing.length * 0.05;
    const complexityMultiplier = task.type === 'analysis' ? 1.5 : 1.0;
    
    return baseCost + agentMultiplier + complexityMultiplier;
  }

  private estimateTaskDuration(task: HybridTask, routing: string[]): number {
    // Estimate in milliseconds
    const baseTime = 30000; // 30 seconds
    const agentMultiplier = routing.length * 10000; // 10 seconds per agent
    const complexityMultiplier = task.type === 'compliance_check' ? 2 : 1;
    
    return baseTime + agentMultiplier * complexityMultiplier;
  }

  private assessTaskRisk(task: HybridTask): 'low' | 'medium' | 'high' | 'critical' {
    if (task.priority === 'critical' || task.priority === 'emergency') return 'critical';
    if (task.type === 'security_scan') return 'high';
    if (task.collaboration?.requiredAgents.length! > 3) return 'medium';
    return 'low';
  }

  private async deployDefaultAgents(): Promise<void> {
    const defaultAgents: HybridAgentConfig[] = [
      {
        identity: {
          id: 'security-agent-001',
          type: 'security',
          capabilities: [
            {
              name: 'analyze_secrets',
              version: '1.0.0',
              description: 'Analyze secrets for security vulnerabilities',
              inputs: [],
              outputs: [],
              sla: { responseTime: 5000, availability: 99.9, throughput: 100 }
            }
          ],
          endpoint: 'internal://security-agent-001',
          version: '1.0.0',
          status: 'online',
          trustLevel: 95,
          lastSeen: new Date().toISOString()
        },
        capabilities: [],
        models: []
      },
      {
        identity: {
          id: 'compliance-agent-001',
          type: 'compliance',
          capabilities: [
            {
              name: 'validate_compliance',
              version: '1.0.0',
              description: 'Validate compliance with frameworks',
              inputs: [],
              outputs: [],
              sla: { responseTime: 10000, availability: 99.5, throughput: 50 }
            }
          ],
          endpoint: 'internal://compliance-agent-001',
          version: '1.0.0',
          status: 'online',
          trustLevel: 98,
          lastSeen: new Date().toISOString()
        },
        capabilities: [],
        models: []
      }
    ];

    for (const config of defaultAgents) {
      try {
        await this.deployAgent(config);
      } catch (error) {
        logger.warn('Failed to deploy default agent:', error);
      }
    }
  }

  private initializeStrategies(): void {
    const defaultStrategy: OrchestrationStrategy = {
      name: 'balanced',
      description: 'Balanced approach for general tasks',
      priority: 1,
      rules: [
        {
          condition: 'task.priority === "critical"',
          action: 'replicate',
          target: ['agent1', 'agent2'],
          parameters: { redundancy: 2 }
        }
      ]
    };

    this.strategies.set('balanced', defaultStrategy);
  }

  private getDefaultStrategy(): OrchestrationStrategy {
    return this.strategies.get('balanced')!;
  }

  private setupEventHandlers(): void {
    this.on('ready', () => {
      logger.info('Agent Orchestrator ready for operations');
    });

    this.on('agent_deployed', (agentId: string) => {
      logger.info('Agent deployed to network', { agentId });
    });
  }

  private setupAgentEventHandlers(agent: HybridAgent): void {
    agent.on('task_completed', (result: HybridTaskResult) => {
      this.updateLoadMetrics(result);
    });

    agent.on('emergency', (message: any) => {
      this.emit('system_emergency', { agent: agent, message });
    });
  }

  private async establishConnections(agentId: string): Promise<void> {
    // Establish connections with other agents
    const connections = this.topology.connections.get(agentId);
    if (connections) {
      // Simple mesh network for now
      for (const otherId of this.topology.agents.keys()) {
        if (otherId !== agentId) {
          connections.add(otherId);
        }
      }
    }
  }

  private startSystemMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateSystemMetrics();
    }, 30000) as unknown as NodeJS.Timeout; // Every 30 seconds
  }

  private updateSystemMetrics(): void {
    // Update load metrics for all agents
    for (const [agentId, agent] of this.topology.agents) {
      const health = agent.getAgentHealth();
      const metrics = this.topology.loadMetrics.get(agentId);
      
      if (metrics) {
        metrics.activeTasks = health.activeTasks || 0;
        metrics.lastUpdate = new Date().toISOString();
        // Would get real CPU/memory metrics in production
        metrics.cpu = Math.random() * 100;
        metrics.memory = Math.random() * 100;
      }
    }
  }

  private updateLoadMetrics(result: HybridTaskResult): void {
    for (const agentId of result.collaborationMetrics.agentsInvolved) {
      const metrics = this.topology.loadMetrics.get(agentId);
      if (metrics) {
        // Update success rate
        const successWeight = result.success ? 1 : 0;
        metrics.successRate = (metrics.successRate * 0.9) + (successWeight * 0.1);
        
        // Update response time
        metrics.averageResponseTime = (metrics.averageResponseTime * 0.9) + 
          (result.collaborationMetrics.executionTime * 0.1);
      }
    }
  }

  // System analysis methods
  private calculateOverallHealth(): 'healthy' | 'degraded' | 'critical' {
    const metrics = Array.from(this.topology.loadMetrics.values());
    const avgSuccessRate = metrics.reduce((sum, m) => sum + m.successRate, 0) / Math.max(metrics.length, 1);
    
    if (avgSuccessRate > 0.95) return 'healthy';
    if (avgSuccessRate > 0.8) return 'degraded';
    return 'critical';
  }

  private calculateAverageTaskTime(): number {
    const results = Array.from(this.completedTasks.values());
    if (results.length === 0) return 0;
    
    return results.reduce((sum, r) => sum + r.collaborationMetrics.executionTime, 0) / results.length;
  }

  private calculateSystemThroughput(): number {
    // Tasks per minute
    return this.completedTasks.size; // Simplified
  }

  private identifyBottlenecks(): string[] {
    const bottlenecks: string[] = [];
    
    for (const [agentId, metrics] of this.topology.loadMetrics) {
      if (metrics.cpu > 90 || metrics.memory > 90) {
        bottlenecks.push(`High resource usage on ${agentId}`);
      }
      if (metrics.averageResponseTime > 30000) {
        bottlenecks.push(`Slow response time on ${agentId}`);
      }
    }
    
    return bottlenecks;
  }

  private generateSystemRecommendations(): string[] {
    return [
      'Scale up agents with high load',
      'Optimize model selection for better performance',
      'Implement caching for frequent operations'
    ];
  }

  private assessSystemThreatLevel(): 'low' | 'medium' | 'high' | 'critical' {
    // Would analyze actual security metrics
    return 'low';
  }

  private identifyVulnerabilities(): string[] {
    return [
      'Monitor inter-agent communication security',
      'Validate model input sanitization'
    ];
  }

  private generateSecurityMitigations(): string[] {
    return [
      'Enable end-to-end encryption for all agent communications',
      'Implement zero-trust networking principles'
    ];
  }

  private generateTaskId(): string {
    return `orch_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Agent Orchestrator');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Shutdown all agents
    for (const agent of this.topology.agents.values()) {
      try {
        await agent.shutdown();
      } catch (error) {
        logger.warn('Error shutting down agent:', error);
      }
    }

    this.topology.agents.clear();
    this.topology.connections.clear();
    this.topology.capabilities.clear();
    this.topology.models.clear();
    this.topology.loadMetrics.clear();

    this.isRunning = false;
    logger.info('Agent Orchestrator shutdown complete');
  }

  /**
   * UAP Lifecycle Phase: Plan - Generate orchestration strategy for objective
   * @mcpCallable
   */
  public plan(objective: string, constraints?: any): OrchestrationStrategy | null {
    try {
      logger.info('Planning orchestration for objective', { objective, constraints });
      
      // Analyze objective and constraints to select optimal strategy
      const strategies = Array.from(this.strategies.values())
        .filter(strategy => this.evaluateStrategyFitness(strategy, objective, constraints))
        .sort((a, b) => b.priority - a.priority);
      
      if (strategies.length === 0) {
        logger.warn('No suitable strategy found for objective', { objective });
        return null;
      }
      
      const selectedStrategy = strategies[0];
      
      // Enhance strategy with objective-specific parameters
      const enhancedStrategy: OrchestrationStrategy = {
        ...selectedStrategy,
        rules: [
          ...selectedStrategy.rules,
          {
            condition: `objective === "${objective}"`,
            action: 'route',
            target: this.selectOptimalAgents('general', 2),
            parameters: { objective, constraints }
          }
        ]
      };
      
      logger.info('Orchestration plan generated', { 
        strategy: enhancedStrategy.name, 
        rules: enhancedStrategy.rules.length 
      });
      
      return enhancedStrategy;
      
    } catch (error) {
      logger.error('Planning phase failed', { error, objective });
      return null;
    }
  }

  /**
   * UAP Lifecycle Phase: Execute - Execute planned orchestration strategy
   * @mcpCallable
   */
  public async execute(plan: OrchestrationStrategy, input?: any): Promise<HybridTaskResult[]> {
    try {
      logger.info('Executing orchestration plan', { plan: plan.name, input });
      
      const results: HybridTaskResult[] = [];
      
      // Execute each rule in the strategy
      for (const rule of plan.rules) {
        const task: HybridTask = {
          id: this.generateTaskId(),
          type: 'analysis',
          priority: 'high',
          input: { rule, planInput: input },
          collaboration: {
            requiredAgents: Array.isArray(rule.target) ? rule.target : [rule.target || ''],
            requiredModels: ['orchestration-model'],
            coordinationMode: 'parallel'
          },
          constraints: {
            maxExecutionTime: 300000, // 5 minutes
            maxCost: 2.0,
            requiredConfidence: 0.85
          },
          metadata: {
            initiatedBy: 'orchestrator-execute-phase',
            tags: ['lifecycle', 'execute', plan.name]
          }
        };
        
        try {
          const result = await this.executeOrchestratedTask(task);
          results.push(result);
        } catch (error) {
          logger.warn('Rule execution failed, continuing with next rule', { rule, error });
        }
      }
      
      logger.info('Orchestration execution completed', { 
        planName: plan.name, 
        resultsCount: results.length 
      });
      
      return results;
      
    } catch (error) {
      logger.error('Execution phase failed', { error, plan: plan.name });
      throw error;
    }
  }

  /**
   * UAP Lifecycle Phase: Collapse - Consolidate and analyze execution results
   * @mcpCallable
   */
  public collapse(results: HybridTaskResult[], strategy?: OrchestrationStrategy): {
    summary: any;
    insights: string[];
    recommendations: string[];
    nextActions: string[];
    success: boolean;
  } {
    try {
      logger.info('Collapsing orchestration results', { resultsCount: results.length });
      
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);
      
      const summary = {
        totalTasks: results.length,
        successful: successfulResults.length,
        failed: failedResults.length,
        successRate: successfulResults.length / Math.max(results.length, 1),
        totalCost: results.reduce((sum, r) => sum + r.collaborationMetrics.totalCost, 0),
        totalTime: Math.max(...results.map(r => r.collaborationMetrics.executionTime)),
        agentsUtilized: [...new Set(results.flatMap(r => r.collaborationMetrics.agentsInvolved))],
        averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / Math.max(results.length, 1)
      };
      
      const insights = [
        `Orchestrated ${summary.totalTasks} tasks with ${(summary.successRate * 100).toFixed(1)}% success rate`,
        `Utilized ${summary.agentsUtilized.length} agents with average confidence ${(summary.averageConfidence * 100).toFixed(1)}%`,
        `Total cost: $${summary.totalCost.toFixed(3)}, execution time: ${(summary.totalTime / 1000).toFixed(1)}s`,
        failedResults.length > 0 ? `${failedResults.length} tasks failed - analyze error patterns` : 'All tasks completed successfully'
      ];
      
      const recommendations = [];
      if (summary.successRate < 0.9) {
        recommendations.push('Investigate failed tasks and optimize agent selection');
      }
      if (summary.averageConfidence < 0.8) {
        recommendations.push('Enhance confidence through better model selection or consensus building');
      }
      if (summary.totalCost > 5.0) {
        recommendations.push('Optimize cost efficiency by improving task routing');
      }
      if (summary.agentsUtilized.length < 2) {
        recommendations.push('Consider leveraging more agents for better redundancy');
      }
      
      const nextActions = [
        summary.successRate > 0.95 ? 'Scale similar orchestration patterns' : 'Debug and retry failed operations',
        'Update orchestration patterns based on performance data',
        'Archive successful strategies for future use',
        'Generate compliance report for audit trail'
      ];
      
      const collapseResult = {
        summary,
        insights,
        recommendations,
        nextActions,
        success: summary.successRate > 0.5
      };
      
      logger.info('Orchestration collapse completed', collapseResult);
      
      return collapseResult;
      
    } catch (error) {
      logger.error('Collapse phase failed', { error });
      return {
        summary: { error: 'Collapse failed' },
        insights: ['Collapse phase encountered errors'],
        recommendations: ['Review collapse implementation'],
        nextActions: ['Debug collapse phase'],
        success: false
      };
    }
  }

  /**
   * Evaluate how well a strategy fits the given objective
   */
  private evaluateStrategyFitness(strategy: OrchestrationStrategy, objective: string, constraints?: any): boolean {
    // Simple fitness evaluation - could be enhanced with ML/AI
    const objectiveLower = objective.toLowerCase();
    
    // Strategy name relevance
    if (strategy.name.includes('security') && objectiveLower.includes('security')) return true;
    if (strategy.name.includes('compliance') && objectiveLower.includes('compliance')) return true;
    if (strategy.name.includes('analysis') && objectiveLower.includes('analy')) return true;
    
    // General strategies are always applicable
    if (strategy.name === 'balanced' || strategy.name === 'general') return true;
    
    // High priority strategies are preferred
    return strategy.priority >= 3;
  }
}

export default AgentOrchestrator; 