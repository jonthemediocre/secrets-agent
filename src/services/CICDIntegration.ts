import { spawn, execSync } from 'child_process';
import { createLogger } from '../utils/logger';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const logger = createLogger('CICDIntegration');

export interface GitHookConfig {
  enabled: boolean;
  blockSecrets: boolean;
  scanPatterns: string[];
  allowedFiles: string[];
  notifications: {
    slack?: string;
    email?: string;
  };
}

export interface SecretScanResult {
  found: boolean;
  secrets: Array<{
    file: string;
    line: number;
    type: string;
    pattern: string;
  }>;
  blocked: boolean;
}

export class CICDIntegration {
  private config: GitHookConfig;

  constructor(config: GitHookConfig) {
    this.config = config;
  }

  /**
   * Install pre-commit hooks to prevent secret commits
   */
  async installPreCommitHooks(projectPath: string = process.cwd()): Promise<boolean> {
    try {
      logger.info('Installing pre-commit hooks for secret prevention');

      const gitHooksDir = join(projectPath, '.git', 'hooks');
      
      // Ensure hooks directory exists
      if (!existsSync(gitHooksDir)) {
        mkdirSync(gitHooksDir, { recursive: true });
      }

      // Create pre-commit hook
      const preCommitHook = this.generatePreCommitHook();
      const hookPath = join(gitHooksDir, 'pre-commit');
      
      writeFileSync(hookPath, preCommitHook, { mode: 0o755 });
      
      logger.info(`Pre-commit hook installed at: ${hookPath}`);

      // Also create a package.json script for manual scanning
      await this.createScanScript(projectPath);

      return true;
    } catch (error) {
      logger.error('Failed to install pre-commit hooks:', error);
      return false;
    }
  }

  /**
   * Scan staged files for secrets before commit
   */
  async scanStagedFiles(): Promise<SecretScanResult> {
    try {
      logger.info('Scanning staged files for secrets...');

      // Get staged files
      const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(file => file.length > 0);

      const secrets = [];

      for (const file of stagedFiles) {
        // Skip allowed files
        if (this.config.allowedFiles.some(pattern => file.includes(pattern))) {
          continue;
        }

        try {
          const content = execSync(`git show :${file}`, { encoding: 'utf8' });
          const fileSecrets = this.scanContentForSecrets(content, file);
          secrets.push(...fileSecrets);
        } catch (error) {
          // File might be deleted or binary
          continue;
        }
      }

      const result: SecretScanResult = {
        found: secrets.length > 0,
        secrets,
        blocked: this.config.blockSecrets && secrets.length > 0
      };

      if (result.found) {
        logger.warn(`Found ${secrets.length} potential secrets in staged files`);
        await this.sendNotifications(result);
      }

      return result;
    } catch (error) {
      logger.error('Failed to scan staged files:', error);
      return { found: false, secrets: [], blocked: false };
    }
  }

  /**
   * Scan directory for secrets (for CI/CD pipelines)
   */
  async scanDirectory(dirPath: string): Promise<SecretScanResult> {
    try {
      logger.info(`Scanning directory for secrets: ${dirPath}`);
      
      const secrets = [];
      
      // Use git to find tracked files, fallback to find command
      let files: string[];
      try {
        files = execSync('git ls-files', { cwd: dirPath, encoding: 'utf8' })
          .trim()
          .split('\n')
          .filter(file => file.length > 0);
      } catch {
        // Fallback to find command if not a git repo
        files = execSync(`find ${dirPath} -type f -name "*.js" -o -name "*.ts" -o -name "*.env*" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml"`, { encoding: 'utf8' })
          .trim()
          .split('\n')
          .filter(file => file.length > 0);
      }

      for (const file of files) {
        // Skip allowed files
        if (this.config.allowedFiles.some(pattern => file.includes(pattern))) {
          continue;
        }

        try {
          const content = execSync(`cat "${join(dirPath, file)}"`, { encoding: 'utf8' });
          const fileSecrets = this.scanContentForSecrets(content, file);
          secrets.push(...fileSecrets);
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      return {
        found: secrets.length > 0,
        secrets,
        blocked: false // Don't block in CI scan, just report
      };
    } catch (error) {
      logger.error('Failed to scan directory:', error);
      return { found: false, secrets: [], blocked: false };
    }
  }

  /**
   * Scan file content for secret patterns
   */
  private scanContentForSecrets(content: string, fileName: string): Array<{
    file: string;
    line: number;
    type: string;
    pattern: string;
  }> {
    const secrets = [];
    const lines = content.split('\n');

    const secretPatterns = [
      { pattern: /OPENAI_API_KEY\s*=\s*["']?(sk-[A-Za-z0-9]{32,})["']?/g, type: 'OpenAI API Key' },
      { pattern: /AWS_ACCESS_KEY_ID\s*=\s*["']?(AKIA[0-9A-Z]{16})["']?/g, type: 'AWS Access Key' },
      { pattern: /DATABASE_URL\s*=\s*["']?(postgresql:\/\/[^"'\s]+)["']?/g, type: 'Database URL' },
      { pattern: /JWT_SECRET\s*=\s*["']?([A-Za-z0-9+/]{32,})["']?/g, type: 'JWT Secret' },
      { pattern: /API_KEY\s*=\s*["']?([A-Za-z0-9_-]{20,})["']?/g, type: 'Generic API Key' },
      { pattern: /SECRET_KEY\s*=\s*["']?([A-Za-z0-9+/=]{32,})["']?/g, type: 'Secret Key' },
      { pattern: /STRIPE_SECRET_KEY\s*=\s*["']?(sk_live_[0-9a-zA-Z]{24,})["']?/g, type: 'Stripe Secret Key' },
      { pattern: /-----BEGIN PRIVATE KEY-----/g, type: 'Private Key' },
      { pattern: /-----BEGIN RSA PRIVATE KEY-----/g, type: 'RSA Private Key' },
      ...this.config.scanPatterns.map(p => ({ pattern: new RegExp(p, 'g'), type: 'Custom Pattern' }))
    ];

    lines.forEach((line, lineNumber) => {
      secretPatterns.forEach(({ pattern, type }) => {
        const matches = line.match(pattern);
        if (matches) {
          secrets.push({
            file: fileName,
            line: lineNumber + 1,
            type,
            pattern: matches[0].substring(0, 50) + '...'
          });
        }
      });
    });

    return secrets;
  }

  /**
   * Generate pre-commit hook script
   */
  private generatePreCommitHook(): string {
    return `#!/bin/sh
# Pre-commit hook for secret detection
# Generated by Secrets Agent

echo "🔍 Scanning for secrets in staged files..."

# Run the secret scanner
node -e "
const { execSync } = require('child_process');
try {
  const result = execSync('npx ts-node -e \\"import { CICDIntegration } from \\'./src/services/CICDIntegration\\'; const ci = new CICDIntegration({ enabled: true, blockSecrets: true, scanPatterns: [], allowedFiles: [\\'node_modules\\', \\'.git\\', \\'dist\\', \\'build\\'] }); ci.scanStagedFiles().then(r => { if (r.blocked) { console.error(\\'❌ Secrets detected! Commit blocked.\\'); process.exit(1); } else { console.log(\\'✅ No secrets detected.\\'); } });\\"', { encoding: 'utf8' });
  console.log(result);
} catch (error) {
  console.error('❌ Secrets detected! Commit blocked.');
  console.error('Run \\'npm run scan-secrets\\' to see details.');
  process.exit(1);
}
"

exit 0
`;
  }

  /**
   * Create package.json script for manual scanning
   */
  private async createScanScript(projectPath: string): Promise<void> {
    try {
      const packageJsonPath = join(projectPath, 'package.json');
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(require('fs').readFileSync(packageJsonPath, 'utf8'));
        
        if (!packageJson.scripts) {
          packageJson.scripts = {};
        }

        packageJson.scripts['scan-secrets'] = 'npx ts-node -e "import { CICDIntegration } from \'./src/services/CICDIntegration\'; const ci = new CICDIntegration({ enabled: true, blockSecrets: false, scanPatterns: [], allowedFiles: [\'node_modules\', \'.git\', \'dist\', \'build\'], notifications: {} }); ci.scanDirectory(process.cwd()).then(r => console.log(JSON.stringify(r, null, 2)));"';
        
        writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        logger.info('Added scan-secrets script to package.json');
      }
    } catch (error) {
      logger.warn('Failed to update package.json:', error);
    }
  }

  /**
   * Send notifications about detected secrets
   */
  private async sendNotifications(result: SecretScanResult): Promise<void> {
    if (this.config.notifications.slack) {
      await this.sendSlackNotification(result);
    }
    
    if (this.config.notifications.email) {
      await this.sendEmailNotification(result);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(result: SecretScanResult): Promise<void> {
    try {
      const message = {
        text: `🚨 Secrets detected in commit attempt`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${result.secrets.length} potential secrets detected*\\n${result.blocked ? '❌ Commit blocked' : '⚠️ Review required'}`
            }
          },
          {
            type: 'section',
            fields: result.secrets.slice(0, 5).map(secret => ({
              type: 'mrkdwn',
              text: `*${secret.file}:${secret.line}*\\n${secret.type}`
            }))
          }
        ]
      };

      // Implementation would send to Slack webhook
      logger.info('Slack notification prepared (webhook integration needed)');
    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(result: SecretScanResult): Promise<void> {
    try {
      // Implementation would send email
      logger.info('Email notification prepared (email service integration needed)');
    } catch (error) {
      logger.error('Failed to send email notification:', error);
    }
  }

  /**
   * Create GitHub Actions workflow for secret scanning
   */
  async createGitHubActionsWorkflow(projectPath: string = process.cwd()): Promise<boolean> {
    try {
      const workflowsDir = join(projectPath, '.github', 'workflows');
      mkdirSync(workflowsDir, { recursive: true });

      const workflow = `name: Secret Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Scan for secrets
      run: npm run scan-secrets
      
    - name: Upload scan results
      if: failure()
      uses: actions/upload-artifact@v3
      with:
        name: secret-scan-results
        path: secret-scan-results.json
`;

      const workflowPath = join(workflowsDir, 'secret-scan.yml');
      writeFileSync(workflowPath, workflow);
      
      logger.info(`GitHub Actions workflow created: ${workflowPath}`);
      return true;
    } catch (error) {
      logger.error('Failed to create GitHub Actions workflow:', error);
      return false;
    }
  }
}

export default CICDIntegration; 