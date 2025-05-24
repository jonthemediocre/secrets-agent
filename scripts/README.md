# VANTA Automation Scripts

This directory contains automation scripts for the VANTA Secrets Management Platform, including backup utilities, commit helpers, and development tools.

## 🔄 Backup & Commit Automation

### Pre-commit Hook (`.git/hooks/pre-commit`)

Automatically runs before every git commit to ensure code quality:

- **TypeScript type checking** - Ensures no type errors
- **ESLint** - Code linting and style checks
- **Prettier** - Code formatting validation
- **Tests** - Runs unit tests (Jest)
- **Python checks** - Linting and tests for Python files
- **Security checks** - Detects potentially sensitive files
- **TODO detection** - Reports TODO/FIXME comments

**Usage:** Automatically runs on `git commit`. No manual intervention needed.

### Quick Backup Scripts

#### PowerShell Version (`quick-backup.ps1`)

```powershell
# Basic backup
.\scripts\quick-backup.ps1

# Backup with commit
.\scripts\quick-backup.ps1 -Commit

# Backup, commit, and push
.\scripts\quick-backup.ps1 -Push

# Custom backup ID
.\scripts\quick-backup.ps1 -BackupId "pre-refactor" -Commit
```

#### Bash Version (`quick-backup.sh`)

```bash
# Basic backup
./scripts/quick-backup.sh

# Backup with commit
./scripts/quick-backup.sh --commit

# Backup, commit, and push
./scripts/quick-backup.sh --push

# Custom backup ID
./scripts/quick-backup.sh --backup-id "pre-refactor" --commit
```

### Smart Commit Script (`smart-commit.ps1`)

Automatically generates meaningful commit messages and integrates with backup system:

```powershell
# Auto-generated commit message
.\scripts\smart-commit.ps1

# Custom commit message
.\scripts\smart-commit.ps1 -Message "Fix authentication bug"

# Backup before commit
.\scripts\smart-commit.ps1 -Backup

# Backup, commit, and push
.\scripts\smart-commit.ps1 -Backup -Push
```

**Features:**
- Analyzes changed files to generate smart commit messages
- Detects file types and scopes (API, UI, tests, config, etc.)
- Optional backup integration
- Automatic staging of unstaged changes
- Interactive confirmation

## 🐍 Python Scripts

### Core Backup Script (`backup_script.py`)

The main backup utility following VANTA's backup protocol:

```bash
python scripts/backup_script.py <instance_id> <project_path> [OPTIONS]

# Examples:
python scripts/backup_script.py dev . --backup-id "manual"
python scripts/backup_script.py prod . --commit --push --backup-id "nightly"
```

**Options:**
- `--backup-id ID` - Backup identifier (default: manual)
- `--commit` - Commit changes after backup
- `--push` - Push to remote (implies --commit)

### Other Utilities

- `rotate-secrets.ts` - Secret rotation automation
- `scan-all-projects.ts` - Project scanning utility
- `deploy.sh` - Deployment script
- `generate_env_from_sops.*` - SOPS environment generation

## 🚀 Quick Start

### For Windows Users (PowerShell)

1. **Make a quick backup:**
   ```powershell
   .\scripts\quick-backup.ps1
   ```

2. **Smart commit with backup:**
   ```powershell
   .\scripts\smart-commit.ps1 -Backup -Push
   ```

3. **Manual backup with commit:**
   ```powershell
   .\scripts\quick-backup.ps1 -Commit -BackupId "before-major-change"
   ```

### For Unix/Linux/macOS Users (Bash)

1. **Make a quick backup:**
   ```bash
   ./scripts/quick-backup.sh
   ```

2. **Backup with commit and push:**
   ```bash
   ./scripts/quick-backup.sh --commit --push
   ```

3. **Direct Python backup:**
   ```bash
   python scripts/backup_script.py dev . --commit --backup-id "manual"
   ```

## 🔧 Configuration

### Git Hooks

The pre-commit hook is automatically installed in `.git/hooks/pre-commit`. It:
- Requires Node.js and npm
- Falls back gracefully if tools are missing
- Provides helpful error messages and suggestions

### Backup Protocol Compliance

All scripts follow the VANTA backup and commit protocol (`.cursor/rules/008-backup-and-commit-protocol.mdc`):
- Structured logging and audit trails
- Proper exclusion patterns (.git, .venv, cache, etc.)
- Configurable backup locations
- Integration with git workflows

### Script Dependencies

- **PowerShell scripts:** Require PowerShell 5.1+ or PowerShell Core
- **Bash scripts:** Require Bash 4.0+
- **Python scripts:** Require Python 3.7+
- **Git hooks:** Require Node.js 16+ and npm

## 📝 Best Practices

1. **Before major changes:**
   ```powershell
   .\scripts\quick-backup.ps1 -BackupId "pre-refactor" -Commit
   ```

2. **Daily backups:**
   ```bash
   python scripts/backup_script.py dev . --commit --backup-id "daily-$(date +%Y%m%d)"
   ```

3. **Release preparation:**
   ```powershell
   .\scripts\smart-commit.ps1 -Message "Prepare release v1.0.0" -Backup -Push
   ```

4. **Emergency backup:**
   ```bash
   ./scripts/quick-backup.sh --push --backup-id "emergency-$(date +%H%M%S)"
   ```

## 🔍 Troubleshooting

### Pre-commit Hook Issues

- **"Command not found":** Ensure Node.js, npm, and git are in PATH
- **TypeScript errors:** Run `npm run type-check` to see details
- **Lint failures:** Run `npm run lint:fix` to auto-fix issues
- **Test failures:** Run `npm test` to see detailed test results

### Backup Script Issues

- **Python not found:** Install Python 3.7+ and ensure it's in PATH
- **Permission errors:** Check file/directory permissions
- **Git errors:** Ensure you're in a git repository with proper remote setup

### General Issues

- **PowerShell execution policy:** Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- **File not found:** Ensure you're running scripts from the project root
- **Network issues:** Check internet connection for git push operations

## 📚 Integration with Development Workflow

These scripts integrate seamlessly with:
- **VANTA's agentic development philosophy**
- **Cursor IDE with rules-based development**
- **GitHub/GitLab workflows**
- **CI/CD pipelines**
- **Disaster recovery procedures**

For more information, see the main project documentation and `.cursor/rules/` directory. 