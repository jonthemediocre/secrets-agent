// Change RotationInterval to a type union to easily include 'custom' string literal
export type RotationInterval =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUALLY"
  | "custom" // Ensure 'custom' is part of the type for comparisons
  | string; // Allow other string patterns like "7d", "30d"

export enum NotificationChannel {
  EMAIL = "EMAIL",
  SLACK = "SLACK",
  WEBHOOK = "WEBHOOK",
  NONE = "NONE",
}

// Added NotificationChannelValue type alias
export type NotificationChannelValue = {
  type: NotificationChannel;
  target: string; // e.g., email address, webhook URL, Slack channel ID
};

export interface RotationNotificationConfig {
  // channel: NotificationChannel; // Replaced by channels array
  // recipient: string; // Replaced by channels array
  channels: NotificationChannelValue[]; // Use the new type alias for multiple channels
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notifyBeforeRotationDays?: number; // Optional: days before rotation to send a reminder
}

// Added HookTiming type alias
export type HookTiming = "PRE_ROTATION" | "POST_ROTATION";

// Exporting RegenerationStrategy interface
export interface RegenerationStrategy {
  type: "INTERNAL_GENERATOR" | "EXTERNAL_SYSTEM" | "AGENT_TASK" | string; // Allow custom string for extensibility
  details?: Record<string, unknown>; // e.g., { generatorType: "alphanumeric", length: 32 } or { agentId: "SecureValueGeneratorAgent", taskName: "generateApiToken" } or { characterSet: "abc..." }
}

export interface RotationHook {
  type: HookTiming; // Use the new type alias
  action: "WEBHOOK" | "AGENT_TASK"; // Could be extended with SCRIPT, etc.
  target: string; // Webhook URL or Agent Task ID
  timeoutSeconds?: number; // Optional timeout for the hook
  payload?: Record<string, unknown>; // Optional payload for the hook
}

export interface RotationPolicy {
  id: string; // Added for backward compatibility with services
  policyId: string; // Unique identifier for the policy  
  secretName: string; // The name of the secret this policy applies to
  project: string; // Added field
  category: string; // Added field
  isEnabled: boolean;
  
  rotationInterval: RotationInterval;
  schedule?: { // Added for compatibility with scheduler service
    interval: RotationInterval;
    cronExpression?: string;
  };
  customRotationCron?: string; // Used if interval is CUSTOM, cron expression
  nextRotationDate?: string; // ISO 8601 string, calculated or manually set
  lastRotationDate?: string; // ISO 8601 string
  
  // Who/what is responsible for generating the new secret value
  // This could be a reference to a specific strategy, an external system, or an agent task
  regenerationStrategy: RegenerationStrategy; // Use the exported interface
  
  versioningEnabled: boolean; // Whether to keep previous versions of the secret after rotation
  maxVersionsToKeep?: number; // If versioning is enabled

  notifications?: RotationNotificationConfig[]; // Should be optional array
  hooks?: RotationHook[]; // Should be optional array

  createdBy: string; // User ID or agent ID
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

// Example Usage (conceptual)
// const examplePolicy: RotationPolicy = {
//   id: "pol-123xyz", // Added for service compatibility
//   policyId: "pol-123xyz",
//   secretName: "DATABASE_PASSWORD",
//   project: "default",
//   category: "database",
//   isEnabled: true,
//   rotationInterval: "MONTHLY",
//   regenerationStrategy: {
//     type: "INTERNAL_GENERATOR",
//     details: { generatorType: "strong_password", length: 24 }
//   } as RegenerationStrategy,
//   versioningEnabled: true,
//   maxVersionsToKeep: 3,
//   notifications: [
//     {
//       channels: [{ type: NotificationChannel.EMAIL, target: "admin@example.com" }],
//       notifyOnSuccess: true,
//       notifyOnFailure: true,
//       notifyBeforeRotationDays: 7
//     }
//   ],
//   hooks: [
//     {
//       type: "POST_ROTATION" as HookTiming,
//       action: "WEBHOOK",
//       target: "https://ops.example.com/hooks/db-password-rotated"
//     }
//   ],
//   createdBy: "user-admin-001",
//   createdAt: new Date().toISOString(),
//   updatedAt: new Date().toISOString(),
// }; 