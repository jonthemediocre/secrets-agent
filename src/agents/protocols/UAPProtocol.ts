import { createLogger } from '../../utils/logger';
import { EventEmitter } from 'events';

const logger = createLogger('UAPProtocol');

/**
 * UAP (Unified Agent Protocol) Level A2A Implementation
 * Enables agent-to-agent communication with high reliability and security
 */

export interface UAPMessage {
  id: string;
  type: 'request' | 'response' | 'notification' | 'heartbeat' | 'emergency';
  priority: 'low' | 'normal' | 'high' | 'critical' | 'emergency';
  source: AgentIdentity;
  target: AgentIdentity | 'broadcast' | 'group';
  payload: any;
  timestamp: string;
  encryption?: {
    algorithm: string;
    keyId: string;
    checksum: string;
  };
  routing?: {
    path: AgentIdentity[];
    maxHops: number;
    currentHop: number;
  };
  metadata?: {
    correlationId?: string;
    sessionId?: string;
    traceId?: string;
    retryCount?: number;
  };
}

export interface AgentIdentity {
  id: string;
  type: 'discovery' | 'security' | 'compliance' | 'orchestrator' | 'harvester' | 'monitor';
  capabilities: AgentCapability[];
  endpoint: string;
  version: string;
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  trustLevel: number; // 0-100
  lastSeen: string;
}

export interface AgentCapability {
  name: string;
  version: string;
  description: string;
  inputs: CapabilitySchema[];
  outputs: CapabilitySchema[];
  sla: {
    responseTime: number; // milliseconds
    availability: number; // percentage
    throughput: number; // requests per second
  };
}

export interface CapabilitySchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  validation?: any;
}

export interface UAPResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  performance?: {
    processingTime: number;
    resourceUsage: any;
  };
}

export class UAPProtocol extends EventEmitter {
  private agents: Map<string, AgentIdentity> = new Map();
  private messageQueue: Map<string, UAPMessage[]> = new Map();
  private pendingRequests: Map<string, {
    resolve: (response: UAPResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  private myIdentity: AgentIdentity;
  private isOnline = false;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(identity: AgentIdentity) {
    super();
    this.myIdentity = identity;
    this.setupEventHandlers();
  }

  /**
   * Initialize UAP Protocol and start agent discovery
   */
  async initialize(): Promise<void> {
    logger.info('Initializing UAP Level A2A Protocol', {
      agentId: this.myIdentity.id,
      type: this.myIdentity.type
    });

    try {
      // Start heartbeat system
      this.startHeartbeat();
      
      // Register with network
      await this.registerAgent();
      
      // Start discovery protocol
      await this.startDiscovery();
      
      this.isOnline = true;
      this.emit('ready', this.myIdentity);
      
      logger.info('UAP Protocol initialized successfully');
    } catch (error) {
      logger.error('UAP Protocol initialization failed:', error as Record<string, any>);
      throw error;
    }
  }

  /**
   * Send message to another agent with A2A protocol
   */
  async sendMessage(
    target: AgentIdentity | string, 
    type: UAPMessage['type'], 
    payload: any,
    options: {
      priority?: UAPMessage['priority'];
      timeout?: number;
      encryption?: boolean;
      maxRetries?: number;
    } = {}
  ): Promise<UAPResponse> {
    const targetId = typeof target === 'string' ? target : target.id;
    const targetAgent = this.agents.get(targetId);
    
    if (!targetAgent && targetId !== 'broadcast' && targetId !== 'group') {
      throw new Error(`Agent ${targetId} not found in network`);
    }

    const targetValue: AgentIdentity | 'broadcast' | 'group' = 
      typeof target === 'string' 
        ? (targetId as 'broadcast' | 'group') 
        : target;

    const message: UAPMessage = {
      id: this.generateMessageId(),
      type,
      priority: options.priority || 'normal',
      source: this.myIdentity,
      target: targetValue,
      payload,
      timestamp: new Date().toISOString(),
      metadata: {
        correlationId: this.generateCorrelationId(),
        retryCount: 0
      }
    };

    // Add encryption if requested
    if (options.encryption) {
      message.encryption = await this.encryptMessage(message);
    }

    logger.debug('Sending UAP message', {
      messageId: message.id,
      type: message.type,
      target: targetId,
      priority: message.priority
    });

    if (type === 'request') {
      return this.sendRequest(message, options.timeout || 30000);
    } else {
      await this.deliverMessage(message);
      return { success: true };
    }
  }

  /**
   * Handle incoming UAP message
   */
  async handleMessage(message: UAPMessage): Promise<void> {
    try {
      // Validate message
      if (!this.validateMessage(message)) {
        logger.warn('Invalid UAP message received', { messageId: message.id });
        return;
      }

      // Decrypt if needed
      if (message.encryption) {
        message = await this.decryptMessage(message);
      }

      // Route message based on type
      switch (message.type) {
        case 'request':
          await this.handleRequest(message);
          break;
        case 'response':
          this.handleResponse(message);
          break;
        case 'notification':
          this.emit('notification', message);
          break;
        case 'heartbeat':
          this.handleHeartbeat(message);
          break;
        case 'emergency':
          this.emit('emergency', message);
          break;
      }

      logger.debug('UAP message processed', {
        messageId: message.id,
        type: message.type,
        source: message.source.id
      });

    } catch (error) {
      logger.error('Error handling UAP message:', error as Record<string, any>);
      
      if (message.type === 'request') {
        await this.sendErrorResponse(message, error);
      }
    }
  }

  /**
   * Register agent capabilities and join network
   */
  private async registerAgent(): Promise<void> {
    this.agents.set(this.myIdentity.id, this.myIdentity);
    
    // Broadcast registration to network
    await this.sendMessage('broadcast', 'notification', {
      event: 'agent_registered',
      agent: this.myIdentity
    }, { priority: 'high' });
  }

  /**
   * Start agent discovery protocol
   */
  private async startDiscovery(): Promise<void> {
    // Request agent list from network
    try {
      const response = await this.sendMessage('broadcast', 'request', {
        action: 'get_agents'
      }, { timeout: 10000 });

      if (response.success && response.data?.agents) {
        for (const agent of response.data.agents) {
          this.agents.set(agent.id, agent);
        }
      }
    } catch (error) {
      logger.warn('Agent discovery failed:', error as Record<string, any>);
    }
  }

  /**
   * Start heartbeat system for agent health monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.sendMessage('broadcast', 'heartbeat', {
          status: this.myIdentity.status,
          timestamp: new Date().toISOString(),
          capabilities: this.myIdentity.capabilities.length
        }, { priority: 'low' });
      } catch (error) {
        logger.warn('Heartbeat failed:', error as Record<string, any>);
      }
    }, 30000) as unknown as NodeJS.Timeout; // Every 30 seconds
  }

  /**
   * Send request and wait for response
   */
  private async sendRequest(message: UAPMessage, timeout: number): Promise<UAPResponse> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout) as unknown as NodeJS.Timeout;

      this.pendingRequests.set(message.id, {
        resolve,
        reject,
        timeout: timeoutHandle
      });

      this.deliverMessage(message).catch(error => {
        this.pendingRequests.delete(message.id);
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  /**
   * Handle incoming request
   */
  private async handleRequest(message: UAPMessage): Promise<void> {
    try {
      const response = await this.processRequest(message);
      
      await this.sendMessage(message.source, 'response', {
        requestId: message.id,
        ...response
      }, { priority: message.priority });
      
    } catch (error) {
      await this.sendErrorResponse(message, error);
    }
  }

  /**
   * Process request based on agent capabilities
   */
  private async processRequest(message: UAPMessage): Promise<UAPResponse> {
    const { action, parameters } = message.payload;
    
    // Find matching capability
    const capability = this.myIdentity.capabilities.find(cap => 
      cap.name === action
    );
    
    if (!capability) {
      throw new Error(`Capability '${action}' not supported by agent ${this.myIdentity.id}`);
    }

    // Emit event for capability execution
    const result = await new Promise<any>((resolve, reject) => {
      this.emit('execute_capability', {
        capability: action,
        parameters,
        resolve,
        reject
      });
    });

    return {
      success: true,
      data: result,
      performance: {
        processingTime: Date.now() - new Date(message.timestamp).getTime(),
        resourceUsage: {}
      }
    };
  }

  /**
   * Handle response to previous request
   */
  private handleResponse(message: UAPMessage): void {
    const requestId = message.payload.requestId;
    const pending = this.pendingRequests.get(requestId);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
      pending.resolve(message.payload);
    }
  }

  /**
   * Handle heartbeat from another agent
   */
  private handleHeartbeat(message: UAPMessage): void {
    const agent = this.agents.get(message.source.id);
    if (agent) {
      agent.lastSeen = message.timestamp;
      agent.status = message.payload.status;
      this.agents.set(agent.id, agent);
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('agent_joined', (agent: AgentIdentity) => {
      this.agents.set(agent.id, agent);
      logger.info('Agent joined network', { agentId: agent.id, type: agent.type });
    });

    this.on('agent_left', (agentId: string) => {
      this.agents.delete(agentId);
      logger.info('Agent left network', { agentId });
    });
  }

  /**
   * Utility methods
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateMessage(message: UAPMessage): boolean {
    return !!(message.id && message.type && message.source && message.timestamp);
  }

  private async encryptMessage(message: UAPMessage): Promise<any> {
    // Implement encryption logic
    return {
      algorithm: 'AES-256-GCM',
      keyId: 'default',
      checksum: 'placeholder'
    };
  }

  private async decryptMessage(message: UAPMessage): Promise<UAPMessage> {
    // Implement decryption logic
    return message;
  }

  private async deliverMessage(message: UAPMessage): Promise<void> {
    // Implement message delivery (WebSocket, HTTP, etc.)
    this.emit('message_sent', message);
  }

  private async sendErrorResponse(message: UAPMessage, error: any): Promise<void> {
    await this.sendMessage(message.source, 'response', {
      requestId: message.id,
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : String(error),
        details: error
      }
    }, { priority: message.priority });
  }

  /**
   * Get network status
   */
  getNetworkStatus(): {
    isOnline: boolean;
    agentCount: number;
    agents: AgentIdentity[];
    pendingRequests: number;
  } {
    return {
      isOnline: this.isOnline,
      agentCount: this.agents.size,
      agents: Array.from(this.agents.values()),
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * Shutdown protocol
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Clear pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Agent shutting down'));
    }
    this.pendingRequests.clear();

    // Notify network
    await this.sendMessage('broadcast', 'notification', {
      event: 'agent_leaving',
      agent: this.myIdentity
    }, { priority: 'high' });

    this.isOnline = false;
    logger.info('UAP Protocol shutdown complete');
  }
}

export default UAPProtocol; 