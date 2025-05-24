import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { VaultAgent } from '../../../../vault/VaultAgent';
import { createLogger } from '../../../../src/utils/logger';

const logger = createLogger('ProjectScanAPI');

// Configuration
const PROJECTS_BASE_DIR = 'C:\\Users\\Jonbr\\pinokio\\api';
const VAULT_PATH = './vault/secrets.sops.yaml';

interface ProjectDiscovery {
  projectName: string;
  projectPath: string;
  hasEnvFile: boolean;
  hasPackageJson: boolean;
  hasDockerFile: boolean;
  estimatedSecrets: number;
  confidence: 'high' | 'medium' | 'low';
  lastModified: string;
  sizeKB: number;
}

interface SecretMatch {
  key: string;
  value: string;
  file: string;
  type: string;
  confidence: number;
}

interface ScanResult {
  projectName: string;
  projectPath: string;
  foundSecrets: SecretMatch[];
  summary: {
    totalSecrets: number;
    highConfidence: number;
    categories: Record<string, number>;
  };
}

interface DetailedScanResult {
  projectName: string;
  projectPath: string;
  foundSecrets: Array<{
    key: string;
    file: string;
    category: string;
    placeholder: string;
    confidence: number;
  }>;
  configFiles: string[];
  envFiles: string[];
  confidence: 'low' | 'medium' | 'high';
  vaultReady: boolean;
  suggestions: string[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'discover';
  const targetDir = searchParams.get('targetDir') || PROJECTS_BASE_DIR;

  try {
    if (action === 'discover') {
      const projects = await discoverProjects(targetDir);
      return NextResponse.json({ 
        success: true, 
        projects,
        summary: {
          total: projects.length,
          highConfidence: projects.filter(p => p.confidence === 'high').length,
          mediumConfidence: projects.filter(p => p.confidence === 'medium').length,
          lowConfidence: projects.filter(p => p.confidence === 'low').length
        }
      });
    }

    if (action === 'scan') {
      const projectName = searchParams.get('project');
      if (projectName) {
        const result = await scanProject(projectName);
        return result;
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('GET request failed', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectName, projectPath, selectedProjects } = body;

    if (action === 'scan') {
      const result = await scanProjectDetailed(projectName, projectPath);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'import_selected') {
      const results = [];
      for (const project of selectedProjects || []) {
        const scanResult = await scanProjectDetailed(project.projectName, project.projectPath);
        if (scanResult.foundSecrets.length > 0) {
          results.push(scanResult);
        }
      }
      return NextResponse.json({ success: true, results, imported: results.length });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('POST request failed', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function discoverProjects(baseDir: string): Promise<ProjectDiscovery[]> {
  const projects: ProjectDiscovery[] = [];
  
  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(baseDir, entry.name);
        const discovery = await analyzeProject(entry.name, projectPath);
        if (discovery) {
          projects.push(discovery);
        }
      }
    }
  } catch (error) {
    logger.error('Failed to discover projects', { baseDir, error: String(error) });
  }

  return projects.sort((a, b) => {
    const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
  });
}

async function analyzeProject(name: string, projectPath: string): Promise<ProjectDiscovery | null> {
  try {
    const files: string[] = await fs.readdir(projectPath);
    const fileSet = new Set(files);
    
    const discovery: ProjectDiscovery = {
      projectName: name,
      projectPath,
      hasEnvFile: fileSet.has('.env') || fileSet.has('.env.local') || fileSet.has('.env.example'),
      hasPackageJson: fileSet.has('package.json'),
      hasDockerFile: fileSet.has('Dockerfile') || fileSet.has('docker-compose.yml'),
      estimatedSecrets: 0,
      confidence: 'low',
      lastModified: new Date().toISOString(),
      sizeKB: 0
    };

    // Calculate estimated secrets
    if (discovery.hasEnvFile) discovery.estimatedSecrets += 5;
    if (fileSet.has('package.json')) discovery.estimatedSecrets += 2;
    if (fileSet.has('docker-compose.yml')) discovery.estimatedSecrets += 3;

    // Calculate confidence
    if (discovery.hasEnvFile && discovery.hasPackageJson) {
      discovery.confidence = 'high';
    } else if (discovery.hasEnvFile || discovery.hasPackageJson) {
      discovery.confidence = 'medium';
    }

    return discovery;
  } catch (error) {
    logger.error('Project analysis failed', { project: name, error: String(error) });
    return null;
  }
}

async function scanProject(projectName: string): Promise<NextResponse> {
  logger.info('Scanning specific project', { project: projectName });

  try {
    const projectPath = path.join(PROJECTS_BASE_DIR, projectName);
    
    // Check if project directory exists
    try {
      await fs.access(projectPath);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Project not found',
        details: `Project "${projectName}" does not exist in ${PROJECTS_BASE_DIR}`
      }, { status: 404 });
    }

    // Perform detailed scan
    const scanResult = await performDetailedScan(projectName, projectPath);

    logger.info('Project scan completed', {
      project: projectName,
      secrets: scanResult.foundSecrets.length,
      confidence: scanResult.confidence
    });

    return NextResponse.json({
      success: true,
      data: scanResult,
      message: `Scanned project "${projectName}" - found ${scanResult.foundSecrets.length} potential secrets`
    });

  } catch (error) {
    logger.error('Project scan failed', { projectName, error: String(error) });
    return NextResponse.json({ error: 'Project scan failed' }, { status: 500 });
  }
}

async function performDetailedScan(projectName: string, projectPath: string): Promise<DetailedScanResult> {
  const result: DetailedScanResult = {
    projectName,
    projectPath,
    foundSecrets: [],
    configFiles: [],
    envFiles: [],
    confidence: 'low',
    vaultReady: false,
    suggestions: []
  };

  try {
    const files = await fs.readdir(projectPath);
    
    for (const file of files) {
      if (file.includes('.env')) {
        result.envFiles.push(file);
        const filePath = path.join(projectPath, file);
        const secrets = await extractSecretsFromEnvFileSimple(filePath);
        result.foundSecrets.push(...secrets.map(s => ({
          ...s,
          file,
          placeholder: `<${s.category.toUpperCase()}_VALUE>`
        })));
      }
      
      if (['package.json', 'config.json', 'docker-compose.yml'].includes(file)) {
        result.configFiles.push(file);
      }
    }

    // Calculate confidence
    if (result.foundSecrets.length >= 5) {
      result.confidence = 'high';
    } else if (result.foundSecrets.length >= 2) {
      result.confidence = 'medium';
    }

    // Add suggestions
    if (files.includes('package.json')) {
      result.suggestions.push('Consider adding NODE_ENV, PORT configuration');
    }
    if (result.foundSecrets.some(s => s.key.includes('API'))) {
      result.suggestions.push('Set up API key rotation policies');
    }

  } catch (error) {
    logger.error('Detailed scan failed', { project: projectName, error: String(error) });
  }

  return result;
}

async function scanProjectDetailed(projectName: string, projectPath: string): Promise<ScanResult> {
  const result: ScanResult = {
    projectName,
    projectPath,
    foundSecrets: [],
    summary: {
      totalSecrets: 0,
      highConfidence: 0,
      categories: {}
    }
  };

  try {
    const envFiles = ['.env', '.env.local', '.env.example', '.env.production', '.env.development'];
    
    for (const envFile of envFiles) {
      const envPath = path.join(projectPath, envFile);
      try {
        await fs.access(envPath);
        const secrets = await extractSecretsFromEnvFile(envPath);
        result.foundSecrets.push(...secrets);
      } catch {
        // File doesn't exist, continue
      }
    }

    // Calculate summary
    result.summary.totalSecrets = result.foundSecrets.length;
    result.summary.highConfidence = result.foundSecrets.filter(s => s.confidence > 0.7).length;
    
    result.foundSecrets.forEach(secret => {
      result.summary.categories[secret.type] = (result.summary.categories[secret.type] || 0) + 1;
    });

  } catch (error) {
    logger.error('Detailed scan failed', { project: projectName, error: String(error) });
  }

  return result;
}

async function extractSecretsFromEnvFile(filePath: string): Promise<SecretMatch[]> {
  const secrets: SecretMatch[] = [];
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        
        if (key && value) {
          const secret: SecretMatch = {
            key: key.trim(),
            value: value.trim(),
            file: path.basename(filePath),
            type: categorizeSecret(key.trim()),
            confidence: calculateSecretConfidence(key.trim(), value.trim())
          };
          secrets.push(secret);
        }
      }
    }
  } catch (error) {
    logger.error('Failed to extract secrets from env file', { filePath, error: String(error) });
  }

  return secrets;
}

async function extractSecretsFromEnvFileSimple(filePath: string): Promise<Array<{
  key: string;
  category: string;
  confidence: number;
}>> {
  const secrets: Array<{
    key: string;
    category: string;
    confidence: number;
  }> = [];

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
      if (match) {
        const key = match[1];
        let category = 'general';
        let confidence = 0.5;

        // Categorize based on key name
        if (key.includes('API_KEY') || key.includes('SECRET_KEY')) {
          category = 'api';
          confidence = 0.9;
        } else if (key.includes('DATABASE') || key.includes('DB_')) {
          category = 'database';
          confidence = 0.8;
        } else if (key.includes('JWT') || key.includes('AUTH')) {
          category = 'auth';
          confidence = 0.8;
        } else if (key.includes('REDIS') || key.includes('CACHE')) {
          category = 'cache';
          confidence = 0.7;
        }

        secrets.push({ key, category, confidence });
      }
    }
  } catch (error) {
    logger.error('Failed to extract secrets from env file', { filePath, error: String(error) });
  }

  return secrets;
}

function categorizeSecret(key: string): string {
  const upperKey = key.toUpperCase();
  
  if (upperKey.includes('API_KEY') || upperKey.includes('APIKEY')) return 'API_KEY';
  if (upperKey.includes('SECRET') || upperKey.includes('TOKEN')) return 'SECRET_TOKEN';
  if (upperKey.includes('PASSWORD') || upperKey.includes('PASS')) return 'PASSWORD';
  if (upperKey.includes('DB_') || upperKey.includes('DATABASE')) return 'DATABASE';
  if (upperKey.includes('REDIS') || upperKey.includes('CACHE')) return 'CACHE';
  if (upperKey.includes('AUTH') || upperKey.includes('OAUTH')) return 'AUTH';
  if (upperKey.includes('WEBHOOK') || upperKey.includes('CALLBACK')) return 'WEBHOOK';
  if (upperKey.includes('URL') || upperKey.includes('ENDPOINT')) return 'SERVICE_URL';
  
  return 'UNKNOWN';
}

function calculateSecretConfidence(key: string, value: string): number {
  let confidence = 0.3; // Base confidence
  
  // Key-based confidence
  const upperKey = key.toUpperCase();
  if (upperKey.includes('KEY') || upperKey.includes('SECRET') || upperKey.includes('TOKEN')) {
    confidence += 0.3;
  }
  
  // Value-based confidence
  if (value.length > 20) confidence += 0.2;
  if (/^[A-Za-z0-9+/=]{20,}$/.test(value)) confidence += 0.2; // Base64-like
  if (/^[a-f0-9]{32,}$/.test(value)) confidence += 0.3; // Hex hash
  if (value.startsWith('sk-') || value.startsWith('pk_')) confidence += 0.4; // Stripe/OpenAI pattern
  
  return Math.min(confidence, 1.0);
} 