"""
access_mesh.py — Part of MetaFabric Production v1.1.0
Auto-generated under Domino Mode
"""

import yaml
from pathlib import Path

class AccessMesh:
    def __init__(self, registry_path: Path):
        self.registry_path = registry_path
        if self.registry_path.exists():
            self.mesh = yaml.safe_load(self.registry_path.read_text()) or {}
        else:
            self.mesh = {}

    def bind(self, project: str, tools: list, secrets: list):
        self.mesh[project] = {
            "tools": sorted(tools),
            "secrets": sorted(secrets)
        }
        self.registry_path.write_text(yaml.dump(self.mesh, sort_keys=False))
        print(f"[✓] AccessMesh binding updated: {self.registry_path}")