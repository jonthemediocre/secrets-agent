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

    // Ensure system project exists
    let systemProject = await this.vaultAgent.getProject(POLICY_PROJECT);
    if (!systemProject) {
      systemProject = await this.vaultAgent.createProject(POLICY_PROJECT, 'System policies and configurations');
    }

    if (policyIdToUse) {
      const existingSecret = systemProject.secrets.find(s => s.key === policyIdToUse);
      if (existingSecret && existingSecret.value) {
        try { 
          existingPolicyObject = JSON.parse(existingSecret.value) as RotationPolicy; 
        } catch (e) { 
          logger.error(`Parse error for existing policy ${policyIdToUse}`, { error: e instanceof Error ? e.message : String(e) });
        }
      }
    } else { 
      const allPolicies = await this.getAllPolicies();
      const matchedPolicy = allPolicies.find(p => 
        p.project === policyData.project && p.category === policyData.category && p.secretName === policyData.secretName 
      );
      if (matchedPolicy) {
        existingPolicyObject = matchedPolicy;
        policyIdToUse = matchedPolicy.policyId; 
        logger.info(`Found existing policy by content match: ${policyIdToUse}. Treating as update.`);
      }
    }

    const effectivePolicyId = policyIdToUse || uuidv4();
    
    const currentRotationInterval = policyData.rotationInterval || existingPolicyObject?.rotationInterval || "30d" as RotationInterval;
    const currentCustomCron = policyData.customRotationCron !== undefined ? policyData.customRotationCron : existingPolicyObject?.customRotationCron;
    const lastRotationForCalc = existingPolicyObject?.lastRotationDate || undefined;

    const fullPolicy: RotationPolicy = {
      policyId: effectivePolicyId,
      id: effectivePolicyId,
      secretName: policyData.secretName!,
      project: policyData.project!,
      category: policyData.category!,
      isEnabled: policyData.isEnabled !== undefined ? policyData.isEnabled : (existingPolicyObject?.isEnabled || false),
      rotationInterval: currentRotationInterval,
      customRotationCron: currentCustomCron,
      regenerationStrategy: policyData.regenerationStrategy || existingPolicyObject?.regenerationStrategy || { type: 'alphanumeric', details: {length: 32} },
      versioningEnabled: policyData.versioningEnabled !== undefined ? policyData.versioningEnabled : (existingPolicyObject?.versioningEnabled || false),
      notifications: policyData.notifications || existingPolicyObject?.notifications || [],
      hooks: policyData.hooks || existingPolicyObject?.hooks || [],
      createdBy: existingPolicyObject?.createdBy || 'system', 
      createdAt: existingPolicyObject?.createdAt || now, 
      updatedAt: now,
      lastRotationDate: lastRotationForCalc,
      nextRotationDate: this.calculateNextRotationDate(currentRotationInterval, currentCustomCron, lastRotationForCalc),
    };
        
    if (fullPolicy.rotationInterval === 'custom' && !fullPolicy.customRotationCron) {
      throw new Error("Custom rotation interval specified but no cron expression provided.");
    }

    const policySecretEntry: Omit<SecretEntry, 'created' | 'lastUpdated'> = {
      key: effectivePolicyId,
      value: JSON.stringify(fullPolicy),
      description: `Rotation policy for ${fullPolicy.project}/${fullPolicy.category}/${fullPolicy.secretName}`,
      category: 'rotation_policies',
      tags: ["rotation_policy"],
      source: "api"
    };

    const existingSecret = systemProject.secrets.find(s => s.key === effectivePolicyId);
    if (existingSecret) {
      await this.vaultAgent.updateSecret(POLICY_PROJECT, effectivePolicyId, policySecretEntry);
    } else {
      await this.vaultAgent.addSecret(POLICY_PROJECT, policySecretEntry);
    }

    logger.info(`Policy ${effectivePolicyId} for ${fullPolicy.project}/${fullPolicy.category}/${fullPolicy.secretName} saved.`);
    return fullPolicy;
  }

  public async getPolicy(policyId: string): Promise<RotationPolicy | null> {
    const systemProject = await this.vaultAgent.getProject(POLICY_PROJECT);
    if (!systemProject) {
      return null;
    }

    const secret = systemProject.secrets.find(s => s.key === policyId && s.category === 'rotation_policies');
    if (secret && secret.value) { 
      try { 
        return JSON.parse(secret.value) as RotationPolicy; 
      } catch (e) {
        logger.error(`Failed to parse policy ${policyId}`, { error: e instanceof Error ? e.message : String(e) }); 
        return null; 
      }
    }
    logger.warn(`Policy with ID ${policyId} not found.`);
    return null;
  }

  public async getAllPolicies(): Promise<RotationPolicy[]> {
    const systemProject = await this.vaultAgent.getProject(POLICY_PROJECT);
    if (!systemProject) {
      return [];
    }

    const policies: RotationPolicy[] = [];
    const policySecrets = systemProject.secrets.filter(s => s.category === 'rotation_policies');
    
    for (const secret of policySecrets) {
      if (secret.value) { 
        try { 
          policies.push(JSON.parse(secret.value) as RotationPolicy); 
        } catch (e) { 
          logger.error(`Failed to parse policy ${secret.key}`, { error: e instanceof Error ? e.message : String(e) });
        }
      }
    }
    return policies;
  }
    
  public async deletePolicy(policyId: string): Promise<boolean> {
    const systemProject = await this.vaultAgent.getProject(POLICY_PROJECT);
    if (!systemProject) {
      logger.warn(`System project not found for policy deletion: ${policyId}`); 
      return false; 
    }

    const existingSecret = systemProject.secrets.find(s => s.key === policyId && s.category === 'rotation_policies');
    if (!existingSecret) {
      logger.warn(`Policy with ID ${policyId} not found for deletion.`); 
      return false; 
    }

    await this.vaultAgent.deleteSecret(POLICY_PROJECT, policyId);
    logger.info(`Policy ${policyId} deleted.`);
    return true;
  }

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
    logger.info(`rotateSecret called for policy ID (placeholder)`, { policyId });
    const policy = await this.getPolicy(policyId);
    if (!policy || !policy.isEnabled) {
      logger.warn(`Policy ${policyId} not found or not enabled.`);
      return false;
    }
    return false; 
  }

  private async generateNewSecretValue(strategy: RegenerationStrategy | string | undefined): Promise<string> {
    logger.info("generateNewSecretValue placeholder", { strategy: typeof strategy === 'string' ? strategy : strategy?.type });
    return `new_secret_${uuidv4()}`;
  }

  private async executeHooks(hooks: RotationHook[] | undefined, policy: RotationPolicy, timing: HookTiming, context?: unknown): Promise<void> {
    logger.info(`executeHooks placeholder for ${timing}`, { 
      hooksCount: hooks?.length || 0, 
      policyId: policy.policyId,
      contextType: typeof context
    });
  }

  private async sendNotifications(
    configs: RotationNotificationConfig[] | undefined,
    policy: RotationPolicy | null,
    status: "SUCCESS" | "FAILURE" | "REMINDER",
    details?: string
  ): Promise<void> {
    logger.info(`sendNotifications placeholder`, { 
      status, 
      details, 
      configsCount: configs?.length || 0,
      policyId: policy?.policyId
    });
  }
} 