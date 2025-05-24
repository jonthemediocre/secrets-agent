import { NextRequest, NextResponse } from 'next/server';
import { SecretScaffoldAgent, SecretScaffoldConfig } from '../../../../agents/SecretScaffoldAgent';
import { createLogger } from '../../../../src/utils/logger';

const logger = createLogger('SecretScaffoldAPI');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, projectPath, action, suggestions } = body;

    logger.info('Secret scaffold request', { project, projectPath, action });

    if (!project) {
      return NextResponse.json(
        { error: 'Project parameter is required' },
        { status: 400 }
      );
    }

    // Configure scaffold agent
    const vaultPath = process.env.VAULT_PATH || './vault/secrets.sops.yaml';
    const config: SecretScaffoldConfig = {
      projectPath: projectPath || process.cwd(),
      vaultPath,
      scanDepth: 3,
      includePatterns: ['**/.env*', '**/docker-compose*.yml', '**/package.json', '**/requirements.txt'],
      excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
    };

    const scaffoldAgent = new SecretScaffoldAgent(config);

    if (action === 'scan') {
      // Perform secret scaffolding analysis
      const scaffoldResult = await scaffoldAgent.scaffoldProjectSecrets(project);

      // Enhance suggestions with UI-friendly metadata
      const enhancedSuggestions = scaffoldResult.suggestions.map(suggestion => ({
        ...suggestion,
        uiMetadata: {
          priority: suggestion.confidence > 0.8 ? 'high' : suggestion.confidence > 0.6 ? 'medium' : 'low',
          icon: getSecretIcon(suggestion.key, suggestion.category),
          estimatedValue: generateEstimatedValue(suggestion.key),
          helpText: getHelpText(suggestion.key, suggestion.category)
        }
      }));

      logger.info('Secret scaffolding completed', {
        project,
        projectPath,
        suggestionsCount: enhancedSuggestions.length,
        conflictsCount: scaffoldResult.conflicts.length,
        confidenceScore: scaffoldResult.statistics.confidenceScore
      });

      return NextResponse.json({
        success: true,
        message: 'Secret scaffolding analysis completed',
        result: {
          ...scaffoldResult,
          suggestions: enhancedSuggestions
        },
        metadata: {
          projectPath: config.projectPath,
          scanDepth: config.scanDepth,
          analysisTimestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      }, {
        headers: {
          'X-Secrets-Agent': 'secret-scaffold',
          'X-Project': project,
          'X-Suggestions-Count': enhancedSuggestions.length.toString()
        }
      });

    } else if (action === 'apply') {
      // Apply suggestions to vault
      if (!suggestions || !Array.isArray(suggestions)) {
        return NextResponse.json(
          { error: 'Suggestions array is required for apply action' },
          { status: 400 }
        );
      }

      const conflictResolution = body.conflictResolution || 'skip';
      const addedCount = await scaffoldAgent.applySuggestions(
        project,
        suggestions,
        conflictResolution
      );

      logger.info('Secret suggestions applied', {
        project,
        addedCount,
        totalSuggestions: suggestions.length,
        conflictResolution
      });

      return NextResponse.json({
        success: true,
        message: `Successfully applied ${addedCount} secret suggestions`,
        applied: {
          count: addedCount,
          project,
          conflictResolution
        },
        timestamp: new Date().toISOString()
      }, {
        status: 201,
        headers: {
          'X-Secrets-Agent': 'secret-scaffold-apply',
          'X-Project': project,
          'X-Applied-Count': addedCount.toString()
        }
      });

    } else {
      return NextResponse.json(
        { error: `Unknown action: ${action}. Supported actions: scan, apply` },
        { status: 400 }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Secret scaffold operation failed', { error: errorMessage });

    // Handle specific errors
    if (errorMessage.includes('Project path does not exist')) {
      return NextResponse.json(
        { 
          error: 'Project path not found',
          details: 'The specified project path does not exist or is not accessible',
          suggestion: 'Verify the project path and ensure proper permissions'
        },
        { status: 404 }
      );
    }

    if (errorMessage.includes('Vault load failed') || errorMessage.includes('sops')) {
      return NextResponse.json(
        { 
          error: 'Vault access failed',
          details: 'Unable to access or decrypt vault. Ensure SOPS keys are configured.',
          suggestion: 'Run vault initialization or check SOPS configuration'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Secret scaffold operation failed',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// Helper functions for UI enhancement
function getSecretIcon(key: string, category?: string): string {
  const keyLower = key.toLowerCase();
  
  if (keyLower.includes('api') || keyLower.includes('token')) return '🔑';
  if (keyLower.includes('database') || keyLower.includes('db')) return '🗄️';
  if (keyLower.includes('password') || keyLower.includes('pass')) return '🔐';
  if (keyLower.includes('url') || keyLower.includes('endpoint')) return '🌐';
  if (keyLower.includes('key') || keyLower.includes('secret')) return '🔓';
  if (keyLower.includes('email') || keyLower.includes('mail')) return '✉️';
  if (keyLower.includes('port') || keyLower.includes('host')) return '🖥️';
  if (keyLower.includes('auth') || keyLower.includes('jwt')) return '🛡️';
  
  // Category-based icons
  if (category === 'database') return '🗄️';
  if (category === 'api') return '🔗';
  if (category === 'authentication') return '🛡️';
  if (category === 'environment') return '⚙️';
  
  return '🔒'; // Default secret icon
}

function generateEstimatedValue(key: string): string {
  const keyLower = key.toLowerCase();
  
  if (keyLower.includes('port')) return '3000';
  if (keyLower.includes('host') && !keyLower.includes('db')) return 'localhost';
  if (keyLower.includes('env') && keyLower.includes('node')) return 'development';
  if (keyLower.includes('debug')) return 'false';
  if (keyLower.includes('ssl') || keyLower.includes('tls')) return 'true';
  if (keyLower.includes('timeout')) return '30000';
  if (keyLower.includes('max') && keyLower.includes('connection')) return '10';
  
  // Database-related
  if (keyLower.includes('db') && keyLower.includes('host')) return 'localhost';
  if (keyLower.includes('db') && keyLower.includes('port')) return '5432';
  if (keyLower.includes('db') && keyLower.includes('name')) return 'app_database';
  
  return '[REQUIRED]'; // Placeholder for required values
}

function getHelpText(key: string, category?: string): string {
  const keyLower = key.toLowerCase();
  
  if (keyLower.includes('api_key')) return 'API key for external service authentication';
  if (keyLower.includes('database_url')) return 'Full connection string for database access';
  if (keyLower.includes('jwt_secret')) return 'Secret key for JWT token signing and verification';
  if (keyLower.includes('smtp')) return 'Email service configuration for sending notifications';
  if (keyLower.includes('redis')) return 'Redis connection for caching and session storage';
  if (keyLower.includes('aws')) return 'AWS credentials for cloud service access';
  if (keyLower.includes('google')) return 'Google API credentials for integration';
  if (keyLower.includes('stripe')) return 'Stripe payment processing credentials';
  
  // Category-based help
  if (category === 'database') return 'Database connection and authentication details';
  if (category === 'api') return 'External API integration credentials';
  if (category === 'authentication') return 'User authentication and authorization settings';
  if (category === 'environment') return 'Environment-specific configuration values';
  
  return 'Application configuration value - update as needed';
} 