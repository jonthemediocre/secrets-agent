import { NextRequest, NextResponse } from 'next/server';
import { VaultAgent } from '../../../../vault/VaultAgent';
import { createLogger } from '../../../../src/utils/logger';

const logger = createLogger('EnvImportAPI');

// Initialize VaultAgent with configurable path
const vaultPath = process.env.VAULT_PATH || './vault/secrets.sops.yaml';
const vaultAgent = new VaultAgent(vaultPath);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, category = 'environment', overwrite = false, envContent } = body;

    logger.info('Environment import request', { project, category, overwrite, contentLength: envContent?.length });

    if (!project) {
      return NextResponse.json(
        { error: 'Project parameter is required' },
        { status: 400 }
      );
    }

    if (!envContent) {
      return NextResponse.json(
        { error: 'Environment content is required' },
        { status: 400 }
      );
    }

    if (typeof envContent !== 'string') {
      return NextResponse.json(
        { error: 'Environment content must be a string' },
        { status: 400 }
      );
    }

    // Load vault
    await vaultAgent.loadVault();

    // Check if project exists, create if it doesn't
    let targetProject = await vaultAgent.getProject(project);
    if (!targetProject) {
      logger.info('Creating new project for import', { project });
      targetProject = await vaultAgent.createProject(project, `Project created via environment import`);
    }

    // Count variables before import for reporting
    const envLines = envContent.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#') && line.includes('='));
    const parsedVarCount = envLines.length;

    if (parsedVarCount === 0) {
      return NextResponse.json(
        { 
          error: 'No valid environment variables found in content',
          details: 'Please ensure the content follows .env format (KEY=value)' 
        },
        { status: 400 }
      );
    }

    // Use VaultAgent's import functionality
    vaultAgent.importEnvToVault(envContent, { 
      project, 
      category, 
      overwrite 
    });

    // Save the vault
    await vaultAgent.saveVault();

    // Get updated project to count imported secrets
    const updatedProject = await vaultAgent.getProject(project);
    const totalSecrets = updatedProject?.secrets.length || 0;
    const categorySecrets = updatedProject?.secrets.filter(s => s.category === category).length || 0;

    logger.info('Environment import successful', { 
      project, 
      category, 
      overwrite,
      parsedVarCount,
      totalSecrets,
      categorySecrets
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Environment variables imported successfully',
      imported: {
        count: parsedVarCount,
        project,
        category,
        overwrite
      },
      vault: {
        totalSecrets,
        categorySecrets
      },
      timestamp: new Date().toISOString()
    }, { 
      status: 201,
      headers: {
        'X-Secrets-Agent': 'real-vault-import',
        'X-Project': project,
        'X-Category': category
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Environment import failed', { 
      error: errorMessage,
      body: request.body
    });

    // Handle specific vault errors
    if (errorMessage.includes('already exists') && !errorMessage.includes('overwrite')) {
      return NextResponse.json(
        { 
          error: 'Project already exists',
          details: errorMessage,
          suggestion: 'Use overwrite=true to update existing secrets or choose a different project name'
        },
        { status: 409 }
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

    if (errorMessage.includes('Invalid JSON') || errorMessage.includes('parse')) {
      return NextResponse.json(
        { 
          error: 'Invalid request format',
          details: 'Request body must be valid JSON with required fields',
          suggestion: 'Ensure project and envContent are provided'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Environment import failed',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
} 