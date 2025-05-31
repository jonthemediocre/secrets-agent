/**
 * UAP Connector for Secrets Agent
 * Handles integration with UAP_IntegrateNet.v1 framework
 */

import { EventEmitter } from 'events';
import { readFileSync, existsSync } from 'fs';
import * as yaml from 'js-yaml';
import path from 'path';

export interface UAPMetadata {
  project: string;
  version: string;
  description: string;
  apis: {
    rest: Array<{
      endpoint: string;
      method: string;
      description: string;
      auth?: string;
      input?: any[];
      output?: any[];
    }>;
  };
  events: {
    emitted: any[];
    consumed: any[];
  };
  data: {
    inputs: string[];
    outputs: string[];
  };
  secrets: {
    generates: string[];
    manages: string[];
  };
  ai_archetypes: any[];
  dependencies: string[];
  integration_points: string[];
}

export class UAPConnector extends EventEmitter {
  private metadata: UAPMetadata | null = null;
  private discoveryEndpoint = '/api/capabilities';

  constructor() {
    super();
    this.loadMetadata();
  }

  /**
   * Load UAP metadata from UAP.meta.yaml
   */
  private loadMetadata(): void {
    const metaPath = path.join(process.cwd(), 'UAP.meta.yaml');
    
    if (existsSync(metaPath)) {
      try {
        const content = readFileSync(metaPath, 'utf8');
        this.metadata = yaml.load(content) as UAPMetadata;
        console.log('✅ UAP metadata loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load UAP metadata:', error);
      }
    } else {
      console.warn('⚠️ UAP.meta.yaml not found');
    }
  }

  /**
   * Get project capabilities for discovery
   */
  getCapabilities(): UAPMetadata | null {
    return this.metadata;
  }

  /**
   * Register discovery endpoint with express app
   */
  registerDiscoveryEndpoint(app: any): void {
    app.get(this.discoveryEndpoint, (req: any, res: any) => {
      const capabilities = this.getCapabilities();
      
      if (capabilities) {
        res.json({
          status: 'success',
          data: capabilities,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          status: 'error',
          message: 'UAP metadata not available',
          timestamp: new Date().toISOString()
        });
      }
    });

    console.log(`📡 UAP discovery endpoint registered at ${this.discoveryEndpoint}`);
  }

  /**
   * Emit UAP event
   */
  emitUAPEvent(eventName: string, data: any): void {
    const event = {
      source: 'secrets-agent',
      type: eventName,
      data,
      timestamp: new Date().toISOString(),
      version: this.metadata?.version || 'unknown'
    };

    this.emit('uap:event', event);
    
    // Also emit to any registered event bridges
    this.emit(`uap:${eventName}`, data);
  }

  /**
   * Handle incoming UAP events
   */
  handleUAPEvent(eventName: string, handler: (data: any) => void): void {
    this.on(`uap:${eventName}`, handler);
  }

  /**
   * Check if another app is UAP-compatible
   */
  async checkCompatibility(appUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${appUrl}/api/capabilities`);
      if (response.ok) {
        const data = await response.json();
        return data.status === 'success' && data.data?.project;
      }
    } catch (error) {
      console.error(`Failed to check compatibility with ${appUrl}:`, error);
    }
    return false;
  }
}

// Export singleton instance
export default new UAPConnector(); 