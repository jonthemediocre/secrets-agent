import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all vaults (projects)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    let whereClause = {};
    if (userId) {
      whereClause = { ownerId: userId };
    }

    const vaults = await db.vault.findMany({
      where: whereClause,
      include: {
        secrets: {
          select: {
            id: true,
            key: true,
            metadata: true,
            createdAt: true,
            updatedAt: true
          }
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Transform vaults to match expected project format
    const projects = vaults.map(vault => ({
      id: vault.id,
      name: vault.name,
      description: `Vault managed by ${vault.owner.name || vault.owner.email}`,
      secretCount: vault.secrets.length,
      lastUpdated: vault.updatedAt,
      owner: vault.owner,
      secrets: vault.secrets,
      type: 'vault',
      status: 'active'
    }));

    return NextResponse.json({
      success: true,
      data: projects,
      total: projects.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve projects' },
      { status: 500 }
    );
  }
}

// POST - Create new vault (project)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, userId, description } = body;

    if (!name || !userId) {
      return NextResponse.json(
        { error: 'Name and user ID are required' },
        { status: 400 }
      );
    }

    // Check if vault with this name already exists for this user
    const existingVault = await db.vault.findFirst({
      where: {
        name: name,
        ownerId: userId
      }
    });

    if (existingVault) {
      return NextResponse.json(
        { error: 'Vault with this name already exists' },
        { status: 409 }
      );
    }

    // Create new vault
    const newVault = await db.vault.create({
      data: {
        name: name,
        ownerId: userId,
        encryptionKey: `key_${Date.now()}`, // In production, generate proper encryption key
      },
      include: {
        secrets: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Transform to project format
    const project = {
      id: newVault.id,
      name: newVault.name,
      description: description || `Vault created by ${newVault.owner.name || newVault.owner.email}`,
      secretCount: 0,
      lastUpdated: newVault.updatedAt,
      owner: newVault.owner,
      secrets: [],
      type: 'vault',
      status: 'active'
    };

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Vault created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
} 