// @ts-nocheck
import { Router, Request, Response } from 'express';
import { MCPBridgeService } from '../../../../src/services/MCPBridgeService';
import { MCPTaskPayload } from '../../../../src/agents/MCPBridgeAgent';
import { createLogger } from '../../../../src/utils/logger';

const router = Router();
const logger = createLogger('MCPRoutes');

// Initialize MCP Bridge Service
const mcpService = MCPBridgeService.getInstance({
  environment: process.env.NODE_ENV || 'development',
  autoStart: true
});

/**
 * GET /api/v1/mcp/status
 * Get MCP Bridge service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = mcpService.getStatus();
    const configSummary = mcpService.getConfigSummary();
    
    res.json({
      success: true,
      data: {
        service_status: status,
        configuration: configSummary,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get MCP status', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Failed to get MCP service status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/v1/mcp/tools
 * List available MCP tools
 */
router.get('/tools', async (req: Request, res: Response) => {
  try {
    const useCache = req.query.cache !== 'false';
    const tools = await mcpService.discoverTools(useCache);
    
    res.json({
      success: true,
      data: {
        tools,
        tool_count: tools.length,
        cached: useCache,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to list MCP tools', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: 'Failed to list MCP tools',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/v1/mcp/execute
 * Execute an MCP tool
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { tool_name, parameters } = req.body;
    
    if (!tool_name) {
      return res.status(400).json({
        success: false,
        error: 'tool_name is required'
      });
    }
    
    logger.info('Executing MCP tool via API', { tool_name, parameters });
    
    const result = await mcpService.executeTool(tool_name, parameters);
    
    res.json({
      success: true,
      data: {
        result,
        tool_name,
        executed_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to execute MCP tool', { 
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
 * GET /api/v1/mcp/jobs/:jobId
 * Check MCP job status
 */
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'jobId is required'
      });
    }
    
    const jobStatus = await mcpService.checkJobStatus(jobId);
    
    res.json({
      success: true,
      data: {
        job_status: jobStatus,
        job_id: jobId,
        checked_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to check MCP job status', { 
      job_id: req.params.jobId,
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to check job status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/v1/mcp/task
 * Process a complete MCP task
 */
router.post('/task', async (req: Request, res: Response) => {
  try {
    const payload: MCPTaskPayload = req.body;
    
    if (!payload.action) {
      return res.status(400).json({
        success: false,
        error: 'action is required'
      });
    }
    
    logger.info('Processing MCP task via API', { action: payload.action, tool_name: payload.tool_name });
    
    const result = await mcpService.processTask(payload);
    
    res.json({
      success: true,
      data: {
        task_result: result,
        payload,
        processed_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to process MCP task', { 
      payload: req.body,
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to process MCP task',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/v1/mcp/reload
 * Reload MCP Bridge configuration
 */
router.post('/reload', async (req: Request, res: Response) => {
  try {
    const { environment } = req.body;
    
    logger.info('Reloading MCP Bridge configuration', { environment });
    
    await mcpService.reload(environment);
    
    const status = mcpService.getStatus();
    const configSummary = mcpService.getConfigSummary();
    
    res.json({
      success: true,
      data: {
        message: 'MCP Bridge configuration reloaded successfully',
        service_status: status,
        configuration: configSummary,
        reloaded_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to reload MCP Bridge configuration', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to reload MCP Bridge configuration',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/v1/mcp/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const status = mcpService.getStatus();
    
    if (status.status === 'ready') {
      res.json({
        success: true,
        status: 'healthy',
        data: {
          service_status: status.status,
          uptime: status.uptime,
          last_health_check: status.last_health_check,
          tools_cached: status.tools_cached,
          active_jobs: status.active_jobs
        }
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        data: {
          service_status: status.status,
          error_message: status.error_message
        }
      });
    }
  } catch (error) {
    logger.error('MCP health check failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router; 