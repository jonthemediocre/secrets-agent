# vanta_secrets_audit.py
import re, os
from pathlib import Path

def scan_file(file_path):
    content = Path(file_path).read_text(errors="ignore")
    leaks = re.findall(r"(api|secret|token|key)[_\-]?[a-z]*\s*=\s*['\"]\w+?['\"]", content, re.IGNORECASE)
    return leaks

def audit():
    findings = {}
    for f in Path(".").rglob("*.*"):
        if f.suffix in [".py", ".env", ".md", ".txt"]:
            results = scan_file(f)
            if results:
                findings[str(f)] = results

    if findings:
        print("[!🔐] Potential leaks found:")
        for file, keys in findings.items():
            print(f"  {file}: {keys}")
    else:
        print("[✅] No secrets detected.")

if __name__ == "__main__":
    audit()