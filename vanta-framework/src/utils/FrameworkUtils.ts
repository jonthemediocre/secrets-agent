/**
 * VANTA Framework Utilities
 * Helper functions and utilities for framework operations
 */

import { 
  GenericTrace, 
  GenericAgent, 
  PerformanceTrend,
  LearningMetrics,
  CompressionResult 
} from '../interfaces/GenericTypes';

/**
 * Framework Utilities Class
 * Provides common utility functions for VANTA Framework operations
 */
export class FrameworkUtils {

  /**
   * Generate a unique identifier
   */
  static generateId(prefix: string = 'vanta'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Calculate performance metrics from traces
   */
  static calculatePerformanceMetrics(traces: GenericTrace[]): {
    averageResponseTime: number;
    successRate: number;
    throughput: number;
    errorCount: number;
  } {
    if (traces.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 1,
        throughput: 0,
        errorCount: 0
      };
    }

    const totalResponseTime = traces.reduce((sum, trace) => 
      sum + (trace.performance?.duration || 0), 0
    );
    
    const averageResponseTime = totalResponseTime / traces.length;
    
    // Simple success rate calculation (would need more domain-specific logic)
    const successfulTraces = traces.filter(trace => 
      !trace.context.error && trace.performance?.duration !== undefined
    );
    const successRate = successfulTraces.length / traces.length;
    
    // Calculate throughput (traces per second)
    const timeSpan = this.getTimeSpan(traces);
    const throughput = timeSpan > 0 ? traces.length / (timeSpan / 1000) : 0;
    
    const errorCount = traces.filter(trace => trace.context.error).length;

    return {
      averageResponseTime,
      successRate,
      throughput,
      errorCount
    };
  }

  /**
   * Generate learning metrics from agent performance
   */
  static generateLearningMetrics(
    agentId: string,
    traces: GenericTrace[]
  ): LearningMetrics {
    // Calculate convergence score based on performance trends
    const performanceTrends = this.extractPerformanceTrends(traces);
    const convergenceScore = this.calculateConvergence(performanceTrends);
    
    // Calculate adaptation rate based on how quickly performance improves
    const adaptationRate = this.calculateAdaptationRate(traces);
    
    // Calculate exploration efficiency
    const explorationEfficiency = this.calculateExplorationEfficiency(traces);
    
    // Calculate knowledge retention
    const knowledgeRetention = this.calculateKnowledgeRetention(traces);
    
    // Calculate transfer success (placeholder)
    const transferSuccess = 0.8; // Would be calculated based on actual transfer events

    return {
      agentId,
      convergenceScore,
      adaptationRate,
      explorationEfficiency,
      knowledgeRetention,
      transferSuccess,
      timestamp: new Date()
    };
  }

  /**
   * Compress trace data for storage efficiency
   */
  static compressTraceData(traces: GenericTrace[]): CompressionResult {
    const inputSize = JSON.stringify(traces).length;
    
    // Simple compression: remove duplicate traces and merge similar ones
    const compressedTraces = this.deduplicateTraces(traces);
    const outputSize = JSON.stringify(compressedTraces).length;
    
    const compressionRatio = inputSize > 0 ? outputSize / inputSize : 1;
    const knowledgePreserved = this.calculateKnowledgePreservation(traces, compressedTraces);
    const patternsExtracted = this.extractUniquePatterns(compressedTraces).length;

    return {
      compressionId: this.generateId('compression'),
      inputSize,
      outputSize,
      compressionRatio,
      knowledgePreserved,
      processingTime: 100, // Placeholder
      patternsExtracted
    };
  }

  /**
   * Validate agent configuration
   */
  static validateAgentConfig(config: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.agentId) {
      errors.push('agentId is required');
    }

    if (!config.agentType) {
      errors.push('agentType is required');
    }

    if (!config.capabilities) {
      errors.push('capabilities configuration is required');
    }

    if (!config.performance) {
      errors.push('performance configuration is required');
    }

    if (!config.learning) {
      errors.push('learning configuration is required');
    }

    if (!config.collaboration) {
      errors.push('collaboration configuration is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format performance data for reporting
   */
  static formatPerformanceReport(
    agentId: string,
    metrics: any
  ): string {
    return `
=== VANTA Agent Performance Report ===
Agent ID: ${agentId}
Generated: ${new Date().toISOString()}

Performance Metrics:
- Average Response Time: ${metrics.averageResponseTime?.toFixed(2)}ms
- Success Rate: ${(metrics.successRate * 100)?.toFixed(1)}%
- Throughput: ${metrics.throughput?.toFixed(2)} ops/sec
- Error Count: ${metrics.errorCount}

Learning Metrics:
- Convergence Score: ${(metrics.convergenceScore * 100)?.toFixed(1)}%
- Adaptation Rate: ${(metrics.adaptationRate * 100)?.toFixed(1)}%
- Knowledge Retention: ${(metrics.knowledgeRetention * 100)?.toFixed(1)}%

Recommendations:
${metrics.recommendations?.join('\n') || 'No specific recommendations at this time.'}
    `.trim();
  }

  /**
   * Create a default agent configuration template
   */
  static createDefaultAgentConfig(
    agentId: string,
    agentType: string
  ): any {
    return {
      agentId,
      agentType,
      capabilities: {
        planning: true,
        execution: true,
        learning: true,
        collaboration: true,
        adaptation: true
      },
      performance: {
        maxConcurrentTasks: 5,
        responseTimeout: 30000,
        memoryLimit: 512
      },
      learning: {
        enabled: true,
        learningRate: 0.1,
        explorationRate: 0.2
      },
      collaboration: {
        enabled: true,
        maxSwarmSize: 10,
        communicationTimeout: 5000
      }
    };
  }

  /**
   * Extract performance trends from traces
   */
  private static extractPerformanceTrends(traces: GenericTrace[]): PerformanceTrend[] {
    return traces.map(trace => ({
      timestamp: trace.timestamp,
      metric: 'duration',
      value: trace.performance?.duration || 0,
      context: { traceType: trace.traceType }
    }));
  }

  /**
   * Calculate convergence score from performance trends
   */
  private static calculateConvergence(trends: PerformanceTrend[]): number {
    if (trends.length < 2) return 0.5;
    
    // Simple convergence calculation: check if performance is stabilizing
    const recentTrends = trends.slice(-10); // Last 10 measurements
    const variance = this.calculateVariance(recentTrends.map(t => t.value));
    
    // Lower variance indicates better convergence
    return Math.max(0, 1 - (variance / 1000)); // Normalize to 0-1
  }

  /**
   * Calculate adaptation rate from traces
   */
  private static calculateAdaptationRate(traces: GenericTrace[]): number {
    if (traces.length < 2) return 0.5;
    
    // Calculate improvement rate over time
    const sortedTraces = traces.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const early = sortedTraces.slice(0, Math.floor(sortedTraces.length / 3));
    const recent = sortedTraces.slice(-Math.floor(sortedTraces.length / 3));
    
    const earlyAvg = early.reduce((sum, t) => sum + (t.performance?.duration || 0), 0) / early.length;
    const recentAvg = recent.reduce((sum, t) => sum + (t.performance?.duration || 0), 0) / recent.length;
    
    // Higher adaptation rate if recent performance is better (lower duration)
    const improvement = Math.max(0, (earlyAvg - recentAvg) / earlyAvg);
    return Math.min(1, improvement);
  }

  /**
   * Calculate exploration efficiency
   */
  private static calculateExplorationEfficiency(traces: GenericTrace[]): number {
    const uniqueContexts = new Set(traces.map(t => JSON.stringify(t.context)));
    return Math.min(1, uniqueContexts.size / traces.length);
  }

  /**
   * Calculate knowledge retention
   */
  private static calculateKnowledgeRetention(traces: GenericTrace[]): number {
    // Simple retention calculation based on consistent performance
    const performances = traces.map(t => t.performance?.duration || 0);
    const consistency = 1 - (this.calculateVariance(performances) / 1000);
    return Math.max(0, Math.min(1, consistency));
  }

  /**
   * Remove duplicate traces
   */
  private static deduplicateTraces(traces: GenericTrace[]): GenericTrace[] {
    const seen = new Set<string>();
    return traces.filter(trace => {
      const key = `${trace.traceType}-${JSON.stringify(trace.context)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate knowledge preservation after compression
   */
  private static calculateKnowledgePreservation(
    original: GenericTrace[],
    compressed: GenericTrace[]
  ): number {
    if (original.length === 0) return 1;
    
    const originalPatterns = this.extractUniquePatterns(original);
    const compressedPatterns = this.extractUniquePatterns(compressed);
    
    return compressedPatterns.length / originalPatterns.length;
  }

  /**
   * Extract unique patterns from traces
   */
  private static extractUniquePatterns(traces: GenericTrace[]): string[] {
    const patterns = new Set<string>();
    traces.forEach(trace => {
      patterns.add(`${trace.traceType}-${trace.context.action || 'unknown'}`);
    });
    return Array.from(patterns);
  }

  /**
   * Calculate time span of traces in milliseconds
   */
  private static getTimeSpan(traces: GenericTrace[]): number {
    if (traces.length < 2) return 0;
    
    const timestamps = traces.map(t => t.timestamp.getTime());
    return Math.max(...timestamps) - Math.min(...timestamps);
  }

  /**
   * Calculate variance of a number array
   */
  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return variance;
  }

  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Merge configuration objects safely
   */
  static mergeConfigs<T extends Record<string, any>>(
    defaultConfig: T,
    userConfig: Partial<T>
  ): T {
    const merged = this.deepClone(defaultConfig);
    
    for (const key in userConfig) {
      if (userConfig[key] !== undefined) {
        if (typeof userConfig[key] === 'object' && userConfig[key] !== null) {
          (merged as any)[key] = { ...merged[key], ...userConfig[key] };
        } else {
          (merged as any)[key] = userConfig[key];
        }
      }
    }
    
    return merged;
  }

  /**
   * Format timestamp for logging
   */
  static formatTimestamp(date: Date = new Date()): string {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * Create a simple hash of a string
   */
  static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
} 