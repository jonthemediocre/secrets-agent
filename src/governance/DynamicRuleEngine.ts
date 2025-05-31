import { createLogger } from '../utils/logger';
import { readFileSync, writeFileSync, existsSync, mkdirSync, watch } from 'fs';
import { join, dirname } from 'path';

const logger = createLogger('DynamicRuleEngine');

export interface DynamicRule {
  id: string;
  name: string;
  type: 'validation' | 'mutation' | 'behavior' | 'security';
  scope: 'global' | 'project' | 'agent' | 'session';
  condition: string; // JavaScript-like condition
  action: string; // Action to take when condition is met
  priority: number; // 1-100, higher = more important
  enabled: boolean;
  metadata: {
    createdBy: string;
    lastModified: string;
    version: string;
    description?: string;
    tags?: string[];
  };
}

export interface RuleExecutionContext {
  agentId: string;
  agentType: string;
  action: string;
  data: any;
  user: {
    id: string;
    roles: string[];
  };
  project?: {
    name: string;
    category: string;
  };
  timestamp: string;
}

export interface RuleExecutionResult {
  ruleId: string;
  executed: boolean;
  success: boolean;
  action: 'allow' | 'deny' | 'modify' | 'log' | 'notify';
  modifications?: any;
  message?: string;
  executionTime: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  modifications: any[];
}

/**
 * DynamicRuleEngine - Level 2: Dynamic Rule Governance
 * 
 * Provides MDC-style .cursor/rules functionality with agent-bound,
 * runtime adaptive rule sets supporting validation, mutation, and feedback loops.
 */
export class DynamicRuleEngine {
  private rulesPath: string;
  private rules: Map<string, DynamicRule> = new Map();
  private executionHistory: RuleExecutionResult[] = [];
  private watchers: Map<string, any> = new Map();

  constructor(rulesPath: string) {
    this.rulesPath = rulesPath;
  }

  /**
   * 🔄 Level 2: Initialize Dynamic Rule System
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🔄 Initializing Dynamic Rule Engine');

      // Ensure .cursor/rules directory exists
      const rulesDir = dirname(this.rulesPath);
      if (!existsSync(rulesDir)) {
        mkdirSync(rulesDir, { recursive: true });
      }

      // Load existing rules
      await this.loadRules();

      // Set up file watchers for real-time updates
      await this.setupFileWatchers();

      // Create default rules if none exist
      if (this.rules.size === 0) {
        await this.createDefaultRules();
      }

      logger.info('✅ Dynamic Rule Engine initialized', {
        rulesCount: this.rules.size,
        rulesPath: this.rulesPath
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Failed to initialize Dynamic Rule Engine', { error: errorMessage });
      throw new Error(`Dynamic Rule Engine initialization failed: ${errorMessage}`);
    }
  }

  /**
   * 🔍 Execute Rules for Context
   */
  async executeRules(context: RuleExecutionContext): Promise<ValidationResult> {
    try {
      const startTime = Date.now();
      const results: RuleExecutionResult[] = [];
      const validationResult: ValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        modifications: []
      };

      // Get applicable rules
      const applicableRules = this.getApplicableRules(context);

      // Execute rules in priority order
      for (const rule of applicableRules) {
        const ruleResult = await this.executeRule(rule, context);
        results.push(ruleResult);

        // Apply rule result to validation
        if (!ruleResult.success) {
          validationResult.valid = false;
          validationResult.errors.push(ruleResult.message || `Rule ${rule.id} failed`);
        }

        if (ruleResult.action === 'deny') {
          validationResult.valid = false;
          validationResult.errors.push(`Access denied by rule: ${rule.name}`);
        }

        if (ruleResult.action === 'modify' && ruleResult.modifications) {
          validationResult.modifications.push(ruleResult.modifications);
        }

        if (ruleResult.message && ruleResult.action !== 'deny') {
          validationResult.warnings.push(ruleResult.message);
        }
      }

      // Store execution history
      this.executionHistory.push(...results);
      this.executionHistory = this.executionHistory.slice(-1000); // Keep last 1000

      const executionTime = Date.now() - startTime;
      logger.debug('🔍 Rules executed', {
        contextAgent: context.agentId,
        rulesExecuted: results.length,
        valid: validationResult.valid,
        executionTime
      });

      return validationResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Rule execution failed', {
        contextAgent: context.agentId,
        error: errorMessage
      });
      throw new Error(`Rule execution failed: ${errorMessage}`);
    }
  }

  /**
   * 📝 Add Dynamic Rule
   */
  async addRule(rule: Omit<DynamicRule, 'id' | 'metadata'>): Promise<string> {
    try {
      const ruleId = this.generateRuleId();
      const dynamicRule: DynamicRule = {
        ...rule,
        id: ruleId,
        metadata: {
          createdBy: 'system', // TODO: Get from context
          lastModified: new Date().toISOString(),
          version: '1.0.0',
          description: rule.name,
          tags: []
        }
      };

      this.rules.set(ruleId, dynamicRule);
      await this.saveRules();

      logger.info('📝 Dynamic rule added', {
        ruleId,
        name: rule.name,
        type: rule.type,
        scope: rule.scope
      });

      return ruleId;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Failed to add dynamic rule', { error: errorMessage });
      throw new Error(`Add rule failed: ${errorMessage}`);
    }
  }

  /**
   * 🔧 Update Dynamic Rule
   */
  async updateRule(ruleId: string, updates: Partial<DynamicRule>): Promise<void> {
    try {
      const existingRule = this.rules.get(ruleId);
      if (!existingRule) {
        throw new Error(`Rule not found: ${ruleId}`);
      }

      const updatedRule: DynamicRule = {
        ...existingRule,
        ...updates,
        id: ruleId, // Preserve ID
        metadata: {
          ...existingRule.metadata,
          lastModified: new Date().toISOString(),
          version: this.incrementVersion(existingRule.metadata.version)
        }
      };

      this.rules.set(ruleId, updatedRule);
      await this.saveRules();

      logger.info('🔧 Dynamic rule updated', {
        ruleId,
        name: updatedRule.name,
        version: updatedRule.metadata.version
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Failed to update dynamic rule', { ruleId, error: errorMessage });
      throw new Error(`Update rule failed: ${errorMessage}`);
    }
  }

  /**
   * 🗑️ Remove Dynamic Rule
   */
  async removeRule(ruleId: string): Promise<void> {
    try {
      const rule = this.rules.get(ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${ruleId}`);
      }

      this.rules.delete(ruleId);
      await this.saveRules();

      logger.info('🗑️ Dynamic rule removed', {
        ruleId,
        name: rule.name
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('❌ Failed to remove dynamic rule', { ruleId, error: errorMessage });
      throw new Error(`Remove rule failed: ${errorMessage}`);
    }
  }

  /**
   * 📊 Get Rule Analytics
   */
  async getRuleAnalytics(): Promise<{
    totalRules: number;
    rulesByType: Record<string, number>;
    rulesByScope: Record<string, number>;
    executionStats: {
      totalExecutions: number;
      successRate: number;
      averageExecutionTime: number;
      mostTriggeredRules: Array<{ ruleId: string; count: number }>;
    };
    recentActivity: RuleExecutionResult[];
  }> {
    const rules = Array.from(this.rules.values());
    
    const analytics = {
      totalRules: rules.length,
      rulesByType: this.groupBy(rules, 'type'),
      rulesByScope: this.groupBy(rules, 'scope'),
      executionStats: {
        totalExecutions: this.executionHistory.length,
        successRate: this.calculateSuccessRate(),
        averageExecutionTime: this.calculateAverageExecutionTime(),
        mostTriggeredRules: this.getMostTriggeredRules()
      },
      recentActivity: this.executionHistory.slice(-10)
    };

    return analytics;
  }

  /**
   * 🎯 Get applicable rules for context
   */
  private getApplicableRules(context: RuleExecutionContext): DynamicRule[] {
    const rules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .filter(rule => this.isRuleApplicable(rule, context))
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    return rules;
  }

  /**
   * ⚡ Execute single rule
   */
  private async executeRule(rule: DynamicRule, context: RuleExecutionContext): Promise<RuleExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Evaluate condition
      const conditionMet = this.evaluateCondition(rule.condition, context);
      
      if (!conditionMet) {
        return {
          ruleId: rule.id,
          executed: false,
          success: true,
          action: 'allow',
          executionTime: Date.now() - startTime
        };
      }

      // Execute action
      const actionResult = this.executeAction(rule.action, context);

      return {
        ruleId: rule.id,
        executed: true,
        success: actionResult.success,
        action: actionResult.action,
        modifications: actionResult.modifications,
        message: actionResult.message,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        ruleId: rule.id,
        executed: true,
        success: false,
        action: 'deny',
        message: `Rule execution error: ${error}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 🔍 Check if rule is applicable to context
   */
  private isRuleApplicable(rule: DynamicRule, context: RuleExecutionContext): boolean {
    // Scope-based filtering
    switch (rule.scope) {
      case 'global':
        return true;
      case 'project':
        return !!context.project;
      case 'agent':
        return true; // All contexts have agents
      case 'session':
        return true; // All contexts are in a session
      default:
        return false;
    }
  }

  /**
   * 🧮 Evaluate rule condition
   */
  private evaluateCondition(condition: string, context: RuleExecutionContext): boolean {
    try {
      // Simple condition evaluation (can be enhanced with a proper expression engine)
      // For now, support basic patterns
      
      if (condition === 'true') return true;
      if (condition === 'false') return false;
      
      // Agent type conditions
      if (condition.includes('agentType')) {
        return condition.includes(context.agentType);
      }
      
      // Action conditions
      if (condition.includes('action')) {
        return condition.includes(context.action);
      }
      
      // User role conditions
      if (condition.includes('userRole')) {
        return context.user.roles.some(role => condition.includes(role));
      }

      // Default to true for now
      return true;

    } catch (error) {
      logger.warn('Condition evaluation failed', { condition, error });
      return false;
    }
  }

  /**
   * ⚡ Execute rule action
   */
  private executeAction(action: string, context: RuleExecutionContext): {
    success: boolean;
    action: 'allow' | 'deny' | 'modify' | 'log' | 'notify';
    modifications?: any;
    message?: string;
  } {
    try {
      // Parse action (simple format for now)
      if (action === 'allow') {
        return { success: true, action: 'allow' };
      }
      
      if (action === 'deny') {
        return { success: true, action: 'deny', message: 'Access denied by rule' };
      }
      
      if (action.startsWith('log:')) {
        const message = action.substring(4);
        logger.info('Rule action log', { message, context: context.agentId });
        return { success: true, action: 'log', message };
      }
      
      if (action.startsWith('modify:')) {
        // Simple modification example
        return {
          success: true,
          action: 'modify',
          modifications: { modified: true, timestamp: new Date().toISOString() }
        };
      }

      // Default allow
      return { success: true, action: 'allow' };

    } catch (error) {
      return {
        success: false,
        action: 'deny',
        message: `Action execution failed: ${error}`
      };
    }
  }

  /**
   * 💾 Load rules from file
   */
  private async loadRules(): Promise<void> {
    try {
      if (existsSync(this.rulesPath)) {
        const content = readFileSync(this.rulesPath, 'utf8');
        const rulesData = JSON.parse(content);
        
        this.rules.clear();
        for (const ruleData of rulesData.rules || []) {
          this.rules.set(ruleData.id, ruleData);
        }
        
        logger.debug('Rules loaded from file', { count: this.rules.size });
      }
    } catch (error) {
      logger.warn('Failed to load rules from file', { error });
    }
  }

  /**
   * 💾 Save rules to file
   */
  private async saveRules(): Promise<void> {
    try {
      const rulesData = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        rules: Array.from(this.rules.values())
      };
      
      writeFileSync(this.rulesPath, JSON.stringify(rulesData, null, 2), 'utf8');
      logger.debug('Rules saved to file', { count: this.rules.size });
      
    } catch (error) {
      logger.error('Failed to save rules to file', { error });
    }
  }

  /**
   * 👀 Setup file watchers for real-time updates
   */
  private async setupFileWatchers(): Promise<void> {
    try {
      if (existsSync(this.rulesPath)) {
        const watcher = watch(this.rulesPath, async () => {
          logger.info('Rules file changed, reloading...');
          await this.loadRules();
        });
        
        this.watchers.set('rules', watcher);
      }
    } catch (error) {
      logger.warn('Failed to setup file watchers', { error });
    }
  }

  /**
   * 📄 Create default rules
   */
  private async createDefaultRules(): Promise<void> {
    const defaultRules: Omit<DynamicRule, 'id' | 'metadata'>[] = [
      {
        name: 'Secret Access Audit',
        type: 'behavior',
        scope: 'global',
        condition: 'action.includes("secret_read")',
        action: 'log:Secret accessed',
        priority: 90,
        enabled: true
      },
      {
        name: 'Admin Only Dangerous Operations',
        type: 'security',
        scope: 'global',
        condition: 'action.includes("delete") && !userRole.includes("admin")',
        action: 'deny',
        priority: 95,
        enabled: true
      },
      {
        name: 'Auto-Categorize Secrets',
        type: 'mutation',
        scope: 'project',
        condition: 'action === "secret_create"',
        action: 'modify:auto_categorize',
        priority: 50,
        enabled: true
      }
    ];

    for (const rule of defaultRules) {
      await this.addRule(rule);
    }

    logger.info('📄 Created default dynamic rules', { count: defaultRules.length });
  }

  // Helper methods
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private groupBy<T extends Record<string, any>>(array: T[], key: keyof T): Record<string, number> {
    const result: Record<string, number> = {};
    for (const item of array) {
      const value = String(item[key]);
      result[value] = (result[value] || 0) + 1;
    }
    return result;
  }

  private calculateSuccessRate(): number {
    if (this.executionHistory.length === 0) return 100;
    const successful = this.executionHistory.filter(r => r.success).length;
    return (successful / this.executionHistory.length) * 100;
  }

  private calculateAverageExecutionTime(): number {
    if (this.executionHistory.length === 0) return 0;
    const total = this.executionHistory.reduce((sum, r) => sum + r.executionTime, 0);
    return total / this.executionHistory.length;
  }

  private getMostTriggeredRules(): Array<{ ruleId: string; count: number }> {
    const counts = new Map<string, number>();
    for (const result of this.executionHistory) {
      if (result.executed) {
        counts.set(result.ruleId, (counts.get(result.ruleId) || 0) + 1);
      }
    }
    
    return Array.from(counts.entries())
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
} 