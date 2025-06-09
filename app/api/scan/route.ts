import { NextRequest, NextResponse } from 'next/server'
import { secretScanner } from '@/src/lib/secret-scanner'
import { createLogger } from '@/src/utils/logger'
import * as path from 'path'
import * as fs from 'fs'

const logger = createLogger('ScanAPI')

export async function POST(request: NextRequest) {
  try {
    const { projectPath, scanType = 'full' } = await request.json()

    if (!projectPath) {
      return NextResponse.json(
        { success: false, error: 'Project path is required' },
        { status: 400 }
      )
    }

    // Validate and resolve project path
    const resolvedPath = path.resolve(projectPath)
    
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { success: false, error: 'Project path does not exist' },
        { status: 400 }
      )
    }

    if (!fs.statSync(resolvedPath).isDirectory()) {
      return NextResponse.json(
        { success: false, error: 'Project path must be a directory' },
        { status: 400 }
      )
    }

    logger.info('Starting secret scan', { projectPath: resolvedPath, scanType })

    // Perform the actual scan
    const scanResult = await secretScanner.scanProject(resolvedPath)

    logger.info('Secret scan completed', {
      scanId: scanResult.scanId,
      filesScanned: scanResult.filesScanned,
      secretsFound: scanResult.secretsFound,
      errors: scanResult.errors.length
    })

    // Store scan result in database (simplified - would use real DB)
    await storeScanResult(scanResult)

    return NextResponse.json({
      success: true,
      data: {
        scanId: scanResult.scanId,
        projectPath: scanResult.projectPath,
        scanTime: scanResult.scanTime,
        filesScanned: scanResult.filesScanned,
        secretsFound: scanResult.secretsFound,
        summary: generateSummary(scanResult),
        secrets: scanResult.secrets.map(secret => ({
          ...secret,
          match: undefined // Don't return raw match for security
        })),
        errors: scanResult.errors
      }
    })

  } catch (error) {
    logger.error('Secret scan failed', { error: error.message })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scanId = searchParams.get('scanId')
    const projectPath = searchParams.get('projectPath')

    if (scanId) {
      // Get specific scan result
      const scanResult = await getScanResult(scanId)
      if (!scanResult) {
        return NextResponse.json(
          { success: false, error: 'Scan not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: scanResult
      })
    }

    if (projectPath) {
      // Get recent scans for project
      const recentScans = await getRecentScans(projectPath)
      return NextResponse.json({
        success: true,
        data: recentScans
      })
    }

    // Get all recent scans
    const allScans = await getAllRecentScans()
    return NextResponse.json({
      success: true,
      data: allScans
    })

  } catch (error) {
    logger.error('Failed to retrieve scan data', { error: error.message })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function storeScanResult(scanResult: any): Promise<void> {
  // In a real implementation, this would store to a database
  // For now, store to file system
  const scanDir = path.join(process.cwd(), 'data', 'scans')
  await fs.promises.mkdir(scanDir, { recursive: true })
  
  const scanFile = path.join(scanDir, `${scanResult.scanId}.json`)
  await fs.promises.writeFile(scanFile, JSON.stringify(scanResult, null, 2))
}

async function getScanResult(scanId: string): Promise<any | null> {
  try {
    const scanFile = path.join(process.cwd(), 'data', 'scans', `${scanId}.json`)
    const data = await fs.promises.readFile(scanFile, 'utf8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

async function getRecentScans(projectPath: string): Promise<any[]> {
  try {
    const scanDir = path.join(process.cwd(), 'data', 'scans')
    const files = await fs.promises.readdir(scanDir)
    
    const scans = []
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const scanData = JSON.parse(
            await fs.promises.readFile(path.join(scanDir, file), 'utf8')
          )
          if (scanData.projectPath === projectPath) {
            scans.push(scanData)
          }
        } catch {
          // Skip invalid files
        }
      }
    }
    
    return scans
      .sort((a, b) => new Date(b.scanTime).getTime() - new Date(a.scanTime).getTime())
      .slice(0, 10)
  } catch {
    return []
  }
}

async function getAllRecentScans(): Promise<any[]> {
  try {
    const scanDir = path.join(process.cwd(), 'data', 'scans')
    const files = await fs.promises.readdir(scanDir)
    
    const scans = []
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const scanData = JSON.parse(
            await fs.promises.readFile(path.join(scanDir, file), 'utf8')
          )
          scans.push({
            scanId: scanData.scanId,
            projectPath: scanData.projectPath,
            scanTime: scanData.scanTime,
            filesScanned: scanData.filesScanned,
            secretsFound: scanData.secretsFound
          })
        } catch {
          // Skip invalid files
        }
      }
    }
    
    return scans
      .sort((a, b) => new Date(b.scanTime).getTime() - new Date(a.scanTime).getTime())
      .slice(0, 20)
  } catch {
    return []
  }
}

function generateSummary(scanResult: any): any {
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  }

  const typeCounts = {}

  scanResult.secrets.forEach(secret => {
    severityCounts[secret.severity]++
    typeCounts[secret.type] = (typeCounts[secret.type] || 0) + 1
  })

  return {
    severityCounts,
    typeCounts,
    riskScore: calculateRiskScore(severityCounts),
    recommendations: generateRecommendations(scanResult)
  }
}

function calculateRiskScore(severityCounts: any): number {
  const weights: { [key: string]: number } = { critical: 10, high: 5, medium: 2, low: 1 }
  const score = Object.entries(severityCounts)
    .reduce((total, [severity, count]) => total + (weights[severity] * (count as number)), 0)
  
  return Math.min(100, score) // Cap at 100
}

function generateRecommendations(scanResult: any): string[] {
  const recommendations = []
  
  if (scanResult.secretsFound > 0) {
    recommendations.push('Remove all hardcoded secrets from source code')
    recommendations.push('Use environment variables or secret management services')
  }
  
  const criticalSecrets = scanResult.secrets.filter(s => s.severity === 'critical')
  if (criticalSecrets.length > 0) {
    recommendations.push('Immediately rotate all critical secrets found')
    recommendations.push('Review access logs for potential unauthorized access')
  }
  
  const privateKeys = scanResult.secrets.filter(s => s.type === 'private_key')
  if (privateKeys.length > 0) {
    recommendations.push('Replace exposed private keys and update corresponding public keys')
  }
  
  const dbUrls = scanResult.secrets.filter(s => s.type === 'database_url')
  if (dbUrls.length > 0) {
    recommendations.push('Rotate database credentials and review connection logs')
  }
  
  return recommendations
} 