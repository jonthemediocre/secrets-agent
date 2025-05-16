import time
import hashlib
from pathlib import Path
import subprocess

def hash_file(path):
    if not path.exists():
        return None
    return hashlib.md5(path.read_bytes()).hexdigest()

def watch_secrets(path: Path, project_path: Path, interval=3):
    print(f"[🧬] Watching {path} for changes...")
    last_hash = hash_file(path)
    while True:
        time.sleep(interval)
        new_hash = hash_file(path)
        if new_hash != last_hash:
            print("[⚡] Detected change in secrets.yaml! Re-binding...")
            subprocess.run(["python3", "cli.py", "bootstrap", str(project_path)])
            last_hash = new_hash

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("project_path", type=str, help="Path to project folder")
    parser.add_argument("--secrets_path", type=str, default="secrets.yaml")
    args = parser.parse_args()
    watch_secrets(Path(args.secrets_path), Path(args.project_path))