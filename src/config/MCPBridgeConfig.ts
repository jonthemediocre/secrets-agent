import { MCPBridgeCoreConfig } from '../services/MCPBridgeCore';
import { createLogger } from '../utils/logger';

const logger = createLogger('MCPBridgeConfig');

export interface MCPAgentConfig {
  agent_id: string;
  action_mappings: Record<string, any>;
  polling_interval: number;
  max_poll_attempts: number;
  tools_cache_ttl: number;
}

export class MCPBridgeConfig {
  private config: {
    mcp_bridge_core: MCPBridgeCoreConfig;
    mcp_bridge_agent: MCPAgentConfig;
  };

  constructor(config: {
    mcp_bridge_core: MCPBridgeCoreConfig;
    mcp_bridge_agent: MCPAgentConfig;
  }) {
    this.config = config;
  }

  getAgentConfig(): MCPAgentConfig {
    return {
      agent_id: this.config.mcp_bridge_agent.agent_id,
      action_mappings: this.config.mcp_bridge_agent.action_mappings,
      polling_interval: this.config.mcp_bridge_agent.polling_interval,
      max_poll_attempts: this.config.mcp_bridge_agent.max_poll_attempts,
      tools_cache_ttl: this.config.mcp_bridge_agent.tools_cache_ttl
    };
  }

  getCoreConfig(): MCPBridgeCoreConfig {
    return this.config.mcp_bridge_core;
  }

  static getDefaultConfig(): MCPBridgeConfig {
    return new MCPBridgeConfig({
      mcp_bridge_core: {
        environment: process.env.NODE_ENV || 'development',
        autoStart: false,
        mcp_api_url: 'http://localhost:3000/api/v1',
        mcp_api_key: process.env.MCP_API_KEY || '',
        timeout: 30000,
        retry_config: {
          max_retries: 3,
          backoff_factor: 0.5
        }
      },
      mcp_bridge_agent: {
        agent_id: 'default-agent',
        action_mappings: {},
        polling_interval: 5000,
        max_poll_attempts: 3,
        tools_cache_ttl: 300000 // 5 minutes
      }
    });
  }
} 