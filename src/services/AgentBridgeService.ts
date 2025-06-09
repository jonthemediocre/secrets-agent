// AgentBridgeService.ts - UAP Level 2 Compliant Agent Communication Bridge
// Autonomous multi-agent communication orchestration with self-evolving capabilities
// Enhanced with Universal Reinforcement Learning (RFL) - Level 2 Compliance

import { createLogger } from '../utils/logger';
import { join, normalize } from 'path';
import { promises as fs } from 'fs';
import { MCPBridgeService } from './MCPBridgeService';
import { MCPTool, MCPJobStatus } from './MCPBridgeCore';
import { InitializationError, ErrorCategory, ErrorSeverity } from '../utils/error-types';
import { SecurityValidator, SecureCommandExecutor, SecurityError } from '../utils/security';
import {
  MCPEndpointConfig,
  MCPToolDefinition,
  MCPOperationStatus,
  MCPOperationState,
  MCPServiceStatus,
  MCPExecutionResult,
  MCPTaskPayload,
  MCPTaskResult,
  MCPBridgeServiceConfig
} from '../types/interfaces';

// 🧠 Import Universal RFL System
import { RFLCore, RFLEvent, RFLTrace, RFL_EVENT_TYPES } from '../rfl/RFLCore';

const logger = createLogger('AgentBridgeService');

// UAP Hook System Interface
interface BridgeHookEvent {
  type: 'bridge_initialized' | 'agent_connected' | 'agent_disconnected' | 'tool_executed' | 'communication_optimized' | 'security_validated' | 'performance_enhanced' | 'bridge_error';
  timestamp: number;
  data: any;
  success: boolean;
  context?: any;
}

interface BridgeHookRegistry {
  'bridge_initialized': (event: { bridgeId: string, agents: string[], capabilities: string[] }) => void | Promise<void>;
  'agent_connected': (event: { agentId: string, bridgeId: string, capabilities: string[] }) => void | Promise<void>;
  'agent_disconnected': (event: { agentId: string, bridgeId: string, reason: string }) => void | Promise<void>;
  'tool_executed': (event: { toolName: string, bridgeId: string, executionTime: number, success: boolean }) => void | Promise<void>;
  'communication_optimized': (event: { optimization: string, performance: any, bridges: string[] }) => void | Promise<void>;
  'security_validated': (event: { validationType: string, result: boolean, context: any }) => void | Promise<void>;
  'performance_enhanced': (event: { enhancement: string, metrics: any, agents: string[] }) => void | Promise<void>;
  'bridge_error': (event: { error: Error, operation: string, context: any }) => void | Promise<void>;
}

// UAP Agent Manifest Interface
interface BridgeManifest {
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
    events: (keyof BridgeHookRegistry)[];
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
  reinforcementLearning: {
    enabled: boolean;
    rewardSystem: string;
    policyUpdateStrategy: string;
    learningMetrics: string[];
  };
}

// UAP Mutation Interface
interface BridgeMutationResult {
  success: boolean;
  mutationType: 'enhance_communication' | 'optimize_routing' | 'strengthen_security' | 'improve_performance';
  changes: string[];
  rollbackInfo: any;
  version: string;
  timestamp: number;
}

export interface AgentConfig {
  allowedDirectories: string[];
  maxConcurrentJobs: number;
  jobTimeout: number;
  enableSecurityScanning: boolean;
  rateLimitConfig: {
    windowMs: number;
    maxRequests: number;
  };
  // Enhanced with RFL configuration
  reinforcementLearning?: {
    enabled: boolean;
    learningRate: number;
    explorationRate: number;
    rewardDecay: number;
    policyUpdateThreshold: number;
    symbolicNarrativeId?: string;
  };
}

const DEFAULT_CONFIG: AgentConfig = {
  allowedDirectories: [process.cwd()],
  maxConcurrentJobs: 5,
  jobTimeout: 300000, // 5 minutes
  enableSecurityScanning: true,
  rateLimitConfig: {
    windowMs: 60000, // 1 minute
    maxRequests: 10
  },
  reinforcementLearning: {
    enabled: true,
    learningRate: 0.1,
    explorationRate: 0.2,
    rewardDecay: 0.95,
    policyUpdateThreshold: 10,
    symbolicNarrativeId: 'bridge-communication-narrative'
  }
};

/**
 * UAP Level 2 Compliant Agent Communication Bridge with Universal RFL
 * 
 * Autonomous bridge service for secure multi-agent communication with capabilities including:
 * - Real-time agent connection management
 * - Secure MCP tool execution orchestration
 * - Adaptive communication routing optimization
 * - Self-improving security validation
 * - Performance monitoring and enhancement
 * - Autonomous bridge configuration mutation
 * - **Universal Reinforcement Learning (RFL) - Level 2 Compliance**
 * - Hierarchical learning with Trinity Node integration
 * - Symbolic coherence maintenance
 * 
 * @mcpAgent AgentBridgeService
 * @security HIGH - Manages inter-agent communication and tool execution
 * @autonomy FULL - Can modify routing, security rules, and communication patterns
 * @reinforcementLearning UNIVERSAL - Implements Level 2 RFL compliance
 */
export class AgentBridgeService extends RFLCore {
  private mcpBridgeService?: MCPBridgeService;
  private initialized = false;
  private activeJobs = new Map<string, MCPOperationStatus>();
  private secureExecutor: SecureCommandExecutor;
  private agentConfig: AgentConfig;
  
  // UAP Hook System
  private hooks: Map<keyof BridgeHookRegistry, Function[]> = new Map();
  
  // UAP Mutation Tracking
  private mutations: BridgeMutationResult[] = [];
  
  // Enhanced communication patterns (mutable for autonomous improvement)
  private communicationRoutes: Map<string, any> = new Map();
  private performanceMetrics: Map<string, any> = new Map();
  private securityPolicies: Map<string, any> = new Map();

  constructor(config: Partial<AgentConfig> = {}) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize RFL Core with bridge-specific configuration
    super('agent-bridge-service', {
      enabled: mergedConfig.reinforcementLearning?.enabled || true,
      learningRate: mergedConfig.reinforcementLearning?.learningRate || 0.1,
      explorationRate: mergedConfig.reinforcementLearning?.explorationRate || 0.2,
      rewardDecay: mergedConfig.reinforcementLearning?.rewardDecay || 0.95,
      policyUpdateThreshold: mergedConfig.reinforcementLearning?.policyUpdateThreshold || 10,
      maxActionHistory: 50,
      maxTraceMemory: 1000,
      symbolicNarrativeId: mergedConfig.reinforcementLearning?.symbolicNarrativeId || 'bridge-communication-narrative'
    });
    
    this.agentConfig = mergedConfig;
    this.secureExecutor = new SecureCommandExecutor(
      this.agentConfig.allowedDirectories,
      this.agentConfig.rateLimitConfig
    );
    this.initializeHooks();
    this.initializeCommunicationPatterns();
  }

  /**
   * Initialize UAP hook system with default handlers
   * @mcpCallable
   */
  private initializeHooks(): void {
    const hookTypes: (keyof BridgeHookRegistry)[] = [
      'bridge_initialized', 'agent_connected', 'agent_disconnected', 'tool_executed',
      'communication_optimized', 'security_validated', 'performance_enhanced', 'bridge_error'
    ];
    
    hookTypes.forEach(hookType => {
      this.hooks.set(hookType, []);
    });
  }

  /**
   * Initialize enhanced communication patterns for autonomous improvement
   * @mcpCallable
   */
  private initializeCommunicationPatterns(): void {
    // Base routing patterns - can be enhanced through mutations
    this.communicationRoutes.set('direct', {
      type: 'direct',
      latency: 'low',
      reliability: 'high',
      security: 'medium'
    });
    
    this.communicationRoutes.set('queued', {
      type: 'queued',
      latency: 'medium',
      reliability: 'very-high',
      security: 'high'
    });
    
    this.communicationRoutes.set('broadcast', {
      type: 'broadcast',
      latency: 'high',
      reliability: 'medium',
      security: 'low'
    });
    
    // Performance tracking patterns
    this.performanceMetrics.set('execution_times', []);
    this.performanceMetrics.set('success_rates', []);
    this.performanceMetrics.set('error_patterns', []);
    
    // Security policy patterns
    this.securityPolicies.set('parameter_validation', {
      enabled: true,
      strictness: 'high',
      customRules: []
    });
  }

  /**
   * Register hook for bridge events - allows other agents to monitor operations
   * @mcpCallable
   */
  public registerHook<T extends keyof BridgeHookRegistry>(
    event: T, 
    handler: BridgeHookRegistry[T]
  ): void {
    const handlers = this.hooks.get(event) || [];
    handlers.push(handler);
    this.hooks.set(event, handlers);
    
    logger.info(`Hook registered for ${event}`, { handlerCount: handlers.length });
  }

  /**
   * Emit hook event to all registered handlers with RFL integration
   * @mcpCallable
   */
  private async emitHook<T extends keyof BridgeHookRegistry>(
    event: T, 
    data: Parameters<BridgeHookRegistry[T]>[0]
  ): Promise<void> {
    const handlers = this.hooks.get(event) || [];
    
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        logger.error(`Hook handler failed for ${event}`, { error });
      }
    }

    // 🔁 **TRIGGER UNIVERSAL RFL FEEDBACK LOOP**
    const rflEvent: RFLEvent = {
      type: event,
      timestamp: Date.now(),
      data,
      success: !(data as any).error,
      context: data,
      symbolicImpact: this.calculateSymbolicImpact(event, data)
    };
    
    await this.handleRFLFeedback(rflEvent);
  }

  /**
   * Calculate symbolic impact of bridge events
   * @mcpCallable
   */
  private calculateSymbolicImpact(event: string, data: any): number {
    // Bridge-specific symbolic impact calculation
    switch (event) {
      case 'performance_enhanced':
        return 0.8;
      case 'security_validated':
        return data.result ? 0.9 : -0.7;
      case 'communication_optimized':
        return 0.7;
      case 'tool_executed':
        return data.success ? 0.6 : -0.4;
      case 'bridge_error':
        return -0.8;
      case 'agent_connected':
        return 0.5;
      case 'agent_disconnected':
        return -0.3;
      default:
        return 0.2;
    }
  }

  // 🔄 **RFL Core Implementation (Universal Level 2 Compliance)**

  /**
   * Calculate reward for bridge-specific events
   * @mcpCallable
   */
  protected async calculateReward(event: RFLEvent): Promise<number> {
    let reward = 0;

    switch (event.type) {
      case 'performance_enhanced':
        reward = event.success ? 2.0 : -0.5;
        break;
        
      case 'tool_executed':
        const executionTime = event.data?.executionTime || 0;
        if (event.success) {
          reward = executionTime < 1000 ? 1.5 : 1.0;
        } else {
          reward = -1.0;
        }
        break;
        
      case 'security_validated':
        reward = event.data?.result ? 1.0 : -2.0;
        break;
        
      case 'communication_optimized':
        reward = 1.2;
        break;
        
      case 'bridge_error':
        reward = -1.5;
        break;
        
      case 'agent_connected':
        reward = 0.5;
        break;
        
      case 'agent_disconnected':
        reward = -0.3;
        break;
        
      default:
        reward = event.success ? 0.5 : -0.2;
    }

    return reward;
  }

  /**
   * Calculate symbolic alignment for bridge operations
   * @mcpCallable
   */
  protected async calculateSymbolicAlignment(event: RFLEvent): Promise<number> {
    // Bridge-specific symbolic alignment calculation
    const baseAlignment = event.success ? 0.8 : -0.3;
    const symbolicBonus = (event.symbolicImpact || 0) * 0.2;
    
    return Math.max(-1.0, Math.min(1.0, baseAlignment + symbolicBonus));
  }

  /**
   * Trigger adaptive mutations based on RFL performance
   * @mcpCallable
   */
  protected async triggerAdaptiveMutations(avgReward: number, symbolicAlignment: number): Promise<void> {
    // RFL-triggered mutations with symbolic coherence consideration
    if (avgReward < -5.0) {
      logger.warn('🔄 RFL Triggered: Low reward score, applying optimization mutation');
      await this.performMutation('optimize_routing', { 
        trigger: 'rfl_low_reward', 
        score: avgReward,
        symbolicAlignment 
      });
    }
    
    if (avgReward < -10.0 || symbolicAlignment < -0.5) {
      logger.warn('🛡️ RFL Triggered: Critical situation, strengthening security');
      await this.performMutation('strengthen_security', { 
        trigger: 'rfl_critical_situation', 
        score: avgReward,
        symbolicAlignment 
      });
    }
    
    if (avgReward > 1.5 && symbolicAlignment > 0.7) {
      logger.info('⚡ RFL Triggered: High performance, enhancing communication');
      await this.performMutation('enhance_communication', { 
        trigger: 'rfl_high_performance', 
        avgReward,
        symbolicAlignment 
      });
    }
  }

  /**
   * Emit RFL data to Knowledge Event Bus (KEB)
   * @mcpCallable
   */
  protected async emitToKEB(trace: RFLTrace): Promise<void> {
    // Emit bridge RFL traces to KEB for Trinity Node consumption
    logger.debug(`📤 Emitting bridge RFL trace to KEB: ${trace.event}`, {
      hierarchyLevel: trace.hierarchyLevel,
      score: trace.score,
      symbolicDelta: trace.symbolicDelta
    });
    
    // Implementation would integrate with actual KEB system
    // For now, we'll log the structured data for monitoring
  }

  /**
   * Generate UAP Agent Manifest for autonomous discovery
   * @mcpCallable
   */
  public generateManifest(): BridgeManifest {
    return {
      agentId: 'agent-bridge-service',
      version: '2.0.0',
      roles: ['communication-bridge', 'tool-orchestrator', 'security-validator', 'performance-optimizer', 'rfl-agent'],
      symbolicIntent: 'Autonomous inter-agent communication bridge with adaptive routing, security, and universal reinforcement learning',
      knownTools: [
        'executeMCPTool', 'scanProject', 'getJobStatus', 'getActiveJobs', 'getServiceStatus',
        'performMutation', 'plan', 'execute', 'collapse', 'optimizeCommunication', 'enhanceSecurity',
        'getRFLStatus', 'handleRFLFeedback', 'receiveParentGuidance', 'resetRFLState'
      ],
      lifecycleCompliance: {
        supportsPlan: true,
        supportsExecute: true,
        supportsCollapse: true
      },
      hooks: {
        events: ['bridge_initialized', 'agent_connected', 'agent_disconnected', 'tool_executed', 'communication_optimized', 'security_validated', 'performance_enhanced', 'bridge_error'],
        mutations: ['enhance_communication', 'optimize_routing', 'strengthen_security', 'improve_performance']
      },
      capabilities: [
        {
          name: 'Multi-Agent Communication',
          description: 'Secure real-time communication orchestration between agents with RFL optimization',
          inputTypes: ['agent-requests', 'tool-parameters'],
          outputTypes: ['execution-results', 'communication-logs', 'rfl-traces']
        },
        {
          name: 'MCP Tool Execution',
          description: 'Secure execution of MCP tools with validation, monitoring, and RFL learning',
          inputTypes: ['tool-definitions', 'execution-parameters'],
          outputTypes: ['tool-results', 'execution-metrics', 'performance-traces']
        },
        {
          name: 'Universal Reinforcement Learning',
          description: 'Level 2 compliant RFL with hierarchical learning and symbolic coherence',
          inputTypes: ['rfl-events', 'performance-feedback', 'parent-guidance'],
          outputTypes: ['rfl-status', 'symbolic-traces', 'policy-updates', 'mutation-triggers']
        },
        {
          name: 'Adaptive Security Validation',
          description: 'Self-improving security validation with RFL-driven policy adaptation',
          inputTypes: ['security-policies', 'communication-requests', 'threat-patterns'],
          outputTypes: ['validation-results', 'security-recommendations', 'adaptive-policies']
        }
      ],
      security: {
        classification: 'HIGH',
        permissions: [
          'execute:mcp_tools',
          'manage:agent_connections',
          'modify:communication_routes',
          'validate:security_policies',
          'monitor:performance_metrics',
          'learn:rfl_patterns',
          'adapt:exploration_strategies',
          'emit:symbolic_traces'
        ],
        dataAccess: [
          'agent_communication_logs',
          'tool_execution_results',
          'performance_metrics',
          'security_validation_data',
          'rfl_trace_memory',
          'symbolic_coherence_data'
        ]
      },
      resourceRequirements: {
        memory: '512MB',
        cpu: '2 cores',
        storage: '100MB',
        network: true
      },
      reinforcementLearning: {
        enabled: this.agentConfig.reinforcementLearning?.enabled || false,
        rewardSystem: 'Event-driven reward scoring with symbolic alignment and adaptive exploration',
        policyUpdateStrategy: 'Threshold-based mutation triggers with parent guidance integration',
        learningMetrics: ['agentRewardScore', 'explorationRate', 'symbolicCoherence', 'parentAlignment', 'traceMemorySize']
      }
    };
  }

  /**
   * UAP Mutation System - Autonomous service improvement with RFL integration
   * @mcpCallable
   */
  public async performMutation(
    mutationType: BridgeMutationResult['mutationType'],
    parameters: any = {}
  ): Promise<BridgeMutationResult> {
    const startTime = Date.now();
    const rollbackInfo: any = {
      communicationRoutes: new Map(this.communicationRoutes),
      securityPolicies: new Map(this.securityPolicies),
      performanceMetrics: new Map(this.performanceMetrics)
    };

    try {
      let changes: string[] = [];
      
      switch (mutationType) {
        case 'enhance_communication':
          changes = await this.enhanceCommunicationMutation(parameters);
          break;
        case 'optimize_routing':
          changes = await this.optimizeRoutingMutation(parameters);
          break;
        case 'strengthen_security':
          changes = await this.strengthenSecurityMutation(parameters);
          break;
        case 'improve_performance':
          changes = await this.improvePerformanceMutation(parameters);
          break;
        default:
          throw new Error(`Unknown mutation type: ${mutationType}`);
      }

      const mutationResult: BridgeMutationResult = {
        success: true,
        mutationType,
        changes,
        rollbackInfo,
        version: '2.0.0',
        timestamp: Date.now()
      };

      this.mutations.push(mutationResult);
      
      // Emit RFL event for successful mutation
      await this.handleRFLFeedback({
        type: RFL_EVENT_TYPES.MUTATION_APPLIED,
        timestamp: Date.now(),
        data: { mutationType, changes },
        success: true,
        symbolicImpact: 0.6
      });
      
      await this.emitHook('communication_optimized', {
        optimization: mutationType,
        performance: { executionTime: Date.now() - startTime },
        bridges: ['agent-bridge-service']
      });

      logger.info(`Mutation ${mutationType} completed successfully`, { changes });
      return mutationResult;

    } catch (error) {
      // Rollback on failure
      this.communicationRoutes = rollbackInfo.communicationRoutes;
      this.securityPolicies = rollbackInfo.securityPolicies;
      this.performanceMetrics = rollbackInfo.performanceMetrics;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const mutationResult: BridgeMutationResult = {
        success: false,
        mutationType,
        changes: [`Rollback: ${errorMessage}`],
        rollbackInfo,
        version: '2.0.0',
        timestamp: Date.now()
      };

      this.mutations.push(mutationResult);
      
      // Emit RFL event for failed mutation
      await this.handleRFLFeedback({
        type: RFL_EVENT_TYPES.ERROR_OCCURRED,
        timestamp: Date.now(),
        data: { mutationType, error: errorMessage },
        success: false,
        symbolicImpact: -0.5
      });
      
      await this.emitHook('bridge_error', {
        error: error instanceof Error ? error : new Error(errorMessage),
        operation: 'performMutation',
        context: { mutationType, parameters }
      });

      logger.error(`Mutation ${mutationType} failed, rolled back`, { error: errorMessage });
      return mutationResult;
    }
  }

  /**
   * 🚀 Communication enhancement mutation
   * @mcpCallable
   */
  private async enhanceCommunicationMutation(parameters: any): Promise<string[]> {
    const changes: string[] = [];
    
    // Enhance communication routes based on RL feedback
    if (parameters.trigger === 'rfl_high_performance') {
      const directRoute = this.communicationRoutes.get('direct') || {};
      directRoute.priority = 'high';
      directRoute.optimized = true;
      this.communicationRoutes.set('direct', directRoute);
      changes.push('Enhanced direct communication route priority based on RFL feedback');
    }
    
    // Add adaptive routing
    this.communicationRoutes.set('adaptive', {
      type: 'adaptive',
      latency: 'dynamic',
      reliability: 'high',
      security: 'high',
      rlOptimized: true
    });
    changes.push('Added RFL-optimized adaptive routing strategy');
    
    return changes;
  }

  /**
   * 🔄 Routing optimization mutation
   * @mcpCallable
   */
  private async optimizeRoutingMutation(parameters: any): Promise<string[]> {
    const changes: string[] = [];
    
    if (parameters.trigger === 'rfl_low_reward') {
      // Switch to more reliable routing when performance is poor
      const queuedRoute = this.communicationRoutes.get('queued') || {};
      queuedRoute.priority = 'high';
      queuedRoute.retryAttempts = 3;
      this.communicationRoutes.set('queued', queuedRoute);
      changes.push('Switched to high-reliability queued routing due to RFL feedback');
    }
    
    // Add performance monitoring to routes
    this.performanceMetrics.set('routing_optimization', {
      lastOptimized: Date.now(),
      trigger: parameters.trigger,
      score: parameters.score
    });
    changes.push('Added RFL-driven performance monitoring to routing strategies');
    
    return changes;
  }

  /**
   * 🛡️ Security strengthening mutation
   * @mcpCallable
   */
  private async strengthenSecurityMutation(parameters: any): Promise<string[]> {
    const changes: string[] = [];
    
    if (parameters.trigger === 'rfl_critical_situation') {
      // Strengthen security when critical situation is detected
      const securityPolicy = this.securityPolicies.get('parameter_validation') || {};
      securityPolicy.strictness = 'maximum';
      securityPolicy.additionalChecks = ['rfl_context_validation', 'threat_pattern_analysis'];
      this.securityPolicies.set('parameter_validation', securityPolicy);
      changes.push('Enhanced security validation to maximum strictness based on RFL feedback');
    }
    
    // Add RFL-based threat detection
    this.securityPolicies.set('rfl_threat_detection', {
      enabled: true,
      rewardThreshold: -5,
      autoResponse: true,
      learningEnabled: true
    });
    changes.push('Added RFL-based threat detection with automatic response');
    
    return changes;
  }

  /**
   * ⚡ Performance improvement mutation
   * @mcpCallable
   */
  private async improvePerformanceMutation(parameters: any): Promise<string[]> {
    const changes: string[] = [];
    
    // Optimize based on RFL performance metrics
    const currentPerformance = this.performanceMetrics.get('execution_times') || [];
    if (currentPerformance.length > 10) {
      const avgTime = currentPerformance.reduce((sum: number, time: number) => sum + time, 0) / currentPerformance.length;
      
      if (avgTime > 2000) {
        // Add caching for slow operations
        this.performanceMetrics.set('caching_enabled', {
          threshold: 2000,
          maxCacheSize: 100,
          ttl: 300000 // 5 minutes
        });
        changes.push(`Enabled caching for operations slower than 2000ms (avg: ${avgTime}ms)`);
      }
    }
    
    // Add RFL-optimized resource allocation
    this.performanceMetrics.set('rfl_resource_allocation', {
      enabled: true,
      adaptiveScaling: true,
      rewardBased: true,
      lastUpdate: Date.now()
    });
    changes.push('Enabled RFL-optimized resource allocation with adaptive scaling');
    
    return changes;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing AgentBridgeService');
      
      // Validate allowed directories
      for (const dir of this.agentConfig.allowedDirectories) {
        try {
          const stats = await fs.stat(dir);
          if (!stats.isDirectory()) {
            throw new Error(`${dir} is not a directory`);
          }
        } catch (error) {
          logger.warn('Allowed directory not accessible', { directory: dir, error });
        }
      }

      this.mcpBridgeService = MCPBridgeService.getInstance({
        environment: process.env.NODE_ENV || 'development',
        autoStart: true
      });
      await this.mcpBridgeService.initialize();
      this.initialized = true;
      
      logger.info('AgentBridgeService initialized successfully', {
        allowedDirectories: this.agentConfig.allowedDirectories,
        maxConcurrentJobs: this.agentConfig.maxConcurrentJobs
      });
    } catch (error) {
      logger.error('Failed to initialize AgentBridgeService', { error });
      throw new InitializationError('AgentBridgeService initialization failed', true, {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down AgentBridgeService');
    
    // Cancel all active jobs
    for (const [jobId, job] of this.activeJobs.entries()) {
      logger.info('Canceling active job', { jobId });
      job.status = MCPOperationState.FAILED;
      job.error = 'Service shutdown';
      job.endTime = new Date();
    }
    
    this.activeJobs.clear();
    this.initialized = false;
    logger.info('AgentBridgeService shutdown complete');
  }

  async executeMCPTool(
    bridgeId: string, 
    toolName: string, 
    parameters: Record<string, any> = {},
    userId?: string
  ): Promise<MCPExecutionResult> {
    const startTime = Date.now();
    const jobId = this.generateJobId();
    
    try {
      if (!this.initialized) {
        throw new Error('AgentBridgeService not initialized');
      }

      // Rate limiting and validation
      if (!this.mcpBridgeService) {
        throw new Error('MCPBridgeService not available');
      }

      // Validate parameters
      const validatedParams = SecurityValidator.validateApiParameters(
        parameters,
        this.getAllowedParameters(toolName)
      );

      // Security audit log
      logger.audit('MCP Tool Execution Started', {
        userId,
        success: false, // Will be updated on completion
        resource: `${bridgeId}/${toolName}`,
        severity: 'medium',
        data: { jobId, bridgeId, toolName }
      });

      // Check concurrent job limit
      if (this.activeJobs.size >= this.agentConfig.maxConcurrentJobs) {
        throw new SecurityError('Maximum concurrent jobs reached', {
          activeJobs: this.activeJobs.size,
          maxJobs: this.agentConfig.maxConcurrentJobs
        });
      }

      // Create job tracking
      const operation: MCPOperationStatus = {
        operationId: jobId,
        status: MCPOperationState.RUNNING,
        startTime: new Date(),
        bridgeId,
        toolName,
        progress: 0
      };
      
      this.activeJobs.set(jobId, operation);

      try {
        // Execute the tool through MCP bridge
        const result = await this.mcpBridgeService.executeTool(bridgeId, toolName, validatedParams);
        
        operation.status = MCPOperationState.COMPLETED;
        operation.endTime = new Date();
        operation.result = result;
        operation.progress = 100;

        const executionTime = Date.now() - startTime;
        
        // Security audit log for success
        logger.audit('MCP Tool Execution Completed', {
          userId,
          success: true,
          resource: `${bridgeId}/${toolName}`,
          severity: 'low',
          duration: executionTime,
          data: { jobId, bridgeId, toolName }
        });

        return {
          success: true,
          executionTime,
          bridgeId,
          toolName,
          timestamp: new Date().toISOString(),
          status: 'success',
          jobId,
          data: result.data
        };

      } catch (executionError) {
        operation.status = MCPOperationState.FAILED;
        operation.endTime = new Date();
        operation.error = executionError instanceof Error ? executionError.message : String(executionError);
        
        throw executionError;
      } finally {
        // Clean up job tracking after a delay
        setTimeout(() => {
          this.activeJobs.delete(jobId);
        }, 60000); // Keep for 1 minute for status queries
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Security audit log for failure
      logger.audit('MCP Tool Execution Failed', {
        userId,
        success: false,
        resource: `${bridgeId}/${toolName}`,
        severity: 'high',
        duration: executionTime,
        data: { 
          jobId, 
          bridgeId, 
          toolName, 
          error: error instanceof Error ? error.message : String(error)
        }
      });

      logger.error('Failed to execute MCP tool', { 
        error, 
        bridgeId, 
        toolName, 
        jobId,
        executionTime 
      });

      return {
        success: false,
        executionTime,
        bridgeId,
        toolName,
        timestamp: new Date().toISOString(),
        status: 'error',
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async scanProject(
    projectPath: string, 
    scanType: 'secrets' | 'vulnerabilities' | 'all' = 'all',
    userId?: string
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Validate and sanitize project path
      const validatedPath = SecurityValidator.validateProjectPath(
        projectPath, 
        this.agentConfig.allowedDirectories
      );

      logger.audit('Project Scan Started', {
        userId,
        success: false,
        resource: validatedPath,
        severity: 'medium',
        data: { scanType }
      });

      // Check if path exists and is accessible
      const stats = await fs.stat(validatedPath);
      if (!stats.isDirectory()) {
        throw new SecurityError('Path is not a directory', { path: validatedPath });
      }

      let results: any = {};

      if (scanType === 'secrets' || scanType === 'all') {
        logger.info('Starting secrets scan', { path: validatedPath });
        results.secrets = await this.scanForSecrets(validatedPath);
      }

      if (scanType === 'vulnerabilities' || scanType === 'all') {
        logger.info('Starting vulnerability scan', { path: validatedPath });
        results.vulnerabilities = await this.scanForVulnerabilities(validatedPath);
      }

      const executionTime = Date.now() - startTime;
      
      logger.audit('Project Scan Completed', {
        userId,
        success: true,
        resource: validatedPath,
        severity: 'low',
        duration: executionTime,
        data: { scanType, resultsCount: Object.keys(results).length }
      });

      return {
        success: true,
        path: validatedPath,
        scanType,
        results,
        executionTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.audit('Project Scan Failed', {
        userId,
        success: false,
        resource: projectPath,
        severity: 'high',
        duration: executionTime,
        data: { 
          scanType, 
          error: error instanceof Error ? error.message : String(error) 
        }
      });

      logger.error('Project scan failed', { error, projectPath, scanType });
      throw error;
    }
  }

  getJobStatus(jobId: string): MCPOperationStatus | undefined {
    return this.activeJobs.get(jobId);
  }

  getActiveJobs(): MCPOperationStatus[] {
    return Array.from(this.activeJobs.values());
  }

  getServiceStatus(): MCPServiceStatus {
    const status = this.mcpBridgeService?.getStatus() || {
      status: 'stopped' as const,
      uptime: 0,
      bridgeCount: 0,
      toolCount: 0,
      toolsCached: 0,
      activeJobs: 0
    };
    
    return {
      status: this.initialized ? 'running' : 'stopped',
      uptime: status.uptime,
      bridgeCount: status.bridgeCount,
      toolCount: status.toolCount,
      toolsCached: status.toolsCached,
      activeJobs: this.activeJobs.size
    };
  }

  private async scanForSecrets(projectPath: string): Promise<any[]> {
    // Implementation for secrets scanning using AI-driven pattern matching
    logger.info('Scanning for secrets', { path: projectPath });
    
    try {
      // Use secure command executor for file operations
      const result = await this.secureExecutor.executeCommand(
        'find',
        [projectPath, '-type', 'f', '-name', '*.js', '-o', '-name', '*.ts', '-o', '-name', '*.json', '-o', '-name', '*.env*', '-o', '-name', '*.yaml', '-o', '-name', '*.yml'],
        { timeout: 30000 }
      );
      
      // Process the files and scan for secrets
      const files = result.stdout.trim().split('\n').filter(f => f.length > 0);
      const secretsFound: any[] = [];
      
      // Production-grade secret detection patterns
      const secretPatterns = [
        { type: 'aws_access_key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'high' },
        { type: 'aws_secret', pattern: /[0-9a-zA-Z/+]{40}/, severity: 'high' },
        { type: 'github_token', pattern: /ghp_[0-9a-zA-Z]{36}/, severity: 'high' },
        { type: 'openai_key', pattern: /sk-[0-9a-zA-Z]{48}/, severity: 'high' },
        { type: 'jwt_token', pattern: /eyJ[0-9a-zA-Z_-]+\.eyJ[0-9a-zA-Z_-]+\.[0-9a-zA-Z_-]+/, severity: 'medium' },
        { type: 'api_key', pattern: /[aA][pP][iI][_-]?[kK][eE][yY]\s*[:=]\s*['"]?[0-9a-zA-Z]{32,}/, severity: 'medium' },
        { type: 'password', pattern: /[pP][aA][sS][sS][wW][oO][rR][dD]\s*[:=]\s*['"][^'"]{8,}/, severity: 'medium' },
        { type: 'database_url', pattern: /(mongodb|mysql|postgres):\/\/[^\s'"]+/, severity: 'high' },
        { type: 'private_key', pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/, severity: 'critical' }
      ];

      // Scan each file for secrets
      for (const filePath of files.slice(0, 100)) { // Limit to prevent timeouts
        try {
          const content = await this.secureExecutor.executeCommand(
            'cat',
            [filePath],
            { timeout: 5000 }
          );

          const fileContent = content.stdout;
          const lines = fileContent.split('\n');

          lines.forEach((line, lineNumber) => {
            secretPatterns.forEach(pattern => {
              const match = line.match(pattern.pattern);
              if (match) {
                // Avoid false positives in test files and documentation
                if (filePath.includes('/test/') || filePath.includes('.test.') || 
                    filePath.includes('/docs/') || filePath.includes('README') ||
                    line.includes('example') || line.includes('placeholder')) {
                  return;
                }

                secretsFound.push({
                  type: pattern.type,
                  severity: pattern.severity,
                  file: filePath,
                  line: lineNumber + 1,
                  match: match[0].substring(0, 20) + '...', // Truncate for security
                  confidence: this.calculateConfidence(pattern.type, line, filePath),
                  recommendation: this.getRecommendation(pattern.type)
                });
              }
            });
          });

        } catch (fileError) {
          logger.warn('Could not scan file for secrets', { file: filePath, error: fileError });
        }
      }
      
      logger.info('Secrets scan completed', { 
        filesScanned: Math.min(files.length, 100), 
        secretsFound: secretsFound.length,
        criticalFindings: secretsFound.filter(s => s.severity === 'critical').length
      });
      
      return secretsFound;
    } catch (error) {
      logger.error('Secrets scan failed', { error, projectPath });
      throw error;
    }
  }

  private calculateConfidence(type: string, line: string, filePath: string): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence for specific patterns
    if (type === 'private_key' && line.includes('BEGIN')) confidence = 0.95;
    if (type === 'aws_access_key' && line.includes('AKIA')) confidence = 0.9;
    if (type === 'github_token' && line.includes('ghp_')) confidence = 0.9;

    // Decrease confidence for potential false positives
    if (filePath.includes('.example') || filePath.includes('template')) confidence *= 0.3;
    if (line.toLowerCase().includes('fake') || line.toLowerCase().includes('dummy')) confidence *= 0.2;

    return Math.min(confidence, 1.0);
  }

  private getRecommendation(type: string): string {
    const recommendations: Record<string, string> = {
      'aws_access_key': 'Move to AWS IAM roles or environment variables with proper rotation',
      'aws_secret': 'Use AWS Secrets Manager or environment variables with encryption',
      'github_token': 'Use GitHub Apps or fine-grained personal access tokens',
      'openai_key': 'Store in secure environment variables or secrets management system',
      'jwt_token': 'Ensure proper expiration and use secure storage for refresh tokens',
      'api_key': 'Move to environment variables or secure secrets management',
      'password': 'Use secure password hashing and environment variables',
      'database_url': 'Use connection pooling with secure credential management',
      'private_key': 'Store in secure key management system with proper access controls'
    };

    return recommendations[type] || 'Review and secure this credential using best practices';
  }

  private async scanForVulnerabilities(projectPath: string): Promise<any[]> {
    // Implementation for vulnerability scanning
    logger.info('Scanning for vulnerabilities', { path: projectPath });
    
    try {
      // Check for package.json and run security audit
      const packageJsonPath = join(projectPath, 'package.json');
      
      try {
        await fs.access(packageJsonPath);
        
        // Use secure command executor for npm audit
        const result = await this.secureExecutor.executeCommand(
          'npm',
          ['audit', '--json'],
          { cwd: projectPath, timeout: 60000 }
        );
        
        const auditData = JSON.parse(result.stdout);
        return auditData.vulnerabilities || [];
      } catch (auditError) {
        logger.warn('npm audit failed', { error: auditError, projectPath });
        return [];
      }
    } catch (error) {
      logger.error('Vulnerability scan failed', { error, projectPath });
      throw error;
    }
  }

  private getAllowedParameters(toolName: string): string[] {
    // Define allowed parameters per tool
    const allowedParams: Record<string, string[]> = {
      'default': ['input', 'options', 'config', 'parameters'],
      'file_scanner': ['path', 'pattern', 'recursive', 'exclude'],
      'secret_detector': ['content', 'pattern', 'confidence'],
      'vulnerability_checker': ['package', 'version', 'severity']
    };
    
    return allowedParams[toolName] || allowedParams['default'];
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 