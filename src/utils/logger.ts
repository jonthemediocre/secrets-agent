// Simple logger implementation
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogData {
  [key: string]: string | number | boolean | null | undefined | object;
}

export interface Logger {
  debug(message: string, data?: LogData): void;
  info(message: string, data?: LogData): void;
  warn(message: string, data?: LogData): void;
  error(message: string, data?: LogData): void;
}

class SimpleLogger implements Logger {
  constructor(private context: string) {}

  private formatMessage(level: LogLevel, message: string, data?: LogData): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`;
    
    if (data && Object.keys(data).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
  }

  debug(message: string, data?: LogData): void {
    if (process.env.NODE_ENV === 'development') {
      // Only output debug logs in development
      const formatted = this.formatMessage('debug', message, data);
      // Use console directly for logger to avoid circular dependencies
      // eslint-disable-next-line no-console
      console.log(formatted);
    }
  }

  info(message: string, data?: LogData): void {
    const formatted = this.formatMessage('info', message, data);
    // eslint-disable-next-line no-console
    console.log(formatted);
  }

  warn(message: string, data?: LogData): void {
    const formatted = this.formatMessage('warn', message, data);
    // eslint-disable-next-line no-console
    console.warn(formatted);
  }

  error(message: string, data?: LogData): void {
    const formatted = this.formatMessage('error', message, data);
    // eslint-disable-next-line no-console
    console.error(formatted);
  }
}

export function createLogger(context: string): Logger {
  return new SimpleLogger(context);
} 