export const AGENT_TYPES = {
  SCANNER: 'scanner',
  VAULT: 'vault',
  MCP: 'mcp',
  GOVERNANCE: 'governance'
} as const;

export const AGENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  PENDING: 'pending'
} as const;