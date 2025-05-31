"""
cli.py — Part of MetaFabric Production v1.1.0
Auto-generated under Domino Mode
"""

import argparse
from pathlib import Path
from env_scanner import scan_env_and_tools
from secret_broker import SecretBroker
from symlink_manager import link_env, link_tool
from access_mesh import AccessMesh
import yaml
import json
import time
import shutil # Import shutil for copy operations
import glob
import os
import fnmatch

def cmd_scan(project_path: Path):
    result = scan_env_and_tools(project_path)
    print("[SCAN RESULT]")
    print("Env Keys:", result['env_keys'])
    print("Tools:", result['tools'])

def cmd_link(project_path: Path, secure=False, password=None):
    broker = SecretBroker(Path("secrets.yaml"), secure=secure, password=password)
    scan_result = scan_env_and_tools(project_path)
    secrets = broker.resolve(scan_result["env_keys"])

    missing_keys = [k for k, v in secrets.items() if not v]
    if missing_keys:
        print(f"[X] Missing secrets for: {', '.join(missing_keys)}")

    env_path = Path.home() / ".vanta" / "envs" / f"{project_path.name}.env"
    env_path.parent.mkdir(parents=True, exist_ok=True)
    with env_path.open("w") as f:
        for k, v in secrets.items():
            f.write(f"{k}={v}\n")
    link_env(project_path, env_path)

    tool_paths = []
    for tool in scan_result["tools"]:
        tool_path = Path.home() / ".vanta" / "mcp" / "tools" / f"{tool}.mcp"
        tool_path.parent.mkdir(parents=True, exist_ok=True)
        if not tool_path.exists():
            tool_path.write_text(f"# MCP tool: {tool}")
        link_tool(project_path, tool_path)
        tool_paths.append(tool)

    mesh = AccessMesh(Path("access_mesh.yaml"))
    mesh.bind(project_path.name, tool_paths, list(secrets.keys()))

def cmd_sync_shared_resources(project_path: Path, master_shared_resources_yaml_path: Path):
    """Synchronizes shared resources to the project based on a manifest file."""
    print(f"[SYNC SHARED] Synchronizing shared resources for {project_path} from {master_shared_resources_yaml_path}")

    if not master_shared_resources_yaml_path.exists():
        print(f"[X] Master shared resources manifest not found: {master_shared_resources_yaml_path}")
        return

    try:
        with open(master_shared_resources_yaml_path, 'r') as f:
            manifest = yaml.safe_load(f)
    except Exception as e:
        print(f"[X] Error loading shared resources manifest {master_shared_resources_yaml_path}: {e}")
        return

    if not manifest or 'shared_resources' not in manifest:
        print(f"[!] No 'shared_resources' defined in {master_shared_resources_yaml_path} or manifest is empty.")
        return

    master_config_root = master_shared_resources_yaml_path.parent
    sync_info = {
        "last_sync_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source_manifest": str(master_shared_resources_yaml_path),
        "synced_items": []
    }

    for item in manifest['shared_resources']:
        item_type = item.get('type')
        item_source_rel = item.get('source')
        item_target_rel = item.get('target')

        if not all([item_type, item_source_rel, item_target_rel]):
            print(f"[X] Skipping invalid item in manifest: {item} (missing type, source, or target)")
            continue

        source_abs = (master_config_root / item_source_rel).resolve()
        target_abs = (project_path / item_target_rel).resolve()

        print(f"  Processing: [{item_type}] {item_source_rel} -> {item_target_rel}")
        print(f"    Source Absolute: {source_abs}")
        print(f"    Target Absolute: {target_abs}")

        # Ensure source exists
        if not source_abs.exists():
            print(f"    [X] Source path does not exist: {source_abs}")
            sync_info['synced_items'].append({
                "source": str(item_source_rel),
                "target": str(item_target_rel),
                "status": "error",
                "message": f"Source not found: {source_abs}"
            })
            continue

        # Ensure target parent directory exists
        target_abs.parent.mkdir(parents=True, exist_ok=True)

        try:
            if item_type == "symlink_file":
                if target_abs.exists() and target_abs.is_symlink():
                    target_abs.unlink()
                elif target_abs.exists(): # It's a real file/dir, remove it before symlinking
                    print(f"    [!] Target {target_abs} exists and is not a symlink. Removing it.")
                    if target_abs.is_dir():
                        shutil.rmtree(target_abs)
                    else:
                        target_abs.unlink()
                target_abs.symlink_to(source_abs)
                print(f"    [✓] Symlinked file: {target_abs} -> {source_abs}")
                sync_info['synced_items'].append({"source": str(item_source_rel), "target": str(item_target_rel), "status": "symlinked_file"})
            
            elif item_type == "symlink_dir":
                if target_abs.exists() and target_abs.is_symlink():
                    target_abs.unlink() # Remove old symlink
                elif target_abs.exists(): # It's a real dir/file, remove it
                    print(f"    [!] Target {target_abs} exists and is not a symlink. Removing it.")
                    if target_abs.is_dir():
                        shutil.rmtree(target_abs)
                    else:
                        target_abs.unlink()
                # For directory symlinks, target_is_directory=True is important on Windows
                target_abs.symlink_to(source_abs, target_is_directory=True)
                print(f"    [✓] Symlinked directory: {target_abs} -> {source_abs}")
                sync_info['synced_items'].append({"source": str(item_source_rel), "target": str(item_target_rel), "status": "symlinked_dir"})

            elif item_type == "copy_file":
                if target_abs.exists():
                    print(f"    [!] Target {target_abs} exists. Removing it before copying.")
                    if target_abs.is_dir(): # Should not happen if source is a file
                        shutil.rmtree(target_abs)
                    else:
                        target_abs.unlink()
                shutil.copy2(source_abs, target_abs) # copy2 preserves metadata
                print(f"    [✓] Copied file: {source_abs} -> {target_abs}")
                sync_info['synced_items'].append({"source": str(item_source_rel), "target": str(item_target_rel), "status": "copied_file"})
            
            elif item_type == "copy_dir":
                if target_abs.exists():
                    print(f"    [!] Target {target_abs} exists. Removing it before copying.")
                    shutil.rmtree(target_abs) # Remove existing directory/file
                shutil.copytree(source_abs, target_abs) # copytree copies directory contents
                print(f"    [✓] Copied directory: {source_abs} -> {target_abs}")
                sync_info['synced_items'].append({"source": str(item_source_rel), "target": str(item_target_rel), "status": "copied_dir"})

            else:
                print(f"    [X] Unknown item type: {item_type}")
                sync_info['synced_items'].append({
                    "source": str(item_source_rel),
                    "target": str(item_target_rel),
                    "status": "error",
                    "message": f"Unknown type: {item_type}"
                })
        except Exception as e:
            print(f"    [X] Error processing item {item}: {e}")
            sync_info['synced_items'].append({
                "source": str(item_source_rel),
                "target": str(item_target_rel),
                "status": "error",
                "message": str(e)
            })

    # Write sync_info
    project_vanta_dir = project_path / ".vanta"
    project_vanta_dir.mkdir(parents=True, exist_ok=True)
    sync_info_file = project_vanta_dir / ".sync-info.json"
    try:
        with open(sync_info_file, 'w') as f:
            json.dump(sync_info, f, indent=2)
        print(f"[✓] Sync info written to {sync_info_file}")
    except Exception as e:
        print(f"[X] Error writing sync info to {sync_info_file}: {e}")

def cmd_list():
    print("Available commands: scan, link, bootstrap, list")

def cmd_list_tools():
    from yaml import safe_load
    tool_registry = Path("tool_registry.yaml")
    if not tool_registry.exists():
        print("[X] No tool_registry.yaml found.")
        return
    tools = safe_load(tool_registry.read_text())["tools"]
    for name, meta in tools.items():
        print(f"{name} (v{meta['version']}) — assigned to: {', '.join(meta['assigned_to'])}")

def cmd_upgrade_tool(tool_name, version):
    registry = Path("tool_registry.yaml")
    if not registry.exists():
        print("[X] Registry not found.")
        return
    from yaml import safe_load, dump
    tools = safe_load(registry.read_text())
    if tool_name not in tools["tools"]:
        print(f"[X] Tool not found: {tool_name}")
        return
    tools["tools"][tool_name]["version"] = version
    registry.write_text(dump(tools, sort_keys=False))
    print(f"[✓] {tool_name} upgraded to v{version}")

def cmd_bootstrap(project_path: Path, secure=False, password=None):
    print(f"[BOOTSTRAP] Running full symbolic binding...")
    cmd_scan(project_path)
    cmd_link(project_path, secure=secure, password=password)
    
    # Assuming shared_resources.yaml is in the root of the current project directory (where cli.py is)
    # This path points to the shared_resources.yaml in the *current* project, acting as the master.
    master_manifest_path = Path(".").resolve() / "shared_resources.yaml"
    cmd_sync_shared_resources(project_path, master_manifest_path)

def cmd_add_secret(key, value, secure=False, password=None):
    """Add or update a secret"""
    if secure:
        print("[🔒] Adding secret to secure storage...")
    else:
        print("[+] Adding secret to secrets.yaml...")
        
    broker = SecretBroker(Path("secrets.yaml"), secure=secure, password=password)
    result = broker.add_secret(key, value)
    
    if result:
        print(f"[✓] Secret '{key}' added successfully")
    else:
        print(f"[X] Failed to add secret '{key}'")

def cmd_mcp_read_file(file_path: str) -> dict:
    """Read contents of a file and return as JSON response."""
    try:
        path = Path(file_path)
        if not path.exists():
            return {"success": False, "error": f"File not found: {file_path}"}
        
        content = path.read_text(encoding='utf-8')
        return {
            "success": True,
            "content": content,
            "metadata": {
                "size": path.stat().st_size,
                "modified": path.stat().st_mtime,
                "created": path.stat().st_ctime
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def cmd_mcp_list_dir(directory: str, pattern: str = "*") -> dict:
    """List contents of a directory with optional pattern matching."""
    try:
        path = Path(directory)
        if not path.exists():
            return {"success": False, "error": f"Directory not found: {directory}"}
        
        items = []
        for item in path.glob(pattern):
            items.append({
                "name": item.name,
                "path": str(item),
                "type": "directory" if item.is_dir() else "file",
                "size": item.stat().st_size if item.is_file() else None
            })
        
        return {
            "success": True,
            "items": items,
            "metadata": {
                "total_items": len(items),
                "pattern": pattern
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def cmd_mcp_search_files(directory: str, pattern: str, recursive: bool = True) -> dict:
    """Search for files matching a pattern."""
    try:
        path = Path(directory)
        if not path.exists():
            return {"success": False, "error": f"Directory not found: {directory}"}
        
        matches = []
        if recursive:
            for root, _, files in os.walk(path):
                for filename in fnmatch.filter(files, pattern):
                    file_path = Path(root) / filename
                    matches.append({
                        "name": filename,
                        "path": str(file_path),
                        "size": file_path.stat().st_size
                    })
        else:
            for item in path.glob(pattern):
                if item.is_file():
                    matches.append({
                        "name": item.name,
                        "path": str(item),
                        "size": item.stat().st_size
                    })
        
        return {
            "success": True,
            "matches": matches,
            "metadata": {
                "total_matches": len(matches),
                "pattern": pattern,
                "recursive": recursive
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MetaFabric CLI")
    subparsers = parser.add_subparsers(dest="command")

    scan_parser = subparsers.add_parser("scan")
    scan_parser.add_argument("project_path", type=Path)

    link_parser = subparsers.add_parser("link")
    link_parser.add_argument("project_path", type=Path)
    link_parser.add_argument("--secure", action="store_true", help="Use secure encrypted storage")

    bootstrap_parser = subparsers.add_parser("bootstrap")
    bootstrap_parser.add_argument("project_path", type=Path)
    bootstrap_parser.add_argument("--secure", action="store_true", help="Use secure encrypted storage")

    watch_parser = subparsers.add_parser("watch")
    watch_parser.add_argument("project_path", type=Path)

    # Add new command for adding secrets
    add_secret_parser = subparsers.add_parser("add-secret")
    add_secret_parser.add_argument("--key", required=True, help="Secret key name")
    add_secret_parser.add_argument("--value", required=True, help="Secret value")
    add_secret_parser.add_argument("--secure", action="store_true", help="Use secure encrypted storage")

    subparsers.add_parser("list-tools")
    upgrade_parser = subparsers.add_parser("upgrade-tool")
    upgrade_parser.add_argument("tool_name")
    upgrade_parser.add_argument("version")

    scanroot_parser = subparsers.add_parser("scan-root")
    scanroot_parser.add_argument("--dir", required=True)

    # New subparser for sync-shared-resources
    sync_shared_parser = subparsers.add_parser("sync-shared-resources", help="Synchronize shared resources from a master manifest to a project.")
    sync_shared_parser.add_argument("project_path", type=Path, help="Path to the target project directory.")
    sync_shared_parser.add_argument("master_shared_resources_yaml_path", type=Path, help="Path to the master shared_resources.yaml manifest file.")

    subparsers.add_parser("list")

    # Add new MCP commands
    mcp_read_file_parser = subparsers.add_parser("mcp-read-file")
    mcp_read_file_parser.add_argument("--file-path", help="Path to file for mcp-read-file")
    mcp_list_dir_parser = subparsers.add_parser("mcp-list-dir")
    mcp_list_dir_parser.add_argument("--directory", help="Directory path for mcp-list-dir and mcp-search-files")
    mcp_list_dir_parser.add_argument("--pattern", help="Pattern for mcp-list-dir and mcp-search-files")
    mcp_search_files_parser = subparsers.add_parser("mcp-search-files")
    mcp_search_files_parser.add_argument("--directory", help="Directory path for mcp-search-files")
    mcp_search_files_parser.add_argument("--pattern", help="Pattern for mcp-search-files")
    mcp_search_files_parser.add_argument("--recursive", action="store_true", help="Recursive search for mcp-search-files")
    mcp_search_files_parser.add_argument("--format", choices=["text", "json"], default="text", help="Output format")

    args = parser.parse_args()
    
    # Handle password for secure storage operations
    password = None
    if hasattr(args, 'secure') and args.secure:
        import getpass
        password = getpass.getpass("Enter master password: ")
        
    if args.command == "scan":
        cmd_scan(args.project_path)
    elif args.command == "link":
        cmd_link(args.project_path, secure=args.secure, password=password)
    elif args.command == "bootstrap":
        cmd_bootstrap(args.project_path, secure=args.secure, password=password)
    elif args.command == "list-tools":
        cmd_list_tools()
    elif args.command == "upgrade-tool":
        cmd_upgrade_tool(args.tool_name, args.version)
    elif args.command == "scan-root":
        from project_scanner import scan_projects_with_rules
        scan_projects_with_rules(args.dir, "rules")
    elif args.command == "list":
        cmd_list()
    elif args.command == "watch":
        from watcher_daemon import watch_project
        watch_project(str(args.project_path))
    elif args.command == "add-secret":
        cmd_add_secret(args.key, args.value, secure=args.secure, password=password)
    elif args.command == "sync-shared-resources":
        cmd_sync_shared_resources(args.project_path, args.master_shared_resources_yaml_path)
    # Add new MCP command handlers
    elif args.command == "mcp-read-file":
        result = cmd_mcp_read_file(args.file_path)
        if args.format == "json":
            print(json.dumps(result, indent=2))
        else:
            if result["success"]:
                print(result["content"])
            else:
                print(f"Error: {result['error']}")
    elif args.command == "mcp-list-dir":
        result = cmd_mcp_list_dir(args.directory, args.pattern or "*")
        if args.format == "json":
            print(json.dumps(result, indent=2))
        else:
            if result["success"]:
                for item in result["items"]:
                    print(f"[{item['type']}] {item['name']} ({item['size']} bytes)")
            else:
                print(f"Error: {result['error']}")
    elif args.command == "mcp-search-files":
        result = cmd_mcp_search_files(args.directory, args.pattern, args.recursive)
        if args.format == "json":
            print(json.dumps(result, indent=2))
        else:
            if result["success"]:
                for match in result["matches"]:
                    print(f"{match['path']} ({match['size']} bytes)")
            else:
                print(f"Error: {result['error']}")
    else:
        parser.print_help()