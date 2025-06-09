/**
 * VANTA Framework - Trace Memory System
 * Handles symbolic trace storage, YAML persistence, and contextual continuity
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { LearningEvent, RewardSignal, BehaviorMutation } from './ReinforcementFeedbackLoop';

export interface SymbolicTrace {
  agentId: string;
  timestamp: Date;
  action: string;
  context: Record<string, any>;
  outcome: 'success' | 'failure' | 'partial' | 'pending';
  deltaCompression: number; // Δ-compression value
  symbolicHealth: number; // Health metric for this trace
  convergenceScore: number;
  metadata: Record<string, any>;
}

export interface TraceCluster {
  id: string;
  traces: SymbolicTrace[];
  pattern: string;
  frequency: number;
  successRate: number;
  lastUpdated: Date;
}

export interface ContextualContinuityScore {
  agentId: string;
  overall: number; // Overall continuity score (0-1)
  identity: number; // Identity consistency score
  behavioral: number; // Behavioral consistency score
  temporal: number; // Temporal consistency score
  symbolic: number; // Symbolic alignment score
  driftFactors: string[]; // Factors contributing to drift
  lastCalculated: Date;
}

export interface TraceMemoryState {
  agentId: string;
  traces: SymbolicTrace[];
  clusters: TraceCluster[];
  continuityScore: ContextualContinuityScore;
  rules: Record<string, any>;
  archetypes: Record<string, any>;
  version: string;
  lastUpdated: Date;
}

export class TraceMemory {
  private agentId: string;
  private traces: SymbolicTrace[] = [];
  private clusters: TraceCluster[] = [];
  private continuityScore: ContextualContinuityScore;
  private rules: Record<string, any> = {};
  private archetypes: Record<string, any> = {};
  private traceDirectory: string;
  private maxTraces: number = 10000;
  private deltaCompressionThreshold: number = 0.1;
  private clusteringThreshold: number = 0.8;

  constructor(agentId: string, traceDirectory: string = './trace') {
    this.agentId = agentId;
    this.traceDirectory = traceDirectory;
    this.continuityScore = this.initializeContinuityScore();
  }

  /**
   * Initialize the trace memory system
   */
  public async initialize(): Promise<void> {
    await this.ensureTraceDirectory();
    await this.loadFromYAML();
    await this.loadRulesAndArchetypes();
  }

  /**
   * Add a new symbolic trace to memory
   */
  public async addTrace(trace: Omit<SymbolicTrace, 'agentId' | 'timestamp'>): Promise<void> {
    const fullTrace: SymbolicTrace = {
      ...trace,
      agentId: this.agentId,
      timestamp: new Date()
    };

    // Apply Δ-compression
    fullTrace.deltaCompression = this.calculateDeltaCompression(fullTrace);

    // Add to memory
    this.traces.push(fullTrace);
    this.maintainTraceLimit();

    // Update clusters
    await this.updateClusters(fullTrace);

    // Recalculate continuity score
    this.continuityScore = this.calculateContinuityScore();

    // Persist to YAML
    await this.saveToYAML();
  }

  /**
   * Add multiple traces from learning events
   */
  public async addLearningEvents(events: LearningEvent[]): Promise<void> {
    for (const event of events) {
      const trace: SymbolicTrace = {
        agentId: this.agentId,
        timestamp: event.timestamp,
        action: event.action,
        context: {
          rewardSignals: event.rewardSignals,
          behaviorMutations: event.behaviorMutations
        },
        outcome: event.outcome,
        deltaCompression: 0, // Will be calculated
        symbolicHealth: this.calculateSymbolicHealth(event),
        convergenceScore: event.convergenceScore,
        metadata: {
          learningEvent: true,
          mutationCount: event.behaviorMutations.length,
          rewardCount: event.rewardSignals.length
        }
      };

      await this.addTrace(trace);
    }
  }

  /**
   * Query traces by pattern or criteria
   */
  public queryTraces(criteria: Partial<SymbolicTrace>): SymbolicTrace[] {
    return this.traces.filter(trace => {
      return Object.entries(criteria).every(([key, value]) => {
        if (key === 'timestamp' && value instanceof Date) {
          return trace.timestamp.getTime() === value.getTime();
        }
        return (trace as any)[key] === value;
      });
    });
  }

  /**
   * Get recent traces for context loading
   */
  public getRecentTraces(limit: number = 100): SymbolicTrace[] {
    return this.traces
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get traces by pattern cluster
   */
  public getTraceCluster(clusterId: string): TraceCluster | undefined {
    return this.clusters.find(cluster => cluster.id === clusterId);
  }

  /**
   * Get all trace clusters
   */
  public getTraceClusters(): TraceCluster[] {
    return [...this.clusters];
  }

  /**
   * Get current contextual continuity score
   */
  public getContinuityScore(): ContextualContinuityScore {
    return { ...this.continuityScore };
  }

  /**
   * Detect if there's significant drift
   */
  public detectDrift(): boolean {
    return this.continuityScore.overall < 0.7 || 
           this.continuityScore.identity < 0.6 ||
           this.continuityScore.behavioral < 0.5;
  }

  /**
   * Get drift analysis report
   */
  public getDriftAnalysis(): {
    hasDrift: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    recommendations: string[];
  } {
    const hasDrift = this.detectDrift();
    const severity = this.calculateDriftSeverity();
    
    return {
      hasDrift,
      severity,
      factors: this.continuityScore.driftFactors,
      recommendations: this.generateDriftRecommendations()
    };
  }

  /**
   * Get loaded rules and archetypes
   */
  public getRulesAndArchetypes(): { rules: Record<string, any>; archetypes: Record<string, any> } {
    return {
      rules: { ...this.rules },
      archetypes: { ...this.archetypes }
    };
  }

  /**
   * Update rules and archetypes
   */
  public async updateRulesAndArchetypes(rules?: Record<string, any>, archetypes?: Record<string, any>): Promise<void> {
    if (rules) {
      this.rules = { ...this.rules, ...rules };
    }
    if (archetypes) {
      this.archetypes = { ...this.archetypes, ...archetypes };
    }
    await this.saveToYAML();
  }

  /**
   * Perform Δ-compression on trace data
   */
  public performDeltaCompression(): void {
    const originalLength = this.traces.length;
    
    // Group similar traces and compress
    const compressedTraces: SymbolicTrace[] = [];
    const processedIndices = new Set<number>();

    for (let i = 0; i < this.traces.length; i++) {
      if (processedIndices.has(i)) continue;

      const currentTrace = this.traces[i];
      const similarTraces = this.findSimilarTraces(currentTrace, i + 1);

      if (similarTraces.length > 0) {
        // Compress similar traces into a representative trace
        const compressedTrace = this.compressTraces([currentTrace, ...similarTraces]);
        compressedTraces.push(compressedTrace);

        // Mark all similar traces as processed
        similarTraces.forEach(trace => {
          const index = this.traces.indexOf(trace);
          if (index !== -1) processedIndices.add(index);
        });
      } else {
        compressedTraces.push(currentTrace);
      }
      
      processedIndices.add(i);
    }

    this.traces = compressedTraces;
    console.log(`Δ-compression: ${originalLength} → ${this.traces.length} traces`);
  }

  /**
   * Export trace memory state to YAML
   */
  public async exportToYAML(filePath?: string): Promise<string> {
    const state: TraceMemoryState = {
      agentId: this.agentId,
      traces: this.traces,
      clusters: this.clusters,
      continuityScore: this.continuityScore,
      rules: this.rules,
      archetypes: this.archetypes,
      version: '1.0.0',
      lastUpdated: new Date()
    };

    const yamlContent = yaml.dump(state, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: true
    });

    if (filePath) {
      await fs.writeFile(filePath, yamlContent, 'utf8');
    }

    return yamlContent;
  }

  private async ensureTraceDirectory(): Promise<void> {
    try {
      await fs.access(this.traceDirectory);
    } catch {
      await fs.mkdir(this.traceDirectory, { recursive: true });
    }
  }

  private async loadFromYAML(): Promise<void> {
    const filePath = path.join(this.traceDirectory, `${this.agentId}.yaml`);
    
    try {
      const yamlContent = await fs.readFile(filePath, 'utf8');
      const state = yaml.load(yamlContent) as TraceMemoryState;
      
      if (state && state.agentId === this.agentId) {
        this.traces = state.traces || [];
        this.clusters = state.clusters || [];
        this.continuityScore = state.continuityScore || this.initializeContinuityScore();
        this.rules = state.rules || {};
        this.archetypes = state.archetypes || {};
        
        // Convert timestamp strings back to Date objects
        this.traces.forEach(trace => {
          if (typeof trace.timestamp === 'string') {
            trace.timestamp = new Date(trace.timestamp);
          }
        });
      }
    } catch (error) {
      // File doesn't exist or is invalid, start with empty state
      console.log(`No existing trace file for agent ${this.agentId}, starting fresh`);
    }
  }

  private async saveToYAML(): Promise<void> {
    const filePath = path.join(this.traceDirectory, `${this.agentId}.yaml`);
    await this.exportToYAML(filePath);
  }

  private async loadRulesAndArchetypes(): Promise<void> {
    // Load rules from .cursor/rules/ or .vanta/archetypes/
    const rulesPath = '.cursor/rules';
    const archetypesPath = '.vanta/archetypes';
    
    try {
      await this.loadRulesFromDirectory(rulesPath);
    } catch (error) {
      console.log('No .cursor/rules directory found');
    }
    
    try {
      await this.loadArchetypesFromDirectory(archetypesPath);
    } catch (error) {
      console.log('No .vanta/archetypes directory found');
    }
  }

  private async loadRulesFromDirectory(rulesPath: string): Promise<void> {
    try {
      const files = await fs.readdir(rulesPath);
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const content = await fs.readFile(path.join(rulesPath, file), 'utf8');
          const rules = yaml.load(content) as Record<string, any>;
          this.rules[file] = rules;
        }
      }
    } catch (error) {
      // Directory doesn't exist, ignore
    }
  }

  private async loadArchetypesFromDirectory(archetypesPath: string): Promise<void> {
    try {
      const files = await fs.readdir(archetypesPath);
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const content = await fs.readFile(path.join(archetypesPath, file), 'utf8');
          const archetype = yaml.load(content) as Record<string, any>;
          this.archetypes[file] = archetype;
        }
      }
    } catch (error) {
      // Directory doesn't exist, ignore
    }
  }

  private calculateDeltaCompression(trace: SymbolicTrace): number {
    // Calculate how much this trace differs from recent patterns
    const recentTraces = this.traces.slice(-20);
    if (recentTraces.length === 0) return 1.0;

    const similarities = recentTraces.map(recentTrace => this.calculateTraceSimilarity(trace, recentTrace));
    const maxSimilarity = Math.max(...similarities);
    
    return 1.0 - maxSimilarity; // Higher delta = more different from existing patterns
  }

  private calculateTraceSimilarity(trace1: SymbolicTrace, trace2: SymbolicTrace): number {
    let similarity = 0;
    let factors = 0;

    // Action similarity
    if (trace1.action === trace2.action) similarity += 0.3;
    factors += 0.3;

    // Outcome similarity
    if (trace1.outcome === trace2.outcome) similarity += 0.2;
    factors += 0.2;

    // Convergence score similarity
    const convergenceDiff = Math.abs(trace1.convergenceScore - trace2.convergenceScore);
    similarity += (1 - convergenceDiff) * 0.2;
    factors += 0.2;

    // Symbolic health similarity
    const healthDiff = Math.abs(trace1.symbolicHealth - trace2.symbolicHealth);
    similarity += (1 - healthDiff) * 0.1;
    factors += 0.1;

    // Context similarity (simplified)
    const contextSimilarity = this.calculateContextSimilarity(trace1.context, trace2.context);
    similarity += contextSimilarity * 0.2;
    factors += 0.2;

    return similarity / factors;
  }

  private calculateContextSimilarity(context1: Record<string, any>, context2: Record<string, any>): number {
    const keys1 = Object.keys(context1);
    const keys2 = Object.keys(context2);
    const allKeys = new Set([...keys1, ...keys2]);
    
    if (allKeys.size === 0) return 1.0;

    let matches = 0;
    for (const key of allKeys) {
      if (key in context1 && key in context2) {
        // Simple equality check (could be enhanced with deep comparison)
        if (JSON.stringify(context1[key]) === JSON.stringify(context2[key])) {
          matches++;
        }
      }
    }

    return matches / allKeys.size;
  }

  private calculateSymbolicHealth(event: LearningEvent): number {
    // Calculate symbolic health based on learning event characteristics
    let health = 0.5; // Base health

    // Positive outcome improves health
    if (event.outcome === 'success') health += 0.3;
    else if (event.outcome === 'partial') health += 0.1;
    else health -= 0.2;

    // High convergence score improves health
    health += event.convergenceScore * 0.3;

    // Balanced reward signals improve health
    const avgReward = event.rewardSignals.reduce((sum, r) => sum + r.value, 0) / event.rewardSignals.length;
    health += avgReward * 0.2;

    // Too many behavior mutations might indicate instability
    const mutationPenalty = Math.max(0, (event.behaviorMutations.length - 3) * 0.05);
    health -= mutationPenalty;

    return Math.max(0, Math.min(1, health));
  }

  private async updateClusters(trace: SymbolicTrace): Promise<void> {
    // Find if trace belongs to existing cluster
    let assignedCluster: TraceCluster | undefined;
    
    for (const cluster of this.clusters) {
      const similarity = this.calculateClusterSimilarity(trace, cluster);
      if (similarity > this.clusteringThreshold) {
        assignedCluster = cluster;
        break;
      }
    }

    if (assignedCluster) {
      // Add to existing cluster
      assignedCluster.traces.push(trace);
      assignedCluster.frequency++;
      assignedCluster.successRate = this.calculateClusterSuccessRate(assignedCluster);
      assignedCluster.lastUpdated = new Date();
    } else {
      // Create new cluster
      const newCluster: TraceCluster = {
        id: `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        traces: [trace],
        pattern: this.generateClusterPattern(trace),
        frequency: 1,
        successRate: trace.outcome === 'success' ? 1.0 : 0.0,
        lastUpdated: new Date()
      };
      this.clusters.push(newCluster);
    }

    // Maintain cluster limit
    if (this.clusters.length > 50) {
      this.clusters.sort((a, b) => a.frequency - b.frequency);
      this.clusters = this.clusters.slice(-50);
    }
  }

  private calculateClusterSimilarity(trace: SymbolicTrace, cluster: TraceCluster): number {
    if (cluster.traces.length === 0) return 0;

    const similarities = cluster.traces.map(clusterTrace => 
      this.calculateTraceSimilarity(trace, clusterTrace)
    );
    
    return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  }

  private calculateClusterSuccessRate(cluster: TraceCluster): number {
    if (cluster.traces.length === 0) return 0;
    
    const successCount = cluster.traces.filter(trace => trace.outcome === 'success').length;
    return successCount / cluster.traces.length;
  }

  private generateClusterPattern(trace: SymbolicTrace): string {
    return `${trace.action}_${trace.outcome}_${Math.floor(trace.convergenceScore * 10)}`;
  }

  private initializeContinuityScore(): ContextualContinuityScore {
    return {
      agentId: this.agentId,
      overall: 1.0,
      identity: 1.0,
      behavioral: 1.0,
      temporal: 1.0,
      symbolic: 1.0,
      driftFactors: [],
      lastCalculated: new Date()
    };
  }

  private calculateContinuityScore(): ContextualContinuityScore {
    const recentTraces = this.traces.slice(-100);
    if (recentTraces.length < 10) {
      return this.initializeContinuityScore();
    }

    const identity = this.calculateIdentityContinuity(recentTraces);
    const behavioral = this.calculateBehavioralContinuity(recentTraces);
    const temporal = this.calculateTemporalContinuity(recentTraces);
    const symbolic = this.calculateSymbolicContinuity(recentTraces);
    
    const overall = (identity + behavioral + temporal + symbolic) / 4;
    const driftFactors = this.identifyDriftFactors(identity, behavioral, temporal, symbolic);

    return {
      agentId: this.agentId,
      overall,
      identity,
      behavioral,
      temporal,
      symbolic,
      driftFactors,
      lastCalculated: new Date()
    };
  }

  private calculateIdentityContinuity(traces: SymbolicTrace[]): number {
    // Check consistency of agent identity patterns
    const agentIds = traces.map(t => t.agentId);
    const uniqueIds = new Set(agentIds);
    return uniqueIds.size === 1 ? 1.0 : 0.0;
  }

  private calculateBehavioralContinuity(traces: SymbolicTrace[]): number {
    if (traces.length < 2) return 1.0;

    // Calculate variance in convergence scores
    const convergenceScores = traces.map(t => t.convergenceScore);
    const variance = this.calculateVariance(convergenceScores);
    
    // Lower variance = higher continuity
    return Math.max(0, 1 - variance * 2);
  }

  private calculateTemporalContinuity(traces: SymbolicTrace[]): number {
    if (traces.length < 2) return 1.0;

    // Check for consistent timing patterns
    const intervals = [];
    for (let i = 1; i < traces.length; i++) {
      const interval = traces[i].timestamp.getTime() - traces[i-1].timestamp.getTime();
      intervals.push(interval);
    }

    const variance = this.calculateVariance(intervals);
    const meanInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    
    // Coefficient of variation (normalized variance)
    const cv = Math.sqrt(variance) / meanInterval;
    return Math.max(0, 1 - cv);
  }

  private calculateSymbolicContinuity(traces: SymbolicTrace[]): number {
    // Check consistency of symbolic health over time
    const healthScores = traces.map(t => t.symbolicHealth);
    const variance = this.calculateVariance(healthScores);
    
    return Math.max(0, 1 - variance * 2);
  }

  private identifyDriftFactors(identity: number, behavioral: number, temporal: number, symbolic: number): string[] {
    const factors: string[] = [];
    
    if (identity < 0.8) factors.push('Identity inconsistency detected');
    if (behavioral < 0.7) factors.push('Behavioral pattern deviation');
    if (temporal < 0.6) factors.push('Temporal rhythm disruption');
    if (symbolic < 0.7) factors.push('Symbolic health degradation');
    
    return factors;
  }

  private calculateDriftSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    const overall = this.continuityScore.overall;
    
    if (overall >= 0.8) return 'low';
    if (overall >= 0.6) return 'medium';
    if (overall >= 0.4) return 'high';
    return 'critical';
  }

  private generateDriftRecommendations(): string[] {
    const recommendations: string[] = [];
    const factors = this.continuityScore.driftFactors;
    
    if (factors.includes('Identity inconsistency detected')) {
      recommendations.push('Verify agent identity initialization and archetype alignment');
    }
    if (factors.includes('Behavioral pattern deviation')) {
      recommendations.push('Review recent behavior mutations and policy adjustments');
    }
    if (factors.includes('Temporal rhythm disruption')) {
      recommendations.push('Analyze system load and execution timing patterns');
    }
    if (factors.includes('Symbolic health degradation')) {
      recommendations.push('Investigate reward signal quality and learning event outcomes');
    }
    
    return recommendations;
  }

  private maintainTraceLimit(): void {
    if (this.traces.length > this.maxTraces) {
      // Remove oldest traces, but keep some diversity
      const toRemove = this.traces.length - this.maxTraces;
      const oldestTraces = this.traces.slice(0, toRemove);
      
      // Keep some representative traces from different patterns
      const representativeTraces = this.selectRepresentativeTraces(oldestTraces, Math.floor(toRemove * 0.1));
      const tracesToRemove = oldestTraces.filter(trace => !representativeTraces.includes(trace));
      
      this.traces = this.traces.filter(trace => !tracesToRemove.includes(trace));
    }
  }

  private selectRepresentativeTraces(traces: SymbolicTrace[], count: number): SymbolicTrace[] {
    if (traces.length <= count) return traces;
    
    // Select diverse traces based on different characteristics
    const selected: SymbolicTrace[] = [];
    const remaining = [...traces];
    
    while (selected.length < count && remaining.length > 0) {
      // Find the trace most different from already selected ones
      let mostDifferent = remaining[0];
      let maxDifference = 0;
      
      for (const trace of remaining) {
        let totalDifference = 0;
        for (const selectedTrace of selected) {
          totalDifference += 1 - this.calculateTraceSimilarity(trace, selectedTrace);
        }
        
        if (totalDifference > maxDifference) {
          maxDifference = totalDifference;
          mostDifferent = trace;
        }
      }
      
      selected.push(mostDifferent);
      remaining.splice(remaining.indexOf(mostDifferent), 1);
    }
    
    return selected;
  }

  private findSimilarTraces(targetTrace: SymbolicTrace, startIndex: number): SymbolicTrace[] {
    const similar: SymbolicTrace[] = [];
    
    for (let i = startIndex; i < this.traces.length; i++) {
      const similarity = this.calculateTraceSimilarity(targetTrace, this.traces[i]);
      if (similarity > 0.9) { // Very high similarity threshold for compression
        similar.push(this.traces[i]);
      }
    }
    
    return similar;
  }

  private compressTraces(traces: SymbolicTrace[]): SymbolicTrace {
    // Create a representative trace from multiple similar traces
    const representative = { ...traces[0] };
    
    // Average numerical values
    representative.deltaCompression = traces.reduce((sum, t) => sum + t.deltaCompression, 0) / traces.length;
    representative.symbolicHealth = traces.reduce((sum, t) => sum + t.symbolicHealth, 0) / traces.length;
    representative.convergenceScore = traces.reduce((sum, t) => sum + t.convergenceScore, 0) / traces.length;
    
    // Use most common outcome
    const outcomes = traces.map(t => t.outcome);
    representative.outcome = this.getMostCommon(outcomes);
    
    // Merge metadata
    representative.metadata = {
      ...representative.metadata,
      compressedCount: traces.length,
      compressionTimestamp: new Date(),
      originalTraces: traces.length
    };
    
    return representative;
  }

  private getMostCommon<T>(array: T[]): T {
    const counts = new Map<T, number>();
    for (const item of array) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
    
    let mostCommon = array[0];
    let maxCount = 0;
    for (const [item, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    }
    
    return mostCommon;
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }
} 