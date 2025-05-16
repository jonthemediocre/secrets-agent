from pathlib import Path
import difflib

def diff_env_files(old_path: Path, new_path: Path):
    if not old_path.exists() or not new_path.exists():
        return "[X] One of the env files does not exist."

    old_lines = old_path.read_text().splitlines()
    new_lines = new_path.read_text().splitlines()

    diff = list(difflib.unified_diff(old_lines, new_lines, fromfile='previous.env', tofile='current.env', lineterm=''))
    return "\n".join(diff) if diff else "[✓] No difference in .env.generated"

def append_to_log(log_path: Path, delta_text: str):
    with open(log_path, "a") as f:
        f.write("\n\n# Δ Diff for latest collapse\n")
        f.write(delta_text)