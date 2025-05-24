import { createLogger } from '../src/utils/logger';
import { VaultAgent } from '../vault/VaultAgent';
import { AgentBridgeService, SecretSuggestion } from '../src/services/AgentBridgeService';
import { parseEnvFile } from '../src/utils/EnvFileParser';
import { SecretEntry } from '../vault/VaultTypes';
import { readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

const logger = createLogger('SecretScaffoldAgent');

export interface SecretScaffoldConfig {
  projectPath: string;
  vaultPath: string;
  scanDepth?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface ScaffoldResult {
  suggestions: SecretSuggestion[];
  existingSecrets: string[];
  conflicts: Array<{
    key: string;
    existingValue: string;
    suggestedValue?: string;
    action: 'overwrite' | 'skip' | 'rename';
  }>;
  statistics: {
    filesScanned: number;
    suggestionsGenerated: number;
    conflictsFound: number;
    confidenceScore: number;
  };
}

export interface SecretTemplate {
  key: string;
  description: string;
  example?: string;
  required: boolean;
  category: string;
  sources: string[];
}

/**
 * SecretScaffoldAgent - Intelligent secret detection and suggestion agent
 * 
 * This agent analyzes project files to detect secret requirements and suggests
 * missing secrets based on existing Python CLI infrastructure and basic file analysis.
 */
export class SecretScaffoldAgent {
  private config: SecretScaffoldConfig;
  private vaultAgent: VaultAgent;
  private bridgeService: AgentBridgeService;

  constructor(config: SecretScaffoldConfig) {
    this.config = config;
    this.vaultAgent = new VaultAgent(config.vaultPath);
    this.bridgeService = new AgentBridgeService();

    // Set sensible defaults
    this.config.scanDepth = config.scanDepth || 3;
    this.config.includePatterns = config.includePatterns || ['**/.env*', '**/docker-compose*.yml'];
    this.config.excludePatterns = config.excludePatterns || ['**/node_modules/**', '**/dist/**'];
  }

  /**
   * Perform comprehensive secret scaffolding analysis
   * 
   * @param projectName - Name of the project for vault organization
   * @returns Detailed scaffold results with suggestions and conflicts
   */
  async scaffoldProjectSecrets(projectName: string): Promise<ScaffoldResult> {
    try {
      logger.info('Starting secret scaffolding analysis', { 
        projectPath: this.config.projectPath,
        projectName 
      });

      // Initialize result structure
      const result: ScaffoldResult = {
        suggestions: [],
        existingSecrets: [],
        conflicts: [],
        statistics: {
          filesScanned: 0,
          suggestionsGenerated: 0,
          conflictsFound: 0,
          confidenceScore: 0
        }
      };

      // Load existing vault data
      const vaultData = await this.vaultAgent.loadVault();
      const existingProject = vaultData.projects.find(p => p.name === projectName);
      if (existingProject) {
        result.existingSecrets = existingProject.secrets.map(s => s.key);
      }

      // 1. Use bridge service for Python CLI scanning
      try {
        const cliSuggestions = await this.bridgeService.scanProjectSecrets(this.config.projectPath);
        result.suggestions.push(...cliSuggestions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn('Python CLI scanning failed, continuing with basic analysis', { error: errorMessage });
      }

      // 2. Basic environment file scanning
      const envSuggestions = await this.scanBasicEnvironmentFiles();
      result.suggestions.push(...envSuggestions);

      // 3. Generate project-specific templates
      const templates = await this.generateSecretTemplates();
            const templateSuggestions = templates.map(template => ({        key: template.key,        suggestedValue: template.example || '',        source: 'scaffold' as const,        confidence: template.required ? 0.9 : 0.6,        category: template.category,        description: template.description      }));
      result.suggestions.push(...templateSuggestions);

      // Deduplicate suggestions
      result.suggestions = this.deduplicateSuggestions(result.suggestions);

      // Check for conflicts with existing secrets
      result.conflicts = this.identifyConflicts(result.suggestions, result.existingSecrets);

      // Calculate statistics
      result.statistics.suggestionsGenerated = result.suggestions.length;
      result.statistics.conflictsFound = result.conflicts.length;
      result.statistics.confidenceScore = this.calculateConfidenceScore(result.suggestions);

      logger.info('Secret scaffolding analysis completed', {
        projectName,
        suggestionsCount: result.suggestions.length,
        conflictsCount: result.conflicts.length,
        confidenceScore: result.statistics.confidenceScore
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Secret scaffolding analysis failed', {
        projectPath: this.config.projectPath,
        error: errorMessage
      });
      throw new Error(`Scaffolding analysis failed: ${errorMessage}`);
    }
  }

  /**
   * Apply suggested secrets to the vault
   * 
   * @param projectName - Project name
   * @param suggestions - Suggestions to apply
   * @param conflictResolution - How to handle conflicts
   * @returns Number of secrets added
   */
  async applySuggestions(
    projectName: string,
    suggestions: SecretSuggestion[],
    conflictResolution: 'overwrite' | 'skip' | 'prompt' = 'skip'
  ): Promise<number> {
    try {
      logger.info('Applying secret suggestions', { 
        projectName, 
        suggestionsCount: suggestions.length 
      });

      let addedCount = 0;
      const vaultData = await this.vaultAgent.loadVault();

      // Ensure project exists
      let project = vaultData.projects.find(p => p.name === projectName);
      if (!project) {
        project = await this.vaultAgent.createProject(projectName, 'Auto-generated from secret scaffolding');
      }

      for (const suggestion of suggestions) {
        const existingSecret = project.secrets.find(s => s.key === suggestion.key);

        if (existingSecret && conflictResolution === 'skip') {
          logger.debug('Skipping existing secret', { key: suggestion.key });
          continue;
        }

        const secretEntry: Omit<SecretEntry, 'created' | 'lastUpdated'> = {
          key: suggestion.key,
          value: suggestion.suggestedValue || '',
          description: suggestion.description || 'Auto-generated from secret scaffolding',
          tags: [suggestion.category || 'general', 'scaffold-generated'],
          category: suggestion.category || 'general',
          source: suggestion.source,
          metadata: {
            confidence: suggestion.confidence,
            scaffoldGenerated: true
          }
        };

        if (existingSecret && conflictResolution === 'overwrite') {
          await this.vaultAgent.updateSecret(projectName, suggestion.key, secretEntry);
        } else if (!existingSecret) {
          await this.vaultAgent.addSecret(projectName, secretEntry);
        }

        addedCount++;
        logger.debug('Added secret suggestion', { 
          key: suggestion.key, 
          source: suggestion.source 
        });
      }

      logger.info('Secret suggestions applied', { 
        projectName, 
        addedCount 
      });

      return addedCount;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to apply secret suggestions', {
        projectName,
        error: errorMessage
      });
      throw new Error(`Failed to apply suggestions: ${errorMessage}`);
    }
  }

  /**
   * Generate secret templates based on project type detection
   * 
   * @returns Array of secret templates for the detected project type
   */
  async generateSecretTemplates(): Promise<SecretTemplate[]> {
    const templates: SecretTemplate[] = [];
    const projectType = await this.detectProjectType();

    logger.info('Generating secret templates', { 
      projectType,
      projectPath: this.config.projectPath 
    });

    // Common templates for all projects
    templates.push(...this.getCommonSecretTemplates());

    // Project-specific templates
    switch (projectType) {
      case 'nextjs':
        templates.push(...this.getNextJSTemplates());
        break;
      case 'react':
        templates.push(...this.getReactTemplates());
        break;
      case 'node':
        templates.push(...this.getNodeJSTemplates());
        break;
      case 'python':
        templates.push(...this.getPythonTemplates());
        break;
      case 'docker':
        templates.push(...this.getDockerTemplates());
        break;
    }

    return templates;
  }

  /**
   * Basic environment file scanning without complex glob patterns
   */
  private async scanBasicEnvironmentFiles(): Promise<SecretSuggestion[]> {
    const suggestions: SecretSuggestion[] = [];
    const commonEnvFiles = ['.env.example', '.env.template', '.env.sample'];

    for (const envFileName of commonEnvFiles) {
      const envFile = join(this.config.projectPath, envFileName);
      if (!existsSync(envFile)) continue;

      try {
        const content = readFileSync(envFile, 'utf-8');
        const envVars = parseEnvFile(content);

        for (const [key, value] of Object.entries(envVars)) {
                    suggestions.push({            key,            suggestedValue: value.includes('example') || value.includes('your_') ? '' : value,            source: 'env',            confidence: 0.9,            category: this.categorizeSecretKey(key),            description: `Found in ${envFileName}`          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn('Failed to parse environment file', { 
          envFile, 
          error: errorMessage
        });
      }
    }

    return suggestions;
  }

  /**
   * Deduplicate suggestions by key, keeping highest confidence
   */
  private deduplicateSuggestions(suggestions: SecretSuggestion[]): SecretSuggestion[] {
    const keyMap = new Map<string, SecretSuggestion>();

    for (const suggestion of suggestions) {
      const existing = keyMap.get(suggestion.key);
      if (!existing || suggestion.confidence > existing.confidence) {
        keyMap.set(suggestion.key, suggestion);
      }
    }

    return Array.from(keyMap.values());
  }

  /**
   * Identify conflicts between suggestions and existing secrets
   */
  private identifyConflicts(suggestions: SecretSuggestion[], existingSecrets: string[]) {
    return suggestions
      .filter(s => existingSecrets.includes(s.key))
      .map(s => ({
        key: s.key,
        existingValue: '[REDACTED]',
        suggestedValue: s.suggestedValue,
        action: 'skip' as const
      }));
  }

  /**
   * Calculate overall confidence score for suggestions
   */
  private calculateConfidenceScore(suggestions: SecretSuggestion[]): number {
    if (suggestions.length === 0) return 0;
    
    const totalConfidence = suggestions.reduce((sum, s) => sum + s.confidence, 0);
    return Math.round((totalConfidence / suggestions.length) * 100) / 100;
  }

  /**
   * Detect project type based on files present
   */
  private async detectProjectType(): Promise<string> {
    const projectPath = this.config.projectPath;
    
    if (existsSync(join(projectPath, 'next.config.js')) || existsSync(join(projectPath, 'next.config.ts'))) {
      return 'nextjs';
    } else if (existsSync(join(projectPath, 'package.json'))) {
      return 'node';
    } else if (existsSync(join(projectPath, 'pyproject.toml')) || existsSync(join(projectPath, 'requirements.txt'))) {
      return 'python';
    } else if (existsSync(join(projectPath, 'docker-compose.yml')) || existsSync(join(projectPath, 'Dockerfile'))) {
      return 'docker';
    } else {
      return 'generic';
    }
  }

  /**
   * Categorize secret keys by purpose
   */
  private categorizeSecretKey(key: string): string {
    const keyLower = key.toLowerCase();
    
    if (keyLower.includes('api') || keyLower.includes('token')) {
      return 'api_credentials';
    } else if (keyLower.includes('db') || keyLower.includes('database')) {
      return 'database';
    } else if (keyLower.includes('auth') || keyLower.includes('secret') || keyLower.includes('key')) {
      return 'authentication';
    } else if (keyLower.includes('url') || keyLower.includes('endpoint')) {
      return 'endpoints';
    } else if (keyLower.includes('email') || keyLower.includes('smtp')) {
      return 'communication';
    } else {
      return 'general';
    }
  }

  // Template generation methods
  private getCommonSecretTemplates(): SecretTemplate[] {
    return [
      {
        key: 'NODE_ENV',
        description: 'Application environment',
        example: 'development',
        required: true,
        category: 'environment',
        sources: ['common']
      },
      {
        key: 'PORT',
        description: 'Application port',
        example: '3000',
        required: false,
        category: 'configuration',
        sources: ['common']
      }
    ];
  }

  private getNextJSTemplates(): SecretTemplate[] {
    return [
      {
        key: 'NEXTAUTH_SECRET',
        description: 'NextAuth.js secret key',
        required: true,
        category: 'authentication',
        sources: ['nextjs']
      },
      {
        key: 'NEXTAUTH_URL',
        description: 'NextAuth.js callback URL',
        example: 'http://localhost:3000',
        required: true,
        category: 'authentication',
        sources: ['nextjs']
      }
    ];
  }

  private getReactTemplates(): SecretTemplate[] {
    return [
      {
        key: 'REACT_APP_API_URL',
        description: 'API base URL',
        required: true,
        category: 'endpoints',
        sources: ['react']
      }
    ];
  }

  private getNodeJSTemplates(): SecretTemplate[] {
    return [
      {
        key: 'JWT_SECRET',
        description: 'JWT signing secret',
        required: true,
        category: 'authentication',
        sources: ['nodejs']
      }
    ];
  }

  private getPythonTemplates(): SecretTemplate[] {
    return [
      {
        key: 'DJANGO_SECRET_KEY',
        description: 'Django secret key',
        required: true,
        category: 'authentication',
        sources: ['python', 'django']
      }
    ];
  }

  private getDockerTemplates(): SecretTemplate[] {
    return [
      {
        key: 'DOCKER_REGISTRY_URL',
        description: 'Docker registry URL',
        required: false,
        category: 'configuration',
        sources: ['docker']
      }
    ];
  }
} 