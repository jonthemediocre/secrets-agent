#!/usr/bin/env node

/**
 * Project Scanner Script
 * Scans pinokio/api directory for projects and extracts secrets automatically
 */

import { promises as fs } from 'fs';
import { join, basename } from 'path';
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

  constructor(projectsBaseDir: string = 'C:\\Users\\Jonbr\\pinokio\\api') {
    this.projectsBaseDir = projectsBaseDir;
    this.vaultAgent = new VaultAgent('./vault/secrets.sops.yaml');
  }

  async initialize(): Promise<void> {
    try {
      await this.vaultAgent.loadVault();
      logger.info('Project scanner initialized with vault');
    } catch (error) {
      logger.warn('Failed to load vault, will create new one if needed', { error: String(error) });
    }
  }

  async scanAllProjects(): Promise<ScanReport> {
    logger.info('Starting comprehensive project scan', { baseDir: this.projectsBaseDir });

    const projects: ProjectAnalysis[] = [];
    let totalSecretsFound = 0;
    let projectsWithSecrets = 0;
    let highConfidenceProjects = 0;
    let mediumConfidenceProjects = 0;
    let lowConfidenceProjects = 0;

    try {
      const projectDirs = await this.discoverProjects();
      logger.info(`Discovered ${projectDirs.length} potential projects`);

      for (const projectPath of projectDirs) {
        try {
          const projectName = basename(projectPath);
          const analysis = await this.analyzeProject(projectName, projectPath);
          
          if (analysis.estimatedSecrets > 0) {
            projects.push(analysis);
            
            if (analysis.secrets && analysis.secrets.length > 0) {
              totalSecretsFound += analysis.secrets.length;
              projectsWithSecrets++;
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
          return (confidenceOrder[b.confidence] - confidenceOrder[a.confidence]) || 
                 (b.estimatedSecrets - a.estimatedSecrets);
        })
      };

      logger.info('Project scan completed', {
        totalProjects: report.totalProjects,
        projectsWithSecrets: report.projectsWithSecrets,
        totalSecretsFound: report.totalSecretsFound
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
      const envFiles = files.filter(f => 
        f.includes('.env') || 
        f === 'secrets.json' || 
        f === 'secrets.yaml' ||
        f.includes('secret')
      );

      // Find configuration files
      const configFiles = files.filter(f => 
        ['package.json', 'docker-compose.yml', 'config.yaml', 
         'settings.json', 'app.config.js', 'next.config.js'].includes(f)
      );

      analysis.envFiles = envFiles;
      analysis.configFiles = configFiles;
      analysis.hasEnvFiles = envFiles.length > 0;
      analysis.hasConfigFiles = configFiles.length > 0;

      // Estimate secrets count
      analysis.estimatedSecrets = envFiles.length * 3 + configFiles.length;

      // Adjust for known project patterns
      if (files.includes('package.json')) analysis.estimatedSecrets += 2;
      if (files.includes('docker-compose.yml')) analysis.estimatedSecrets += 3;
      if (projectName.toLowerCase().includes('api')) analysis.estimatedSecrets += 2;

      // Calculate confidence
      if (envFiles.length >= 2 || files.some(f => f.toLowerCase().includes('secret'))) {
        analysis.confidence = 'high';
      } else if (envFiles.length >= 1 || configFiles.length >= 2) {
        analysis.confidence = 'medium';
      }

      // Extract actual secrets if confidence is medium or high
      if (analysis.confidence !== 'low' && envFiles.length > 0) {
        analysis.secrets = await this.extractSecretsFromProject(projectPath, envFiles);
      }

      // Use scaffold agent if available (placeholder for now)
      // const scaffoldResult = await this.scaffoldAgent?.suggestSecrets(projectPath);
      // if (scaffoldResult?.suggestions) {
      //   result.suggestions = scaffoldResult.suggestions.map((s: any) => ({
      //     ...s,
      //     source: 'scaffold_agent'
      //   }));
      // }

    } catch (error) {
      logger.warn('Project analysis failed', { projectName, error: String(error) });
    }

    return analysis;
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