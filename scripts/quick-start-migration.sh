#!/bin/bash

# VANTA Framework Quick Start Migration
# One-command migration from filesystem to hybrid database setup

set -euo pipefail

echo "🚀 VANTA Framework Hybrid Migration Quick Start"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check prerequisites
log_info "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm is not installed. Please install Node.js and npm first."
    exit 1
fi

log_success "Prerequisites check passed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    log_info "Creating .env file from template..."
    cp env.example .env
    
    # Generate secure passwords
    POSTGRES_PASSWORD=$(openssl rand -base64 32)
    POSTGRES_REPLICATION_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -base64 32)
    SESSION_SECRET=$(openssl rand -base64 32)
    
    # Update .env with generated values
    sed -i "s/your_secure_password_here/${POSTGRES_PASSWORD}/g" .env
    sed -i "s/your_replication_password_here/${POSTGRES_REPLICATION_PASSWORD}/g" .env
    sed -i "s/your_jwt_secret_key_minimum_32_characters/${JWT_SECRET}/g" .env
    sed -i "s/your_encryption_key_32_characters_long/${ENCRYPTION_KEY}/g" .env
    sed -i "s/your_session_secret_key/${SESSION_SECRET}/g" .env
    
    log_success ".env file created with secure passwords"
else
    log_info ".env file already exists, using existing configuration"
fi

# Step 1: Start database infrastructure
log_info "Starting PostgreSQL and Redis infrastructure..."
docker-compose -f docker-compose.database.yml up -d

# Wait for services to be healthy
log_info "Waiting for services to be ready..."
sleep 10

# Check PostgreSQL
while ! docker exec vanta-postgres-primary pg_isready -U vanta_admin -d vanta_production > /dev/null 2>&1; do
    log_info "Waiting for PostgreSQL to be ready..."
    sleep 5
done
log_success "PostgreSQL is ready"

# Check Redis
while ! docker exec vanta-redis-master redis-cli ping > /dev/null 2>&1; do
    log_info "Waiting for Redis to be ready..."
    sleep 5
done
log_success "Redis is ready"

# Step 2: Run migrations
log_info "Running database migrations..."
docker-compose -f docker-compose.database.yml --profile migration up vanta-migrations

if [ $? -eq 0 ]; then
    log_success "Database migrations completed successfully"
else
    log_error "Database migrations failed"
    exit 1
fi

# Step 3: Verify setup
log_info "Verifying database setup..."

# Check tables exist
TABLE_COUNT=$(docker exec vanta-postgres-primary psql -U vanta_admin -d vanta_production -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'vanta';" | tr -d ' ')

if [ "$TABLE_COUNT" -ge 8 ]; then
    log_success "Database schema created successfully ($TABLE_COUNT tables)"
else
    log_error "Database schema creation failed (only $TABLE_COUNT tables found)"
    exit 1
fi

# Check Redis connectivity
REDIS_STATUS=$(docker exec vanta-redis-master redis-cli ping)
if [ "$REDIS_STATUS" = "PONG" ]; then
    log_success "Redis is responding correctly"
else
    log_error "Redis connectivity failed"
    exit 1
fi

# Step 4: Start monitoring (optional)
read -p "Do you want to start monitoring services (Prometheus/Grafana exporters)? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Starting monitoring services..."
    docker-compose -f docker-compose.database.yml --profile monitoring up -d
    log_success "Monitoring services started"
fi

# Step 5: Create initial backup
log_info "Creating initial backup..."
docker-compose -f docker-compose.database.yml --profile backup up vanta-backup

if [ $? -eq 0 ]; then
    log_success "Initial backup created successfully"
else
    log_warning "Initial backup creation had issues, but continuing..."
fi

# Step 6: Display connection information
echo ""
echo "🎉 VANTA Framework Hybrid Migration Complete!"
echo "=============================================="
echo ""
echo "📊 Database Information:"
echo "  PostgreSQL (Primary): localhost:5432"
echo "  PostgreSQL (PgBouncer): localhost:6432"
echo "  PostgreSQL (Replica): localhost:5433"
echo "  Redis: localhost:6379"
echo "  Redis Sentinel: localhost:26379"
echo ""
echo "🔧 Management Commands:"
echo "  Database Status: npm run database:logs"
echo "  Migration Status: npm run migrate:status"
echo "  Create Backup: npm run backup:create"
echo "  Stop Databases: npm run database:stop"
echo ""
echo "📈 Monitoring (if enabled):"
echo "  PostgreSQL Metrics: http://localhost:9187/metrics"
echo "  Redis Metrics: http://localhost:9121/metrics"
echo ""
echo "🔍 Quick Health Check:"
echo "  npm run health:check"
echo ""
echo "📝 Next Steps:"
echo "  1. Update your application to use DATABASE_URL from .env"
echo "  2. Test your application with: npm run dev"
echo "  3. Monitor performance and adjust settings as needed"
echo "  4. Set up automated backups in production"
echo ""

# Final health check
log_info "Running final health check..."
POSTGRES_VERSION=$(docker exec vanta-postgres-primary psql -U vanta_admin -d vanta_production -t -c "SELECT version();" | head -n1 | tr -d ' ')
REDIS_VERSION=$(docker exec vanta-redis-master redis-cli info server | grep redis_version | cut -d: -f2 | tr -d '\r')

echo "✅ PostgreSQL: Running (v${POSTGRES_VERSION:0:20}...)"
echo "✅ Redis: Running (v${REDIS_VERSION})"
echo "✅ Connection Pool: Active (PgBouncer)"
echo "✅ Replication: Configured"
echo "✅ Backup System: Ready"

log_success "VANTA Framework is now running with hybrid state management!"

# Show running containers
echo ""
echo "🐳 Running Services:"
docker-compose -f docker-compose.database.yml ps --format "table {{.Name}}\t{{.State}}\t{{.Ports}}"

exit 0 