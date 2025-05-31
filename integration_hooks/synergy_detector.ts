/**
 * Synergy Detector for Secrets Agent
 * Identifies cross-app integration and optimization opportunities
 */

import { EventEmitter } from 'events';
import uapConnector from './uap_connector';
import eventBridge from './event_bridge';

interface AppCapability {
  appId: string;
  project: string;
  capabilities: {
    apis: any[];
    events: {
      emitted: string[];
      consumed: string[];
    };
    data: {
      inputs: string[];
      outputs: string[];
    };
  };
}

interface SynergyOpportunity {
  id: string;
  type: 'data_sharing' | 'event_chain' | 'api_composition' | 'security_enhancement';
  apps: string[];
  description: string;
  benefits: string[];
  implementation: {
    steps: string[];
    effort: 'low' | 'medium' | 'high';
    priority: 'low' | 'medium' | 'high';
  };
}

export class SynergyDetector extends EventEmitter {
  private knownApps: Map<string, AppCapability> = new Map();
  private detectedSynergies: Map<string, SynergyOpportunity> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for app discovery events
    eventBridge.on('app_discovered', (data) => {
      this.registerApp(data);
    });

    // Periodically analyze for synergies
    setInterval(() => {
      this.analyzeSynergies();
    }, 60000); // Every minute
  }

  /**
   * Register a discovered app
   */
  registerApp(appData: AppCapability): void {
    this.knownApps.set(appData.appId, appData);
    console.log(`🔍 Registered app: ${appData.appId} (${appData.project})`);
    
    // Immediately check for synergies with this new app
    this.analyzeSynergiesForApp(appData.appId);
  }

  /**
   * Analyze potential synergies between all known apps
   */
  private analyzeSynergies(): void {
    // Clear old synergies
    this.detectedSynergies.clear();

    // Analyze each pair of apps
    const appIds = Array.from(this.knownApps.keys());
    
    for (let i = 0; i < appIds.length; i++) {
      for (let j = i + 1; j < appIds.length; j++) {
        this.analyzeAppPair(appIds[i], appIds[j]);
      }
    }

    // Special analysis for secrets-agent interactions
    this.analyzeSecretsAgentSynergies();

    // Emit discovered synergies
    if (this.detectedSynergies.size > 0) {
      this.emit('synergies_discovered', Array.from(this.detectedSynergies.values()));
    }
  }

  /**
   * Analyze synergies for a specific app
   */
  private analyzeSynergiesForApp(appId: string): void {
    const app = this.knownApps.get(appId);
    if (!app) return;

    // Check if this app could benefit from secrets management
    if (this.needsSecretsManagement(app)) {
      this.addSynergy({
        id: `secrets-${appId}`,
        type: 'security_enhancement',
        apps: ['secrets-agent', appId],
        description: `${app.project} could benefit from centralized secrets management`,
        benefits: [
          'Eliminate hardcoded credentials',
          'Enable secret rotation',
          'Improve security posture',
          'Centralized access control'
        ],
        implementation: {
          steps: [
            `Add .vault.yaml to ${app.project}`,
            'Migrate existing secrets to vault',
            'Update code to use VaultAgent',
            'Remove .env files from repository'
          ],
          effort: 'medium',
          priority: 'high'
        }
      });
    }
  }

  /**
   * Analyze potential synergies between two apps
   */
  private analyzeAppPair(appId1: string, appId2: string): void {
    const app1 = this.knownApps.get(appId1);
    const app2 = this.knownApps.get(appId2);
    
    if (!app1 || !app2) return;

    // Check for event chain opportunities
    const eventChains = this.findEventChains(app1, app2);
    if (eventChains.length > 0) {
      this.addSynergy({
        id: `event-chain-${appId1}-${appId2}`,
        type: 'event_chain',
        apps: [appId1, appId2],
        description: `${app1.project} events can trigger actions in ${app2.project}`,
        benefits: [
          'Automated workflow between apps',
          'Real-time data synchronization',
          'Reduced manual intervention'
        ],
        implementation: {
          steps: eventChains.map(chain => 
            `Connect ${chain.emitted} event to ${chain.consumed} handler`
          ),
          effort: 'low',
          priority: 'medium'
        }
      });
    }

    // Check for data sharing opportunities
    const dataSharing = this.findDataSharingOpportunities(app1, app2);
    if (dataSharing.length > 0) {
      this.addSynergy({
        id: `data-share-${appId1}-${appId2}`,
        type: 'data_sharing',
        apps: [appId1, appId2],
        description: `${app1.project} outputs can be used as ${app2.project} inputs`,
        benefits: [
          'Eliminate data duplication',
          'Ensure data consistency',
          'Enable data pipeline'
        ],
        implementation: {
          steps: dataSharing.map(share => 
            `Share ${share.data} from ${share.from} to ${share.to}`
          ),
          effort: 'medium',
          priority: 'medium'
        }
      });
    }
  }

  /**
   * Find potential event chains between apps
   */
  private findEventChains(app1: AppCapability, app2: AppCapability): any[] {
    const chains = [];
    
    // Check if app1's emitted events match app2's consumed events
    for (const emitted of app1.capabilities.events.emitted) {
      for (const consumed of app2.capabilities.events.consumed) {
        if (this.eventsMatch(emitted, consumed)) {
          chains.push({ emitted, consumed, from: app1.project, to: app2.project });
        }
      }
    }
    
    return chains;
  }

  /**
   * Find data sharing opportunities
   */
  private findDataSharingOpportunities(app1: AppCapability, app2: AppCapability): any[] {
    const opportunities = [];
    
    // Check if app1's outputs match app2's inputs
    for (const output of app1.capabilities.data.outputs) {
      for (const input of app2.capabilities.data.inputs) {
        if (this.dataTypesMatch(output, input)) {
          opportunities.push({ 
            data: output, 
            from: app1.project, 
            to: app2.project 
          });
        }
      }
    }
    
    return opportunities;
  }

  /**
   * Check if an app needs secrets management
   */
  private needsSecretsManagement(app: AppCapability): boolean {
    // Look for indicators that the app uses secrets
    const indicators = [
      'api_keys',
      'tokens',
      'credentials',
      'passwords',
      'secrets',
      '.env'
    ];
    
    const appDataString = JSON.stringify(app.capabilities).toLowerCase();
    return indicators.some(indicator => appDataString.includes(indicator));
  }

  /**
   * Special analysis for secrets-agent specific synergies
   */
  private analyzeSecretsAgentSynergies(): void {
    // Check for apps that could benefit from JWT token generation
    for (const [appId, app] of this.knownApps) {
      if (appId === 'secrets-agent') continue;
      
      if (this.needsAuthentication(app)) {
        this.addSynergy({
          id: `jwt-auth-${appId}`,
          type: 'api_composition',
          apps: ['secrets-agent', appId],
          description: `${app.project} could use Secrets Agent JWT tokens for authentication`,
          benefits: [
            'Standardized authentication',
            'Automatic token rotation',
            'Centralized access control',
            'Audit trail for access'
          ],
          implementation: {
            steps: [
              'Register app with Secrets Agent',
              'Implement JWT validation in app',
              'Replace existing auth with JWT tokens',
              'Configure token policies'
            ],
            effort: 'medium',
            priority: 'high'
          }
        });
      }
    }
  }

  /**
   * Check if an app needs authentication
   */
  private needsAuthentication(app: AppCapability): boolean {
    return app.capabilities.apis && app.capabilities.apis.length > 0;
  }

  /**
   * Check if events match (simple string comparison for now)
   */
  private eventsMatch(emitted: any, consumed: any): boolean {
    // Extract event name from different formats
    const emittedName = typeof emitted === 'string' ? emitted : emitted.name || emitted.type;
    const consumedName = typeof consumed === 'string' ? consumed : consumed.name || consumed.type;
    
    return emittedName === consumedName;
  }

  /**
   * Check if data types match
   */
  private dataTypesMatch(output: string, input: string): boolean {
    // Simple matching for now - could be enhanced with semantic matching
    return output.toLowerCase() === input.toLowerCase();
  }

  /**
   * Add a synergy opportunity
   */
  private addSynergy(synergy: SynergyOpportunity): void {
    this.detectedSynergies.set(synergy.id, synergy);
    
    // Emit individual synergy for real-time processing
    this.emit('synergy_detected', synergy);
    
    // Also emit UAP event
    eventBridge.emitEvent('synergy_detected', {
      synergy,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get all detected synergies
   */
  getSynergies(): SynergyOpportunity[] {
    return Array.from(this.detectedSynergies.values());
  }

  /**
   * Get synergies for a specific app
   */
  getSynergiesForApp(appId: string): SynergyOpportunity[] {
    return this.getSynergies().filter(s => s.apps.includes(appId));
  }
}

// Export singleton instance
export default new SynergyDetector(); 