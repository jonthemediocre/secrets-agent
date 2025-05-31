import { EventEmitter } from 'events';
import axios from 'axios';

export enum Platform {
  WEB = 'web',
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  CLI = 'cli'
}

export enum SyncEvent {
  VAULT_STATUS_CHANGED = 'vault:status:changed',
  SECRET_ADDED = 'secret:added',
  SECRET_UPDATED = 'secret:updated',
  SECRET_DELETED = 'secret:deleted',
  AUTH_STATUS_CHANGED = 'auth:status:changed',
  CONFIG_UPDATED = 'config:updated'
}

export interface SyncMessage {
  id: string;
  timestamp: number;
  platform: Platform;
  event: SyncEvent;
  data: any;
  checksum?: string;
}

export interface PlatformState {
  platform: Platform;
  version: string;
  lastSeen: number;
  isOnline: boolean;
  capabilities: string[];
}

export interface UniversalState {
  vault: {
    isUnlocked: boolean;
    secretCount: number;
    lastActivity: number;
  };
  auth: {
    isAuthenticated: boolean;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  };
  platforms: Map<Platform, PlatformState>;
}

/**
 * Universal Platform Orchestrator
 * Manages state synchronization across all platforms (Web, Mobile, Desktop, CLI)
 */
export class PlatformOrchestrator extends EventEmitter {
  private state: UniversalState;
  private apiBaseUrl: string;
  private syncInterval: NodeJS.Timeout | null = null;
  private platform: Platform;

  constructor(platform: Platform, apiBaseUrl = 'http://localhost:3002/api') {
    super();
    this.platform = platform;
    this.apiBaseUrl = apiBaseUrl;
    
    this.state = {
      vault: {
        isUnlocked: false,
        secretCount: 0,
        lastActivity: Date.now()
      },
      auth: {
        isAuthenticated: false
      },
      platforms: new Map()
    };

    this.initializePlatform();
    this.startSyncLoop();
  }

  private initializePlatform(): void {
    // Register this platform
    this.state.platforms.set(this.platform, {
      platform: this.platform,
      version: '1.3.4',
      lastSeen: Date.now(),
      isOnline: true,
      capabilities: this.getPlatformCapabilities()
    });

    console.log(`🚀 Platform Orchestrator initialized for ${this.platform}`);
  }

  private getPlatformCapabilities(): string[] {
    const baseCapabilities = ['vault', 'auth', 'sync'];
    
    switch (this.platform) {
      case Platform.WEB:
        return [...baseCapabilities, 'ui', 'notifications', 'realtime'];
      case Platform.MOBILE:
        return [...baseCapabilities, 'ui', 'notifications', 'biometrics', 'camera'];
      case Platform.DESKTOP:
        return [...baseCapabilities, 'ui', 'notifications', 'filesystem', 'terminal'];
      case Platform.CLI:
        return [...baseCapabilities, 'terminal', 'scripts', 'automation'];
      default:
        return baseCapabilities;
    }
  }

  private startSyncLoop(): void {
    // Sync every 5 seconds
    this.syncInterval = setInterval(() => {
      this.syncWithBackend();
    }, 5000);
  }

  private async syncWithBackend(): Promise<void> {
    try {
      // Heartbeat - let the backend know this platform is alive
      await this.sendHeartbeat();
      
      // Pull updates from other platforms
      await this.pullUpdates();
      
      // Update platform state
      this.updatePlatformState();
      
    } catch (error) {
      console.warn(`Sync failed for ${this.platform}:`, error);
      this.handleSyncError(error);
    }
  }

  private async sendHeartbeat(): Promise<void> {
    const platformState = this.state.platforms.get(this.platform);
    if (!platformState) return;

    platformState.lastSeen = Date.now();
    
    await axios.post(`${this.apiBaseUrl}/v1/sync/heartbeat`, {
      platform: this.platform,
      state: platformState,
      timestamp: Date.now()
    });
  }

  private async pullUpdates(): Promise<void> {
    const response = await axios.get(`${this.apiBaseUrl}/v1/sync/updates`, {
      params: {
        platform: this.platform,
        since: this.state.vault.lastActivity
      }
    });

    const updates: SyncMessage[] = response.data.updates || [];
    
    for (const update of updates) {
      this.processUpdate(update);
    }
  }

  private processUpdate(message: SyncMessage): void {
    console.log(`📨 Processing update: ${message.event} from ${message.platform}`);
    
    switch (message.event) {
      case SyncEvent.VAULT_STATUS_CHANGED:
        this.handleVaultStatusChange(message.data);
        break;
      case SyncEvent.SECRET_ADDED:
      case SyncEvent.SECRET_UPDATED:
      case SyncEvent.SECRET_DELETED:
        this.handleSecretChange(message);
        break;
      case SyncEvent.AUTH_STATUS_CHANGED:
        this.handleAuthChange(message.data);
        break;
      case SyncEvent.CONFIG_UPDATED:
        this.handleConfigUpdate(message.data);
        break;
    }

    this.emit('sync:update', message);
  }

  private handleVaultStatusChange(data: any): void {
    const oldStatus = this.state.vault.isUnlocked;
    this.state.vault = { ...this.state.vault, ...data };
    
    if (oldStatus !== this.state.vault.isUnlocked) {
      this.emit('vault:status:changed', this.state.vault);
    }
  }

  private handleSecretChange(message: SyncMessage): void {
    if (message.event === SyncEvent.SECRET_ADDED) {
      this.state.vault.secretCount++;
    } else if (message.event === SyncEvent.SECRET_DELETED) {
      this.state.vault.secretCount = Math.max(0, this.state.vault.secretCount - 1);
    }

    this.state.vault.lastActivity = message.timestamp;
    this.emit('secret:changed', message);
  }

  private handleAuthChange(data: any): void {
    const wasAuthenticated = this.state.auth.isAuthenticated;
    this.state.auth = { ...this.state.auth, ...data };
    
    if (wasAuthenticated !== this.state.auth.isAuthenticated) {
      this.emit('auth:status:changed', this.state.auth);
    }
  }

  private handleConfigUpdate(data: any): void {
    this.emit('config:updated', data);
  }

  private updatePlatformState(): void {
    const platformState = this.state.platforms.get(this.platform);
    if (platformState) {
      platformState.lastSeen = Date.now();
      platformState.isOnline = true;
    }
  }

  private handleSyncError(error: any): void {
    console.error(`Sync error for ${this.platform}:`, error);
    
    const platformState = this.state.platforms.get(this.platform);
    if (platformState) {
      platformState.isOnline = false;
    }

    this.emit('sync:error', error);
  }

  // Public API Methods

  /**
   * Broadcast a change to all other platforms
   */
  public async broadcastChange(event: SyncEvent, data: any): Promise<void> {
    const message: SyncMessage = {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      platform: this.platform,
      event,
      data
    };

    try {
      await axios.post(`${this.apiBaseUrl}/v1/sync/broadcast`, message);
      console.log(`📤 Broadcasted: ${event} from ${this.platform}`);
    } catch (error) {
      console.error(`Failed to broadcast ${event}:`, error);
      throw error;
    }
  }

  /**
   * Get current universal state
   */
  public getState(): UniversalState {
    return { ...this.state };
  }

  /**
   * Get platform-specific state
   */
  public getPlatformState(platform: Platform): PlatformState | undefined {
    return this.state.platforms.get(platform);
  }

  /**
   * Check if a platform is online
   */
  public isPlatformOnline(platform: Platform): boolean {
    const state = this.state.platforms.get(platform);
    if (!state) return false;
    
    const timeSinceLastSeen = Date.now() - state.lastSeen;
    return state.isOnline && timeSinceLastSeen < 30000; // 30 seconds timeout
  }

  /**
   * Get list of online platforms
   */
  public getOnlinePlatforms(): Platform[] {
    return Array.from(this.state.platforms.keys()).filter(platform => 
      this.isPlatformOnline(platform)
    );
  }

  /**
   * Update vault status and sync
   */
  public async updateVaultStatus(isUnlocked: boolean, secretCount?: number): Promise<void> {
    this.state.vault.isUnlocked = isUnlocked;
    if (secretCount !== undefined) {
      this.state.vault.secretCount = secretCount;
    }
    this.state.vault.lastActivity = Date.now();

    await this.broadcastChange(SyncEvent.VAULT_STATUS_CHANGED, {
      isUnlocked,
      secretCount: this.state.vault.secretCount,
      lastActivity: this.state.vault.lastActivity
    });
  }

  /**
   * Update auth status and sync
   */
  public async updateAuthStatus(isAuthenticated: boolean, user?: any): Promise<void> {
    this.state.auth.isAuthenticated = isAuthenticated;
    if (user) {
      this.state.auth.user = user;
    } else if (!isAuthenticated) {
      delete this.state.auth.user;
    }

    await this.broadcastChange(SyncEvent.AUTH_STATUS_CHANGED, this.state.auth);
  }

  /**
   * Report secret change and sync
   */
  public async reportSecretChange(
    event: SyncEvent.SECRET_ADDED | SyncEvent.SECRET_UPDATED | SyncEvent.SECRET_DELETED,
    secretData: any
  ): Promise<void> {
    await this.broadcastChange(event, secretData);
  }

  /**
   * Cleanup and shutdown
   */
  public shutdown(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Mark platform as offline
    const platformState = this.state.platforms.get(this.platform);
    if (platformState) {
      platformState.isOnline = false;
    }

    console.log(`🛑 Platform Orchestrator shut down for ${this.platform}`);
  }

  private generateMessageId(): string {
    return `${this.platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton factory for platform orchestrator
let orchestratorInstance: PlatformOrchestrator | null = null;

export function createPlatformOrchestrator(platform: Platform): PlatformOrchestrator {
  if (orchestratorInstance) {
    orchestratorInstance.shutdown();
  }
  
  orchestratorInstance = new PlatformOrchestrator(platform);
  return orchestratorInstance;
}

export function getPlatformOrchestrator(): PlatformOrchestrator | null {
  return orchestratorInstance;
} 