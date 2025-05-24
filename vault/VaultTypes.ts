// vault/VaultTypes.ts

export interface SecretEntry {
  key: string;
  value?: string; // The actual secret value
  description?: string; // Human readable description
  source: 'env' | 'manual' | 'api' | 'sops' | 'vault' | 'scaffold' | 'cli_scan'; // Origin of the secret
  envFile?: string; // If sourced from an .env file
  created: string; // ISO 8601 timestamp
  lastUpdated: string; // ISO 8601 timestamp
  expires?: string; // ISO 8601 timestamp or human-readable (e.g., "never", "90d")
  tags?: string[];
  notes?: string;
  category?: string; // For grouping secrets
  metadata?: Record<string, any>; // Additional metadata
  // Potential future fields
  // rotationPolicy?: { interval: string; script?: string; }; // e.g., "90d"
  // history?: Array<{ timestamp: string; event: string; oldValue?: string; }>;
}

export interface VaultProject {
  name: string;
  description?: string;
  secrets: SecretEntry[];
  created: number;
  lastUpdated: number;
}

export interface VaultData {
  version: number;
  metadata: {
    created: number;
    lastUpdated: number;
  };
  projects: VaultProject[];
  globalTags: string[];
}

export interface VaultMetadata {
  created: number;
  lastUpdated: number;
  version: number;
} 