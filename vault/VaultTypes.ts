// vault/VaultTypes.ts

export interface SecretEntry {
  key: string; // The actual secret value (might be handled differently if too sensitive for direct storage)
  source: 'env' | 'manual' | 'api' | 'sops' | 'vault'; // Origin of the secret
  envFile?: string; // If sourced from an .env file
  created: string; // ISO 8601 timestamp
  lastUpdated: string; // ISO 8601 timestamp
  expires?: string; // ISO 8601 timestamp or human-readable (e.g., "never", "90d")
  tags?: string[];
  notes?: string;
  // Potential future fields
  // rotationPolicy?: { interval: string; script?: string; }; // e.g., "90d"
  // history?: Array<{ timestamp: string; event: string; oldValue?: string; }>;
}

export interface VaultCategory {
  [identifier: string]: SecretEntry;
}

export interface VaultProject {
  [category: string]: VaultCategory;
}

export interface VaultData {
  version: number;
  projects: {
    [projectName: string]: VaultProject;
  };
  globalTags: string[];
} 