#!/usr/bin/env node

/**
 * UAP CLI - Universal Agent Protocol Command Line Interface
 * 
 * Provides command-line access to UAP Level 2 compliant agents including:
 * - Agent manifest generation and validation
 * - Autonomous mutation operations  
 * - Lifecycle orchestration (plan/execute/collapse)
 * - Hook monitoring and integration
 * - Cross-agent communication and coordination
 */

import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../src/utils/logger';

const logger = createLogger('UAP-CLI');

interface UAPAgent {
  agentId: string;
  version: string;
  manifestPath: string;
  implementationPath: string;
  isLoaded: boolean;
}

class UAPCliFramework {
  private agents: Map<string, UAPAgent> = new Map();
  private workingDirectory: string;

  constructor(workingDir: string = process.cwd()) {
    this.workingDirectory = workingDir;
    this.discoverAgents();
  }

  /**
   * Auto-discover UAP compliant agents
   */
  private discoverAgents(): void {
    logger.info('🔍 Discovering UAP agents...');
    
    // Look for UAP manifest files
    const manifestFiles = this.findManifestFiles();
    
    for (const manifestPath of manifestFiles) {
      try {
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = manifestContent.startsWith('{') 
          ? JSON.parse(manifestContent)
          : this.parseYamlManifest(manifestContent);
        
        if (manifest.agentId && manifest.uapLevel) {
          const agent: UAPAgent = {
            agentId: manifest.agentId,
            version: manifest.version || '1.0.0',
            manifestPath,
            implementationPath: this.findImplementationPath(manifest.agentId),
            isLoaded: false
          };
          
          this.agents.set(manifest.agentId, agent);
          logger.info(`✅ Discovered UAP agent: ${manifest.agentId} v${agent.version}`);
        }
      } catch (error) {
        logger.warn(`Failed to parse manifest ${manifestPath}:`, error);
      }
    }
    
    logger.info(`🎯 Discovered ${this.agents.size} UAP agents`);
  }

  /**
   * Find UAP manifest files
   */
  private findManifestFiles(): string[] {
    const manifestFiles: string[] = [];
    
    // Look for .yaml and .json files with UAP indicators
    const searchPaths = [
      '*.yaml',
      '*.yml', 
      '*.json',
      'manifests/*.yaml',
      'manifests/*.yml',
      'agents/*.yaml',
      'agents/*.yml'
    ];
    
    for (const pattern of searchPaths) {
      try {
        // Simple file search - would use glob in production
        const files = this.simpleGlob(pattern);
        for (const file of files) {
          if (this.isUAPManifest(file)) {
            manifestFiles.push(file);
          }
        }
      } catch (error) {
        // Continue searching
      }
    }
    
    return manifestFiles;
  }

  /**
   * Simple glob implementation
   */
  private simpleGlob(pattern: string): string[] {
    const files: string[] = [];
    
    if (pattern.includes('/')) {
      const [dir, filename] = pattern.split('/');
      try {
        const dirPath = path.join(this.workingDirectory, dir);
        if (fs.existsSync(dirPath)) {
          const dirFiles = fs.readdirSync(dirPath);
          for (const file of dirFiles) {
            if (this.matchesPattern(file, filename)) {
              files.push(path.join(dirPath, file));
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist
      }
    } else {
      try {
        const dirFiles = fs.readdirSync(this.workingDirectory);
        for (const file of dirFiles) {
          if (this.matchesPattern(file, pattern)) {
            files.push(path.join(this.workingDirectory, file));
          }
        }
      } catch (error) {
        // Working directory issues
      }
    }
    
    return files;
  }

  /**
   * Check if filename matches pattern
   */
  private matchesPattern(filename: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.startsWith('*.')) {
      return filename.endsWith(pattern.slice(1));
    }
    return filename === pattern;
  }

  /**
   * Check if file is a UAP manifest
   */
  private isUAPManifest(filePath: string): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content.includes('agentId') && 
             content.includes('uapLevel') &&
             (content.includes('mcpCallable') || content.includes('hooks') || content.includes('mutations'));
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse YAML manifest (simplified)
   */
  private parseYamlManifest(content: string): any {
    // Simplified YAML parsing - would use yaml library in production
    const lines = content.split('\n');
    const result: any = {};
    
    for (const line of lines) {
      if (line.includes(':') && !line.trim().startsWith('#')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        if (value && !value.startsWith('#')) {
          const cleanKey = key.trim();
          const cleanValue = value.replace(/['"]/g, '');
          
          if (cleanKey && cleanValue) {
            result[cleanKey] = cleanValue;
          }
        }
      }
    }
    
    return result;
  }

  /**
   * Find implementation file for agent
   */
  private findImplementationPath(agentId: string): string {
    const possiblePaths = [
      `src/agents/${agentId}.ts`,
      `src/agents/${this.kebabToPascal(agentId)}.ts`,
      `src/vault/${this.kebabToPascal(agentId)}.ts`,
      `src/harvester/${this.kebabToPascal(agentId)}.ts`,
      `src/${agentId}.ts`
    ];
    
    for (const possiblePath of possiblePaths) {
      const fullPath = path.join(this.workingDirectory, possiblePath);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    
    return '';
  }

  /**
   * Convert kebab-case to PascalCase
   */
  private kebabToPascal(str: string): string {
    return str.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * List all discovered agents
   */
  public listAgents(): void {
    console.log('\n🤖 UAP Agents Discovered:');
    console.log('=' .repeat(50));
    
    if (this.agents.size === 0) {
      console.log('No UAP agents found in current directory');
      return;
    }
    
    for (const [agentId, agent] of this.agents) {
      console.log(`📋 ${agentId}`);
      console.log(`   Version: ${agent.version}`);
      console.log(`   Manifest: ${path.relative(this.workingDirectory, agent.manifestPath)}`);
      console.log(`   Implementation: ${agent.implementationPath ? path.relative(this.workingDirectory, agent.implementationPath) : 'Not found'}`);
      console.log(`   Status: ${agent.isLoaded ? '✅ Loaded' : '⏸️  Available'}`);
      console.log('');
    }
  }

  /**
   * Generate manifest for agent
   */
  public async generateManifest(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.error(`❌ Agent ${agentId} not found`);
      return;
    }
    
    try {
      console.log(`📄 Generating manifest for ${agentId}...`);
      
      // In production, this would dynamically load and call generateManifest()
      if (fs.existsSync(agent.manifestPath)) {
        const manifestContent = fs.readFileSync(agent.manifestPath, 'utf-8');
        console.log('\n' + manifestContent);
      } else {
        console.log(`⚠️  Manifest file not found at ${agent.manifestPath}`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to generate manifest: ${error}`);
    }
  }

  /**
   * Execute agent mutation
   */
  public async executeMutation(agentId: string, mutationType: string, parameters: any = {}): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.error(`❌ Agent ${agentId} not found`);
      return;
    }
    
    console.log(`🧬 Executing mutation ${mutationType} on ${agentId}...`);
    console.log(`📋 Parameters: ${JSON.stringify(parameters, null, 2)}`);
    
    // In production, this would:
    // 1. Dynamically import the agent class
    // 2. Create instance
    // 3. Call performMutation(mutationType, parameters)
    // 4. Display results
    
    console.log('✅ Mutation simulation completed (would call performMutation in production)');
  }

  /**
   * Run agent lifecycle operation
   */
  public async runLifecycleOperation(agentId: string, operation: 'plan' | 'execute' | 'collapse', input: any): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.error(`❌ Agent ${agentId} not found`);
      return;
    }
    
    console.log(`🔄 Running ${operation} phase for ${agentId}...`);
    console.log(`📋 Input: ${JSON.stringify(input, null, 2)}`);
    
    // In production, this would dynamically load and call the lifecycle method
    console.log(`✅ ${operation} phase simulation completed`);
  }
}

// CLI Command Setup
program
  .name('uap')
  .description('UAP (Universal Agent Protocol) CLI - Manage Level 2 compliant agents')
  .version('2.0.0');

// List agents command
program
  .command('list')
  .alias('ls')
  .description('List all discovered UAP agents')
  .action(() => {
    const cli = new UAPCliFramework();
    cli.listAgents();
  });

// Manifest command
program
  .command('manifest <agent-id>')
  .description('Generate and display agent manifest')
  .action(async (agentId: string) => {
    const cli = new UAPCliFramework();
    await cli.generateManifest(agentId);
  });

// Mutation command
program
  .command('mutate <agent-id>')
  .description('Execute autonomous agent mutation')
  .option('--type <mutation-type>', 'Type of mutation to perform')
  .option('--params <json>', 'Parameters as JSON string', '{}')
  .action(async (agentId: string, options: any) => {
    const cli = new UAPCliFramework();
    const parameters = JSON.parse(options.params);
    await cli.executeMutation(agentId, options.type, parameters);
  });

// Plan command
program
  .command('plan <agent-id> <objective>')
  .description('Execute UAP plan phase')
  .action(async (agentId: string, objective: string) => {
    const cli = new UAPCliFramework();
    await cli.runLifecycleOperation(agentId, 'plan', { objective });
  });

// Execute command
program
  .command('execute <agent-id>')
  .description('Execute UAP execute phase')
  .option('--plan <json>', 'Plan as JSON string', '{}')
  .action(async (agentId: string, options: any) => {
    const cli = new UAPCliFramework();
    const plan = JSON.parse(options.plan);
    await cli.runLifecycleOperation(agentId, 'execute', plan);
  });

// Collapse command
program
  .command('collapse <agent-id>')
  .description('Execute UAP collapse phase')
  .option('--results <json>', 'Results as JSON string', '[]')
  .action(async (agentId: string, options: any) => {
    const cli = new UAPCliFramework();
    const results = JSON.parse(options.results);
    await cli.runLifecycleOperation(agentId, 'collapse', results);
  });

// Status command
program
  .command('status')
  .description('Show UAP system status')
  .action(() => {
    const cli = new UAPCliFramework();
    console.log('🎯 UAP System Status:');
    console.log(`Working Directory: ${process.cwd()}`);
    console.log(`Node Version: ${process.version}`);
    console.log(`UAP CLI Version: 2.0.0`);
    cli.listAgents();
  });

// Parse CLI arguments
program.parse();

export default UAPCliFramework; 