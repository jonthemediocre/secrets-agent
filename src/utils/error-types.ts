export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  DATABASE = 'database',
  CONFIGURATION = 'configuration',
  INITIALIZATION = 'initialization',
  RUNTIME = 'runtime',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorMetadata {
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  source?: string;
  details?: Record<string, any>;
}

export class BaseError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly source?: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, metadata: ErrorMetadata) {
    super(message);
    this.name = this.constructor.name;
    this.category = metadata.category;
    this.severity = metadata.severity;
    this.retryable = metadata.retryable;
    this.source = metadata.source;
    this.details = metadata.details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      retryable: this.retryable,
      source: this.source,
      details: this.details,
      stack: this.stack
    };
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      details
    });
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      details
    });
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      details
    });
  }
}

export class NetworkError extends BaseError {
  constructor(message: string, retryable = true, details?: Record<string, any>) {
    super(message, {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      retryable,
      details
    });
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, retryable = true, details?: Record<string, any>) {
    super(message, {
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.HIGH,
      retryable,
      details
    });
  }
}

export class ConfigurationError extends BaseError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, {
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      details
    });
  }
}

export class InitializationError extends BaseError {
  constructor(message: string, retryable = true, details?: Record<string, any>) {
    super(message, {
      category: ErrorCategory.INITIALIZATION,
      severity: ErrorSeverity.HIGH,
      retryable,
      details
    });
  }
}

export class RuntimeError extends BaseError {
  constructor(message: string, retryable = false, details?: Record<string, any>) {
    super(message, {
      category: ErrorCategory.RUNTIME,
      severity: ErrorSeverity.HIGH,
      retryable,
      details
    });
  }
} 