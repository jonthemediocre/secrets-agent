import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../../src/utils/logger';
import { generateEncryptionKey } from '../../../src/utils/encryption';
import { createVault, VaultConfig } from '@/src/lib/vault';
import * as path from 'path';

const prisma = new PrismaClient();
const logger = createLogger('VaultAPI');
const VAULT_PATH = path.join(process.cwd(), 'data', 'vault', 'main.vault');

let vaultInstance: any = null;

// Initialize vault instance
function getVaultInstance() {
  if (!vaultInstance) {
    vaultInstance = createVault(VAULT_PATH);
  }
  return vaultInstance;
}

// GET /api/vault - List vaults for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const secretId = searchParams.get('secretId');
    const environment = searchParams.get('environment');
    const query = searchParams.get('query');
    const userId = searchParams.get('userId') || 'unknown';

    const vault = getVaultInstance();

    switch (action) {
      case 'list':
        return await listSecrets(vault, environment, userId);
      
      case 'get':
        if (!secretId) {
          return NextResponse.json(
            { success: false, error: 'Secret ID is required' },
            { status: 400 }
          );
        }
        return await getSecret(vault, secretId, userId);
      
      case 'search':
        if (!query) {
          return NextResponse.json(
            { success: false, error: 'Search query is required' },
            { status: 400 }
          );
        }
        return await searchSecrets(vault, query, userId);
      
      case 'status':
        return await getVaultStatus(vault);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Vault query failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/vault - Create new vault
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    const vault = getVaultInstance();

    switch (action) {
      case 'initialize':
        return await initializeVault(vault, data);
      
      case 'unlock':
        return await unlockVault(vault, data);
      
      case 'lock':
        return await lockVault(vault);
      
      case 'add_secret':
        return await addSecret(vault, data);
      
      case 'update_secret':
        return await updateSecret(vault, data);
      
      case 'delete_secret':
        return await deleteSecret(vault, data);
      
      case 'backup':
        return await backupVault(vault, data);
      
      case 'restore':
        return await restoreVault(vault, data);
      
      case 'rotate_keys':
        return await rotateKeys(vault, data);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Vault operation failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function initializeVault(vault: any, data: any) {
  try {
    const { name, description, masterPassword, encryption = 'aes-256-gcm' } = data;

    if (!name || !masterPassword) {
      return NextResponse.json(
        { success: false, error: 'Name and master password are required' },
        { status: 400 }
      );
    }

    const config: VaultConfig = {
      name,
      description: description || '',
      encryption,
      masterKeyPath: path.join(process.cwd(), 'data', 'vault', 'master.key'),
      backupPath: path.join(process.cwd(), 'data', 'vault', 'backups')
    };

    await vault.initialize(config, masterPassword);

    logger.info('Vault initialized', { name, encryption });

    return NextResponse.json({
      success: true,
      message: 'Vault initialized successfully'
    });

  } catch (error) {
    logger.error('Vault initialization failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function unlockVault(vault: any, data: any) {
  try {
    const { masterPassword } = data;

    if (!masterPassword) {
      return NextResponse.json(
        { success: false, error: 'Master password is required' },
        { status: 400 }
      );
    }

    const unlocked = await vault.unlock(masterPassword);

    if (!unlocked) {
      return NextResponse.json(
        { success: false, error: 'Invalid master password' },
        { status: 401 }
      );
    }

    logger.info('Vault unlocked');

    return NextResponse.json({
      success: true,
      message: 'Vault unlocked successfully'
    });

  } catch (error) {
    logger.error('Vault unlock failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: 'Failed to unlock vault' },
      { status: 500 }
    );
  }
}

async function lockVault(vault: any) {
  try {
    await vault.lock();

    logger.info('Vault locked');

    return NextResponse.json({
      success: true,
      message: 'Vault locked successfully'
    });

  } catch (error) {
    logger.error('Vault lock failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: 'Failed to lock vault' },
      { status: 500 }
    );
  }
}

async function addSecret(vault: any, data: any) {
  try {
    const { key, value, description, tags = [], environment = 'all', createdBy = 'unknown' } = data;

    if (!key || !value) {
      return NextResponse.json(
        { success: false, error: 'Key and value are required' },
        { status: 400 }
      );
    }

    const secretId = await vault.addSecret({
      key,
      value,
      description,
      tags,
      environment,
      createdBy,
      isActive: true
    });

    logger.info('Secret added', { secretId, key, environment });

    return NextResponse.json({
      success: true,
      data: { secretId },
      message: 'Secret added successfully'
    });

  } catch (error) {
    logger.error('Add secret failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function updateSecret(vault: any, data: any) {
  try {
    const { secretId, updates, userId = 'unknown' } = data;

    if (!secretId || !updates) {
      return NextResponse.json(
        { success: false, error: 'Secret ID and updates are required' },
        { status: 400 }
      );
    }

    const success = await vault.updateSecret(secretId, updates, userId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Secret not found or inactive' },
        { status: 404 }
      );
    }

    logger.info('Secret updated', { secretId, userId });

    return NextResponse.json({
      success: true,
      message: 'Secret updated successfully'
    });

  } catch (error) {
    logger.error('Update secret failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function deleteSecret(vault: any, data: any) {
  try {
    const { secretId, userId = 'unknown' } = data;

    if (!secretId) {
      return NextResponse.json(
        { success: false, error: 'Secret ID is required' },
        { status: 400 }
      );
    }

    const success = await vault.deleteSecret(secretId, userId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Secret not found' },
        { status: 404 }
      );
    }

    logger.info('Secret deleted', { secretId, userId });

    return NextResponse.json({
      success: true,
      message: 'Secret deleted successfully'
    });

  } catch (error) {
    logger.error('Delete secret failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function listSecrets(vault: any, environment: string | null, userId: string) {
  try {
    const secrets = await vault.listSecrets(environment, userId);

    return NextResponse.json({
      success: true,
      data: secrets
    });

  } catch (error) {
    logger.error('List secrets failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function getSecret(vault: any, secretId: string, userId: string) {
  try {
    const secret = await vault.getSecret(secretId, userId);

    if (!secret) {
      return NextResponse.json(
        { success: false, error: 'Secret not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: secret
    });

  } catch (error) {
    logger.error('Get secret failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function searchSecrets(vault: any, query: string, userId: string) {
  try {
    const secrets = await vault.searchSecrets(query, userId);

    return NextResponse.json({
      success: true,
      data: secrets
    });

  } catch (error) {
    logger.error('Search secrets failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function getVaultStatus(vault: any) {
  try {
    // Basic status check
    const isLocked = !vault.decryptedVault;
    
    return NextResponse.json({
      success: true,
      data: {
        isLocked,
        vaultPath: VAULT_PATH,
        lastActivity: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Get vault status failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function backupVault(vault: any, data: any) {
  try {
    const { backupPath, userId = 'unknown' } = data;

    if (!backupPath) {
      return NextResponse.json(
        { success: false, error: 'Backup path is required' },
        { status: 400 }
      );
    }

    await vault.backup(backupPath, userId);

    logger.info('Vault backup created', { backupPath, userId });

    return NextResponse.json({
      success: true,
      message: 'Vault backup created successfully'
    });

  } catch (error) {
    logger.error('Vault backup failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function restoreVault(vault: any, data: any) {
  try {
    const { backupPath, userId = 'unknown' } = data;

    if (!backupPath) {
      return NextResponse.json(
        { success: false, error: 'Backup path is required' },
        { status: 400 }
      );
    }

    await vault.restore(backupPath, userId);

    logger.info('Vault restored from backup', { backupPath, userId });

    return NextResponse.json({
      success: true,
      message: 'Vault restored successfully'
    });

  } catch (error) {
    logger.error('Vault restore failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function rotateKeys(vault: any, data: any) {
  try {
    const { newMasterPassword, userId = 'unknown' } = data;

    if (!newMasterPassword) {
      return NextResponse.json(
        { success: false, error: 'New master password is required' },
        { status: 400 }
      );
    }

    await vault.rotateKeys(newMasterPassword, userId);

    logger.info('Vault keys rotated', { userId });

    return NextResponse.json({
      success: true,
      message: 'Vault keys rotated successfully'
    });

  } catch (error) {
    logger.error('Key rotation failed', { error: error.message });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
} 