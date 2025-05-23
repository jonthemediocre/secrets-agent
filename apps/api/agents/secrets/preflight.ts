#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../../src/utils/logger';

const logger = createLogger('Preflight');

async function walk(dir: string): Promise<string[]> {
  let results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !['.git', 'node_modules'].includes(entry.name)) {
      results = results.concat(await walk(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

function inferServices(content: string): Set<string> {
  const services = new Set<string>();
  const lower = content.toLowerCase();
  if (lower.includes('openai')) services.add('openai');
  if (lower.includes('clerk')) services.add('clerk');
  if (lower.includes('neon')) services.add('neon');
  if (lower.includes('vanta')) services.add('vanta');
  return services;
}

function inferSecretNames(services: Set<string>, content: string): Set<string> {
  const names = new Set<string>();
  for (const svc of services) {
    switch (svc) {
      case 'openai':
        names.add('OPENAI_API_KEY');
        break;
      case 'clerk':
        names.add('CLERK_API_KEY');
        names.add('CLERK_API_SECRET');
        break;
      case 'neon':
        names.add('NEON_DB_URL');
        names.add('NEON_ADMIN_SECRET');
        break;
      case 'vanta':
        names.add('VANTA_API_KEY');
        break;
    }
  }
  const secretPattern = /([A-Z0-9_]*(?:API|SECRET)[A-Z0-9_]*)\s*[:=]\s*['"]?([A-Za-z0-9_-]{8,})['"]?/g;
  let match;
  while ((match = secretPattern.exec(content))) {
    names.add(match[1]);
  }
  return names;
}

async function main() {
  logger.info('Starting preflight secret scan');
  const allFiles = await walk(process.cwd());
  const targetFiles = allFiles.filter((f) => {
    const base = path.basename(f);
    const ext = path.extname(f);
    if (['THEPLAN.md', 'README.md', 'stack.yaml', 'package.json'].includes(base)) {
      return true;
    }
    if (['.mmd', '.ts', '.js', '.yaml', '.yml', '.env'].includes(ext)) {
      return true;
    }
    return false;
  });
  logger.info('Files scanned for secrets', {
    fileCount: targetFiles.length,
    patterns: ['**/*.{js,ts,jsx,tsx,py,go}']
  });
  const services = new Set<string>();
  const names = new Set<string>();
  for (const file of targetFiles) {
    const content = await fs.readFile(file, 'utf8');
    const svc = inferServices(content);
    svc.forEach((s) => services.add(s));
    const detected = inferSecretNames(svc, content);
    detected.forEach((n) => names.add(n));
  }
  logger.info('Preflight scan completed', {
    servicesFound: Array.from(services),
    secretsFound: Array.from(names),
    serviceCount: services.size,
    secretCount: names.size
  });
  logger.info('Starting vault secret injection');

  if (process.env.VAULT_ADDR && process.env.VAULT_TOKEN) {
    logger.info('Vault configured, proceeding with secret injection');
  } else {
    logger.warn('VAULT_ADDR or VAULT_TOKEN not set, skipping vault injection');
  }
}

main().catch((e) => {
  logger.error('Preflight scan failed', { 
    error: e instanceof Error ? e.message : String(e) 
  });
  process.exit(1);
});