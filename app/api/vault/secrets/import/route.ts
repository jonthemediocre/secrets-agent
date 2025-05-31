// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const environment = formData.get('environment')?.toString() || 'default';
    const overwrite = formData.get('overwrite')?.toString() === 'true';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const content = await file.text();
    
    // Simple .env parsing
    const lines = content.split('\n');
    const secrets: Record<string, string> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (key.trim()) {
          secrets[key.trim()] = value;
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      imported: Object.keys(secrets).length,
      skipped: 0,
      errors: [],
      message: `Parsed ${Object.keys(secrets).length} environment variables`
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Import failed' 
    }, { status: 500 });
  }
} 