/**
 * TypeScript Bridge for Unified Communication Layer
 * Connects SimpleEventBus to Python-based UnifiedCommunicationLayer via Redis
 */

import Redis from 'ioredis';
import { createLogger } from '../utils/logger';
import { SimpleEventBus } from './SimpleEventBus';

const logger = createLogger('UnifiedCommunicationBridge');

export enum MessageType {
  AGENT_REQUEST = 'agent_request',
  AGENT_RESPONSE = 'agent_response',
  TASK_ASSIGNMENT = 'task_assignment',
  TASK_COMPLETION = 'task_completion',
  BROADCAST = 'broadcast',
  SYSTEM_NOTIFICATION = 'system_notification',
  HEALTH_CHECK = 'health_check'
}

export enum AgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  ERROR = 'error',
  STARTING = 'starting',
  STOPPING = 'stopping'
}

export interface UnifiedMessage {
  message_id: string;
  correlation_id?: string;
  message_type: MessageType;
  source_agent: string;
  target_agent?: string;
  payload: any;
  priority: number;
  timestamp: string;
  routing?: {
    destination: string;
    target_agent: string;
    bridge_timestamp: string;
  };
}

export interface TypeScriptAgentInfo {
  agent_id: string;
  agent_type: string;
  capabilities: string[];
  language: 'typescript';
  endpoint?: string;
  status: AgentStatus;
  last_seen: string;
  message_count: number;
}

export interface RedisConfig {
  host?: string;
  port?: number;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

export class UnifiedCommunicationBridge {
  private static instance: UnifiedCommunicationBridge;
  
  private redis: Redis;
  private eventBus: SimpleEventBus;
  private bridgeId: string;
  private running = false;
  private registeredAgents = new Map<string, TypeScriptAgentInfo>();
  private messageHandlers = new Map<string, (message: UnifiedMessage) => Promise<void>>();
  private consumerGroup = 'typescript_bridge_group';
  private consumerName: string;
  
  static getInstance(config?: RedisConfig): UnifiedCommunicationBridge {
    if (!UnifiedCommunicationBridge.instance) {
      UnifiedCommunicationBridge.instance = new UnifiedCommunicationBridge(config);
    }
    return UnifiedCommunicationBridge.instance;
  }

  constructor(config: RedisConfig = {}) {
    this.bridgeId = `ts-bridge-${Date.now()}`;
    this.consumerName = `ts-consumer-${this.bridgeId}`;
    this.eventBus = SimpleEventBus.getInstance();
    
    this.redis = new Redis({
      host: config.host || 'localhost',
      port: config.port || 6379,
      db: config.db || 0,
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      lazyConnect: true
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error', { error: error.message });
    });

    this.redis.on('connect', () => {
      logger.info('Connected to Redis for UnifiedCommunicationBridge');
    });

    this.redis.on('close', () => {
      logger.info('Redis connection closed for UnifiedCommunicationBridge');
    });
  }

  async start(): Promise<void> {
    if (this.running) {
      logger.warning('UnifiedCommunicationBridge already running');
      return;
    }

    try {
      logger.info('Starting UnifiedCommunicationBridge');
      
      // Connect to Redis
      await this.redis.connect();
      
      // Setup consumer group
      await this.setupConsumerGroup();
      
      this.running = true;
      
      // Start processing messages from Python UCL
      this.processTypescriptBridgeMessages();
      
      // Register self
      await this.registerAgent(
        this.bridgeId,
        'UnifiedCommunicationBridge',
        ['bridging', 'routing', 'typescript_integration'],
        'http://localhost:5042' // Default endpoint
      );
      
      logger.info('UnifiedCommunicationBridge started successfully');
      
    } catch (error) {
      logger.error('Failed to start UnifiedCommunicationBridge', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    logger.info('Stopping UnifiedCommunicationBridge');
    this.running = false;
    
    // Unregister all agents
    for (const agentId of this.registeredAgents.keys()) {
      await this.unregisterAgent(agentId);
    }
    
    await this.redis.disconnect();
    logger.info('UnifiedCommunicationBridge stopped');
  }

  private async setupConsumerGroup(): Promise<void> {
    try {
      // Create consumer group for typescript_bridge stream
      await this.redis.xgroup(
        'CREATE',
        'typescript_bridge',
        this.consumerGroup,
        '$',
        'MKSTREAM'
      );
      logger.info(`Created consumer group ${this.consumerGroup} for typescript_bridge stream`);
    } catch (error: any) {
      if (error.message.includes('BUSYGROUP')) {
        logger.info(`Consumer group ${this.consumerGroup} already exists`);
      } else {
        logger.error('Failed to create consumer group', { error: error.message });
        throw error;
      }
    }
  }

  async registerAgent(
    agentId: string,
    agentType: string,
    capabilities: string[] = [],
    endpoint?: string
  ): Promise<boolean> {
    try {
      const agentInfo: TypeScriptAgentInfo = {
        agent_id: agentId,
        agent_type: agentType,
        capabilities,
        language: 'typescript',
        endpoint,
        status: AgentStatus.ONLINE,
        last_seen: new Date().toISOString(),
        message_count: 0
      };
      
      this.registeredAgents.set(agentId, agentInfo);
      
      // Publish to Python UCL discovery stream
      await this.redis.xadd(
        'agent_discovery',
        '*',
        '_event_id', this.generateId(),
        'data', JSON.stringify({
          event_type: 'agent_registered',
          agent_info: agentInfo,
          timestamp: new Date().toISOString()
        })
      );
      
      // Register with local event bus
      this.eventBus.subscribeToEvent(
        `agent.${agentId}`,
        async (data) => await this.handleLocalEvent(agentId, data)
      );
      
      logger.info(`Registered TypeScript agent ${agentId} (${agentType})`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to register agent ${agentId}`, { error });
      return false;
    }
  }

  async unregisterAgent(agentId: string): Promise<boolean> {
    try {
      if (this.registeredAgents.has(agentId)) {
        // Publish unregistration to Python UCL
        await this.redis.xadd(
          'agent_discovery',
          '*',
          '_event_id', this.generateId(),
          'data', JSON.stringify({
            event_type: 'agent_unregistered',
            agent_id: agentId,
            timestamp: new Date().toISOString()
          })
        );
        
        this.registeredAgents.delete(agentId);
        this.messageHandlers.delete(agentId);
        
        logger.info(`Unregistered TypeScript agent ${agentId}`);
        return true;
      }
      return false;
      
    } catch (error) {
      logger.error(`Failed to unregister agent ${agentId}`, { error });
      return false;
    }
  }

  async sendMessage(message: Omit<UnifiedMessage, 'message_id' | 'timestamp'>): Promise<boolean> {
    try {
      const fullMessage: UnifiedMessage = {
        ...message,
        message_id: this.generateId(),
        timestamp: new Date().toISOString()
      };
      
      // Update agent stats
      const agentInfo = this.registeredAgents.get(message.source_agent);
      if (agentInfo) {
        agentInfo.last_seen = new Date().toISOString();
        agentInfo.message_count++;
      }
      
      if (message.target_agent) {
        // Check if target is local TypeScript agent
        if (this.registeredAgents.has(message.target_agent)) {
          // Local delivery via EventBus
          this.eventBus.publishEvent(`agent.${message.target_agent}`, {
            unified_message: fullMessage,
            source: 'unified_communication'
          });
          return true;
        } else {
          // Send to Python UCL for routing
          await this.redis.xadd(
            'agent_messages',
            '*',
            '_event_id', fullMessage.message_id,
            'data', JSON.stringify(fullMessage)
          );
          return true;
        }
      } else {
        // Broadcast message
        await this.redis.xadd(
          'agent_broadcasts',
          '*',
          '_event_id', fullMessage.message_id,
          'data', JSON.stringify(fullMessage)
        );
        
        // Also broadcast locally
        this.eventBus.publishEvent('agent.broadcast', {
          unified_message: fullMessage,
          source: 'unified_communication'
        });
        return true;
      }
      
    } catch (error) {
      logger.error('Failed to send message', { error, message });
      return false;
    }
  }

  private async processTypescriptBridgeMessages(): Promise<void> {
    logger.info('Starting to process typescript_bridge messages');
    
    const processMessages = async () => {
      while (this.running) {
        try {
          const result = await this.redis.xreadgroup(
            'GROUP',
            this.consumerGroup,
            this.consumerName,
            'COUNT',
            '1',
            'BLOCK',
            '1000', // 1 second block
            'STREAMS',
            'typescript_bridge',
            '>'
          );
          
          if (result && result.length > 0) {
            const [streamName, messages] = result[0];
            
            for (const [messageId, fields] of messages) {
              try {
                await this.handleBridgeMessage(messageId, fields);
                
                // Acknowledge message
                await this.redis.xack('typescript_bridge', this.consumerGroup, messageId);
                
              } catch (error) {
                logger.error('Error processing bridge message', {
                  messageId,
                  error: error instanceof Error ? error.message : String(error)
                });
                
                // Still acknowledge to prevent reprocessing
                await this.redis.xack('typescript_bridge', this.consumerGroup, messageId);
              }
            }
          }
          
        } catch (error: any) {
          if (this.running) {
            logger.error('Error in bridge message processing', { 
              error: error.message,
              consumerName: this.consumerName
            });
            
            // Brief delay before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
    };
    
    // Start processing in background
    processMessages().catch(error => {
      logger.error('Critical error in bridge message processing', { error });
    });
  }

  private async handleBridgeMessage(messageId: string, fields: string[]): Promise<void> {
    try {
      // Parse Redis stream fields (key-value pairs)
      const data: any = {};
      for (let i = 0; i < fields.length; i += 2) {
        data[fields[i]] = fields[i + 1];
      }
      
      const messageData = JSON.parse(data.data || '{}');
      const routing = messageData.routing;
      
      if (routing && routing.destination === 'typescript') {
        const targetAgent = routing.target_agent;
        
        // Remove routing metadata
        delete messageData.routing;
        
        const message: UnifiedMessage = messageData;
        
        logger.debug(`Received bridge message ${message.message_id} for agent ${targetAgent}`);
        
        if (this.registeredAgents.has(targetAgent)) {
          // Deliver to local TypeScript agent
          this.eventBus.publishEvent(`agent.${targetAgent}`, {
            unified_message: message,
            source: 'unified_communication'
          });
          
          // Invoke registered handler if exists
          const handler = this.messageHandlers.get(targetAgent);
          if (handler) {
            await handler(message);
          }
        } else {
          logger.warning(`Target TypeScript agent ${targetAgent} not registered locally`);
        }
      }
      
    } catch (error) {
      logger.error(`Error handling bridge message ${messageId}`, { error });
    }
  }

  private async handleLocalEvent(agentId: string, eventData: any): Promise<void> {
    try {
      // Handle events from local TypeScript agents via EventBus
      if (eventData.unified_message_request) {
        // Agent wants to send a message via unified communication
        await this.sendMessage(eventData.unified_message_request);
      }
      
    } catch (error) {
      logger.error(`Error handling local event for agent ${agentId}`, { error });
    }
  }

  registerMessageHandler(agentId: string, handler: (message: UnifiedMessage) => Promise<void>): void {
    this.messageHandlers.set(agentId, handler);
    logger.info(`Registered message handler for TypeScript agent ${agentId}`);
  }

  unregisterMessageHandler(agentId: string): void {
    this.messageHandlers.delete(agentId);
    logger.info(`Unregistered message handler for TypeScript agent ${agentId}`);
  }

  async sendHealthCheck(agentId: string, status: AgentStatus, customMetrics?: any): Promise<void> {
    try {
      const healthMessage = {
        agent_id: agentId,
        status: status,
        timestamp: new Date().toISOString(),
        custom_metrics: customMetrics
      };
      
      await this.redis.xadd(
        'agent_health',
        '*',
        '_event_id', this.generateId(),
        'data', JSON.stringify(healthMessage)
      );
      
      // Update local agent info
      const agentInfo = this.registeredAgents.get(agentId);
      if (agentInfo) {
        agentInfo.status = status;
        agentInfo.last_seen = new Date().toISOString();
      }
      
    } catch (error) {
      logger.error(`Failed to send health check for agent ${agentId}`, { error });
    }
  }

  getRegisteredAgents(): Map<string, TypeScriptAgentInfo> {
    return new Map(this.registeredAgents);
  }

  getAgentInfo(agentId: string): TypeScriptAgentInfo | undefined {
    return this.registeredAgents.get(agentId);
  }

  isAgentOnline(agentId: string): boolean {
    const agent = this.registeredAgents.get(agentId);
    return agent?.status === AgentStatus.ONLINE;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Utility method for easy message creation
  createMessage(
    messageType: MessageType,
    sourceAgent: string,
    payload: any,
    targetAgent?: string,
    priority: number = 3,
    correlationId?: string
  ): Omit<UnifiedMessage, 'message_id' | 'timestamp'> {
    return {
      message_type: messageType,
      source_agent: sourceAgent,
      target_agent: targetAgent,
      payload,
      priority,
      correlation_id: correlationId
    };
  }

  // Helper method to start periodic health checks for registered agents
  startPeriodicHealthChecks(intervalMs: number = 30000): void {
    setInterval(async () => {
      for (const [agentId, agentInfo] of this.registeredAgents.entries()) {
        if (agentId !== this.bridgeId) { // Skip self
          try {
            await this.sendHealthCheck(agentId, agentInfo.status);
          } catch (error) {
            logger.error(`Failed to send periodic health check for ${agentId}`, { error });
          }
        }
      }
    }, intervalMs);
  }
}

// Factory function for easy setup
export async function createUnifiedCommunicationBridge(config?: RedisConfig): Promise<UnifiedCommunicationBridge> {
  const bridge = UnifiedCommunicationBridge.getInstance(config);
  await bridge.start();
  return bridge;
} 