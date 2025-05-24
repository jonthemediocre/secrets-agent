#!/usr/bin/env node
import path from 'path';
import { spawnSync } from 'child_process';
import { createLogger } from '../src/utils/logger';
import { VaultAgent } from '../vault/VaultAgent';

const logger = createLogger('RotateSecrets');

interface RotationPolicy {
  secretKey: string;
  intervalDays: number;
  lastRotated: string;
  nextRotation: string;
  enabled: boolean;
  rotationType: 'api_key' | 'password' | 'token' | 'manual';
}

interface RotationResult {
  secretKey: string;
  success: boolean;
  newValue?: string;
  error?: string;
  rotatedAt: string;
}

async function rotate(): Promise<void> {
  logger.info('Starting secrets rotation process');

  try {
    // Initialize vault agent
    const vaultAgent = new VaultAgent('./vault/secrets.sops.yaml');
    await vaultAgent.loadVault();
    
    // Get all projects and identify secrets that need rotation
    const vaultData = vaultAgent.getVaultDataForTesting();
    if (!vaultData) {
      throw new Error('Failed to load vault data');
    }
    
    const projects = vaultData.projects;
    const rotationResults: RotationResult[] = [];
    
    for (const project of projects) {
      logger.info('Checking project for rotation candidates', { project: project.name });
      
      for (const secret of project.secrets) {
        if (shouldRotateSecret(secret)) {
          logger.info('Rotating secret', { 
            project: project.name, 
            secretKey: secret.key,
            lastUpdated: secret.lastUpdated 
          });
          
          const result = await rotateSecret(secret, project.name);
          rotationResults.push(result);
          
          if (result.success && result.newValue) {
            // Update the secret in the vault
            await vaultAgent.updateSecret(project.name, secret.key, {
              value: result.newValue,
              tags: [...(secret.tags || []), 'auto_rotated']
            });
            
            logger.info('Secret rotated successfully', { 
              project: project.name,
              secretKey: secret.key 
            });
          } else {
            logger.error('Secret rotation failed', {
              project: project.name,
              secretKey: secret.key,
              error: result.error
            });
          }
        }
      }
    }
    
    // Save updated vault
    await vaultAgent.saveVault();
    
    // Generate rotation report
    const successfulRotations = rotationResults.filter(r => r.success);
    const failedRotations = rotationResults.filter(r => !r.success);
    
    logger.info('Rotation summary', {
      total: rotationResults.length,
      successful: successfulRotations.length,
      failed: failedRotations.length
    });
    
    if (failedRotations.length > 0) {
      logger.warn('Some rotations failed', {
        failed: failedRotations.map(r => ({ key: r.secretKey, error: r.error }))
      });
    }
  
    logger.info('Secret rotation completed');
    
  } catch (error) {
    logger.error('Rotation process failed', { error: String(error) });
    throw error;
  }
  
  // Re-run preflight to update templates post-rotation
  logger.info('Re-running preflight to update templates post-rotation');
  const scriptPath = path.join(__dirname, '../apps/api/agents/secrets/preflight.ts');
  const result = spawnSync('npx', ['ts-node', scriptPath], { stdio: 'inherit' });
  if (result.status !== 0) {
    logger.error('Preflight script failed', { exitCode: result.status });
    process.exit(1);
  }
}

function shouldRotateSecret(secret: any): boolean {
  // Check if secret has rotation metadata
  const rotationInterval = secret.metadata?.rotationIntervalDays || getDefaultRotationInterval(secret);
  
  if (!rotationInterval) {
    return false; // No rotation policy
  }
  
  const lastUpdated = new Date(secret.lastUpdated);
  const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceUpdate >= rotationInterval;
}

function getDefaultRotationInterval(secret: any): number | null {
  const key = secret.key.toUpperCase();
  
  // Default rotation intervals based on secret type
  if (key.includes('API_KEY')) return 90;  // API keys every 90 days
  if (key.includes('PASSWORD')) return 30; // Passwords every 30 days  
  if (key.includes('TOKEN')) return 60;    // Tokens every 60 days
  if (key.includes('JWT')) return 7;       // JWT secrets every 7 days
  if (key.includes('WEBHOOK')) return 120; // Webhooks every 120 days
  
  return null; // No automatic rotation
}

async function rotateSecret(secret: any, projectName: string): Promise<RotationResult> {
  const secretKey = secret.key;
  const rotatedAt = new Date().toISOString();
  
  try {
    // Determine rotation strategy based on secret type
    const secretType = categorizeSecret(secretKey);
    
    switch (secretType) {
      case 'api_key':
        return await rotateApiKey(secret, projectName, rotatedAt);
      
      case 'password':
        return await rotatePassword(secret, projectName, rotatedAt);
      
      case 'token':
        return await rotateToken(secret, projectName, rotatedAt);
        
      case 'jwt_secret':
        return await rotateJwtSecret(secret, projectName, rotatedAt);
        
      default:
        return {
          secretKey,
          success: false,
          error: `No rotation strategy for secret type: ${secretType}`,
          rotatedAt
        };
    }
    
  } catch (error) {
    return {
      secretKey,
      success: false,
      error: String(error),
      rotatedAt
    };
  }
}

function categorizeSecret(key: string): string {
  const upperKey = key.toUpperCase();
  
  if (upperKey.includes('API_KEY') || upperKey.includes('APIKEY')) return 'api_key';
  if (upperKey.includes('PASSWORD') || upperKey.includes('PASS')) return 'password';
  if (upperKey.includes('JWT')) return 'jwt_secret';
  if (upperKey.includes('TOKEN')) return 'token';
  
  return 'unknown';
}

async function rotateApiKey(secret: any, projectName: string, rotatedAt: string): Promise<RotationResult> {
  // For API keys, we typically need to:
  // 1. Generate a new key via the service's API
  // 2. Test the new key
  // 3. Replace the old key
  
  // This is a placeholder implementation - in practice, each service would need specific logic
  const newApiKey = generateSecureToken(32);
  
  logger.info('Generated new API key', { 
    project: projectName, 
    secretKey: secret.key,
    keyLength: newApiKey.length 
  });
  
  return {
    secretKey: secret.key,
    success: true,
    newValue: newApiKey,
    rotatedAt
  };
}

async function rotatePassword(secret: any, projectName: string, rotatedAt: string): Promise<RotationResult> {
  // Generate a new secure password
  const newPassword = generateSecurePassword(16);
  
  logger.info('Generated new password', { 
    project: projectName, 
    secretKey: secret.key 
  });
  
  return {
    secretKey: secret.key,
    success: true,
    newValue: newPassword,
    rotatedAt
  };
}

async function rotateToken(secret: any, projectName: string, rotatedAt: string): Promise<RotationResult> {
  // Generate a new secure token
  const newToken = generateSecureToken(64);
  
  logger.info('Generated new token', { 
    project: projectName, 
    secretKey: secret.key 
  });
  
  return {
    secretKey: secret.key,
    success: true,
    newValue: newToken,
    rotatedAt
  };
}

async function rotateJwtSecret(secret: any, projectName: string, rotatedAt: string): Promise<RotationResult> {
  // Generate a new JWT secret
  const newSecret = generateSecureToken(64);
  
  logger.info('Generated new JWT secret', { 
    project: projectName, 
    secretKey: secret.key 
  });
  
  return {
    secretKey: secret.key,
    success: true,
    newValue: newSecret,
    rotatedAt
  };
}

function generateSecureToken(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

function generateSecurePassword(length: number): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one character from each set
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Main execution
rotate().catch((error) => {
  logger.error('Secrets rotation failed', { error: String(error) });
  process.exit(1);
});