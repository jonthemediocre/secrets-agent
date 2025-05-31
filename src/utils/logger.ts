import { SecurityValidator } from './security';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  AUDIT = 'audit'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  action?: string;
  resource?: string;
  success?: boolean;
  duration?: number;
  errorCode?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface LoggerConfig {
  level: LogLevel;
  maskSensitiveData: boolean;
  includeStackTrace: boolean;
  auditEnabled: boolean;
  outputFormat: 'json' | 'text';
  destination: 'console' | 'file' | 'both';
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  maskSensitiveData: true,
  includeStackTrace: false,
  auditEnabled: true,
  outputFormat: 'json',
  destination: 'console'
};

class Logger {
  private config: LoggerConfig;
  private auditEntries: LogEntry[] = [];
  private maxAuditEntries = 10000;

  constructor(
    private module: string,
    config: Partial<LoggerConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  debug(message: string, data?: Record<string, any>, context?: Partial<LogEntry>): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  info(message: string, data?: Record<string, any>, context?: Partial<LogEntry>): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  warn(message: string, data?: Record<string, any>, context?: Partial<LogEntry>): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  error(message: string, data?: Record<string, any>, context?: Partial<LogEntry>): void {
    this.log(LogLevel.ERROR, message, data, context);
  }

  /**
   * Audit logging for security-critical events
   */
  audit(action: string, details: {
    userId?: string;
    sessionId?: string;
    resource?: string;
    success: boolean;
    ip?: string;
    userAgent?: string;
    data?: Record<string, any>;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    duration?: number;
  }): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.AUDIT,
      module: this.module,
      message: `Audit: ${action}`,
      action,
      ...details,
      data: this.config.maskSensitiveData && details.data 
        ? SecurityValidator.maskSensitiveData(details.data)
        : details.data
    };

    // Store audit entries in memory for query capabilities
    if (this.config.auditEnabled) {
      this.auditEntries.push(entry);
      
      // Rotate audit entries if exceeding max
      if (this.auditEntries.length > this.maxAuditEntries) {
        this.auditEntries = this.auditEntries.slice(-this.maxAuditEntries / 2);
      }
    }

    this.output(entry);
  }

  /**
   * Security event logging
   */
  security(event: string, details: {
    userId?: string;
    sessionId?: string;
    ip?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    threat?: string;
    blocked?: boolean;
    data?: Record<string, any>;
  }): void {
    this.audit(`Security Event: ${event}`, {
      ...details,
      success: details.blocked !== false // Default to success unless explicitly blocked
    });
  }

  /**
   * Performance logging with duration tracking
   */
  performance(operation: string, duration: number, details?: {
    userId?: string;
    resource?: string;
    success?: boolean;
    data?: Record<string, any>;
  }): void {
    const severity = duration > 5000 ? 'high' : duration > 1000 ? 'medium' : 'low';
    
    this.audit(`Performance: ${operation}`, {
      duration,
      severity,
      success: true,
      ...details
    });
  }

  /**
   * Query audit logs
   */
  queryAuditLogs(filters: {
    userId?: string;
    action?: string;
    success?: boolean;
    severity?: string;
    fromTime?: Date;
    toTime?: Date;
    limit?: number;
  } = {}): LogEntry[] {
    let filtered = [...this.auditEntries];

    if (filters.userId) {
      filtered = filtered.filter(entry => entry.userId === filters.userId);
    }

    if (filters.action) {
      filtered = filtered.filter(entry => 
        entry.action?.toLowerCase().includes(filters.action!.toLowerCase())
      );
    }

    if (filters.success !== undefined) {
      filtered = filtered.filter(entry => entry.success === filters.success);
    }

    if (filters.severity) {
      filtered = filtered.filter(entry => entry.severity === filters.severity);
    }

    if (filters.fromTime) {
      filtered = filtered.filter(entry => 
        new Date(entry.timestamp) >= filters.fromTime!
      );
    }

    if (filters.toTime) {
      filtered = filtered.filter(entry => 
        new Date(entry.timestamp) <= filters.toTime!
      );
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const limit = filters.limit || 100;
    return filtered.slice(0, limit);
  }

  /**
   * Get security alerts (high/critical severity events)
   */
  getSecurityAlerts(limit = 50): LogEntry[] {
    return this.auditEntries
      .filter(entry => 
        entry.level === LogLevel.AUDIT && 
        (entry.severity === 'high' || entry.severity === 'critical')
      )
      .sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Get failed operations for monitoring
   */
  getFailedOperations(hours = 24, limit = 100): LogEntry[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.auditEntries
      .filter(entry => 
        entry.success === false &&
        new Date(entry.timestamp) >= cutoffTime
      )
      .sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: Record<string, any>, context?: Partial<LogEntry>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      ...context
    };

    // Mask sensitive data if enabled
    if (data) {
      entry.data = this.config.maskSensitiveData 
        ? SecurityValidator.maskSensitiveData(data)
        : data;
    }

    // Add stack trace for errors if enabled
    if (level === LogLevel.ERROR && this.config.includeStackTrace) {
      const stack = new Error().stack;
      if (stack) {
        entry.data = { ...entry.data, stack };
      }
    }

    this.output(entry);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.AUDIT];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    
    // Always log audit messages
    if (level === LogLevel.AUDIT) {
      return true;
    }
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private output(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);
    
    switch (this.config.destination) {
      case 'console':
        this.outputToConsole(formatted, entry.level);
        break;
      case 'file':
        this.outputToFile(formatted);
        break;
      case 'both':
        this.outputToConsole(formatted, entry.level);
        this.outputToFile(formatted);
        break;
    }
  }

  private formatEntry(entry: LogEntry): string {
    if (this.config.outputFormat === 'json') {
      return JSON.stringify(entry);
    }
    
    // Text format
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const module = `[${entry.module}]`.padEnd(15);
    
    let line = `${timestamp} ${level} ${module} ${entry.message}`;
    
    if (entry.data) {
      line += ` | ${JSON.stringify(entry.data)}`;
    }
    
    if (entry.userId) {
      line += ` | User: ${entry.userId}`;
    }
    
    if (entry.action) {
      line += ` | Action: ${entry.action}`;
    }
    
    return line;
  }

  private outputToConsole(formatted: string, level: LogLevel): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
      case LogLevel.AUDIT:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  private outputToFile(formatted: string): void {
    // In a real implementation, this would write to a file
    // For now, we'll just use console as a placeholder
    console.log(formatted);
  }
}

// Global logger instances
const loggers = new Map<string, Logger>();

/**
 * Create or get a logger instance for a module
 */
export function createLogger(module: string, config?: Partial<LoggerConfig>): Logger {
  const key = `${module}_${JSON.stringify(config || {})}`;
  
  if (!loggers.has(key)) {
    loggers.set(key, new Logger(module, config));
  }
  
  return loggers.get(key)!;
}

/**
 * Global audit logger for system-wide events
 */
export const auditLogger = createLogger('AUDIT', {
  level: LogLevel.AUDIT,
  auditEnabled: true,
  maskSensitiveData: true
});

/**
 * Security logger for threat detection and security events
 */
export const securityLogger = createLogger('SECURITY', {
  level: LogLevel.INFO,
  auditEnabled: true,
  maskSensitiveData: true,
  includeStackTrace: true
});

/**
 * Performance logger for monitoring system performance
 */
export const performanceLogger = createLogger('PERFORMANCE', {
  level: LogLevel.INFO,
  auditEnabled: true
});

/**
 * Middleware to add request context to logs
 */
export function addRequestContext(
  userId?: string,
  sessionId?: string,
  requestId?: string,
  ip?: string,
  userAgent?: string
) {
  return {
    userId,
    sessionId,
    requestId,
    ip,
    userAgent
  };
}

/**
 * Timer utility for performance logging
 */
export class Timer {
  private startTime: number;

  constructor(private label: string, private logger: Logger) {
    this.startTime = Date.now();
  }

  end(details?: {
    userId?: string;
    resource?: string;
    success?: boolean;
    data?: Record<string, any>;
  }): number {
    const duration = Date.now() - this.startTime;
    this.logger.performance(this.label, duration, details);
    return duration;
  }
}

/**
 * Create a timer for performance tracking
 */
export function startTimer(label: string, logger?: Logger): Timer {
  return new Timer(label, logger || performanceLogger);
} 