import { NextRequest, NextResponse } from 'next/server';
import { VaultAgent } from '../../../vault/VaultAgent';
import { AgentBridgeService, SecretSuggestion } from '../../../src/services/AgentBridgeService';
import { createLogger } from '../../../src/utils/logger';

const logger = createLogger('ProjectsAPI');

// Initialize services
const vaultPath = process.env.VAULT_PATH || './vault/secrets.sops.yaml';
const vaultAgent = new VaultAgent(vaultPath);
const agentBridge = new AgentBridgeService();

export async function GET(request: NextRequest) {
  try {
    logger.info('Projects list request');

    // Load vault to get existing projects
    await vaultAgent.loadVault();
    const vaultData = vaultAgent.getVaultDataForTesting();
    
    const projects = [];

    if (vaultData?.projects) {
      // Add existing vault projects
      for (const project of vaultData.projects) {
        projects.push({
          id: project.name,
          name: project.name,
          description: project.description || `Project with ${project.secrets.length} secrets`,
          type: 'vault',
          secretCount: project.secrets.length,
          lastUpdated: new Date(project.lastUpdated).toISOString(),
          created: new Date(project.created).toISOString(),
          categories: Array.from(new Set(project.secrets.map(s => s.category).filter(Boolean)))
        });
      }
    }

    // If no projects exist, create a default one
    if (projects.length === 0) {
      logger.info('No projects found, creating default project');
      
      const defaultProject = await vaultAgent.createProject(
        'default', 
        'Default project for secrets management'
      );
      
      projects.push({
        id: defaultProject.name,
        name: defaultProject.name,
        description: defaultProject.description || 'Default project for secrets management',
        type: 'vault',
        secretCount: 0,
        lastUpdated: new Date(defaultProject.lastUpdated).toISOString(),
        created: new Date(defaultProject.created).toISOString(),
        categories: []
      });
    }

    logger.info('Projects list successful', { projectCount: projects.length });

    return NextResponse.json({
      success: true,
      projects,
      total: projects.length,
      vault: {
        path: vaultPath,
        hasData: !!vaultData
      },
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'X-Secrets-Agent': 'real-vault-projects',
        'X-Project-Count': projects.length.toString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Projects list failed', { error: errorMessage });

    // Handle specific vault errors
    if (errorMessage.includes('Vault load failed') || errorMessage.includes('sops')) {
      return NextResponse.json(
        { 
          error: 'Vault access failed',
          details: 'Unable to decrypt vault. Ensure SOPS keys are configured and vault exists.',
          suggestion: 'Run vault initialization or check SOPS configuration',
          projects: [] // Return empty array as fallback
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Projects list failed',
        details: errorMessage,
        projects: [] // Return empty array as fallback
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, scanPath } = body;

    logger.info('Project creation request', { name, description, scanPath });

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Load vault
    await vaultAgent.loadVault();

    // Check if project already exists
    const existingProject = await vaultAgent.getProject(name);
    if (existingProject) {
      return NextResponse.json(
        { 
          error: 'Project already exists',
          details: `Project '${name}' already exists in the vault`
        },
        { status: 409 }
      );
    }

    // Create new project
    const newProject = await vaultAgent.createProject(name, description);

    // If scanPath is provided, scan for secrets
    let suggestions: SecretSuggestion[] = [];
    if (scanPath) {
      try {
        logger.info('Scanning project path for secrets', { name, scanPath });
        suggestions = await agentBridge.scanProjectSecrets(scanPath);
        logger.info('Project scan completed', { name, scanPath, suggestionsCount: suggestions.length });
      } catch (scanError) {
        logger.warn('Project scan failed but project created', { 
          name, 
          scanPath, 
          error: scanError instanceof Error ? scanError.message : String(scanError) 
        });
      }
    }

    const project = {
      id: newProject.name,
      name: newProject.name,
      description: newProject.description,
      type: 'vault' as const,
      secretCount: 0,
      lastUpdated: new Date(newProject.lastUpdated).toISOString(),
      created: new Date(newProject.created).toISOString(),
      categories: [],
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };

    logger.info('Project creation successful', { name, suggestionsCount: suggestions.length });

    return NextResponse.json({
      success: true,
      message: 'Project created successfully',
      project,
      suggestions,
      timestamp: new Date().toISOString()
    }, { 
      status: 201,
      headers: {
        'X-Secrets-Agent': 'real-vault-project-creation',
        'X-Project': name
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Project creation failed', { error: errorMessage });

    return NextResponse.json(
      { 
        error: 'Project creation failed',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
} 