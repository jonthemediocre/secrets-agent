#!/usr/bin/env pwsh
#
# Quick Backup Script for VANTA Secrets Management Platform (PowerShell)
# Easy manual backup with optional commit and push
#

param(
    [string]$InstanceId = "dev",
    [string]$BackupId = "manual",
    [string]$Path = (Get-Location).Path,
    [switch]$Commit,
    [switch]$Push,
    [switch]$Help
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Show-Usage {
    Write-Host "🔄 VANTA Quick Backup Script (PowerShell)" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Usage: .\quick-backup.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -InstanceId ID       Instance identifier (default: dev)"
    Write-Host "  -BackupId ID         Backup identifier (default: manual)"
    Write-Host "  -Path PATH           Project path (default: current directory)"
    Write-Host "  -Commit              Commit changes after backup"
    Write-Host "  -Push                Push to remote (implies -Commit)"
    Write-Host "  -Help                Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\quick-backup.ps1                                   # Quick backup"
    Write-Host "  .\quick-backup.ps1 -Commit                           # Backup and commit"
    Write-Host "  .\quick-backup.ps1 -Push -BackupId pre-refactor      # Backup, commit, and push with custom ID"
    Write-Host "  .\quick-backup.ps1 -InstanceId prod -BackupId nightly -Commit  # Production backup with commit"
}

if ($Help) {
    Show-Usage
    exit 0
}

# If Push is specified, also enable Commit
if ($Push) {
    $Commit = $true
}

Write-Host "${Blue}🔄 VANTA Quick Backup${Reset}"
Write-Host "${Blue}=================${Reset}"
Write-Host ""
Write-Host "📁 Project Path: ${Yellow}$Path${Reset}"
Write-Host "🏷️  Instance ID: ${Yellow}$InstanceId${Reset}"
Write-Host "🔖 Backup ID: ${Yellow}$BackupId${Reset}"
Write-Host "💾 Commit: ${Yellow}$Commit${Reset}"
Write-Host "🚀 Push: ${Yellow}$Push${Reset}"
Write-Host ""

# Check if Python is available
try {
    $pythonVersion = python --version 2>$null
    if (-not $pythonVersion) {
        throw "Python not found"
    }
}
catch {
    Write-Host "${Red}❌ Python not found. Please install Python.${Reset}"
    exit 1
}

# Check if backup script exists
$BackupScript = Join-Path $Path "scripts\backup_script.py"
if (-not (Test-Path $BackupScript)) {
    Write-Host "${Red}❌ Backup script not found at: $BackupScript${Reset}"
    exit 1
}

# Build command arguments
$BackupArgs = @(
    "`"$BackupScript`"",
    "`"$InstanceId`"",
    "`"$Path`"",
    "--backup-id",
    "`"$BackupId`""
)

if ($Commit) {
    $BackupArgs += "--commit"
}

if ($Push) {
    $BackupArgs += "--push"
}

$BackupCmd = "python " + ($BackupArgs -join " ")

Write-Host "${Blue}🚀 Running backup command:${Reset}"
Write-Host "${Yellow}$BackupCmd${Reset}"
Write-Host ""

# Execute the backup
try {
    $process = Start-Process -FilePath "python" -ArgumentList ($BackupArgs[1..($BackupArgs.Length-1)]) -Wait -PassThru -NoNewWindow
    
    if ($process.ExitCode -eq 0) {
        Write-Host ""
        Write-Host "${Green}✅ Backup completed successfully!${Reset}"
        
        if ($Commit) {
            Write-Host "${Green}✅ Changes committed to git${Reset}"
        }
        
        if ($Push) {
            Write-Host "${Green}✅ Changes pushed to remote${Reset}"
        }
    }
    else {
        Write-Host ""
        Write-Host "${Red}❌ Backup failed with exit code: $($process.ExitCode)${Reset}"
        exit 1
    }
}
catch {
    Write-Host ""
    Write-Host "${Red}❌ Backup failed: $($_.Exception.Message)${Reset}"
    exit 1
} 