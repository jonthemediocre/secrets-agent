# SOPS YAML Normalization Scripts

These scripts ensure `.sops.yaml` is always:
- UTF-8 (no BOM)
- LF line endings
- Spaces only (no tabs)

## Usage

### PowerShell (Windows)
```powershell
cd <repo-root>
pwsh scripts/normalize/normalize_sops_yaml.ps1
```

### Bash (Linux, macOS, WSL, Git Bash)
```bash
cd <repo-root>
bash scripts/normalize/normalize_sops_yaml.sh
```

### Python (Cross-platform)
```bash
cd <repo-root>
python scripts/normalize/normalize_sops_yaml.py
```

## When to Use
- After editing `.sops.yaml` in any editor
- Before running SOPS if you encounter YAML errors
- As a pre-commit hook for secrets automation

## What It Fixes
- Encoding issues (UTF-8 BOM)
- Windows/Unix line ending mismatches
- Accidental tab characters

---
**Maintained for Secrets Agent v1.3.4+** 