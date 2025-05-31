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
import glob
import uuid
import getpass
import datetime

# Add vanta_seed to path if running directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from vanta_seed.agents.cursor_rules_sync_agent import CursorRulesSyncAgent
from vanta_seed.core.logging_config import get_logger

logger = get_logger(__name__)


def is_likely_project_folder(path):
    # Heuristic: contains package.json, pyproject.toml, main.py, or requirements.txt
    markers = ["package.json", "pyproject.toml", "main.py", "requirements.txt"]
    return any(os.path.isfile(os.path.join(path, m)) for m in markers)

def find_candidate_projects(root):
    candidates = []
    for dirpath, dirnames, filenames in os.walk(root):
        if is_likely_project_folder(dirpath):
            candidates.append(dirpath)
    return candidates

def interactive_project_selection(candidates):
    print("\nDetected possible project folders:")
    selected = set(candidates)
    while True:
        for i, path in enumerate(candidates):
            mark = "[x]" if path in selected else "[ ]"
            print(f"{i+1:2d}. {mark} {path}")
        print("Type the number to toggle selection, or type a new path to add manually.")
        print("Type 'done' when finished.")
        resp = input("> ").strip()
        if resp.lower() == "done":
            break
        if resp.isdigit() and 1 <= int(resp) <= len(candidates):
            idx = int(resp) - 1
            path = candidates[idx]
            if path in selected:
                selected.remove(path)
            else:
                selected.add(path)
        elif os.path.isdir(resp):
            selected.add(os.path.abspath(resp))
            if resp not in candidates:
                candidates.append(os.path.abspath(resp))
        else:
            print("Invalid input. Enter a number, a valid path, or 'done'.")
    return list(selected)

def create_project_marker(path, metadata=None):
    marker_path = os.path.join(path, "secretsagent.proj")
    try:
        # Compose metadata
        folder_name = os.path.basename(os.path.abspath(path))
        now = datetime.datetime.now().isoformat()
        project_id = f"{folder_name}_{datetime.datetime.now().strftime('%Y%m%d')}_{str(uuid.uuid4())[:8]}"
        user = getpass.getuser()
        base_metadata = {
            "projectID": project_id,
            "created": now,
            "created_by": f"secretsagent-cli v1.0 ({user})",
            "project_name": folder_name,
            "tags": [],
        }
        if metadata:
            base_metadata.update(metadata)
        with open(marker_path, 'w', encoding='utf-8') as f:
            f.write("# This directory is a managed Secrets Agent project marker.\n")
            f.write("# DO NOT DELETE. DO NOT PUT SECRETS OR SENSITIVE DATA IN THIS FILE.\n")
            f.write("# This file is for project metadata only.\n\n")
            import yaml
            yaml.dump(base_metadata, f, default_flow_style=False, sort_keys=False)
        print(f"✅ Marked as project: {path}")
        return True
    except Exception as e:
        print(f"❌ Failed to create marker in {path}: {e}")
        return False

def get_all_project_folders(root):
    # Recursively find all folders with secretsagent.proj
    project_folders = []
    for dirpath, dirnames, filenames in os.walk(root):
        if "secretsagent.proj" in filenames:
            project_folders.append(dirpath)
    return project_folders

def main():
    parser = argparse.ArgumentParser(
        description="Cursor & Rules Sync Agent - Recursively scan and sync .cursor and .rules files"
    )
    
    parser.add_argument(
        "action",
        choices=["scan", "generate", "sync", "full", "project-init", "add-project"],
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
    elif args.action == "project-init":
        candidates = find_candidate_projects(args.path)
        confirmed = interactive_project_selection(candidates)
        for folder in confirmed:
            create_project_marker(folder)
        print("\nProject initialization complete. Future runs will only act on these folders.")
        return
    elif args.action == "add-project":
        folder = os.path.abspath(args.path)
        if not os.path.isdir(folder):
            print(f"❌ Not a valid directory: {folder}")
            return
        create_project_marker(folder)
        print("\nYou can now run the agent as usual. This folder will be included.")
        return
    else:
        actions = [args.action]
    
    # For all other actions, restrict to folders with secretsagent.proj
    project_folders = get_all_project_folders(args.path)
    if not project_folders:
        print("❌ No project folders found. Run 'project-init' or 'add-project' first.")
        return
    results = {}
    for folder in project_folders:
        for action in actions:
            logger.info(f"Executing action: {action} in {folder}")
            task_data = {
                "action": action,
                "target_path": folder,
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
            agent = CursorRulesSyncAgent(
                agent_id="cursor_rules_sync_manual",
                core_config={},
                plugin_manager=None
            )
            result = agent.process_task(task_data)
            results[(folder, action)] = result
            if result["status"] != "success":
                logger.error(f"Action {action} failed in {folder}: {result.get('error_message', 'Unknown error')}")
                break
    
    # Output results (grouped by folder)
    if args.output == "json":
        print(json.dumps(results, indent=2))
    elif args.output == "minimal":
        for (folder, action), result in results.items():
            print(f"{folder} {action}: {result['status']}")
    else:  # pretty
        for (folder, action), result in results.items():
            print(f"\n🔍 Cursor & Rules Sync Results for {folder}")
            print("=" * 50)
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