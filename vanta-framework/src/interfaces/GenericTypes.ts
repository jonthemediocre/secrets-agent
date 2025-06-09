/**
 * Generic Types for VANTA Framework
 * App-agnostic interfaces for universal agent intelligence
 */

// Core Generic Agent Interface
export interface GenericAgent {
  // Core identification
  agentId: string;                          // Unique agent identifier
  agentType: string;                        // Agent type classification
  version: string;                          // Agent version
  
  // Core capabilities
  capabilities: {                           // Agent capabilities
    planning: boolean;                      // Can plan tasks
    execution: boolean;                     // Can execute tasks
    learning: boolean;                      // Can learn from experience
    collaboration: boolean;                 // Can collaborate with others
    adaptation: boolean;                    // Can adapt behavior
  };
  
  // Core lifecycle methods
  initialize(config: GenericAgentConfig): Promise<void>;
  execute(task: GenericTask): Promise<GenericTaskResult>;
  shutdown(): Promise<void>;
  
  // Core state management
  getState(): Promise<GenericAgentState>;
  setState(state: GenericAgentState): Promise<void>;
  
  // Core communication
  sendMessage(target: string, message: any): Promise<void>;
  receiveMessage(sender: string, message: any): Promise<void>;
}

// Generic Agent Configuration
export interface GenericAgentConfig {
  agentId: string;                          // Agent identifier
  agentType: string;                        // Agent type
  capabilities: {                           // Agent capabilities
    planning: boolean;
    execution: boolean;
    learning: boolean;
    collaboration: boolean;
    adaptation: boolean;
  };
  performance: {                            // Performance settings
    maxConcurrentTasks: number;             // Max simultaneous tasks
    responseTimeout: number;                // Response timeout (ms)
    memoryLimit: number;                    // Memory limit (MB)
  };
  learning: {                               // Learning configuration
    enabled: boolean;                       // Learning enabled
    learningRate: number;                   // Learning rate (0-1)
    explorationRate: number;                // Exploration rate (0-1)
  };
  collaboration: {                          // Collaboration settings
    enabled: boolean;                       // Collaboration enabled
    maxSwarmSize: number;                   // Max swarm participation
    communicationTimeout: number;           // Communication timeout (ms)
  };
}

// Generic Agent State
export interface GenericAgentState {
  agentId: string;                          // Agent identifier
  status: 'initializing' | 'ready' | 'busy' | 'error' | 'shutdown';
  currentTask?: string;                     // Current task ID
  performance: {                            // Performance metrics
    tasksCompleted: number;                 // Total completed tasks
    averageResponseTime: number;            // Average response time (ms)
    successRate: number;                    // Success rate (0-1)
    errorCount: number;                     // Total errors
  };
  learning: {                               // Learning state
    experienceCount: number;                // Total experiences
    learningScore: number;                  // Learning effectiveness (0-1)
    adaptationLevel: number;                // Adaptation capability (0-1)
  };
  collaboration: {                          // Collaboration state
    activeSwarms: string[];                 // Active swarm IDs
    collaborationScore: number;             // Collaboration effectiveness (0-1)
    communicationCount: number;             // Total communications
  };
  lastUpdate: Date;                         // Last state update
}

// Generic Task Interface
export interface GenericTask {
  taskId: string;                           // Unique task identifier
  taskType: string;                         // Task type classification
  priority: number;                         // Task priority (1-10)
  deadline?: Date;                          // Optional deadline
  requirements: Record<string, any>;        // Task requirements
  context: Record<string, any>;             // Execution context
  dependencies: string[];                   // Task dependencies
  metadata: {                               // Task metadata
    createdAt: Date;                        // Creation timestamp
    createdBy: string;                      // Creator identifier
    expectedDuration?: number;              // Expected duration (ms)
  };
}

// Generic Task Result Interface
export interface GenericTaskResult {
  taskId: string;                           // Associated task ID
  status: 'success' | 'failure' | 'partial' | 'cancelled';
  result: any;                              // Task output
  metadata: {                               // Result metadata
    executionTime: number;                  // Execution time (ms)
    resourceUsage: Record<string, number>;  // Resource consumption
    errorDetails?: string;                  // Error information if failed
    completedAt: Date;                      // Completion timestamp
  };
  artifacts: Record<string, any>;           // Generated artifacts
  insights: {                               // Generated insights
    performanceImpact: number;              // Performance impact (-1 to 1)
    learningValue: number;                  // Learning value (0-1)
    transferability: number;                // Knowledge transferability (0-1)
  };
}

// Generic Trace Interface
export interface GenericTrace {
  traceId: string;                          // Unique trace identifier
  agentId: string;                          // Associated agent ID
  timestamp: Date;                          // Trace timestamp
  traceType: 'task_execution' | 'learning_event' | 'communication' | 'state_change';
  data: Record<string, any>;                // Trace data
  performance: {                            // Performance metrics
    duration: number;                       // Operation duration (ms)
    memoryUsage: number;                    // Memory usage (MB)
    cpuUsage: number;                       // CPU usage (%)
  };
  context: Record<string, any>;             // Trace context
}

// Generic Pattern Interface
export interface GenericPattern {
  patternId: string;                        // Unique pattern identifier
  patternType: 'success' | 'failure' | 'optimization' | 'adaptation';
  frequency: number;                        // Pattern occurrence count
  confidence: number;                       // Pattern confidence (0-1)
  transferability: number;                  // Cross-domain transferability (0-1)
  extractedKnowledge: {                     // Extracted insights
    actionPatterns: string[];               // Common action sequences
    contextualTriggers: string[];           // Context patterns
    successFactors: string[];               // Success indicators
    riskFactors: string[];                  // Risk indicators
  };
  compression: {                            // Compression metrics
    originalSize: number;                   // Original data size (bytes)
    compressedSize: number;                 // Compressed data size (bytes)
    compressionRatio: number;               // Compression efficiency (0-1)
  };
  symbolicRepresentation: string;           // Symbolic pattern encoding
}

// Generic Framework Configuration
export interface VantaFrameworkConfig {
  frameworkId: string;                      // Framework instance ID
  mode: 'development' | 'production' | 'testing';
  storage: {                                // Storage configuration
    traceStorageType: 'memory' | 'file' | 'database';
    storageLocation: string;                // Storage location
    compressionEnabled: boolean;            // Enable compression
    retentionPeriod: number;                // Data retention (days)
  };
  performance: {                            // Performance settings
    maxAgents: number;                      // Maximum concurrent agents
    memoryLimit: number;                    // Memory limit (MB)
    cpuThrottling: boolean;                 // Enable CPU throttling
  };
  security: {                               // Security settings
    authenticationRequired: boolean;        // Require authentication
    encryptionEnabled: boolean;             // Enable data encryption
    auditingEnabled: boolean;               // Enable audit logging
  };
  learning: {                               // Learning configuration
    globalLearningEnabled: boolean;         // Enable cross-agent learning
    knowledgeTransferEnabled: boolean;      // Enable knowledge transfer
    adaptationRate: number;                 // Global adaptation rate (0-1)
  };
  monitoring: {                             // Monitoring settings
    metricsEnabled: boolean;                // Enable metrics collection
    alertingEnabled: boolean;               // Enable alerting
    monitoringInterval: number;             // Monitoring frequency (seconds)
  };
}

// Generic Metrics Interfaces
export interface PerformanceTrend {
  timestamp: Date;                          // Measurement timestamp
  metric: string;                           // Metric name
  value: number;                            // Metric value
  context: Record<string, any>;             // Measurement context
}

export interface LearningPolicy {
  policyId: string;                         // Unique policy identifier
  agentId: string;                          // Associated agent ID
  learningRate: number;                     // Learning rate (0-1)
  explorationRate: number;                  // Exploration rate (0-1)
  adaptationThreshold: number;              // Adaptation threshold (0-1)
  rewardWeights: Record<string, number>;    // Reward type weights
  lastUpdate: Date;                         // Last policy update
}

export interface LearningMetrics {
  agentId: string;                          // Agent identifier
  convergenceScore: number;                 // Learning convergence (0-1)
  adaptationRate: number;                   // Adaptation speed (0-1)
  explorationEfficiency: number;           // Exploration effectiveness (0-1)
  knowledgeRetention: number;               // Knowledge retention (0-1)
  transferSuccess: number;                  // Knowledge transfer success (0-1)
  timestamp: Date;                          // Metrics timestamp
}

export interface CompressionResult {
  compressionId: string;                    // Unique compression ID
  inputSize: number;                        // Input data size (bytes)
  outputSize: number;                       // Output data size (bytes)
  compressionRatio: number;                 // Compression efficiency (0-1)
  knowledgePreserved: number;               // Knowledge preservation (0-1)
  processingTime: number;                   // Processing time (ms)
  patternsExtracted: number;                // Number of patterns extracted
}

// Framework Health and Status
export interface FrameworkHealthReport {
  frameworkId: string;                      // Framework identifier
  timestamp: Date;                          // Report timestamp
  overallHealth: number;                    // Overall health score (0-1)
  components: {                             // Component health
    traceMemory: number;                    // Trace memory health (0-1)
    reinforcementLoop: number;              // RFL health (0-1)
    deltaModeling: number;                  // Delta modeling health (0-1)
    collapseEvaluation: number;             // Collapse evaluation health (0-1)
    swarmIntelligence: number;              // Swarm intelligence health (0-1)
  };
  agents: {                                 // Agent health summary
    totalAgents: number;                    // Total agent count
    activeAgents: number;                   // Active agent count
    healthyAgents: number;                  // Healthy agent count
    averageHealth: number;                  // Average agent health (0-1)
  };
  performance: {                            // Performance metrics
    averageResponseTime: number;            // Average response time (ms)
    throughput: number;                     // Tasks per second
    errorRate: number;                      // Error rate (0-1)
    resourceUtilization: number;            // Resource usage (0-1)
  };
  recommendations: string[];                // Health recommendations
}

// Event and Filter Types
export interface TraceFilter {
  agentId?: string;                         // Filter by agent ID
  traceType?: string;                       // Filter by trace type
  startTime?: Date;                         // Filter start time
  endTime?: Date;                           // Filter end time
  context?: Record<string, any>;            // Filter by context
  limit?: number;                           // Maximum results
}

export interface RetentionPolicy {
  maxAge: number;                           // Maximum age (days)
  maxSize: number;                          // Maximum size (MB)
  compressionThreshold: number;             // Compression threshold (days)
  archiveOldData: boolean;                  // Archive old data
}

// Utility types for better type safety
export type AgentStatus = 'initializing' | 'ready' | 'busy' | 'error' | 'shutdown';
export type TaskStatus = 'success' | 'failure' | 'partial' | 'cancelled';
export type PatternType = 'success' | 'failure' | 'optimization' | 'adaptation';
export type TraceType = 'task_execution' | 'learning_event' | 'communication' | 'state_change';
export type StorageType = 'memory' | 'file' | 'database';
export type FrameworkMode = 'development' | 'production' | 'testing'; 