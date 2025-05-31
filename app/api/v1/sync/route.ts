import { NextRequest, NextResponse } from 'next/server';
import { Platform, SyncMessage, PlatformState } from '../../../../src/universal/PlatformOrchestrator';

// In-memory storage for sync state (in production, use Redis or database)
const syncStore = {
  platforms: new Map<Platform, PlatformState>(),
  messages: [] as SyncMessage[],
  lastCleanup: Date.now()
};

// Cleanup old messages (keep last 1000 or last 24 hours)
function cleanupOldMessages() {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  if (now - syncStore.lastCleanup > 300000) { // 5 minutes
    syncStore.messages = syncStore.messages
      .filter(msg => msg.timestamp > oneDayAgo)
      .slice(-1000);
    syncStore.lastCleanup = now;
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();

    cleanupOldMessages();

    switch (action) {
      case 'heartbeat':
        return handleHeartbeat(request);
      case 'broadcast':
        return handleBroadcast(request);
      default:
        return NextResponse.json(
          { error: 'Invalid sync action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.pathname.split('/').pop();

    cleanupOldMessages();

    switch (action) {
      case 'updates':
        return handleGetUpdates(request);
      case 'status':
        return handleGetStatus(request);
      default:
        return NextResponse.json(
          { error: 'Invalid sync action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleHeartbeat(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const { platform, state, timestamp } = body;

  if (!platform || !state) {
    return NextResponse.json(
      { error: 'Missing platform or state' },
      { status: 400 }
    );
  }

  // Update platform state
  syncStore.platforms.set(platform, {
    ...state,
    lastSeen: timestamp || Date.now(),
    isOnline: true
  });

  return NextResponse.json({
    success: true,
    timestamp: Date.now(),
    platformsOnline: Array.from(syncStore.platforms.keys()).filter(p => {
      const state = syncStore.platforms.get(p);
      return state && state.isOnline && (Date.now() - state.lastSeen) < 30000;
    })
  });
}

async function handleBroadcast(request: NextRequest): Promise<NextResponse> {
  const message: SyncMessage = await request.json();

  if (!message.id || !message.platform || !message.event) {
    return NextResponse.json(
      { error: 'Invalid message format' },
      { status: 400 }
    );
  }

  // Store the message
  syncStore.messages.push({
    ...message,
    timestamp: message.timestamp || Date.now()
  });

  // Update platform last activity
  const platformState = syncStore.platforms.get(message.platform);
  if (platformState) {
    platformState.lastSeen = Date.now();
  }

  console.log(`📨 Sync broadcast: ${message.event} from ${message.platform}`);

  return NextResponse.json({
    success: true,
    messageId: message.id,
    timestamp: Date.now()
  });
}

async function handleGetUpdates(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const platform = url.searchParams.get('platform') as Platform;
  const since = parseInt(url.searchParams.get('since') || '0');

  if (!platform) {
    return NextResponse.json(
      { error: 'Missing platform parameter' },
      { status: 400 }
    );
  }

  // Get messages since timestamp, excluding messages from the requesting platform
  const updates = syncStore.messages.filter(msg => 
    msg.timestamp > since && msg.platform !== platform
  );

  // Sort by timestamp
  updates.sort((a, b) => a.timestamp - b.timestamp);

  return NextResponse.json({
    success: true,
    updates,
    timestamp: Date.now(),
    platforms: Object.fromEntries(syncStore.platforms)
  });
}

async function handleGetStatus(request: NextRequest): Promise<NextResponse> {
  const onlinePlatforms = Array.from(syncStore.platforms.entries())
    .filter(([_, state]) => {
      return state.isOnline && (Date.now() - state.lastSeen) < 30000;
    })
    .map(([platform, state]) => ({ platform, state }));

  const recentMessages = syncStore.messages
    .slice(-50) // Last 50 messages
    .sort((a, b) => b.timestamp - a.timestamp);

  return NextResponse.json({
    success: true,
    status: {
      totalPlatforms: syncStore.platforms.size,
      onlinePlatforms: onlinePlatforms.length,
      platforms: onlinePlatforms,
      messageCount: syncStore.messages.length,
      recentMessages,
      serverTime: Date.now()
    }
  });
} 