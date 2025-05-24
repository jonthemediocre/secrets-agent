import express, { Request, Response, NextFunction } from 'express';
import { VaultAgent } from '../../../../../vault/VaultAgent'; 
import { AgentBridgeService } from '../../../../../src/services/AgentBridgeService';
import { createLogger } from '../../../../../src/utils/logger';
import { promises as fs } from 'fs';
import { join } from 'path';

const logger = createLogger('EnvRoutes');
const router = express.Router();

// Initialize services
const vaultPath = process.env.VAULT_PATH || './vault/secrets.sops.yaml';
const vaultAgent = new VaultAgent(vaultPath);
const agentBridge = new AgentBridgeService();

/**
 * Parse .env file content into key-value pairs
 */
function parseEnvFile(envContent: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }
    
    // Find the first = character
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      continue; // Skip malformed lines
    }
    
    const key = trimmedLine.substring(0, equalIndex).trim();
    let value = trimmedLine.substring(equalIndex + 1).trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    if (key) {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Serialize key-value pairs to .env file format
 */
function serializeEnvFile(envData: Record<string, string>): string {
  const lines: string[] = [];
  
  for (const [key, value] of Object.entries(envData)) {
    // Escape values that contain spaces or special characters
    let escapedValue = value;
    if (value.includes(' ') || value.includes('\n') || value.includes('\t')) {
      escapedValue = `"${value.replace(/"/g, '\\"')}"`;
    }
    
    lines.push(`${key}=${escapedValue}`);
  }
  
  return lines.join('\n');
}

/**
 * Validate environment import options
 */
function validateImportOptions(options: any): { project?: string; category?: string; overwrite?: boolean } {
  const validated: { project?: string; category?: string; overwrite?: boolean } = {};
  
  if (options?.project && typeof options.project === 'string') {
    validated.project = options.project;
  }
  
  if (options?.category && typeof options.category === 'string') {
    validated.category = options.category;
  }
  
  if (options?.overwrite !== undefined) {
    validated.overwrite = Boolean(options.overwrite);
  }
  
  return validated;
}

// Middleware to ensure vault is loaded and services are ready
async function ensureServicesReady(req: Request, res: Response, next: NextFunction) {
  try {
    await vaultAgent.loadVault();
    next();
  } catch (err) {
    const error = err as Error;
    logger.error('Service initialization failed', { error: error.message });
    res.status(500).json({ error: 'Failed to load vault', details: error.message });
  }
}

/**
 * POST /env/import
 * Body: { envContent: string, options?: { project, category, overwrite } }
 * Imports .env file content into the vault.
 */
router.post('/import', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  const { envContent, options } = req.body;
  
  if (!envContent || typeof envContent !== 'string') {
    res.status(400).json({ error: 'envContent (string) is required' });
    return;
  }
  
  try {
    logger.info('Starting environment import', { 
      contentLength: envContent.length,
      options: validateImportOptions(options)
    });
    
    // Parse environment variables
    const parsedEnv = parseEnvFile(envContent);
    const envKeys = Object.keys(parsedEnv);
    
    if (envKeys.length === 0) {
      res.status(400).json({ 
        error: 'No valid environment variables found in content',
        details: 'Please ensure the content follows .env format (KEY=value)' 
      });
      return;
    }
    
    // Validate and prepare options
    const validatedOptions = validateImportOptions(options);
    
    // Import using VaultAgent
    const importResult = vaultAgent.importEnvToVault(envContent, validatedOptions);
    await vaultAgent.saveVault();
    
    // Log and respond with success
    logger.info('Environment import completed', {
      importedCount: envKeys.length,
      keys: envKeys,
      options: validatedOptions
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Environment variables imported successfully',
      imported: {
        count: envKeys.length,
        keys: envKeys
      },
      options: validatedOptions
    });
    
  } catch (err) {
    const error = err as Error;
    logger.error('Environment import failed', { 
      error: error.message,
      contentLength: envContent.length 
    });
    res.status(500).json({ error: 'Import failed', details: error.message });
  }
});

/**
 * POST /env/import-file
 * Body: { filePath: string, options?: { project, category, overwrite } }
 * Imports .env file from file system into the vault.
 */
router.post('/import-file', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  const { filePath, options } = req.body;
  
  if (!filePath || typeof filePath !== 'string') {
    res.status(400).json({ error: 'filePath (string) is required' });
    return;
  }
  
  try {
    logger.info('Starting environment file import', { filePath, options });
    
    // Read file content
    const envContent = await fs.readFile(filePath, 'utf-8');
    
    // Parse environment variables
    const parsedEnv = parseEnvFile(envContent);
    const envKeys = Object.keys(parsedEnv);
    
    if (envKeys.length === 0) {
      res.status(400).json({ 
        error: 'No valid environment variables found in file',
        details: `File: ${filePath}` 
      });
      return;
    }
    
    // Validate options
    const validatedOptions = validateImportOptions(options);
    
    // Import using VaultAgent
    vaultAgent.importEnvToVault(envContent, validatedOptions);
    await vaultAgent.saveVault();
    
    logger.info('Environment file import completed', {
      filePath,
      importedCount: envKeys.length,
      options: validatedOptions
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Environment file imported successfully',
      file: filePath,
      imported: {
        count: envKeys.length,
        keys: envKeys
      },
      options: validatedOptions
    });
    
  } catch (err) {
    const error = err as Error;
    logger.error('Environment file import failed', { 
      filePath,
      error: error.message 
    });
    
    if ((error as any).code === 'ENOENT') {
      res.status(404).json({ error: 'File not found', details: filePath });
    } else {
      res.status(500).json({ error: 'Import failed', details: error.message });
    }
  }
});

/**
 * GET /env/export
 * Query: project, category, format
 * Exports .env file content from the vault.
 */
router.get('/export', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  const { project, category, format } = req.query;
  
  try {
    logger.info('Starting environment export', { project, category, format });
    
    const exportOptions = {
      project: project as string,
      category: category as string
    };
    
    const envString = vaultAgent.exportEnvFromVault(exportOptions);
    
    if (format === 'json') {
      // Parse and return as JSON
      const parsedEnv = parseEnvFile(envString);
      res.json({
        success: true,
        format: 'json',
        data: parsedEnv,
        count: Object.keys(parsedEnv).length,
        options: exportOptions
      });
    } else {
      // Return as .env format (default)
    res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename=".env"');
    res.send(envString);
    }
    
    logger.info('Environment export completed', { 
      project, 
      category, 
      format,
      length: envString.length 
    });
    
  } catch (err) {
    const error = err as Error;
    logger.error('Environment export failed', { 
      project, 
      category, 
      error: error.message 
    });
    res.status(500).json({ error: 'Export failed', details: error.message });
  }
});

/**
 * POST /env/scan-project
 * Body: { projectPath: string }
 * Scans a project directory for secret requirements using AgentBridgeService
 */
router.post('/scan-project', ensureServicesReady, async (req: Request, res: Response): Promise<void> => {
  const { projectPath } = req.body;
  
  if (!projectPath || typeof projectPath !== 'string') {
    res.status(400).json({ error: 'projectPath (string) is required' });
    return;
  }
  
  try {
    logger.info('Starting project secret scan', { projectPath });
    
    // Initialize bridge service if needed
    await agentBridge.initialize();
    
    // Scan project for secret suggestions
    const suggestions = await agentBridge.scanProjectSecrets(projectPath);
    
    logger.info('Project secret scan completed', { 
      projectPath,
      suggestionsCount: suggestions.length 
    });
    
    res.json({
      success: true,
      projectPath,
      suggestions,
      summary: {
        totalSuggestions: suggestions.length,
        bySource: suggestions.reduce((acc, s) => {
          acc[s.source] = (acc[s.source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byCategory: suggestions.reduce((acc, s) => {
          const cat = s.category || 'unknown';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    });
    
  } catch (err) {
    const error = err as Error;
    logger.error('Project secret scan failed', { 
      projectPath,
      error: error.message 
    });
    res.status(500).json({ error: 'Scan failed', details: error.message });
  }
});

/**
 * GET /env/preview-import
 * Query: project, category, content (or filePath)
 * Previews what would be imported without actually importing
 */
router.get('/preview-import', async (req: Request, res: Response): Promise<void> => {
  const { project, category, content, filePath } = req.query;
  
  try {
    let envContent: string;
    
    if (content && typeof content === 'string') {
      envContent = content;
    } else if (filePath && typeof filePath === 'string') {
      envContent = await fs.readFile(filePath as string, 'utf-8');
    } else {
      res.status(400).json({ 
        error: 'Either content or filePath parameter is required' 
      });
      return;
    }
    
    // Parse the content
    const parsedEnv = parseEnvFile(envContent);
    const envKeys = Object.keys(parsedEnv);
    
    // Check for existing secrets in vault
    await vaultAgent.loadVault();
    const conflicts: string[] = [];
    const projectName = project as string || 'default';
    
    for (const key of envKeys) {
      try {
        const targetProject = await vaultAgent.getProject(projectName);
        if (targetProject) {
          const existingSecret = targetProject.secrets.find(s => 
            s.key === key && 
            (!category || s.category === category)
          );
          if (existingSecret) {
            conflicts.push(key);
          }
        }
      } catch (error) {
        // Project doesn't exist yet, no conflicts
      }
    }
    
    res.json({
      success: true,
      preview: {
        totalKeys: envKeys.length,
        keys: envKeys,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        hasConflicts: conflicts.length > 0,
        parsed: Object.keys(parsedEnv).map(key => ({
          key,
          hasValue: Boolean(parsedEnv[key]),
          valueLength: parsedEnv[key].length,
          willConflict: conflicts.includes(key)
        }))
      },
      options: {
        project: project as string,
        category: category as string
      }
    });
    
  } catch (err) {
    const error = err as Error;
    logger.error('Import preview failed', { error: error.message });
    res.status(500).json({ error: 'Preview failed', details: error.message });
  }
});

export default router;