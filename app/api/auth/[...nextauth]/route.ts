import NextAuth from 'next-auth'
import { authConfig, authConfigSync } from '@/lib/auth-config'

// Create handler with fallback for sync access
let handler: any

try {
  // Try to use the async config
  authConfig.then(config => {
    handler = NextAuth(config)
  }).catch(() => {
    // Fallback to sync config if async fails
    handler = NextAuth(authConfigSync)
  })
} catch {
  // Immediate fallback
  handler = NextAuth(authConfigSync)
}

// Ensure we always have a handler
if (!handler) {
  handler = NextAuth(authConfigSync)
}

export { handler as GET, handler as POST } 