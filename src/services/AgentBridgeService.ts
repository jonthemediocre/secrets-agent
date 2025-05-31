import { createLogger } from '../utils/logger';
import { join, normalize } from 'path';
import { promises as fs } from 'fs';
import { MCPBridgeService } from './MCPBridgeService';
import { MCPTool, MCPJobStatus } from './MCPBridgeCore';
import { InitializationError, ErrorCategory, ErrorSeverity } from '../utils/error-types';
import { SecurityValidator, SecureCommandExecutor, SecurityError } from '../utils/security';
import {
  MCPEndpointConfig,
  MCPToolDefinition,
  MCPOperationStatus,
  MCPOperationState,
  MCPServiceStatus,
  MCPExecutionResult,
  MCPTaskPayload,
  MCPTaskResult,
  MCPBridgeServiceConfig
} from '../types/interfaces';

const logger = createLogger('AgentBridgeService');

export interface AgentConfig {
  allowedDirectories: string[];
  maxConcurrentJobs: number;
  jobTimeout: number;
  enableSecurityScanning: boolean;
  rateLimitConfig: {
    windowMs: number;
    maxRequests: number;
  };
}

const DEFAULT_CONFIG: AgentConfig = {
  allowedDirectories: [process.cwd()],
  maxConcurrentJobs: 5,
  jobTimeout: 300000, // 5 minutes
  enableSecurityScanning: true,
  rateLimitConfig: {
    windowMs: 60000, // 1 minute
    maxRequests: 10
  }
};

export class AgentBridgeService {
  private mcpBridgeService?: MCPBridgeService;
  private initialized = false;
  private activeJobs = new Map<string, MCPOperationStatus>();
  private secureExecutor: SecureCommandExecutor;
  private config: AgentConfig;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.secureExecutor = new SecureCommandExecutor(
      this.config.allowedDirectories,
      this.config.rateLimitConfig
    );
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing AgentBridgeService');
      
      // Validate allowed directories
      for (const dir of this.config.allowedDirectories) {
        try {
          const stats = await fs.stat(dir);
          if (!stats.isDirectory()) {
            throw new Error(`${dir} is not a directory`);
          }
        } catch (error) {
          logger.warn('Allowed directory not accessible', { directory: dir, error });
        }
      }

      this.mcpBridgeService = MCPBridgeService.getInstance({
        environment: process.env.NODE_ENV || 'development',
        autoStart: true
      });
      await this.mcpBridgeService.initialize();
      this.initialized = true;
      
      logger.info('AgentBridgeService initialized successfully', {
        allowedDirectories: this.config.allowedDirectories,
        maxConcurrentJobs: this.config.maxConcurrentJobs
      });
    } catch (error) {
      logger.error('Failed to initialize AgentBridgeService', { error });
      throw new InitializationError('AgentBridgeService initialization failed', true, {
        originalError: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down AgentBridgeService');
    
    // Cancel all active jobs
    for (const [jobId, job] of this.activeJobs.entries()) {
      logger.info('Canceling active job', { jobId });
      job.status = MCPOperationState.FAILED;
      job.error = 'Service shutdown';
      job.endTime = new Date();
    }
    
    this.activeJobs.clear();
    this.initialized = false;
    logger.info('AgentBridgeService shutdown complete');
  }

  async executeMCPTool(
    bridgeId: string, 
    toolName: string, 
    parameters: Record<string, any> = {},
    userId?: string
  ): Promise<MCPExecutionResult> {
    const startTime = Date.now();
    const jobId = this.generateJobId();
    
    try {
      if (!this.initialized) {
        throw new Error('AgentBridgeService not initialized');
      }

      // Rate limiting and validation
      if (!this.mcpBridgeService) {
        throw new Error('MCPBridgeService not available');
      }

      // Validate parameters
      const validatedParams = SecurityValidator.validateApiParameters(
        parameters,
        this.getAllowedParameters(toolName)
      );

      // Security audit log
      logger.audit('MCP Tool Execution Started', {
        userId,
        success: false, // Will be updated on completion
        resource: `${bridgeId}/${toolName}`,
        severity: 'medium',
        data: { jobId, bridgeId, toolName }
      });

      // Check concurrent job limit
      if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
        throw new SecurityError('Maximum concurrent jobs reached', {
          activeJobs: this.activeJobs.size,
          maxJobs: this.config.maxConcurrentJobs
        });
      }

      // Create job tracking
      const operation: MCPOperationStatus = {
        operationId: jobId,
        status: MCPOperationState.RUNNING,
        startTime: new Date(),
        bridgeId,
        toolName,
        progress: 0
      };
      
      this.activeJobs.set(jobId, operation);

      try {
        // Execute the tool through MCP bridge
        const result = await this.mcpBridgeService.executeTool(bridgeId, toolName, validatedParams);
        
        operation.status = MCPOperationState.COMPLETED;
        operation.endTime = new Date();
        operation.result = result;
        operation.progress = 100;

        const executionTime = Date.now() - startTime;
        
        // Security audit log for success
        logger.audit('MCP Tool Execution Completed', {
          userId,
          success: true,
          resource: `${bridgeId}/${toolName}`,
          severity: 'low',
          duration: executionTime,
          data: { jobId, bridgeId, toolName }
        });

        return {
          success: true,
          executionTime,
          bridgeId,
          toolName,
          timestamp: new Date().toISOString(),
          status: 'success',
          jobId,
          data: result.data
        };

      } catch (executionError) {
        operation.status = MCPOperationState.FAILED;
        operation.endTime = new Date();
        operation.error = executionError instanceof Error ? executionError.message : String(executionError);
        
        throw executionError;
      } finally {
        // Clean up job tracking after a delay
        setTimeout(() => {
          this.activeJobs.delete(jobId);
        }, 60000); // Keep for 1 minute for status queries
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Security audit log for failure
      logger.audit('MCP Tool Execution Failed', {
        userId,
        success: false,
        resource: `${bridgeId}/${toolName}`,
        severity: 'high',
        duration: executionTime,
        data: { 
          jobId, 
          bridgeId, 
          toolName, 
          error: error instanceof Error ? error.message : String(error)
        }
      });

      logger.error('Failed to execute MCP tool', { 
        error, 
        bridgeId, 
        toolName, 
        jobId,
        executionTime 
      });

      return {
        success: false,
        executionTime,
        bridgeId,
        toolName,
        timestamp: new Date().toISOString(),
        status: 'error',
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async scanProject(
    projectPath: string, 
    scanType: 'secrets' | 'vulnerabilities' | 'all' = 'all',
    userId?: string
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Validate and sanitize project path
      const validatedPath = SecurityValidator.validateProjectPath(
        projectPath, 
        this.config.allowedDirectories
      );

      logger.audit('Project Scan Started', {
        userId,
        success: false,
        resource: validatedPath,
        severity: 'medium',
        data: { scanType }
      });

      // Check if path exists and is accessible
      const stats = await fs.stat(validatedPath);
      if (!stats.isDirectory()) {
        throw new SecurityError('Path is not a directory', { path: validatedPath });
      }

      let results: any = {};

      if (scanType === 'secrets' || scanType === 'all') {
        logger.info('Starting secrets scan', { path: validatedPath });
        results.secrets = await this.scanForSecrets(validatedPath);
      }

      if (scanType === 'vulnerabilities' || scanType === 'all') {
        logger.info('Starting vulnerability scan', { path: validatedPath });
        results.vulnerabilities = await this.scanForVulnerabilities(validatedPath);
      }

      const executionTime = Date.now() - startTime;
      
      logger.audit('Project Scan Completed', {
        userId,
        success: true,
        resource: validatedPath,
        severity: 'low',
        duration: executionTime,
        data: { scanType, resultsCount: Object.keys(results).length }
      });

      return {
        success: true,
        path: validatedPath,
        scanType,
        results,
        executionTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.audit('Project Scan Failed', {
        userId,
        success: false,
        resource: projectPath,
        severity: 'high',
        duration: executionTime,
        data: { 
          scanType, 
          error: error instanceof Error ? error.message : String(error) 
        }
      });

      logger.error('Project scan failed', { error, projectPath, scanType });
      throw error;
    }
  }

  getJobStatus(jobId: string): MCPOperationStatus | undefined {
    return this.activeJobs.get(jobId);
  }

  getActiveJobs(): MCPOperationStatus[] {
    return Array.from(this.activeJobs.values());
  }

  getServiceStatus(): MCPServiceStatus {
    const status = this.mcpBridgeService?.getStatus() || {
      status: 'stopped' as const,
      uptime: 0,
      bridgeCount: 0,
      toolCount: 0,
      toolsCached: 0,
      activeJobs: 0
    };
    
    return {
      status: this.initialized ? 'running' : 'stopped',
      uptime: status.uptime,
      bridgeCount: status.bridgeCount,
      toolCount: status.toolCount,
      toolsCached: status.toolsCached,
      activeJobs: this.activeJobs.size
    };
  }

  private async scanForSecrets(projectPath: string): Promise<any[]> {
    // Implementation for secrets scanning using AI-driven pattern matching
    logger.info('Scanning for secrets', { path: projectPath });
    
    try {
      // Use secure command executor for file operations
      const result = await this.secureExecutor.executeCommand(
        'find',
        [projectPath, '-type', 'f', '-name', '*.js', '-o', '-name', '*.ts', '-o', '-name', '*.json', '-o', '-name', '*.env*', '-o', '-name', '*.yaml', '-o', '-name', '*.yml'],
        { timeout: 30000 }
      );
      
      // Process the files and scan for secrets
      const files = result.stdout.trim().split('\n').filter(f => f.length > 0);
      const secretsFound: any[] = [];
      
      // Production-grade secret detection patterns
      const secretPatterns = [
        { type: 'aws_access_key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'high' },
        { type: 'aws_secret', pattern: /[0-9a-zA-Z/+]{40}/, severity: 'high' },
        { type: 'github_token', pattern: /ghp_[0-9a-zA-Z]{36}/, severity: 'high' },
        { type: 'openai_key', pattern: /sk-[0-9a-zA-Z]{48}/, severity: 'high' },
        { type: 'jwt_token', pattern: /eyJ[0-9a-zA-Z_-]+\.eyJ[0-9a-zA-Z_-]+\.[0-9a-zA-Z_-]+/, severity: 'medium' },
        { type: 'api_key', pattern: /[aA][pP][iI][_-]?[kK][eE][yY]\s*[:=]\s*['"]?[0-9a-zA-Z]{32,}/, severity: 'medium' },
        { type: 'password', pattern: /[pP][aA][sS][sS][wW][oO][rR][dD]\s*[:=]\s*['"][^'"]{8,}/, severity: 'medium' },
        { type: 'database_url', pattern: /(mongodb|mysql|postgres):\/\/[^\s'"]+/, severity: 'high' },
        { type: 'private_key', pattern: /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/, severity: 'critical' }
      ];

      // Scan each file for secrets
      for (const filePath of files.slice(0, 100)) { // Limit to prevent timeouts
        try {
          const content = await this.secureExecutor.executeCommand(
            'cat',
            [filePath],
            { timeout: 5000 }
          );

          const fileContent = content.stdout;
          const lines = fileContent.split('\n');

          lines.forEach((line, lineNumber) => {
            secretPatterns.forEach(pattern => {
              const match = line.match(pattern.pattern);
              if (match) {
                // Avoid false positives in test files and documentation
                if (filePath.includes('/test/') || filePath.includes('.test.') || 
                    filePath.includes('/docs/') || filePath.includes('README') ||
                    line.includes('example') || line.includes('placeholder')) {
                  return;
                }

                secretsFound.push({
                  type: pattern.type,
                  severity: pattern.severity,
                  file: filePath,
                  line: lineNumber + 1,
                  match: match[0].substring(0, 20) + '...', // Truncate for security
                  confidence: this.calculateConfidence(pattern.type, line, filePath),
                  recommendation: this.getRecommendation(pattern.type)
                });
              }
            });
          });

        } catch (fileError) {
          logger.warn('Could not scan file for secrets', { file: filePath, error: fileError });
        }
      }
      
      logger.info('Secrets scan completed', { 
        filesScanned: Math.min(files.length, 100), 
        secretsFound: secretsFound.length,
        criticalFindings: secretsFound.filter(s => s.severity === 'critical').length
      });
      
      return secretsFound;
    } catch (error) {
      logger.error('Secrets scan failed', { error, projectPath });
      throw error;
    }
  }

  private calculateConfidence(type: string, line: string, filePath: string): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence for specific patterns
    if (type === 'private_key' && line.includes('BEGIN')) confidence = 0.95;
    if (type === 'aws_access_key' && line.includes('AKIA')) confidence = 0.9;
    if (type === 'github_token' && line.includes('ghp_')) confidence = 0.9;

    // Decrease confidence for potential false positives
    if (filePath.includes('.example') || filePath.includes('template')) confidence *= 0.3;
    if (line.toLowerCase().includes('fake') || line.toLowerCase().includes('dummy')) confidence *= 0.2;

    return Math.min(confidence, 1.0);
  }

  private getRecommendation(type: string): string {
    const recommendations: Record<string, string> = {
      'aws_access_key': 'Move to AWS IAM roles or environment variables with proper rotation',
      'aws_secret': 'Use AWS Secrets Manager or environment variables with encryption',
      'github_token': 'Use GitHub Apps or fine-grained personal access tokens',
      'openai_key': 'Store in secure environment variables or secrets management system',
      'jwt_token': 'Ensure proper expiration and use secure storage for refresh tokens',
      'api_key': 'Move to environment variables or secure secrets management',
      'password': 'Use secure password hashing and environment variables',
      'database_url': 'Use connection pooling with secure credential management',
      'private_key': 'Store in secure key management system with proper access controls'
    };

    return recommendations[type] || 'Review and secure this credential using best practices';
  }

  private async scanForVulnerabilities(projectPath: string): Promise<any[]> {
    // Implementation for vulnerability scanning
    logger.info('Scanning for vulnerabilities', { path: projectPath });
    
    try {
      // Check for package.json and run security audit
      const packageJsonPath = join(projectPath, 'package.json');
      
      try {
        await fs.access(packageJsonPath);
        
        // Use secure command executor for npm audit
        const result = await this.secureExecutor.executeCommand(
          'npm',
          ['audit', '--json'],
          { cwd: projectPath, timeout: 60000 }
        );
        
        const auditData = JSON.parse(result.stdout);
        return auditData.vulnerabilities || [];
      } catch (auditError) {
        logger.warn('npm audit failed', { error: auditError, projectPath });
        return [];
      }
    } catch (error) {
      logger.error('Vulnerability scan failed', { error, projectPath });
      throw error;
    }
  }

  private getAllowedParameters(toolName: string): string[] {
    // Define allowed parameters per tool
    const allowedParams: Record<string, string[]> = {
      'default': ['input', 'options', 'config', 'parameters'],
      'file_scanner': ['path', 'pattern', 'recursive', 'exclude'],
      'secret_detector': ['content', 'pattern', 'confidence'],
      'vulnerability_checker': ['package', 'version', 'severity']
    };
    
    return allowedParams[toolName] || allowedParams['default'];
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 