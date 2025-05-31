import { EventEmitter } from 'events';

export class SimpleEventBus extends EventEmitter {
  private static instance: SimpleEventBus;
  
  static getInstance(): SimpleEventBus {
    if (!SimpleEventBus.instance) {
      SimpleEventBus.instance = new SimpleEventBus();
    }
    return SimpleEventBus.instance;
  }

  constructor() {
    super();
    this.setMaxListeners(100); // Increase max listeners for complex agent interactions
  }

  // Enhanced event publishing with metadata
  publishEvent(eventType: string, data: any, metadata?: any): void {
    const eventPayload = {
      ...data,
      metadata: {
        timestamp: new Date(),
        eventType,
        ...metadata
      }
    };
    
    this.emit(eventType, eventPayload);
  }

  // Subscribe to events with optional filtering
  subscribeToEvent(eventType: string, handler: (data: any) => void, filter?: (data: any) => boolean): void {
    const wrappedHandler = (data: any) => {
      if (!filter || filter(data)) {
        handler(data);
      }
    };
    
    this.on(eventType, wrappedHandler);
  }

  // Unsubscribe from events
  unsubscribeFromEvent(eventType: string, handler: (data: any) => void): void {
    this.off(eventType, handler);
  }

  // Get event statistics
  getEventStats(): { [eventType: string]: number } {
    const stats: { [eventType: string]: number } = {};
    const eventNames = this.eventNames();
    
    for (const eventName of eventNames) {
      stats[eventName.toString()] = this.listenerCount(eventName);
    }
    
    return stats;
  }

  // Clear all listeners for cleanup
  clearAllListeners(): void {
    this.removeAllListeners();
  }
} 