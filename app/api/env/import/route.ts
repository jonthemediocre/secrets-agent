import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vaultId, envContent, userId } = body;

    if (!vaultId || !envContent || !userId) {
      return NextResponse.json(
        { error: 'Vault ID, user ID, and environment content are required' },
        { status: 400 }
      );
    }

    // Parse environment content
    const secrets = envContent
      .split('\n')
      .filter((line: string) => line.trim() && !line.trim().startsWith('#'))
      .map((line: string) => {
        const [key, ...valueParts] = line.split('=');
        return {
          key: key.trim(),
          value: valueParts.join('=').trim()
        };
      })
      .filter((secret: any) => secret.key && secret.value);

    if (secrets.length === 0) {
      return NextResponse.json(
        { error: 'No valid environment variables found' },
        { status: 400 }
      );
    }

    // Get or create vault
    let vault = await db.vault.findUnique({
      where: { id: vaultId },
      include: { secrets: true }
    });

    if (!vault) {
      vault = await db.vault.create({
        data: {
          id: vaultId,
          name: vaultId,
          ownerId: userId,
          encryptionKey: 'temp-key' // In production, this would be properly generated
        },
        include: { secrets: true }
      });
    }

    // Import secrets
    const importResults = [];
    for (const secret of secrets) {
      try {
        const existingSecret = await db.secret.findFirst({
          where: {
            vaultId: vaultId,
            key: secret.key
          }
        });

        if (existingSecret) {
          // Update existing secret
          await db.secret.update({
            where: { id: existingSecret.id },
            data: { 
              valueEncrypted: secret.value // In production, this would be encrypted
            }
          });
          importResults.push({ key: secret.key, action: 'updated' });
        } else {
          // Create new secret
          await db.secret.create({
            data: {
              vaultId: vaultId,
              key: secret.key,
              valueEncrypted: secret.value // In production, this would be encrypted
            }
          });
          importResults.push({ key: secret.key, action: 'created' });
        }
      } catch (error) {
        importResults.push({ 
          key: secret.key, 
          action: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${secrets.length} secrets`,
      results: importResults,
      summary: {
        total: secrets.length,
        created: importResults.filter(r => r.action === 'created').length,
        updated: importResults.filter(r => r.action === 'updated').length,
        failed: importResults.filter(r => r.action === 'failed').length
      }
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import environment variables' },
      { status: 500 }
    );
  }
} 