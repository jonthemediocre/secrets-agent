#!/bin/bash

# Production Deployment Script for Secrets Management App
# This script handles deployment with safety checks and rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
HEALTH_CHECK_TIMEOUT=60
ROLLBACK_TIMEOUT=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Production deployment script for Secrets Management App

OPTIONS:
    -e, --env ENV           Deployment environment (default: production)
    -h, --help             Show this help message
    -r, --rollback         Rollback to previous deployment
    -c, --check-only       Run pre-deployment checks only
    -m, --monitoring       Deploy with monitoring stack
    --skip-backup          Skip backup creation
    --skip-tests           Skip pre-deployment tests
    --force                Force deployment without confirmations

EXAMPLES:
    $0                     # Standard production deployment
    $0 -e staging          # Deploy to staging environment
    $0 --rollback          # Rollback to previous version
    $0 --check-only        # Run checks without deploying

EOF
}

# Parse command line arguments
ROLLBACK=false
CHECK_ONLY=false
MONITORING=false
SKIP_BACKUP=false
SKIP_TESTS=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            DEPLOY_ENV="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        -c|--check-only)
            CHECK_ONLY=true
            shift
            ;;
        -m|--monitoring)
            MONITORING=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Pre-deployment checks
check_prerequisites() {
    log_info "Running pre-deployment checks..."
    
    # Check if running in correct directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if required files exist
    local required_files=(
        "docker-compose.prod.yml"
        ".env.production"
        "Dockerfile.prod"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$PROJECT_ROOT/$file" ]]; then
            log_error "Required file $file not found."
            exit 1
        fi
    done
    
    # Check environment variables
    if [[ ! -f "$PROJECT_ROOT/.env.production" ]]; then
        log_error ".env.production file not found."
        exit 1
    fi
    
    source "$PROJECT_ROOT/.env.production"
    
    local required_vars=(
        "JWT_SECRET"
        "SESSION_SECRET"
        "ENCRYPTION_KEY"
        "GOOGLE_CLIENT_ID"
        "GOOGLE_CLIENT_SECRET"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable $var is not set."
            exit 1
        fi
    done
    
    # Validate secret lengths
    if [[ ${#JWT_SECRET} -lt 32 ]]; then
        log_error "JWT_SECRET must be at least 32 characters long."
        exit 1
    fi
    
    if [[ ${#SESSION_SECRET} -lt 32 ]]; then
        log_error "SESSION_SECRET must be at least 32 characters long."
        exit 1
    fi
    
    if [[ ${#ENCRYPTION_KEY} -lt 32 ]]; then
        log_error "ENCRYPTION_KEY must be at least 32 characters long."
        exit 1
    fi
    
    log_success "Pre-deployment checks passed."
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests as requested."
        return
    fi
    
    log_info "Running tests..."
    
    # Install dependencies if needed
    if [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
        log_info "Installing dependencies..."
        cd "$PROJECT_ROOT"
        npm ci
    fi
    
    # Run linting
    log_info "Running linting..."
    npm run lint
    
    # Run type checking
    log_info "Running type checking..."
    npm run type-check
    
    # Run tests
    log_info "Running unit tests..."
    npm test
    
    log_success "All tests passed."
}

# Create backup
create_backup() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        log_warning "Skipping backup as requested."
        return
    fi
    
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current deployment
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log_info "Backing up current vault data..."
        docker-compose -f docker-compose.prod.yml exec -T secrets-app tar czf - /app/vault > "$BACKUP_DIR/vault-backup.tar.gz"
        
        # Backup database if exists
        if docker-compose -f docker-compose.prod.yml ps redis | grep -q "Up"; then
            log_info "Backing up Redis data..."
            docker-compose -f docker-compose.prod.yml exec -T redis redis-cli BGSAVE
            docker-compose -f docker-compose.prod.yml exec -T redis tar czf - /data > "$BACKUP_DIR/redis-backup.tar.gz"
        fi
    fi
    
    # Backup configuration
    cp "$PROJECT_ROOT/.env.production" "$BACKUP_DIR/"
    cp "$PROJECT_ROOT/docker-compose.prod.yml" "$BACKUP_DIR/"
    
    log_success "Backup created at $BACKUP_DIR"
}

# Build and deploy
deploy() {
    log_info "Starting deployment to $DEPLOY_ENV environment..."
    
    cd "$PROJECT_ROOT"
    
    # Build new images
    log_info "Building Docker images..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    
    # Stop current containers gracefully
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log_info "Stopping current containers..."
        docker-compose -f docker-compose.prod.yml stop
    fi
    
    # Start new containers
    log_info "Starting new containers..."
    
    if [[ "$MONITORING" == "true" ]]; then
        docker-compose -f docker-compose.prod.yml --profile monitoring up -d
    else
        docker-compose -f docker-compose.prod.yml up -d
    fi
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Health check
    health_check
    
    log_success "Deployment completed successfully!"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local retries=0
    local max_retries=$((HEALTH_CHECK_TIMEOUT / 5))
    
    while [[ $retries -lt $max_retries ]]; do
        if curl -f -s http://localhost:3000/health/ready >/dev/null 2>&1; then
            log_success "Health check passed."
            return 0
        fi
        
        log_info "Health check failed, retrying in 5 seconds... ($((retries + 1))/$max_retries)"
        sleep 5
        ((retries++))
    done
    
    log_error "Health check failed after $HEALTH_CHECK_TIMEOUT seconds."
    return 1
}

# Rollback function
rollback() {
    log_warning "Starting rollback procedure..."
    
    # Find latest backup
    local latest_backup=$(find ./backups -name "*" -type d | sort -r | head -1)
    
    if [[ -z "$latest_backup" ]]; then
        log_error "No backup found for rollback."
        exit 1
    fi
    
    log_info "Rolling back to backup: $latest_backup"
    
    # Stop current containers
    docker-compose -f docker-compose.prod.yml down
    
    # Restore configuration
    cp "$latest_backup/.env.production" "$PROJECT_ROOT/"
    cp "$latest_backup/docker-compose.prod.yml" "$PROJECT_ROOT/"
    
    # Start with previous configuration
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait and check health
    sleep 10
    if health_check; then
        log_success "Rollback completed successfully."
    else
        log_error "Rollback failed. Manual intervention required."
        exit 1
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    
    # Remove old Docker images
    docker image prune -f
    
    # Remove old backups (keep last 5)
    find ./backups -name "*" -type d | sort -r | tail -n +6 | xargs rm -rf
    
    log_success "Cleanup completed."
}

# Main execution
main() {
    log_info "Starting deployment script for environment: $DEPLOY_ENV"
    
    # Handle rollback
    if [[ "$ROLLBACK" == "true" ]]; then
        rollback
        exit 0
    fi
    
    # Run checks
    check_prerequisites
    
    if [[ "$CHECK_ONLY" == "true" ]]; then
        log_success "Check-only mode completed."
        exit 0
    fi
    
    # Run tests
    run_tests
    
    # Confirm deployment unless forced
    if [[ "$FORCE" != "true" ]]; then
        echo
        read -p "Are you sure you want to deploy to $DEPLOY_ENV? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled."
            exit 0
        fi
    fi
    
    # Create backup
    create_backup
    
    # Deploy
    if deploy; then
        cleanup
        log_success "Deployment pipeline completed successfully!"
    else
        log_error "Deployment failed. Check logs for details."
        if [[ "$FORCE" != "true" ]]; then
            read -p "Do you want to rollback? (y/N): " -r
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rollback
            fi
        fi
        exit 1
    fi
}

# Trap errors and cleanup
trap 'log_error "Deployment script failed. Check the logs for details."' ERR

# Run main function
main "$@" 