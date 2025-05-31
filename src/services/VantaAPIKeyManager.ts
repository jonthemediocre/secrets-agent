import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { EnvFileService } from './EnvFileService';
import { AccessLogService } from './AccessLogService';

const execAsync = promisify(exec);

interface VantaAPIKey {
  keyId: string;
  apiKey: string;
  assignedApp: string;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  usageLimit?: number;
  expiresAt?: Date;
  metadata: {
    vantaProjectId: string;
    permissions: string[];
    rateLimits: {
      requestsPerMinute: number;
      requestsPerDay: number;
    };
  };
}

interface VantaUsageStats {
  appId: string;
  keyId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  tokenUsage: number;
  costAccumulated: number;
  lastRequestAt: Date;
  dailyStats: {
    [date: string]: {
      requests: number;
      tokens: number;
      cost: number;
    };
  };
}

export class VantaAPIKeyManager {
  private vantaProjectPath: string;
  private envService: EnvFileService;
  private accessLog: AccessLogService;
  private keyStore: Map<string, VantaAPIKey> = new Map();
  private usageStats: Map<string, VantaUsageStats> = new Map();

  constructor(vaultPath?: string) {
    this.vantaProjectPath = path.resolve('../VANTA');
    this.envService = new EnvFileService(vaultPath || './vault', '.env');
    this.accessLog = new AccessLogService({ logFilePath: './vanta-access.log' });
    this.loadExistingKeys();
  }

  // Generate new API key for specific app using Vanta's generator
  async generateAPIKeyForApp(appId: string, permissions: string[] = ['read', 'analyze', 'generate']): Promise<VantaAPIKey> {
    try {
      console.log(`🔑 Generating new Vanta API key for app: ${appId}`);

      // Execute Vanta's secure API key generation
      const vantaKey = await this.executeVantaKeyGeneration(appId, permissions);
      
      // Create tracking record
      const apiKeyRecord: VantaAPIKey = {
        keyId: this.generateKeyId(),
        apiKey: vantaKey.apiKey,
        assignedApp: appId,
        createdAt: new Date(),
        usageCount: 0,
        usageLimit: 10000, // Default limit
        metadata: {
          vantaProjectId: vantaKey.projectId,
          permissions,
          rateLimits: {
            requestsPerMinute: 100,
            requestsPerDay: 1000
          }
        }
      };

      // Store in memory and vault
      this.keyStore.set(apiKeyRecord.keyId, apiKeyRecord);
      await this.storeKeyInVault(apiKeyRecord);
      
      // Initialize usage tracking
      this.initializeUsageTracking(apiKeyRecord);

      // Log the generation
      await this.accessLog.logAccess({
        timestamp: new Date().toISOString(),
        userId: 'system',
        action: 'generate_api_key',
        projectName: appId,
        success: true,
        // Legacy compatibility
        operation: 'generate_api_key',
        secretId: apiKeyRecord.keyId,
        appId,
        metadata: {
          permissions,
          rateLimits: apiKeyRecord.metadata.rateLimits
        }
      });

      console.log(`✅ Generated API key ${apiKeyRecord.keyId} for ${appId}`);
      return apiKeyRecord;

    } catch (error) {
      console.error(`❌ Failed to generate API key for ${appId}:`, error);
      throw error;
    }
  }

  // Execute Vanta's key generation via secure API endpoint
  private async executeVantaKeyGeneration(appId: string, permissions: string[]): Promise<{apiKey: string, projectId: string}> {
    try {
      console.log(`🔐 Requesting new secure key from Vanta API for ${appId}...`);

      // Get master authentication signature
      const masterKey = await this.getVantaMasterKey();

      const keyRequest = {
        app_id: appId,
        permissions,
        rate_limits: {
          requests_per_minute: 100,
          requests_per_day: 1000
        }
      };

      // Call Vanta's secure ecosystem key manager endpoint
      const response = await fetch('http://127.0.0.1:8001/generate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${masterKey}`,
        },
        body: JSON.stringify(keyRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vanta API responded with ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.status !== 'success') {
        throw new Error(`Vanta key generation failed: ${result.status}`);
      }

      console.log(`✅ Received secure key from Vanta: ${result.api_key.substring(0, 16)}...`);
      console.log(`⏰ Key expires: ${result.expires_at}`);

      return {
        apiKey: result.api_key,
        projectId: result.project_id
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to get Vanta master key:', errorMessage);
      throw new Error(`Master key authentication failed: ${errorMessage}`);
    }
  }

  // Get master authentication key for Vanta API
  private async getVantaMasterKey(): Promise<string> {
    try {
      const response = await fetch('http://127.0.0.1:8001/generate-master-key');
      
      if (!response.ok) {
        throw new Error(`Failed to get master key: ${response.status}`);
      }

      const result = await response.json();
      return result.master_signature;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to get Vanta master key:', errorMessage);
      throw new Error(`Master key authentication failed: ${errorMessage}`);
    }
  }

  // Get API key for specific app (generate if doesn't exist)
  async getAPIKeyForApp(appId: string): Promise<VantaAPIKey> {
    // Check if app already has a key
    const existingKey = Array.from(this.keyStore.values())
      .find(key => key.assignedApp === appId && !this.isKeyExpired(key));

    if (existingKey) {
      console.log(`📋 Using existing API key for ${appId}: ${existingKey.keyId}`);
      return existingKey;
    }

    // Generate new key if none exists or expired
    console.log(`🔄 No valid key found for ${appId}, generating new one...`);
    return await this.generateAPIKeyForApp(appId);
  }

  // Track API usage
  async trackUsage(keyId: string, requestType: string, tokensUsed: number, cost: number): Promise<void> {
    const key = this.keyStore.get(keyId);
    if (!key) {
      throw new Error(`API key ${keyId} not found`);
    }

    // Update key usage
    key.usageCount++;
    key.lastUsed = new Date();

    // Update usage stats
    const stats = this.usageStats.get(keyId) || this.createInitialUsageStats(key);
    stats.totalRequests++;
    stats.tokenUsage += tokensUsed;
    stats.costAccumulated += cost;
    stats.lastRequestAt = new Date();

    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    if (!stats.dailyStats[today]) {
      stats.dailyStats[today] = { requests: 0, tokens: 0, cost: 0 };
    }
    stats.dailyStats[today].requests++;
    stats.dailyStats[today].tokens += tokensUsed;
    stats.dailyStats[today].cost += cost;

    this.usageStats.set(keyId, stats);

    // Log usage
    await this.accessLog.logAccess({
      timestamp: new Date().toISOString(),
      userId: 'system',
      action: 'api_usage',
      projectName: key.assignedApp,
      success: true,
      // Legacy compatibility
      operation: 'api_usage',
      secretId: keyId,
      appId: key.assignedApp,
      metadata: {
        requestType,
        tokensUsed,
        cost,
        totalUsage: key.usageCount
      }
    });

    // Check if approaching limits
    await this.checkUsageLimits(key, stats);

    // Save updated data
    await this.saveKeyData();
  }

  // Get usage statistics for app
  async getUsageStatsForApp(appId: string, days: number = 30): Promise<VantaUsageStats[]> {
    const appKeys = Array.from(this.keyStore.values())
      .filter(key => key.assignedApp === appId);

    return appKeys.map(key => this.usageStats.get(key.keyId))
      .filter(stats => stats !== undefined) as VantaUsageStats[];
  }

  // Rotate API key (generate new, deprecate old)
  async rotateAPIKeyForApp(appId: string): Promise<VantaAPIKey> {
    console.log(`🔄 Rotating API key for ${appId}...`);

    // Mark old key as deprecated
    const oldKey = Array.from(this.keyStore.values())
      .find(key => key.assignedApp === appId);

    if (oldKey) {
      oldKey.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours grace period
      console.log(`📝 Old key ${oldKey.keyId} marked for expiration in 24 hours`);
    }

    // Generate new key
    const newKey = await this.generateAPIKeyForApp(appId);

    await this.accessLog.logAccess({
      timestamp: new Date().toISOString(),
      userId: 'system',
      action: 'rotate_api_key',
      projectName: appId,
      success: true,
      // Legacy compatibility
      operation: 'rotate_api_key',
      secretId: newKey.keyId,
      appId,
      metadata: {
        oldKeyId: oldKey?.keyId,
        reason: 'manual_rotation'
      }
    });

    return newKey;
  }

  // Get all app keys and their status
  async getAllAppKeys(): Promise<{appId: string, keys: VantaAPIKey[], usage: VantaUsageStats[]}[]> {
    const appsMap = new Map<string, {keys: VantaAPIKey[], usage: VantaUsageStats[]}>();

    // Group keys by app
    for (const key of this.keyStore.values()) {
      if (!appsMap.has(key.assignedApp)) {
        appsMap.set(key.assignedApp, {keys: [], usage: []});
      }
      appsMap.get(key.assignedApp)!.keys.push(key);
      
      const usage = this.usageStats.get(key.keyId);
      if (usage) {
        appsMap.get(key.assignedApp)!.usage.push(usage);
      }
    }

    return Array.from(appsMap.entries()).map(([appId, data]) => ({
      appId,
      keys: data.keys,
      usage: data.usage
    }));
  }

  // Private helper methods
  private generateKeyId(): string {
    return `vk_${crypto.randomBytes(8).toString('hex')}`;
  }

  private async storeKeyInVault(key: VantaAPIKey): Promise<void> {
    const secretData = {
      [`VANTA_API_KEY_${key.assignedApp.toUpperCase()}`]: key.apiKey,
      [`VANTA_PROJECT_ID_${key.assignedApp.toUpperCase()}`]: key.metadata.vantaProjectId,
      [`VANTA_KEY_ID_${key.assignedApp.toUpperCase()}`]: key.keyId
    };

    for (const [envKey, value] of Object.entries(secretData)) {
      await this.envService.addSecret(envKey, value, `Generated Vanta API key for ${key.assignedApp}`);
    }
  }

  private initializeUsageTracking(key: VantaAPIKey): void {
    const stats: VantaUsageStats = {
      appId: key.assignedApp,
      keyId: key.keyId,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      tokenUsage: 0,
      costAccumulated: 0,
      lastRequestAt: key.createdAt,
      dailyStats: {}
    };

    this.usageStats.set(key.keyId, stats);
  }

  private createInitialUsageStats(key: VantaAPIKey): VantaUsageStats {
    return {
      appId: key.assignedApp,
      keyId: key.keyId,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      tokenUsage: 0,
      costAccumulated: 0,
      lastRequestAt: key.createdAt,
      dailyStats: {}
    };
  }

  private isKeyExpired(key: VantaAPIKey): boolean {
    return key.expiresAt ? new Date() > key.expiresAt : false;
  }

  private async checkUsageLimits(key: VantaAPIKey, stats: VantaUsageStats): Promise<void> {
    // Check daily rate limits
    const today = new Date().toISOString().split('T')[0];
    const dailyUsage = stats.dailyStats[today]?.requests || 0;

    if (dailyUsage >= key.metadata.rateLimits.requestsPerDay) {
      console.log(`⚠️  App ${key.assignedApp} has reached daily rate limit`);
      // Could trigger notifications or temporary key suspension
    }

    // Check total usage limits
    if (key.usageLimit && key.usageCount >= key.usageLimit) {
      console.log(`🚨 App ${key.assignedApp} has reached usage limit, consider rotation`);
      // Could auto-rotate or notify
    }
  }

  private async loadExistingKeys(): Promise<void> {
    try {
      // Load from vault storage
      // Implementation would load previously stored keys
      console.log('📖 Loading existing Vanta API keys...');
    } catch (error) {
      console.log('ℹ️  No existing keys found, starting fresh');
    }
  }

  private async saveKeyData(): Promise<void> {
    try {
      // Save key store and usage stats to persistent storage
      // Implementation would save to secure vault storage
      console.log('💾 Saving key data...');
    } catch (error) {
      console.error('Failed to save key data:', error);
    }
  }
} 