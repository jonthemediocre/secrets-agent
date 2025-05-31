import { createLogger } from '../utils/logger';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
// import { glob } from 'glob'; // Remove problematic import for now

const logger = createLogger('GlobalRuleManager');

export interface GlobalRule {
  id: string;
  category: string;
  title: string;
  content: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  tags: string[];
  lastUpdated: string;
  version: string;
}

export interface RuleSync {
  sourceFile: string;
  targetProjects: string[];
  lastSync: string;
  syncCount: number;
  errors: string[];
}

export interface GlobalRuleState {
  version: string;
  rules: GlobalRule[];
  syncHistory: RuleSync[];
  lastGlobalUpdate: string;
}

/**
 * GlobalRuleManager - Level 1: Global Rule Governance
 * 
 * Manages the unified globalrules.md file and ensures it's synchronized
 * across all project roots for consistent agent behavior.
 */
export class GlobalRuleManager {
  private globalRulesPath: string;
  private statePath: string;
  private projectRoots: string[];

  constructor(options: {
    globalRulesPath: string;
    statePath: string;
    projectRoots?: string[];
  }) {
    this.globalRulesPath = options.globalRulesPath;
    this.statePath = options.statePath;
    this.projectRoots = options.projectRoots || [];
  }

  /**
   * 🌐 Level 1: Initialize Global Rule System
   * 
   * Sets up the global rule governance infrastructure
   */
  async initializeGlobalRules(): Promise<void> {
    try {
      logger.info('🌐 Initializing Global Rule System');

      // Ensure directories exist
      const globalDir = dirname(this.globalRulesPath);
      if (!existsSync(globalDir)) {
        mkdirSync(globalDir, { recursive: true });
      }

      // Create globalrules.md if it doesn't exist
      if (!existsSync(this.globalRulesPath)) {
        await this.createDefaultGlobalRules();
      }

      // Initialize state tracking
      if (!existsSync(this.statePath)) {
        await this.initializeState();
      }

      // Auto-discover project roots if not provided
      if (this.projectRoots.length === 0) {
        this.projectRoots = await this.discoverProjectRoots();
      }

      logger.info('✅ Global Rule System initialized', {
        globalRulesPath: this.globalRulesPath,
        projectRoots: this.projectRoots.length,
        version: await this.getCurrentVersion()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Failed to initialize Global Rule System', { error: errorMessage });
      throw new Error(`Global Rules initialization failed: ${errorMessage}`);
    }
  }

  /**
   * 🔄 Synchronize Rules to All Projects
   * 
   * Distributes the global rules to all project roots
   */
  async synchronizeRulesGlobally(): Promise<RuleSync> {
    try {
      logger.info('🔄 Starting global rule synchronization');

      const sync: RuleSync = {
        sourceFile: this.globalRulesPath,
        targetProjects: [],
        lastSync: new Date().toISOString(),
        syncCount: 0,
        errors: []
      };

      // Read current global rules
      const globalRulesContent = readFileSync(this.globalRulesPath, 'utf8');
      const currentVersion = await this.getCurrentVersion();

      // Sync to each project root
      for (const projectRoot of this.projectRoots) {
        try {
          const targetPath = join(projectRoot, 'globalrules.md');
          
          // Ensure project directory exists
          if (!existsSync(projectRoot)) {
            mkdirSync(projectRoot, { recursive: true });
          }

          // Write rules with project-specific header
          const projectRulesContent = this.addProjectHeader(globalRulesContent, projectRoot);
          writeFileSync(targetPath, projectRulesContent, 'utf8');

          sync.targetProjects.push(projectRoot);
          sync.syncCount++;

          logger.debug('✅ Rules synced to project', { projectRoot, targetPath });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          sync.errors.push(`${projectRoot}: ${errorMessage}`);
          logger.warn('❌ Failed to sync rules to project', { projectRoot, error: errorMessage });
        }
      }

      // Update state
      await this.updateSyncHistory(sync);

      logger.info('🎯 Global rule synchronization completed', {
        syncCount: sync.syncCount,
        errors: sync.errors.length,
        version: currentVersion
      });

      return sync;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Global rule synchronization failed', { error: errorMessage });
      throw new Error(`Rule synchronization failed: ${errorMessage}`);
    }
  }

  /**
   * 📝 Update Global Rules
   * 
   * Updates the globalrules.md file and triggers synchronization
   */
  async updateGlobalRules(updates: {
    content?: string;
    addRules?: Partial<GlobalRule>[];
    removeRules?: string[];
    version?: string;
  }): Promise<void> {
    try {
      logger.info('📝 Updating global rules', {
        hasContent: !!updates.content,
        addRules: updates.addRules?.length || 0,
        removeRules: updates.removeRules?.length || 0
      });

      let currentContent = existsSync(this.globalRulesPath) 
        ? readFileSync(this.globalRulesPath, 'utf8')
        : '';

      // Apply updates
      if (updates.content) {
        currentContent = updates.content;
      }

      if (updates.addRules) {
        for (const rule of updates.addRules) {
          currentContent = this.addRuleToContent(currentContent, rule);
        }
      }

      if (updates.removeRules) {
        for (const ruleId of updates.removeRules) {
          currentContent = this.removeRuleFromContent(currentContent, ruleId);
        }
      }

      // Update version
      const newVersion = updates.version || this.generateVersion();
      currentContent = this.updateVersionInContent(currentContent, newVersion);

      // Write updated content
      writeFileSync(this.globalRulesPath, currentContent, 'utf8');

      // Auto-sync to projects
      await this.synchronizeRulesGlobally();

      logger.info('✅ Global rules updated and synchronized', { version: newVersion });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Failed to update global rules', { error: errorMessage });
      throw new Error(`Global rules update failed: ${errorMessage}`);
    }
  }

  /**
   * 📊 Get Rule Governance Status
   * 
   * Returns comprehensive status of the rule governance system
   */
  async getGovernanceStatus(): Promise<{
    globalRules: {
      version: string;
      ruleCount: number;
      lastUpdated: string;
      size: number;
    };
    synchronization: {
      projectCount: number;
      lastSync: string;
      syncSuccess: number;
      syncErrors: number;
    };
    health: 'healthy' | 'warning' | 'error';
    recommendations: string[];
  }> {
    try {
      const state = await this.loadState();
      const globalRulesStats = existsSync(this.globalRulesPath) 
        ? require('fs').statSync(this.globalRulesPath)
        : null;

      const lastSync = state.syncHistory[state.syncHistory.length - 1];
      
      const status = {
        globalRules: {
          version: state.version,
          ruleCount: state.rules.length,
          lastUpdated: state.lastGlobalUpdate,
          size: globalRulesStats?.size || 0
        },
        synchronization: {
          projectCount: this.projectRoots.length,
          lastSync: lastSync?.lastSync || 'never',
          syncSuccess: lastSync?.syncCount || 0,
          syncErrors: lastSync?.errors.length || 0
        },
        health: this.calculateHealth(state, lastSync),
        recommendations: this.generateRecommendations(state, lastSync)
      };

      return status;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Failed to get governance status', { error: errorMessage });
      throw new Error(`Status check failed: ${errorMessage}`);
    }
  }

  /**
   * 🔍 Auto-discover project roots in workspace
   */
  private async discoverProjectRoots(): Promise<string[]> {
    try {
      // Simplified discovery without glob for now
      const commonProjectPaths = [
        '.',
        './projects',
        './apps',
        '../'
      ].filter(path => existsSync(path));

      return commonProjectPaths.slice(0, 10); // Limit to 10 projects

    } catch (error) {
      logger.warn('Failed to auto-discover project roots', { error });
      return [];
    }
  }

  /**
   * 📄 Create default global rules file
   */
  private async createDefaultGlobalRules(): Promise<void> {
    const defaultContent = `# Global Rules - Secrets Agent Governance

## Version
v1.0.0

## Core Governance Rules

### R001: Secret Security Standards
**Priority:** Critical
**Category:** Security

All secrets must:
- Use strong encryption (SOPS+Age minimum)
- Never appear in logs or error messages
- Have proper access controls
- Follow rotation schedules

### R002: Agent Behavior Standards
**Priority:** High
**Category:** Agent Behavior

All agents must:
- Log all actions for audit trails
- Respect user permissions and access levels
- Fail securely in error conditions
- Provide clear feedback to users

### R003: Project Organization
**Priority:** Medium
**Category:** Organization

Projects must:
- Follow consistent naming conventions
- Maintain proper documentation
- Use standardized categories
- Have proper metadata

## Dynamic Rules
(This section is automatically updated by the system)

---
*Last Updated: ${new Date().toISOString()}*
*Managed by: Secrets Agent Global Rule Manager*
`;

    writeFileSync(this.globalRulesPath, defaultContent, 'utf8');
    logger.info('📄 Created default globalrules.md');
  }

  /**
   * 🎯 Add project-specific header to rules
   */
  private addProjectHeader(content: string, projectRoot: string): string {
    const header = `<!-- 
Project: ${projectRoot}
Synced: ${new Date().toISOString()}
Source: ${this.globalRulesPath}
-->

`;
    return header + content;
  }

  /**
   * 📊 Calculate system health
   */
  private calculateHealth(state: GlobalRuleState, lastSync?: RuleSync): 'healthy' | 'warning' | 'error' {
    if (!lastSync) return 'error';
    if (lastSync.errors.length > 0) return 'warning';
    if (lastSync.syncCount === this.projectRoots.length) return 'healthy';
    return 'warning';
  }

  /**
   * 💡 Generate system recommendations
   */
  private generateRecommendations(state: GlobalRuleState, lastSync?: RuleSync): string[] {
    const recommendations: string[] = [];

    if (!lastSync) {
      recommendations.push('Run initial synchronization');
    }

    if (lastSync?.errors && lastSync.errors.length > 0) {
      recommendations.push('Fix synchronization errors');
    }

    if (state.rules.length < 5) {
      recommendations.push('Add more governance rules');
    }

    const daysSinceUpdate = (Date.now() - new Date(state.lastGlobalUpdate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 30) {
      recommendations.push('Review and update global rules');
    }

    return recommendations;
  }

  // Helper methods for state management, version generation, etc.
  private async loadState(): Promise<GlobalRuleState> {
    if (existsSync(this.statePath)) {
      return JSON.parse(readFileSync(this.statePath, 'utf8'));
    }
    return this.createDefaultState();
  }

  private createDefaultState(): GlobalRuleState {
    return {
      version: '1.0.0',
      rules: [],
      syncHistory: [],
      lastGlobalUpdate: new Date().toISOString()
    };
  }

  private async initializeState(): Promise<void> {
    const state = this.createDefaultState();
    writeFileSync(this.statePath, JSON.stringify(state, null, 2), 'utf8');
  }

  private async updateSyncHistory(sync: RuleSync): Promise<void> {
    const state = await this.loadState();
    state.syncHistory.push(sync);
    state.syncHistory = state.syncHistory.slice(-10); // Keep last 10
    writeFileSync(this.statePath, JSON.stringify(state, null, 2), 'utf8');
  }

  private async getCurrentVersion(): Promise<string> {
    const state = await this.loadState();
    return state.version;
  }

  private generateVersion(): string {
    return `v${Date.now()}`;
  }

  private addRuleToContent(content: string, rule: Partial<GlobalRule>): string {
    // Implementation for adding rules to markdown content
    return content; // Simplified for now
  }

  private removeRuleFromContent(content: string, ruleId: string): string {
    // Implementation for removing rules from markdown content
    return content; // Simplified for now
  }

  private updateVersionInContent(content: string, version: string): string {
    return content.replace(/## Version\n.*/, `## Version\n${version}`);
  }
} 