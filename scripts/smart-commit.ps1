#!/usr/bin/env pwsh
#
# Smart Commit Script for VANTA Secrets Management Platform
# Automatically creates meaningful commit messages and follows backup protocol
#

param(
    [string]$Message = "",
    [switch]$Push,
    [switch]$Backup,
    [string]$BackupId = "pre-commit",
    [switch]$Help
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

function Show-Usage {
    Write-Host "🧠 VANTA Smart Commit Script" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Usage: .\smart-commit.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Message MSG         Custom commit message (auto-generated if not provided)"
    Write-Host "  -Push                Push to remote after commit"
    Write-Host "  -Backup              Create backup before commit"
    Write-Host "  -BackupId ID         Backup identifier (default: pre-commit)"
    Write-Host "  -Help                Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\smart-commit.ps1                                   # Auto-generated commit message"
    Write-Host "  .\smart-commit.ps1 -Message 'Fix auth bug'           # Custom message"
    Write-Host "  .\smart-commit.ps1 -Push -Backup                     # Backup, commit, and push"
    Write-Host "  .\smart-commit.ps1 -Backup -BackupId 'pre-refactor'  # Custom backup ID"
}

if ($Help) {
    Show-Usage
    exit 0
}

Write-Host "${Blue}🧠 VANTA Smart Commit${Reset}"
Write-Host "${Blue}==================${Reset}"
Write-Host ""

# Check if we're in a git repository
try {
    git rev-parse --git-dir 2>$null | Out-Null
}
catch {
    Write-Host "${Red}❌ Not in a git repository${Reset}"
    exit 1
}

# Check for staged changes
$stagedFiles = git diff --cached --name-only
if (-not $stagedFiles) {
    Write-Host "${Yellow}⚠️  No staged changes found. Staging all changes...${Reset}"
    git add .
    $stagedFiles = git diff --cached --name-only
    
    if (-not $stagedFiles) {
        Write-Host "${Yellow}ℹ️  No changes to commit${Reset}"
        exit 0
    }
}

Write-Host "${Cyan}📝 Staged files:${Reset}"
$stagedFiles | ForEach-Object { Write-Host "  - $_" }
Write-Host ""

# Create backup if requested
if ($Backup) {
    Write-Host "${Blue}💾 Creating backup before commit...${Reset}"
    try {
        & ".\scripts\quick-backup.ps1" -BackupId $BackupId
        Write-Host "${Green}✅ Backup completed${Reset}"
        Write-Host ""
    }
    catch {
        Write-Host "${Red}❌ Backup failed: $($_.Exception.Message)${Reset}"
        Write-Host "${Yellow}Continue with commit anyway? (y/N):${Reset}" -NoNewline
        $continue = Read-Host
        if ($continue -notmatch '^[Yy]$') {
            exit 1
        }
    }
}

# Generate commit message if not provided
if (-not $Message) {
    Write-Host "${Blue}🤖 Generating smart commit message...${Reset}"
    
    # Analyze changes to create meaningful message
    $addedFiles = git diff --cached --name-only --diff-filter=A
    $modifiedFiles = git diff --cached --name-only --diff-filter=M
    $deletedFiles = git diff --cached --name-only --diff-filter=D
    
    $components = @()
    $details = @()
    
    # Analyze file types and changes
    $hasTS = ($stagedFiles | Where-Object { $_ -match '\.(ts|tsx)$' }).Count -gt 0
    $hasReact = ($stagedFiles | Where-Object { $_ -match '\.(tsx|jsx)$' }).Count -gt 0
    $hasAPI = ($stagedFiles | Where-Object { $_ -match 'api/' }).Count -gt 0
    $hasComponents = ($stagedFiles | Where-Object { $_ -match 'components/' }).Count -gt 0
    $hasTests = ($stagedFiles | Where-Object { $_ -match '\.(test|spec)\.' }).Count -gt 0
    $hasConfig = ($stagedFiles | Where-Object { $_ -match '\.(json|yaml|yml|config\.|\.config)' }).Count -gt 0
    $hasScripts = ($stagedFiles | Where-Object { $_ -match 'scripts/' }).Count -gt 0
    $hasDocs = ($stagedFiles | Where-Object { $_ -match '\.(md|txt)$' }).Count -gt 0
    
    # Build message components
    if ($addedFiles.Count -gt 0) {
        $components += "Add"
        $details += "$($addedFiles.Count) new file$(if ($addedFiles.Count -gt 1) { 's' })"
    }
    
    if ($modifiedFiles.Count -gt 0) {
        $components += "Update"
        $details += "$($modifiedFiles.Count) file$(if ($modifiedFiles.Count -gt 1) { 's' })"
    }
    
    if ($deletedFiles.Count -gt 0) {
        $components += "Remove"
        $details += "$($deletedFiles.Count) file$(if ($deletedFiles.Count -gt 1) { 's' })"
    }
    
    # Add scope information
    $scopes = @()
    if ($hasAPI) { $scopes += "API" }
    if ($hasComponents) { $scopes += "UI" }
    if ($hasTests) { $scopes += "tests" }
    if ($hasConfig) { $scopes += "config" }
    if ($hasScripts) { $scopes += "scripts" }
    if ($hasDocs) { $scopes += "docs" }
    
    $action = $components -join "/"
    $scope = if ($scopes.Count -gt 0) { " ($($scopes -join ', '))" } else { "" }
    $detail = if ($details.Count -gt 0) { ": $($details -join ', ')" } else { "" }
    
    $Message = "$action$scope$detail"
    
    # Add timestamp for automated commits
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Message += " - $timestamp"
}

Write-Host "${Cyan}📝 Commit message: ${Yellow}$Message${Reset}"
Write-Host ""

# Confirm commit
Write-Host "${Yellow}Proceed with commit? (Y/n):${Reset}" -NoNewline
$confirm = Read-Host
if ($confirm -match '^[Nn]$') {
    Write-Host "${Yellow}❌ Commit cancelled${Reset}"
    exit 0
}

# Perform commit
Write-Host "${Blue}📦 Committing changes...${Reset}"
try {
    git commit -m $Message
    Write-Host "${Green}✅ Commit successful${Reset}"
    
    # Show commit hash
    $commitHash = git rev-parse --short HEAD
    Write-Host "${Cyan}🔗 Commit hash: $commitHash${Reset}"
    
    if ($Push) {
        Write-Host ""
        Write-Host "${Blue}🚀 Pushing to remote...${Reset}"
        git push
        Write-Host "${Green}✅ Push successful${Reset}"
    }
}
catch {
    Write-Host "${Red}❌ Commit failed: $($_.Exception.Message)${Reset}"
    exit 1
}

Write-Host ""
Write-Host "${Green}�� All done!${Reset}" 