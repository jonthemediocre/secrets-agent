/**
 * Generic Trace Memory System for VANTA Framework
 * App-agnostic persistent agent state storage and experience tracking
 */

import * as yaml from 'yaml';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  GenericTrace, 
  GenericAgentState, 
  PerformanceTrend, 
  TraceFilter, 
  CompressionResult, 
  RetentionPolicy,
  TraceType 
} from '../interfaces/GenericTypes';

/**
 * Generic Trace Memory Interface
 * Defines the contract for trace storage systems across all domains
 */
export interface GenericTraceMemoryInterface {
  // Core trace operations
  storeTrace(agentId: string, trace: GenericTrace): Promise<void>;
  getTraces(agentId: string, filter?: TraceFilter): Promise<GenericTrace[]>;
  getPerformanceTrends(agentId: string): Promise<PerformanceTrend[]>;
  
  // Memory management
  compressTraces(agentId: string): Promise<CompressionResult>;
  purgeOldTraces(retentionPolicy: RetentionPolicy): Promise<void>;
  
  // Cross-domain compatibility
  exportTraces(agentId: string, format: string): Promise<any>;
  importTraces(agentId: string, data: any, format: string): Promise<void>;
  
  // State management
  storeAgentState(agentId: string, state: GenericAgentState): Promise<void>;
  getAgentState(agentId: string): Promise<GenericAgentState | null>;
  
  // System lifecycle
  initialize(config: TraceMemoryConfig): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Trace Memory Configuration
 */
export interface TraceMemoryConfig {
  storageType: 'memory' | 'file' | 'database';
  storageLocation: string;
  compressionEnabled: boolean;
  retentionPeriod: number; // days
  maxMemorySize: number; // MB
  autoCompression: boolean;
  enableMetrics: boolean;
}

/**
 * Generic Trace Memory Implementation
 * File-based storage with YAML persistence for maximum compatibility
 */
export class GenericTraceMemory implements GenericTraceMemoryInterface {
  private traces: Map<string, GenericTrace[]> = new Map();
  private agentStates: Map<string, GenericAgentState> = new Map();
  private config: TraceMemoryConfig;
  private initialized = false;

  constructor(config?: Partial<TraceMemoryConfig>) {
    this.config = {
      storageType: 'file',
      storageLocation: './vanta-traces',
      compressionEnabled: true,
      retentionPeriod: 30,
      maxMemorySize: 100,
      autoCompression: true,
      enableMetrics: true,
      ...config
    };
  }

  /**
   * Initialize the trace memory system
   */
  async initialize(config?: TraceMemoryConfig): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.config.storageType === 'file') {
      await this.ensureDirectoryExists(this.config.storageLocation);
      await this.loadTracesFromDisk();
    }

    this.initialized = true;
  }

  /**
   * Store a trace for an agent
   */
  async storeTrace(agentId: string, trace: GenericTrace): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Validate trace
    this.validateTrace(trace);

    // Store in memory
    if (!this.traces.has(agentId)) {
      this.traces.set(agentId, []);
    }
    this.traces.get(agentId)!.push(trace);

    // Persist to disk if file storage
    if (this.config.storageType === 'file') {
      await this.persistTracesToDisk(agentId);
    }

    // Auto-compression check
    if (this.config.autoCompression) {
      const agentTraces = this.traces.get(agentId)!;
      if (agentTraces.length > 1000) { // Configurable threshold
        await this.compressTraces(agentId);
      }
    }
  }

  /**
   * Get traces for an agent with optional filtering
   */
  async getTraces(agentId: string, filter?: TraceFilter): Promise<GenericTrace[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    let traces = this.traces.get(agentId) || [];

    if (filter) {
      traces = this.applyFilter(traces, filter);
    }

    return traces;
  }

  /**
   * Get performance trends for an agent
   */
  async getPerformanceTrends(agentId: string): Promise<PerformanceTrend[]> {
    const traces = await this.getTraces(agentId);
    const trends: PerformanceTrend[] = [];

    traces.forEach(trace => {
      // Extract performance metrics from traces
      if (trace.performance) {
        trends.push({
          timestamp: trace.timestamp,
          metric: 'duration',
          value: trace.performance.duration,
          context: { traceType: trace.traceType }
        });
        
        trends.push({
          timestamp: trace.timestamp,
          metric: 'memoryUsage',
          value: trace.performance.memoryUsage,
          context: { traceType: trace.traceType }
        });
        
        trends.push({
          timestamp: trace.timestamp,
          metric: 'cpuUsage',
          value: trace.performance.cpuUsage,
          context: { traceType: trace.traceType }
        });
      }
    });

    return trends.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Compress traces for an agent
   */
  async compressTraces(agentId: string): Promise<CompressionResult> {
    const traces = this.traces.get(agentId) || [];
    const inputSize = this.calculateDataSize(traces);
    const startTime = Date.now();

    // Simple compression: remove duplicate traces and compress similar patterns
    const compressedTraces = this.performTraceCompression(traces);
    
    this.traces.set(agentId, compressedTraces);
    
    const outputSize = this.calculateDataSize(compressedTraces);
    const processingTime = Date.now() - startTime;

    const result: CompressionResult = {
      compressionId: `compression-${agentId}-${Date.now()}`,
      inputSize,
      outputSize,
      compressionRatio: inputSize > 0 ? outputSize / inputSize : 1,
      knowledgePreserved: this.calculateKnowledgePreservation(traces, compressedTraces),
      processingTime,
      patternsExtracted: this.extractPatternCount(compressedTraces)
    };

    // Persist compressed traces
    if (this.config.storageType === 'file') {
      await this.persistTracesToDisk(agentId);
    }

    return result;
  }

  /**
   * Purge old traces based on retention policy
   */
  async purgeOldTraces(retentionPolicy: RetentionPolicy): Promise<void> {
    const cutoffDate = new Date(Date.now() - retentionPolicy.maxAge * 24 * 60 * 60 * 1000);

    for (const [agentId, traces] of this.traces.entries()) {
      const filteredTraces = traces.filter(trace => trace.timestamp > cutoffDate);
      this.traces.set(agentId, filteredTraces);
      
      if (this.config.storageType === 'file') {
        await this.persistTracesToDisk(agentId);
      }
    }
  }

  /**
   * Export traces in specified format
   */
  async exportTraces(agentId: string, format: string): Promise<any> {
    const traces = await this.getTraces(agentId);
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(traces, null, 2);
      case 'yaml':
        return yaml.stringify(traces);
      case 'csv':
        return this.convertTracesToCSV(traces);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import traces from specified format
   */
  async importTraces(agentId: string, data: any, format: string): Promise<void> {
    let traces: GenericTrace[];

    switch (format.toLowerCase()) {
      case 'json':
        traces = JSON.parse(data);
        break;
      case 'yaml':
        traces = yaml.parse(data);
        break;
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }

    // Validate imported traces
    traces.forEach(trace => this.validateTrace(trace));

    // Store imported traces
    if (!this.traces.has(agentId)) {
      this.traces.set(agentId, []);
    }
    this.traces.get(agentId)!.push(...traces);

    if (this.config.storageType === 'file') {
      await this.persistTracesToDisk(agentId);
    }
  }

  /**
   * Store agent state
   */
  async storeAgentState(agentId: string, state: GenericAgentState): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.agentStates.set(agentId, state);

    if (this.config.storageType === 'file') {
      await this.persistStateToDisk(agentId, state);
    }
  }

  /**
   * Get agent state
   */
  async getAgentState(agentId: string): Promise<GenericAgentState | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.agentStates.get(agentId) || null;
  }

  /**
   * Shutdown the trace memory system
   */
  async shutdown(): Promise<void> {
    if (this.config.storageType === 'file') {
      // Final save of all data
      for (const agentId of this.traces.keys()) {
        await this.persistTracesToDisk(agentId);
      }
      for (const [agentId, state] of this.agentStates.entries()) {
        await this.persistStateToDisk(agentId, state);
      }
    }
    
    this.traces.clear();
    this.agentStates.clear();
    this.initialized = false;
  }

  // Private helper methods

  private validateTrace(trace: GenericTrace): void {
    if (!trace.traceId || !trace.agentId || !trace.timestamp) {
      throw new Error('Invalid trace: missing required fields');
    }
  }

  private applyFilter(traces: GenericTrace[], filter: TraceFilter): GenericTrace[] {
    let filtered = traces;

    if (filter.traceType) {
      filtered = filtered.filter(t => t.traceType === filter.traceType);
    }

    if (filter.startTime) {
      filtered = filtered.filter(t => t.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      filtered = filtered.filter(t => t.timestamp <= filter.endTime!);
    }

    if (filter.context) {
      filtered = filtered.filter(t => 
        Object.entries(filter.context!).every(([key, value]) => 
          t.context[key] === value
        )
      );
    }

    if (filter.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private async loadTracesFromDisk(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.storageLocation);
      
      for (const file of files) {
        if (file.endsWith('-traces.yaml')) {
          const agentId = file.replace('-traces.yaml', '');
          const filePath = path.join(this.config.storageLocation, file);
          const content = await fs.readFile(filePath, 'utf8');
          const traces = yaml.parse(content) || [];
          this.traces.set(agentId, traces);
        }
        
        if (file.endsWith('-state.yaml')) {
          const agentId = file.replace('-state.yaml', '');
          const filePath = path.join(this.config.storageLocation, file);
          const content = await fs.readFile(filePath, 'utf8');
          const state = yaml.parse(content);
          if (state) {
            this.agentStates.set(agentId, state);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load traces from disk:', error);
    }
  }

  private async persistTracesToDisk(agentId: string): Promise<void> {
    const traces = this.traces.get(agentId) || [];
    const filePath = path.join(this.config.storageLocation, `${agentId}-traces.yaml`);
    const content = yaml.stringify(traces);
    await fs.writeFile(filePath, content, 'utf8');
  }

  private async persistStateToDisk(agentId: string, state: GenericAgentState): Promise<void> {
    const filePath = path.join(this.config.storageLocation, `${agentId}-state.yaml`);
    const content = yaml.stringify(state);
    await fs.writeFile(filePath, content, 'utf8');
  }

  private calculateDataSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private performTraceCompression(traces: GenericTrace[]): GenericTrace[] {
    // Simple compression: remove duplicates and merge similar traces
    const compressed: GenericTrace[] = [];
    const seen = new Set<string>();

    for (const trace of traces) {
      const key = `${trace.traceType}-${JSON.stringify(trace.context)}`;
      if (!seen.has(key)) {
        compressed.push(trace);
        seen.add(key);
      }
    }

    return compressed;
  }

  private calculateKnowledgePreservation(original: GenericTrace[], compressed: GenericTrace[]): number {
    if (original.length === 0) return 1;
    
    // Simple metric: ratio of preserved unique trace types and contexts
    const originalUnique = new Set(original.map(t => `${t.traceType}-${JSON.stringify(t.context)}`));
    const compressedUnique = new Set(compressed.map(t => `${t.traceType}-${JSON.stringify(t.context)}`));
    
    return compressedUnique.size / originalUnique.size;
  }

  private extractPatternCount(traces: GenericTrace[]): number {
    const patterns = new Set(traces.map(t => t.traceType));
    return patterns.size;
  }

  private convertTracesToCSV(traces: GenericTrace[]): string {
    if (traces.length === 0) return '';

    const headers = ['traceId', 'agentId', 'timestamp', 'traceType', 'duration', 'memoryUsage', 'cpuUsage'];
    const rows = traces.map(trace => [
      trace.traceId,
      trace.agentId,
      trace.timestamp.toISOString(),
      trace.traceType,
      trace.performance?.duration || 0,
      trace.performance?.memoryUsage || 0,
      trace.performance?.cpuUsage || 0
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
} 