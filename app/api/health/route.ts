import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check database connectivity
    const dbCheck = await prisma.$queryRaw`SELECT 1 as health`
    const dbLatency = Date.now() - startTime

    // Get basic system stats
    const userCount = await prisma.user.count()
    const vaultCount = await prisma.vault.count()
    const secretCount = await prisma.secret.count()

    // Calculate system health
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(uptime),
      database: {
        status: 'connected',
        latency: dbLatency,
        records: {
          users: userCount,
          vaults: vaultCount,
          secrets: secretCount
        }
      },
      system: {
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        },
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version
      },
      responseTime: Date.now() - startTime
    }

    return NextResponse.json(health, { status: 200 })

  } catch (error) {
    console.error('Health check failed:', error)
    
    const health = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        status: 'disconnected'
      },
      responseTime: Date.now() - startTime
    }

    return NextResponse.json(health, { status: 503 })
  }
} 