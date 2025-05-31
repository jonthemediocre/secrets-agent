// MCP SERVER REGISTRY
// Complete ecosystem of Model Context Protocol servers for Vibe Coding

import { createLogger } from '../utils/logger';
import { EventEmitter } from 'events';

const logger = createLogger('MCPServerRegistry');

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  version: string;
  endpoint: string;
  capabilities: string[];
  category: 'creative' | 'developer' | 'enterprise' | 'ai' | 'data' | 'social';
  status: 'active' | 'inactive' | 'maintenance';
  priority: number;
  healthCheckUrl: string;
  tools: MCPTool[];
}

export interface MCPTool {
  name: string;
  description: string;
  category: string;
  parameters: any;
  examples: string[];
  cost?: 'free' | 'low' | 'medium' | 'high';
}

export class MCPServerRegistry extends EventEmitter {
  private servers = new Map<string, MCPServer>();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeTopMCPServers();
    this.startHealthChecks();
  }

  /**
   * Initialize the top MCP servers for our vibe coding ecosystem
   */
  private initializeTopMCPServers(): void {
    const topServers: MCPServer[] = [
      {
        id: 'anthropic-computer-use',
        name: 'Anthropic Computer Use',
        description: 'Direct computer interaction and automation',
        version: '1.2.0',
        endpoint: 'mcp://anthropic-computer-use',
        capabilities: ['screen-capture', 'click', 'type', 'automation'],
        category: 'ai',
        status: 'active',
        priority: 10,
        healthCheckUrl: '/health',
        tools: [
          {
            name: 'screenshot',
            description: 'Take screenshot of current screen',
            category: 'interaction',
            parameters: { region: 'optional' },
            examples: ['Take full screenshot', 'Screenshot specific window']
          },
          {
            name: 'click',
            description: 'Click at coordinates or element',
            category: 'interaction',
            parameters: { x: 'number', y: 'number' },
            examples: ['Click button', 'Click link']
          }
        ]
      },
      {
        id: 'github-mcp',
        name: 'GitHub Integration',
        description: 'Complete GitHub API integration',
        version: '2.1.0',
        endpoint: 'mcp://github',
        capabilities: ['repos', 'issues', 'prs', 'actions', 'releases'],
        category: 'developer',
        status: 'active',
        priority: 9,
        healthCheckUrl: '/api/health',
        tools: [
          {
            name: 'create-repo',
            description: 'Create new GitHub repository',
            category: 'repository',
            parameters: { name: 'string', private: 'boolean' },
            examples: ['Create public repo', 'Create private repo'],
            cost: 'free'
          },
          {
            name: 'create-issue',
            description: 'Create GitHub issue',
            category: 'issues',
            parameters: { title: 'string', body: 'string', labels: 'array' },
            examples: ['Bug report', 'Feature request']
          }
        ]
      },
      {
        id: 'docker-mcp',
        name: 'Docker Management',
        description: 'Container management and deployment',
        version: '1.8.0',
        endpoint: 'mcp://docker',
        capabilities: ['containers', 'images', 'networks', 'volumes'],
        category: 'developer',
        status: 'active',
        priority: 8,
        healthCheckUrl: '/health',
        tools: [
          {
            name: 'run-container',
            description: 'Run Docker container',
            category: 'containers',
            parameters: { image: 'string', ports: 'array', env: 'object' },
            examples: ['Run web server', 'Start database']
          }
        ]
      },
      {
        id: 'filesystem-mcp',
        name: 'File System Access',
        description: 'Safe file system operations',
        version: '1.5.0',
        endpoint: 'mcp://filesystem',
        capabilities: ['read', 'write', 'list', 'search'],
        category: 'developer',
        status: 'active',
        priority: 9,
        healthCheckUrl: '/health',
        tools: [
          {
            name: 'read-file',
            description: 'Read file contents',
            category: 'file-ops',
            parameters: { path: 'string', encoding: 'optional' },
            examples: ['Read config file', 'Read source code'],
            cost: 'free'
          },
          {
            name: 'write-file',
            description: 'Write file contents',
            category: 'file-ops',
            parameters: { path: 'string', content: 'string' },
            examples: ['Save configuration', 'Generate code file']
          }
        ]
      },
      {
        id: 'postgres-mcp',
        name: 'PostgreSQL Database',
        description: 'Database operations and queries',
        version: '2.0.0',
        endpoint: 'mcp://postgres',
        capabilities: ['query', 'schema', 'migrations', 'backup'],
        category: 'data',
        status: 'active',
        priority: 7,
        healthCheckUrl: '/db/health',
        tools: [
          {
            name: 'execute-query',
            description: 'Execute SQL query',
            category: 'database',
            parameters: { query: 'string', params: 'array' },
            examples: ['SELECT data', 'INSERT records']
          }
        ]
      },
      {
        id: 'sqlite-mcp',
        name: 'SQLite Database',
        description: 'Lightweight database operations',
        version: '1.3.0',
        endpoint: 'mcp://sqlite',
        capabilities: ['query', 'schema', 'transactions'],
        category: 'data',
        status: 'active',
        priority: 6,
        healthCheckUrl: '/health',
        tools: [
          {
            name: 'query',
            description: 'Execute SQLite query',
            category: 'database',
            parameters: { sql: 'string' },
            examples: ['Query users', 'Update records'],
            cost: 'free'
          }
        ]
      },
      {
        id: 'puppeteer-mcp',
        name: 'Web Automation',
        description: 'Browser automation and scraping',
        version: '1.7.0',
        endpoint: 'mcp://puppeteer',
        capabilities: ['scraping', 'automation', 'screenshots', 'pdf'],
        category: 'creative',
        status: 'active',
        priority: 8,
        healthCheckUrl: '/health',
        tools: [
          {
            name: 'scrape-page',
            description: 'Scrape web page content',
            category: 'web',
            parameters: { url: 'string', selectors: 'array' },
            examples: ['Extract article text', 'Get product prices']
          },
          {
            name: 'screenshot-page',
            description: 'Take screenshot of web page',
            category: 'web',
            parameters: { url: 'string', fullPage: 'boolean' },
            examples: ['Page preview', 'Visual testing']
          }
        ]
      },
      {
        id: 'figma-mcp',
        name: 'Figma Design',
        description: 'Design tool integration',
        version: '1.4.0',
        endpoint: 'mcp://figma',
        capabilities: ['designs', 'components', 'exports', 'collaboration'],
        category: 'creative',
        status: 'active',
        priority: 7,
        healthCheckUrl: '/api/health',
        tools: [
          {
            name: 'get-design',
            description: 'Fetch Figma design data',
            category: 'design',
            parameters: { fileId: 'string', nodeId: 'optional' },
            examples: ['Get design specs', 'Export assets']
          }
        ]
      },
      {
        id: 'openai-mcp',
        name: 'OpenAI Integration',
        description: 'AI model integration and chat',
        version: '3.2.0',
        endpoint: 'mcp://openai',
        capabilities: ['chat', 'completion', 'embeddings', 'vision'],
        category: 'ai',
        status: 'active',
        priority: 10,
        healthCheckUrl: '/health',
        tools: [
          {
            name: 'chat-completion',
            description: 'Generate AI chat responses',
            category: 'ai',
            parameters: { messages: 'array', model: 'string' },
            examples: ['AI assistant', 'Code generation'],
            cost: 'medium'
          }
        ]
      },
      {
        id: 'discord-mcp',
        name: 'Discord Bot',
        description: 'Discord server automation',
        version: '1.6.0',
        endpoint: 'mcp://discord',
        capabilities: ['messages', 'channels', 'roles', 'webhooks'],
        category: 'social',
        status: 'active',
        priority: 6,
        healthCheckUrl: '/health',
        tools: [
          {
            name: 'send-message',
            description: 'Send Discord message',
            category: 'messaging',
            parameters: { channelId: 'string', content: 'string' },
            examples: ['Bot announcement', 'Community update']
          }
        ]
      },
      {
        id: 'slack-mcp',
        name: 'Slack Integration',
        description: 'Slack workspace automation',
        version: '2.0.0',
        endpoint: 'mcp://slack',
        capabilities: ['messages', 'channels', 'users', 'files'],
        category: 'social',
        status: 'active',
        priority: 7,
        healthCheckUrl: '/api/health',
        tools: [
          {
            name: 'post-message',
            description: 'Post Slack message',
            category: 'messaging',
            parameters: { channel: 'string', text: 'string' },
            examples: ['Team notification', 'Status update']
          }
        ]
      },
      {
        id: 'gmail-mcp',
        name: 'Gmail Integration',
        description: 'Email automation and management',
        version: '1.9.0',
        endpoint: 'mcp://gmail',
        capabilities: ['send', 'read', 'search', 'labels'],
        category: 'enterprise',
        status: 'active',
        priority: 8,
        healthCheckUrl: '/health',
        tools: [
          {
            name: 'send-email',
            description: 'Send Gmail email',
            category: 'email',
            parameters: { to: 'string', subject: 'string', body: 'string' },
            examples: ['Automated notification', 'Customer outreach']
          }
        ]
      },
      {
        id: 'calendar-mcp',
        name: 'Calendar Management',
        description: 'Calendar events and scheduling',
        version: '1.5.0',
        endpoint: 'mcp://calendar',
        capabilities: ['events', 'scheduling', 'reminders', 'invites'],
        category: 'enterprise',
        status: 'active',
        priority: 6,
        healthCheckUrl: '/health',
        tools: [
          {
            name: 'create-event',
            description: 'Create calendar event',
            category: 'scheduling',
            parameters: { title: 'string', start: 'datetime', duration: 'number' },
            examples: ['Schedule meeting', 'Block time']
          }
        ]
      },
      {
        id: 'weather-mcp',
        name: 'Weather Data',
        description: 'Weather information and forecasts',
        version: '1.2.0',
        endpoint: 'mcp://weather',
        capabilities: ['current', 'forecast', 'alerts', 'historical'],
        category: 'data',
        status: 'active',
        priority: 4,
        healthCheckUrl: '/health',
        tools: [
          {
            name: 'get-weather',
            description: 'Get weather for location',
            category: 'data',
            parameters: { location: 'string', days: 'optional' },
            examples: ['Current weather', '7-day forecast'],
            cost: 'free'
          }
        ]
      },
      {
        id: 'youtube-mcp',
        name: 'YouTube Integration',
        description: 'YouTube video and channel management',
        version: '1.8.0',
        endpoint: 'mcp://youtube',
        capabilities: ['videos', 'channels', 'playlists', 'analytics'],
        category: 'creative',
        status: 'active',
        priority: 7,
        healthCheckUrl: '/health',
        tools: [
          {
            name: 'search-videos',
            description: 'Search YouTube videos',
            category: 'content',
            parameters: { query: 'string', maxResults: 'number' },
            examples: ['Find tutorials', 'Content research']
          }
        ]
      }
    ];

    // Register all servers
    topServers.forEach(server => {
      this.servers.set(server.id, server);
      logger.info(`🔗 Registered MCP server: ${server.name} (${server.id})`);
    });

    logger.info(`✅ Initialized ${topServers.length} MCP servers in registry`);
  }

  /**
   * Get all registered MCP servers
   */
  getAllServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get servers by category
   */
  getServersByCategory(category: MCPServer['category']): MCPServer[] {
    return Array.from(this.servers.values())
      .filter(server => server.category === category);
  }

  /**
   * Get active servers only
   */
  getActiveServers(): MCPServer[] {
    return Array.from(this.servers.values())
      .filter(server => server.status === 'active')
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get server by ID
   */
  getServer(id: string): MCPServer | undefined {
    return this.servers.get(id);
  }

  /**
   * Search servers by capability
   */
  searchByCapability(capability: string): MCPServer[] {
    return Array.from(this.servers.values())
      .filter(server => 
        server.capabilities.some(cap => 
          cap.toLowerCase().includes(capability.toLowerCase())
        )
      );
  }

  /**
   * Start health checks for all servers
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Check every 30 seconds

    logger.info('🏥 Started MCP server health checks');
  }

  /**
   * Perform health checks on all servers
   */
  private async performHealthChecks(): Promise<void> {
    const servers = this.getActiveServers();
    
    for (const server of servers) {
      try {
        // Simulate health check (in production, make actual HTTP requests)
        const isHealthy = Math.random() > 0.05; // 95% uptime simulation
        
        if (!isHealthy && server.status === 'active') {
          server.status = 'maintenance';
          this.emit('serverDown', server);
          logger.warn(`⚠️ MCP server unhealthy: ${server.name}`);
        } else if (isHealthy && server.status === 'maintenance') {
          server.status = 'active';
          this.emit('serverUp', server);
          logger.info(`✅ MCP server recovered: ${server.name}`);
        }
      } catch (error) {
        logger.error(`❌ Health check failed for ${server.name}:`, error);
      }
    }
  }

  /**
   * Register a custom MCP server
   */
  registerServer(server: MCPServer): void {
    this.servers.set(server.id, server);
    this.emit('serverRegistered', server);
    logger.info(`📝 Registered custom MCP server: ${server.name}`);
  }

  /**
   * Unregister an MCP server
   */
  unregisterServer(id: string): boolean {
    const server = this.servers.get(id);
    if (server) {
      this.servers.delete(id);
      this.emit('serverUnregistered', server);
      logger.info(`🗑️ Unregistered MCP server: ${server.name}`);
      return true;
    }
    return false;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
    byCategory: Record<string, number>;
  } {
    const servers = Array.from(this.servers.values());
    
    return {
      total: servers.length,
      active: servers.filter(s => s.status === 'active').length,
      inactive: servers.filter(s => s.status === 'inactive').length,
      maintenance: servers.filter(s => s.status === 'maintenance').length,
      byCategory: servers.reduce((acc, server) => {
        acc[server.category] = (acc[server.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Shutdown registry and cleanup
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    logger.info('🔌 MCP Server Registry shut down');
  }
}

// Singleton instance
export const mcpServerRegistry = new MCPServerRegistry(); 