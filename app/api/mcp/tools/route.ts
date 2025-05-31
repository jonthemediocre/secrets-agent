import { NextRequest, NextResponse } from 'next/server';

// Redirect to the v1 endpoint
export async function GET(request: NextRequest) {
  try {
    // Forward the request to the v1 endpoint
    const baseUrl = request.nextUrl.origin;
    const v1Url = `${baseUrl}/api/v1/mcp/tools`;
    
    const response = await fetch(v1Url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('MCP tools proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to proxy MCP tools request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 