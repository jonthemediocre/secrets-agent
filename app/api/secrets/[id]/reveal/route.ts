import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../../../../src/utils/logger';
import { decrypt } from '../../../../../src/utils/encryption';
import { getConfig, getDevConfig } from '../../../../../src/config/bootstrap';

const prisma = new PrismaClient();
const logger = createLogger('SecretsRevealAPI');

// POST /api/secrets/[id]/reveal - Reveal (decrypt) a secret value
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    logger.info('Revealing secret', { secretId: id });

    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    // Find the secret
    const secret = await prisma.secret.findUnique({
      where: { id },
      include: {
        vault: true
      }
    });

    if (!secret) {
      logger.warn('Secret not found for reveal', { secretId: id });
      return NextResponse.json(
        { error: 'Secret not found' },
        { status: 404 }
      );
    }

    // Get configuration for decryption
    let config;
    try {
      config = await getConfig();
    } catch {
      config = getDevConfig();
    }

    // Decrypt the secret value
    try {
      const decryptedValue = await decrypt(secret.valueEncrypted, config.encryption.masterKey);
      
      logger.info('Secret revealed successfully', { 
        secretId: id, 
        vaultId: secret.vaultId,
        vaultName: secret.vault.name 
      });

      return NextResponse.json({
        success: true,
        data: {
          id: secret.id,
          name: secret.key,
          value: decryptedValue,
          metadata: secret.metadata ? JSON.parse(secret.metadata) : {},
          vault: {
            id: secret.vault.id,
            name: secret.vault.name
          },
          revealedAt: new Date().toISOString()
        },
        message: 'Secret revealed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (decryptionError) {
      logger.error('Failed to decrypt secret', { 
        secretId: id, 
        error: decryptionError instanceof Error ? decryptionError.message : decryptionError 
      });
      
      return NextResponse.json(
        { error: 'Failed to decrypt secret value' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Failed to reveal secret', { 
      secretId: params.id,
      error: error instanceof Error ? error.message : error 
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to reveal secret',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 