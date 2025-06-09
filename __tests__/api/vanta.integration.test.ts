/**
 * @mcpPassive - Test suite only, no agent callable functions
 * VANTA Framework Integration Tests - DOMINO 4
 * Comprehensive testing for all VANTA adapters and API endpoints
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock Next.js environment
const mockRequest = (url: string, options: any = {}) => ({
  url,
  method: options.method || 'GET',
  headers: new Map(Object.entries(options.headers || {})),
  json: () => Promise.resolve(options.body || {}),
  searchParams: new URLSearchParams(new URL(url).search)
} as unknown as NextRequest);

// Import VANTA Framework components
import { SecretsIntegrationAdapter } from '../../lib/vanta/adapters/SecretsIntegrationAdapter';
import { SecretsAnalysisAdapter } from '../../lib/vanta/adapters/SecretsAnalysisAdapter';
import { SecretsAutomationAdapter } from '../../lib/vanta/adapters/SecretsAutomationAdapter';
import { SecretsAdvancedAnalyticsAdapter } from '../../lib/vanta/adapters/SecretsAdvancedAnalyticsAdapter';
import { SecretsVantaConfig } from '../../lib/vanta/config';

// Import API handlers
import { GET as vantaGET, POST as vantaPOST } from '../../app/api/vanta/route';
import { GET as analyticsGET, POST as analyticsPOST } from '../../app/api/vanta/analytics/route';

describe('VANTA Framework Integration Tests', () => {
  let config: SecretsVantaConfig;
  let integrationAdapter: SecretsIntegrationAdapter;
  let analysisAdapter: SecretsAnalysisAdapter;
  let automationAdapter: SecretsAutomationAdapter;
  let analyticsAdapter: SecretsAdvancedAnalyticsAdapter;

  beforeAll(async () => {
    // Initialize test configuration
    config = {
      agentId: 'test-agent',
      name: 'Test Secrets Agent',
      version: '1.0.0-test',
      environment: 'test',
      services: {
        vault: {
          provider: 'memory',
          config: { encryptionAlgorithm: 'AES-256', auditLevel: 'comprehensive', complianceMode: 'SOX', digitalSignatures: true }
        },
        monitoring: {
          enabled: true,
          metricsInterval: 10000
        },
        compliance: {
          frameworks: ['SOX', 'PCI-DSS', 'GDPR'],
          auditLevel: 'full'
        },
        ml: {
          enabled: true,
          modelPath: './models',
          features: ['anomaly-detection', 'risk-assessment']
        }
      },
      security: {
        encryption: {
          algorithm: 'aes-256-gcm',
          keyDerivation: 'pbkdf2'
        },
        access: {
          ipWhitelist: ['127.0.0.1'],
          maxFailedAttempts: 3
        }
      },
      vaultIntegration: {
        supportedVaults: ['hashicorp-vault', 'aws-secrets'],
        defaultProvider: 'hashicorp-vault',
        encryption: { enabled: true, algorithm: 'AES-256' },
        audit: { enabled: true, retention: '90d' }
      }
    };

    // Initialize adapters
    integrationAdapter = new SecretsIntegrationAdapter(config);
    analysisAdapter = new SecretsAnalysisAdapter(config);
    automationAdapter = new SecretsAutomationAdapter(config);
    analyticsAdapter = new SecretsAdvancedAnalyticsAdapter(config);
  });

  afterAll(async () => {
    // Cleanup
    jest.clearAllMocks();
  });

  describe('SecretsIntegrationAdapter', () => {
    test('should initialize with correct configuration', () => {
      expect(integrationAdapter).toBeDefined();
      expect(integrationAdapter.getVaultStatus).toBeDefined();
    });

    test('should create secrets agent with vault connectivity', async () => {
      const agentConfig = {
        agentId: 'test-secrets-agent',
        name: 'Test Agent',
        type: 'analysis',
        vaultConnections: [],
        securitySettings: {
          encryptionAlgorithm: 'AES-256',
          auditLevel: 'comprehensive',
          complianceMode: 'SOX',
          requireMFA: false
        },
        automationSettings: {
          autoRotation: false,
          rotationInterval: 24,
          emergencyProcedures: true
        }
      };

      const agent = await integrationAdapter.createSecretsAgent(agentConfig);
      expect(agent).toBeDefined();
      expect(agent.id).toBe('test-secrets-agent');
      expect(agent.name).toBe('Test Agent');
    });

    test('should handle vault status and inventory', async () => {
      // Test vault status
      const vaultStatus = integrationAdapter.getVaultStatus();
      expect(Array.isArray(vaultStatus)).toBe(true);

      // Test secrets inventory
      const inventory = integrationAdapter.getSecretsInventory();
      expect(Array.isArray(inventory)).toBe(true);

      // Test audit log
      const auditLog = integrationAdapter.getAuditLog();
      expect(Array.isArray(auditLog)).toBe(true);
    });

    test('should execute secrets operations', async () => {
      const testTask = {
        taskId: 'test-task-001',
        agentId: 'test-agent',
        type: 'secrets-operation',
        priority: 1,
        status: 'pending' as const,
        createdAt: new Date(),
        secretsOperation: {
          type: 'read' as const,
          vaultId: 'test-vault',
          secretPath: '/test/secret',
          secretKey: 'password'
        },
        auditRequirements: {
          logLevel: 'detailed' as const,
          complianceMode: 'SOX',
          requireApproval: false
        }
      };

      const result = await integrationAdapter.executeSecretsTask(testTask);
      expect(result).toBeDefined();
      expect(result.secretsData).toBeDefined();
      expect(result.complianceData).toBeDefined();
    });
  });

  describe('SecretsAnalysisAdapter', () => {
    test('should provide analysis status and metrics', async () => {
      const status = analysisAdapter.getAnalysisStatus();
      expect(status).toBeDefined();

      const metrics = analysisAdapter.getAnalysisMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.performance).toBeDefined();
    });

    test('should execute analysis tasks', async () => {
      const analysisTask = {
        taskId: 'analysis-task-001',
        agentId: 'test-agent',
        type: 'analysis',
        priority: 1,
        status: 'pending' as const,
        createdAt: new Date(),
        analysisType: 'risk_assessment' as const,
        targetScope: {
          secretIds: ['test-secret-001'],
          timeRange: { start: new Date(Date.now() - 3600000), end: new Date() }
        },
        analysisParameters: {
          riskThreshold: 0.7,
          anomalyThreshold: 0.8,
          includeML: true
        },
        outputFormat: 'detailed' as const
      };

      const result = await analysisAdapter.executeSecretsAnalysisTask(analysisTask);
      expect(result).toBeDefined();
      expect(result.securityMetrics).toBeDefined();
      expect(result.securityMetrics.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.securityMetrics.overallRiskScore).toBeLessThanOrEqual(1);
    });

    test('should detect anomalies with ML', async () => {
      const testEvent = {
        id: 'event-001',
        type: 'access' as const,
        timestamp: new Date(),
        source: 'test-source',
        secretId: 'test-secret',
        userId: 'test-user',
        severity: 'medium' as const,
        metadata: { ipAddress: '127.0.0.1' }
      };

      const anomalyResult = await analysisAdapter.detectAnomaliesML(testEvent);
      expect(anomalyResult).toBeDefined();
      expect(anomalyResult.isAnomaly).toBeDefined();
      expect(anomalyResult.anomalyScore).toBeGreaterThanOrEqual(0);
      expect(anomalyResult.confidence).toBeGreaterThanOrEqual(0);
    });

    test('should provide ML performance metrics', async () => {
      const mlMetrics = analysisAdapter.getMLPerformanceMetrics();
      expect(mlMetrics).toBeDefined();
      expect(mlMetrics.modelAccuracy).toBeDefined();
      expect(mlMetrics.detectionLatency).toBeDefined();
    });
  });

  describe('SecretsAutomationAdapter', () => {
    test('should handle automated workflows', async () => {
      const status = automationAdapter.getOptimizedWorkflowStatus();
      expect(status).toBeDefined();

      const metrics = automationAdapter.getOptimizedMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.performance).toBeDefined();
    });

    test('should execute optimized automation tasks', async () => {
      const automationTask = {
        taskId: 'automation-task-001',
        agentId: 'test-agent',
        type: 'automation',
        priority: 1,
        status: 'pending' as const,
        createdAt: new Date(),
        workflowType: 'secret_rotation' as const,
        executionMode: 'optimized' as const,
        targetSecrets: ['test-secret-001'],
        schedule: {
          type: 'immediate' as const,
          priority: 'high' as const
        },
        policies: ['policy-001'],
        rollbackConfig: {
          enabled: true,
          checkpoints: 3,
          autoRollback: false
        }
      };

      const result = await automationAdapter.executeOptimizedAutomationTask(automationTask);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.workflowResults).toBeDefined();
    });

    test('should handle emergency procedures', async () => {
      const emergencyTask = {
        taskId: 'emergency-001',
        agentId: 'test-agent',
        type: 'automation',
        priority: 1,
        status: 'pending' as const,
        createdAt: new Date(),
        workflowType: 'emergency_response' as const,
        executionMode: 'optimized' as const,
        targetSecrets: ['compromised-secret'],
        schedule: {
          type: 'immediate' as const,
          priority: 'critical' as const
        },
        policies: [],
        rollbackConfig: {
          enabled: false,
          checkpoints: 0,
          autoRollback: false
        }
      };

      const result = await automationAdapter.executeOptimizedAutomationTask(emergencyTask);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('SecretsAdvancedAnalyticsAdapter', () => {
    test('should provide predictive dashboard data', async () => {
      const dashboards = analyticsAdapter.getAllDashboards();
      expect(Array.isArray(dashboards)).toBe(true);
      expect(dashboards.length).toBeGreaterThan(0);

      const dashboard = dashboards[0];
      expect(dashboard.dashboardId).toBeDefined();
      expect(dashboard.name).toBeDefined();
      expect(dashboard.widgets).toBeDefined();
      expect(Array.isArray(dashboard.widgets)).toBe(true);
    });

    test('should generate time-series forecasting', async () => {
      const trendAnalysis = await analyticsAdapter.generateTrendAnalysis('risk_score');
      expect(trendAnalysis).toBeDefined();
      expect(trendAnalysis.metric).toBe('risk_score');
      expect(trendAnalysis.trend).toMatch(/increasing|decreasing|stable/);
      expect(trendAnalysis.forecast).toBeDefined();
      expect(Array.isArray(trendAnalysis.forecast)).toBe(true);
    });

    test('should provide real-time streaming data', async () => {
      const streamStatus = analyticsAdapter.getStreamStatus();
      expect(Array.isArray(streamStatus)).toBe(true);
      expect(streamStatus.length).toBeGreaterThan(0);

      const stream = streamStatus[0];
      expect(stream.streamId).toBeDefined();
      expect(stream.isActive).toBeDefined();
      expect(stream.latency).toBeGreaterThanOrEqual(0);
      expect(stream.throughput).toBeGreaterThanOrEqual(0);
    });

    test('should generate widget data for visualization', async () => {
      const dashboards = analyticsAdapter.getAllDashboards();
      const firstDashboard = dashboards[0];
      const firstWidget = firstDashboard.widgets[0];
      
      const widgetData = await analyticsAdapter.getWidgetData(firstWidget.widgetId);
      expect(widgetData).toBeDefined();
    });

    test('should provide advanced analytics metrics', async () => {
      const metrics = analyticsAdapter.getAdvancedAnalyticsMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.performance).toBeDefined();
      expect(metrics.capabilities).toBeDefined();
      expect(metrics.usage).toBeDefined();
      
      expect(metrics.performance.forecastAccuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.performance.dataQuality).toBeGreaterThanOrEqual(0);
    });
  });

  describe('API Endpoint Integration', () => {
    test('should handle VANTA main API endpoints', async () => {
      // Test status endpoint
      const statusRequest = mockRequest('http://localhost:3000/api/vanta?action=status');
      const statusResponse = await vantaGET(statusRequest);
      expect(statusResponse.status).toBe(200);

      // Test health endpoint
      const healthRequest = mockRequest('http://localhost:3000/api/vanta?action=health');
      const healthResponse = await vantaGET(healthRequest);
      expect(healthResponse.status).toBe(200);
    });

    test('should handle analytics API endpoints', async () => {
      // Test dashboards endpoint
      const dashboardsRequest = mockRequest('http://localhost:3000/api/vanta/analytics?action=dashboards');
      const dashboardsResponse = await analyticsGET(dashboardsRequest);
      expect(dashboardsResponse.status).toBe(200);

      // Test metrics endpoint
      const metricsRequest = mockRequest('http://localhost:3000/api/vanta/analytics?action=metrics');
      const metricsResponse = await analyticsGET(metricsRequest);
      expect(metricsResponse.status).toBe(200);
    });

    test('should handle analytics POST operations', async () => {
      const createRequest = mockRequest('http://localhost:3000/api/vanta/analytics', {
        method: 'POST',
        body: {
          action: 'create_dashboard',
          name: 'Test Dashboard',
          description: 'Test dashboard for integration testing',
          category: 'testing'
        }
      });

      const createResponse = await analyticsPOST(createRequest);
      expect(createResponse.status).toBe(200);
    });

    test('should validate API error handling', async () => {
      // Test invalid action
      const invalidRequest = mockRequest('http://localhost:3000/api/vanta?action=invalid-action');
      const invalidResponse = await vantaGET(invalidRequest);
      expect(invalidResponse.status).toBe(400);

      // Test missing required parameters
      const missingParamRequest = mockRequest('http://localhost:3000/api/vanta/analytics?action=widget_data');
      const missingParamResponse = await analyticsGET(missingParamRequest);
      expect(missingParamResponse.status).toBe(400);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet response time requirements', async () => {
      const startTime = Date.now();
      
      await Promise.all([
        integrationAdapter.getVaultStatus(),
        analysisAdapter.getAnalysisStatus(),
        automationAdapter.getOptimizedWorkflowStatus(),
        analyticsAdapter.getAdvancedAnalyticsMetrics()
      ]);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All operations should complete under 5 seconds
      expect(totalTime).toBeLessThan(5000);
    });

    test('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 5 }, async (_, i) => {
        const task = {
          taskId: `concurrent-test-${i}`,
          agentId: 'test-agent',
          type: 'analysis',
          priority: 1,
          status: 'pending' as const,
          createdAt: new Date(),
          analysisType: 'risk_assessment' as const,
          targetScope: { secretIds: [`test-secret-${i}`] },
          analysisParameters: {
            riskThreshold: 0.5,
            anomalyThreshold: 0.7,
            includeML: false
          },
          outputFormat: 'summary' as const
        };
        return analysisAdapter.executeSecretsAnalysisTask(task);
      });

      const results = await Promise.all(operations);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.securityMetrics.overallRiskScore).toBeGreaterThanOrEqual(0);
      });
    });
  });
}); 