-- VANTA Framework PostgreSQL Replication Setup
-- This script initializes the primary database with replication support

-- Create replication user
CREATE USER replicator WITH REPLICATION LOGIN PASSWORD :'POSTGRES_REPLICATION_PASSWORD';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE vanta_production TO replicator;

-- Configure pg_hba.conf for replication (to be mounted)
-- host replication replicator 0.0.0.0/0 md5

-- Create extension for monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Initialize VANTA Framework schema
CREATE SCHEMA IF NOT EXISTS vanta;

-- Set default schema search path
ALTER DATABASE vanta_production SET search_path TO vanta, public; 