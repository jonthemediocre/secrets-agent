/**
 * Core interfaces for the MCP Bridge and Agent system
 * Zero duplication, comprehensive type safety
 */

export interface MCPEndpointConfig {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'custom';
  baseUrl?: string;
  url?: string;
  apiKey?: string;
  model?: string;
  timeout?: number;
  enabled: boolean;
  status?: string;
  toolCount?: number;
  category?: string;
  description?: string;
  retryConfig?: {
    maxRetries: number;
    backoffFactor: number;
  };
  rateLimiting?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  required: string[];
  endpoint: string;
  category: string;
  version: string;
  enabled: boolean;
}

export enum MCPOperationState {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface MCPOperationStatus {
  operationId: string;
  status: MCPOperationState;
  startTime: Date;
  endTime?: Date;
  progress: number;
  bridgeId: string;
  toolName: string;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface MCPServiceStatus {
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  bridgeCount: number;
  toolCount: number;
  toolsCached: number;
  activeJobs: number;
  lastError?: string;
  performance?: {
    avgResponseTime: number;
    totalRequests: number;
    errorRate: number;
  };
}

export interface MCPExecutionResult {
  success: boolean;
  executionTime: number;
  bridgeId: string;
  toolName: string;
  timestamp: string;
  status: 'success' | 'error' | 'timeout';
  jobId: string;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface MCPTaskPayload {
  action: string;
  toolName: string;
  jobId: string;
  parameters?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffFactor: number;
  };
}

export interface MCPTaskResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  retries?: number;
  metadata?: Record<string, any>;
}

export interface MCPBridgeServiceConfig {
  endpoints: MCPEndpointConfig[];
  globalTimeout: number;
  maxConcurrentJobs: number;
  enableCaching: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffFactor: number;
    retryableErrors: string[];
  };
  rateLimiting: {
    globalLimit: number;
    perEndpointLimit: number;
    windowMs: number;
  };
  monitoring: {
    enableMetrics: boolean;
    metricsInterval: number;
    healthCheckInterval: number;
  };
}

export interface SecurityConfig {
  allowedDirectories: string[];
  maxFileSize: number;
  commandTimeout: number;
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
  };
  validation: {
    enableInputSanitization: boolean;
    enablePathValidation: boolean;
    enableCommandValidation: boolean;
  };
  audit: {
    enableAuditLogging: boolean;
    logSensitiveData: boolean;
    maxAuditEntries: number;
  };
}

export interface AgentConfiguration {
  security: SecurityConfig;
  mcp: MCPBridgeServiceConfig;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'console' | 'file' | 'both';
    auditEnabled: boolean;
  };
  performance: {
    maxMemoryUsage: number;
    gcThreshold: number;
    enableProfiling: boolean;
  };
}

// Re-export error types for convenience
export { BaseError, ErrorCategory, ErrorSeverity } from '../utils/error-types';

// Authentication types
export interface UserContext {
  id: string;
  username: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  lastActivity: Date;
}

export interface AuthenticatedRequest {
  user: UserContext;
  [key: string]: any;
}

// Project scanning types
export interface ScanResult {
  success: boolean;
  path: string;
  scanType: 'secrets' | 'vulnerabilities' | 'all';
  results: {
    secrets?: SecretDetection[];
    vulnerabilities?: VulnerabilityDetection[];
    summary?: ScanSummary;
  };
  executionTime: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SecretDetection {
  type: string;
  pattern: string;
  file: string;
  line: number;
  confidence: 'low' | 'medium' | 'high';
  severity: 'info' | 'warning' | 'critical';
  description: string;
  recommendation: string;
}

export interface VulnerabilityDetection {
  id: string;
  package: string;
  version: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  references: string[];
}

export interface ScanSummary {
  totalFiles: number;
  filesScanned: number;
  secretsFound: number;
  vulnerabilitiesFound: number;
  highSeverityIssues: number;
  recommendations: string[];
}

// MCP Job Management
export interface JobManager {
  createJob(payload: MCPTaskPayload): Promise<string>;
  getJob(jobId: string): Promise<MCPOperationStatus | null>;
  cancelJob(jobId: string): Promise<boolean>;
  listActiveJobs(): Promise<MCPOperationStatus[]>;
  cleanup(): Promise<void>;
}

// Performance monitoring
export interface PerformanceMetrics {
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  activeConnections: number;
}

// Health check
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    [serviceName: string]: {
      status: 'up' | 'down' | 'degraded';
      responseTime?: number;
      lastCheck: string;
      error?: string;
    };
  };
  metrics: PerformanceMetrics;
} 