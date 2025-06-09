#!/usr/bin/env python3
"""
MDC Monitoring Agent - Step 5 (Continuous Monitor)
Continuously monitors and maintains MDC rule system using all 4 tools
"""

import os
import time
import signal
import logging
import schedule
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import json
import yaml
import threading
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Import our tools
from mdc_rule_validator import MDCRuleValidator
from mdc_rule_generator import MDCRuleGenerator
from setup_folder_structure import MDCFolderStructure
from mdc_migration_script import MDCMigrationScript

@dataclass
class MonitoringConfig:
    """Configuration for the monitoring agent"""
    watch_directory: str = ".cursor/rules"
    backup_directory: str = ".cursor/backups"
    validation_interval: int = 300  # 5 minutes
    cleanup_interval: int = 3600    # 1 hour
    backup_retention_days: int = 7
    auto_fix_enabled: bool = True
    auto_backup_enabled: bool = True
    log_level: str = "INFO"
    max_log_files: int = 10
    webhook_url: Optional[str] = None

class MDCFileHandler(FileSystemEventHandler):
    """Handles file system events for MDC files"""
    
    def __init__(self, agent):
        self.agent = agent
        self.logger = logging.getLogger('mdc_monitor.file_handler')
    
    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith('.mdc'):
            self.logger.info(f"MDC file modified: {event.src_path}")
            self.agent.queue_validation(event.src_path)
    
    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith('.mdc'):
            self.logger.info(f"MDC file created: {event.src_path}")
            self.agent.queue_validation(event.src_path)
    
    def on_deleted(self, event):
        if not event.is_directory and event.src_path.endswith('.mdc'):
            self.logger.info(f"MDC file deleted: {event.src_path}")
            self.agent.handle_deleted_file(event.src_path)
    
    def on_moved(self, event):
        if not event.is_directory and (event.src_path.endswith('.mdc') or event.dest_path.endswith('.mdc')):
            self.logger.info(f"MDC file moved: {event.src_path} -> {event.dest_path}")
            if event.dest_path.endswith('.mdc'):
                self.agent.queue_validation(event.dest_path)

class MDCMonitoringAgent:
    """Continuous monitoring agent for MDC rule system"""
    
    def __init__(self, config: MonitoringConfig):
        self.config = config
        self.logger = self._setup_logging()
        self.running = False
        self.observer = None
        self.validation_queue = set()
        self.queue_lock = threading.Lock()
        
        # Initialize tools
        self.validator = MDCRuleValidator(verbose=False)
        self.generator = MDCRuleGenerator(config.watch_directory)
        self.folder_setup = MDCFolderStructure(config.watch_directory)
        
        # Statistics
        self.stats = {
            'start_time': datetime.now(),
            'files_validated': 0,
            'files_fixed': 0,
            'validation_errors': 0,
            'auto_fixes_applied': 0,
            'backups_created': 0,
            'last_validation': None,
            'last_backup': None,
            'health_score': 100.0
        }
        
        # Ensure directories exist
        self._ensure_directories()
    
    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logger = logging.getLogger('mdc_monitor')
        logger.setLevel(getattr(logging, self.config.log_level.upper()))
        
        # Create logs directory
        log_dir = Path(self.config.watch_directory).parent / "logs"
        log_dir.mkdir(exist_ok=True)
        
        # File handler with rotation
        log_file = log_dir / f"mdc_monitor_{datetime.now().strftime('%Y%m%d')}.log"
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(getattr(logging, self.config.log_level.upper()))
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
        
        return logger
    
    def _ensure_directories(self):
        """Ensure required directories exist"""
        Path(self.config.watch_directory).mkdir(parents=True, exist_ok=True)
        Path(self.config.backup_directory).mkdir(parents=True, exist_ok=True)
        
        # Ensure folder structure is set up
        if not any(Path(self.config.watch_directory).iterdir()):
            self.logger.info("Setting up initial folder structure...")
            self.folder_setup.create_folder_structure()
    
    def start_monitoring(self):
        """Start the monitoring agent"""
        self.logger.info("Starting MDC Monitoring Agent...")
        self.running = True
        
        # Setup file system monitoring
        self._setup_file_monitoring()
        
        # Schedule periodic tasks
        self._schedule_tasks()
        
        # Initial validation
        self._perform_full_validation()
        
        # Main monitoring loop
        try:
            self._monitoring_loop()
        except KeyboardInterrupt:
            self.logger.info("Shutdown requested by user")
        except Exception as e:
            self.logger.error(f"Monitoring error: {e}")
        finally:
            self.stop_monitoring()
    
    def _setup_file_monitoring(self):
        """Setup file system monitoring"""
        self.observer = Observer()
        event_handler = MDCFileHandler(self)
        self.observer.schedule(
            event_handler, 
            self.config.watch_directory, 
            recursive=True
        )
        self.observer.start()
        self.logger.info(f"File monitoring started for: {self.config.watch_directory}")
    
    def _schedule_tasks(self):
        """Schedule periodic tasks"""
        # Validation task
        schedule.every(self.config.validation_interval).seconds.do(
            self._perform_periodic_validation
        )
        
        # Cleanup task
        schedule.every(self.config.cleanup_interval).seconds.do(
            self._perform_cleanup
        )
        
        # Backup task (daily)
        schedule.every().day.at("02:00").do(
            self._create_backup
        )
        
        # Health check (every 15 minutes)
        schedule.every(15).minutes.do(
            self._update_health_score
        )
        
        self.logger.info("Scheduled tasks configured")
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        self.logger.info("Monitoring loop started")
        
        while self.running:
            try:
                # Process scheduled tasks
                schedule.run_pending()
                
                # Process validation queue
                self._process_validation_queue()
                
                # Wait before next iteration
                time.sleep(10)
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(30)  # Wait longer on error
    
    def queue_validation(self, file_path: str):
        """Queue a file for validation"""
        with self.queue_lock:
            self.validation_queue.add(file_path)
            self.logger.debug(f"Queued for validation: {file_path}")
    
    def _process_validation_queue(self):
        """Process files in the validation queue"""
        if not self.validation_queue:
            return
        
        with self.queue_lock:
            files_to_process = list(self.validation_queue)
            self.validation_queue.clear()
        
        for file_path in files_to_process:
            if Path(file_path).exists():
                self._validate_and_fix_file(file_path)
    
    def _validate_and_fix_file(self, file_path: str):
        """Validate and optionally fix a single file"""
        try:
            self.logger.debug(f"Validating: {file_path}")
            result = self.validator.validate_file(file_path)
            self.stats['files_validated'] += 1
            
            if not result.is_valid:
                self.logger.warning(f"Validation failed for {file_path}: {result.errors}")
                self.stats['validation_errors'] += 1
                
                if self.config.auto_fix_enabled:
                    fixes_applied = self._attempt_auto_fix(file_path, result)
                    if fixes_applied:
                        self.stats['auto_fixes_applied'] += fixes_applied
                        self.stats['files_fixed'] += 1
                        self.logger.info(f"Auto-fixed {fixes_applied} issues in {file_path}")
            else:
                self.logger.debug(f"Validation passed: {file_path}")
        
        except Exception as e:
            self.logger.error(f"Error validating {file_path}: {e}")
    
    def _attempt_auto_fix(self, file_path: str, validation_result) -> int:
        """Attempt to automatically fix common issues"""
        fixes_applied = 0
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Fix missing frontmatter
            if "No YAML frontmatter found" in str(validation_result.errors):
                content = self._add_basic_frontmatter(content, file_path)
                fixes_applied += 1
            
            # Fix YAML formatting issues
            if any("YAML" in error for error in validation_result.errors):
                content = self._fix_yaml_formatting(content)
                fixes_applied += 1
            
            # Fix missing required fields
            content = self._add_missing_fields(content, validation_result)
            if content != original_content:
                fixes_applied += 1
            
            # Write back if changes were made
            if content != original_content:
                self._backup_file_before_fix(file_path)
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                self.logger.info(f"Applied {fixes_applied} auto-fixes to {file_path}")
        
        except Exception as e:
            self.logger.error(f"Error auto-fixing {file_path}: {e}")
        
        return fixes_applied
    
    def _add_basic_frontmatter(self, content: str, file_path: str) -> str:
        """Add basic frontmatter to a file that's missing it"""
        file_stem = Path(file_path).stem
        
        # Determine rule type from filename
        if file_stem.endswith('-always'):
            rule_type = 'always'
            always_apply = True
        elif file_stem.endswith('-auto'):
            rule_type = 'auto'
            always_apply = False
        elif file_stem.endswith('-agent'):
            rule_type = 'agent'
            always_apply = False
        else:
            rule_type = 'manual'
            always_apply = False
        
        # Generate description from filename
        description = file_stem.replace('-', ' ').replace('_', ' ').title()
        if not description.endswith('Rule'):
            description += ' Rule'
        
        frontmatter = {
            'description': description,
            'type': rule_type,
            'created': datetime.now().isoformat(),
            'auto_generated': True
        }
        
        if rule_type == 'always':
            frontmatter['alwaysApply'] = always_apply
        elif rule_type == 'auto':
            frontmatter['globs'] = ['**/*']  # Default glob
        
        yaml_content = yaml.dump(frontmatter, default_flow_style=False)
        return f"---\n{yaml_content}---\n\n{content}"
    
    def _fix_yaml_formatting(self, content: str) -> str:
        """Fix common YAML formatting issues"""
        lines = content.split('\n')
        in_frontmatter = False
        fixed_lines = []
        
        for line in lines:
            if line.strip() == '---':
                if not in_frontmatter:
                    in_frontmatter = True
                else:
                    in_frontmatter = False
                fixed_lines.append(line)
            elif in_frontmatter and ':' in line and not line.strip().startswith('#'):
                # Ensure space after colon
                if ':' in line and not line.split(':')[1].startswith(' '):
                    key, value = line.split(':', 1)
                    line = f"{key}: {value.strip()}"
                fixed_lines.append(line)
            else:
                fixed_lines.append(line)
        
        return '\n'.join(fixed_lines)
    
    def _add_missing_fields(self, content: str, validation_result) -> str:
        """Add missing required fields to frontmatter"""
        if not content.startswith('---'):
            return content
        
        try:
            parts = content.split('---', 2)
            if len(parts) < 3:
                return content
            
            frontmatter = yaml.safe_load(parts[1]) or {}
            
            # Check for missing required fields and add them
            if 'description' not in frontmatter:
                frontmatter['description'] = 'Auto-generated description'
            
            if 'type' not in frontmatter:
                # Infer type from errors or filename
                frontmatter['type'] = 'manual'  # Default
            
            # Update timestamp
            frontmatter['last_updated'] = datetime.now().isoformat()
            
            # Reconstruct content
            yaml_content = yaml.dump(frontmatter, default_flow_style=False)
            return f"---\n{yaml_content}---\n{parts[2]}"
        
        except Exception as e:
            self.logger.error(f"Error adding missing fields: {e}")
            return content
    
    def _backup_file_before_fix(self, file_path: str):
        """Create backup before applying auto-fix"""
        if not self.config.auto_backup_enabled:
            return
        
        try:
            backup_dir = Path(self.config.backup_directory) / "auto_fixes" / datetime.now().strftime('%Y%m%d')
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            source_file = Path(file_path)
            backup_file = backup_dir / f"{source_file.stem}_{datetime.now().strftime('%H%M%S')}{source_file.suffix}"
            
            import shutil
            shutil.copy2(file_path, backup_file)
            self.logger.debug(f"Created backup: {backup_file}")
        
        except Exception as e:
            self.logger.error(f"Error creating backup: {e}")
    
    def handle_deleted_file(self, file_path: str):
        """Handle when a file is deleted"""
        self.logger.info(f"File deleted: {file_path}")
        # Could implement recovery from backup here
    
    def _perform_full_validation(self):
        """Perform full validation of all MDC files"""
        self.logger.info("Performing full validation...")
        start_time = datetime.now()
        
        try:
            results = self.validator.validate_directory(self.config.watch_directory)
            
            valid_count = sum(1 for r in results if r.is_valid)
            total_count = len(results)
            
            self.stats['last_validation'] = datetime.now()
            self.stats['files_validated'] += total_count
            
            if total_count > 0:
                health_score = (valid_count / total_count) * 100
                self.stats['health_score'] = health_score
                
                self.logger.info(f"Full validation complete: {valid_count}/{total_count} files valid ({health_score:.1f}%)")
                
                # Auto-fix invalid files if enabled
                if self.config.auto_fix_enabled:
                    invalid_files = [r for r in results if not r.is_valid]
                    for result in invalid_files:
                        self._validate_and_fix_file(result.file_path)
            
        except Exception as e:
            self.logger.error(f"Error in full validation: {e}")
    
    def _perform_periodic_validation(self):
        """Perform periodic validation check"""
        self.logger.debug("Performing periodic validation...")
        self._perform_full_validation()
    
    def _create_backup(self):
        """Create backup of the entire rules directory"""
        if not self.config.auto_backup_enabled:
            return
        
        try:
            backup_dir = Path(self.config.backup_directory) / datetime.now().strftime('%Y%m%d_%H%M%S')
            
            import shutil
            shutil.copytree(self.config.watch_directory, backup_dir)
            
            self.stats['backups_created'] += 1
            self.stats['last_backup'] = datetime.now()
            
            self.logger.info(f"Backup created: {backup_dir}")
            
            # Cleanup old backups
            self._cleanup_old_backups()
        
        except Exception as e:
            self.logger.error(f"Error creating backup: {e}")
    
    def _cleanup_old_backups(self):
        """Remove old backup files"""
        try:
            backup_root = Path(self.config.backup_directory)
            cutoff_date = datetime.now() - timedelta(days=self.config.backup_retention_days)
            
            for backup_dir in backup_root.iterdir():
                if backup_dir.is_dir():
                    try:
                        dir_date = datetime.strptime(backup_dir.name.split('_')[0], '%Y%m%d')
                        if dir_date < cutoff_date:
                            import shutil
                            shutil.rmtree(backup_dir)
                            self.logger.info(f"Removed old backup: {backup_dir}")
                    except (ValueError, IndexError):
                        continue  # Skip non-backup directories
        
        except Exception as e:
            self.logger.error(f"Error cleaning up backups: {e}")
    
    def _perform_cleanup(self):
        """Perform cleanup tasks"""
        self.logger.debug("Performing cleanup tasks...")
        
        # Cleanup old log files
        self._cleanup_old_logs()
        
        # Cleanup old backups
        self._cleanup_old_backups()
    
    def _cleanup_old_logs(self):
        """Remove old log files"""
        try:
            log_dir = Path(self.config.watch_directory).parent / "logs"
            if not log_dir.exists():
                return
            
            log_files = sorted(log_dir.glob("mdc_monitor_*.log"))
            if len(log_files) > self.config.max_log_files:
                files_to_remove = log_files[:-self.config.max_log_files]
                for log_file in files_to_remove:
                    log_file.unlink()
                    self.logger.debug(f"Removed old log: {log_file}")
        
        except Exception as e:
            self.logger.error(f"Error cleaning up logs: {e}")
    
    def _update_health_score(self):
        """Update overall system health score"""
        try:
            results = self.validator.validate_directory(self.config.watch_directory)
            
            if results:
                valid_count = sum(1 for r in results if r.is_valid)
                total_count = len(results)
                health_score = (valid_count / total_count) * 100
                self.stats['health_score'] = health_score
                
                self.logger.debug(f"Health score updated: {health_score:.1f}%")
        
        except Exception as e:
            self.logger.error(f"Error updating health score: {e}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get current monitoring status"""
        uptime = datetime.now() - self.stats['start_time']
        
        return {
            'running': self.running,
            'uptime_seconds': uptime.total_seconds(),
            'uptime_formatted': str(uptime).split('.')[0],
            'watch_directory': self.config.watch_directory,
            'stats': self.stats.copy(),
            'queue_size': len(self.validation_queue),
            'config': {
                'validation_interval': self.config.validation_interval,
                'auto_fix_enabled': self.config.auto_fix_enabled,
                'auto_backup_enabled': self.config.auto_backup_enabled,
                'backup_retention_days': self.config.backup_retention_days
            }
        }
    
    def get_dashboard(self) -> str:
        """Generate a status dashboard"""
        status = self.get_status()
        
        dashboard = f"""
╔══════════════════════════════════════════════════════════════════╗
║                    MDC MONITORING AGENT DASHBOARD                   ║
╠══════════════════════════════════════════════════════════════════╣
║ Status: {'🟢 RUNNING' if status['running'] else '🔴 STOPPED':>10}                                              ║
║ Uptime: {status['uptime_formatted']:>10}                                              ║
║ Watch Directory: {status['watch_directory']:<45} ║
║                                                                  ║
║ 📊 STATISTICS                                                    ║
║ ├─ Files Validated: {status['stats']['files_validated']:>8}                                  ║
║ ├─ Files Fixed: {status['stats']['files_fixed']:>12}                                  ║
║ ├─ Validation Errors: {status['stats']['validation_errors']:>6}                                  ║
║ ├─ Auto-fixes Applied: {status['stats']['auto_fixes_applied']:>5}                                  ║
║ ├─ Backups Created: {status['stats']['backups_created']:>7}                                  ║
║ └─ Health Score: {status['stats']['health_score']:>7.1f}%                                ║
║                                                                  ║
║ 🔧 CONFIGURATION                                                 ║
║ ├─ Validation Interval: {status['config']['validation_interval']:>4}s                               ║
║ ├─ Auto-fix: {'✅ Enabled' if status['config']['auto_fix_enabled'] else '❌ Disabled':>12}                                   ║
║ ├─ Auto-backup: {'✅ Enabled' if status['config']['auto_backup_enabled'] else '❌ Disabled':>9}                                   ║
║ └─ Backup Retention: {status['config']['backup_retention_days']:>3} days                              ║
║                                                                  ║
║ 📋 QUEUE                                                         ║
║ └─ Pending Validations: {status['queue_size']:>4}                                   ║
║                                                                  ║
║ 🕐 LAST OPERATIONS                                               ║
║ ├─ Last Validation: {str(status['stats']['last_validation']).split('.')[0] if status['stats']['last_validation'] else 'Never':>19} ║
║ └─ Last Backup: {str(status['stats']['last_backup']).split('.')[0] if status['stats']['last_backup'] else 'Never':>23} ║
╚══════════════════════════════════════════════════════════════════╝
"""
        return dashboard
    
    def stop_monitoring(self):
        """Stop the monitoring agent"""
        self.logger.info("Stopping MDC Monitoring Agent...")
        self.running = False
        
        if self.observer:
            self.observer.stop()
            self.observer.join()
        
        # Clear scheduled tasks
        schedule.clear()
        
        self.logger.info("Monitoring agent stopped")
    
    def save_config(self, config_file: str):
        """Save current configuration to file"""
        config_data = {
            'watch_directory': self.config.watch_directory,
            'backup_directory': self.config.backup_directory,
            'validation_interval': self.config.validation_interval,
            'cleanup_interval': self.config.cleanup_interval,
            'backup_retention_days': self.config.backup_retention_days,
            'auto_fix_enabled': self.config.auto_fix_enabled,
            'auto_backup_enabled': self.config.auto_backup_enabled,
            'log_level': self.config.log_level,
            'max_log_files': self.config.max_log_files
        }
        
        with open(config_file, 'w') as f:
            json.dump(config_data, f, indent=2)
        
        self.logger.info(f"Configuration saved to: {config_file}")
    
    @classmethod
    def load_config(cls, config_file: str) -> MonitoringConfig:
        """Load configuration from file"""
        with open(config_file, 'r') as f:
            config_data = json.load(f)
        
        return MonitoringConfig(**config_data)

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    print("\nShutdown signal received...")
    # The agent will handle cleanup in its finally block

def main():
    parser = argparse.ArgumentParser(description="MDC Monitoring Agent")
    parser.add_argument('--config', help="Configuration file")
    parser.add_argument('--watch-dir', default='.cursor/rules', help="Directory to monitor")
    parser.add_argument('--backup-dir', default='.cursor/backups', help="Backup directory")
    parser.add_argument('--validation-interval', type=int, default=300, help="Validation interval (seconds)")
    parser.add_argument('--no-auto-fix', action='store_true', help="Disable auto-fixing")
    parser.add_argument('--no-auto-backup', action='store_true', help="Disable auto-backup")
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])
    parser.add_argument('--daemon', action='store_true', help="Run as daemon")
    parser.add_argument('--status', action='store_true', help="Show status and exit")
    parser.add_argument('--save-config', help="Save configuration to file")
    
    args = parser.parse_args()
    
    # Load or create configuration
    if args.config and os.path.exists(args.config):
        config = MDCMonitoringAgent.load_config(args.config)
    else:
        config = MonitoringConfig(
            watch_directory=args.watch_dir,
            backup_directory=args.backup_dir,
            validation_interval=args.validation_interval,
            auto_fix_enabled=not args.no_auto_fix,
            auto_backup_enabled=not args.no_auto_backup,
            log_level=args.log_level
        )
    
    # Create agent
    agent = MDCMonitoringAgent(config)
    
    # Save configuration if requested
    if args.save_config:
        agent.save_config(args.save_config)
        print(f"Configuration saved to: {args.save_config}")
        return
    
    # Show status if requested
    if args.status:
        print(agent.get_dashboard())
        return
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Run as daemon or interactive
    if args.daemon:
        print("Starting MDC Monitoring Agent as daemon...")
        print(f"Monitoring: {config.watch_directory}")
        print("Use Ctrl+C to stop")
    else:
        print(agent.get_dashboard())
        print("\nStarting interactive monitoring...")
        print("Press Ctrl+C to stop, or 'q' to quit")
    
    try:
        agent.start_monitoring()
    except KeyboardInterrupt:
        print("\nShutdown requested by user")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        agent.stop_monitoring()
        print("MDC Monitoring Agent stopped")

if __name__ == "__main__":
    main() 