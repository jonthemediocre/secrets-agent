import { Inter } from 'next/font/google'
import React from 'react'
import { AuthProvider } from '@/src/contexts/AuthContext'
import NextAuthProvider from '@/components/providers/session-provider'
import { ClientLayout } from '@/components/client-layout'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Secrets Agent - Enterprise Security Platform',
  description: 'Advanced Secrets Management Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/secretsagent logo.png" />
        <meta property="og:title" content="Secrets Agent" />
        <meta property="og:description" content="Enterprise Security Platform" />
        <meta property="og:image" content="/secretsagent logo.png" />
      </head>
      <body className={`${inter.className} min-h-screen bg-background font-sans antialiased`}>
        <NextAuthProvider>
          <AuthProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </AuthProvider>
        </NextAuthProvider>
      </body>
    </html>
  )
} 