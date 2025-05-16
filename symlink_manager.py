"""
symlink_manager.py — Part of MetaFabric Production v1.1.0
Auto-generated under Domino Mode
"""

from pathlib import Path

def link_env(project_path: Path, env_source_path: Path):
    if not env_source_path.exists():
        print(f"[X] Env source missing: {env_source_path}")
        return
    env_link = project_path / ".env"
    if env_link.exists() or env_link.is_symlink():
        env_link.unlink()
    env_link.symlink_to(env_source_path.resolve())
    print(f"[✓] Linked .env -> {env_source_path}")

def link_tool(project_path: Path, tool_source_path: Path):
    if not tool_source_path.exists():
        print(f"[X] Tool source missing: {tool_source_path}")
        return
    tools_dir = project_path / "tools"
    tools_dir.mkdir(exist_ok=True)
    tool_link = tools_dir / tool_source_path.name
    if tool_link.exists() or tool_link.is_symlink():
        tool_link.unlink()
    tool_link.symlink_to(tool_source_path.resolve())
    print(f"[✓] Linked {tool_source_path.name} -> tools/")