import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface VaultStatus {
  sopsConfigured: boolean;
  vaultPathAccessible: boolean;
  encryptionWorking: boolean;
  keyCount: number;
  lastBackup?: string;
  vaultSize?: string;
  agentStatus: {
    vaultAgent: boolean;
    rotationAgent: boolean;
    mcpBridge: boolean;
  };
  dominoMode: {
    enabled: boolean;
    lastAudit?: string;
    auditStatus: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('Vault status request received');

    // Check SOPS configuration
    let sopsConfigured = false;
    let keyCount = 0;
    
    try {
      const sopsConfigPath = path.join(process.cwd(), '.sops.yaml');
      const sopsConfig = await fs.readFile(sopsConfigPath, 'utf-8');
      sopsConfigured = sopsConfig.includes('age') || sopsConfig.includes('pgp');
    } catch (err) {
      console.log('SOPS config not found or invalid');
    }

    // Count actual secrets in vault, not encryption keys
    try {
      const vaultFile = path.join(process.cwd(), 'vault', 'secrets.sops.yaml');
      const vaultContent = await fs.readFile(vaultFile, 'utf-8');
      
      if (vaultContent.trim().startsWith('{')) {
        // JSON format vault
        const vaultData = JSON.parse(vaultContent);
        if (vaultData.projects && Array.isArray(vaultData.projects)) {
          keyCount = vaultData.projects.reduce((total: number, project: any) => {
            return total + (project.secrets ? project.secrets.length : 0);
          }, 0);
        }
      } else {
        // YAML format - count key-value pairs
        const lines = vaultContent.split('\n');
        keyCount = lines.filter(line => line.includes(':') && !line.trim().startsWith('#')).length;
      }
    } catch (err) {
      console.log('Could not count vault secrets:', err);
    }

    // Check vault path accessibility
    let vaultPathAccessible = false;
    let vaultSize = '0 KB';
    
    try {
      const vaultPath = path.join(process.cwd(), 'vault');
      const vaultStats = await fs.stat(vaultPath);
      vaultPathAccessible = vaultStats.isDirectory();
      
      // Calculate vault size
      const files = await fs.readdir(vaultPath);
      let totalSize = 0;
      for (const file of files) {
        const filePath = path.join(vaultPath, file);
        const fileStats = await fs.stat(filePath);
        totalSize += fileStats.size;
      }
      vaultSize = `${(totalSize / 1024).toFixed(1)} KB`;
    } catch (err) {
      console.log('Vault directory not accessible');
    }

    // Check encryption working (check if file is SOPS encrypted)
    let encryptionWorking = false;
    try {
      const testVaultFile = path.join(process.cwd(), 'vault', 'secrets.sops.yaml');
      await fs.access(testVaultFile);
      
      // Check if file contains SOPS metadata
      const fileContent = await fs.readFile(testVaultFile, 'utf-8');
      
      // If it's a JSON file, check for SOPS structure
      if (fileContent.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(fileContent);
          // This is a regular JSON vault file, not SOPS encrypted
          encryptionWorking = false;
        } catch {
          // If JSON parsing fails, might be encrypted
          encryptionWorking = false;
        }
      } else {
        // Try SOPS metadata check for YAML files
        const { stdout } = await execAsync(`sops filestatus "${testVaultFile}"`);
        encryptionWorking = stdout.includes('encrypted');
      }
    } catch (err) {
      console.log('Encryption test failed:', err);
    }

    // Check agent status by testing our own APIs
    const agentStatus = {
      vaultAgent: false,
      rotationAgent: false,
      mcpBridge: false
    };

    try {
      // Test if our APIs are working (which means the bridge is functional)
      const eventsResponse = await fetch('http://localhost:3000/api/events/status');
      const scanResponse = await fetch('http://localhost:3000/api/scan/projects');
      
      if (eventsResponse.ok && scanResponse.ok) {
        agentStatus.vaultAgent = true;
        agentStatus.rotationAgent = true;
        agentStatus.mcpBridge = true;
      }
    } catch (err) {
      console.log('API bridge test failed:', err);
    }

    // Check domino mode status
    const dominoMode = {
      enabled: false,
      lastAudit: undefined as string | undefined,
      auditStatus: 'inactive'
    };

    try {
      // Check if domino audit history exists
      const auditHistoryPath = path.join(process.cwd(), '.cursor', 'logs', 'domino_audits.json');
      const auditHistory = await fs.readFile(auditHistoryPath, 'utf-8');
      const audits = JSON.parse(auditHistory);
      
      if (audits.length > 0) {
        dominoMode.enabled = true;
        dominoMode.lastAudit = audits[audits.length - 1].timestamp;
        dominoMode.auditStatus = audits[audits.length - 1].status || 'completed';
      }
    } catch (err) {
      console.log('Domino audit history not found');
    }

    // Check for backup files
    let lastBackup: string | undefined;
    try {
      const backupPath = path.join(process.cwd(), 'backups');
      const backupFiles = await fs.readdir(backupPath);
      const vaultBackups = backupFiles.filter(file => file.includes('vault') && file.includes('backup'));
      
      if (vaultBackups.length > 0) {
        // Get the most recent backup
        const backupStats = await Promise.all(
          vaultBackups.map(async (file) => {
            const filePath = path.join(backupPath, file);
            const stats = await fs.stat(filePath);
            return { file, mtime: stats.mtime };
          })
        );
        
        backupStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
        lastBackup = backupStats[0].mtime.toISOString();
      }
    } catch (err) {
      console.log('Backup directory not found');
    }

    const vaultStatus: VaultStatus = {
      sopsConfigured,
      vaultPathAccessible,
      encryptionWorking,
      keyCount,
      lastBackup,
      vaultSize,
      agentStatus,
      dominoMode
    };

    console.log('Vault status compiled:', vaultStatus);

    return NextResponse.json({
      success: true,
      data: vaultStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Vault status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get vault status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 