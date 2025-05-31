import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description = 'Manual backup', includeMetadata = true } = body;

    console.log('Creating vault backup...');

    // Ensure backup directory exists
    const backupDir = 'vault/backups';
    if (!existsSync(backupDir)) {
      await mkdir(backupDir, { recursive: true });
    }

    // Read current vault
    let vaultData: any = {};
    try {
      const vaultContent = await readFile('vault/secrets.sops.yaml', 'utf-8');
      vaultData = JSON.parse(vaultContent);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No vault found to backup' 
        },
        { status: 404 }
      );
    }

    // Create backup metadata
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup-${timestamp}`;
    const backupFileName = `${backupId}.json`;
    const backupPath = path.join(backupDir, backupFileName);

    const backupData = {
      backupId,
      created: new Date().toISOString(),
      description,
      version: vaultData.version || '1.0',
      vaultData: includeMetadata ? vaultData : {
        projects: vaultData.projects,
        version: vaultData.version
      },
      metadata: {
        secretCount: Object.keys(vaultData.projects || {}).reduce((total, env) => {
          return total + Object.keys(vaultData.projects[env]?.secrets || {}).length;
        }, 0),
        environments: Object.keys(vaultData.projects || {}),
        originalSize: JSON.stringify(vaultData).length,
        backupSize: 0 // Will be calculated after stringification
      }
    };

    // Calculate backup size
    const backupJson = JSON.stringify(backupData, null, 2);
    backupData.metadata.backupSize = backupJson.length;

    // Write backup file
    await writeFile(backupPath, backupJson, 'utf-8');

    // Update vault metadata with backup info
    if (!vaultData.metadata) {
      vaultData.metadata = {};
    }
    if (!vaultData.metadata.backups) {
      vaultData.metadata.backups = [];
    }

    vaultData.metadata.backups.push({
      backupId,
      created: new Date().toISOString(),
      description,
      fileName: backupFileName,
      size: backupData.metadata.backupSize
    });

    vaultData.metadata.lastBackup = new Date().toISOString();
    vaultData.metadata.lastModified = new Date().toISOString();

    // Update vault with backup metadata
    await writeFile('vault/secrets.sops.yaml', JSON.stringify(vaultData, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Vault backup created successfully',
      data: {
        backupId,
        fileName: backupFileName,
        path: backupPath,
        size: backupData.metadata.backupSize,
        secretCount: backupData.metadata.secretCount,
        environments: backupData.metadata.environments,
        created: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create backup error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create backup',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 