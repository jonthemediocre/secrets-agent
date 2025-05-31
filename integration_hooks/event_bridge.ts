/**
 * Event Bridge for Secrets Agent
 * Handles cross-app event streaming and persistence
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { createHash } from 'crypto';

interface EventPayload {
  id: string;
  source: string;
  type: string;
  data: any;
  timestamp: string;
  version: string;
  correlationId?: string;
}

interface EventSubscription {
  appId: string;
  eventTypes: string[];
  endpoint: string;
  protocol: 'websocket' | 'webhook' | 'sse';
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export class EventBridge extends EventEmitter {
  private eventStore: EventPayload[] = [];
  private subscriptions: Map<string, EventSubscription> = new Map();
  private wsClients: Map<string, WebSocket> = new Map();
  private maxEventRetention = 10000; // Keep last 10k events

  constructor() {
    super();
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle internal UAP events
    this.on('uap:event', (event: EventPayload) => {
      this.persistEvent(event);
      this.broadcastEvent(event);
    });
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(event: Omit<EventPayload, 'id'>): string {
    const hash = createHash('sha256');
    hash.update(JSON.stringify({
      source: event.source,
      type: event.type,
      timestamp: event.timestamp
    }));
    return hash.digest('hex').substring(0, 16);
  }

  /**
   * Persist event to store
   */
  private persistEvent(event: EventPayload): void {
    this.eventStore.push(event);
    
    // Trim old events if exceeding retention limit
    if (this.eventStore.length > this.maxEventRetention) {
      this.eventStore = this.eventStore.slice(-this.maxEventRetention);
    }
  }

  /**
   * Emit an event to the bridge
   */
  emitEvent(type: string, data: any, correlationId?: string): void {
    const event: EventPayload = {
      id: '',
      source: 'secrets-agent',
      type,
      data,
      timestamp: new Date().toISOString(),
      version: '2.2.0',
      correlationId
    };
    
    event.id = this.generateEventId(event);
    this.emit('uap:event', event);
  }

  /**
   * Subscribe to events
   */
  subscribe(subscription: EventSubscription): void {
    this.subscriptions.set(subscription.appId, subscription);
    console.log(`✅ ${subscription.appId} subscribed to events: ${subscription.eventTypes.join(', ')}`);
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(appId: string): void {
    this.subscriptions.delete(appId);
    
    // Clean up WebSocket if exists
    const ws = this.wsClients.get(appId);
    if (ws) {
      ws.close();
      this.wsClients.delete(appId);
    }
    
    console.log(`❌ ${appId} unsubscribed from events`);
  }

  /**
   * Broadcast event to all subscribers
   */
  private async broadcastEvent(event: EventPayload): Promise<void> {
    for (const [appId, subscription] of this.subscriptions) {
      // Check if subscriber is interested in this event type
      if (!subscription.eventTypes.includes('*') && 
          !subscription.eventTypes.includes(event.type)) {
        continue;
      }

      try {
        switch (subscription.protocol) {
          case 'websocket':
            await this.sendViaWebSocket(appId, event);
            break;
          case 'webhook':
            await this.sendViaWebhook(subscription, event);
            break;
          case 'sse':
            // SSE would be handled by express route
            this.emit(`sse:${appId}`, event);
            break;
        }
      } catch (error) {
        console.error(`Failed to send event to ${appId}:`, error);
        // Implement retry logic if specified
        if (subscription.retryPolicy) {
          this.scheduleRetry(subscription, event);
        }
      }
    }
  }

  /**
   * Send event via WebSocket
   */
  private async sendViaWebSocket(appId: string, event: EventPayload): Promise<void> {
    const ws = this.wsClients.get(appId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  /**
   * Send event via webhook
   */
  private async sendViaWebhook(subscription: EventSubscription, event: EventPayload): Promise<void> {
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Type': event.type,
        'X-Event-ID': event.id,
        'X-Source-App': 'secrets-agent'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }
  }

  /**
   * Schedule event retry
   */
  private scheduleRetry(subscription: EventSubscription, event: EventPayload): void {
    setTimeout(() => {
      this.broadcastEvent(event);
    }, subscription.retryPolicy?.backoffMs || 5000);
  }

  /**
   * Get event history
   */
  getEventHistory(filter?: {
    type?: string;
    source?: string;
    since?: string;
    limit?: number;
  }): EventPayload[] {
    let events = [...this.eventStore];

    if (filter?.type) {
      events = events.filter(e => e.type === filter.type);
    }
    if (filter?.source) {
      events = events.filter(e => e.source === filter.source);
    }
    if (filter?.since) {
      const sinceTime = new Date(filter.since).getTime();
      events = events.filter(e => new Date(e.timestamp).getTime() > sinceTime);
    }
    if (filter?.limit) {
      events = events.slice(-filter.limit);
    }

    return events;
  }

  /**
   * Register WebSocket client
   */
  registerWebSocketClient(appId: string, ws: WebSocket): void {
    this.wsClients.set(appId, ws);
    
    ws.on('close', () => {
      this.wsClients.delete(appId);
      console.log(`WebSocket disconnected: ${appId}`);
    });
  }

  /**
   * Get bridge statistics
   */
  getStats(): {
    eventCount: number;
    subscriberCount: number;
    activeWebSockets: number;
    oldestEvent: string | null;
    newestEvent: string | null;
  } {
    return {
      eventCount: this.eventStore.length,
      subscriberCount: this.subscriptions.size,
      activeWebSockets: this.wsClients.size,
      oldestEvent: this.eventStore[0]?.timestamp || null,
      newestEvent: this.eventStore[this.eventStore.length - 1]?.timestamp || null
    };
  }
}

// Export singleton instance
export default new EventBridge(); 