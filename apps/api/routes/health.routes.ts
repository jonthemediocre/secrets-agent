import { Router, Request, Response } from 'express';
import { VaultAgent } from '../../../vault/VaultAgent';
import { createLogger } from '../../../src/utils/logger';
import os from 'os';

const logger = createLogger('HealthRoutes');
const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      responseTime?: number;
      details?: unknown;
    };
  };
}

interface DetailedHealthStatus extends HealthStatus {
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      loadAverage: number[];
    };
    disk?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  dependencies: {
    vault: {
      status: 'pass' | 'fail';
      responseTime?: number;
      error?: string;
    };
    database?: {
      status: 'pass' | 'fail';
      responseTime?: number;
      error?: string;
    };
  };
}

// Basic health check - minimal response time
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const status: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };

  res.status(200).json(status);
});

// Liveness probe - Kubernetes/Docker health check
router.get('/live', async (req: Request, res: Response): Promise<void> => {
  // Simple check that the process is running
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness probe - Check if app is ready to serve traffic
router.get('/ready', async (req: Request, res: Response): Promise<void> => {
  const checks: HealthStatus['checks'] = {};
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  // Check vault connectivity
  try {
    const vaultPath = process.env.VAULT_PATH || './vault/secrets.sops.yaml';
    const vaultAgent = new VaultAgent(vaultPath);
    
    const startTime = Date.now();
    await vaultAgent.loadVault();
    const responseTime = Date.now() - startTime;
    
    checks.vault = {
      status: 'pass',
      responseTime,
      message: 'Vault accessible'
    };
  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown vault error';
    checks.vault = {
      status: 'fail',
      message: errorMessage
    };
    overallStatus = 'unhealthy';
  }

  // Check memory usage
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryPercentage = (usedMemory / totalMemory) * 100;
  
  checks.memory = {
    status: memoryPercentage < 90 ? 'pass' : 'warn',
    details: {
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
      percentage: Math.round(memoryPercentage)
    }
  };

  if (memoryPercentage >= 95) {
    overallStatus = 'unhealthy';
  } else if (memoryPercentage >= 80) {
    overallStatus = 'degraded';
  }

  const status: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(statusCode).json(status);
});

// Detailed health check with system metrics
router.get('/detailed', async (req: Request, res: Response): Promise<void> => {
  const checks: HealthStatus['checks'] = {};
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  // Memory check
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryPercentage = (usedMemory / totalMemory) * 100;

  checks.memory = {
    status: memoryPercentage < 80 ? 'pass' : memoryPercentage < 90 ? 'warn' : 'fail',
    details: {
      used: Math.round(usedMemory / 1024 / 1024),
      total: Math.round(totalMemory / 1024 / 1024),
      percentage: Math.round(memoryPercentage)
    }
  };

  // CPU check
  const loadAverage = os.loadavg();
  const cpuCount = os.cpus().length;
  const avgLoad = loadAverage[0] / cpuCount;

  checks.cpu = {
    status: avgLoad < 0.7 ? 'pass' : avgLoad < 0.9 ? 'warn' : 'fail',
    details: {
      loadAverage: loadAverage.map(l => Math.round(l * 100) / 100),
      cores: cpuCount,
      averageLoad: Math.round(avgLoad * 100) / 100
    }
  };

  // Vault check
  try {
    const vaultPath = process.env.VAULT_PATH || './vault/secrets.sops.yaml';
    const vaultAgent = new VaultAgent(vaultPath);
    
    const startTime = Date.now();
    await vaultAgent.loadVault();
    const responseTime = Date.now() - startTime;
    
    checks.vault = {
      status: responseTime < 1000 ? 'pass' : responseTime < 3000 ? 'warn' : 'fail',
      responseTime,
      message: `Vault loaded in ${responseTime}ms`
    };
  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown vault error';
    checks.vault = {
      status: 'fail',
      message: errorMessage
    };
    overallStatus = 'unhealthy';
  }

  // Determine overall status
  const failedChecks = Object.values(checks).filter(check => check.status === 'fail');
  const warnChecks = Object.values(checks).filter(check => check.status === 'warn');

  if (failedChecks.length > 0) {
    overallStatus = 'unhealthy';
  } else if (warnChecks.length > 0) {
    overallStatus = 'degraded';
  }

  const detailedStatus: DetailedHealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks,
    system: {
      memory: {
        used: Math.round(usedMemory / 1024 / 1024),
        total: Math.round(totalMemory / 1024 / 1024),
        percentage: Math.round(memoryPercentage)
      },
      cpu: {
        loadAverage: loadAverage.map(l => Math.round(l * 100) / 100)
      }
    },
    dependencies: {
      vault: {
        status: checks.vault?.status === 'pass' ? 'pass' : 'fail',
        responseTime: checks.vault?.responseTime,
        error: checks.vault?.status !== 'pass' ? checks.vault?.message : undefined
      }
    }
  };

  logger.info('Health check performed', {
    status: overallStatus,
    failedChecks: failedChecks.length,
    warnChecks: warnChecks.length
  });

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(statusCode).json(detailedStatus);
});

// Metrics endpoint for monitoring systems
router.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  const memoryUsage = process.memoryUsage();
  const loadAverage = os.loadavg();
  
  // Simple Prometheus-style metrics
  const metrics = [
    `# HELP process_memory_usage_bytes Process memory usage in bytes`,
    `# TYPE process_memory_usage_bytes gauge`,
    `process_memory_usage_bytes{type="heap_used"} ${memoryUsage.heapUsed}`,
    `process_memory_usage_bytes{type="heap_total"} ${memoryUsage.heapTotal}`,
    `process_memory_usage_bytes{type="rss"} ${memoryUsage.rss}`,
    '',
    `# HELP process_uptime_seconds Process uptime in seconds`,
    `# TYPE process_uptime_seconds counter`,
    `process_uptime_seconds ${Math.floor(process.uptime())}`,
    '',
    `# HELP system_load_average System load average`,
    `# TYPE system_load_average gauge`,
    `system_load_average{period="1m"} ${loadAverage[0]}`,
    `system_load_average{period="5m"} ${loadAverage[1]}`,
    `system_load_average{period="15m"} ${loadAverage[2]}`,
    ''
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain');
  res.send(metrics);
});

export default router; 