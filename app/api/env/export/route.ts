import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const vaultId = searchParams.get('vaultId');
    const format = searchParams.get('format') || 'env';

    if (!vaultId) {
      return NextResponse.json(
        { error: 'Vault ID is required' },
        { status: 400 }
      );
    }

    // Get vault from database
    const vault = await db.vault.findUnique({
      where: { id: vaultId },
      include: { secrets: true }
    });

    if (!vault) {
      return NextResponse.json(
        { error: 'Vault not found' },
        { status: 404 }
      );
    }

    let content = '';
    
    if (format === 'json') {
      const secretsObj = vault.secrets.reduce((acc: any, secret: any) => {
        acc[secret.key] = secret.valueEncrypted; // In production, this would be decrypted
        return acc;
      }, {});
      content = JSON.stringify(secretsObj, null, 2);
    } else {
      // Default to .env format
      content = vault.secrets
        .map((secret: any) => `${secret.key}=${secret.valueEncrypted}`) // In production, this would be decrypted
        .join('\n');
    }

    const headers = new Headers();
    headers.set('Content-Type', format === 'json' ? 'application/json' : 'text/plain');
    headers.set('Content-Disposition', `attachment; filename="${vault.name}.${format === 'json' ? 'json' : 'env'}"`);

    return new NextResponse(content, { headers });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export secrets' },
      { status: 500 }
    );
  }
} 