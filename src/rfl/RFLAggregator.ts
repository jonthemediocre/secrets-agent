// RFLAggregator.ts - Trinity Node RFL Aggregation System
// Level 2 Compliance: Universal RFL Hierarchy Implementation

import { createLogger } from '../utils/logger';
import { RFLCore, RFLState, RFLTrace, RFLGuidance, RFLStatus, RFLEvent } from './RFLCore';

const logger = createLogger('RFLAggregator');

// 🔗 Trinity Node Interfaces

export interface TrinityNodeRFLState {
  nodeId: string;
  childAgents: Map<string, RFLStatus>;
  nodeRewardScore: number;
  symbolicConvergence: number;
  lastAggregation: number;
  nodePolicy: NodePolicy;
  swarmGuidance?: SwarmGuidance;
  emergentPatterns: EmergentPattern[];
}

export interface NodePolicy {
  version: string;
  explorationStrategy: 'conservative' | 'balanced' | 'aggressive';
  convergenceTarget: number;
  mutationThreshold: number;
  learningVelocity: number;
}

export interface SwarmGuidance {
  fromMasterNodeId: string;
  globalExplorationRate: number;
  symbolicNarrativeConstraints: string[];
  emergenceThreshold: number;
  swarmCoherenceTarget: number;
}

export interface EmergentPattern {
  patternId: string;
  description: string;
  strength: number;
  agentParticipants: string[];
  symbolicSignificance: number;
  discoveredAt: number;
}

export interface NodeRFLMetrics {
  nodeRewardScore: number;
  averageChildPerformance: number;
  symbolicCoherence: number;
  learningVelocity: number;
  emergenceScore: number;
  swarmAlignment: number;
  activePatterns: number;
}

// 🔄 Trinity Node RFL Aggregator

export class RFLAggregator extends RFLCore {
  private nodeState: TrinityNodeRFLState;
  private aggregationInterval: NodeJS.Timeout | null = null;
  private childAgentConnections: Map<string, any> = new Map();

  constructor(nodeId: string, config: any = {}) {
    super(nodeId, {
      ...config,
      symbolicNarrativeId: config.symbolicNarrativeId || 'trinity-node-narrative'
    });

    this.nodeState = {
      nodeId,
      childAgents: new Map(),
      nodeRewardScore: 0,
      symbolicConvergence: 1.0,
      lastAggregation: Date.now(),
      nodePolicy: {
        version: '1.0.0',
        explorationStrategy: 'balanced',
        convergenceTarget: 0.8,
        mutationThreshold: 0.7,
        learningVelocity: 0.1
      },
      emergentPatterns: []
    };

    this.startAggregationLoop();
    
    logger.info(`🔗 Trinity Node RFL Aggregator initialized: ${nodeId}`, {
      explorationStrategy: this.nodeState.nodePolicy.explorationStrategy,
      convergenceTarget: this.nodeState.nodePolicy.convergenceTarget
    });
  }

  /**
   * Start continuous aggregation of child agent RFL data
   * @mcpCallable
   */
  private startAggregationLoop(): void {
    this.aggregationInterval = setInterval(async () => {
      await this.aggregateChildRFLData();
    }, 5000); // Aggregate every 5 seconds
  }

  /**
   * Register a child agent for RFL monitoring
   * @mcpCallable
   */
  public registerChildAgent(agentId: string, agentConnection: any): void {
    this.childAgentConnections.set(agentId, agentConnection);
    
    logger.info(`📝 Registered child agent: ${agentId}`, {
      totalChildAgents: this.childAgentConnections.size
    });
  }

  /**
   * Aggregate RFL data from all child agents
   * @mcpCallable
   */
  private async aggregateChildRFLData(): Promise<void> {
    const childStatuses: RFLStatus[] = [];
    
    // Collect RFL status from all child agents
    for (const [agentId, connection] of this.childAgentConnections) {
      try {
        const status = await this.getChildRFLStatus(agentId, connection);
        if (status) {
          this.nodeState.childAgents.set(agentId, status);
          childStatuses.push(status);
        }
      } catch (error) {
        logger.warn(`Failed to get RFL status from child agent ${agentId}`, { error });
      }
    }

    if (childStatuses.length === 0) return;

    // Calculate aggregate metrics
    const aggregateMetrics = this.calculateAggregateMetrics(childStatuses);
    
    // Update node state
    this.updateNodeState(aggregateMetrics);
    
    // Detect emergent patterns
    await this.detectEmergentPatterns(childStatuses);
    
    // Generate guidance for child agents
    await this.generateChildGuidance(childStatuses);
    
    // Emit node-level RFL trace
    await this.emitNodeRFLTrace(aggregateMetrics);

    this.nodeState.lastAggregation = Date.now();
    
    logger.debug(`🔄 Aggregated RFL data from ${childStatuses.length} child agents`, {
      nodeRewardScore: this.nodeState.nodeRewardScore,
      symbolicConvergence: this.nodeState.symbolicConvergence,
      emergentPatterns: this.nodeState.emergentPatterns.length
    });
  }

  /**
   * Get RFL status from a specific child agent
   * @mcpCallable
   */
  private async getChildRFLStatus(agentId: string, connection: any): Promise<RFLStatus | null> {
    try {
      // Call getRFLStatus on the child agent
      if (typeof connection.getRFLStatus === 'function') {
        return await connection.getRFLStatus();
      }
      return null;
    } catch (error) {
      logger.error(`Failed to get RFL status from ${agentId}`, { error });
      return null;
    }
  }

  /**
   * Calculate aggregate metrics from child agent data
   * @mcpCallable
   */
  private calculateAggregateMetrics(childStatuses: RFLStatus[]): NodeRFLMetrics {
    const totalScore = childStatuses.reduce((sum, status) => sum + status.currentScore, 0);
    const avgPerformance = childStatuses.reduce((sum, status) => sum + status.recentPerformance, 0) / childStatuses.length;
    const avgCoherence = childStatuses.reduce((sum, status) => sum + status.symbolicCoherence, 0) / childStatuses.length;
    const avgParentAlignment = childStatuses.reduce((sum, status) => sum + status.parentAlignment, 0) / childStatuses.length;
    
    // Calculate learning velocity (rate of improvement)
    const learningVelocity = this.calculateLearningVelocity(childStatuses);
    
    // Calculate emergence score (how well agents work together)
    const emergenceScore = this.calculateEmergenceScore(childStatuses);
    
    return {
      nodeRewardScore: totalScore,
      averageChildPerformance: avgPerformance,
      symbolicCoherence: avgCoherence,
      learningVelocity,
      emergenceScore,
      swarmAlignment: avgParentAlignment,
      activePatterns: this.nodeState.emergentPatterns.length
    };
  }

  /**
   * Calculate learning velocity across child agents
   * @mcpCallable
   */
  private calculateLearningVelocity(childStatuses: RFLStatus[]): number {
    // Simple heuristic: average of recent performance trends
    const performanceScores = childStatuses.map(status => status.recentPerformance);
    const velocity = performanceScores.reduce((sum, score) => sum + Math.max(0, score), 0) / performanceScores.length;
    
    return Math.min(1.0, velocity / 2.0); // Normalize to [0, 1]
  }

  /**
   * Calculate emergence score - how well agents collaborate
   * @mcpCallable
   */
  private calculateEmergenceScore(childStatuses: RFLStatus[]): number {
    // High emergence when agents have similar, positive performance
    const performances = childStatuses.map(status => status.recentPerformance);
    const avgPerformance = performances.reduce((sum, perf) => sum + perf, 0) / performances.length;
    const variance = performances.reduce((sum, perf) => sum + Math.pow(perf - avgPerformance, 2), 0) / performances.length;
    
    // Low variance + positive average = high emergence
    const emergenceScore = avgPerformance > 0 ? Math.max(0, 1.0 - variance) : 0;
    
    return Math.min(1.0, emergenceScore);
  }

  /**
   * Update node state based on aggregate metrics
   * @mcpCallable
   */
  private updateNodeState(metrics: NodeRFLMetrics): void {
    this.nodeState.nodeRewardScore = metrics.nodeRewardScore;
    this.nodeState.symbolicConvergence = metrics.symbolicCoherence;
    
    // Update node policy based on performance
    if (metrics.averageChildPerformance < 0) {
      this.nodeState.nodePolicy.explorationStrategy = 'aggressive';
      this.nodeState.nodePolicy.mutationThreshold = 0.5;
    } else if (metrics.emergenceScore > 0.8) {
      this.nodeState.nodePolicy.explorationStrategy = 'conservative';
      this.nodeState.nodePolicy.mutationThreshold = 0.9;
    } else {
      this.nodeState.nodePolicy.explorationStrategy = 'balanced';
      this.nodeState.nodePolicy.mutationThreshold = 0.7;
    }

    // Update learning velocity
    this.nodeState.nodePolicy.learningVelocity = metrics.learningVelocity;
  }

  /**
   * Detect emergent patterns across child agents
   * @mcpCallable
   */
  private async detectEmergentPatterns(childStatuses: RFLStatus[]): Promise<void> {
    // Pattern detection logic
    const highPerformingAgents = Array.from(this.nodeState.childAgents.entries())
      .filter(([, status]) => status.recentPerformance > 1.0)
      .map(([agentId]) => agentId);

    const coherentAgents = Array.from(this.nodeState.childAgents.entries())
      .filter(([, status]) => status.symbolicCoherence > 0.8)
      .map(([agentId]) => agentId);

    // Detect high-performance cluster pattern
    if (highPerformingAgents.length >= 2) {
      const existingPattern = this.nodeState.emergentPatterns.find(p => p.patternId === 'high-performance-cluster');
      
      if (!existingPattern) {
        this.nodeState.emergentPatterns.push({
          patternId: 'high-performance-cluster',
          description: 'Cluster of agents with consistently high performance',
          strength: highPerformingAgents.length / this.nodeState.childAgents.size,
          agentParticipants: highPerformingAgents,
          symbolicSignificance: 0.8,
          discoveredAt: Date.now()
        });
        
        logger.info(`🔍 Detected emergent pattern: high-performance-cluster`, {
          participants: highPerformingAgents,
          strength: highPerformingAgents.length / this.nodeState.childAgents.size
        });
      } else {
        // Update existing pattern
        existingPattern.strength = highPerformingAgents.length / this.nodeState.childAgents.size;
        existingPattern.agentParticipants = highPerformingAgents;
      }
    }

    // Detect symbolic coherence pattern
    if (coherentAgents.length >= Math.ceil(this.nodeState.childAgents.size * 0.7)) {
      const existingPattern = this.nodeState.emergentPatterns.find(p => p.patternId === 'symbolic-alignment');
      
      if (!existingPattern) {
        this.nodeState.emergentPatterns.push({
          patternId: 'symbolic-alignment',
          description: 'Strong symbolic coherence across majority of agents',
          strength: coherentAgents.length / this.nodeState.childAgents.size,
          agentParticipants: coherentAgents,
          symbolicSignificance: 0.9,
          discoveredAt: Date.now()
        });
        
        logger.info(`🔍 Detected emergent pattern: symbolic-alignment`, {
          participants: coherentAgents,
          coherenceRatio: coherentAgents.length / this.nodeState.childAgents.size
        });
      }
    }

    // Clean up old patterns
    this.nodeState.emergentPatterns = this.nodeState.emergentPatterns.filter(
      pattern => Date.now() - pattern.discoveredAt < 300000 // Keep patterns for 5 minutes
    );
  }

  /**
   * Generate guidance for child agents based on aggregated data
   * @mcpCallable
   */
  private async generateChildGuidance(childStatuses: RFLStatus[]): Promise<void> {
    const avgExplorationRate = childStatuses.reduce((sum, status) => sum + status.explorationRate, 0) / childStatuses.length;
    const avgCoherence = childStatuses.reduce((sum, status) => sum + status.symbolicCoherence, 0) / childStatuses.length;

    for (const [agentId, status] of this.nodeState.childAgents) {
      const guidance: RFLGuidance = {
        fromNodeId: this.nodeState.nodeId,
        targetExplorationRate: this.calculateTargetExplorationRate(status, avgExplorationRate),
        rewardAdjustments: this.calculateRewardAdjustments(status),
        symbolicConstraints: this.getSymbolicConstraints(),
        mutationThreshold: this.nodeState.nodePolicy.mutationThreshold,
        convergenceTarget: this.nodeState.nodePolicy.convergenceTarget
      };

      // Send guidance to child agent
      await this.sendGuidanceToChild(agentId, guidance);
    }
  }

  /**
   * Calculate target exploration rate for a specific child agent
   * @mcpCallable
   */
  private calculateTargetExplorationRate(childStatus: RFLStatus, avgRate: number): number {
    if (childStatus.recentPerformance < 0) {
      // Increase exploration for poorly performing agents
      return Math.min(0.5, childStatus.explorationRate + 0.1);
    } else if (childStatus.recentPerformance > 1.5) {
      // Decrease exploration for high performers
      return Math.max(0.1, childStatus.explorationRate - 0.05);
    } else {
      // Move towards average
      return avgRate;
    }
  }

  /**
   * Calculate reward adjustments for child agent
   * @mcpCallable
   */
  private calculateRewardAdjustments(childStatus: RFLStatus): Record<string, number> {
    const adjustments: Record<string, number> = {};
    
    // Boost rewards for symbolic coherence
    if (childStatus.symbolicCoherence < 0.6) {
      adjustments['symbolic_alignment_improved'] = 2.0;
    }
    
    // Boost rewards for parent alignment
    if (childStatus.parentAlignment < 0.7) {
      adjustments['parent_guidance_applied'] = 1.5;
    }
    
    return adjustments;
  }

  /**
   * Get symbolic constraints for child agents
   * @mcpCallable
   */
  private getSymbolicConstraints(): string[] {
    const constraints: string[] = [];
    
    // Add constraints based on swarm guidance
    if (this.nodeState.swarmGuidance) {
      constraints.push(...this.nodeState.swarmGuidance.symbolicNarrativeConstraints);
    }
    
    // Add node-specific constraints
    constraints.push(`maintain_coherence_above_${this.nodeState.nodePolicy.convergenceTarget}`);
    constraints.push(`align_with_node_${this.nodeState.nodeId}`);
    
    return constraints;
  }

  /**
   * Send guidance to a specific child agent
   * @mcpCallable
   */
  private async sendGuidanceToChild(agentId: string, guidance: RFLGuidance): Promise<void> {
    const connection = this.childAgentConnections.get(agentId);
    
    if (connection && typeof connection.receiveParentGuidance === 'function') {
      try {
        await connection.receiveParentGuidance(guidance);
        logger.debug(`📡 Sent guidance to child agent ${agentId}`, {
          targetExplorationRate: guidance.targetExplorationRate,
          convergenceTarget: guidance.convergenceTarget
        });
      } catch (error) {
        logger.error(`Failed to send guidance to child agent ${agentId}`, { error });
      }
    }
  }

  /**
   * Emit node-level RFL trace
   * @mcpCallable
   */
  private async emitNodeRFLTrace(metrics: NodeRFLMetrics): Promise<void> {
    const trace: RFLTrace = {
      agentId: this.nodeState.nodeId,
      event: 'node_aggregation_completed',
      score: metrics.nodeRewardScore,
      context: {
        metrics,
        emergentPatterns: this.nodeState.emergentPatterns,
        nodePolicy: this.nodeState.nodePolicy,
        childAgentCount: this.nodeState.childAgents.size
      },
      timestamp: Date.now(),
      policyVersion: this.nodeState.nodePolicy.version,
      symbolicDelta: metrics.symbolicCoherence,
      hierarchyLevel: 'node'
    };

    await this.emitSymbolicTrace(trace);
  }

  /**
   * Receive guidance from Master Trinity Node
   * @mcpCallable
   */
  public receiveSwarmGuidance(guidance: SwarmGuidance): void {
    this.nodeState.swarmGuidance = guidance;
    
    logger.info(`🌐 Received swarm guidance from ${guidance.fromMasterNodeId}`, {
      globalExplorationRate: guidance.globalExplorationRate,
      swarmCoherenceTarget: guidance.swarmCoherenceTarget
    });
  }

  /**
   * Get current node RFL metrics
   * @mcpCallable
   */
  public getNodeMetrics(): NodeRFLMetrics {
    const childStatuses = Array.from(this.nodeState.childAgents.values());
    
    if (childStatuses.length === 0) {
      return {
        nodeRewardScore: 0,
        averageChildPerformance: 0,
        symbolicCoherence: 1.0,
        learningVelocity: 0,
        emergenceScore: 0,
        swarmAlignment: 1.0,
        activePatterns: 0
      };
    }
    
    return this.calculateAggregateMetrics(childStatuses);
  }

  // 🔄 Abstract method implementations from RFLCore

  protected async calculateReward(event: RFLEvent): Promise<number> {
    // Node-level reward calculation
    switch (event.type) {
      case 'node_aggregation_completed':
        return event.success ? 2.0 : -1.0;
      case 'emergent_pattern_detected':
        return 3.0;
      case 'child_guidance_sent':
        return 1.0;
      case 'swarm_guidance_received':
        return 0.5;
      default:
        return event.success ? 1.0 : -0.5;
    }
  }

  protected async triggerAdaptiveMutations(avgReward: number, symbolicAlignment: number): Promise<void> {
    // Node-level mutations based on aggregate performance
    if (avgReward < -5.0) {
      logger.warn(`🔄 Triggering node-level optimization mutation due to low reward: ${avgReward}`);
      // Implement node-level optimization
    }
    
    if (symbolicAlignment < 0.5) {
      logger.warn(`🧬 Triggering symbolic coherence recovery due to low alignment: ${symbolicAlignment}`);
      // Implement coherence recovery
    }
  }

  protected async emitToKEB(trace: RFLTrace): Promise<void> {
    // Emit to Knowledge Event Bus for Master Trinity Node consumption
    logger.debug(`📤 Emitting to KEB: ${trace.event}`, {
      hierarchyLevel: trace.hierarchyLevel,
      score: trace.score
    });
    
    // Implementation would depend on actual KEB system
  }

  /**
   * Shutdown the aggregator
   * @mcpCallable
   */
  public shutdown(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
    
    logger.info(`🔄 Trinity Node RFL Aggregator shutdown: ${this.nodeState.nodeId}`);
  }
} 