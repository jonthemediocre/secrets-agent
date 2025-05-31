import { createLogger } from '../utils/logger';
import { writeFileSync, readFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import fs from 'fs/promises';
import path from 'path';
import { AccessLogEntry, AccessLogServiceInterface } from './interfaces';

const logger = createLogger('AccessLogService');

export type AccessAction =
  | 'secret_read'
  | 'secret_write'
  | 'secret_update'
  | 'secret_delete'
  | 'project_create'
  | 'project_delete'
  | 'vault_unlock'
  | 'vault_lock'
  | 'export_env'
  | 'import_env'
  | 'secret_search'
  | 'backup_create'
  | 'backup_restore';

export interface AccessLogQuery {
  startDate?: string;
  endDate?: string;
  userId?: string;
  projectName?: string;
  action?: AccessAction;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface AccessLogStats {
  totalEvents: number;
  successRate: number;
  topUsers: Array<{ userId: string; count: number }>;
  topActions: Array<{ action: AccessAction; count: number }>;
  recentActivity: AccessLogEntry[];
  dailyActivity: Array<{ date: string; count: number }>;
}

/**
 * AccessLogService - Comprehensive audit trail and access logging
 * 
 * Provides enterprise-grade audit capabilities for compliance,
 * security monitoring, and operational visibility.
 */
export class AccessLogService implements AccessLogServiceInterface {
  private logFilePath: string;
  private rotationSize: number;
  private retentionDays: number;

  constructor(options: {
    logFilePath: string;
    rotationSize?: number; // MB
    retentionDays?: number;
  }) {
    this.logFilePath = path.resolve(options.logFilePath);
    this.rotationSize = options.rotationSize || 100; // 100MB default
    this.retentionDays = options.retentionDays || 90; // 90 days default
  }

  /**
   * Log an access event
   * 
   * @param entry Access log entry to record
   */
  async logAccess(entry: AccessLogEntry): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        ...entry,
        timestamp: timestamp
      };

      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.logFilePath, logLine);
      
      const action = entry.action || entry.operation || 'unknown';
      const project = entry.projectName || entry.appId || 'unknown';
      console.log(`📋 Access logged: ${action} for ${project}`);
      
    } catch (error) {
      console.error('❌ Failed to log access:', error);
      throw error;
    }
  }

  /**
   * Get access logs with optional filtering
   * 
   * @param filters Optional filters to apply
   * @returns Filtered access log entries
   */
  async getAccessLogs(filters?: any): Promise<AccessLogEntry[]> {
    try {
      if (!existsSync(this.logFilePath)) {
        return [];
      }

      const logContent = await fs.readFile(this.logFilePath, 'utf-8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      const logs = lines.map(line => {
        try {
          return JSON.parse(line) as AccessLogEntry;
        } catch (error) {
          console.warn('Failed to parse log line:', line);
          return null;
        }
      }).filter(log => log !== null) as AccessLogEntry[];

      // Apply basic filters if provided
      if (filters) {
        let filtered = logs;

        if (filters.userId) {
          filtered = filtered.filter(log => log.userId === filters.userId);
        }

        if (filters.projectName) {
          filtered = filtered.filter(log => 
            log.projectName === filters.projectName || log.appId === filters.projectName
          );
        }

        if (filters.action) {
          filtered = filtered.filter(log => 
            log.action === filters.action || log.operation === filters.action
          );
        }

        return filtered;
      }

      return logs;

    } catch (error) {
      console.error('❌ Failed to get access logs:', error);
      return [];
    }
  }

  /**
   * Query access logs with filtering and pagination
   * 
   * @param query Query parameters
   * @returns Filtered access log entries
   */
  async queryLogs(query: AccessLogQuery = {}): Promise<AccessLogEntry[]> {
    try {
      const logContent = await fs.readFile(this.logFilePath, 'utf-8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      const logs = lines.map(line => JSON.parse(line) as AccessLogEntry);
      
      // Apply filters
      let filtered = logs;

      if (query.startDate) {
        const startTime = new Date(query.startDate).getTime();
        filtered = filtered.filter(log => {
          const logTime = log.timestamp ? new Date(log.timestamp).getTime() : 0;
          return logTime >= startTime;
        });
      }

      if (query.endDate) {
        const endTime = new Date(query.endDate).getTime();
        filtered = filtered.filter(log => {
          const logTime = log.timestamp ? new Date(log.timestamp).getTime() : 0;
          return logTime <= endTime;
        });
      }

      if (query.userId) {
        filtered = filtered.filter(log => log.userId === query.userId);
      }

      if (query.projectName) {
        filtered = filtered.filter(log => 
          log.projectName === query.projectName || log.appId === query.projectName
        );
      }

      if (query.action) {
        filtered = filtered.filter(log => 
          log.action === query.action || log.operation === query.action
        );
      }

      if (query.success !== undefined) {
        filtered = filtered.filter(log => log.success === query.success);
      }

      // Sort by timestamp (newest first)
      filtered.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 100;
      
      return filtered.slice(offset, offset + limit);

    } catch (error) {
      console.error('❌ Failed to query access logs:', error);
      return [];
    }
  }

  /**
   * Generate access statistics and analytics
   * 
   * @param days Number of days to analyze (default: 30)
   * @returns Comprehensive access statistics
   */
  async generateStats(days = 30): Promise<AccessLogStats> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const logs = await this.queryLogs({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 10000 // Large limit for stats
      });

      const stats: AccessLogStats = {
        totalEvents: logs.length,
        successRate: logs.length > 0 ? (logs.filter(l => l.success).length / logs.length) * 100 : 0,
        topUsers: this.calculateTopUsers(logs),
        topActions: this.calculateTopActions(logs),
        recentActivity: logs.slice(0, 10), // Last 10 events
        dailyActivity: this.calculateDailyActivity(logs, days)
      };

      return stats;

    } catch (error) {
      console.error('❌ Failed to generate access statistics:', error);
      throw new Error('Stats generation failed');
    }
  }

  /**
   * Export logs for compliance or external analysis
   * 
   * @param outputPath Output file path
   * @param query Optional query to filter exports
   * @returns Path to exported file
   */
  async exportLogs(outputPath: string, query?: AccessLogQuery): Promise<string> {
    try {
      const logs = await this.queryLogs(query);
      
      // Create CSV format for easy analysis
      let csvContent = 'Timestamp,UserId,UserName,Action,ProjectName,SecretKey,Success,IpAddress,ErrorMessage\n';
      
      for (const log of logs) {
        const row = [
          log.timestamp || '',
          log.userId || '',
          log.userName || '',
          log.action || log.operation || '',
          log.projectName || log.appId || '',
          log.secretKey ? '[REDACTED]' : '',
          log.success?.toString() || 'false',
          log.ipAddress || '',
          log.errorMessage || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        
        csvContent += row + '\n';
      }

      await fs.writeFile(outputPath, csvContent, 'utf8');

      logger.info('Access logs exported', {
        outputPath,
        recordCount: logs.length
      });

      return outputPath;

    } catch (error) {
      console.error('❌ Failed to export access logs:', error);
      throw new Error('Log export failed');
    }
  }

  /**
   * Clean up old log files based on retention policy
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000));
      
      // Read all logs and filter out old ones
      const logs = await this.queryLogs();
      const recentLogs = logs.filter(log => {
        if (!log.timestamp) return false;
        return new Date(log.timestamp).getTime() > cutoffDate.getTime();
      });

      // Rewrite log file with only recent logs
      const logContent = recentLogs.map(log => JSON.stringify(log)).join('\n') + '\n';
      await fs.writeFile(this.logFilePath, logContent, 'utf8');

      logger.info('Old logs cleaned up', {
        originalCount: logs.length,
        retainedCount: recentLogs.length,
        retentionDays: this.retentionDays
      });

    } catch (error) {
      console.error('❌ Failed to cleanup old logs:', error);
    }
  }

  /**
   * Calculate top users by activity
   */
  private calculateTopUsers(logs: AccessLogEntry[]): Array<{ userId: string; count: number }> {
    const userCounts = new Map<string, number>();
    
    for (const log of logs) {
      const userId = log.userId || 'unknown';
      userCounts.set(userId, (userCounts.get(userId) || 0) + 1);
    }

    return Array.from(userCounts.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Calculate top actions by frequency
   */
  private calculateTopActions(logs: AccessLogEntry[]): Array<{ action: AccessAction; count: number }> {
    const actionCounts = new Map<string, number>();
    
    for (const log of logs) {
      const action = log.action || log.operation || 'unknown';
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
    }

    return Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action: action as AccessAction, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Calculate daily activity for charting
   */
  private calculateDailyActivity(logs: AccessLogEntry[], days: number): Array<{ date: string; count: number }> {
    const dailyCounts = new Map<string, number>();
    
    // Initialize all days to 0
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
      const dateKey = date.toISOString().split('T')[0];
      dailyCounts.set(dateKey, 0);
    }

    // Count actual activity
    for (const log of logs) {
      if (log.timestamp) {
        const dateKey = log.timestamp.split('T')[0];
        if (dailyCounts.has(dateKey)) {
          dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
        }
      }
    }

    return Array.from(dailyCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
} 