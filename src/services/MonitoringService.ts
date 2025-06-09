import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { MCPServer } from './MCPServer';
import { APIGateway } from './APIGateway';
import AgentBridge from './AgentBridge';
import CICDIntegration from './CICDIntegration';

const logger = createLogger('MonitoringService');

export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  description: string;
  values: MetricValue[];
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastCheck: number;
  details?: any;
  check?: () => Promise<Omit<HealthCheck, 'name' | 'lastCheck' | 'check'>>;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  source: string;
  data?: any;
}

export interface MonitoringConfig {
  enabled: boolean;
  scanIntervalMinutes: number;
  autoImportSecrets: boolean;
  enableAlerts: boolean;
  alertThresholds: {
    newSecretsFound: number;
    criticalRiskSecrets: number;
  };
}

export class MonitoringService extends EventEmitter {
  private metrics: Map<string, Metric> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private alerts: Alert[] = [];
  private mcpServer: MCPServer;
  private apiGateway: APIGateway;
  private config: MonitoringConfig;
  private agentBridge: AgentBridge;
  private cicdIntegration: CICDIntegration;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(mcpServer: MCPServer, apiGateway: APIGateway, config: MonitoringConfig) {
    super();
    this.mcpServer = mcpServer;
    this.apiGateway = apiGateway;
    this.config = config;
    this.agentBridge = new AgentBridge();
    this.cicdIntegration = new CICDIntegration({
      enabled: true,
      blockSecrets: true,
      scanPatterns: [],
      allowedFiles: ['node_modules', '.git', 'dist', 'build'],
      notifications: {}
    });
    this.setupMetrics();
    this.setupHealthChecks();
    this.setupEventListeners();
  }

  /**
   * Initialize monitoring
   */
  public async initialize(): Promise<void> {
    logger.info('Initializing monitoring service');
    await this.runHealthChecks();
    this.startMetricsCollection();
  }

  /**
   * Setup default metrics
   */
  private setupMetrics() {
    // API metrics
    this.registerMetric({
      name: 'http_requests_total',
      type: 'counter',
      description: 'Total HTTP requests'
    });

    this.registerMetric({
      name: 'http_request_duration_ms',
      type: 'histogram',
      description: 'HTTP request duration'
    });

    // MCP metrics
    this.registerMetric({
      name: 'mcp_requests_total',
      type: 'counter',
      description: 'Total MCP requests'
    });

    this.registerMetric({
      name: 'mcp_request_duration_ms',
      type: 'histogram',
      description: 'MCP request duration'
    });

    // System metrics
    this.registerMetric({
      name: 'system_memory_usage',
      type: 'gauge',
      description: 'System memory usage'
    });

    this.registerMetric({
      name: 'system_cpu_usage',
      type: 'gauge',
      description: 'System CPU usage'
    });
  }

  /**
   * Setup health checks
   */
  private setupHealthChecks() {
    this.registerHealthCheck('api_gateway', async () => {
      // Check API Gateway health
      return {
        status: 'healthy',
        details: {
          uptime: process.uptime()
        }
      };
    });

    this.registerHealthCheck('mcp_server', async () => {
      // Check MCP Server health
      const toolCount = this.mcpServer.registry.listTools().length;
      return {
        status: toolCount > 0 ? 'healthy' : 'degraded',
        details: {
          toolCount,
          registryVersion: this.mcpServer.registry.getVersion()
        }
      };
    });

    this.registerHealthCheck('system', async () => {
      // Check system health
      const memoryUsage = process.memoryUsage();
      return {
        status: 'healthy',
        details: {
          memory: {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external
          },
          uptime: process.uptime()
        }
      };
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners() {
    // Listen for API Gateway events
    this.apiGateway.on('request', (data: any) => {
      this.recordMetric('http_requests_total', 1, {
        method: data.method,
        path: data.path,
        status: data.status
      });

      this.recordMetric('http_request_duration_ms', data.duration, {
        method: data.method,
        path: data.path
      });
    });

    // Listen for MCP Server events
    this.mcpServer.on('request', (data: any) => {
      this.recordMetric('mcp_requests_total', 1, {
        tool: data.tool,
        status: data.status
      });

      this.recordMetric('mcp_request_duration_ms', data.duration, {
        tool: data.tool
      });
    });

    // System metrics collection
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      this.recordMetric('system_memory_usage', memoryUsage.heapUsed / memoryUsage.heapTotal);
      
      // Simple CPU usage estimation
      const startUsage = process.cpuUsage();
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const totalUsage = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
        this.recordMetric('system_cpu_usage', totalUsage);
      }, 100);
    }, 5000);
  }

  /**
   * Register a new metric
   */
  public registerMetric(metric: Omit<Metric, 'values'>) {
    this.metrics.set(metric.name, {
      ...metric,
      values: []
    });
  }

  /**
   * Record a metric value
   */
  public recordMetric(name: string, value: number, labels?: Record<string, string>) {
    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn('Attempting to record unknown metric', { name });
      return;
    }

    metric.values.push({
      value,
      timestamp: Date.now(),
      labels
    });

    // Keep only last 1000 values
    if (metric.values.length > 1000) {
      metric.values = metric.values.slice(-1000);
    }

    this.emit('metric', { name, value, labels });
  }

  /**
   * Register a health check
   */
  public registerHealthCheck(name: string, check: () => Promise<Omit<HealthCheck, 'name' | 'lastCheck' | 'check'>>) {
    this.healthChecks.set(name, {
      name,
      status: 'unhealthy',
      lastCheck: 0,
      check
    });
  }

  /**
   * Run all health checks
   */
  public async runHealthChecks(): Promise<Map<string, HealthCheck>> {
    const checks = Array.from(this.healthChecks.entries());
    
    await Promise.all(checks.map(async ([name, check]) => {
      try {
        if (!check.check) {
          throw new Error('Health check not implemented');
        }
        const result = await check.check();
        this.healthChecks.set(name, {
          name,
          ...result,
          lastCheck: Date.now(),
          check: check.check
        });
      } catch (error) {
        logger.error('Health check failed', {
          check: name,
          error: error instanceof Error ? error.message : String(error)
        });
        
        this.healthChecks.set(name, {
          name,
          status: 'unhealthy',
          lastCheck: Date.now(),
          details: {
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }));

    return this.healthChecks;
  }

  /**
   * Create an alert
   */
  public createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Alert {
    const newAlert = {
      ...alert,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    this.alerts.push(newAlert);
    this.emit('alert', newAlert);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    return newAlert;
  }

  /**
   * Get metrics
   */
  public getMetrics(filter?: { name?: string; type?: Metric['type'] }): Metric[] {
    const metrics = Array.from(this.metrics.values());
    
    if (!filter) {
      return metrics;
    }

    return metrics.filter(metric => {
      if (filter.name && !metric.name.includes(filter.name)) {
        return false;
      }
      if (filter.type && metric.type !== filter.type) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get health status
   */
  public getHealthStatus(): {
    status: HealthCheck['status'];
    checks: HealthCheck[];
  } {
    const checks = Array.from(this.healthChecks.values());
    const status = checks.some(check => check.status === 'unhealthy')
      ? 'unhealthy'
      : checks.some(check => check.status === 'degraded')
        ? 'degraded'
        : 'healthy';

    return {
      status,
      checks
    };
  }

  /**
   * Get alerts
   */
  public getAlerts(filter?: {
    severity?: Alert['severity'];
    source?: string;
    since?: number;
  }): Alert[] {
    if (!filter) {
      return this.alerts;
    }

    return this.alerts.filter(alert => {
      if (filter.severity && alert.severity !== filter.severity) {
        return false;
      }
      if (filter.source && alert.source !== filter.source) {
        return false;
      }
      if (filter.since && alert.timestamp < filter.since) {
        return false;
      }
      return true;
    });
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection() {
    // Run health checks every minute
    setInterval(() => {
      this.runHealthChecks().catch(error => {
        logger.error('Failed to run health checks', {
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }, 60000);

    logger.info('Metrics collection started');
  }

  /**
   * Start continuous monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Monitoring service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting continuous secret monitoring', {
      intervalMinutes: this.config.scanIntervalMinutes,
      autoImport: this.config.autoImportSecrets
    });

    // Initial setup
    await this.setupInitialConfiguration();

    // Start continuous scanning
    await this.agentBridge.setupContinuousMonitoring(this.config.scanIntervalMinutes);

    // Setup periodic health checks
    this.intervalId = setInterval(async () => {
      await this.performHealthCheck();
    }, 5 * 60 * 1000); // Every 5 minutes

    logger.info('Continuous monitoring started successfully');
  }

  /**
   * Stop continuous monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Continuous monitoring stopped');
  }

  /**
   * Get monitoring status
   */
  async getStatus() {
    const agentStatus = await this.agentBridge.getAgentStatus();
    
    return {
      isRunning: this.isRunning,
      config: this.config,
      agentSystem: agentStatus,
      lastHealthCheck: new Date().toISOString(),
      uptime: this.isRunning ? 'Active' : 'Stopped'
    };
  }

  /**
   * Setup initial configuration
   */
  private async setupInitialConfiguration(): Promise<void> {
    try {
      // Install CI/CD hooks if not present
      await this.cicdIntegration.installPreCommitHooks();
      
      // Create GitHub Actions workflow
      await this.cicdIntegration.createGitHubActionsWorkflow();
      
      logger.info('Initial CI/CD configuration completed');
    } catch (error) {
      logger.warn('Failed to setup initial configuration:', error);
    }
  }

  /**
   * Perform periodic health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      logger.info('🔍 Performing monitoring health check...');
      
      // Check if agent system is responsive
      const agentStatus = await this.agentBridge.getAgentStatus();
      
      if (agentStatus.agentSystemStatus !== 'ready' && agentStatus.agentSystemStatus !== 'scanning') {
        logger.warn('Agent system not in healthy state:', agentStatus.agentSystemStatus);
      }

      // Check for any critical issues
      const criticalIssues = [];
      
      if (agentStatus.statistics.secretsManaged === 0) {
        criticalIssues.push('No secrets are currently managed');
      }

      if (criticalIssues.length > 0) {
        logger.warn('Critical monitoring issues detected:', criticalIssues);
      }

      logger.info('Health check completed', {
        agentStatus: agentStatus.agentSystemStatus,
        secretsManaged: agentStatus.statistics.secretsManaged,
        issues: criticalIssues.length
      });

    } catch (error) {
      logger.error('Health check failed:', error);
    }
  }

  /**
   * Trigger manual scan
   */
  async triggerManualScan(): Promise<any> {
    try {
      logger.info('🚀 Triggering manual secret discovery scan...');
      
      const result = await this.agentBridge.executeRealDiscovery();
      
      // Auto-import if configured
      if (this.config.autoImportSecrets && result.discoveries.length > 0) {
        // Find default vault for import
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        const vault = await prisma.vault.findFirst();
        
        if (vault) {
          const importedCount = await this.agentBridge.autoImportSecrets(
            result.discoveries, 
            vault.id
          );
          
          result.importedCount = importedCount;
          logger.info(`Auto-imported ${importedCount} secrets during manual scan`);
        }
      }

      // Check alert thresholds
      if (this.config.enableAlerts) {
        await this.checkAlertThresholds(result);
      }

      return result;
    } catch (error) {
      logger.error('Manual scan failed:', error);
      throw error;
    }
  }

  /**
   * Check if alert thresholds are exceeded
   */
  private async checkAlertThresholds(result: any): Promise<void> {
    const criticalSecrets = result.discoveries.filter((d: any) => d.risk === 'critical');
    
    if (result.secretsFound >= this.config.alertThresholds.newSecretsFound) {
      logger.warn(`ALERT: ${result.secretsFound} new secrets found (threshold: ${this.config.alertThresholds.newSecretsFound})`);
    }

    if (criticalSecrets.length >= this.config.alertThresholds.criticalRiskSecrets) {
      logger.warn(`ALERT: ${criticalSecrets.length} critical risk secrets found (threshold: ${this.config.alertThresholds.criticalRiskSecrets})`);
    }
  }
}

// Create singleton instance
const defaultConfig: MonitoringConfig = {
  enabled: true,
  scanIntervalMinutes: 30,
  autoImportSecrets: true,
  enableAlerts: true,
  alertThresholds: {
    newSecretsFound: 5,
    criticalRiskSecrets: 1
  }
};

export const monitoringService = new MonitoringService(new MCPServer(), new APIGateway(), defaultConfig);

export default MonitoringService; 