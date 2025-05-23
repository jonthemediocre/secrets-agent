// Предполагаемый путь: apps/api/agents/secrets/SecretRotatorAgent.ts
import { VaultAgent } from '../../../../vault/VaultAgent';
import { 
    RotationPolicy, 
    RegenerationStrategy, // Assuming this is part of RotationPolicy model
    RotationHook, 
    RotationNotificationConfig, 
    HookTiming,
    RotationInterval // Import RotationInterval type
} from './models/RotationPolicy';
import { SecretEntry } from '../../../../vault/VaultTypes'; // Corrected path
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../../../src/utils/logger';

const logger = createLogger('SecretRotatorAgent');
const POLICY_PROJECT = '_system';
const POLICY_CATEGORY = 'rotation_policies';

export class SecretRotatorAgent {
  constructor(private vaultAgent: VaultAgent) {}

  public async initialize(): Promise<void> {
    logger.info("SecretRotatorAgent initialized.");
  }

  public async savePolicy(
    policyData: Partial<Omit<RotationPolicy, 'policyId' | 'createdAt' | 'updatedAt' | 'nextRotationDate' | 'lastRotationDate'>> & 
                Pick<RotationPolicy, 'secretName' | 'project' | 'category'> & 
                { policyId?: string } 
  ): Promise<RotationPolicy> {
    await this.vaultAgent.loadVault();
    const now = new Date().toISOString();
    let existingPolicyObject: RotationPolicy | null = null;
    let policyIdToUse = policyData.policyId;

    if (policyIdToUse) {
        const secretEntry = this.vaultAgent.getSecret(POLICY_PROJECT, POLICY_CATEGORY, policyIdToUse);
        if (secretEntry && secretEntry.key) { // Policy JSON is in secretEntry.key
            try { existingPolicyObject = JSON.parse(secretEntry.key) as RotationPolicy; } catch (e) { logger.error(`Parse error for existing policy ${policyIdToUse}:`, e);}
        }
    } else { 
        const allPolicies = this.getAllPoliciesFromVaultData(); // Assumes vault is loaded
        const matchedPolicy = allPolicies.find(p => 
            p.project === policyData.project && p.category === policyData.category && p.secretName === policyData.secretName );
        if (matchedPolicy) {
            existingPolicyObject = matchedPolicy;
            policyIdToUse = matchedPolicy.policyId; 
            logger.info(`Found existing policy by content match: ${policyIdToUse}. Treating as update.`);
        }
    }
    const effectivePolicyId = policyIdToUse || uuidv4();
    
    const currentRotationInterval = policyData.rotationInterval || existingPolicyObject?.rotationInterval || "30d" as RotationInterval;
    const currentCustomCron = policyData.customRotationCron !== undefined ? policyData.customRotationCron : existingPolicyObject?.customRotationCron;
    const lastRotationForCalc = existingPolicyObject?.lastRotationDate || undefined; // Pass undefined if null/empty

    const fullPolicy: RotationPolicy = {
      policyId: effectivePolicyId,
      id: effectivePolicyId, // Added for service compatibility
      secretName: policyData.secretName!,
      project: policyData.project!,
      category: policyData.category!,
      isEnabled: policyData.isEnabled !== undefined ? policyData.isEnabled : (existingPolicyObject?.isEnabled || false),
      rotationInterval: currentRotationInterval,
      customRotationCron: currentCustomCron,
      regenerationStrategy: policyData.regenerationStrategy || existingPolicyObject?.regenerationStrategy || { type: 'alphanumeric', details: {length: 32} }, // Default strategy
      versioningEnabled: policyData.versioningEnabled !== undefined ? policyData.versioningEnabled : (existingPolicyObject?.versioningEnabled || false),
      notifications: policyData.notifications || existingPolicyObject?.notifications || [],
      hooks: policyData.hooks || existingPolicyObject?.hooks || [],
      createdBy: existingPolicyObject?.createdBy || 'system', 
      createdAt: existingPolicyObject?.createdAt || now, 
      updatedAt: now,
      lastRotationDate: lastRotationForCalc, // Changed from || null to just lastRotationForCalc
      nextRotationDate: this.calculateNextRotationDate(currentRotationInterval, currentCustomCron, lastRotationForCalc),
    };
        
    if (fullPolicy.rotationInterval === 'custom' && !fullPolicy.customRotationCron) {
        throw new Error("Custom rotation interval specified but no cron expression provided.");
    }

    // Create the SecretEntry for the policy
    const policySecretEntry: SecretEntry = {
        key: JSON.stringify(fullPolicy), // The policy JSON string is the value
        created: fullPolicy.createdAt, // Use createdAt from policy logic
        lastUpdated: fullPolicy.updatedAt, // Use updatedAt from policy logic
        tags: ["rotation_policy"], // Optional: tag to identify these secrets
        source: "api" // Changed from "SecretRotatorAgent" to allowed value
    };

    // VaultAgent.addSecret will handle creating/updating projects and categories if they don't exist.
    // It also handles setting created/lastUpdated on the SecretEntry itself if not provided, but we provide them here.
    this.vaultAgent.addSecret(POLICY_PROJECT, POLICY_CATEGORY, effectivePolicyId, policySecretEntry);
    await this.vaultAgent.saveVault();
    logger.info(`Policy ${effectivePolicyId} for ${fullPolicy.project}/${fullPolicy.category}/${fullPolicy.secretName} saved.`);
    return fullPolicy;
  }

  private getAllPoliciesFromVaultData(): RotationPolicy[] {
    const vaultData = (this.vaultAgent as unknown as { getVaultDataForTesting(): unknown }).getVaultDataForTesting(); 
    const projectPolicies = vaultData?.projects?.[POLICY_PROJECT]?.[POLICY_CATEGORY];
    if (!projectPolicies) return [];
    const policies: RotationPolicy[] = [];
    for (const id of Object.keys(projectPolicies)) {
        const secretEntry = projectPolicies[id]; 
        if (secretEntry && secretEntry.key) { 
            try { policies.push(JSON.parse(secretEntry.key) as RotationPolicy); } catch (e) { 
                logger.error(`Failed to parse policy ${id} in getAllPoliciesFromVaultData:`, e);
            }
        }
    }
    return policies;
  }

  public async getPolicy(policyId: string): Promise<RotationPolicy | null> {
    await this.vaultAgent.loadVault();
    const secretEntry = this.vaultAgent.getSecret(POLICY_PROJECT, POLICY_CATEGORY, policyId);
    if (secretEntry && secretEntry.key) { 
        try { return JSON.parse(secretEntry.key) as RotationPolicy; } catch (e) {
            logger.error(`Failed to parse policy ${policyId}:`, e); return null; }
    }
    logger.warn(`Policy with ID ${policyId} not found.`);
    return null;
  }

  public async getAllPolicies(): Promise<RotationPolicy[]> {
    await this.vaultAgent.loadVault();
    return this.getAllPoliciesFromVaultData();
  }
    
  public async deletePolicy(policyId: string): Promise<boolean> {
    await this.vaultAgent.loadVault();
    const existingSecretEntry = this.vaultAgent.getSecret(POLICY_PROJECT, POLICY_CATEGORY, policyId);
    if (!existingSecretEntry) {
      logger.warn(`Policy with ID ${policyId} not found for deletion.`); return false; }
    this.vaultAgent.deleteSecret(POLICY_PROJECT, POLICY_CATEGORY, policyId);
    await this.vaultAgent.saveVault();
    logger.info(`Policy ${policyId} deleted.`);
    return true;
  }

  // lastRotationDate is string | undefined because null from policy object is converted to undefined for this function
  private calculateNextRotationDate(interval: RotationInterval, cron?: string | null, lastRotationDate?: string | undefined): string {
    const startDate = lastRotationDate ? new Date(lastRotationDate) : new Date();
    if (interval === 'custom') {
        if (cron) {
            logger.warn("Custom cron schedule calculation not yet implemented. Returning date in 1 hour from start date.");
            startDate.setHours(startDate.getHours() + 1);
            return startDate.toISOString();
        } else {
            logger.warn("Custom interval chosen but no cron expression. Defaulting to 90 days from start date.");
            startDate.setDate(startDate.getDate() + 90);
            return startDate.toISOString();
        }
    }
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1), 10);
    if (isNaN(value)) { 
        logger.warn(`Invalid interval value: ${interval}. Defaulting to 30 days from start date.`);
        startDate.setDate(startDate.getDate() + 30);
        return startDate.toISOString();
    }
    switch (unit) {
        case 'd': startDate.setDate(startDate.getDate() + value); break;
        case 'w': startDate.setDate(startDate.getDate() + value * 7); break;
        case 'M': startDate.setMonth(startDate.getMonth() + value); break;
        case 'Y': startDate.setFullYear(startDate.getFullYear() + value); break;
        default: 
            logger.warn(`Unsupported interval unit: ${unit}. Defaulting to 30 days from start date.`);
            startDate.setDate(startDate.getDate() + 30);
    }
    return startDate.toISOString();
  }

  public async rotateSecret(policyId: string): Promise<boolean> {
    logger.info(`rotateSecret called for policy ID (placeholder): ${policyId}`);
    const policy = await this.getPolicy(policyId);
    if (!policy || !policy.isEnabled) {
      logger.warn(`Policy ${policyId} not found or not enabled.`);
      return false;
    }
    return false; 
  }

  private async generateNewSecretValue(strategy: RegenerationStrategy | string | undefined): Promise<string> {
    logger.info("generateNewSecretValue placeholder, strategy:", strategy);
    return `new_secret_${uuidv4()}`;
  }

  private async executeHooks(hooks: RotationHook[] | undefined, policy: RotationPolicy, timing: HookTiming, context?: unknown): Promise<void> {
    logger.info(`executeHooks placeholder for ${timing}`, { hooks, context });
  }

  private async sendNotifications(
    configs: RotationNotificationConfig[] | undefined,
    policy: RotationPolicy | null,
    status: "SUCCESS" | "FAILURE" | "REMINDER",
    details?: string
  ): Promise<void> {
    logger.info(`sendNotifications placeholder for status ${status}, details: ${details}, configs:`, configs);
  }
} 