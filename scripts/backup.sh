#!/bin/bash

# VANTA Framework Backup Script
# Automated backup for PostgreSQL and Redis data

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
S3_BUCKET=${S3_BUCKET:-""}

# Database configuration
POSTGRES_HOST=${POSTGRES_HOST:-"vanta-postgres-primary"}
POSTGRES_PORT=${POSTGRES_PORT:-"5432"}
POSTGRES_DB=${POSTGRES_DB:-"vanta_production"}
POSTGRES_USER=${POSTGRES_USER:-"vanta_admin"}

REDIS_HOST=${REDIS_HOST:-"vanta-redis-master"}
REDIS_PORT=${REDIS_PORT:-"6379"}

# Create backup directory
mkdir -p "${BACKUP_DIR}/postgres" "${BACKUP_DIR}/redis" "${BACKUP_DIR}/logs"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${BACKUP_DIR}/logs/backup_${TIMESTAMP}.log"
}

# Error handling
handle_error() {
    log "ERROR: Backup failed at line $1"
    exit 1
}

trap 'handle_error $LINENO' ERR

log "🚀 Starting VANTA Framework backup..."

# PostgreSQL Backup
log "📊 Creating PostgreSQL backup..."

# Full database dump
pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    --verbose --clean --if-exists --create --format=custom \
    > "${BACKUP_DIR}/postgres/vanta_full_${TIMESTAMP}.dump"

# Schema-only backup for quick restoration
pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    --verbose --schema-only --format=plain \
    > "${BACKUP_DIR}/postgres/vanta_schema_${TIMESTAMP}.sql"

# Individual table backups for critical data
pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    --verbose --data-only --table=vanta.secrets --format=custom \
    > "${BACKUP_DIR}/postgres/vanta_secrets_${TIMESTAMP}.dump"

pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    --verbose --data-only --table=vanta.audit_logs --format=custom \
    > "${BACKUP_DIR}/postgres/vanta_audit_${TIMESTAMP}.dump"

log "✅ PostgreSQL backup completed"

# Redis Backup
log "🔄 Creating Redis backup..."

# Create Redis backup using BGSAVE
redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" BGSAVE

# Wait for background save to complete
while [ "$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" LASTSAVE)" = "$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" LASTSAVE)" ]; do
    sleep 1
done

# Copy RDB file
redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" --rdb "${BACKUP_DIR}/redis/vanta_redis_${TIMESTAMP}.rdb"

# Export Redis keys as JSON for easy restoration
redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" --scan --pattern "vanta:*" | \
    while read key; do
        value=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" DUMP "$key" | base64)
        ttl=$(redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" TTL "$key")
        echo "{\"key\":\"$key\",\"value\":\"$value\",\"ttl\":$ttl}" >> "${BACKUP_DIR}/redis/vanta_keys_${TIMESTAMP}.json"
    done

log "✅ Redis backup completed"

# Compress backups
log "🗜️  Compressing backups..."

cd "${BACKUP_DIR}"
tar -czf "vanta_backup_${TIMESTAMP}.tar.gz" postgres/ redis/

# Calculate checksums
log "🔍 Calculating checksums..."
sha256sum "vanta_backup_${TIMESTAMP}.tar.gz" > "vanta_backup_${TIMESTAMP}.sha256"

# Upload to S3 if configured
if [ -n "${S3_BUCKET}" ] && command -v aws &> /dev/null; then
    log "☁️  Uploading backup to S3..."
    
    aws s3 cp "vanta_backup_${TIMESTAMP}.tar.gz" "s3://${S3_BUCKET}/backups/"
    aws s3 cp "vanta_backup_${TIMESTAMP}.sha256" "s3://${S3_BUCKET}/backups/"
    
    log "✅ Backup uploaded to S3"
else
    log "ℹ️  S3 upload skipped (not configured or AWS CLI not available)"
fi

# Cleanup old backups
log "🧹 Cleaning up old backups..."

find "${BACKUP_DIR}" -name "vanta_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "vanta_backup_*.sha256" -type f -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/postgres" -name "*.dump" -type f -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/postgres" -name "*.sql" -type f -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/redis" -name "*.rdb" -type f -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/redis" -name "*.json" -type f -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/logs" -name "backup_*.log" -type f -mtime +${RETENTION_DAYS} -delete

# Cleanup old S3 backups if configured
if [ -n "${S3_BUCKET}" ] && command -v aws &> /dev/null; then
    cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)
    aws s3 ls "s3://${S3_BUCKET}/backups/" | \
        awk '{print $4}' | \
        grep "vanta_backup_" | \
        while read backup_file; do
            backup_date=$(echo "$backup_file" | sed 's/vanta_backup_\([0-9]\{8\}\).*/\1/')
            if [ "$backup_date" -lt "$cutoff_date" ]; then
                aws s3 rm "s3://${S3_BUCKET}/backups/$backup_file"
                log "🗑️  Deleted old S3 backup: $backup_file"
            fi
        done
fi

# Backup verification
log "🔍 Verifying backup integrity..."

# Test PostgreSQL backup
pg_restore --list "${BACKUP_DIR}/postgres/vanta_full_${TIMESTAMP}.dump" > /dev/null
if [ $? -eq 0 ]; then
    log "✅ PostgreSQL backup verification passed"
else
    log "❌ PostgreSQL backup verification failed"
    exit 1
fi

# Test Redis backup
if [ -f "${BACKUP_DIR}/redis/vanta_redis_${TIMESTAMP}.rdb" ]; then
    log "✅ Redis backup file exists"
else
    log "❌ Redis backup file missing"
    exit 1
fi

# Generate backup report
log "📋 Generating backup report..."

BACKUP_SIZE=$(du -sh "vanta_backup_${TIMESTAMP}.tar.gz" | cut -f1)
POSTGRES_SIZE=$(du -sh postgres/ | cut -f1)
REDIS_SIZE=$(du -sh redis/ | cut -f1)

cat > "${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt" << EOF
VANTA Framework Backup Report
============================
Backup Date: $(date)
Backup ID: ${TIMESTAMP}

File Sizes:
- Total Backup: ${BACKUP_SIZE}
- PostgreSQL: ${POSTGRES_SIZE}
- Redis: ${REDIS_SIZE}

Files Created:
- vanta_backup_${TIMESTAMP}.tar.gz (Complete backup archive)
- vanta_backup_${TIMESTAMP}.sha256 (Checksum verification)
- backup_report_${TIMESTAMP}.txt (This report)

PostgreSQL Tables Backed Up:
$(pg_restore --list "${BACKUP_DIR}/postgres/vanta_full_${TIMESTAMP}.dump" | grep "TABLE DATA" | wc -l) tables

Redis Keys Backed Up:
$(wc -l < "${BACKUP_DIR}/redis/vanta_keys_${TIMESTAMP}.json") keys

Status: SUCCESS ✅

Restoration Command:
pg_restore -h <host> -p <port> -U <user> -d <database> --clean --if-exists "${BACKUP_DIR}/postgres/vanta_full_${TIMESTAMP}.dump"

EOF

log "📊 Backup completed successfully!"
log "📁 Backup file: vanta_backup_${TIMESTAMP}.tar.gz (${BACKUP_SIZE})"
log "🔍 Checksum: $(cat vanta_backup_${TIMESTAMP}.sha256 | cut -d' ' -f1)"

# Send notification if configured
if [ -n "${WEBHOOK_URL:-}" ]; then
    curl -X POST "${WEBHOOK_URL}" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"✅ VANTA Framework backup completed successfully\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Backup ID\", \"value\": \"${TIMESTAMP}\", \"short\": true},
                    {\"title\": \"Size\", \"value\": \"${BACKUP_SIZE}\", \"short\": true},
                    {\"title\": \"Status\", \"value\": \"SUCCESS\", \"short\": true}
                ]
            }]
        }" 2>/dev/null || log "⚠️  Webhook notification failed"
fi

exit 0 