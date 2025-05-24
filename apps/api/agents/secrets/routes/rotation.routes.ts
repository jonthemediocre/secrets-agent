/**
 * Production-ready API Endpoints for Secret Rotation Management
 *
 * These routes integrate with SecretRotatorAgent and RotationSchedulerService
 * to provide complete rotation policy management and manual rotation triggers.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { RotationPolicy } from '../models/RotationPolicy';
import { SecretRotatorAgent } from '../SecretRotatorAgent';
import { RotationSchedulerService } from '../services/RotationSchedulerService';
import { VaultAgent } from '../../../../../vault/VaultAgent';
import { createLogger } from '../../../../../src/utils/logger';

const logger = createLogger('RotationRoutes');
const router = Router();

// Initialize the agents
const vaultAgent = new VaultAgent('./vault/secrets.sops.yaml');
const secretRotatorAgent = new SecretRotatorAgent(vaultAgent);
const rotationScheduler = new RotationSchedulerService('./data/rotation-policies');

// Middleware to ensure agents are ready
async function ensureServicesReady(req: Request, res: Response, next: NextFunction) {
  try {
    await vaultAgent.loadVault();
    next();
  } catch (err) {
    const error = err as Error;
    logger.error('Service initialization failed', { error: error.message });
    res.status(500).json({ error: 'Service initialization failed', details: error.message });
  }
}

// Validation middleware for policy data
const validatePolicyData = (req: Request, res: Response, next: NextFunction): void => {
  const { secretName, project, category } = req.body;
  
  if (!secretName || typeof secretName !== 'string') {
    res.status(400).json({ error: 'secretName is required and must be a string' });
    return;
  }
  
  if (!project || typeof project !== 'string') {
    res.status(400).json({ error: 'project is required and must be a string' });
    return;
  }
  
  if (!category || typeof category !== 'string') {
    res.status(400).json({ error: 'category is required and must be a string' });
    return;
  }
  
  next();
};

/**
 * GET /policies
 * List all rotation policies
 */
router.get('/policies', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  try {
    const { project, enabled } = req.query;
    
    logger.info('Retrieving rotation policies', { project, enabled });
    
    let policies = await secretRotatorAgent.getAllPolicies();
    
    // Filter by project if specified
    if (project && typeof project === 'string') {
      policies = policies.filter(p => p.project === project);
    }
    
    // Filter by enabled status if specified
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      policies = policies.filter(p => p.isEnabled === isEnabled);
    }
    
    res.json({ 
      policies,
      count: policies.length,
      filters: { project, enabled }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error retrieving rotation policies:', { error: errorMessage });
    res.status(500).json({ 
      error: 'Failed to retrieve rotation policies',
      details: errorMessage 
    });
  }
});

/**
 * POST /policies
 * Create or update a rotation policy
 */
router.post('/policies', ensureServicesReady, validatePolicyData, async (req: Request, res: Response): Promise<void> => {
  const policyData = req.body as RotationPolicy;
  try {
    logger.info('Creating/updating rotation policy', { 
      secretName: policyData.secretName, 
      project: policyData.project,
      policyId: policyData.policyId 
    });
    
    const savedPolicy = await secretRotatorAgent.savePolicy(policyData);
    
    // Add to scheduler if enabled
    if (savedPolicy.isEnabled) {
      await rotationScheduler.addPolicy(savedPolicy);
    }
    
    res.status(201).json({
      message: 'Rotation policy created/updated successfully',
      policy: savedPolicy
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error creating/updating rotation policy:', { error: errorMessage });
    res.status(500).json({ 
      error: 'Failed to create/update rotation policy',
      details: errorMessage 
    });
  }
});

/**
 * GET /policies/:policyId
 * Retrieve a specific rotation policy
 */
router.get('/policies/:policyId', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  const { policyId } = req.params;
  try {
    logger.info('Retrieving rotation policy', { policyId });
    
    const policy = await secretRotatorAgent.getPolicy(policyId);
    
    if (!policy) {
      res.status(404).json({ error: 'Rotation policy not found' });
      return;
    }
    
    res.json({ policy });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error retrieving rotation policy:', { error: errorMessage });
    res.status(500).json({ 
      error: 'Failed to retrieve rotation policy',
      details: errorMessage 
    });
  }
});

/**
 * PUT /policies/:policyId
 * Update a specific rotation policy
 */
router.put('/policies/:policyId', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  const { policyId } = req.params;
  const updates = req.body;
  
  try {
    logger.info('Updating rotation policy', { policyId, updates: Object.keys(updates) });
    
    // Get existing policy
    const existingPolicy = await secretRotatorAgent.getPolicy(policyId);
    if (!existingPolicy) {
      res.status(404).json({ error: 'Rotation policy not found' });
      return;
    }
    
    // Merge updates with existing policy
    const updatedPolicyData = { ...existingPolicy, ...updates, policyId };
    const savedPolicy = await secretRotatorAgent.savePolicy(updatedPolicyData);
    
    // Update scheduler
    await rotationScheduler.updatePolicy(policyId, updates);
    
    res.json({
      message: 'Rotation policy updated successfully',
      policy: savedPolicy
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error updating rotation policy:', { error: errorMessage });
    res.status(500).json({ 
      error: 'Failed to update rotation policy',
      details: errorMessage 
    });
  }
});

/**
 * DELETE /policies/:policyId
 * Delete a rotation policy
 */
router.delete('/policies/:policyId', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  const { policyId } = req.params;
  try {
    logger.info('Deleting rotation policy', { policyId });
    
    const deleted = await secretRotatorAgent.deletePolicy(policyId);
    
    if (!deleted) {
      res.status(404).json({ error: 'Rotation policy not found' });
      return;
    }
    
    // Remove from scheduler
    await rotationScheduler.removePolicy(policyId);
    
    res.json({ message: 'Rotation policy deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error deleting rotation policy:', { error: errorMessage });
    res.status(500).json({ 
      error: 'Failed to delete rotation policy',
      details: errorMessage 
    });
  }
});

/**
 * POST /policies/:policyId/enable
 * Enable a rotation policy
 */
router.post('/policies/:policyId/enable', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  const { policyId } = req.params;
  try {
    logger.info('Enabling rotation policy', { policyId });
    
    await rotationScheduler.updatePolicy(policyId, { isEnabled: true });
    
    res.json({ message: 'Rotation policy enabled successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error enabling rotation policy:', { error: errorMessage });
    res.status(500).json({ 
      error: 'Failed to enable rotation policy',
      details: errorMessage 
    });
  }
});

/**
 * POST /policies/:policyId/disable
 * Disable a rotation policy
 */
router.post('/policies/:policyId/disable', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  const { policyId } = req.params;
  try {
    logger.info('Disabling rotation policy', { policyId });
    
    await rotationScheduler.updatePolicy(policyId, { isEnabled: false });
    
    res.json({ message: 'Rotation policy disabled successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error disabling rotation policy:', { error: errorMessage });
    res.status(500).json({ 
      error: 'Failed to disable rotation policy',
      details: errorMessage 
    });
  }
});

/**
 * POST /rotate/:policyId
 * Manually trigger rotation for a specific policy
 */
router.post('/rotate/:policyId', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  const { policyId } = req.params;
  try {
    logger.info('Manually triggering rotation by policy ID', { policyId });
    
    const rotated = await secretRotatorAgent.rotateSecret(policyId);
    
    if (!rotated) {
      res.status(404).json({ error: 'Secret rotation failed - policy not found or not enabled' });
      return;
    }
    
    await vaultAgent.saveVault();
    
    res.json({ message: 'Secret rotation completed successfully', policyId });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error during manual secret rotation:', { error: errorMessage });
    res.status(500).json({ 
      error: 'Failed to rotate secret',
      details: errorMessage 
    });
  }
});

/**
 * POST /secrets/:secretName/rotate
 * Manually trigger rotation for a specific secret by name
 */
router.post('/secrets/:secretName/rotate', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  const { secretName } = req.params;
  const { project, category } = req.body;
  
  if (!project) {
    res.status(400).json({ error: 'project is required in request body' });
    return;
  }
  
  try {
    logger.info('Triggering secret rotation by secret name', { secretName, project, category });
    
    // Find the policy for this secret
    const allPolicies = await secretRotatorAgent.getAllPolicies();
    const matchingPolicy = allPolicies.find(policy => 
      policy.secretName === secretName && 
      policy.project === project &&
      (!category || policy.category === category)
    );
    
    if (!matchingPolicy) {
      res.status(404).json({ 
        error: 'No rotation policy found for this secret',
        details: `No policy found for secret '${secretName}' in project '${project}'${category ? ` with category '${category}'` : ''}`
      });
      return;
    }
    
    if (!matchingPolicy.isEnabled) {
      res.status(400).json({ 
        error: 'Rotation policy is disabled',
        details: `Policy '${matchingPolicy.policyId}' for secret '${secretName}' is currently disabled`
      });
      return;
    }
    
    // Trigger rotation using the policy ID
    const rotationResult = await secretRotatorAgent.rotateSecret(matchingPolicy.policyId);
    await vaultAgent.saveVault();
    
    if (!rotationResult) {
      res.status(500).json({ 
        error: 'Secret rotation failed',
        details: 'Rotation process completed but returned false'
      });
      return;
    }
    
    res.json({ 
      message: `Rotation completed successfully for secret '${secretName}'`,
      policyId: matchingPolicy.policyId,
      nextRotation: matchingPolicy.nextRotationDate
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error triggering secret rotation:', { error: errorMessage, secretName, project, category });
    res.status(500).json({ 
      error: `Failed to trigger rotation for secret '${secretName}'`, 
      details: errorMessage 
    });
  }
});

/**
 * GET /scheduler/status
 * Get rotation scheduler status and upcoming rotations
 */
router.get('/scheduler/status', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Retrieving scheduler status');
    
    const allPolicies = rotationScheduler.listPolicies();
    const enabledPolicies = allPolicies.filter(p => p.isEnabled);
    const duePolicies = rotationScheduler.getPoliciesDueForRotation();
    
    res.json({
      status: 'active',
      totalPolicies: allPolicies.length,
      enabledPolicies: enabledPolicies.length,
      duePolicies: duePolicies.length,
      upcomingRotations: duePolicies.map(p => ({
        policyId: p.policyId,
        secretName: p.secretName,
        project: p.project,
        nextRotation: p.nextRotationDate
      }))
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error retrieving scheduler status:', { error: errorMessage });
    res.status(500).json({ 
      error: 'Failed to retrieve scheduler status',
      details: errorMessage 
    });
  }
});

/**
 * POST /scheduler/trigger-due
 * Manually trigger all due rotations
 */
router.post('/scheduler/trigger-due', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Manually triggering all due rotations');
    
    const duePolicies = rotationScheduler.getPoliciesDueForRotation();
    const results = [];
    
    for (const policy of duePolicies) {
      try {
        const rotated = await secretRotatorAgent.rotateSecret(policy.policyId);
        results.push({
          policyId: policy.policyId,
          secretName: policy.secretName,
          success: rotated
        });
      } catch (error) {
        results.push({
          policyId: policy.policyId,
          secretName: policy.secretName,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    await vaultAgent.saveVault();
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    res.json({
      message: `Processed ${results.length} due rotations`,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      },
      results
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error triggering due rotations:', { error: errorMessage });
    res.status(500).json({ 
      error: 'Failed to trigger due rotations',
      details: errorMessage 
    });
  }
});

export default router; 