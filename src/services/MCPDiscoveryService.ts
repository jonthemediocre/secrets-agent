import { EventEmitter } from 'events';

// Simple logger interface for now
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  warn: (message: string) => console.warn(`[WARN] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`)
};

// Simple event bus interface for now
class SimpleEventBus extends EventEmitter {
  private static instance: SimpleEventBus;
  
  static getInstance(): SimpleEventBus {
    if (!SimpleEventBus.instance) {
      SimpleEventBus.instance = new SimpleEventBus();
    }
    return SimpleEventBus.instance;
  }
}

export interface MCPServerInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  repository?: string;
  npmPackage?: string;
  installCommand?: string;
  configExample?: any;
  popularity: number;
  isOfficial: boolean;
  capabilities: string[];
  dependencies?: string[];
  lastUpdated?: Date;
  version?: string;
  documentation?: string;
  examples?: string[];
}

export interface ProjectAnalysis {
  projectType: string;
  technologies: string[];
  frameworks: string[];
  databases: string[];
  apis: string[];
  cloudServices: string[];
  devTools: string[];
  languages: string[];
  patterns: string[];
}

export interface MCPRecommendation {
  server: MCPServerInfo;
  relevanceScore: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  autoInstall: boolean;
}

export class MCPDiscoveryService extends EventEmitter {
  private topMCPServers: MCPServerInfo[] = [];
  private projectAnalysisCache = new Map<string, ProjectAnalysis>();
  private recommendationCache = new Map<string, MCPRecommendation[]>();
  private keb: SimpleEventBus;

  constructor() {
    super();
    this.keb = SimpleEventBus.getInstance();
    this.initializeTopServers();
  }

  private initializeTopServers(): void {
    // Top 25 MCP Servers based on research
    this.topMCPServers = [
      // File Systems & Storage
      {
        id: 'filesystem',
        name: 'Filesystem',
        description: 'Secure file operations with configurable access controls',
        category: 'File Systems',
        tags: ['files', 'storage', 'local'],
        repository: 'https://github.com/modelcontextprotocol/servers',
        npmPackage: '@modelcontextprotocol/server-filesystem',
        installCommand: 'npx -y @modelcontextprotocol/server-filesystem',
        popularity: 95,
        isOfficial: true,
        capabilities: ['read_files', 'write_files', 'list_directories', 'file_search'],
        configExample: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/files']
        }
      },
      {
        id: 'github',
        name: 'GitHub',
        description: 'GitHub API integration for repository management, PRs, issues, and more',
        category: 'Version Control',
        tags: ['github', 'git', 'repository', 'issues', 'pr'],
        repository: 'https://github.com/modelcontextprotocol/servers',
        npmPackage: '@modelcontextprotocol/server-github',
        popularity: 92,
        isOfficial: true,
        capabilities: ['repo_management', 'issues', 'pull_requests', 'code_search'],
        dependencies: ['GITHUB_PERSONAL_ACCESS_TOKEN']
      },
      {
        id: 'postgresql',
        name: 'PostgreSQL',
        description: 'PostgreSQL database integration with schema inspection and query capabilities',
        category: 'Databases',
        tags: ['postgresql', 'database', 'sql'],
        repository: 'https://github.com/modelcontextprotocol/servers',
        npmPackage: '@modelcontextprotocol/server-postgres',
        popularity: 89,
        isOfficial: true,
        capabilities: ['sql_queries', 'schema_inspection', 'data_analysis']
      },
      {
        id: 'slack',
        name: 'Slack',
        description: 'Slack workspace integration for channel management and messaging',
        category: 'Communication',
        tags: ['slack', 'messaging', 'team'],
        repository: 'https://github.com/modelcontextprotocol/servers',
        npmPackage: '@modelcontextprotocol/server-slack',
        popularity: 87,
        isOfficial: true,
        capabilities: ['send_messages', 'read_channels', 'user_management'],
        dependencies: ['SLACK_BOT_TOKEN']
      },
      {
        id: 'puppeteer',
        name: 'Puppeteer',
        description: 'Browser automation for web scraping and interaction',
        category: 'Search & Web',
        tags: ['browser', 'automation', 'scraping'],
        repository: 'https://github.com/modelcontextprotocol/servers',
        npmPackage: '@modelcontextprotocol/server-puppeteer',
        popularity: 86,
        isOfficial: true,
        capabilities: ['web_scraping', 'browser_automation', 'page_interaction']
      }
    ];

    logger.info(`Initialized ${this.topMCPServers.length} top MCP servers`);
  }

  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    if (this.projectAnalysisCache.has(projectPath)) {
      return this.projectAnalysisCache.get(projectPath)!;
    }

    logger.info(`Analyzing project at: ${projectPath}`);

    const analysis: ProjectAnalysis = {
      projectType: 'unknown',
      technologies: [],
      frameworks: [],
      databases: [],
      apis: [],
      cloudServices: [],
      devTools: [],
      languages: [],
      patterns: []
    };

    try {
      // Analyze package.json for Node.js projects
      const packageJsonPath = `${projectPath}/package.json`;
      try {
        const fs = await import('fs/promises');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        
        analysis.projectType = 'nodejs';
        analysis.languages.push('javascript', 'typescript');

        // Analyze dependencies
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
          ...packageJson.peerDependencies
        };

        for (const dep of Object.keys(allDeps)) {
          this.categorizeDependency(dep, analysis);
        }
      } catch (error) {
        // Not a Node.js project or no package.json
      }

      // Remove duplicates
      analysis.languages = Array.from(new Set(analysis.languages));
      analysis.devTools = Array.from(new Set(analysis.devTools));
      analysis.cloudServices = Array.from(new Set(analysis.cloudServices));

      this.projectAnalysisCache.set(projectPath, analysis);
      
      this.keb.emit('project_analyzed', {
        projectPath,
        analysis,
        timestamp: new Date()
      });

      logger.info(`Project analysis complete`);
      return analysis;

    } catch (error) {
      logger.error(`Error analyzing project: ${error instanceof Error ? error.message : String(error)}`);
      return analysis;
    }
  }

  private categorizeDependency(dep: string, analysis: ProjectAnalysis): void {
    // Frameworks
    if (['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'gatsby'].some(fw => dep.includes(fw))) {
      analysis.frameworks.push(dep);
    }
    
    // Databases
    if (['mongodb', 'mongoose', 'pg', 'mysql', 'sqlite', 'redis', 'prisma', 'typeorm'].some(db => dep.includes(db))) {
      analysis.databases.push(dep);
    }
    
    // Cloud services
    if (['aws-sdk', 'azure', 'gcp', 'cloudflare', 'vercel', 'netlify'].some(cloud => dep.includes(cloud))) {
      analysis.cloudServices.push(dep);
    }
    
    // APIs
    if (['axios', 'fetch', 'graphql', 'apollo', 'stripe', 'openai', 'anthropic'].some(api => dep.includes(api))) {
      analysis.apis.push(dep);
    }
    
    // Dev tools
    if (['webpack', 'vite', 'rollup', 'babel', 'eslint', 'prettier', 'jest', 'cypress'].some(tool => dep.includes(tool))) {
      analysis.devTools.push(dep);
    }
  }

  async getRecommendations(projectPath: string, userNeeds?: string[]): Promise<MCPRecommendation[]> {
    const cacheKey = `${projectPath}:${userNeeds?.join(',') || ''}`;
    
    if (this.recommendationCache.has(cacheKey)) {
      return this.recommendationCache.get(cacheKey)!;
    }

    const analysis = await this.analyzeProject(projectPath);
    const recommendations: MCPRecommendation[] = [];

    for (const server of this.topMCPServers) {
      const relevanceScore = this.calculateRelevanceScore(server, analysis, userNeeds);
      
      if (relevanceScore > 0.3) { // Only recommend if relevance > 30%
        const recommendation: MCPRecommendation = {
          server,
          relevanceScore,
          reasoning: this.generateReasoning(server, analysis, userNeeds),
          priority: this.determinePriority(relevanceScore),
          category: server.category,
          autoInstall: relevanceScore > 0.8 && server.isOfficial
        };
        
        recommendations.push(recommendation);
      }
    }

    // Sort by relevance score
    recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);

    this.recommendationCache.set(cacheKey, recommendations);
    
    this.keb.emit('recommendations_generated', {
      projectPath,
      recommendationCount: recommendations.length,
      topRecommendations: recommendations.slice(0, 5),
      timestamp: new Date()
    });

    return recommendations;
  }

  private calculateRelevanceScore(
    server: MCPServerInfo, 
    analysis: ProjectAnalysis, 
    userNeeds?: string[]
  ): number {
    let score = 0;
    
    // Base score for official servers
    if (server.isOfficial) score += 0.2;
    
    // Popularity factor
    score += (server.popularity / 100) * 0.3;
    
    // Technology matching
    const techMatches = this.countMatches(server.tags, [
      ...analysis.technologies,
      ...analysis.frameworks,
      ...analysis.databases,
      ...analysis.languages,
      ...analysis.cloudServices
    ]);
    score += (techMatches / Math.max(server.tags.length, 1)) * 0.3;
    
    // User needs matching
    if (userNeeds) {
      const needsMatches = this.countMatches(server.tags, userNeeds) + 
                          this.countMatches(server.capabilities, userNeeds);
      score += (needsMatches / Math.max(userNeeds.length, 1)) * 0.2;
    }
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  private countMatches(arr1: string[], arr2: string[]): number {
    return arr1.filter(item => 
      arr2.some(target => 
        item.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(item.toLowerCase())
      )
    ).length;
  }

  private generateReasoning(
    server: MCPServerInfo, 
    analysis: ProjectAnalysis, 
    userNeeds?: string[]
  ): string {
    const reasons: string[] = [];
    
    if (server.isOfficial) {
      reasons.push('Official MCP server with proven reliability');
    }
    
    if (server.popularity > 85) {
      reasons.push('Highly popular in the community');
    }
    
    return reasons.join('. ') || 'General utility for development workflows';
  }

  private determinePriority(relevanceScore: number): 'high' | 'medium' | 'low' {
    if (relevanceScore > 0.7) return 'high';
    if (relevanceScore > 0.5) return 'medium';
    return 'low';
  }

  async searchServers(query: string, category?: string): Promise<MCPServerInfo[]> {
    const searchTerms = query.toLowerCase().split(' ');
    
    return this.topMCPServers.filter(server => {
      if (category && server.category !== category) return false;
      
      const searchableText = [
        server.name,
        server.description,
        ...server.tags,
        ...server.capabilities
      ].join(' ').toLowerCase();
      
      return searchTerms.every(term => searchableText.includes(term));
    }).sort((a, b) => b.popularity - a.popularity);
  }

  getServerById(id: string): MCPServerInfo | undefined {
    return this.topMCPServers.find(server => server.id === id);
  }

  getServersByCategory(category: string): MCPServerInfo[] {
    return this.topMCPServers.filter(server => server.category === category);
  }

  getCategories(): string[] {
    return Array.from(new Set(this.topMCPServers.map(server => server.category)));
  }

  clearCache(): void {
    this.projectAnalysisCache.clear();
    this.recommendationCache.clear();
    logger.info('MCP Discovery Service cache cleared');
  }
} 