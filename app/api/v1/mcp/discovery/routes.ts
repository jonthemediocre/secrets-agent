import { Router, Request, Response, NextFunction } from 'express';
import { MCPDiscoveryService } from '../../../../../src/services/MCPDiscoveryService.js';

const router = Router();
const discoveryService = new MCPDiscoveryService();

// Middleware for error handling
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Middleware for request validation
const validateRequest = (requiredFields: string[]) => 
  (req: Request, res: Response, next: (error?: any) => void) => {
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    next();
  };

/**
 * POST /api/v1/mcp/discovery/analyze
 * Analyze a project to understand its technology stack
 */
router.post('/analyze', asyncHandler(async (req: Request, res: Response) => {
  const { projectPath } = req.body;
  
  if (!projectPath) {
    return res.status(400).json({
      success: false,
      error: 'Project path is required'
    });
  }

  try {
    const analysis = await discoveryService.analyzeProject(projectPath);
    
    res.json({
      success: true,
      data: {
        analysis,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze project'
    });
  }
}));

/**
 * POST /api/v1/mcp/discovery/discover
 * Get MCP server recommendations for a project
 */
router.post('/discover', asyncHandler(async (req: Request, res: Response) => {
  const { projectPath, userNeeds } = req.body;
  
  if (!projectPath) {
    return res.status(400).json({
      success: false,
      error: 'Project path is required'
    });
  }

  try {
    const analysis = await discoveryService.analyzeProject(projectPath);
    const recommendations = await discoveryService.getRecommendations(projectPath, userNeeds);
    
    res.json({
      success: true,
      data: {
        analysis,
        recommendations,
        totalRecommendations: recommendations.length,
        highPriorityCount: recommendations.filter(r => r.priority === 'high').length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to discover MCP servers'
    });
  }
}));

/**
 * GET /api/v1/mcp/discovery/search
 * Search for MCP servers by query and optional category
 */
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { query, category, limit = '10' } = req.query;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Search query is required'
    });
  }

  try {
    const servers = await discoveryService.searchServers(
      query, 
      category as string | undefined
    );
    
    const limitNum = parseInt(limit as string, 10);
    const limitedServers = servers.slice(0, limitNum);
    
    res.json({
      success: true,
      data: {
        servers: limitedServers,
        totalResults: servers.length,
        query,
        category: category || null,
        limit: limitNum,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search MCP servers'
    });
  }
}));

/**
 * GET /api/v1/mcp/discovery/categories
 * Get all available MCP server categories
 */
router.get('/categories', asyncHandler(async (req: Request, res: Response) => {
  try {
    const categories = discoveryService.getCategories();
    
    res.json({
      success: true,
      data: {
        categories,
        totalCategories: categories.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch categories'
    });
  }
}));

/**
 * GET /api/v1/mcp/discovery/category/:category
 * Get all servers in a specific category
 */
router.get('/category/:category', asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  
  try {
    const servers = discoveryService.getServersByCategory(category);
    
    res.json({
      success: true,
      data: {
        servers,
        category,
        serverCount: servers.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch servers by category'
    });
  }
}));

/**
 * GET /api/v1/mcp/discovery/server/:serverId
 * Get detailed information about a specific MCP server
 */
router.get('/server/:serverId', asyncHandler(async (req: Request, res: Response) => {
  const { serverId } = req.params;
  
  try {
    const server = discoveryService.getServerById(serverId);
    
    if (!server) {
      return res.status(404).json({
        success: false,
        error: `Server '${serverId}' not found`
      });
    }
    
    res.json({
      success: true,
      data: {
        server,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch server information'
    });
  }
}));

/**
 * POST /api/v1/mcp/discovery/install
 * Install an MCP server (simulation for now)
 */
router.post('/install', asyncHandler(async (req: Request, res: Response) => {
  const { serverId, projectPath, autoConfig = false } = req.body;
  
  if (!serverId || !projectPath) {
    return res.status(400).json({
      success: false,
      error: 'Server ID and project path are required'
    });
  }

  try {
    const server = discoveryService.getServerById(serverId);
    
    if (!server) {
      return res.status(404).json({
        success: false,
        error: `Server '${serverId}' not found`
      });
    }

    // Generate installation configuration
    const config: any = {};
    let installCommand = '';
    const nextSteps: string[] = [];

    if (server.npmPackage) {
      config.command = 'npx';
      config.args = ['-y', server.npmPackage];
      installCommand = `npx -y ${server.npmPackage}`;
    } else if (server.installCommand) {
      installCommand = server.installCommand;
      const parts = server.installCommand.split(' ');
      config.command = parts[0];
      config.args = parts.slice(1);
    }

    if (server.dependencies) {
      config.env = {};
      for (const dep of server.dependencies) {
        config.env[dep] = `<YOUR_${dep}>`;
      }
      nextSteps.push(`Set environment variables: ${server.dependencies.join(', ')}`);
    }

    if (server.configExample) {
      nextSteps.push('Add the server configuration to your MCP client');
    }

    nextSteps.push('Test the server connection');
    nextSteps.push('Explore available tools and capabilities');

    res.json({
      success: true,
      data: {
        serverId,
        serverName: server.name,
        config,
        installCommand,
        nextSteps,
        autoConfig,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to install MCP server'
    });
  }
}));

/**
 * GET /api/v1/mcp/discovery/recommendations/:projectPath
 * Get cached recommendations for a project
 */
router.get('/recommendations/:projectPath', asyncHandler(async (req: Request, res: Response) => {
  const { projectPath } = req.params;
  const { userNeeds } = req.query;
  
  try {
    const userNeedsArray = userNeeds ? 
      (typeof userNeeds === 'string' ? userNeeds.split(',') : userNeeds as string[]) : 
      undefined;
    
    const recommendations = await discoveryService.getRecommendations(
      decodeURIComponent(projectPath), 
      userNeedsArray
    );
    
    res.json({
      success: true,
      data: {
        recommendations,
        projectPath: decodeURIComponent(projectPath),
        userNeeds: userNeedsArray,
        totalRecommendations: recommendations.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get recommendations'
    });
  }
}));

/**
 * POST /api/v1/mcp/discovery/clear-cache
 * Clear the discovery service cache
 */
router.post('/clear-cache', asyncHandler(async (req: Request, res: Response) => {
  try {
    discoveryService.clearCache();
    
    res.json({
      success: true,
      data: {
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear cache'
    });
  }
}));

/**
 * GET /api/v1/mcp/discovery/stats
 * Get discovery service statistics
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  try {
    const categories = discoveryService.getCategories();
    const categoryStats = categories.map(category => ({
      category,
      serverCount: discoveryService.getServersByCategory(category).length
    }));

    res.json({
      success: true,
      data: {
        totalServers: categoryStats.reduce((sum, cat) => sum + cat.serverCount, 0),
        totalCategories: categories.length,
        categoryBreakdown: categoryStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get statistics'
    });
  }
}));

// Error handling middleware
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('MCP Discovery API Error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router; 