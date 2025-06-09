import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = [
  '/secrets',
  '/vaults',
  '/security',
  '/analytics',
  '/policies',
  '/agents',
  '/discovery',
  '/orchestrator',
  '/vanta'
]

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/auth/login', '/auth/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get token from cookie or header
  const token = request.cookies.get('auth-token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  // Check if user is authenticated
  const isAuthenticated = !!token

  // Create response
  let response: NextResponse

  // Redirect authenticated users away from auth pages
  if (authRoutes.includes(pathname) && isAuthenticated) {
    response = NextResponse.redirect(new URL('/', request.url))
  }
  // Redirect unauthenticated users to login for protected routes
  else if (protectedRoutes.some(route => pathname.startsWith(route)) && !isAuthenticated) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    response = NextResponse.redirect(loginUrl)
  }
  // Continue with request
  else {
    response = NextResponse.next()
  }

  // Add security headers for production readiness
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Add Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' ws: wss:;"
  )

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 