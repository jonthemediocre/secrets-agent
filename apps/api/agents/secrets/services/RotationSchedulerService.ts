import { RotationPolicy, RotationInterval } from '../models/RotationPolicy';
import { createLogger } from '../../../../../src/utils/logger';
import * as cron from 'node-cron';
import { join } from 'path';
import { promises as fs } from 'fs';

const logger = createLogger('RotationSchedulerService');

/**
 * @conceptual
 * RotationSchedulerService
 * 
 * This service is responsible for:
 * - Loading and managing rotation policies.
 * - Scheduling the execution of secret rotations based on defined policies.
 * - Interacting with SecretRotatorAgent to perform the actual rotation.
 * - Logging rotation attempts and outcomes.
 */
export class RotationSchedulerService {
  private policies: RotationPolicy[] = [];
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();
  private policiesFilePath: string;

  constructor(policiesDir = './data/rotation-policies') {
    this.policiesFilePath = join(policiesDir, 'policies.json');
    this.ensureDataDirectory(policiesDir);
    this.loadPolicies();
    this.initializeScheduler();
  }

  /**
   * Ensure the data directory exists for storing policies
   */
  private async ensureDataDirectory(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create policies directory', { 
        dir, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Load rotation policies from persistent storage
   */
  private async loadPolicies(): Promise<void> {
    try {
      logger.info('[RotationSchedulerService] Loading rotation policies...');
      
      const data = await fs.readFile(this.policiesFilePath, 'utf-8');
      const policiesData = JSON.parse(data);
      
      if (Array.isArray(policiesData)) {
        this.policies = policiesData;
        logger.info(`[RotationSchedulerService] Loaded ${this.policies.length} policies`);
      } else {
        logger.warn('[RotationSchedulerService] Invalid policies file format, starting with empty policies');
        this.policies = [];
      }
      
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info('[RotationSchedulerService] No existing policies file found, starting with empty policies');
        this.policies = [];
      } else {
        logger.error('[RotationSchedulerService] Failed to load policies', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        this.policies = [];
      }
    }
  }

  /**
   * Persist current policies to storage
   */
  private async savePolicies(): Promise<void> {
    try {
      await fs.writeFile(this.policiesFilePath, JSON.stringify(this.policies, null, 2));
      logger.debug('[RotationSchedulerService] Policies saved successfully');
    } catch (error) {
      logger.error('[RotationSchedulerService] Failed to save policies', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Initialize scheduler by setting up cron jobs for all enabled policies
   */
  private initializeScheduler(): void {
    logger.info('[RotationSchedulerService] Initializing scheduler...');
    
    const enabledPolicies = this.policies.filter(policy => policy.isEnabled);
    enabledPolicies.forEach(policy => {
      this.scheduleRotation(policy);
    });
    
    logger.info(`[RotationSchedulerService] Initialized scheduler with ${enabledPolicies.length} active policies`);
  }

  /**
   * Convert rotation interval to cron expression
   */
  private intervalToCron(interval: RotationInterval, customCron?: string): string {
    if (customCron) {
      return customCron;
    }

    switch (interval) {
      case 'DAILY':
        return '0 2 * * *'; // 2 AM daily
      case 'WEEKLY':
        return '0 2 * * 0'; // 2 AM every Sunday
      case 'MONTHLY':
        return '0 2 1 * *'; // 2 AM on 1st of each month
      case 'QUARTERLY':
        return '0 2 1 */3 *'; // 2 AM on 1st of every 3rd month
      case 'ANNUALLY':
        return '0 2 1 1 *'; // 2 AM on January 1st
      case 'custom':
        return customCron || '0 2 * * *'; // Fallback to daily
      default:
        // Handle duration strings like "7d", "30d"
        if (typeof interval === 'string' && interval.endsWith('d')) {
          const days = parseInt(interval.slice(0, -1));
          if (!isNaN(days) && days > 0) {
            return `0 2 */${days} * *`; // Every N days at 2 AM
          }
        }
        logger.warn(`[RotationSchedulerService] Unknown interval: ${interval}, using daily default`);
        return '0 2 * * *'; // Default to daily
    }
  }

  /**
   * Schedule rotation for a specific policy
   */
  public scheduleRotation(policy: RotationPolicy): void {
    if (!policy.isEnabled) {
      logger.debug(`[RotationSchedulerService] Skipping disabled policy: ${policy.id}`);
      return;
    }

    // Unschedule existing job if it exists
    const existingJob = this.scheduledJobs.get(policy.id);
    if (existingJob) {
      existingJob.stop();
      this.scheduledJobs.delete(policy.id);
    }

    try {
      const cronExpression = this.intervalToCron(
        policy.rotationInterval, 
        policy.customRotationCron
      );

      logger.info(`[RotationSchedulerService] Scheduling rotation for policy: ${policy.id}`, {
        secretName: policy.secretName,
        project: policy.project,
        category: policy.category,
        interval: policy.rotationInterval,
        cronExpression
      });

      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

            const scheduledTask = cron.schedule(cronExpression, async () => {        logger.info(`[RotationSchedulerService] Triggered rotation for policy: ${policy.id}`);        await this.executeRotation(policy.id);      });

      this.scheduledJobs.set(policy.id, scheduledTask);
      logger.info(`[RotationSchedulerService] Successfully scheduled policy: ${policy.id}`);

    } catch (error) {
      logger.error(`[RotationSchedulerService] Failed to schedule policy: ${policy.id}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Execute rotation for a specific policy
   */
  public async executeRotation(policyId: string): Promise<void> {
    const policy = this.policies.find(p => p.id === policyId);
    if (!policy) {
      logger.error(`[RotationSchedulerService] Policy not found: ${policyId}`);
      return;
    }

    if (!policy.isEnabled) {
      logger.warn(`[RotationSchedulerService] Attempted to rotate disabled policy: ${policyId}`);
      return;
    }

    logger.info(`[RotationSchedulerService] Executing rotation for policy: ${policy.id}`, {
      secretName: policy.secretName,
      project: policy.project,
      category: policy.category
    });

    try {
      // Find secrets matching this policy's criteria
      const secretsToRotate = await this.findSecretsForPolicy(policy);
      
      if (secretsToRotate.length === 0) {
        logger.warn(`[RotationSchedulerService] No secrets found for policy: ${policy.id}`);
        return;
      }

      // Execute rotation for each matching secret
      for (const secret of secretsToRotate) {
        try {
          // Note: In actual implementation, this would call SecretRotatorAgent
          // await this.secretRotatorAgent.rotateSecret(secret.id, policy);
          logger.info(`[RotationSchedulerService] Would rotate secret: ${secret.key}`, {
            policyId: policy.id,
            secretKey: secret.key
          });
        } catch (secretError) {
          logger.error(`[RotationSchedulerService] Failed to rotate secret: ${secret.key}`, {
            policyId: policy.id,
            error: secretError instanceof Error ? secretError.message : String(secretError)
          });
        }
      }

      // Update last rotation date
      policy.lastRotationDate = new Date().toISOString();
      policy.updatedAt = new Date().toISOString();
      
      // Calculate next rotation date
      policy.nextRotationDate = this.calculateNextRotationDate(policy);
      
      await this.savePolicies();
      
      logger.info(`[RotationSchedulerService] Rotation completed for policy: ${policy.id}`, {
        rotatedSecrets: secretsToRotate.length,
        nextRotation: policy.nextRotationDate
      });

    } catch (error) {
      logger.error(`[RotationSchedulerService] Error during rotation for policy ${policy.id}:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Note: In production, this would trigger notification hooks
      // await this.sendFailureNotifications(policy, error);
    }
  }

  /**
   * Find secrets that match a policy's criteria
   */
  private async findSecretsForPolicy(policy: RotationPolicy): Promise<Array<{ key: string; value: string; project: string; category?: string }>> {
    logger.info(`[RotationSchedulerService] Finding secrets for policy: ${policy.id}`, {
      secretName: policy.secretName,
      project: policy.project,
      category: policy.category
    });

    // Note: In actual implementation, this would query VaultAgent
    // For now, return mock matching logic
    const mockSecrets = [
      { 
        key: policy.secretName, 
        value: 'placeholder-value', 
        project: policy.project, 
        category: policy.category 
      }
    ];

    // Filter based on policy criteria
    const matchingSecrets = mockSecrets.filter(secret => {
      const projectMatches = secret.project === policy.project;
      const nameMatches = secret.key === policy.secretName;
      const categoryMatches = !policy.category || secret.category === policy.category;
      
      return projectMatches && nameMatches && categoryMatches;
    });

    logger.debug(`[RotationSchedulerService] Found ${matchingSecrets.length} matching secrets`, {
      policyId: policy.id,
      matchingKeys: matchingSecrets.map(s => s.key)
    });

    return matchingSecrets;
  }

  /**
   * Calculate next rotation date based on policy interval
   */
  private calculateNextRotationDate(policy: RotationPolicy): string {
    const now = new Date();
    const nextDate = new Date(now);

    switch (policy.rotationInterval) {
      case 'DAILY':
        nextDate.setDate(now.getDate() + 1);
        break;
      case 'WEEKLY':
        nextDate.setDate(now.getDate() + 7);
        break;
      case 'MONTHLY':
        nextDate.setMonth(now.getMonth() + 1);
        break;
      case 'QUARTERLY':
        nextDate.setMonth(now.getMonth() + 3);
        break;
      case 'ANNUALLY':
        nextDate.setFullYear(now.getFullYear() + 1);
        break;
      default:
        // Handle duration strings like "7d", "30d"
        if (typeof policy.rotationInterval === 'string' && policy.rotationInterval.endsWith('d')) {
          const days = parseInt(policy.rotationInterval.slice(0, -1));
          if (!isNaN(days) && days > 0) {
            nextDate.setDate(now.getDate() + days);
          } else {
            nextDate.setDate(now.getDate() + 1); // Default to daily
          }
        } else {
          nextDate.setDate(now.getDate() + 1); // Default to daily
        }
    }

    return nextDate.toISOString();
  }

  /**
   * Add a new policy and schedule it
   */
  public async addPolicy(policy: RotationPolicy): Promise<void> {
    // Validate policy
    if (!policy.id || !policy.secretName || !policy.project) {
      throw new Error('Policy must have id, secretName, and project');
    }

    // Check for duplicate IDs
    if (this.policies.some(p => p.id === policy.id)) {
      throw new Error(`Policy with ID ${policy.id} already exists`);
    }

    // Set timestamps
    const now = new Date().toISOString();
    policy.createdAt = policy.createdAt || now;
    policy.updatedAt = now;
    policy.nextRotationDate = policy.nextRotationDate || this.calculateNextRotationDate(policy);

    this.policies.push(policy);
    await this.savePolicies();
    
    if (policy.isEnabled) {
      this.scheduleRotation(policy);
    }
    
    logger.info(`[RotationSchedulerService] Added new policy: ${policy.id}`, {
      secretName: policy.secretName,
      project: policy.project,
      enabled: policy.isEnabled
    });
  }

  /**
   * Remove a policy and unschedule it
   */
  public async removePolicy(policyId: string): Promise<void> {
    const policyIndex = this.policies.findIndex(p => p.id === policyId);
    if (policyIndex === -1) {
      throw new Error(`Policy with ID ${policyId} not found`);
    }

    // Unschedule the job
    const scheduledJob = this.scheduledJobs.get(policyId);
    if (scheduledJob) {
      scheduledJob.stop();
      this.scheduledJobs.delete(policyId);
    }

    // Remove from policies
    this.policies.splice(policyIndex, 1);
    await this.savePolicies();
    
    logger.info(`[RotationSchedulerService] Removed policy: ${policyId}`);
  }

  /**
   * Update an existing policy
   */
  public async updatePolicy(policyId: string, updates: Partial<RotationPolicy>): Promise<void> {
    const policy = this.policies.find(p => p.id === policyId);
    if (!policy) {
      throw new Error(`Policy with ID ${policyId} not found`);
    }

    // Apply updates
    Object.assign(policy, updates);
    policy.updatedAt = new Date().toISOString();
    
    // Recalculate next rotation if interval changed
    if (updates.rotationInterval || updates.customRotationCron) {
      policy.nextRotationDate = this.calculateNextRotationDate(policy);
    }

    await this.savePolicies();
    
    // Reschedule if enabled
    if (policy.isEnabled) {
      this.scheduleRotation(policy);
    } else {
      // Unschedule if disabled
      const scheduledJob = this.scheduledJobs.get(policyId);
      if (scheduledJob) {
        scheduledJob.stop();
        this.scheduledJobs.delete(policyId);
      }
    }
    
    logger.info(`[RotationSchedulerService] Updated policy: ${policyId}`, {
      enabled: policy.isEnabled,
      nextRotation: policy.nextRotationDate
    });
  }

  /**
   * Get a specific policy
   */
  public getPolicy(policyId: string): RotationPolicy | undefined {
    return this.policies.find(p => p.id === policyId);
  }

  /**
   * List all policies
   */
  public listPolicies(): RotationPolicy[] {
    return [...this.policies]; // Return a copy to prevent external mutation
  }

  /**
   * Get policies for a specific project
   */
  public getPoliciesForProject(project: string): RotationPolicy[] {
    return this.policies.filter(p => p.project === project);
  }

  /**
   * Get policies that are due for rotation
   */
  public getPoliciesDueForRotation(): RotationPolicy[] {
    const now = new Date();
    return this.policies.filter(policy => {
      if (!policy.isEnabled || !policy.nextRotationDate) {
        return false;
      }
      return new Date(policy.nextRotationDate) <= now;
    });
  }

  /**
   * Manually trigger rotation for a specific policy (bypasses schedule)
   */
  public async triggerRotationNow(policyId: string): Promise<void> {
    logger.info(`[RotationSchedulerService] Manual rotation trigger for policy: ${policyId}`);
    await this.executeRotation(policyId);
  }

  /**
   * Shutdown the scheduler and cleanup
   */
  public shutdown(): void {
    logger.info('[RotationSchedulerService] Shutting down scheduler...');
    
        // Stop all scheduled jobs    this.scheduledJobs.forEach((job, policyId) => {      job.stop();      logger.debug(`[RotationSchedulerService] Stopped job for policy: ${policyId}`);    });
    
    this.scheduledJobs.clear();
    logger.info('[RotationSchedulerService] Scheduler shutdown complete');
  }
}

// Example Usage (conceptual - would be part of VantaMasterCore or a dedicated service manager)
// const rotatorAgent = new SecretRotatorAgent(/* ... */);
// const scheduler = new RotationSchedulerService(rotatorAgent);
// scheduler.addPolicy(new RotationPolicy('example-policy', 'api-keys', 'customCron', { cronExpression: '0 3 * * MON' })); 