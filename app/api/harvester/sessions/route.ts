import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for demo purposes
// In production, this would be stored in a database
let harvestSessions: any[] = []

export async function GET() {
  try {
    return NextResponse.json({
      sessions: harvestSessions,
      total: harvestSessions.length,
      active: harvestSessions.filter(s => s.status === 'in-progress').length
    })
  } catch (error) {
    console.error('Error fetching harvest sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch harvest sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { serviceId, serviceName } = await request.json()

    if (!serviceId || !serviceName) {
      return NextResponse.json(
        { error: 'Service ID and name are required' },
        { status: 400 }
      )
    }

    const newSession = {
      id: `harvest_${serviceId}_${Date.now()}`,
      serviceId,
      serviceName,
      status: 'pending',
      progress: 0,
      steps: [
        'Checking CLI tool availability',
        'Installing required tools',
        'Authenticating with service',
        'Extracting credentials',
        'Storing in vault'
      ],
      startedAt: new Date().toISOString(),
      logs: []
    }

    harvestSessions.unshift(newSession)

    // Simulate starting the harvest process
    setTimeout(() => updateSessionProgress(newSession.id), 1000)

    return NextResponse.json(newSession)
  } catch (error) {
    console.error('Error creating harvest session:', error)
    return NextResponse.json(
      { error: 'Failed to create harvest session' },
      { status: 500 }
    )
  }
}

// Helper function to simulate harvest progress
function updateSessionProgress(sessionId: string) {
  const session = harvestSessions.find(s => s.id === sessionId)
  if (!session) return

  session.status = 'in-progress'
  
  const updateInterval = setInterval(() => {
    session.progress += 20
    session.logs.push({
      timestamp: new Date().toISOString(),
      message: session.steps[Math.floor(session.progress / 20) - 1] || 'Completing...',
      level: 'info'
    })

    if (session.progress >= 100) {
      clearInterval(updateInterval)
      session.status = 'completed'
      session.completedAt = new Date().toISOString()
      session.logs.push({
        timestamp: new Date().toISOString(),
        message: 'Harvest session completed successfully',
        level: 'success'
      })
    }
  }, 2000)
} 