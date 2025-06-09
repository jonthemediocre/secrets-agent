# VANTA Framework Migration Guide
**From Current Setup to Hybrid State Management**

## 🎯 **Migration Overview**

**Current State**: Docker-based production runtime with file-based state  
**Target State**: Hybrid multi-layer state management with PostgreSQL + Redis  
**Migration Strategy**: Zero-downtime transition with rollback capability  

---

## 📋 **Pre-Migration Checklist**

### **Environment Preparation**
```bash
# 1. Verify current system health
npm run health:check
docker-compose -f docker-compose.production.yml ps

# 2. Create backup of current state
npm run backup:create --full
cp -r data/ backup/data-$(date +%Y%m%d_%H%M%S)

# 3. Set environment variables
cp .env.example .env.migration
# Edit .env.migration with database credentials
```

### **Required Environment Variables**
```env
# Database Configuration
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_REPLICATION_PASSWORD=your_replication_password_here
DATABASE_URL=postgresql://vanta_admin:${POSTGRES_PASSWORD}@localhost:6432/vanta_production

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_SENTINEL_URL=redis://localhost:26379

# Backup Configuration (Optional)
BACKUP_S3_BUCKET=your-backup-bucket
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Migration Settings
MIGRATION_MODE=parallel  # parallel | sequential
MIGRATION_BATCH_SIZE=1000
MIGRATION_TIMEOUT=300
```

---

## 🚀 **Phase 1: Database Infrastructure Setup (Week 1)**

### **Step 1: Launch Database Services**
```bash
# Start PostgreSQL and Redis infrastructure
docker-compose -f docker-compose.database.yml up -d

# Verify services are healthy
docker-compose -f docker-compose.database.yml ps
docker-compose -f docker-compose.database.yml logs vanta-postgres-primary
docker-compose -f docker-compose.database.yml logs vanta-redis-master

# Test connectivity
docker exec -it vanta-postgres-primary psql -U vanta_admin -d vanta_production -c "SELECT version();"
docker exec -it vanta-redis-master redis-cli ping
```

### **Step 2: Schema Migration**
```bash
# Run database migrations
docker-compose -f docker-compose.database.yml --profile migration up vanta-migrations

# Verify schema creation
docker exec -it vanta-postgres-primary psql -U vanta_admin -d vanta_production -c "\dt"
```

### **Step 3: Connection Pool Setup**
```bash
# Start PgBouncer for connection pooling
docker-compose -f docker-compose.database.yml up -d vanta-pgbouncer

# Test pooled connection
docker exec -it vanta-pgbouncer psql -h localhost -p 5432 -U vanta_admin vanta_production -c "SELECT count(*) FROM information_schema.tables;"
```

---

## 📦 **Phase 2: Data Migration (Week 2)**

### **Step 1: Parallel Data Migration**
```bash
# Install migration dependencies
npm install --save-dev @types/pg pg redis

# Run data migration script
npm run migrate:data --source=filesystem --target=database --mode=parallel

# Monitor migration progress
npm run migrate:status
```

### **Step 2: Data Validation**
```bash
# Validate data integrity
npm run migrate:validate --full-check

# Compare record counts
npm run migrate:compare --source=filesystem --target=database

# Test data consistency
npm run test:data-consistency
```

### **Step 3: Performance Testing**
```bash
# Run performance benchmarks
npm run benchmark:database --concurrent=100 --duration=300

# Compare with file-based performance
npm run benchmark:compare --baseline=filesystem --target=database
```

---

## 🔄 **Phase 3: Application Integration (Week 3)**

### **Step 1: Update Application Configuration**
```bash
# Update VANTA configuration
cp lib/vanta/config.ts lib/vanta/config.ts.backup
npm run config:update --mode=database

# Update environment configuration
export NODE_ENV=migration
export DATABASE_MODE=hybrid
```

### **Step 2: Deploy Hybrid Application**
```bash
# Build application with database support
npm run build:hybrid

# Deploy in parallel mode (reads from both sources)
docker-compose -f docker-compose.hybrid.yml up -d

# Monitor application health
npm run health:monitor --duration=3600
```

### **Step 3: Traffic Gradual Migration**
```bash
# Start with 10% traffic to database
npm run traffic:split --database=10 --filesystem=90

# Gradually increase database traffic
npm run traffic:split --database=50 --filesystem=50
npm run traffic:split --database=90 --filesystem=10

# Full cutover
npm run traffic:split --database=100 --filesystem=0
```

---

## 🏁 **Phase 4: Cutover & Cleanup (Week 4)**

### **Step 1: Final Cutover**
```bash
# Stop file-based operations
npm run filesystem:readonly

# Switch to database-only mode
export DATABASE_MODE=primary
docker-compose -f docker-compose.production.yml restart

# Verify all operations use database
npm run verify:database-only
```

### **Step 2: Performance Optimization**
```bash
# Optimize database performance
npm run database:optimize --analyze-tables --update-statistics

# Tune Redis cache
npm run redis:optimize --memory-policy=allkeys-lru

# Update connection pool settings
npm run pgbouncer:tune --max-connections=1000
```

### **Step 3: Cleanup and Documentation**
```bash
# Archive old file-based data
npm run filesystem:archive --target=s3://vanta-archive/

# Update deployment documentation
npm run docs:update --migration-complete

# Clean up migration artifacts
npm run migration:cleanup
```

---

## 🔧 **Migration Scripts**

### **Data Migration Script Example**
```typescript
// scripts/migrate-data.ts
import { Pool } from 'pg';
import Redis from 'ioredis';
import fs from 'fs/promises';

interface MigrationConfig {
  batchSize: number;
  sourceType: 'filesystem' | 'database';
  targetType: 'filesystem' | 'database';
  validateData: boolean;
  mode: 'parallel' | 'sequential';
}

class DataMigrator {
  private postgres: Pool;
  private redis: Redis;
  
  constructor(private config: MigrationConfig) {
    this.postgres = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
    });
    
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async migrateSecrets(): Promise<void> {
    console.log('🔐 Starting secrets migration...');
    
    // Read from filesystem
    const secretsData = await fs.readFile('data/secrets.json', 'utf8');
    const secrets = JSON.parse(secretsData);
    
    // Batch insert to PostgreSQL
    const client = await this.postgres.connect();
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < secrets.length; i += this.config.batchSize) {
        const batch = secrets.slice(i, i + this.config.batchSize);
        await this.insertSecretBatch(client, batch);
        console.log(`✅ Migrated batch ${Math.floor(i / this.config.batchSize) + 1}`);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async migrateAnalytics(): Promise<void> {
    console.log('📊 Starting analytics migration...');
    
    // Migrate to Redis for fast access
    const analyticsData = await fs.readFile('data/analytics.json', 'utf8');
    const analytics = JSON.parse(analyticsData);
    
    const pipeline = this.redis.pipeline();
    Object.entries(analytics).forEach(([key, value]) => {
      pipeline.setex(`analytics:${key}`, 3600, JSON.stringify(value));
    });
    
    await pipeline.exec();
    console.log('✅ Analytics data migrated to Redis');
  }

  async validateMigration(): Promise<boolean> {
    console.log('🔍 Validating migration...');
    
    // Compare record counts
    const [secretsCount] = await this.postgres.query('SELECT COUNT(*) FROM secrets');
    const originalSecrets = JSON.parse(await fs.readFile('data/secrets.json', 'utf8'));
    
    if (secretsCount.count !== originalSecrets.length) {
      console.error('❌ Secret count mismatch');
      return false;
    }
    
    console.log('✅ Migration validation passed');
    return true;
  }

  private async insertSecretBatch(client: any, secrets: any[]): Promise<void> {
    const query = `
      INSERT INTO secrets (id, name, value, vault_path, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at
    `;
    
    for (const secret of secrets) {
      await client.query(query, [
        secret.id,
        secret.name,
        secret.encrypted_value,
        secret.vault_path,
        secret.created_at,
        new Date()
      ]);
    }
  }
}

// CLI interface
if (require.main === module) {
  const config: MigrationConfig = {
    batchSize: parseInt(process.env.MIGRATION_BATCH_SIZE || '1000'),
    sourceType: 'filesystem',
    targetType: 'database',
    validateData: true,
    mode: process.env.MIGRATION_MODE as 'parallel' | 'sequential' || 'parallel'
  };
  
  const migrator = new DataMigrator(config);
  
  migrator.migrateSecrets()
    .then(() => migrator.migrateAnalytics())
    .then(() => migrator.validateMigration())
    .then((valid) => {
      if (valid) {
        console.log('🎉 Migration completed successfully!');
        process.exit(0);
      } else {
        console.error('❌ Migration validation failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}
```

---

## 🔄 **Rollback Procedures**

### **Emergency Rollback**
```bash
# If issues detected during migration
npm run rollback:emergency

# Steps performed:
# 1. Stop database writes
# 2. Switch back to filesystem mode
# 3. Restore from backup if needed
# 4. Restart services in safe mode
```

### **Selective Rollback**
```bash
# Rollback specific components only
npm run rollback:secrets --source=backup
npm run rollback:analytics --source=backup
npm run rollback:config --source=git
```

---

## 📊 **Success Metrics**

### **Performance Targets**
- **Migration Time**: <4 hours for complete data migration
- **Downtime**: <5 minutes during final cutover
- **Data Loss**: 0% with validation checks
- **Performance**: <10% degradation during migration

### **Validation Checks**
```bash
# Automated validation
npm run validate:data-integrity
npm run validate:performance --baseline=pre-migration
npm run validate:functionality --full-suite
npm run validate:security --penetration-test
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

**Database Connection Issues**
```bash
# Check database status
docker-compose -f docker-compose.database.yml logs vanta-postgres-primary

# Verify network connectivity
docker exec -it vanta-postgres-primary pg_isready

# Reset connections
docker-compose -f docker-compose.database.yml restart vanta-pgbouncer
```

**Migration Performance Issues**
```bash
# Increase batch size
export MIGRATION_BATCH_SIZE=5000

# Use parallel mode
export MIGRATION_MODE=parallel

# Monitor resource usage
docker stats
```

**Data Validation Failures**
```bash
# Re-run validation with detailed output
npm run migrate:validate --verbose --fix-issues

# Compare specific records
npm run migrate:compare --record-level --fix-mismatches
```

---

## ✅ **Post-Migration Checklist**

### **System Verification**
- [ ] All services healthy and responsive
- [ ] Database replication working correctly
- [ ] Redis high availability functioning
- [ ] Connection pooling optimized
- [ ] Monitoring and alerting active
- [ ] Backup procedures tested
- [ ] Documentation updated

### **Performance Validation**
- [ ] API response times <50ms
- [ ] Database query performance optimized
- [ ] Cache hit ratios >80%
- [ ] Resource utilization within limits
- [ ] Scaling tests passed

### **Security Validation**
- [ ] Database access controls configured
- [ ] Encryption in transit and at rest
- [ ] Audit logging functioning
- [ ] Compliance checks passing
- [ ] Penetration testing completed

---

## 🎉 **Migration Complete!**

Your VANTA Framework is now running on enterprise-grade hybrid state management with:

✅ **High-Performance Database**: PostgreSQL with read replicas and connection pooling  
✅ **Fast Caching Layer**: Redis with high availability and sentinel monitoring  
✅ **Zero Data Loss**: Complete validation and integrity checks  
✅ **Improved Performance**: <10ms database queries, >1000 ops/sec capability  
✅ **Production Ready**: Full monitoring, backup, and disaster recovery  

**Next Steps**: Proceed with GitOps integration and advanced analytics deployment. 