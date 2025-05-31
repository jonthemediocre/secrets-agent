// Unified VaultTypes - Production Version
// Maintains backward compatibility while supporting APIHarvester extensions

export interface SecretEntry {
  key: string;
  value: string;
  description?: string;
  created: Date | string; // Support both Date objects and ISO strings for compatibility
  lastUpdated: Date | string;
  tags: string[];
  category?: string;
  source?: 'env' | 'manual' | 'api' | 'sops' | 'vault' | 'scaffold' | 'cli_scan' | 'cli-harvester' | 'browser-guided' | 'manual-import';
  metadata?: Record<string, any>;
  // Legacy fields for backward compatibility
  envFile?: string;
  expires?: string;
  notes?: string;
}

export interface Project {
  name: string;
  description?: string; // Make optional for compatibility
  created: Date | number; // Support both formats
  lastUpdated: Date | number;
  secrets: SecretEntry[];
  metadata?: Record<string, any>;
}

export interface VaultData {
  version: string | number; // Support both formats
  created?: Date | number; // Legacy support
  lastUpdated?: Date | number; // Legacy support
  projects: Project[];
  metadata?: Record<string, any> | { created: number; lastUpdated: number }; // Support both formats
  globalTags?: string[]; // Legacy support
}

// APIHarvester Extensions

export type AuthMethod = 'api-key' | 'oauth2' | 'bearer-token' | 'service-account' | 'token' | 'oauth' | 'ssh' | 'access-key' | 'iam-role' | 'session-token' | 'client-credentials' | 'bot-token' | 'webhook' | 'service-principal' | 'managed-identity' | 'azure-cli' | 'secret-key' | 'publishable-key' | 'app-password' | 'connection-string' | 'dsn' | 'auth-token' | 'license-key' | 'app-key' | 'password' | 'client-cert' | 'management-api' | 'server-token' | 'account-token' | 'access-token' | 'management-token';

export type KeyFormat = string; // Simplified to allow regex patterns as strings

export type APICategory = 'development-tools' | 'cloud-infrastructure' | 'ai-ml' | 'payment' | 'communication' | 'deployment-hosting' | 'database-storage' | 'analytics-monitoring' | 'email-marketing' | 'cdn-storage' | 'security-auth' | 'content-management';

export type CLISupport = boolean;

export interface APIService {
  id: string;
  name: string;
  description: string;
  category: string;
  popularity: number;
  authMethods: AuthMethod[];
  keyFormats: KeyFormat[];
  cliSupported: boolean;
  cliTool?: string;
  cliInstallCmd?: string;
  cliLoginCmd?: string;
  docUrl: string;
  configPaths?: string[];
  envVars: string[];
}

export interface HarvestedCredential extends SecretEntry {
  source: 'cli-harvester' | 'browser-guided' | 'manual-import';
  apiService: string; // Reference to APIService.id
  harvestMethod: 'cli' | 'browser' | 'manual';
  authMethod: AuthMethod;
  rotationConfig?: RotationConfig;
  harvestMetadata: {
    harvestedAt: Date;
    cliTool?: string;
    browserFlow?: string;
    lastRotated?: Date;
    rotationAttempts: number;
    expiresAt?: Date;
    scopes?: string[];
    originalResponse?: Record<string, any>;
  };
}

export interface RotationConfig {
  enabled: boolean;
  intervalDays: number;
  warningDays: number;
  autoRotate: boolean;
  lastRotation?: Date;
  nextRotation?: Date;
  rotationHistory: RotationEvent[];
}

export interface RotationEvent {
  timestamp: Date;
  success: boolean;
  oldKeyHash: string; // SHA256 hash for tracking
  newKeyHash?: string;
  method: 'cli' | 'browser' | 'manual';
  error?: string;
  metadata?: Record<string, any>;
}

export interface HarvestSession {
  id: string;
  apiService: string;
  method: 'cli' | 'browser';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  steps: HarvestStep[];
  result?: HarvestedCredential;
  error?: string;
}

export interface HarvestStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  output?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface APIDiscoveryResult {
  totalApis: number;
  categoryCounts: Record<APICategory, number>;
  cliSupportCount: number;
  discoveredAt: Date;
  services: APIService[];
}

// Extended Vault Data with APIHarvester support
export interface ExtendedVaultData extends VaultData {
  harvester?: {
    services: APIService[];
    credentials: HarvestedCredential[];
    sessions: HarvestSession[];
    discovery: APIDiscoveryResult;
    config: HarvesterConfig;
  };
}

export interface HarvesterConfig {
  autoRotationEnabled: boolean;
  defaultRotationDays: number;
  warningDays: number;
  enabledCategories: APICategory[];
  cliToolsPath: string;
  browserTimeout: number;
  maxConcurrentHarvests: number;
  backupCredentials: boolean;
}

// Legacy type aliases for backward compatibility
export interface VaultProject extends Project {}

// Type conversion utilities
export function normalizeDate(date: Date | string | number): string {
  if (typeof date === 'string') return date;
  if (typeof date === 'number') return new Date(date).toISOString();
  return date.toISOString();
}

export function parseDate(date: Date | string | number): Date {
  if (date instanceof Date) return date;
  if (typeof date === 'number') return new Date(date);
  return new Date(date);
} 