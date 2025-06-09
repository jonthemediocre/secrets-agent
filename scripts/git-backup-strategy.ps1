# Git Backup Strategy for VANTA Framework + Secrets Agent (PowerShell)
# Comprehensive backup and archival system for Windows

param(
    [string]$BackupDir = "./backup",
    [switch]$SkipPush = $false
)

# Configuration
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ProjectName = "secrets-agent-vanta"
$RemoteBackupBranch = "backup-$Timestamp"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green" 
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

Write-Host "🚀 VANTA Framework Git Backup Strategy" -ForegroundColor $Colors.Blue
Write-Host "======================================" -ForegroundColor $Colors.Blue

# Create backup directory
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

Write-Host "`n📋 Phase 1: Repository Status Analysis" -ForegroundColor $Colors.Yellow
Write-Host "----------------------------------------"

# Check git status
Write-Host "Git Status:"
$gitStatus = git status --porcelain
$gitStatus | Select-Object -First 20
if ($gitStatus.Count -gt 20) { Write-Host "..." }

# Count changes
$ModifiedFiles = ($gitStatus | Where-Object { $_ -match "^ M" }).Count
$NewFiles = ($gitStatus | Where-Object { $_ -match "^\?\?" }).Count
$DeletedFiles = ($gitStatus | Where-Object { $_ -match "^ D" }).Count

Write-Host "📊 Changes Summary:"
Write-Host "   Modified files: $ModifiedFiles"
Write-Host "   New files: $NewFiles"
Write-Host "   Deleted files: $DeletedFiles"

Write-Host "`n📋 Phase 2: Pre-Backup Commit" -ForegroundColor $Colors.Yellow
Write-Host "----------------------------------------"

# Add all changes to staging
Write-Host "Adding all changes to staging..."
git add .

# Create comprehensive commit message - fix syntax issues
$CommitMsg = "🔄 Complete backup commit - $Timestamp

📦 Comprehensive backup including:
* DGM (Darwin Gödel Machine) integration
* Enhanced symbolic trace memory
* GitHub workflows (781 lines CI/CD)
* Level 2 rules framework
* VANTA framework components
* Agent orchestration system
* Security hardening features
* Production deployment configs

🧬 DGM Components:
* DGMBridgeAgent with SWE-bench/Polyglot benchmarks
* Performance delta tracking
* Variant archival system
* Evolution ritual configuration

🔧 Infrastructure:
* Complete CI/CD with security scanning
* Multi-environment deployment
* Secrets management and rotation
* Docker containerization

📊 Statistics:
* Modified: $ModifiedFiles files
* New: $NewFiles files  
* Deleted: $DeletedFiles files
* Backup timestamp: $Timestamp"

# Commit all changes
Write-Host "Committing changes with comprehensive message..."
try {
    git commit -m $CommitMsg
} catch {
    Write-Host "No changes to commit" -ForegroundColor $Colors.Yellow
}

Write-Host "`n📋 Phase 3: Create Archive Bundles" -ForegroundColor $Colors.Yellow
Write-Host "----------------------------------------"

# Create git bundle (complete repository backup)
Write-Host "Creating git bundle..."
$BundlePath = "$BackupDir/$ProjectName-complete-$Timestamp.bundle"
git bundle create $BundlePath --all

# Create compressed archive using PowerShell
Write-Host "Creating compressed archive..."
$ArchivePath = "$BackupDir/$ProjectName-files-$Timestamp.zip"
$ExcludePatterns = @('.git', 'node_modules', '*.log', '.next', 'dist', 'build')

# Get all files except excluded patterns
$FilesToArchive = Get-ChildItem -Recurse | Where-Object {
    $file = $_
    $shouldExclude = $false
    foreach ($pattern in $ExcludePatterns) {
        if ($file.FullName -like "*$pattern*") {
            $shouldExclude = $true
            break
        }
    }
    return !$shouldExclude
}

# Create ZIP archive
Compress-Archive -Path $FilesToArchive.FullName -DestinationPath $ArchivePath -Force

Write-Host "`n📋 Phase 4: Key Components Backup" -ForegroundColor $Colors.Yellow
Write-Host "----------------------------------------"

# Backup critical configuration files
$ConfigsDir = "$BackupDir/configs"
New-Item -ItemType Directory -Path $ConfigsDir -Force | Out-Null

$CriticalPaths = @('.github', 'cursor_rules', 'rituals', 'docs', 'docker-compose*.yml', 'Dockerfile*', 'package.json', '*.md')

foreach ($path in $CriticalPaths) {
    if (Test-Path $path) {
        Copy-Item -Path $path -Destination $ConfigsDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Backup VANTA framework
$VantaDir = "$BackupDir/vanta-framework"
New-Item -ItemType Directory -Path $VantaDir -Force | Out-Null

$VantaPaths = @('lib/vanta-framework', 'vanta-framework', '.vanta')
foreach ($path in $VantaPaths) {
    if (Test-Path $path) {
        Copy-Item -Path $path -Destination $VantaDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Backup agent components
$AgentsDir = "$BackupDir/agents"
New-Item -ItemType Directory -Path $AgentsDir -Force | Out-Null

$AgentPaths = @('src/agents', 'app/api/agents', 'agents')
foreach ($path in $AgentPaths) {
    if (Test-Path $path) {
        Copy-Item -Path $path -Destination $AgentsDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n📋 Phase 5: Generate Backup Manifest" -ForegroundColor $Colors.Yellow
Write-Host "----------------------------------------"

# Get repository info
$RepoSize = (Get-ChildItem -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$BackupSize = (Get-ChildItem $BackupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$CommitHash = git rev-parse HEAD
$CurrentBranch = git branch --show-current

# Create backup manifest
$ManifestContent = @"
# Git Backup Manifest
**Backup Date**: $(Get-Date)
**Backup ID**: $Timestamp
**Project**: $ProjectName

## Backup Contents

### 1. Complete Repository Bundle
- **File**: $ProjectName-complete-$Timestamp.bundle
- **Type**: Git bundle with full history
- **Restore**: ``git clone backup.bundle restored-repo``

### 2. File Archive
- **File**: $ProjectName-files-$Timestamp.zip
- **Type**: Compressed file archive (no git history)
- **Restore**: ``Expand-Archive archive.zip``

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
- **Repository Size**: $($RepoSize.ToString("F2")) MB
- **Backup Size**: $($BackupSize.ToString("F2")) MB
- **Commit Hash**: $CommitHash
- **Branch**: $CurrentBranch

## Key Features Preserved

### 🧬 Darwin Gödel Machine (DGM)
- Benchmark-driven agent evolution
- SWE-bench and Polyglot integration
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
- Secrets management and rotation
- Vault integration
- Security hardening
- Compliance monitoring

## Recovery Instructions

### Quick Restore (with history):
``````powershell
git clone $ProjectName-complete-$Timestamp.bundle restored-project
cd restored-project
npm install
``````

### File-only Restore:
``````powershell
Expand-Archive $ProjectName-files-$Timestamp.zip
cd restored-files
git init
git add .
git commit -m "Restored from backup $Timestamp"
npm install
``````

## Validation Checklist
- [ ] Git bundle integrity verified
- [ ] Archive extraction tested
- [ ] Critical configs preserved
- [ ] VANTA framework components intact
- [ ] Agent systems backed up
- [ ] Documentation preserved
"@

$ManifestPath = "$BackupDir/BACKUP_MANIFEST_$Timestamp.md"
$ManifestContent | Out-File -FilePath $ManifestPath -Encoding UTF8

Write-Host "`n📋 Phase 6: Push to Remote Backup Branch" -ForegroundColor $Colors.Yellow
Write-Host "----------------------------------------"

if (!$SkipPush) {
    # Create and push backup branch
    Write-Host "Creating backup branch..."
    git checkout -b $RemoteBackupBranch
    
    try {
        git push origin $RemoteBackupBranch
    } catch {
        Write-Host "Remote push failed (normal if no remote configured)" -ForegroundColor $Colors.Yellow
    }
    
    git checkout main
} else {
    Write-Host "Skipping remote push (-SkipPush specified)"
}

Write-Host "`n📋 Phase 7: Verification" -ForegroundColor $Colors.Yellow
Write-Host "----------------------------------------"

# Verify bundle integrity
Write-Host "Verifying bundle integrity..."
git bundle verify $BundlePath

# Show backup summary
Write-Host "`n✅ Backup Complete!" -ForegroundColor $Colors.Green
Write-Host "==================="
Write-Host "📁 Backup Location: $BackupDir"
Write-Host "📦 Bundle: $ProjectName-complete-$Timestamp.bundle"
Write-Host "🗜️  Archive: $ProjectName-files-$Timestamp.zip"
Write-Host "📋 Manifest: BACKUP_MANIFEST_$Timestamp.md"
if (!$SkipPush) {
    Write-Host "🌿 Backup Branch: $RemoteBackupBranch"
}

# Show backup sizes
Write-Host "`n📊 Backup Sizes:"
Get-ChildItem "$BackupDir/*$Timestamp*" | Format-Table Name, @{Label="Size(MB)"; Expression={[math]::Round($_.Length/1MB, 2)}}

Write-Host "`n🎉 Complete backup strategy executed successfully!" -ForegroundColor $Colors.Green
Write-Host "`n🔵 Next Steps:" -ForegroundColor $Colors.Blue
Write-Host "1. Store backup files in secure location"
Write-Host "2. Test restore process periodically"
Write-Host "3. Update backup strategy as needed"
Write-Host "4. Consider automated backup scheduling"

# Optional: Create symbolic link to latest backup
$LatestBackupLink = "$BackupDir/LATEST_BACKUP.md"
if (Test-Path $LatestBackupLink) {
    Remove-Item $LatestBackupLink -Force
}
Copy-Item $ManifestPath $LatestBackupLink

Write-Host "`n💡 Pro Tip: Run this script regularly to maintain up-to-date backups!" -ForegroundColor $Colors.Yellow

# Return backup info
return @{
    BackupDir = $BackupDir
    Timestamp = $Timestamp
    BundlePath = $BundlePath
    ArchivePath = $ArchivePath
    ManifestPath = $ManifestPath
} 