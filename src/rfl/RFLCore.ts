// RFLCore.ts - Universal Reinforcement Feedback Loop Core Implementation
// Level 2 Compliance: Universal RFL Enforcement across all UAP agents

import { createLogger } from '../utils/logger';

const logger = createLogger('RFLCore');

// 🧠 Core RFL Interfaces (Level 2 Mandatory)

export interface RFLState {
  agentId: string;
  rewardScore: number;
  policyVersion: string;
  learningRate: number;
  explorationRate: number;
  recentActions: RFLAction[];
  performanceHistory: number[];
  lastPolicyUpdate: number;
  parentNodeGuidance?: RFLGuidance;
  symbolicCoherence: number;
}

export interface RFLAction {
  action: string;
  timestamp: number;
  context: any;
  outcome: 'success' | 'failure' | 'partial';
  reward: number;
  symbolicAlignment: number;
}

export interface RFLEvent {
  type: string;
  timestamp: number;
  data: any;
  success: boolean;
  context?: any;
  symbolicImpact?: number;
}

export interface RFLTrace {
  agentId: string;
  event: string;
  score: number;
  context: any;
  timestamp: number;
  policyVersion: string;
  symbolicDelta: number;
  hierarchyLevel: 'agent' | 'node' | 'master' | 'swarm';
}

export interface RFLGuidance {
  fromNodeId: string;
  targetExplorationRate: number;
  rewardAdjustments: Record<string, number>;
  symbolicConstraints: string[];
  mutationThreshold: number;
  convergenceTarget: number;
}

export interface RFLStatus {
  enabled: boolean;
  currentScore: number;
  policyVersion: string;
  explorationRate: number;
  recentPerformance: number;
  actionCount: number;
  traceMemorySize: number;
  symbolicCoherence: number;
  parentAlignment: number;
  adaptations: string[];
}

// 🔄 RFL Core Implementation (Base Class)

export abstract class RFLCore {
  protected rlState: RFLState;
  protected rlTraceMemory: RFLTrace[] = [];
  protected config: RFLConfig;
  protected symbolicNarrativeId: string;

  constructor(agentId: string, config: Partial<RFLConfig> = {}) {
    this.config = { ...DEFAULT_RFL_CONFIG, ...config };
    this.symbolicNarrativeId = config.symbolicNarrativeId || 'default-narrative';
    
    this.rlState = {
      agentId,
      rewardScore: 0,
      policyVersion: '1.0.0',
      learningRate: this.config.learningRate,
      explorationRate: this.config.explorationRate,
      recentActions: [],
      performanceHistory: [],
      lastPolicyUpdate: Date.now(),
      symbolicCoherence: 1.0
    };

    logger.info(`🧠 RFL Core initialized for ${agentId}`, {
      learningRate: this.rlState.learningRate,
      explorationRate: this.rlState.explorationRate,
      symbolicNarrative: this.symbolicNarrativeId
    });
  }

  // 🔁 Core RFL Methods (Level 2 Mandatory Implementation)

  /**
   * Process reward signal from agent action
   * @mcpCallable
   */
  public async handleRFLFeedback(event: RFLEvent): Promise<void> {
    if (!this.config.enabled) return;

    const reward = await this.calculateReward(event);
    const symbolicAlignment = await this.calculateSymbolicAlignment(event);
    
    // Update reward score
    this.rlState.rewardScore += reward;
    
    // Record action in history
    const rlAction: RFLAction = {
      action: event.type,
      timestamp: event.timestamp,
      context: event.data,
      outcome: event.success ? 'success' : 'failure',
      reward,
      symbolicAlignment
    };
    
    this.rlState.recentActions.push(rlAction);
    
    // Maintain sliding window
    if (this.rlState.recentActions.length > this.config.maxActionHistory) {
      this.rlState.recentActions = this.rlState.recentActions.slice(-this.config.maxActionHistory);
    }

    // Store in symbolic trace memory
    await this.emitSymbolicTrace({
      agentId: this.rlState.agentId,
      event: `rfl_reward_${event.type}`,
      score: this.rlState.rewardScore,
      context: {
        reward,
        action: rlAction,
        currentPolicy: this.rlState.policyVersion,
        explorationRate: this.rlState.explorationRate,
        symbolicAlignment
      },
      timestamp: Date.now(),
      policyVersion: this.rlState.policyVersion,
      symbolicDelta: symbolicAlignment,
      hierarchyLevel: 'agent'
    });

    // Update symbolic coherence
    this.updateSymbolicCoherence(symbolicAlignment);

    // Trigger policy evaluation
    await this.evaluatePolicyUpdate();

    logger.debug(`🎯 RFL Feedback processed for ${event.type}`, {
      reward,
      totalScore: this.rlState.rewardScore,
      symbolicAlignment,
      coherence: this.rlState.symbolicCoherence
    });
  }

  /**
   * Calculate reward for specific event type
   * @mcpCallable
   */
  protected abstract calculateReward(event: RFLEvent): Promise<number>;

  /**
   * Calculate symbolic alignment score
   * @mcpCallable
   */
  protected async calculateSymbolicAlignment(event: RFLEvent): Promise<number> {
    // Base implementation - can be overridden by specific agents
    if (event.success) {
      return 0.8; // Positive symbolic alignment for successful actions
    } else {
      return -0.3; // Negative alignment for failures
    }
  }

  /**
   * Update symbolic coherence based on action alignment
   * @mcpCallable
   */
  protected updateSymbolicCoherence(alignment: number): void {
    const coherenceDecay = 0.95; // Gradual decay requiring active maintenance
    const alignmentImpact = 0.1; // How much each action affects coherence
    
    this.rlState.symbolicCoherence = (
      this.rlState.symbolicCoherence * coherenceDecay + 
      alignment * alignmentImpact
    );
    
    // Keep coherence in valid range [0, 1]
    this.rlState.symbolicCoherence = Math.max(0, Math.min(1, this.rlState.symbolicCoherence));
  }

  /**
   * Evaluate and trigger policy updates based on performance
   * @mcpCallable
   */
  protected async evaluatePolicyUpdate(): Promise<void> {
    const recentPerformance = this.rlState.recentActions.slice(-10);
    const avgReward = recentPerformance.reduce((sum, action) => sum + action.reward, 0) / Math.max(recentPerformance.length, 1);
    const avgSymbolicAlignment = recentPerformance.reduce((sum, action) => sum + action.symbolicAlignment, 0) / Math.max(recentPerformance.length, 1);
    
    this.rlState.performanceHistory.push(avgReward);
    
    // Apply parent node guidance if available
    if (this.rlState.parentNodeGuidance) {
      await this.applyParentGuidance(this.rlState.parentNodeGuidance);
    }
    
    // Trigger mutations based on performance thresholds
    await this.triggerAdaptiveMutations(avgReward, avgSymbolicAlignment);
    
    // Adaptive exploration rate based on performance and symbolic coherence
    await this.adaptExplorationRate(avgReward, avgSymbolicAlignment);
  }

  /**
   * Apply guidance from parent Trinity Node
   * @mcpCallable
   */
  protected async applyParentGuidance(guidance: RFLGuidance): Promise<void> {
    // Adjust exploration rate based on parent guidance
    const targetRate = guidance.targetExplorationRate;
    const currentRate = this.rlState.explorationRate;
    const adjustment = (targetRate - currentRate) * 0.1; // Gradual adjustment
    
    this.rlState.explorationRate = Math.max(0.1, Math.min(0.5, currentRate + adjustment));
    
    logger.info(`🎯 Applied parent node guidance from ${guidance.fromNodeId}`, {
      targetExplorationRate: targetRate,
      newExplorationRate: this.rlState.explorationRate,
      convergenceTarget: guidance.convergenceTarget
    });
  }

  /**
   * Trigger autonomous mutations based on RFL performance
   * @mcpCallable
   */
  protected abstract triggerAdaptiveMutations(avgReward: number, symbolicAlignment: number): Promise<void>;

  /**
   * Adapt exploration rate based on performance
   * @mcpCallable
   */
  protected async adaptExplorationRate(avgReward: number, symbolicAlignment: number): Promise<void> {
    const coherenceFactor = this.rlState.symbolicCoherence;
    
    if (avgReward < 0 || symbolicAlignment < 0.3) {
      // Explore more when performing poorly or losing symbolic alignment
      this.rlState.explorationRate = Math.min(0.5, this.rlState.explorationRate + 0.05);
      logger.info(`🔍 Increased exploration rate to ${this.rlState.explorationRate} due to poor performance`);
    } else if (avgReward > 1.0 && symbolicAlignment > 0.8 && coherenceFactor > 0.8) {
      // Exploit more when performing well with good symbolic alignment
      this.rlState.explorationRate = Math.max(0.1, this.rlState.explorationRate - 0.02);
      logger.info(`🎯 Decreased exploration rate to ${this.rlState.explorationRate} due to good performance`);
    }
  }

  /**
   * Emit symbolic trace to memory system
   * @mcpCallable
   */
  protected async emitSymbolicTrace(trace: RFLTrace): Promise<void> {
    this.rlTraceMemory.push(trace);
    
    // Keep trace memory bounded
    if (this.rlTraceMemory.length > this.config.maxTraceMemory) {
      this.rlTraceMemory = this.rlTraceMemory.slice(-this.config.maxTraceMemory);
    }
    
    // Emit to KEB for hierarchy communication
    await this.emitToKEB(trace);
    
    logger.debug('🧬 Symbolic trace recorded', {
      event: trace.event,
      score: trace.score,
      symbolicDelta: trace.symbolicDelta,
      hierarchyLevel: trace.hierarchyLevel
    });
  }

  /**
   * Emit RFL data to Knowledge Event Bus
   * @mcpCallable
   */
  protected abstract emitToKEB(trace: RFLTrace): Promise<void>;

  /**
   * Receive guidance from parent Trinity Node
   * @mcpCallable
   */
  public receiveParentGuidance(guidance: RFLGuidance): void {
    this.rlState.parentNodeGuidance = guidance;
    logger.info(`📡 Received parent node guidance from ${guidance.fromNodeId}`, {
      targetExplorationRate: guidance.targetExplorationRate,
      convergenceTarget: guidance.convergenceTarget
    });
  }

  /**
   * Get current RFL status
   * @mcpCallable
   */
  public getRFLStatus(): RFLStatus {
    const recentActions = this.rlState.recentActions.slice(-10);
    const recentPerformance = recentActions.reduce((sum, action) => sum + action.reward, 0) / Math.max(recentActions.length, 1);
    const parentAlignment = this.rlState.parentNodeGuidance 
      ? this.calculateParentAlignment() 
      : 1.0;
    
    return {
      enabled: this.config.enabled,
      currentScore: Math.round(this.rlState.rewardScore * 100) / 100,
      policyVersion: this.rlState.policyVersion,
      explorationRate: Math.round(this.rlState.explorationRate * 1000) / 1000,
      recentPerformance: Math.round(recentPerformance * 100) / 100,
      actionCount: this.rlState.recentActions.length,
      traceMemorySize: this.rlTraceMemory.length,
      symbolicCoherence: Math.round(this.rlState.symbolicCoherence * 1000) / 1000,
      parentAlignment: Math.round(parentAlignment * 1000) / 1000,
      adaptations: [
        'Dynamic exploration rate adjustment',
        'Reward-triggered policy mutations',
        'Symbolic coherence maintenance',
        'Parent node guidance integration',
        'Hierarchical learning propagation'
      ]
    };
  }

  /**
   * Calculate alignment with parent node guidance
   * @mcpCallable
   */
  protected calculateParentAlignment(): number {
    if (!this.rlState.parentNodeGuidance) return 1.0;
    
    const guidance = this.rlState.parentNodeGuidance;
    const explorationDiff = Math.abs(this.rlState.explorationRate - guidance.targetExplorationRate);
    const coherenceDiff = Math.abs(this.rlState.symbolicCoherence - guidance.convergenceTarget);
    
    // Calculate alignment score (1.0 = perfect alignment, 0.0 = complete misalignment)
    const explorationAlignment = 1.0 - (explorationDiff / 0.5); // Normalize by max exploration range
    const coherenceAlignment = 1.0 - coherenceDiff;
    
    return Math.max(0, (explorationAlignment + coherenceAlignment) / 2);
  }

  /**
   * Reset RFL state (for testing or emergency recovery)
   * @mcpCallable
   */
  public resetRFLState(): void {
    this.rlState.rewardScore = 0;
    this.rlState.recentActions = [];
    this.rlState.performanceHistory = [];
    this.rlState.explorationRate = this.config.explorationRate;
    this.rlState.symbolicCoherence = 1.0;
    this.rlState.lastPolicyUpdate = Date.now();
    
    logger.warn(`🔄 RFL state reset for ${this.rlState.agentId}`);
  }
}

// 🔧 RFL Configuration Interface

export interface RFLConfig {
  enabled: boolean;
  learningRate: number;
  explorationRate: number;
  rewardDecay: number;
  policyUpdateThreshold: number;
  maxActionHistory: number;
  maxTraceMemory: number;
  symbolicNarrativeId?: string;
  parentNodeId?: string;
}

export const DEFAULT_RFL_CONFIG: RFLConfig = {
  enabled: true,
  learningRate: 0.1,
  explorationRate: 0.2,
  rewardDecay: 0.95,
  policyUpdateThreshold: 10,
  maxActionHistory: 50,
  maxTraceMemory: 1000
};

// 🌐 RFL Event Types (Standardized across all agents)

export const RFL_EVENT_TYPES = {
  // Agent-level events
  TASK_COMPLETED: 'task_completed',
  TASK_FAILED: 'task_failed',
  MUTATION_APPLIED: 'mutation_applied',
  PERFORMANCE_ENHANCED: 'performance_enhanced',
  ERROR_OCCURRED: 'error_occurred',
  
  // Communication events
  AGENT_CONNECTED: 'agent_connected',
  AGENT_DISCONNECTED: 'agent_disconnected',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  
  // Learning events
  EXPLORATION_INCREASED: 'exploration_increased',
  EXPLOITATION_FOCUSED: 'exploitation_focused',
  SYMBOLIC_ALIGNMENT_IMPROVED: 'symbolic_alignment_improved',
  SYMBOLIC_COHERENCE_DEGRADED: 'symbolic_coherence_degraded',
  
  // Hierarchy events
  PARENT_GUIDANCE_RECEIVED: 'parent_guidance_received',
  PARENT_GUIDANCE_APPLIED: 'parent_guidance_applied',
  NODE_AGGREGATION_COMPLETED: 'node_aggregation_completed',
  SWARM_SIGNAL_PROCESSED: 'swarm_signal_processed'
} as const;

export type RFLEventType = typeof RFL_EVENT_TYPES[keyof typeof RFL_EVENT_TYPES]; 