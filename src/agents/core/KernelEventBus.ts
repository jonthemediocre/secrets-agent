/**
 * VANTA Framework - Kernel Event Bus (KEB)
 * Handles system-wide event coordination, agent communication, and Trinity Node supervision
 */

import { EventEmitter } from 'events';
import { RewardSignal, BehaviorMutation, LearningEvent } from './ReinforcementFeedbackLoop';
import { SymbolicTrace, ContextualContinuityScore } from './TraceMemory';

export interface KernelEvent {
  id: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'critical' | 'emergency';
  source: string; // Agent ID or system component
  target?: string; // Specific agent or 'broadcast'
  payload: Record<string, any>;
  timestamp: Date;
  ttl?: number; // Time to live in milliseconds
  correlationId?: string; // For event correlation
  metadata: Record<string, any>;
}

export interface EventSubscription {
  id: string;
  agentId: string;
  eventTypes: string[];
  filter?: (event: KernelEvent) => boolean;
  handler: (event: KernelEvent) => Promise<void>;
  priority: number;
  active: boolean;
}

export interface SystemMetrics {
  eventThroughput: number; // Events per second
  agentCount: number;
  activeSubscriptions: number;
  queueDepth: number;
  averageLatency: number;
  errorRate: number;
  uptime: number;
  lastUpdate: Date;
}

export interface EventPattern {
  id: string;
  name: string;
  pattern: string[]; // Sequence of event types
  window: number; // Time window in milliseconds
  frequency: number; // How often this pattern occurs
  significance: 'normal' | 'anomaly' | 'critical';
  lastDetected: Date;
}

export class KernelEventBus extends EventEmitter {
  private events: KernelEvent[] = [];
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventQueue: KernelEvent[] = [];
  private processing: boolean = false;
  private metrics: SystemMetrics;
  private patterns: Map<string, EventPattern> = new Map();
  private eventHistory: KernelEvent[] = [];
  private maxHistorySize: number = 10000;
  private maxQueueSize: number = 5000;
  private processingInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private patternDetectionInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.startBackgroundProcessing();
    this.initializeStandardPatterns();
  }

  /**
   * Publish an event to the bus
   */
  public async publishEvent(event: Omit<KernelEvent, 'id' | 'timestamp'>): Promise<string> {
    const fullEvent: KernelEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    // Add to queue
    this.eventQueue.push(fullEvent);
    
    // Maintain queue size limit
    if (this.eventQueue.length > this.maxQueueSize) {
      // Remove oldest low-priority events
      this.eventQueue = this.eventQueue.filter(e => e.priority !== 'low').slice(-this.maxQueueSize);
    }

    // Immediate processing for emergency events
    if (event.priority === 'emergency') {
      await this.processEvent(fullEvent);
    }

    this.updateMetrics();
    return fullEvent.id;
  }

  /**
   * Subscribe to specific event types
   */
  public subscribe(subscription: Omit<EventSubscription, 'id'>): string {
    const fullSubscription: EventSubscription = {
      ...subscription,
      id: this.generateSubscriptionId()
    };

    this.subscriptions.set(fullSubscription.id, fullSubscription);
    this.updateMetrics();
    
    return fullSubscription.id;
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(subscriptionId: string): boolean {
    const removed = this.subscriptions.delete(subscriptionId);
    if (removed) {
      this.updateMetrics();
    }
    return removed;
  }

  /**
   * Broadcast emergency alert to all agents
   */
  public async broadcastEmergency(message: string, details: Record<string, any>): Promise<void> {
    await this.publishEvent({
      type: 'system.emergency',
      priority: 'emergency',
      source: 'kernel_event_bus',
      target: 'broadcast',
      payload: {
        message,
        details,
        requiresImmedateAction: true
      },
      metadata: {
        broadcastType: 'emergency',
        timestamp: new Date()
      }
    });
  }

  /**
   * Publish agent learning event
   */
  public async publishLearningEvent(agentId: string, learningEvent: LearningEvent): Promise<void> {
    await this.publishEvent({
      type: 'agent.learning',
      priority: 'normal',
      source: agentId,
      payload: {
        learningEvent,
        agentId
      },
      metadata: {
        convergenceScore: learningEvent.convergenceScore,
        outcome: learningEvent.outcome
      }
    });
  }

  /**
   * Publish drift detection alert
   */
  public async publishDriftAlert(agentId: string, driftAnalysis: any): Promise<void> {
    const priority = this.getDriftPriority(driftAnalysis.severity);
    
    await this.publishEvent({
      type: 'agent.drift_detected',
      priority,
      source: agentId,
      target: 'trinity_node',
      payload: {
        agentId,
        driftAnalysis
      },
      metadata: {
        severity: driftAnalysis.severity,
        factors: driftAnalysis.factors
      }
    });
  }

  /**
   * Publish reward signal distribution
   */
  public async publishRewardSignal(agentId: string, rewardSignal: RewardSignal): Promise<void> {
    await this.publishEvent({
      type: 'agent.reward_signal',
      priority: 'normal',
      source: agentId,
      payload: {
        agentId,
        rewardSignal
      },
      metadata: {
        source: rewardSignal.source,
        value: rewardSignal.value,
        confidence: rewardSignal.confidence
      }
    });
  }

  /**
   * Publish system health status
   */
  public async publishSystemHealth(component: string, health: Record<string, any>): Promise<void> {
    await this.publishEvent({
      type: 'system.health',
      priority: 'normal',
      source: component,
      payload: {
        component,
        health,
        timestamp: new Date()
      },
      metadata: {
        healthScore: health.overall || 0.5,
        critical: health.critical || false
      }
    });
  }

  /**
   * Get current system metrics
   */
  public getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent events matching criteria
   */
  public getEvents(criteria?: {
    type?: string;
    source?: string;
    priority?: string;
    since?: Date;
    limit?: number;
  }): KernelEvent[] {
    let filtered = [...this.eventHistory];

    if (criteria) {
      if (criteria.type) {
        filtered = filtered.filter(e => e.type === criteria.type);
      }
      if (criteria.source) {
        filtered = filtered.filter(e => e.source === criteria.source);
      }
      if (criteria.priority) {
        filtered = filtered.filter(e => e.priority === criteria.priority);
      }
      if (criteria.since) {
        filtered = filtered.filter(e => e.timestamp >= criteria.since!);
      }
    }

    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (criteria?.limit) {
      filtered = filtered.slice(0, criteria.limit);
    }

    return filtered;
  }

  /**
   * Get detected event patterns
   */
  public getDetectedPatterns(): EventPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get subscriptions for agent
   */
  public getAgentSubscriptions(agentId: string): EventSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.agentId === agentId);
  }

  /**
   * Pause event processing
   */
  public pauseProcessing(): void {
    this.processing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  /**
   * Resume event processing
   */
  public resumeProcessing(): void {
    if (!this.processing) {
      this.startBackgroundProcessing();
    }
  }

  /**
   * Clear event history and reset
   */
  public reset(): void {
    this.pauseProcessing();
    this.eventHistory = [];
    this.eventQueue = [];
    this.patterns.clear();
    this.initializeStandardPatterns();
    this.metrics = this.initializeMetrics();
    this.resumeProcessing();
  }

  /**
   * Shutdown the event bus
   */
  public shutdown(): void {
    this.pauseProcessing();
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
    
    if (this.patternDetectionInterval) {
      clearInterval(this.patternDetectionInterval);
      this.patternDetectionInterval = undefined;
    }
    
    this.subscriptions.clear();
    this.removeAllListeners();
  }

  private async processEvent(event: KernelEvent): Promise<void> {
    try {
      // Add to history
      this.eventHistory.push(event);
      this.maintainHistoryLimit();

      // Find matching subscriptions
      const matchingSubscriptions = Array.from(this.subscriptions.values())
        .filter(sub => 
          sub.active && 
          sub.eventTypes.includes(event.type) &&
          (!sub.filter || sub.filter(event))
        )
        .sort((a, b) => b.priority - a.priority);

      // Notify subscribers
      const notificationPromises = matchingSubscriptions.map(async (subscription) => {
        try {
          await subscription.handler(event);
        } catch (error) {
          console.error(`Error in event handler for subscription ${subscription.id}:`, error);
          this.metrics.errorRate += 1;
        }
      });

      await Promise.all(notificationPromises);

      // Emit internal event for pattern detection
      this.emit('event_processed', event);

    } catch (error) {
      console.error('Error processing event:', error);
      this.metrics.errorRate += 1;
    }
  }

  private startBackgroundProcessing(): void {
    this.processing = true;
    
    // Event processing loop
    this.processingInterval = setInterval(async () => {
      if (this.eventQueue.length > 0 && this.processing) {
        const event = this.eventQueue.shift()!;
        await this.processEvent(event);
      }
    }, 10) as unknown as NodeJS.Timeout; // Process every 10ms

    // Metrics update loop
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000) as unknown as NodeJS.Timeout; // Update metrics every second

    // Pattern detection loop
    this.patternDetectionInterval = setInterval(() => {
      this.detectEventPatterns();
    }, 5000) as unknown as NodeJS.Timeout; // Check patterns every 5 seconds
  }

  private updateMetrics(): void {
    const now = new Date();
    const oneSecondAgo = new Date(now.getTime() - 1000);
    
    // Calculate throughput
    const recentEvents = this.eventHistory.filter(e => e.timestamp >= oneSecondAgo);
    this.metrics.eventThroughput = recentEvents.length;
    
    // Update other metrics
    this.metrics.agentCount = new Set(Array.from(this.subscriptions.values()).map(s => s.agentId)).size;
    this.metrics.activeSubscriptions = Array.from(this.subscriptions.values()).filter(s => s.active).length;
    this.metrics.queueDepth = this.eventQueue.length;
    
    // Calculate average latency (simplified)
    if (recentEvents.length > 0) {
      const latencies = recentEvents.map(e => now.getTime() - e.timestamp.getTime());
      this.metrics.averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    }
    
    this.metrics.lastUpdate = now;
  }

  private detectEventPatterns(): void {
    const recentEvents = this.eventHistory.slice(-100);
    if (recentEvents.length < 3) return;

    // Detect sequence patterns
    for (const pattern of this.patterns.values()) {
      this.checkPattern(pattern, recentEvents);
    }

    // Detect anomalies
    this.detectAnomalies(recentEvents);
  }

  private checkPattern(pattern: EventPattern, events: KernelEvent[]): void {
    const windowStart = new Date(Date.now() - pattern.window);
    const windowEvents = events.filter(e => e.timestamp >= windowStart);
    
    // Simple pattern matching for event type sequences
    const eventTypes = windowEvents.map(e => e.type);
    const patternFound = this.findSequenceInArray(eventTypes, pattern.pattern);
    
    if (patternFound) {
      pattern.frequency += 1;
      pattern.lastDetected = new Date();
      
      // Emit pattern detection event
      this.publishEvent({
        type: 'system.pattern_detected',
        priority: pattern.significance === 'critical' ? 'high' : 'normal',
        source: 'kernel_event_bus',
        payload: {
          pattern: pattern.name,
          frequency: pattern.frequency,
          significance: pattern.significance
        },
        metadata: {
          patternId: pattern.id,
          detectionTime: new Date()
        }
      });
    }
  }

  private detectAnomalies(events: KernelEvent[]): void {
    // Detect unusual event frequency spikes
    const typeFrequencies = new Map<string, number>();
    
    for (const event of events) {
      typeFrequencies.set(event.type, (typeFrequencies.get(event.type) || 0) + 1);
    }

    for (const [eventType, frequency] of typeFrequencies) {
      // Simple anomaly detection: frequency > 3 standard deviations from mean
      const historicalFrequencies = this.getHistoricalFrequencies(eventType);
      if (historicalFrequencies.length > 10) {
        const mean = historicalFrequencies.reduce((sum, f) => sum + f, 0) / historicalFrequencies.length;
        const variance = historicalFrequencies.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / historicalFrequencies.length;
        const stdDev = Math.sqrt(variance);
        
        if (frequency > mean + (3 * stdDev)) {
          this.publishEvent({
            type: 'system.anomaly_detected',
            priority: 'high',
            source: 'kernel_event_bus',
            payload: {
              eventType,
              frequency,
              expectedRange: [mean - stdDev, mean + stdDev],
              deviation: frequency - mean
            },
            metadata: {
              anomalyType: 'frequency_spike',
              severity: frequency > mean + (5 * stdDev) ? 'critical' : 'high'
            }
          });
        }
      }
    }
  }

  private findSequenceInArray<T>(array: T[], sequence: T[]): boolean {
    if (sequence.length === 0) return true;
    if (array.length < sequence.length) return false;

    for (let i = 0; i <= array.length - sequence.length; i++) {
      let match = true;
      for (let j = 0; j < sequence.length; j++) {
        if (array[i + j] !== sequence[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    
    return false;
  }

  private getHistoricalFrequencies(eventType: string): number[] {
    // Get historical frequency data for the event type
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const historicalEvents = this.eventHistory.filter(e => 
      e.type === eventType && e.timestamp >= oneHourAgo
    );

    // Group by 5-minute windows
    const frequencies: number[] = [];
    const windowSize = 5 * 60 * 1000; // 5 minutes
    
    for (let i = 0; i < 12; i++) { // Last 12 windows (1 hour)
      const windowStart = new Date(Date.now() - ((i + 1) * windowSize));
      const windowEnd = new Date(Date.now() - (i * windowSize));
      
      const windowEvents = historicalEvents.filter(e => 
        e.timestamp >= windowStart && e.timestamp < windowEnd
      );
      
      frequencies.unshift(windowEvents.length);
    }
    
    return frequencies;
  }

  private getDriftPriority(severity: string): KernelEvent['priority'] {
    switch (severity) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'normal';
      default: return 'low';
    }
  }

  private initializeMetrics(): SystemMetrics {
    return {
      eventThroughput: 0,
      agentCount: 0,
      activeSubscriptions: 0,
      queueDepth: 0,
      averageLatency: 0,
      errorRate: 0,
      uptime: Date.now(),
      lastUpdate: new Date()
    };
  }

  private initializeStandardPatterns(): void {
    // Common patterns to detect
    const patterns: Omit<EventPattern, 'frequency' | 'lastDetected'>[] = [
      {
        id: 'agent_learning_cycle',
        name: 'Agent Learning Cycle',
        pattern: ['agent.reward_signal', 'agent.learning', 'system.health'],
        window: 30000, // 30 seconds
        significance: 'normal'
      },
      {
        id: 'drift_escalation',
        name: 'Drift Escalation Pattern',
        pattern: ['agent.drift_detected', 'agent.drift_detected', 'system.emergency'],
        window: 60000, // 1 minute
        significance: 'critical'
      },
      {
        id: 'system_overload',
        name: 'System Overload Pattern',
        pattern: ['system.health', 'system.health', 'system.anomaly_detected'],
        window: 15000, // 15 seconds
        significance: 'critical'
      },
      {
        id: 'collaborative_learning',
        name: 'Collaborative Learning Pattern',
        pattern: ['agent.learning', 'agent.reward_signal', 'agent.learning'],
        window: 45000, // 45 seconds
        significance: 'normal'
      }
    ];

    for (const pattern of patterns) {
      this.patterns.set(pattern.id, {
        ...pattern,
        frequency: 0,
        lastDetected: new Date(0)
      });
    }
  }

  private maintainHistoryLimit(): void {
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 