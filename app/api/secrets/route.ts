import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../../src/utils/logger';
import { encrypt, decrypt } from '../../../src/utils/encryption';

const prisma = new PrismaClient();
const logger = createLogger('SecretsAPI');

// GET /api/secrets - List secrets with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vaultId = searchParams.get('vaultId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    logger.info('Listing secrets', { vaultId, page, limit, search });

    // Build where clause
    const where: any = {};
    if (vaultId) {
      where.vaultId = vaultId;
    }
    if (search) {
      where.key = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // Get total count for pagination
    const total = await prisma.secret.count({ where });

    // Get secrets with pagination
    const secrets = await prisma.secret.findMany({
      where,
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
            name: true,
            owner: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
        // Note: valueEncrypted is intentionally excluded from GET responses
      },
      orderBy: {
        updatedAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Parse metadata JSON strings
    const secretsWithParsedMetadata = secrets.map(secret => ({
      ...secret,
      metadata: secret.metadata ? JSON.parse(secret.metadata) : null
    }));

    logger.info('Secrets retrieved successfully', { 
      count: secrets.length, 
      total, 
      page, 
      limit 
    });

    return NextResponse.json({
      success: true,
      data: secretsWithParsedMetadata,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to list secrets', { error: error instanceof Error ? error.message : error });
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve secrets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/secrets - Create new secret
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vaultId, key, value, metadata } = body;

    logger.info('Creating secret', { vaultId, key, hasValue: !!value });

    // Validation
    if (!vaultId || !key || !value) {
      return NextResponse.json(
        { error: 'vaultId, key, and value are required' },
        { status: 400 }
      );
    }

    // Verify vault exists and user has access
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId },
      include: { owner: true }
    });

    if (!vault) {
      return NextResponse.json(
        { error: 'Vault not found' },
        { status: 404 }
      );
    }

    // Check if secret key already exists in this vault
    const existingSecret = await prisma.secret.findUnique({
      where: {
        vaultId_key: {
          vaultId,
          key
        }
      }
    });

    if (existingSecret) {
      return NextResponse.json(
        { error: 'Secret with this key already exists in the vault' },
        { status: 409 }
      );
    }

    // Encrypt the secret value
    const encryptedValue = await encrypt(value, vault.encryptionKey);

    // Create the secret
    const secret = await prisma.secret.create({
      data: {
        vaultId,
        key,
        valueEncrypted: encryptedValue,
        metadata: metadata ? JSON.stringify(metadata) : null
      },
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
      ...secret,
      metadata: secret.metadata ? JSON.parse(secret.metadata) : null
    };

    logger.info('Secret created successfully', { 
      secretId: secret.id, 
      vaultId, 
      key 
    });

    return NextResponse.json({
      success: true,
      data: secretWithParsedMetadata,
      message: 'Secret created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create secret', { error: error instanceof Error ? error.message : error });

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Secret with this key already exists in the vault' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create secret',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 