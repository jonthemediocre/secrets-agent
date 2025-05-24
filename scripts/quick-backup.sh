#!/bin/bash
#
# Quick Backup Script for VANTA Secrets Management Platform
# Easy manual backup with optional commit and push
#

set -e

# Default values
INSTANCE_ID="dev"
BACKUP_ID="manual"
PROJECT_PATH="$(pwd)"
COMMIT=false
PUSH=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Usage function
show_usage() {
    echo "🔄 VANTA Quick Backup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -i, --instance-id ID     Instance identifier (default: dev)"
    echo "  -b, --backup-id ID       Backup identifier (default: manual)"
    echo "  -p, --path PATH          Project path (default: current directory)"
    echo "  -c, --commit             Commit changes after backup"
    echo "  -P, --push               Push to remote (implies --commit)"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                   # Quick backup"
    echo "  $0 --commit                          # Backup and commit"
    echo "  $0 --push -b pre-refactor            # Backup, commit, and push with custom ID"
    echo "  $0 -i prod -b nightly --commit       # Production backup with commit"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--instance-id)
            INSTANCE_ID="$2"
            shift 2
            ;;
        -b|--backup-id)
            BACKUP_ID="$2"
            shift 2
            ;;
        -p|--path)
            PROJECT_PATH="$2"
            shift 2
            ;;
        -c|--commit)
            COMMIT=true
            shift
            ;;
        -P|--push)
            PUSH=true
            COMMIT=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🔄 VANTA Quick Backup${NC}"
echo -e "${BLUE}=================${NC}"
echo ""
echo -e "📁 Project Path: ${YELLOW}$PROJECT_PATH${NC}"
echo -e "🏷️  Instance ID: ${YELLOW}$INSTANCE_ID${NC}"
echo -e "🔖 Backup ID: ${YELLOW}$BACKUP_ID${NC}"
echo -e "💾 Commit: ${YELLOW}$COMMIT${NC}"
echo -e "🚀 Push: ${YELLOW}$PUSH${NC}"
echo ""

# Check if Python is available
if ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Python not found. Please install Python.${NC}"
    exit 1
fi

# Check if backup script exists
BACKUP_SCRIPT="$PROJECT_PATH/scripts/backup_script.py"
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo -e "${RED}❌ Backup script not found at: $BACKUP_SCRIPT${NC}"
    exit 1
fi

# Build command
BACKUP_CMD="python \"$BACKUP_SCRIPT\" \"$INSTANCE_ID\" \"$PROJECT_PATH\" --backup-id \"$BACKUP_ID\""

if [ "$COMMIT" = true ]; then
    BACKUP_CMD="$BACKUP_CMD --commit"
fi

if [ "$PUSH" = true ]; then
    BACKUP_CMD="$BACKUP_CMD --push"
fi

echo -e "${BLUE}🚀 Running backup command:${NC}"
echo -e "${YELLOW}$BACKUP_CMD${NC}"
echo ""

# Execute the backup
if eval $BACKUP_CMD; then
    echo ""
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    
    if [ "$COMMIT" = true ]; then
        echo -e "${GREEN}✅ Changes committed to git${NC}"
    fi
    
    if [ "$PUSH" = true ]; then
        echo -e "${GREEN}✅ Changes pushed to remote${NC}"
    fi
else
    echo ""
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi 