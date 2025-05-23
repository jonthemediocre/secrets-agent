import express, { Request, Response, NextFunction } from 'express';
// import { Router } from 'express'; // TODO: Implement when needed
// NOTE: If you get a type error here, run: npm i --save-dev @types/express
// NOTE: Adjust the import path below if your build cannot resolve it:
import { VaultAgent } from '../../../../../vault/VaultAgent'; 
// import { parseEnvFile, serializeEnvFile } from '~/src/utils/EnvFileParser'; // TODO: Implement when needed
// import fs from 'fs'; // Not used
// TODO: Implement env file management routes

const router = express.Router();

// TODO: Adjust vault path as needed for your deployment
const vaultPath = process.env.VAULT_PATH || './vault/secrets.sops.yaml';
const vaultAgent = new VaultAgent(vaultPath);

// Ensure vault is loaded before handling requests
async function ensureVaultLoaded(req: Request, res: Response, next: NextFunction) {
  try {
    await vaultAgent.loadVault();
    next();
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: 'Failed to load vault', details: error.message });
  }
}

/**
 * POST /env/import
 * Body: { envContent: string, options?: { project, category, overwrite } }
 * Imports .env file content into the vault.
 */
router.post('/import', ensureVaultLoaded, async (req: Request, res: Response): Promise<void> => {
  const { envContent, options } = req.body;
  if (!envContent || typeof envContent !== 'string') {
    res.status(400).json({ error: 'envContent (string) is required' });
    return;
  }
  try {
    const result = vaultAgent.importEnvToVault(envContent, options);
    await vaultAgent.saveVault();
    res.json({ success: true, ...result });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: 'Import failed', details: error.message });
  }
});

/**
 * GET /env/export
 * Query: project, category
 * Exports .env file content from the vault.
 */
router.get('/export', ensureVaultLoaded, async (req: Request, res: Response): Promise<void> => {
  const { project, category } = req.query;
  try {
    const envString = vaultAgent.exportEnvFromVault({ project: project as string, category: category as string });
    res.setHeader('Content-Type', 'text/plain');
    res.send(envString);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: 'Export failed', details: error.message });
  }
});

export default router;
// NOTE: Register this router in your main API (e.g., app.use('/api/env', router)); 