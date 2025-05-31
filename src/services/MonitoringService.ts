import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { MCPServer } from './MCPServer';
import { APIGateway } from './APIGateway';

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

export class MonitoringService extends EventEmitter {
  private metrics: Map<string, Metric> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private alerts: Alert[] = [];
  private mcpServer: MCPServer;
  private apiGateway: APIGateway;

  constructor(mcpServer: MCPServer, apiGateway: APIGateway) {
    super();
    this.mcpServer = mcpServer;
    this.apiGateway = apiGateway;
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
} 