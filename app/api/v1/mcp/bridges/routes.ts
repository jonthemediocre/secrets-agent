// @ts-nocheck
import { Router, Request, Response } from 'express';
import { AgentBridgeService, MCPEndpointConfig, MCPExecutionResult, MCPOperationStatus } from '../../../../../src/services/AgentBridgeService';
import { MCPBridgesConfigLoader } from '../../../../../src/config/MCPBridgesConfig';
import { createLogger } from '../../../../../src/utils/logger';

const router = Router();
const logger = createLogger('MCPBridgesRoutes');

// Initialize services
const agentBridgeService = new AgentBridgeService();
const mcpConfigLoader = MCPBridgesConfigLoader.getInstance();

// Basic validation helper
const validateRequired = (value: any, fieldName: string): string | null => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

// Middleware to ensure MCP Bridge is initialized
const ensureMCPInitialized = async (req: Request, res: Response, next: any) => {
  try {
    // Check if MCP Bridge is initialized
    const status = agentBridgeService.getMCPBridgeStatus();
    if (!status || status.status !== 'ready') {
      // Try to initialize if not ready
      await agentBridgeService.initializeMCPBridge();
    }
    next();
  } catch (error) {
    logger.error('MCP Bridge initialization failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(503).json({
      success: false,
      error: 'MCP Bridge service unavailable',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * GET /api/v1/mcp/bridges
 * List all registered MCP bridges with their configurations
 */
router.get('/', ensureMCPInitialized, async (req: Request, res: Response) => {
  try {
    logger.info('Listing MCP bridges');
    
    const bridges = await agentBridgeService.listMCPBridges();
    const configSummary = mcpConfigLoader.getConfigSummary();
    
    res.json({
      success: true,
      data: {
        bridges,
        total_bridges: bridges.length,
        enabled_bridges: bridges.filter(b => b.enabled).length,
        config_summary: configSummary,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to list MCP bridges', {
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({
      success: false,
      error: 'Failed to list MCP bridges',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/v1/mcp/bridges/:bridgeId
 * Get detailed information about a specific MCP bridge
 */
router.get('/:bridgeId', ensureMCPInitialized, async (req: Request, res: Response) => {
  try {
    const { bridgeId } = req.params;
    
    const validationError = validateRequired(bridgeId, 'Bridge ID');
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError
      });
    }
    
    logger.info('Getting MCP bridge details', { bridgeId });
    
    const bridgeConfig = mcpConfigLoader.getBridgeConfig(bridgeId);
    if (!bridgeConfig) {
      return res.status(404).json({
        success: false,
        error: 'Bridge not found',
        details: `No bridge found with ID: ${bridgeId}`
      });
    }
    
    // Test connection status
    const connectionStatus = await agentBridgeService.testMCPConnection(bridgeId);
    
    res.json({
      success: true,
      data: {
        bridge: bridgeConfig,
        connection_status: connectionStatus ? 'connected' : 'disconnected',
        last_checked: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get MCP bridge details', {
      bridgeId: req.params.bridgeId,
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get bridge details',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/v1/mcp/bridges/:bridgeId/register
 * Register a new MCP bridge endpoint
 */
router.post('/:bridgeId/register', [
  param('bridgeId').isString().notEmpty().withMessage('Bridge ID is required'),
  body('name').isString().notEmpty().withMessage('Bridge name is required'),
  body('url').isURL().withMessage('Valid URL is required'),
  body('category').isIn(['ai', 'database', 'api', 'tool', 'custom']).withMessage('Valid category is required'),
  body('enabled').isBoolean().withMessage('Enabled must be a boolean'),
  handleValidationErrors,
  ensureMCPInitialized
], async (req: Request, res: Response) => {
  try {
    const { bridgeId } = req.params;
    const { name, url, category, enabled, description, apiKey, timeout, retryConfig } = req.body;
    
    logger.info('Registering MCP bridge', { bridgeId, name, category });
    
    const endpointConfig: MCPEndpointConfig = {
      id: bridgeId,
      name,
      url,
      apiKey,
      enabled,
      category,
      description,
      timeout,
      retryConfig
    };
    
    await agentBridgeService.registerMCPEndpoint(endpointConfig);
    
    res.status(201).json({
      success: true,
      data: {
        message: 'MCP bridge registered successfully',
        bridge_id: bridgeId,
        registered_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to register MCP bridge', {
      bridgeId: req.params.bridgeId,
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({
      success: false,
      error: 'Failed to register MCP bridge',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/v1/mcp/bridges/:bridgeId/tools
 * List available tools from a specific MCP bridge
 */
router.get('/:bridgeId/tools', [
  param('bridgeId').isString().notEmpty().withMessage('Bridge ID is required'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('cache').optional().isBoolean().withMessage('Cache must be a boolean'),
  handleValidationErrors,
  ensureMCPInitialized
], async (req: Request, res: Response) => {
  try {
    const { bridgeId } = req.params;
    const { category, cache = 'true' } = req.query;
    
    logger.info('Listing MCP tools for bridge', { bridgeId, category });
    
    let tools = await agentBridgeService.listMCPTools(bridgeId);
    
    // Filter by category if specified
    if (category && typeof category === 'string') {
      tools = tools.filter(tool => tool.category === category);
    }
    
    // Group tools by category
    const toolsByCategory = tools.reduce((acc, tool) => {
      if (!acc[tool.category]) {
        acc[tool.category] = [];
      }
      acc[tool.category].push(tool);
      return acc;
    }, {} as Record<string, typeof tools>);
    
    res.json({
      success: true,
      data: {
        bridge_id: bridgeId,
        tools,
        tools_by_category: toolsByCategory,
        total_tools: tools.length,
        categories: Object.keys(toolsByCategory),
        cached: cache === 'true',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to list MCP tools', {
      bridgeId: req.params.bridgeId,
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({
      success: false,
      error: 'Failed to list MCP tools',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/v1/mcp/bridges/:bridgeId/execute
 * Execute a tool via a specific MCP bridge
 */
router.post('/:bridgeId/execute', [
  param('bridgeId').isString().notEmpty().withMessage('Bridge ID is required'),
  body('tool_name').isString().notEmpty().withMessage('Tool name is required'),
  body('parameters').optional().isObject().withMessage('Parameters must be an object'),
  body('async').optional().isBoolean().withMessage('Async must be a boolean'),
  handleValidationErrors,
  ensureMCPInitialized
], async (req: Request, res: Response) => {
  try {
    const { bridgeId } = req.params;
    const { tool_name, parameters = {}, async: isAsync = false } = req.body;
    
    logger.info('Executing MCP tool', { bridgeId, tool_name, isAsync });
    
    const executionResult: MCPExecutionResult = await agentBridgeService.executeMCPTool(
      bridgeId,
      tool_name,
      parameters
    );
    
    if (executionResult.success) {
      res.json({
        success: true,
        data: {
          execution_result: executionResult,
          bridge_id: bridgeId,
          tool_name,
          executed_at: executionResult.timestamp.toISOString(),
          execution_time_ms: executionResult.executionTime
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Tool execution failed',
        details: executionResult.error,
        execution_time_ms: executionResult.executionTime
      });
    }
  } catch (error) {
    logger.error('Failed to execute MCP tool', {
      bridgeId: req.params.bridgeId,
      tool_name: req.body.tool_name,
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({
      success: false,
      error: 'Failed to execute MCP tool',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/v1/mcp/bridges/:bridgeId/test
 * Test connection to a specific MCP bridge
 */
router.get('/:bridgeId/test', [
  param('bridgeId').isString().notEmpty().withMessage('Bridge ID is required'),
  handleValidationErrors,
  ensureMCPInitialized
], async (req: Request, res: Response) => {
  try {
    const { bridgeId } = req.params;
    
    logger.info('Testing MCP bridge connection', { bridgeId });
    
    const startTime = Date.now();
    const connectionStatus = await agentBridgeService.testMCPConnection(bridgeId);
    const testDuration = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        bridge_id: bridgeId,
        connection_status: connectionStatus ? 'connected' : 'failed',
        test_duration_ms: testDuration,
        tested_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to test MCP bridge connection', {
      bridgeId: req.params.bridgeId,
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({
      success: false,
      error: 'Failed to test bridge connection',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/v1/mcp/operations/:operationId
 * Get status of an MCP operation
 */
router.get('/operations/:operationId', [
  param('operationId').isString().notEmpty().withMessage('Operation ID is required'),
  handleValidationErrors,
  ensureMCPInitialized
], async (req: Request, res: Response) => {
  try {
    const { operationId } = req.params;
    
    logger.info('Getting MCP operation status', { operationId });
    
    const operationStatus: MCPOperationStatus | null = await agentBridgeService.getMCPOperationStatus(operationId);
    
    if (!operationStatus) {
      return res.status(404).json({
        success: false,
        error: 'Operation not found',
        details: `No operation found with ID: ${operationId}`
      });
    }
    
    res.json({
      success: true,
      data: {
        operation: operationStatus,
        checked_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get MCP operation status', {
      operationId: req.params.operationId,
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get operation status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/v1/mcp/health
 * Get overall MCP Bridge health status
 */
router.get('/health', ensureMCPInitialized, async (req: Request, res: Response) => {
  try {
    logger.info('Checking MCP Bridge health');
    
    const bridgeStatus = agentBridgeService.getMCPBridgeStatus();
    const configSummary = mcpConfigLoader.getConfigSummary();
    const bridges = await agentBridgeService.listMCPBridges();
    
    // Test connections to enabled bridges
    const connectionTests = await Promise.allSettled(
      bridges
        .filter(b => b.enabled)
        .map(async (bridge) => ({
          bridge_id: bridge.id,
          status: await agentBridgeService.testMCPConnection(bridge.id)
        }))
    );
    
    const healthyBridges = connectionTests
      .filter(result => result.status === 'fulfilled' && result.value.status)
      .length;
    
    const totalEnabledBridges = bridges.filter(b => b.enabled).length;
    const healthPercentage = totalEnabledBridges > 0 ? (healthyBridges / totalEnabledBridges) * 100 : 100;
    
    const isHealthy = bridgeStatus?.status === 'ready' && healthPercentage >= 80;
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      data: {
        bridge_service_status: bridgeStatus,
        config_summary: configSummary,
        bridge_health: {
          total_bridges: bridges.length,
          enabled_bridges: totalEnabledBridges,
          healthy_bridges: healthyBridges,
          health_percentage: Math.round(healthPercentage)
        },
        connection_tests: connectionTests.map(result => 
          result.status === 'fulfilled' 
            ? result.value 
            : { bridge_id: 'unknown', status: false, error: 'Test failed' }
        ),
        checked_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('MCP Bridge health check failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/v1/mcp/reload
 * Reload MCP bridges configuration
 */
router.post('/reload', [
  body('environment').optional().isString().withMessage('Environment must be a string'),
  handleValidationErrors
], async (req: Request, res: Response) => {
  try {
    const { environment } = req.body;
    
    logger.info('Reloading MCP bridges configuration', { environment });
    
    // Reload configuration
    await mcpConfigLoader.reloadConfig();
    
    // Reinitialize MCP Bridge with new config
    await agentBridgeService.initializeMCPBridge();
    
    const configSummary = mcpConfigLoader.getConfigSummary();
    const bridgeStatus = agentBridgeService.getMCPBridgeStatus();
    
    res.json({
      success: true,
      data: {
        message: 'MCP bridges configuration reloaded successfully',
        config_summary: configSummary,
        bridge_status: bridgeStatus,
        reloaded_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to reload MCP bridges configuration', {
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({
      success: false,
      error: 'Failed to reload configuration',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router; 