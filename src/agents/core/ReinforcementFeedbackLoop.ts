/**
 * VANTA Framework - Reinforcement Feedback Loop (RFL)
 * Handles reward signal processing, behavior adaptation, and learning integration
 */

export interface RewardSignal {
  source: 'trace_deltas' | 'symbolic_health' | 'goal_convergence' | 'performance_metrics' | 'peer_feedback' | 'model_output' | 'environment';
  value: number; // Normalized reward value (-1.0 to 1.0)
  confidence: number; // Confidence in the reward signal (0.0 to 1.0)
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface BehaviorMutation {
  type: 'policy_adjustment' | 'strategy_refinement' | 'capability_enhancement' | 'emergency_adaptation';
  target: string; // What behavior to modify
  adjustment: number; // How much to adjust (-1.0 to 1.0)
  reason: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface LearningEvent {
  agentId: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  rewardSignals: RewardSignal[];
  behaviorMutations: BehaviorMutation[];
  convergenceScore: number;
  timestamp: Date;
}

export class ReinforcementFeedbackLoop {
  private agentId: string;
  private rewardHistory: RewardSignal[] = [];
  private learningEvents: LearningEvent[] = [];
  private behaviorPolicies: Map<string, number> = new Map();
  private convergenceThreshold: number = 0.85;
  private maxHistorySize: number = 1000;

  constructor(agentId: string) {
    this.agentId = agentId;
    this.initializeDefaultPolicies();
  }

  /**
   * Process incoming reward signal from various sources
   */
  public processRewardSignal(signal: RewardSignal): BehaviorMutation[] {
    // Store reward signal
    this.rewardHistory.push(signal);
    this.maintainHistoryLimit();

    // Calculate weighted reward based on confidence and recency
    const weightedReward = this.calculateWeightedReward(signal);

    // Generate behavior mutations based on reward
    const mutations = this.generateBehaviorMutations(signal, weightedReward);

    // Update behavior policies
    this.updateBehaviorPolicies(mutations);

    // Log learning event
    this.logLearningEvent(signal, mutations);

    return mutations;
  }

  /**
   * Process multiple reward signals simultaneously (for consensus-based learning)
   */
  public processMultipleRewards(signals: RewardSignal[]): BehaviorMutation[] {
    const allMutations: BehaviorMutation[] = [];

    // Process individual signals
    for (const signal of signals) {
      const mutations = this.processRewardSignal(signal);
      allMutations.push(...mutations);
    }

    // Apply consensus logic for conflicting mutations
    const consensusMutations = this.resolveConflictingMutations(allMutations);

    return consensusMutations;
  }

  /**
   * Calculate convergence score based on recent performance
   */
  public calculateConvergenceScore(): number {
    if (this.rewardHistory.length < 10) {
      return 0.5; // Neutral score for insufficient data
    }

    const recentRewards = this.rewardHistory.slice(-20);
    const averageReward = recentRewards.reduce((sum, r) => sum + r.value, 0) / recentRewards.length;
    const variance = this.calculateVariance(recentRewards.map(r => r.value));
    
    // High convergence = high average reward + low variance
    const stabilityScore = Math.max(0, 1 - variance);
    const performanceScore = (averageReward + 1) / 2; // Normalize from [-1,1] to [0,1]
    
    return (stabilityScore * 0.4 + performanceScore * 0.6);
  }

  /**
   * Get current behavior policies
   */
  public getBehaviorPolicies(): Record<string, number> {
    return Object.fromEntries(this.behaviorPolicies);
  }

  /**
   * Get recent learning events for trace memory
   */
  public getRecentLearningEvents(limit: number = 50): LearningEvent[] {
    return this.learningEvents.slice(-limit);
  }

  /**
   * Apply RKDO (Recursive KL Divergence Optimization) for advanced learning
   */
  public applyRKDO(): BehaviorMutation[] {
    const mutations: BehaviorMutation[] = [];
    
    // Calculate KL divergence between current and optimal policy distributions
    const currentDistribution = this.getPolicyDistribution();
    const optimalDistribution = this.calculateOptimalDistribution();
    
    const klDivergence = this.calculateKLDivergence(currentDistribution, optimalDistribution);
    
    if (klDivergence > 0.1) { // Significant divergence threshold
      // Generate corrective mutations
      for (const [policy, currentWeight] of this.behaviorPolicies) {
        const optimalWeight = optimalDistribution.get(policy) || 0;
        const divergence = optimalWeight - currentWeight;
        
        if (Math.abs(divergence) > 0.05) {
          mutations.push({
            type: 'policy_adjustment',
            target: policy,
            adjustment: divergence * 0.5, // Conservative adjustment
            reason: `RKDO optimization - KL divergence: ${klDivergence.toFixed(3)}`,
            priority: 'normal'
          });
        }
      }
    }
    
    return mutations;
  }

  private initializeDefaultPolicies(): void {
    // Initialize with balanced default policies
    this.behaviorPolicies.set('exploration_rate', 0.3);
    this.behaviorPolicies.set('cooperation_tendency', 0.7);
    this.behaviorPolicies.set('risk_tolerance', 0.5);
    this.behaviorPolicies.set('learning_rate', 0.4);
    this.behaviorPolicies.set('communication_frequency', 0.6);
    this.behaviorPolicies.set('security_awareness', 0.8);
    this.behaviorPolicies.set('efficiency_priority', 0.6);
  }

  private calculateWeightedReward(signal: RewardSignal): number {
    const ageWeight = this.calculateAgeWeight(signal.timestamp);
    const confidenceWeight = signal.confidence;
    const sourceWeight = this.getSourceWeight(signal.source);
    
    return signal.value * ageWeight * confidenceWeight * sourceWeight;
  }

  private calculateAgeWeight(timestamp: Date): number {
    const ageMinutes = (Date.now() - timestamp.getTime()) / (1000 * 60);
    return Math.exp(-ageMinutes / 60); // Exponential decay over 1 hour
  }

  private getSourceWeight(source: RewardSignal['source']): number {
    const weights = {
      'goal_convergence': 1.0,
      'performance_metrics': 0.9,
      'peer_feedback': 0.8,
      'model_output': 0.7,
      'symbolic_health': 0.8,
      'trace_deltas': 0.6,
      'environment': 0.5
    };
    return weights[source] || 0.5;
  }

  private generateBehaviorMutations(signal: RewardSignal, weightedReward: number): BehaviorMutation[] {
    const mutations: BehaviorMutation[] = [];
    const intensity = Math.abs(weightedReward);
    const direction = Math.sign(weightedReward);

    // Determine which policies to adjust based on signal source and outcome
    const relevantPolicies = this.getRelevantPolicies(signal.source);

    for (const policy of relevantPolicies) {
      const currentValue = this.behaviorPolicies.get(policy) || 0.5;
      const adjustment = this.calculatePolicyAdjustment(policy, direction, intensity, currentValue);

      if (Math.abs(adjustment) > 0.01) { // Minimum adjustment threshold
        mutations.push({
          type: 'policy_adjustment',
          target: policy,
          adjustment,
          reason: `Reward signal from ${signal.source}: ${weightedReward.toFixed(3)}`,
          priority: intensity > 0.7 ? 'high' : 'normal'
        });
      }
    }

    return mutations;
  }

  private getRelevantPolicies(source: RewardSignal['source']): string[] {
    const policyMap: Record<string, string[]> = {
      'goal_convergence': ['learning_rate', 'efficiency_priority'],
      'performance_metrics': ['efficiency_priority', 'risk_tolerance'],
      'peer_feedback': ['cooperation_tendency', 'communication_frequency'],
      'model_output': ['learning_rate', 'exploration_rate'],
      'symbolic_health': ['security_awareness', 'risk_tolerance'],
      'trace_deltas': ['learning_rate', 'exploration_rate'],
      'environment': ['exploration_rate', 'risk_tolerance']
    };
    return policyMap[source] || ['learning_rate'];
  }

  private calculatePolicyAdjustment(policy: string, direction: number, intensity: number, currentValue: number): number {
    // Calculate adjustment with diminishing returns near boundaries
    const baseAdjustment = direction * intensity * 0.1; // Base 10% adjustment
    
    // Apply boundary constraints (prevent values outside [0, 1])
    if (direction > 0 && currentValue > 0.8) {
      return baseAdjustment * (1 - currentValue); // Reduce adjustment near upper bound
    } else if (direction < 0 && currentValue < 0.2) {
      return baseAdjustment * currentValue; // Reduce adjustment near lower bound
    }
    
    return baseAdjustment;
  }

  private updateBehaviorPolicies(mutations: BehaviorMutation[]): void {
    for (const mutation of mutations) {
      if (mutation.type === 'policy_adjustment') {
        const currentValue = this.behaviorPolicies.get(mutation.target) || 0.5;
        const newValue = Math.max(0, Math.min(1, currentValue + mutation.adjustment));
        this.behaviorPolicies.set(mutation.target, newValue);
      }
    }
  }

  private resolveConflictingMutations(mutations: BehaviorMutation[]): BehaviorMutation[] {
    const policyAdjustments = new Map<string, number>();
    const mutationGroups = new Map<string, BehaviorMutation[]>();

    // Group mutations by target policy
    for (const mutation of mutations) {
      if (!mutationGroups.has(mutation.target)) {
        mutationGroups.set(mutation.target, []);
      }
      mutationGroups.get(mutation.target)!.push(mutation);
    }

    // Resolve conflicts by weighted averaging
    const resolvedMutations: BehaviorMutation[] = [];
    for (const [target, groupMutations] of mutationGroups) {
      if (groupMutations.length === 1) {
        resolvedMutations.push(groupMutations[0]);
      } else {
        // Calculate weighted average adjustment
        const totalWeight = groupMutations.reduce((sum, m) => sum + this.getMutationWeight(m), 0);
        const weightedAdjustment = groupMutations.reduce((sum, m) => 
          sum + (m.adjustment * this.getMutationWeight(m)), 0) / totalWeight;

        resolvedMutations.push({
          type: 'policy_adjustment',
          target,
          adjustment: weightedAdjustment,
          reason: `Consensus of ${groupMutations.length} signals`,
          priority: this.getHighestPriority(groupMutations.map(m => m.priority))
        });
      }
    }

    return resolvedMutations;
  }

  private getMutationWeight(mutation: BehaviorMutation): number {
    const priorityWeights = { low: 0.5, normal: 1.0, high: 1.5, critical: 2.0 };
    return priorityWeights[mutation.priority];
  }

  private getHighestPriority(priorities: BehaviorMutation['priority'][]): BehaviorMutation['priority'] {
    const priorityOrder = ['low', 'normal', 'high', 'critical'];
    return priorities.reduce((highest, current) => 
      priorityOrder.indexOf(current) > priorityOrder.indexOf(highest) ? current : highest
    );
  }

  private logLearningEvent(signal: RewardSignal, mutations: BehaviorMutation[]): void {
    const event: LearningEvent = {
      agentId: this.agentId,
      action: `Processed ${signal.source} signal`,
      outcome: signal.value > 0 ? 'success' : signal.value < 0 ? 'failure' : 'partial',
      rewardSignals: [signal],
      behaviorMutations: mutations,
      convergenceScore: this.calculateConvergenceScore(),
      timestamp: new Date()
    };

    this.learningEvents.push(event);
    this.maintainLearningEventLimit();
  }

  private maintainHistoryLimit(): void {
    if (this.rewardHistory.length > this.maxHistorySize) {
      this.rewardHistory = this.rewardHistory.slice(-this.maxHistorySize);
    }
  }

  private maintainLearningEventLimit(): void {
    if (this.learningEvents.length > this.maxHistorySize) {
      this.learningEvents = this.learningEvents.slice(-this.maxHistorySize);
    }
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private getPolicyDistribution(): Map<string, number> {
    const total = Array.from(this.behaviorPolicies.values()).reduce((sum, val) => sum + val, 0);
    const distribution = new Map<string, number>();
    
    for (const [policy, value] of this.behaviorPolicies) {
      distribution.set(policy, value / total);
    }
    
    return distribution;
  }

  private calculateOptimalDistribution(): Map<string, number> {
    // Calculate optimal distribution based on recent reward patterns
    const distribution = new Map<string, number>();
    const recentEvents = this.learningEvents.slice(-50);
    
    // Analyze which policies led to positive outcomes
    const policyPerformance = new Map<string, number[]>();
    
    for (const event of recentEvents) {
      const eventReward = event.rewardSignals.reduce((sum, r) => sum + r.value, 0) / event.rewardSignals.length;
      
      for (const mutation of event.behaviorMutations) {
        if (mutation.type === 'policy_adjustment') {
          if (!policyPerformance.has(mutation.target)) {
            policyPerformance.set(mutation.target, []);
          }
          policyPerformance.get(mutation.target)!.push(eventReward);
        }
      }
    }
    
    // Calculate optimal weights based on performance
    let totalOptimal = 0;
    for (const [policy, rewards] of policyPerformance) {
      const averageReward = rewards.reduce((sum, r) => sum + r, 0) / rewards.length;
      const optimalWeight = Math.max(0.1, Math.min(1.0, 0.5 + averageReward * 0.5));
      distribution.set(policy, optimalWeight);
      totalOptimal += optimalWeight;
    }
    
    // Normalize distribution
    for (const [policy, weight] of distribution) {
      distribution.set(policy, weight / totalOptimal);
    }
    
    return distribution;
  }

  private calculateKLDivergence(p: Map<string, number>, q: Map<string, number>): number {
    let divergence = 0;
    
    for (const [key, pValue] of p) {
      const qValue = q.get(key) || 0.001; // Small epsilon to avoid log(0)
      if (pValue > 0) {
        divergence += pValue * Math.log(pValue / qValue);
      }
    }
    
    return divergence;
  }
} 