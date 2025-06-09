import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vaultId, framework, userId } = body;

    if (!vaultId || !framework || !userId) {
      return NextResponse.json(
        { error: 'Vault ID, framework, and user ID are required' },
        { status: 400 }
      );
    }

    // Mock scaffolding templates for different frameworks
    const scaffoldTemplates = {
      nextjs: [
        { key: 'NEXTAUTH_SECRET', value: 'generate_secure_secret_here', category: 'auth' },
        { key: 'NEXTAUTH_URL', value: 'http://localhost:3000', category: 'auth' },
        { key: 'DATABASE_URL', value: 'postgresql://user:password@localhost:5432/nextjs_db', category: 'database' },
        { key: 'NEXT_PUBLIC_APP_URL', value: 'http://localhost:3000', category: 'public' }
      ],
      react: [
        { key: 'REACT_APP_API_URL', value: 'http://localhost:3001/api', category: 'api' },
        { key: 'REACT_APP_ENV', value: 'development', category: 'environment' },
        { key: 'REACT_APP_VERSION', value: '1.0.0', category: 'app' }
      ],
      nodejs: [
        { key: 'NODE_ENV', value: 'development', category: 'environment' },
        { key: 'PORT', value: '3000', category: 'server' },
        { key: 'JWT_SECRET', value: 'generate_jwt_secret_here', category: 'auth' },
        { key: 'DB_CONNECTION_STRING', value: 'mongodb://localhost:27017/nodejs_app', category: 'database' }
      ],
      express: [
        { key: 'EXPRESS_PORT', value: '8000', category: 'server' },
        { key: 'CORS_ORIGIN', value: 'http://localhost:3000', category: 'cors' },
        { key: 'SESSION_SECRET', value: 'generate_session_secret_here', category: 'auth' }
      ],
      default: [
        { key: 'APP_NAME', value: 'My Application', category: 'app' },
        { key: 'APP_ENV', value: 'development', category: 'environment' },
        { key: 'API_KEY', value: 'your_api_key_here', category: 'api' }
      ]
    };

    const template = scaffoldTemplates[framework as keyof typeof scaffoldTemplates] || scaffoldTemplates.default;

    // Get or create vault
    let vault = await db.vault.findUnique({
      where: { id: vaultId }
    });

    if (!vault) {
      vault = await db.vault.create({
        data: {
          id: vaultId,
          name: `${framework}-vault`,
          ownerId: userId,
          encryptionKey: 'temp-key'
        }
      });
    }

    // Create scaffolded secrets
    const scaffoldResults = [];
    for (const secretTemplate of template) {
      try {
        const existingSecret = await db.secret.findFirst({
          where: {
            vaultId: vaultId,
            key: secretTemplate.key
          }
        });

        if (!existingSecret) {
          await db.secret.create({
            data: {
              vaultId: vaultId,
              key: secretTemplate.key,
              valueEncrypted: secretTemplate.value,
              metadata: JSON.stringify({ 
                category: secretTemplate.category,
                scaffolded: true,
                framework: framework
              })
            }
          });
          scaffoldResults.push({ 
            key: secretTemplate.key, 
            action: 'created',
            category: secretTemplate.category
          });
        } else {
          scaffoldResults.push({ 
            key: secretTemplate.key, 
            action: 'skipped',
            reason: 'already exists'
          });
        }
      } catch (error) {
        scaffoldResults.push({ 
          key: secretTemplate.key, 
          action: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Scaffolded ${framework} secrets`,
      framework,
      results: scaffoldResults,
      summary: {
        total: template.length,
        created: scaffoldResults.filter(r => r.action === 'created').length,
        skipped: scaffoldResults.filter(r => r.action === 'skipped').length,
        failed: scaffoldResults.filter(r => r.action === 'failed').length
      }
    });

  } catch (error) {
    console.error('Scaffold error:', error);
    return NextResponse.json(
      { error: 'Failed to scaffold secrets' },
      { status: 500 }
    );
  }
} 