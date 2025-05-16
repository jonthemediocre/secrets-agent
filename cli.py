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

    subparsers.add_parser("list")

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
    else:
        parser.print_help()