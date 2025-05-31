import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value, environment = 'default', tags = [] } = body;

    if (!key || !value) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Key and value are required' 
        },
        { status: 400 }
      );
    }

    console.log(`Adding secret: ${key} to environment: ${environment}`);

    // Read current vault
    let vaultData: any = {};
    try {
      const vaultContent = await readFile('vault/secrets.sops.yaml', 'utf-8');
      vaultData = JSON.parse(vaultContent);
    } catch (error) {
      // If vault doesn't exist, create new structure
      vaultData = {
        version: "1.0",
        metadata: {
          created: new Date().toISOString(),
          lastModified: new Date().toISOString()
        },
        projects: {},
        globalTags: []
      };
    }

    // Ensure projects structure exists
    if (!vaultData.projects) {
      vaultData.projects = {};
    }

    if (!vaultData.projects[environment]) {
      vaultData.projects[environment] = {
        secrets: {},
        metadata: {
          created: new Date().toISOString(),
          environment: environment
        }
      };
    }

    // Add the new secret
    vaultData.projects[environment].secrets[key] = {
      value: value,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      source: 'manual',
      tags: tags,
      rotationPolicy: 'manual'
    };

    // Update metadata
    vaultData.metadata.lastModified = new Date().toISOString();

    // Write back to vault (in production, this would use SOPS encryption)
    await writeFile('vault/secrets.sops.yaml', JSON.stringify(vaultData, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: `Secret '${key}' added successfully`,
      data: {
        key,
        environment,
        created: new Date().toISOString(),
        tags
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Add secret error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add secret',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 