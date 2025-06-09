#!/usr/bin/env python3
"""
MDC Master Control - Unified interface for all MDC tools
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime

# Import all our tools
from mdc_rule_validator import MDCRuleValidator
from mdc_rule_generator import MDCRuleGenerator
from setup_folder_structure import MDCFolderStructure
from mdc_migration_script import MDCMigrationScript
from mdc_monitoring_agent import MDCMonitoringAgent, MonitoringConfig

class MDCMasterControl:
    """Master controller for all MDC tools"""
    
    def __init__(self, rules_directory=".cursor/rules"):
        self.rules_directory = rules_directory
        self.validator = MDCRuleValidator()
        self.generator = MDCRuleGenerator(rules_directory)
        self.setup = MDCFolderStructure(rules_directory)
        # Don't initialize migrator here since it needs specific source/target directories
        
    def status(self):
        """Show overall system status"""
        print("🧠 MDC Rule System Status")
        print("=" * 50)
        
        # Check if directory exists
        if not os.path.exists(self.rules_directory):
            print("❌ Rules directory does not exist")
            print(f"   Run: python mdc_master_control.py setup")
            return
        
        # Run validation
        results = self.validator.validate_directory(self.rules_directory)
        
        valid_count = sum(1 for r in results if r.is_valid)
        invalid_count = sum(1 for r in results if not r.is_valid)
        warning_count = sum(1 for r in results if r.warnings)
        
        print(f"📁 Rules Directory: {self.rules_directory}")
        print(f"📊 Total Rules: {len(results)}")
        print(f"✅ Valid Rules: {valid_count}")
        print(f"❌ Invalid Rules: {invalid_count}")
        print(f"⚠️  Files with Warnings: {warning_count}")
        
        # Rule type breakdown
        rule_types = {}
        for result in results:
            if result.rule_type:
                rule_types[result.rule_type] = rule_types.get(result.rule_type, 0) + 1
        
        if rule_types:
            print("\n📋 Rule Types:")
            for rule_type, count in rule_types.items():
                print(f"   {rule_type.title()}: {count}")
        
        # Common errors
        error_counts = {}
        for result in results:
            for error in result.errors:
                error_counts[error] = error_counts.get(error, 0) + 1
        
        if error_counts:
            print("\n🚨 Common Issues:")
            for error, count in sorted(error_counts.items(), key=lambda x: x[1], reverse=True)[:5]:
                print(f"   {error}: {count} files")
        
        # Health score
        if len(results) > 0:
            health_score = (valid_count / len(results)) * 100
            health_emoji = "🟢" if health_score >= 90 else "🟡" if health_score >= 70 else "🔴"
            print(f"\n{health_emoji} Health Score: {health_score:.1f}%")
        
        print(f"\n🕐 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    def setup(self):
        """Set up the complete MDC system"""
        print("🏗️ Setting up MDC Rule System...")
        
        # Create folder structure
        self.setup.create_folder_structure()
        
        print(f"✅ Setup complete!")
        print(f"   Created: 9 folders, 4 templates, examples, documentation")
        
        # Run initial validation
        print("\n🔍 Running initial validation...")
        self.validate()

    def validate(self, fix=False):
        """Validate all rules"""
        print("🔍 Validating MDC rules...")
        
        if not os.path.exists(self.rules_directory):
            print("❌ Rules directory does not exist. Run setup first.")
            return
        
        results = self.validator.validate_directory(self.rules_directory)
        
        valid_count = sum(1 for r in results if r.is_valid)
        invalid_count = sum(1 for r in results if not r.is_valid)
        warning_count = sum(1 for r in results if r.warnings)
        
        print(f"📊 Validation Results:")
        print(f"   Total: {len(results)}")
        print(f"   Valid: {valid_count} ✅")
        print(f"   Invalid: {invalid_count} ❌")
        print(f"   Warnings: {warning_count} ⚠️")
        
        # Show details for invalid files
        if invalid_count > 0:
            print(f"\n❌ Invalid Files:")
            for result in results:
                if not result.is_valid:
                    print(f"   {Path(result.file_path).name}")
                    for error in result.errors[:2]:  # Show first 2 errors
                        print(f"      - {error}")
        
        # Auto-fix if requested
        if fix and invalid_count > 0:
            print(f"\n🔧 Auto-fixing issues...")
            self.migrate(dry_run=False)

    def migrate(self, dry_run=True):
        """Migrate existing rules to proper format"""
        mode = "🔍 Preview" if dry_run else "🚀 Migration"
        print(f"{mode}: Converting rules to proper format...")
        
        if not os.path.exists(self.rules_directory):
            print("❌ Rules directory does not exist. Run setup first.")
            return
        
        # Create migrator instance
        migrator = MDCMigrationScript(self.rules_directory, self.rules_directory)
        
        # Run migration
        result = migrator.migrate_all(dry_run=dry_run)
        
        stats = result['stats']
        print(f"📊 Migration Results:")
        print(f"   Total Files: {stats['total_files']}")
        print(f"   Successful: {stats['migrated_files']} ✅")
        print(f"   Failed: {stats['failed_files']} ❌")
        
        # Show rule type distribution
        if stats['rule_type_distribution']:
            print(f"\n📋 Detected Rule Types:")
            for rule_type, count in stats['rule_type_distribution'].items():
                print(f"   {rule_type.title()}: {count}")

    def generate(self, prompt, interactive=False):
        """Generate a new rule"""
        if interactive:
            self.generator.interactive_mode()
        elif prompt:
            try:
                result = self.generator.generate_and_save(prompt)
                if result['success']:
                    print(f"✅ Rule created: {result['file_path']}")
                    print(f"   Type: {result['rule_type']}")
                    print(f"   Folder: {result['folder']}")
                else:
                    print(f"❌ Error creating rule")
            except Exception as e:
                print(f"❌ Error creating rule: {e}")
        else:
            print("❌ Please provide a prompt or use --interactive")

    def monitor(self, start=False, status=False, dashboard=False):
        """Control the monitoring agent"""
        config = MonitoringConfig(watch_directory=self.rules_directory)
        agent = MDCMonitoringAgent(config)
        
        if status:
            status_data = agent.get_status()
            print(json.dumps(status_data, indent=2, default=str))
        elif dashboard:
            dashboard_text = agent.get_dashboard()
            print(dashboard_text)
        elif start:
            print("🚀 Starting monitoring agent...")
            try:
                agent.start_monitoring()
                print("✅ Monitoring agent started")
                print("Press Ctrl+C to stop")
                
                # Keep running
                import time
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\n🛑 Stopping monitoring agent...")
                agent.stop_monitoring()
        else:
            print("Use --start, --status, or --dashboard")

    def doctor(self):
        """Run comprehensive health check and auto-fix"""
        print("🏥 MDC System Doctor")
        print("=" * 50)
        
        # Check 1: Directory structure
        print("1️⃣ Checking directory structure...")
        if not os.path.exists(self.rules_directory):
            print("   ❌ Rules directory missing")
            print("   🔧 Creating directory structure...")
            self.setup.create_folder_structure()
            print("   ✅ Fixed")
        else:
            print("   ✅ Directory exists")
        
        # Check 2: Folder organization
        print("\n2️⃣ Checking folder organization...")
        expected_folders = ['core', 'language', 'framework', 'testing', 'workflow']
        missing_folders = []
        
        for folder in expected_folders:
            folder_path = os.path.join(self.rules_directory, folder)
            if not os.path.exists(folder_path):
                missing_folders.append(folder)
        
        if missing_folders:
            print(f"   ⚠️ Missing folders: {', '.join(missing_folders)}")
            print("   🔧 Creating missing folders...")
            self.setup.create_folder_structure()
            print("   ✅ Fixed")
        else:
            print("   ✅ All folders present")
        
        # Check 3: Rule validation
        print("\n3️⃣ Checking rule validity...")
        results = self.validator.validate_directory(self.rules_directory)
        
        valid_count = sum(1 for r in results if r.is_valid)
        invalid_count = sum(1 for r in results if not r.is_valid)
        
        if invalid_count > 0:
            print(f"   ❌ {invalid_count} invalid files")
            print("   🔧 Auto-fixing issues...")
            self.migrate(dry_run=False)
            
            # Re-validate
            results = self.validator.validate_directory(self.rules_directory)
            valid_count = sum(1 for r in results if r.is_valid)
            print(f"   ✅ Fixed - {valid_count}/{len(results)} valid")
        else:
            print(f"   ✅ All {len(results)} files valid")
        
        # Check 4: Templates
        print("\n4️⃣ Checking templates...")
        templates_dir = os.path.join(self.rules_directory, "templates")
        if not os.path.exists(templates_dir) or len(os.listdir(templates_dir)) == 0:
            print("   ❌ Templates missing")
            print("   🔧 Creating templates...")
            self.setup.create_folder_structure()  # This creates templates too
            print("   ✅ Fixed")
        else:
            print("   ✅ Templates present")
        
        # Final health score
        print("\n🏁 Final Health Check:")
        results = self.validator.validate_directory(self.rules_directory)
        
        if len(results) > 0:
            valid_count = sum(1 for r in results if r.is_valid)
            health_score = (valid_count / len(results)) * 100
            health_emoji = "🟢" if health_score >= 90 else "🟡" if health_score >= 70 else "🔴"
            print(f"{health_emoji} System Health: {health_score:.1f}%")
            
            if health_score >= 90:
                print("🎉 System is healthy!")
            elif health_score >= 70:
                print("⚠️ System needs attention")
            else:
                print("🚨 System needs immediate attention")
        else:
            print("⚠️ No rules found")

def main():
    """Command line interface"""
    parser = argparse.ArgumentParser(description="MDC Master Control")
    parser.add_argument('--rules-dir', '-d', default='.cursor/rules', help='Rules directory')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Status command
    subparsers.add_parser('status', help='Show system status')
    
    # Setup command
    subparsers.add_parser('setup', help='Set up complete MDC system')
    
    # Validate command
    validate_parser = subparsers.add_parser('validate', help='Validate all rules')
    validate_parser.add_argument('--fix', action='store_true', help='Auto-fix issues')
    
    # Migrate command
    migrate_parser = subparsers.add_parser('migrate', help='Migrate rules to proper format')
    migrate_parser.add_argument('--dry-run', action='store_true', default=True, help='Preview changes only')
    migrate_parser.add_argument('--execute', action='store_true', help='Actually perform migration')
    
    # Generate command
    generate_parser = subparsers.add_parser('generate', help='Generate new rule')
    generate_parser.add_argument('--prompt', '-p', help='Rule description/prompt')
    generate_parser.add_argument('--interactive', '-i', action='store_true', help='Interactive mode')
    
    # Monitor command
    monitor_parser = subparsers.add_parser('monitor', help='Control monitoring agent')
    monitor_parser.add_argument('--start', action='store_true', help='Start monitoring')
    monitor_parser.add_argument('--status', action='store_true', help='Show monitoring status')
    monitor_parser.add_argument('--dashboard', action='store_true', help='Show monitoring dashboard')
    
    # Doctor command
    subparsers.add_parser('doctor', help='Run comprehensive health check and auto-fix')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Create master control
    control = MDCMasterControl(args.rules_dir)
    
    # Execute command
    if args.command == 'status':
        control.status()
    elif args.command == 'setup':
        control.setup()
    elif args.command == 'validate':
        control.validate(fix=args.fix)
    elif args.command == 'migrate':
        dry_run = not args.execute if args.execute else args.dry_run
        control.migrate(dry_run=dry_run)
    elif args.command == 'generate':
        control.generate(args.prompt, args.interactive)
    elif args.command == 'monitor':
        control.monitor(args.start, args.status, args.dashboard)
    elif args.command == 'doctor':
        control.doctor()

if __name__ == "__main__":
    main() 