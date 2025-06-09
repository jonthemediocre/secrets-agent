import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../../../src/utils/logger';
import { encrypt, decrypt } from '../../../../src/utils/encryption';

const prisma = new PrismaClient();
const logger = createLogger('SecretAPI');

// GET /api/secrets/[id] - Get a specific secret (with decrypted value)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    logger.info('Getting secret', { secretId: id });

    const secret = await prisma.secret.findUnique({
      where: { id },
      include: {
        vault: {
          select: {
            id: true,
            name: true,
            encryptionKey: true,
            owner: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!secret) {
      return NextResponse.json(
        { error: 'Secret not found' },
        { status: 404 }
      );
    }

    // Decrypt the secret value
    const decryptedValue = await decrypt(secret.valueEncrypted, secret.vault.encryptionKey);

    // Parse metadata
    const metadata = secret.metadata ? JSON.parse(secret.metadata) : null;

    const response = {
      id: secret.id,
      vaultId: secret.vaultId,
      key: secret.key,
      value: decryptedValue,
      metadata,
      createdAt: secret.createdAt,
      updatedAt: secret.updatedAt,
      vault: {
        id: secret.vault.id,
        name: secret.vault.name,
        owner: secret.vault.owner
      }
    };

    logger.info('Secret retrieved successfully', { secretId: id });

    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get secret', { 
      secretId: params.id, 
      error: error instanceof Error ? error.message : error 
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve secret',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/secrets/[id] - Update a secret
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { key, value, metadata } = body;

    logger.info('Updating secret', { secretId: id, key, hasValue: !!value });

    // Get the existing secret with vault info
    const existingSecret = await prisma.secret.findUnique({
      where: { id },
      include: {
        vault: {
          select: {
            id: true,
            name: true,
            encryptionKey: true
          }
        }
      }
    });

    if (!existingSecret) {
      return NextResponse.json(
        { error: 'Secret not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    // Update key if provided
    if (key && key !== existingSecret.key) {
      // Check if new key conflicts with existing secrets in the same vault
      const conflictingSecret = await prisma.secret.findUnique({
        where: {
          vaultId_key: {
            vaultId: existingSecret.vaultId,
            key
          }
        }
      });

      if (conflictingSecret && conflictingSecret.id !== id) {
        return NextResponse.json(
          { error: 'Secret with this key already exists in the vault' },
          { status: 409 }
        );
      }

      updateData.key = key;
    }

    // Update value if provided
    if (value !== undefined) {
      updateData.valueEncrypted = await encrypt(value, existingSecret.vault.encryptionKey);
    }

    // Update metadata if provided
    if (metadata !== undefined) {
      updateData.metadata = metadata ? JSON.stringify(metadata) : null;
    }

    // Update the secret
    const updatedSecret = await prisma.secret.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        vaultId: true,
        key: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        vault: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Parse metadata for response
    const secretWithParsedMetadata = {
      ...updatedSecret,
      metadata: updatedSecret.metadata ? JSON.parse(updatedSecret.metadata) : null
    };

    logger.info('Secret updated successfully', { 
      secretId: id, 
      key: updatedSecret.key 
    });

    return NextResponse.json({
      success: true,
      data: secretWithParsedMetadata,
      message: 'Secret updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to update secret', { 
      secretId: params.id, 
      error: error instanceof Error ? error.message : error 
    });

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Secret with this key already exists in the vault' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update secret',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/secrets/[id] - Delete a secret
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    logger.info('Deleting secret', { secretId: id });

    // Check if secret exists
    const existingSecret = await prisma.secret.findUnique({
      where: { id },
      select: {
        id: true,
        key: true,
        vaultId: true
      }
    });

    if (!existingSecret) {
      return NextResponse.json(
        { error: 'Secret not found' },
        { status: 404 }
      );
    }

    // Delete the secret (will cascade delete rotation policies)
    await prisma.secret.delete({
      where: { id }
    });

    logger.info('Secret deleted successfully', { 
      secretId: id, 
      key: existingSecret.key,
      vaultId: existingSecret.vaultId
    });

    return NextResponse.json({
      success: true,
      message: 'Secret deleted successfully',
      data: {
        id,
        key: existingSecret.key,
        vaultId: existingSecret.vaultId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to delete secret', { 
      secretId: params.id, 
      error: error instanceof Error ? error.message : error 
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to delete secret',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 