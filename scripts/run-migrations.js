#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import Redis from 'ioredis';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * VANTA Framework Migration Runner
 * Executes database migrations and sets up hybrid state management
 */
class MigrationRunner {
  constructor() {
    this.postgres = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.redis = new Redis(process.env.REDIS_URL || 'redis://vanta-redis-master:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    this.migrationsPath = '/app/migrations';
  }

  async run() {
    console.log('🚀 VANTA Framework Migration Starting...');
    
    try {
      // Step 1: Verify connections
      await this.verifyConnections();
      
      // Step 2: Create migration tracking table
      await this.createMigrationTable();
      
      // Step 3: Run pending migrations
      await this.runMigrations();
      
      // Step 4: Initialize Redis cache structure
      await this.initializeRedis();
      
      // Step 5: Validate setup
      await this.validateSetup();
      
      console.log('✅ Migration completed successfully!');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  async verifyConnections() {
    console.log('🔍 Verifying database connections...');
    
    // Test PostgreSQL connection
    try {
      const result = await this.postgres.query('SELECT version()');
      console.log(`✅ PostgreSQL connected: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }

    // Test Redis connection
    try {
      const pong = await this.redis.ping();
      if (pong === 'PONG') {
        const info = await this.redis.info('server');
        const version = info.match(/redis_version:([^\r\n]+)/)[1];
        console.log(`✅ Redis connected: v${version}`);
      }
    } catch (error) {
      throw new Error(`Redis connection failed: ${error.message}`);
    }
  }

  async createMigrationTable() {
    console.log('📋 Creating migration tracking table...');
    
    const query = `
      CREATE TABLE IF NOT EXISTS vanta.migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL
      );
    `;
    
    await this.postgres.query(query);
    console.log('✅ Migration table ready');
  }

  async runMigrations() {
    console.log('🔄 Running database migrations...');
    
    // Get all migration files
    const files = await fs.readdir(this.migrationsPath);
    const migrationFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('ℹ️  No migration files found');
      return;
    }

    // Get already applied migrations
    const appliedResult = await this.postgres.query(
      'SELECT filename FROM vanta.migrations ORDER BY id'
    );
    const appliedMigrations = new Set(appliedResult.rows.map(row => row.filename));

    for (const filename of migrationFiles) {
      if (appliedMigrations.has(filename)) {
        console.log(`⏩ Skipping already applied migration: ${filename}`);
        continue;
      }

      console.log(`🔧 Applying migration: ${filename}`);
      
      const filePath = path.join(this.migrationsPath, filename);
      const sql = await fs.readFile(filePath, 'utf8');
      
      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');

      const client = await this.postgres.connect();
      try {
        await client.query('BEGIN');
        
        // Execute migration
        await client.query(sql);
        
        // Record migration
        await client.query(
          'INSERT INTO vanta.migrations (filename, checksum) VALUES ($1, $2)',
          [filename, checksum]
        );
        
        await client.query('COMMIT');
        console.log(`✅ Migration applied: ${filename}`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${filename} failed: ${error.message}`);
      } finally {
        client.release();
      }
    }
  }

  async initializeRedis() {
    console.log('🔧 Initializing Redis cache structure...');
    
    const pipeline = this.redis.pipeline();
    
    // Set up cache keys and default values
    pipeline.setex('vanta:system:status', 3600, JSON.stringify({
      migration_completed: true,
      migration_timestamp: new Date().toISOString(),
      system_ready: true
    }));
    
    // Initialize cache for frequently accessed configurations
    pipeline.setex('vanta:config:cache', 3600, JSON.stringify({
      monitoring_enabled: true,
      audit_retention_days: 2555,
      ml_enabled: true,
      max_concurrent_operations: 10
    }));
    
    // Set up session storage namespace
    pipeline.setex('vanta:sessions:config', 3600, JSON.stringify({
      default_ttl: 3600,
      max_sessions_per_user: 5,
      cleanup_interval: 300
    }));
    
    // Initialize metrics cache
    pipeline.setex('vanta:metrics:last_update', 300, new Date().toISOString());
    
    await pipeline.exec();
    console.log('✅ Redis cache initialized');
  }

  async validateSetup() {
    console.log('🔍 Validating migration setup...');
    
    // Validate PostgreSQL schema
    const tables = await this.postgres.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'vanta'
      ORDER BY table_name
    `);
    
    const expectedTables = [
      'agent_operations',
      'analytics_data',
      'audit_logs',
      'configurations',
      'health_metrics',
      'migrations',
      'secrets',
      'security_assessments',
      'system_sessions'
    ];
    
    const actualTables = tables.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !actualTables.includes(table));
    
    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}`);
    }
    
    console.log(`✅ All ${expectedTables.length} tables created successfully`);
    
    // Validate Redis connectivity and cache
    const systemStatus = await this.redis.get('vanta:system:status');
    if (!systemStatus) {
      throw new Error('Redis cache initialization failed');
    }
    
    const status = JSON.parse(systemStatus);
    if (!status.migration_completed) {
      throw new Error('Migration status not properly recorded in Redis');
    }
    
    console.log('✅ Redis cache validation passed');
    
    // Test basic operations
    await this.testBasicOperations();
    
    console.log('✅ Setup validation completed successfully');
  }

  async testBasicOperations() {
    console.log('🧪 Testing basic database operations...');
    
    const client = await this.postgres.connect();
    try {
      // Test insert and select
      await client.query(`
        INSERT INTO vanta.configurations (config_key, config_value, config_type, description)
        VALUES ('migration.test.key', '"test_value"', 'string', 'Migration test configuration')
        ON CONFLICT (config_key) DO NOTHING
      `);
      
      const result = await client.query(`
        SELECT config_value FROM vanta.configurations 
        WHERE config_key = 'migration.test.key'
      `);
      
      if (result.rows.length === 0) {
        throw new Error('Basic database operations test failed');
      }
      
      console.log('✅ Basic database operations working');
      
    } finally {
      client.release();
    }

    // Test Redis operations
    await this.redis.setex('vanta:test:key', 60, 'test_value');
    const redisValue = await this.redis.get('vanta:test:key');
    
    if (redisValue !== 'test_value') {
      throw new Error('Basic Redis operations test failed');
    }
    
    await this.redis.del('vanta:test:key');
    console.log('✅ Basic Redis operations working');
  }

  async cleanup() {
    console.log('🧹 Cleaning up connections...');
    
    try {
      await this.postgres.end();
      await this.redis.quit();
      console.log('✅ Connections closed');
    } catch (error) {
      console.warn('⚠️  Warning during cleanup:', error.message);
    }
  }
}

// CLI interface
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new MigrationRunner();
  
  // Handle process signals
  process.on('SIGINT', async () => {
    console.log('\n⚠️  Migration interrupted by user');
    await runner.cleanup();
    process.exit(1);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n⚠️  Migration terminated');
    await runner.cleanup();
    process.exit(1);
  });
  
  // Start migration
  runner.run();
} 