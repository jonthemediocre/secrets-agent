#!/usr/bin/env python3
"""
Python Logger Utility for VANTA Secrets Agent
Based on the TypeScript logger.ts structure
"""

import logging
import json
import time
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Union
from enum import Enum
from dataclasses import dataclass, asdict, field


class LogLevel(Enum):
    DEBUG = 'debug'
    INFO = 'info'
    WARN = 'warn'
    ERROR = 'error'
    AUDIT = 'audit'


@dataclass
class LogEntry:
    timestamp: str
    level: LogLevel
    module: str
    message: str
    data: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    action: Optional[str] = None
    resource: Optional[str] = None
    success: Optional[bool] = None
    duration: Optional[float] = None
    error_code: Optional[str] = None
    severity: Optional[str] = None


@dataclass
class LoggerConfig:
    level: LogLevel = LogLevel.INFO
    mask_sensitive_data: bool = True
    include_stack_trace: bool = False
    audit_enabled: bool = True
    output_format: str = 'json'  # 'json' or 'text'
    destination: str = 'console'  # 'console', 'file', or 'both'
    file_path: Optional[str] = None
    max_file_size: Optional[int] = None
    max_files: Optional[int] = None


class Logger:
    """
    Python Logger implementation based on TypeScript logger.ts
    
    Provides structured logging with audit capabilities, security logging,
    and performance tracking.
    """
    
    def __init__(self, module: str, config: Optional[LoggerConfig] = None):
        self.module = module
        self.config = config or LoggerConfig()
        self.audit_entries: List[LogEntry] = []
        self.max_audit_entries = 10000
        
        # Setup Python logging
        self._setup_python_logger()
    
    def _setup_python_logger(self):
        """Setup the underlying Python logger"""
        self._logger = logging.getLogger(self.module)
        self._logger.setLevel(self._get_python_log_level(self.config.level))
        
        # Create handler if none exists
        if not self._logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self._logger.addHandler(handler)
    
    def _get_python_log_level(self, level: LogLevel) -> int:
        """Convert LogLevel to Python logging level"""
        mapping = {
            LogLevel.DEBUG: logging.DEBUG,
            LogLevel.INFO: logging.INFO,
            LogLevel.WARN: logging.WARNING,
            LogLevel.ERROR: logging.ERROR,
            LogLevel.AUDIT: logging.INFO
        }
        return mapping.get(level, logging.INFO)
    
    def debug(self, message: str, data: Optional[Dict[str, Any]] = None, context: Optional[Dict[str, Any]] = None):
        """Log debug message"""
        self.log(LogLevel.DEBUG, message, data, context)
    
    def info(self, message: str, data: Optional[Dict[str, Any]] = None, context: Optional[Dict[str, Any]] = None):
        """Log info message"""
        self.log(LogLevel.INFO, message, data, context)
    
    def warn(self, message: str, data: Optional[Dict[str, Any]] = None, context: Optional[Dict[str, Any]] = None):
        """Log warning message"""
        self.log(LogLevel.WARN, message, data, context)
    
    def error(self, message: str, data: Optional[Dict[str, Any]] = None, context: Optional[Dict[str, Any]] = None):
        """Log error message"""
        self.log(LogLevel.ERROR, message, data, context)
    
    def audit(self, action: str, details: Dict[str, Any]):
        """
        Audit logging for security-critical events
        
        Args:
            action: The action being audited
            details: Dictionary containing audit details like user_id, success, etc.
        """
        entry = LogEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            level=LogLevel.AUDIT,
            module=self.module,
            message=f"Audit: {action}",
            action=action,
            **details
        )
        
        # Mask sensitive data if enabled
        if self.config.mask_sensitive_data and entry.data:
            entry.data = self._mask_sensitive_data(entry.data)
        
        # Store audit entries in memory for query capabilities
        if self.config.audit_enabled:
            self.audit_entries.append(entry)
            
            # Rotate audit entries if exceeding max
            if len(self.audit_entries) > self.max_audit_entries:
                self.audit_entries = self.audit_entries[-self.max_audit_entries // 2:]
        
        self._output(entry)
    
    def security(self, event: str, details: Dict[str, Any]):
        """
        Security event logging
        
        Args:
            event: Security event description
            details: Security event details including severity, threat, etc.
        """
        self.audit(f"Security Event: {event}", {
            **details,
            'success': details.get('blocked', True) is not False
        })
    
    def performance(self, operation: str, duration: float, details: Optional[Dict[str, Any]] = None):
        """
        Performance logging with duration tracking
        
        Args:
            operation: Operation name
            duration: Duration in milliseconds
            details: Additional performance details
        """
        if duration > 5000:
            severity = 'high'
        elif duration > 1000:
            severity = 'medium'
        else:
            severity = 'low'
        
        audit_details = {
            'duration': duration,
            'severity': severity,
            'success': True,
            **(details or {})
        }
        
        self.audit(f"Performance: {operation}", audit_details)
    
    def query_audit_logs(self, filters: Optional[Dict[str, Any]] = None) -> List[LogEntry]:
        """
        Query audit logs with optional filters
        
        Args:
            filters: Dictionary of filters (user_id, action, success, severity, etc.)
        
        Returns:
            List of filtered audit log entries
        """
        filters = filters or {}
        filtered = list(self.audit_entries)
        
        if 'user_id' in filters:
            filtered = [e for e in filtered if e.user_id == filters['user_id']]
        
        if 'action' in filters:
            action_filter = filters['action'].lower()
            filtered = [e for e in filtered if e.action and action_filter in e.action.lower()]
        
        if 'success' in filters:
            filtered = [e for e in filtered if e.success == filters['success']]
        
        if 'severity' in filters:
            filtered = [e for e in filtered if e.severity == filters['severity']]
        
        # Sort by timestamp descending (newest first)
        filtered.sort(key=lambda x: x.timestamp, reverse=True)
        
        limit = filters.get('limit', 100)
        return filtered[:limit]
    
    def get_security_alerts(self, limit: int = 50) -> List[LogEntry]:
        """Get security alerts (high/critical severity events)"""
        alerts = [
            entry for entry in self.audit_entries
            if entry.level == LogLevel.AUDIT and entry.severity in ['high', 'critical']
        ]
        alerts.sort(key=lambda x: x.timestamp, reverse=True)
        return alerts[:limit]
    
    def get_failed_operations(self, hours: int = 24, limit: int = 100) -> List[LogEntry]:
        """Get failed operations for monitoring"""
        cutoff_time = datetime.now(timezone.utc).timestamp() - (hours * 3600)
        
        failed_ops = [
            entry for entry in self.audit_entries
            if entry.success is False and 
            datetime.fromisoformat(entry.timestamp.replace('Z', '+00:00')).timestamp() >= cutoff_time
        ]
        failed_ops.sort(key=lambda x: x.timestamp, reverse=True)
        return failed_ops[:limit]
    
    def log(self, level: LogLevel, message: str, data: Optional[Dict[str, Any]] = None, context: Optional[Dict[str, Any]] = None):
        """
        Core logging method
        
        Args:
            level: Log level
            message: Log message
            data: Additional data to log
            context: Context information (user_id, session_id, etc.)
        """
        if not self._should_log(level):
            return
        
        entry = LogEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            level=level,
            module=self.module,
            message=message,
            **(context or {})
        )
        
        # Mask sensitive data if enabled
        if data:
            entry.data = self._mask_sensitive_data(data) if self.config.mask_sensitive_data else data
        
        # Add stack trace for errors if enabled
        if level == LogLevel.ERROR and self.config.include_stack_trace:
            import traceback
            entry.data = entry.data or {}
            entry.data['stack'] = traceback.format_exc()
        
        self._output(entry)
    
    def _should_log(self, level: LogLevel) -> bool:
        """Check if message should be logged based on configuration"""
        levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.AUDIT]
        
        # Always log audit messages
        if level == LogLevel.AUDIT:
            return True
        
        try:
            current_level_index = levels.index(self.config.level)
            message_level_index = levels.index(level)
            return message_level_index >= current_level_index
        except ValueError:
            return True
    
    def _mask_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Mask sensitive data in log entries"""
        # Simple implementation - mask common sensitive keys
        sensitive_keys = ['password', 'secret', 'token', 'key', 'api_key', 'auth', 'credential']
        masked_data = data.copy()
        
        for key, value in data.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_keys):
                masked_data[key] = '***MASKED***'
            elif isinstance(value, dict):
                masked_data[key] = self._mask_sensitive_data(value)
        
        return masked_data
    
    def _output(self, entry: LogEntry):
        """Output log entry based on configuration"""
        formatted = self._format_entry(entry)
        
        if self.config.destination in ['console', 'both']:
            self._output_to_console(formatted, entry.level)
        
        if self.config.destination in ['file', 'both']:
            self._output_to_file(formatted)
    
    def _format_entry(self, entry: LogEntry) -> str:
        """Format log entry based on configuration"""
        if self.config.output_format == 'json':
            # Convert LogEntry to dict, handling LogLevel enum
            entry_dict = asdict(entry)
            entry_dict['level'] = entry.level.value
            return json.dumps(entry_dict)
        
        # Text format
        timestamp = entry.timestamp
        level = entry.level.value.upper().ljust(5)
        module = f"[{entry.module}]".ljust(15)
        
        line = f"{timestamp} {level} {module} {entry.message}"
        
        if entry.data:
            line += f" | {json.dumps(entry.data)}"
        
        if entry.user_id:
            line += f" | User: {entry.user_id}"
        
        if entry.action:
            line += f" | Action: {entry.action}"
        
        return line
    
    def _output_to_console(self, formatted: str, level: LogLevel):
        """Output to console using appropriate method"""
        if level == LogLevel.DEBUG:
            self._logger.debug(formatted)
        elif level == LogLevel.INFO or level == LogLevel.AUDIT:
            self._logger.info(formatted)
        elif level == LogLevel.WARN:
            self._logger.warning(formatted)
        elif level == LogLevel.ERROR:
            self._logger.error(formatted)
    
    def _output_to_file(self, formatted: str):
        """Output to file (placeholder implementation)"""
        # In a real implementation, this would write to a file
        # For now, we'll use the Python logger
        self._logger.info(formatted)


# Global logger instances
_loggers: Dict[str, Logger] = {}


def create_logger(module: str, config: Optional[LoggerConfig] = None) -> Logger:
    """
    Create or get a logger instance for a module
    
    Args:
        module: Module name for the logger
        config: Optional logger configuration
    
    Returns:
        Logger instance
    """
    key = f"{module}_{hash(str(config))}" if config else module
    
    if key not in _loggers:
        _loggers[key] = Logger(module, config)
    
    return _loggers[key]


# Global logger instances for common use cases
audit_logger = create_logger('AUDIT', LoggerConfig(
    level=LogLevel.AUDIT,
    audit_enabled=True,
    mask_sensitive_data=True
))

security_logger = create_logger('SECURITY', LoggerConfig(
    level=LogLevel.INFO,
    audit_enabled=True,
    mask_sensitive_data=True,
    include_stack_trace=True
))

performance_logger = create_logger('PERFORMANCE', LoggerConfig(
    level=LogLevel.INFO,
    audit_enabled=True
))


class Timer:
    """Timer utility for performance logging"""
    
    def __init__(self, label: str, logger: Logger):
        self.label = label
        self.logger = logger
        self.start_time = time.time()
    
    def end(self, details: Optional[Dict[str, Any]] = None) -> float:
        """
        End timer and log performance
        
        Args:
            details: Additional performance details
        
        Returns:
            Duration in milliseconds
        """
        duration = (time.time() - self.start_time) * 1000  # Convert to milliseconds
        self.logger.performance(self.label, duration, details)
        return duration


def start_timer(label: str, logger: Optional[Logger] = None) -> Timer:
    """
    Create a timer for performance tracking
    
    Args:
        label: Timer label
        logger: Optional logger (defaults to performance_logger)
    
    Returns:
        Timer instance
    """
    return Timer(label, logger or performance_logger)


def add_request_context(
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    request_id: Optional[str] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, Optional[str]]:
    """
    Create request context for logging
    
    Args:
        user_id: User ID
        session_id: Session ID
        request_id: Request ID
        ip: IP address
        user_agent: User agent string
    
    Returns:
        Context dictionary
    """
    return {
        'user_id': user_id,
        'session_id': session_id,
        'request_id': request_id,
        'ip': ip,
        'user_agent': user_agent
    } 