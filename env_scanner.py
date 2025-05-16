"""
env_scanner.py — Part of MetaFabric Production v1.1.0
Auto-generated under Domino Mode
"""

import os
import re
from pathlib import Path

def scan_env_and_tools(path: Path) -> dict:
    env_keys = set()
    tools = set()
    env_patterns = [re.compile(r"os\.getenv\(['\"]([A-Z0-9_]+)['\"]\)")]
    doc_patterns = {
        "OPENAI_API_KEY": re.compile(r"OpenAI", re.IGNORECASE),
        "SummarizeTranscript": re.compile(r"summarization|summarize", re.IGNORECASE),
        "ChronoMeshSync": re.compile(r"ChronoMesh", re.IGNORECASE)
    }

    for file in path.rglob("*"):
        if file.suffix in {'.py', '.yaml', '.yml', '.md'}:
            try:
                content = file.read_text()
                for pattern in env_patterns:
                    env_keys.update(pattern.findall(content))
                for key, pattern in doc_patterns.items():
                    if pattern.search(content):
                        if 'KEY' in key:
                            env_keys.add(key)
                        else:
                            tools.add(key)
            except Exception:
                continue
    return {"env_keys": sorted(env_keys), "tools": sorted(tools)}

if __name__ == "__main__":
    result = scan_env_and_tools(Path("test_project"))
    print("[SCAN RESULT]")
    print("Env Keys:", result['env_keys'])
    print("Tools:", result['tools'])