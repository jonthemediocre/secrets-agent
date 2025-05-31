#!/usr/bin/env node

/**
 * Project Scanner Script
 * Scans pinokio/api directory for projects and extracts secrets automatically
 * Extended with MCP Discovery capabilities for Phase 6 implementation
 */

import { promises as fs } from 'fs';
import { join, basename, extname } from 'path';
import { VaultAgent } from '../vault/VaultAgent';
import { createLogger } from '../src/utils/logger';
// Removed import for SecretScaffoldAgent as it doesn't exist yet

const logger = createLogger('ProjectScanner');

interface ProjectAnalysis {
  projectName: string;
  projectPath: string;
  hasEnvFiles: boolean;
  envFiles: string[];
  hasConfigFiles: boolean;
  configFiles: string[];
  estimatedSecrets: number;
  confidence: 'low' | 'medium' | 'high';
  secrets?: Array<{
    key: string;
    value: string;
    file: string;
    type: string;
    confidence: number;
  }>;
  // MCP Discovery Extensions
  mcpDiscovery?: MCPDiscoveryResult;
}

interface MCPDiscoveryResult {
  hasMCPCode: boolean;
  mcpFiles: MCPFileInfo[];
  mcpConfigurations: MCPConfigInfo[];
  mcpToolDefinitions: MCPToolInfo[];
  mcpBridgeImplementations: MCPBridgeInfo[];
  mcpApiEndpoints: MCPEndpointInfo[];
  mcpCliCommands: MCPCommandInfo[];
  confidence: 'low' | 'medium' | 'high';
  totalMCPReferences: number;
}

interface MCPFileInfo {
  filePath: string;
  fileType: 'typescript' | 'python' | 'javascript' | 'yaml' | 'json' | 'markdown' | 'other';
  mcpReferences: number;
  keyPatterns: string[];
  extractedCode?: string;
  description: string;
}

interface MCPConfigInfo {
  filePath: string;
  configType: 'bridge_config' | 'tool_registry' | 'endpoint_config' | 'auth_config' | 'other';
  bridges: string[];
  tools: string[];
  endpoints: string[];
  extractedConfig?: any;
}

interface MCPToolInfo {
  toolName: string;
  filePath: string;
  toolType: 'class' | 'function' | 'service' | 'endpoint' | 'cli_command';
  description: string;
  parameters: string[];
  implementation: string;
  codeSnippet?: string;
}

interface MCPBridgeInfo {
  bridgeName: string;
  filePath: string;
  bridgeType: 'http_client' | 'websocket' | 'grpc' | 'rest_api' | 'other';
  endpoints: string[];
  authMethods: string[];
  implementation: string;
  codeSnippet?: string;
}

interface MCPEndpointInfo {
  endpoint: string;
  filePath: string;
  method: string;
  description: string;
  parameters: string[];
  implementation: string;
  codeSnippet?: string;
}

interface MCPCommandInfo {
  command: string;
  filePath: string;
  description: string;
  parameters: string[];
  implementation: string;
  codeSnippet?: string;
}

interface ScanReport {
  timestamp: string;
  totalProjects: number;
  projectsWithSecrets: number;
  totalSecretsFound: number;
  highConfidenceProjects: number;
  mediumConfidenceProjects: number;
  lowConfidenceProjects: number;
  projects: ProjectAnalysis[];
  // MCP Discovery Summary
  mcpSummary: MCPDiscoverySummary;
}

interface MCPDiscoverySummary {
  projectsWithMCP: number;
  totalMCPFiles: number;
  totalMCPConfigurations: number;
  totalMCPTools: number;
  totalMCPBridges: number;
  totalMCPEndpoints: number;
  totalMCPCommands: number;
  highConfidenceMCPProjects: number;
  recommendedIntegrations: MCPIntegrationRecommendation[];
}

interface MCPIntegrationRecommendation {
  projectName: string;
  integrationType: 'copy_code' | 'extract_config' | 'adapt_pattern' | 'reference_implementation';
  description: string;
  files: string[];
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
}

interface SecretSuggestion {
  key: string;
  type: string;
  description: string;
  confidence: number;
}

interface ScanResult {
  projectName: string;
  projectPath: string;
  secrets: Array<{
    key: string;
    value: string;
    file: string;
    type: string;
    confidence: number;
  }>;
  suggestions: SecretSuggestion[];
  confidence: 'low' | 'medium' | 'high';
  success: boolean;
}

class ProjectScanner {
  private vaultAgent: VaultAgent;
  private projectsBaseDir: string;
  private mcpPatterns: RegExp[];
  private mcpKeywords: string[];

  constructor(projectsBaseDir: string = 'C:\\Users\\Jonbr\\pinokio\\api') {
    this.projectsBaseDir = projectsBaseDir;
    this.vaultAgent = new VaultAgent('./vault/secrets.sops.yaml');
    
    // MCP Detection Patterns
    this.mcpPatterns = [
      /mcp|MCP/gi,
      /Master\s*Control\s*Program/gi,
      /bridge.*integration/gi,
      /tool.*orchestration/gi,
      /agent.*communication/gi,
      /external.*tool.*execution/gi,
      /api.*bridge/gi,
      /tool.*discovery/gi,
      /tool.*execution/gi,
      /mcp.*server/gi,
      /mcp.*client/gi,
      /mcp.*bridge/gi,
      /mcp.*tool/gi,
      /mcp.*endpoint/gi,
      /mcp.*command/gi
    ];
    
    this.mcpKeywords = [
      'mcp', 'MCP', 'bridge', 'tool_execution', 'tool_discovery',
      'external_tools', 'agent_communication', 'orchestration',
      'tool_registry', 'bridge_config', 'endpoint_management',
      'tool_integration', 'mcp_server', 'mcp_client'
    ];
  }

  async initialize(): Promise<void> {
    try {
      await this.vaultAgent.loadVault();
      logger.info('Project scanner initialized with vault and MCP discovery');
    } catch (error) {
      logger.warn('Failed to load vault, will create new one if needed', { error: String(error) });
    }
  }

  async scanAllProjects(): Promise<ScanReport> {
    logger.info('Starting comprehensive project scan with MCP discovery', { baseDir: this.projectsBaseDir });

    const projects: ProjectAnalysis[] = [];
    let totalSecretsFound = 0;
    let projectsWithSecrets = 0;
    let highConfidenceProjects = 0;
    let mediumConfidenceProjects = 0;
    let lowConfidenceProjects = 0;

    // MCP Discovery counters
    let projectsWithMCP = 0;
    let totalMCPFiles = 0;
    let totalMCPConfigurations = 0;
    let totalMCPTools = 0;
    let totalMCPBridges = 0;
    let totalMCPEndpoints = 0;
    let totalMCPCommands = 0;
    let highConfidenceMCPProjects = 0;
    const recommendedIntegrations: MCPIntegrationRecommendation[] = [];

    try {
      const projectDirs = await this.discoverProjects();
      logger.info(`Discovered ${projectDirs.length} potential projects`);

      for (const projectPath of projectDirs) {
        try {
          const projectName = basename(projectPath);
          const analysis = await this.analyzeProject(projectName, projectPath);
          
          if (analysis.estimatedSecrets > 0 || (analysis.mcpDiscovery && analysis.mcpDiscovery.hasMCPCode)) {
            projects.push(analysis);
            
            if (analysis.secrets && analysis.secrets.length > 0) {
              totalSecretsFound += analysis.secrets.length;
              projectsWithSecrets++;
            }

            // MCP Discovery aggregation
            if (analysis.mcpDiscovery && analysis.mcpDiscovery.hasMCPCode) {
              projectsWithMCP++;
              totalMCPFiles += analysis.mcpDiscovery.mcpFiles.length;
              totalMCPConfigurations += analysis.mcpDiscovery.mcpConfigurations.length;
              totalMCPTools += analysis.mcpDiscovery.mcpToolDefinitions.length;
              totalMCPBridges += analysis.mcpDiscovery.mcpBridgeImplementations.length;
              totalMCPEndpoints += analysis.mcpDiscovery.mcpApiEndpoints.length;
              totalMCPCommands += analysis.mcpDiscovery.mcpCliCommands.length;
              
              if (analysis.mcpDiscovery.confidence === 'high') {
                highConfidenceMCPProjects++;
                
                // Generate integration recommendations for high-confidence MCP projects
                const recommendations = this.generateMCPIntegrationRecommendations(projectName, analysis.mcpDiscovery);
                recommendedIntegrations.push(...recommendations);
              }
            }

            switch (analysis.confidence) {
              case 'high':
                highConfidenceProjects++;
                break;
              case 'medium':
                mediumConfidenceProjects++;
                break;
              case 'low':
                lowConfidenceProjects++;
                break;
            }
          }
        } catch (error) {
          logger.warn('Failed to analyze project', { projectPath, error: String(error) });
        }
      }

      const mcpSummary: MCPDiscoverySummary = {
        projectsWithMCP,
        totalMCPFiles,
        totalMCPConfigurations,
        totalMCPTools,
        totalMCPBridges,
        totalMCPEndpoints,
        totalMCPCommands,
        highConfidenceMCPProjects,
        recommendedIntegrations: recommendedIntegrations.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
      };

      const report: ScanReport = {
        timestamp: new Date().toISOString(),
        totalProjects: projects.length,
        projectsWithSecrets,
        totalSecretsFound,
        highConfidenceProjects,
        mediumConfidenceProjects,
        lowConfidenceProjects,
        projects: projects.sort((a, b) => {
          const confidenceOrder = { high: 3, medium: 2, low: 1 };
          const aScore = (confidenceOrder[a.confidence] * 10) + (a.mcpDiscovery?.totalMCPReferences || 0);
          const bScore = (confidenceOrder[b.confidence] * 10) + (b.mcpDiscovery?.totalMCPReferences || 0);
          return bScore - aScore;
        }),
        mcpSummary
      };

      logger.info('Project scan with MCP discovery completed', {
        totalProjects: report.totalProjects,
        projectsWithSecrets: report.projectsWithSecrets,
        totalSecretsFound: report.totalSecretsFound,
        projectsWithMCP: mcpSummary.projectsWithMCP,
        totalMCPFiles: mcpSummary.totalMCPFiles,
        highConfidenceMCPProjects: mcpSummary.highConfidenceMCPProjects
      });

      return report;

    } catch (error) {
      logger.error('Failed to discover projects', { error: String(error) });
      throw new Error(`Project discovery failed: ${String(error)}`);
    }
  }

  private async discoverProjects(): Promise<string[]> {
    const projectDirs: string[] = [];
    
    try {
      const entries = await fs.readdir(this.projectsBaseDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          projectDirs.push(join(this.projectsBaseDir, entry.name));
        }
      }
    } catch (error) {
      logger.error('Failed to read projects directory', { error: String(error) });
      throw error;
    }

    return projectDirs;
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', '.next', 
      'coverage', '.nyc_output', 'temp', 'tmp'
    ];
    return dirName.startsWith('.') || skipDirs.includes(dirName.toLowerCase());
  }

  private async analyzeProject(projectName: string, projectPath: string): Promise<ProjectAnalysis> {
    const analysis: ProjectAnalysis = {
      projectName,
      projectPath,
      hasEnvFiles: false,
      envFiles: [],
      hasConfigFiles: false,
      configFiles: [],
      estimatedSecrets: 0,
      confidence: 'low'
    };

    try {
      const files = await fs.readdir(projectPath);
      
      // Find environment files
      const envFiles = files.filter(file => 
        file.startsWith('.env') || 
        file.includes('environment') || 
        file.includes('config')
      );
      
      analysis.hasEnvFiles = envFiles.length > 0;
      analysis.envFiles = envFiles;
      
      // Find configuration files
      const configFiles = files.filter(file => 
        file.includes('config') || 
        file.endsWith('.yaml') || 
        file.endsWith('.yml') || 
        file.endsWith('.json') ||
        file.includes('settings')
      );
      
      analysis.hasConfigFiles = configFiles.length > 0;
      analysis.configFiles = configFiles;
      
      // Extract secrets if env files exist
      if (analysis.hasEnvFiles) {
        analysis.secrets = await this.extractSecretsFromProject(projectPath, envFiles);
        analysis.estimatedSecrets = analysis.secrets ? analysis.secrets.length : 0;
      }
      
      // Calculate confidence based on findings
      if (analysis.estimatedSecrets > 10) {
        analysis.confidence = 'high';
      } else if (analysis.estimatedSecrets > 3) {
        analysis.confidence = 'medium';
      } else if (analysis.estimatedSecrets > 0) {
        analysis.confidence = 'low';
      }

      // MCP Discovery
      analysis.mcpDiscovery = await this.discoverMCPInProject(projectPath);
      
      // Adjust confidence based on MCP findings
      if (analysis.mcpDiscovery.hasMCPCode && analysis.mcpDiscovery.confidence === 'high') {
        analysis.confidence = 'high';
      } else if (analysis.mcpDiscovery.hasMCPCode && analysis.mcpDiscovery.confidence === 'medium') {
        if (analysis.confidence === 'low') {
          analysis.confidence = 'medium';
        }
      }

    } catch (error) {
      logger.warn('Failed to analyze project files', { projectName, error: String(error) });
    }

    return analysis;
  }

  /**
   * Discover MCP-related code and configurations in a project
   */
  private async discoverMCPInProject(projectPath: string): Promise<MCPDiscoveryResult> {
    const mcpDiscovery: MCPDiscoveryResult = {
      hasMCPCode: false,
      mcpFiles: [],
      mcpConfigurations: [],
      mcpToolDefinitions: [],
      mcpBridgeImplementations: [],
      mcpApiEndpoints: [],
      mcpCliCommands: [],
      confidence: 'low',
      totalMCPReferences: 0
    };

    try {
      const allFiles = await this.getAllFilesRecursively(projectPath);
      
      for (const filePath of allFiles) {
        const relativePath = filePath.replace(projectPath, '').replace(/^[\\\/]/, '');
        
        // Skip certain directories and file types
        if (this.shouldSkipFileForMCPScan(relativePath)) {
          continue;
        }

        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const mcpReferences = this.countMCPReferences(fileContent);
          
          if (mcpReferences > 0) {
            mcpDiscovery.hasMCPCode = true;
            mcpDiscovery.totalMCPReferences += mcpReferences;
            
            const fileInfo: MCPFileInfo = {
              filePath: relativePath,
              fileType: this.getFileType(filePath),
              mcpReferences,
              keyPatterns: this.extractMCPPatterns(fileContent),
              description: this.generateFileDescription(relativePath, fileContent),
              extractedCode: this.extractRelevantCode(fileContent, 500) // First 500 chars of relevant code
            };
            
            mcpDiscovery.mcpFiles.push(fileInfo);
            
            // Analyze specific MCP components
            await this.analyzeMCPComponents(filePath, relativePath, fileContent, mcpDiscovery);
          }
        } catch (error) {
          // Skip files that can't be read as text
          continue;
        }
      }
      
      // Calculate confidence based on findings
      mcpDiscovery.confidence = this.calculateMCPConfidence(mcpDiscovery);
      
      logger.info('MCP discovery completed for project', {
        projectPath,
        hasMCPCode: mcpDiscovery.hasMCPCode,
        totalMCPReferences: mcpDiscovery.totalMCPReferences,
        confidence: mcpDiscovery.confidence,
        mcpFiles: mcpDiscovery.mcpFiles.length
      });

    } catch (error) {
      logger.warn('Failed to discover MCP in project', { projectPath, error: String(error) });
    }

    return mcpDiscovery;
  }

  private async getAllFilesRecursively(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          const subFiles = await this.getAllFilesRecursively(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
    
    return files;
  }

  private shouldSkipFileForMCPScan(relativePath: string): boolean {
    const skipPatterns = [
      /node_modules/,
      /\.git/,
      /dist/,
      /build/,
      /coverage/,
      /\.nyc_output/,
      /temp/,
      /tmp/,
      /\.log$/,
      /\.lock$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /\.png$/,
      /\.jpg$/,
      /\.jpeg$/,
      /\.gif$/,
      /\.svg$/,
      /\.ico$/,
      /\.woff$/,
      /\.woff2$/,
      /\.ttf$/,
      /\.eot$/
    ];
    
    return skipPatterns.some(pattern => pattern.test(relativePath));
  }

  private getFileType(filePath: string): MCPFileInfo['fileType'] {
    const ext = extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.ts':
      case '.tsx':
        return 'typescript';
      case '.py':
        return 'python';
      case '.js':
      case '.jsx':
        return 'javascript';
      case '.yaml':
      case '.yml':
        return 'yaml';
      case '.json':
        return 'json';
      case '.md':
      case '.markdown':
        return 'markdown';
      default:
        return 'other';
    }
  }

  private countMCPReferences(content: string): number {
    let count = 0;
    
    for (const pattern of this.mcpPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    
    return count;
  }

  private extractMCPPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    for (const pattern of this.mcpPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        patterns.push(...Array.from(matches).map(match => match.trim()));
      }
    }
    
    return Array.from(new Set(patterns)); // Remove duplicates
  }

  private generateFileDescription(relativePath: string, content: string): string {
    const fileName = basename(relativePath);
    const mcpReferences = this.countMCPReferences(content);
    
    if (fileName.toLowerCase().includes('mcp')) {
      return `MCP-specific file with ${mcpReferences} references`;
    } else if (relativePath.includes('bridge')) {
      return `Bridge implementation file with ${mcpReferences} MCP references`;
    } else if (relativePath.includes('tool')) {
      return `Tool-related file with ${mcpReferences} MCP references`;
    } else if (relativePath.includes('api')) {
      return `API file with ${mcpReferences} MCP references`;
    } else if (relativePath.includes('cli')) {
      return `CLI file with ${mcpReferences} MCP references`;
    } else {
      return `File with ${mcpReferences} MCP references`;
    }
  }

  private extractRelevantCode(content: string, maxLength: number): string {
    const lines = content.split('\n');
    const relevantLines: string[] = [];
    
    for (const line of lines) {
      if (this.countMCPReferences(line) > 0) {
        relevantLines.push(line.trim());
        
        if (relevantLines.join('\n').length > maxLength) {
          break;
        }
      }
    }
    
    const result = relevantLines.join('\n');
    return result.length > maxLength ? result.substring(0, maxLength) + '...' : result;
  }

  private async analyzeMCPComponents(
    filePath: string, 
    relativePath: string, 
    content: string, 
    mcpDiscovery: MCPDiscoveryResult
  ): Promise<void> {
    // Analyze MCP configurations
    if (relativePath.includes('config') || relativePath.endsWith('.yaml') || relativePath.endsWith('.yml') || relativePath.endsWith('.json')) {
      const configInfo = this.extractMCPConfiguration(relativePath, content);
      if (configInfo) {
        mcpDiscovery.mcpConfigurations.push(configInfo);
      }
    }
    
    // Analyze MCP tool definitions
    const toolDefinitions = this.extractMCPToolDefinitions(relativePath, content);
    mcpDiscovery.mcpToolDefinitions.push(...toolDefinitions);
    
    // Analyze MCP bridge implementations
    const bridgeImplementations = this.extractMCPBridgeImplementations(relativePath, content);
    mcpDiscovery.mcpBridgeImplementations.push(...bridgeImplementations);
    
    // Analyze MCP API endpoints
    const apiEndpoints = this.extractMCPApiEndpoints(relativePath, content);
    mcpDiscovery.mcpApiEndpoints.push(...apiEndpoints);
    
    // Analyze MCP CLI commands
    const cliCommands = this.extractMCPCliCommands(relativePath, content);
    mcpDiscovery.mcpCliCommands.push(...cliCommands);
  }

  private extractMCPConfiguration(relativePath: string, content: string): MCPConfigInfo | null {
    try {
      let config: any;
      
      if (relativePath.endsWith('.json')) {
        config = JSON.parse(content);
      } else if (relativePath.endsWith('.yaml') || relativePath.endsWith('.yml')) {
        // Simple YAML parsing for basic structures
        const lines = content.split('\n');
        config = {};
        for (const line of lines) {
          if (line.includes(':') && this.countMCPReferences(line) > 0) {
            const [key, value] = line.split(':').map(s => s.trim());
            config[key] = value;
          }
        }
      }
      
      if (config && this.countMCPReferences(JSON.stringify(config)) > 0) {
        return {
          filePath: relativePath,
          configType: this.determineMCPConfigType(relativePath, config),
          bridges: this.extractBridgeNames(config),
          tools: this.extractToolNames(config),
          endpoints: this.extractEndpoints(config),
          extractedConfig: config
        };
      }
    } catch (error) {
      // Skip invalid config files
    }
    
    return null;
  }

  private determineMCPConfigType(relativePath: string, config: any): MCPConfigInfo['configType'] {
    const configStr = JSON.stringify(config).toLowerCase();
    
    if (configStr.includes('bridge') && configStr.includes('endpoint')) {
      return 'bridge_config';
    } else if (configStr.includes('tool') && configStr.includes('registry')) {
      return 'tool_registry';
    } else if (configStr.includes('endpoint') || configStr.includes('api')) {
      return 'endpoint_config';
    } else if (configStr.includes('auth') || configStr.includes('token')) {
      return 'auth_config';
    } else {
      return 'other';
    }
  }

  private extractBridgeNames(config: any): string[] {
    const bridges: string[] = [];
    const configStr = JSON.stringify(config);
    
    // Look for bridge-related patterns
    const bridgePatterns = [
      /bridge[s]?["\s]*:["\s]*([^",\s}]+)/gi,
      /([a-zA-Z_]+)_bridge/gi,
      /bridge_([a-zA-Z_]+)/gi
    ];
    
    for (const pattern of bridgePatterns) {
      const matches = configStr.match(pattern);
      if (matches) {
        bridges.push(...Array.from(matches).map(match => match.replace(/[":{}]/g, '').trim()));
      }
    }
    
    return Array.from(new Set(bridges));
  }

  private extractToolNames(config: any): string[] {
    const tools: string[] = [];
    const configStr = JSON.stringify(config);
    
    // Look for tool-related patterns
    const toolPatterns = [
      /tool[s]?["\s]*:["\s]*([^",\s}]+)/gi,
      /([a-zA-Z_]+)_tool/gi,
      /tool_([a-zA-Z_]+)/gi
    ];
    
    for (const pattern of toolPatterns) {
      const matches = configStr.match(pattern);
      if (matches) {
        tools.push(...Array.from(matches).map(match => match.replace(/[":{}]/g, '').trim()));
      }
    }
    
    return Array.from(new Set(tools));
  }

  private extractEndpoints(config: any): string[] {
    const endpoints: string[] = [];
    const configStr = JSON.stringify(config);
    
    // Look for endpoint patterns
    const endpointPatterns = [
      /https?:\/\/[^\s"',}]+/gi,
      /\/api\/[^\s"',}]+/gi,
      /endpoint[s]?["\s]*:["\s]*([^",\s}]+)/gi
    ];
    
    for (const pattern of endpointPatterns) {
      const matches = configStr.match(pattern);
      if (matches) {
        endpoints.push(...Array.from(matches).map(match => match.replace(/[":{}]/g, '').trim()));
      }
    }
    
    return Array.from(new Set(endpoints));
  }

  private extractMCPToolDefinitions(relativePath: string, content: string): MCPToolInfo[] {
    const tools: MCPToolInfo[] = [];
    
    // Look for tool definition patterns
    const toolPatterns = [
      /class\s+(\w*MCP\w*|\w*Tool\w*|\w*Bridge\w*)/gi,
      /function\s+(\w*mcp\w*|\w*tool\w*|\w*bridge\w*)/gi,
      /def\s+(\w*mcp\w*|\w*tool\w*|\w*bridge\w*)/gi,
      /export\s+.*\s+(\w*MCP\w*|\w*Tool\w*|\w*Bridge\w*)/gi
    ];
    
    for (const pattern of toolPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const toolName = match.replace(/class|function|def|export/gi, '').trim();
          
          tools.push({
            toolName,
            filePath: relativePath,
            toolType: this.determineToolType(match),
            description: `MCP tool definition found in ${relativePath}`,
            parameters: this.extractParameters(content, toolName),
            implementation: this.extractImplementation(content, toolName),
            codeSnippet: this.extractCodeSnippet(content, match)
          });
        }
      }
    }
    
    return tools;
  }

  private determineToolType(match: string): MCPToolInfo['toolType'] {
    if (match.includes('class')) return 'class';
    if (match.includes('function')) return 'function';
    if (match.includes('def')) return 'function';
    if (match.includes('service')) return 'service';
    if (match.includes('endpoint')) return 'endpoint';
    if (match.includes('command')) return 'cli_command';
    return 'function';
  }

  private extractParameters(content: string, toolName: string): string[] {
    const parameters: string[] = [];
    
    // Look for parameter patterns around the tool definition
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(toolName)) {
        // Look at surrounding lines for parameters
        for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 5); j++) {
          const paramMatches = lines[j].match(/(\w+):\s*\w+/g);
          if (paramMatches) {
            parameters.push(...Array.from(paramMatches).map(p => p.split(':')[0].trim()));
          }
        }
        break;
      }
    }
    
    return Array.from(new Set(parameters));
  }

  private extractImplementation(content: string, toolName: string): string {
    if (content.includes(`class ${toolName}`)) return 'class';
    if (content.includes(`function ${toolName}`)) return 'function';
    if (content.includes(`def ${toolName}`)) return 'function';
    if (content.includes(`${toolName} =`)) return 'variable';
    return 'unknown';
  }

  private extractCodeSnippet(content: string, match: string): string {
    const lines = content.split('\n');
    const matchLine = lines.findIndex(line => line.includes(match));
    
    if (matchLine !== -1) {
      const start = Math.max(0, matchLine - 1);
      const end = Math.min(lines.length, matchLine + 4);
      return lines.slice(start, end).join('\n');
    }
    
    return match;
  }

  private extractMCPBridgeImplementations(relativePath: string, content: string): MCPBridgeInfo[] {
    const bridges: MCPBridgeInfo[] = [];
    
    // Look for bridge implementation patterns
    const bridgePatterns = [
      /class\s+(\w*Bridge\w*)/gi,
      /(\w+Bridge)/gi,
      /bridge.*implementation/gi,
      /http.*client/gi,
      /api.*bridge/gi
    ];
    
    for (const pattern of bridgePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const bridgeName = match.replace(/class|implementation/gi, '').trim();
          
          bridges.push({
            bridgeName,
            filePath: relativePath,
            bridgeType: this.determineBridgeType(content),
            endpoints: this.extractEndpoints({ content }),
            authMethods: this.extractAuthMethods(content),
            implementation: 'code',
            codeSnippet: this.extractCodeSnippet(content, match)
          });
        }
      }
    }
    
    return bridges;
  }

  private determineBridgeType(content: string): MCPBridgeInfo['bridgeType'] {
    if (content.includes('http') || content.includes('fetch') || content.includes('axios')) return 'http_client';
    if (content.includes('websocket') || content.includes('ws://')) return 'websocket';
    if (content.includes('grpc')) return 'grpc';
    if (content.includes('rest') || content.includes('api')) return 'rest_api';
    return 'other';
  }

  private extractAuthMethods(content: string): string[] {
    const authMethods: string[] = [];
    
    const authPatterns = [
      /bearer/gi,
      /api[_\s]*key/gi,
      /basic[_\s]*auth/gi,
      /oauth/gi,
      /jwt/gi,
      /token/gi
    ];
    
    for (const pattern of authPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        authMethods.push(...Array.from(matches).map(match => match.toLowerCase().trim()));
      }
    }
    
    return Array.from(new Set(authMethods));
  }

  private extractMCPApiEndpoints(relativePath: string, content: string): MCPEndpointInfo[] {
    const endpoints: MCPEndpointInfo[] = [];
    
    // Look for API endpoint patterns
    const endpointPatterns = [
      /app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /@(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /\/api\/.*mcp/gi
    ];
    
    for (const pattern of endpointPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        const method = match[1] || 'unknown';
        const endpoint = match[2] || match[0];
        
        if (this.countMCPReferences(endpoint) > 0 || this.countMCPReferences(match[0]) > 0) {
          endpoints.push({
            endpoint,
            filePath: relativePath,
            method: method.toUpperCase(),
            description: `MCP API endpoint in ${relativePath}`,
            parameters: this.extractEndpointParameters(content, endpoint),
            implementation: 'api_route',
            codeSnippet: this.extractCodeSnippet(content, match[0])
          });
        }
      }
    }
    
    return endpoints;
  }

  private extractEndpointParameters(content: string, endpoint: string): string[] {
    const parameters: string[] = [];
    
    // Extract path parameters
    const pathParams = endpoint.match(/:(\w+)/g);
    if (pathParams) {
      parameters.push(...Array.from(pathParams).map(p => p.replace(':', '')));
    }
    
    // Extract query parameters from surrounding code
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes(endpoint)) {
        const queryParams = line.match(/(\w+)\s*=\s*req\.(query|body|params)/g);
        if (queryParams) {
          parameters.push(...Array.from(queryParams).map(p => p.split('=')[0].trim()));
        }
      }
    }
    
    return Array.from(new Set(parameters));
  }

  private extractMCPCliCommands(relativePath: string, content: string): MCPCommandInfo[] {
    const commands: MCPCommandInfo[] = [];
    
    // Look for CLI command patterns
    const commandPatterns = [
      /@click\.command\(\s*['"`]([^'"`]+)['"`]/gi,
      /parser\.add_subparsers\(\)\.add_parser\(\s*['"`]([^'"`]+)['"`]/gi,
      /command\s*=\s*['"`]([^'"`]*mcp[^'"`]*)['"`]/gi,
      /def\s+(cmd_\w*mcp\w*|\w*mcp\w*_cmd)/gi
    ];
    
    for (const pattern of commandPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      for (const match of matches) {
        const command = match[1] || match[0];
        
        if (this.countMCPReferences(command) > 0 || this.countMCPReferences(match[0]) > 0) {
          commands.push({
            command,
            filePath: relativePath,
            description: `MCP CLI command in ${relativePath}`,
            parameters: this.extractCommandParameters(content, command),
            implementation: 'cli_command',
            codeSnippet: this.extractCodeSnippet(content, match[0])
          });
        }
      }
    }
    
    return commands;
  }

  private extractCommandParameters(content: string, command: string): string[] {
    const parameters: string[] = [];
    
    // Look for click options or argparse arguments
    const lines = content.split('\n');
    let inCommandSection = false;
    
    for (const line of lines) {
      if (line.includes(command)) {
        inCommandSection = true;
        continue;
      }
      
      if (inCommandSection) {
        if (line.includes('@click.option') || line.includes('add_argument')) {
          const paramMatch = line.match(/['"`]--?([^'"`]+)['"`]/);
          if (paramMatch) {
            parameters.push(paramMatch[1]);
          }
        }
        
        if (line.includes('def ') && !line.includes(command)) {
          break; // End of command definition
        }
      }
    }
    
    return parameters;
  }

  private calculateMCPConfidence(mcpDiscovery: MCPDiscoveryResult): 'low' | 'medium' | 'high' {
    const score = 
      (mcpDiscovery.mcpFiles.length * 2) +
      (mcpDiscovery.mcpConfigurations.length * 5) +
      (mcpDiscovery.mcpToolDefinitions.length * 3) +
      (mcpDiscovery.mcpBridgeImplementations.length * 4) +
      (mcpDiscovery.mcpApiEndpoints.length * 3) +
      (mcpDiscovery.mcpCliCommands.length * 2) +
      (mcpDiscovery.totalMCPReferences * 0.1);
    
    if (score >= 20) return 'high';
    if (score >= 8) return 'medium';
    return 'low';
  }

  private generateMCPIntegrationRecommendations(
    projectName: string, 
    mcpDiscovery: MCPDiscoveryResult
  ): MCPIntegrationRecommendation[] {
    const recommendations: MCPIntegrationRecommendation[] = [];
    
    // High-value configurations
    if (mcpDiscovery.mcpConfigurations.length > 0) {
      recommendations.push({
        projectName,
        integrationType: 'extract_config',
        description: `Extract MCP bridge configurations from ${mcpDiscovery.mcpConfigurations.length} config files`,
        files: mcpDiscovery.mcpConfigurations.map(c => c.filePath),
        priority: 'high',
        effort: 'low'
      });
    }
    
    // Bridge implementations
    if (mcpDiscovery.mcpBridgeImplementations.length > 0) {
      recommendations.push({
        projectName,
        integrationType: 'copy_code',
        description: `Adapt ${mcpDiscovery.mcpBridgeImplementations.length} MCP bridge implementations`,
        files: mcpDiscovery.mcpBridgeImplementations.map(b => b.filePath),
        priority: 'high',
        effort: 'medium'
      });
    }
    
    // Tool definitions
    if (mcpDiscovery.mcpToolDefinitions.length > 0) {
      recommendations.push({
        projectName,
        integrationType: 'adapt_pattern',
        description: `Adapt patterns from ${mcpDiscovery.mcpToolDefinitions.length} MCP tool definitions`,
        files: mcpDiscovery.mcpToolDefinitions.map(t => t.filePath),
        priority: 'medium',
        effort: 'medium'
      });
    }
    
    // API endpoints
    if (mcpDiscovery.mcpApiEndpoints.length > 0) {
      recommendations.push({
        projectName,
        integrationType: 'reference_implementation',
        description: `Reference ${mcpDiscovery.mcpApiEndpoints.length} MCP API endpoint implementations`,
        files: mcpDiscovery.mcpApiEndpoints.map(e => e.filePath),
        priority: 'medium',
        effort: 'low'
      });
    }
    
    // CLI commands
    if (mcpDiscovery.mcpCliCommands.length > 0) {
      recommendations.push({
        projectName,
        integrationType: 'adapt_pattern',
        description: `Adapt patterns from ${mcpDiscovery.mcpCliCommands.length} MCP CLI commands`,
        files: mcpDiscovery.mcpCliCommands.map(c => c.filePath),
        priority: 'low',
        effort: 'low'
      });
    }
    
    return recommendations;
  }

  async autoImport(projects: ProjectAnalysis[]): Promise<void> {
    logger.info('Starting auto-import of discovered secrets', { projectCount: projects.length });

    for (const result of projects) {
      if (result.secrets && result.secrets.length > 0 && result.confidence === 'high') {
        try {
          // Note: VaultAgent.addProject method doesn't exist, so we'll add secrets individually
          const projectData = {
            name: result.projectName,
            description: `Auto-imported from ${result.projectPath}`,
            secrets: result.secrets.map(secret => ({
              key: secret.key,
              value: secret.value,
              source: 'auto_import' as const,
              tags: [secret.type, 'auto_imported'],
              created: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }))
          };

          // For now, we'll just add the secrets to the default project
          // await this.vaultAgent.addProject(projectData);
          logger.info('Would import project', { project: result.projectName, secretCount: result.secrets.length });

        } catch (error) {
          logger.error('Auto-import failed', { project: result.projectName, error: String(error) });
        }
      }
    }
  }

  async generateReport(report: ScanReport): Promise<string> {
    try {
      const reportPath = join(process.cwd(), 'project-scan-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
      
      logger.info('Scan report generated', { 
        reportPath,
        totalProjects: report.totalProjects,
        projectsWithSecrets: report.projectsWithSecrets
      });

      return reportPath;
    } catch (error) {
      logger.error('Report generation failed', { error: String(error) });
      throw new Error(`Failed to generate report: ${String(error)}`);
    }
  }

  async updateVaultMetadata(report: ScanReport): Promise<void> {
    try {
      const metadata = {
        lastScan: report.timestamp,
        totalProjectsScanned: report.totalProjects,
        projectsWithSecrets: report.projectsWithSecrets,
        totalSecretsFound: report.totalSecretsFound,
        scanVersion: '1.0'
      };

      // Note: VaultAgent.updateMetadata method doesn't exist
      // await this.vaultAgent.updateMetadata('projectScan', metadata);
      logger.info('Would update vault metadata', metadata);

    } catch (error) {
      logger.error('Failed to update vault metadata', { error: String(error) });
    }
  }

  private async extractSecretsFromProject(
    projectPath: string, 
    envFiles: string[]
  ): Promise<Array<{
    key: string;
    value: string;
    file: string;
    type: string;
    confidence: number;
  }>> {
    const allSecrets: Array<{
      key: string;
      value: string;
      file: string;
      type: string;
      confidence: number;
    }> = [];
    
    for (const envFile of envFiles) {
      try {
        const filePath = join(projectPath, envFile);
        const secrets = await this.extractSecretsFromFile(filePath);
        allSecrets.push(...secrets);
      } catch (error) {
        logger.warn('Failed to extract secrets from file', { envFile, error: String(error) });
      }
    }
    
    return allSecrets;
  }

  private async extractSecretsFromFile(filePath: string): Promise<Array<{
    key: string;
    value: string;
    file: string;
    type: string;
    confidence: number;
  }>> {
    const secrets: Array<{
      key: string;
      value: string;
      file: string;
      type: string;
      confidence: number;
    }> = [];

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const fileName = basename(filePath);

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
        if (match) {
          const [, key, value] = match;
          if (value && value !== '""' && value !== "''") {
            secrets.push({
              key,
              value: value.replace(/^["']|["']$/g, ''), // Remove quotes
              file: fileName,
              type: this.categorizeSecret(key),
              confidence: this.calculateSecretConfidence(key, value)
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to extract API keys', { filePath, error: String(error) });
    }

    return secrets;
  }

  private categorizeSecret(key: string): string {
    const upperKey = key.toUpperCase();
    
    if (upperKey.includes('API_KEY') || upperKey.includes('APIKEY')) return 'API_KEY';
    if (upperKey.includes('SECRET') || upperKey.includes('TOKEN')) return 'SECRET_TOKEN';
    if (upperKey.includes('PASSWORD') || upperKey.includes('PASS')) return 'PASSWORD';
    if (upperKey.includes('DATABASE') || upperKey.includes('DB_')) return 'DATABASE';
    if (upperKey.includes('REDIS') || upperKey.includes('CACHE')) return 'CACHE';
    if (upperKey.includes('JWT') || upperKey.includes('AUTH')) return 'AUTH';
    if (upperKey.includes('WEBHOOK') || upperKey.includes('CALLBACK')) return 'WEBHOOK';
    if (upperKey.includes('URL') || upperKey.includes('ENDPOINT')) return 'SERVICE_URL';
    
    return 'CONFIGURATION';
  }

  private calculateSecretConfidence(key: string, value: string): number {
    let confidence = 0.3; // Base confidence
    
    // Key-based confidence
    const upperKey = key.toUpperCase();
    if (upperKey.includes('KEY') || upperKey.includes('SECRET') || upperKey.includes('TOKEN')) {
      confidence += 0.3;
    }
    
    // Value-based confidence
    if (value.length > 20) confidence += 0.2;
    if (/^[A-Za-z0-9+/=]{20,}$/.test(value)) confidence += 0.2; // Base64-like
    if (/^[a-f0-9]{32,}$/.test(value)) confidence += 0.3; // Hex hash
    if (value.startsWith('sk-') || value.startsWith('pk_')) confidence += 0.4; // Stripe/OpenAI pattern
    
    return Math.min(confidence, 1.0);
  }
}

// Main execution
async function main(): Promise<void> {
  const scanner = new ProjectScanner();
  
  try {
    await scanner.initialize();
    
    logger.info('🔍 Starting comprehensive project scan...');
    const report = await scanner.scanAllProjects();
    
    logger.info('📊 Generating scan report...');
    const reportPath = await scanner.generateReport(report);
    
    logger.info('💾 Updating vault metadata...');
    await scanner.updateVaultMetadata(report);
    
    // Auto-import high-confidence projects
    const highConfidenceProjects = report.projects.filter(p => p.confidence === 'high');
    if (highConfidenceProjects.length > 0) {
      logger.info('🚀 Auto-importing high-confidence projects...');
      await scanner.autoImport(highConfidenceProjects);
    }
    
    console.log(`\n🎉 Scan completed successfully!`);
    console.log(`📄 Report saved to: ${reportPath}`);
    console.log(`📈 Summary:`);
    console.log(`   • Total projects: ${report.totalProjects}`);
    console.log(`   • Projects with secrets: ${report.projectsWithSecrets}`);
    console.log(`   • Total secrets found: ${report.totalSecretsFound}`);
    console.log(`   • High confidence: ${report.highConfidenceProjects}`);
    console.log(`   • Medium confidence: ${report.mediumConfidenceProjects}`);
    console.log(`   • Low confidence: ${report.lowConfidenceProjects}`);
    
  } catch (error) {
    logger.error('Project scan failed', { error: String(error) });
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { ProjectScanner, type ProjectAnalysis, type ScanReport }; 