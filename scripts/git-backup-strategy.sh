#!/bin/bash
# Git Backup Strategy for VANTA Framework + Secrets Agent
# Comprehensive backup and archival system

set -e

# Configuration
BACKUP_DIR="./backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PROJECT_NAME="secrets-agent-vanta"
REMOTE_BACKUP_BRANCH="backup-${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 VANTA Framework Git Backup Strategy${NC}"
echo -e "${BLUE}======================================${NC}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo -e "\n${YELLOW}📋 Phase 1: Repository Status Analysis${NC}"
echo "----------------------------------------"

# Check git status
echo "Git Status:"
git status --porcelain | head -20
echo "..."

# Count changes
MODIFIED_FILES=$(git status --porcelain | grep "^ M" | wc -l)
NEW_FILES=$(git status --porcelain | grep "^??" | wc -l)
DELETED_FILES=$(git status --porcelain | grep "^ D" | wc -l)

echo -e "📊 Changes Summary:"
echo -e "   Modified files: ${MODIFIED_FILES}"
echo -e "   New files: ${NEW_FILES}"
echo -e "   Deleted files: ${DELETED_FILES}"

echo -e "\n${YELLOW}📋 Phase 2: Pre-Backup Commit${NC}"
echo "----------------------------------------"

# Add all changes to staging
echo "Adding all changes to staging..."
git add .

# Create comprehensive commit message
COMMIT_MSG="🔄 Complete backup commit - ${TIMESTAMP}

📦 Comprehensive backup including:
- DGM (Darwin Gödel Machine) integration
- Enhanced symbolic trace memory
- GitHub workflows (781 lines CI/CD)
- Level 2 rules framework
- VANTA framework components
- Agent orchestration system
- Security hardening features
- Production deployment configs

🧬 DGM Components:
- DGMBridgeAgent with SWE-bench/Polyglot benchmarks
- Performance delta tracking
- Variant archival system
- Evolution ritual configuration

🔧 Infrastructure:
- Complete CI/CD with security scanning
- Multi-environment deployment
- Secrets management & rotation
- Docker containerization

📊 Statistics:
- Modified: ${MODIFIED_FILES} files
- New: ${NEW_FILES} files  
- Deleted: ${DELETED_FILES} files
- Backup timestamp: ${TIMESTAMP}"

# Commit all changes
echo "Committing changes with comprehensive message..."
git commit -m "${COMMIT_MSG}" || echo "No changes to commit"

echo -e "\n${YELLOW}📋 Phase 3: Create Archive Bundles${NC}"
echo "----------------------------------------"

# Create git bundle (complete repository backup)
echo "Creating git bundle..."
git bundle create "${BACKUP_DIR}/${PROJECT_NAME}-complete-${TIMESTAMP}.bundle" --all

# Create compressed archive
echo "Creating compressed archive..."
tar -czf "${BACKUP_DIR}/${PROJECT_NAME}-files-${TIMESTAMP}.tar.gz" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.next' \
    --exclude='dist' \
    --exclude='build' \
    .

echo -e "\n${YELLOW}📋 Phase 4: Key Components Backup${NC}"
echo "----------------------------------------"

# Backup critical configuration files
mkdir -p "${BACKUP_DIR}/configs"
cp -r .github "${BACKUP_DIR}/configs/" 2>/dev/null || true
cp -r cursor_rules "${BACKUP_DIR}/configs/" 2>/dev/null || true
cp -r rituals "${BACKUP_DIR}/configs/" 2>/dev/null || true
cp -r docs "${BACKUP_DIR}/configs/" 2>/dev/null || true
cp docker-compose*.yml "${BACKUP_DIR}/configs/" 2>/dev/null || true
cp Dockerfile* "${BACKUP_DIR}/configs/" 2>/dev/null || true
cp package.json "${BACKUP_DIR}/configs/" 2>/dev/null || true
cp *.md "${BACKUP_DIR}/configs/" 2>/dev/null || true

# Backup VANTA framework
mkdir -p "${BACKUP_DIR}/vanta-framework"
cp -r lib/vanta-framework "${BACKUP_DIR}/vanta-framework/" 2>/dev/null || true
cp -r vanta-framework "${BACKUP_DIR}/vanta-framework/" 2>/dev/null || true
cp -r .vanta "${BACKUP_DIR}/vanta-framework/" 2>/dev/null || true

# Backup agent components
mkdir -p "${BACKUP_DIR}/agents"
cp -r src/agents "${BACKUP_DIR}/agents/" 2>/dev/null || true
cp -r app/api/agents "${BACKUP_DIR}/agents/" 2>/dev/null || true
cp -r agents "${BACKUP_DIR}/agents/" 2>/dev/null || true

echo -e "\n${YELLOW}📋 Phase 5: Generate Backup Manifest${NC}"
echo "----------------------------------------"

# Create backup manifest
cat > "${BACKUP_DIR}/BACKUP_MANIFEST_${TIMESTAMP}.md" << EOF
# Git Backup Manifest
**Backup Date**: $(date)
**Backup ID**: ${TIMESTAMP}
**Project**: ${PROJECT_NAME}

## Backup Contents

### 1. Complete Repository Bundle
- **File**: ${PROJECT_NAME}-complete-${TIMESTAMP}.bundle
- **Type**: Git bundle with full history
- **Restore**: \`git clone backup.bundle restored-repo\`

### 2. File Archive
- **File**: ${PROJECT_NAME}-files-${TIMESTAMP}.tar.gz
- **Type**: Compressed file archive (no git history)
- **Restore**: \`tar -xzf archive.tar.gz\`

### 3. Configuration Backup
- **Path**: configs/
- **Contents**: 
  - GitHub workflows (CI/CD)
  - Cursor rules framework
  - Ritual configurations
  - Docker configurations
  - Documentation

### 4. VANTA Framework Backup
- **Path**: vanta-framework/
- **Contents**:
  - DGM (Darwin Gödel Machine) components
  - Symbolic trace memory
  - Agent orchestration
  - Protocol definitions

### 5. Agent Components Backup
- **Path**: agents/
- **Contents**:
  - Agent implementations
  - UAP manifests
  - Orchestration configs

## Statistics
- **Repository Size**: $(du -sh . | cut -f1)
- **Backup Size**: $(du -sh ${BACKUP_DIR} | cut -f1)
- **Commit Hash**: $(git rev-parse HEAD)
- **Branch**: $(git branch --show-current)

## Key Features Preserved

### 🧬 Darwin Gödel Machine (DGM)
- Benchmark-driven agent evolution
- SWE-bench & Polyglot integration
- Performance delta tracking
- Variant archival system

### 🔄 CI/CD Pipeline
- 781 lines of production-grade workflows
- Security scanning (TruffleHog, Trivy, Snyk)
- Multi-environment deployment
- Automated release management

### 🎯 VANTA Framework
- Universal Agent Protocol (UAP)
- Symbolic reasoning system
- Agent orchestration
- Level 2 rules framework

### 🔐 Security Features
- Secrets management & rotation
- Vault integration
- Security hardening
- Compliance monitoring

## Recovery Instructions

### Quick Restore (with history):
\`\`\`bash
git clone ${PROJECT_NAME}-complete-${TIMESTAMP}.bundle restored-project
cd restored-project
npm install
\`\`\`

### File-only Restore:
\`\`\`bash
tar -xzf ${PROJECT_NAME}-files-${TIMESTAMP}.tar.gz
cd restored-files
git init
git add .
git commit -m "Restored from backup ${TIMESTAMP}"
npm install
\`\`\`

## Validation Checklist
- [ ] Git bundle integrity verified
- [ ] Archive extraction tested
- [ ] Critical configs preserved
- [ ] VANTA framework components intact
- [ ] Agent systems backed up
- [ ] Documentation preserved
EOF

echo -e "\n${YELLOW}📋 Phase 6: Push to Remote Backup Branch${NC}"
echo "----------------------------------------"

# Create and push backup branch
echo "Creating backup branch..."
git checkout -b "${REMOTE_BACKUP_BRANCH}"
git push origin "${REMOTE_BACKUP_BRANCH}" 2>/dev/null || echo "Remote push failed (normal if no remote configured)"
git checkout main

echo -e "\n${YELLOW}📋 Phase 7: Verification${NC}"
echo "----------------------------------------"

# Verify bundle integrity
echo "Verifying bundle integrity..."
git bundle verify "${BACKUP_DIR}/${PROJECT_NAME}-complete-${TIMESTAMP}.bundle"

# Show backup summary
echo -e "\n${GREEN}✅ Backup Complete!${NC}"
echo -e "==================="
echo -e "📁 Backup Location: ${BACKUP_DIR}"
echo -e "📦 Bundle: ${PROJECT_NAME}-complete-${TIMESTAMP}.bundle"
echo -e "🗜️  Archive: ${PROJECT_NAME}-files-${TIMESTAMP}.tar.gz"
echo -e "📋 Manifest: BACKUP_MANIFEST_${TIMESTAMP}.md"
echo -e "🌿 Backup Branch: ${REMOTE_BACKUP_BRANCH}"

# Show backup sizes
echo -e "\n📊 Backup Sizes:"
ls -lh "${BACKUP_DIR}"/*${TIMESTAMP}*

echo -e "\n${GREEN}🎉 Complete backup strategy executed successfully!${NC}"
echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "1. Store backup files in secure location"
echo -e "2. Test restore process periodically"
echo -e "3. Update backup strategy as needed"
echo -e "4. Consider automated backup scheduling"

# Optional: Create symbolic link to latest backup
ln -sf "BACKUP_MANIFEST_${TIMESTAMP}.md" "${BACKUP_DIR}/LATEST_BACKUP.md"

echo -e "\n${YELLOW}💡 Pro Tip:${NC} Run this script regularly to maintain up-to-date backups!" 