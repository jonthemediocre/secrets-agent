#!/usr/bin/env python3
"""
Manual script to run the Cursor & Rules Sync Agent
Can be used for development, testing, or manual synchronization
"""

import os
import sys
import argparse
import json
from pathlib import Path

# Add vanta_seed to path if running directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from vanta_seed.agents.cursor_rules_sync_agent import CursorRulesSyncAgent
from vanta_seed.core.logging_config import get_logger

logger = get_logger(__name__)


def main():
    parser = argparse.ArgumentParser(
        description="Cursor & Rules Sync Agent - Recursively scan and sync .cursor and .rules files"
    )
    
    parser.add_argument(
        "action",
        choices=["scan", "generate", "sync", "full"],
        help="Action to perform"
    )
    
    parser.add_argument(
        "--path",
        default=".",
        help="Target path to scan (default: current directory)"
    )
    
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Perform a dry run without making changes"
    )
    
    parser.add_argument(
        "--no-cursor",
        action="store_true",
        help="Skip .cursor file generation"
    )
    
    parser.add_argument(
        "--no-rules",
        action="store_true",
        help="Skip .rules file generation"
    )
    
    parser.add_argument(
        "--enable-symlinks",
        action="store_true",
        help="Enable creation of symlinks for shared configurations"
    )
    
    parser.add_argument(
        "--exclude-dirs",
        nargs="+",
        default=[".git", "__pycache__", "node_modules", ".venv", ".next", "coverage"],
        help="Directories to exclude from scanning"
    )
    
    parser.add_argument(
        "--output",
        choices=["json", "pretty", "minimal"],
        default="pretty",
        help="Output format"
    )
    
    args = parser.parse_args()
    
    # Initialize the agent
    agent = CursorRulesSyncAgent(
        agent_id="cursor_rules_sync_manual",
        core_config={},
        plugin_manager=None
    )
    
    # Execute based on action
    if args.action == "full":
        # Full workflow: scan -> generate -> sync
        actions = ["scan", "generate", "sync"]
    else:
        actions = [args.action]
    
    results = {}
    
    for action in actions:
        logger.info(f"Executing action: {action}")
        
        task_data = {
            "action": action,
            "target_path": os.path.abspath(args.path),
            "options": {
                "dry_run": args.dry_run,
                "exclude_dirs": args.exclude_dirs
            }
        }
        
        if action == "generate":
            task_data["options"]["generate_cursor"] = not args.no_cursor
            task_data["options"]["generate_rules"] = not args.no_rules
        
        if action == "sync":
            task_data["options"]["enable_symlinks"] = args.enable_symlinks
            task_data["options"]["sync_rules"] = True
        
        result = agent.process_task(task_data)
        results[action] = result
        
        if result["status"] != "success":
            logger.error(f"Action {action} failed: {result.get('error_message', 'Unknown error')}")
            break
    
    # Output results
    if args.output == "json":
        print(json.dumps(results, indent=2))
    elif args.output == "minimal":
        for action, result in results.items():
            print(f"{action}: {result['status']}")
    else:  # pretty
        print("\n🔍 Cursor & Rules Sync Results")
        print("=" * 50)
        
        for action, result in results.items():
            print(f"\n📌 {action.upper()}")
            print("-" * 30)
            
            if result["status"] == "success":
                output = result.get("output", {})
                
                if action == "scan":
                    scan_result = output.get("scan_result", {})
                    print(f"✅ Directories scanned: {len(scan_result.get('directories_scanned', []))}")
                    print(f"⚠️  Missing .cursor dirs: {len(scan_result.get('missing_cursor_dirs', []))}")
                    print(f"⚠️  Missing .rules dirs: {len(scan_result.get('missing_rules_dirs', []))}")
                    print(f"🔗 Inheritance chains found: {len(scan_result.get('inheritance_chains', []))}")
                    
                    if scan_result.get('missing_cursor_dirs'):
                        print("\nMissing .cursor directories:")
                        for dir in scan_result['missing_cursor_dirs'][:5]:
                            print(f"  - {dir}")
                        if len(scan_result['missing_cursor_dirs']) > 5:
                            print(f"  ... and {len(scan_result['missing_cursor_dirs']) - 5} more")
                
                elif action == "generate":
                    gen_result = output.get("generation_result", {})
                    print(f"✅ .cursor files created: {gen_result.get('cursor_files_created', 0)}")
                    print(f"✅ .rules files created: {gen_result.get('rules_files_created', 0)}")
                    print(f"📝 Total files generated: {gen_result.get('total_files_generated', 0)}")
                    
                    if args.dry_run:
                        print("ℹ️  DRY RUN - No files were actually created")
                
                elif action == "sync":
                    sync_result = output.get("sync_result", {})
                    print(f"🔄 Rules synced: {sync_result.get('rules_synced', 0)}")
                    print(f"🔗 Symlinks created: {sync_result.get('symlinks_created', 0)}")
                    print(f"🔍 Indexes updated: {sync_result.get('indexes_updated', 0)}")
            
            else:
                print(f"❌ Failed: {result.get('error_message', 'Unknown error')}")


if __name__ == "__main__":
    main() 