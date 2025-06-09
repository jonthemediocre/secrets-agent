import { NextRequest, NextResponse } from 'next/server'
import { refreshToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { refreshToken: providedRefreshToken } = await request.json()

    if (!providedRefreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      )
    }

    const newTokens = refreshToken(providedRefreshToken)

    if (!newTokens) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newTokens
    })

  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 