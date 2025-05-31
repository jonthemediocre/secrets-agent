export interface AccessLogEntry {
  timestamp: string;
  userId: string;
  userName?: string;
  action: string;
  projectName: string;
  secretKey?: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
  // Legacy compatibility fields
  operation?: string;
  secretId?: string;
  appId?: string;
}

export interface EnvFileServiceInterface {
  addSecret(key: string, value: string, description?: string): Promise<void>;
  getSecret(key: string): Promise<string | null>;
  updateSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}

export interface AccessLogServiceInterface {
  logAccess(entry: AccessLogEntry): Promise<void>;
  getAccessLogs(filters?: any): Promise<AccessLogEntry[]>;
}

export interface VantaError extends Error {
  name: string;
  message: string;
  code?: string;
  statusCode?: number;
} 