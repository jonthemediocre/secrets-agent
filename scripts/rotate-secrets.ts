#!/usr/bin/env node
import path from 'path';
import { spawnSync } from 'child_process';
import { createLogger } from '../src/utils/logger';

const logger = createLogger('RotateSecrets');

async function rotate() {
  if (!process.env.VAULT_ADDR || !process.env.VAULT_TOKEN) {
    logger.error('VAULT_ADDR and VAULT_TOKEN must be set');
    process.exit(1);
  }
  // TODO: Implement actual rotation logic
  // const _vault = Vault({ endpoint: process.env.VAULT_ADDR, token: process.env.VAULT_TOKEN });
  
  logger.info('Secret rotation completed (placeholder)');
  logger.info('Re-running preflight to update templates post-rotation');
  const scriptPath = path.join(__dirname, '../apps/api/agents/secrets/preflight.ts');
  const result = spawnSync('npx', ['ts-node', scriptPath], { stdio: 'inherit' });
  if (result.status !== 0) {
    logger.error('Preflight script failed', { exitCode: result.status });
    process.exit(1);
  }
}

rotate().catch((error) => {
  logger.error('Secrets rotation failed', { error });
  process.exit(1);
});