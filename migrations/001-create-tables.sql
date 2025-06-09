-- VANTA Framework Database Schema
-- Migration 001: Create core tables for hybrid state management

SET search_path TO vanta, public;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Secrets management table
CREATE TABLE secrets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    value TEXT NOT NULL, -- Encrypted value
    vault_path VARCHAR(500),
    environment VARCHAR(50) DEFAULT 'production',
    tags JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Audit logs for compliance
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id VARCHAR(255),
    compliance_tags TEXT[] DEFAULT '{}',
    risk_level VARCHAR(20) DEFAULT 'low'
);

-- System health metrics
CREATE TABLE health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(50),
    component VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags JSONB DEFAULT '{}',
    alert_threshold NUMERIC,
    is_critical BOOLEAN DEFAULT false
);

-- Agent operations and workflows
CREATE TABLE agent_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    input_data JSONB NOT NULL,
    output_data JSONB,
    error_details TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    agent_id VARCHAR(255),
    priority INTEGER DEFAULT 5,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3
);

-- Security assessments and vulnerability data
CREATE TABLE security_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_type VARCHAR(100) NOT NULL,
    target_resource VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    vulnerability_id VARCHAR(100),
    cvss_score NUMERIC(3,1),
    description TEXT NOT NULL,
    recommendation TEXT,
    status VARCHAR(50) DEFAULT 'open',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    false_positive BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}'
);

-- Analytics and ML model data
CREATE TABLE analytics_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_type VARCHAR(100) NOT NULL,
    source_system VARCHAR(100) NOT NULL,
    data_payload JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    model_version VARCHAR(50),
    confidence_score NUMERIC(5,4),
    predictions JSONB,
    anomaly_detected BOOLEAN DEFAULT false,
    retention_until TIMESTAMP WITH TIME ZONE
);

-- Configuration management
CREATE TABLE configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(255) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    config_type VARCHAR(100) NOT NULL,
    environment VARCHAR(50) DEFAULT 'production',
    version INTEGER DEFAULT 1,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255),
    description TEXT
);

-- System sessions and state
CREATE TABLE system_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL UNIQUE,
    user_id VARCHAR(255),
    session_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX idx_secrets_name ON secrets(name);
CREATE INDEX idx_secrets_vault_path ON secrets(vault_path);
CREATE INDEX idx_secrets_environment ON secrets(environment);
CREATE INDEX idx_secrets_created_at ON secrets(created_at);
CREATE INDEX idx_secrets_tags ON secrets USING GIN(tags);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_compliance_tags ON audit_logs USING GIN(compliance_tags);

CREATE INDEX idx_health_metrics_timestamp ON health_metrics(timestamp);
CREATE INDEX idx_health_metrics_component ON health_metrics(component);
CREATE INDEX idx_health_metrics_metric_name ON health_metrics(metric_name);

CREATE INDEX idx_agent_operations_status ON agent_operations(status);
CREATE INDEX idx_agent_operations_started_at ON agent_operations(started_at);
CREATE INDEX idx_agent_operations_operation_type ON agent_operations(operation_type);

CREATE INDEX idx_security_assessments_severity ON security_assessments(severity);
CREATE INDEX idx_security_assessments_status ON security_assessments(status);
CREATE INDEX idx_security_assessments_detected_at ON security_assessments(detected_at);

CREATE INDEX idx_analytics_data_type ON analytics_data(data_type);
CREATE INDEX idx_analytics_processed_at ON analytics_data(processed_at);
CREATE INDEX idx_analytics_anomaly ON analytics_data(anomaly_detected);

CREATE INDEX idx_configurations_key ON configurations(config_key);
CREATE INDEX idx_configurations_type ON configurations(config_type);
CREATE INDEX idx_configurations_environment ON configurations(environment);

CREATE INDEX idx_sessions_session_id ON system_sessions(session_id);
CREATE INDEX idx_sessions_user_id ON system_sessions(user_id);
CREATE INDEX idx_sessions_last_activity ON system_sessions(last_activity);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_secrets_updated_at BEFORE UPDATE ON secrets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configurations_updated_at BEFORE UPDATE ON configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default configurations
INSERT INTO configurations (config_key, config_value, config_type, description) VALUES
('system.monitoring.enabled', 'true', 'boolean', 'Enable system monitoring'),
('system.audit.retention_days', '2555', 'integer', 'Audit log retention period in days'),
('security.assessment.schedule', '"0 2 * * *"', 'string', 'Cron schedule for security assessments'),
('analytics.ml.enabled', 'true', 'boolean', 'Enable ML-powered analytics'),
('agent.max_concurrent_operations', '10', 'integer', 'Maximum concurrent agent operations');

-- Create views for common queries
CREATE VIEW active_secrets AS
    SELECT * FROM secrets WHERE is_active = true;

CREATE VIEW recent_audit_logs AS
    SELECT * FROM audit_logs WHERE timestamp >= NOW() - INTERVAL '30 days';

CREATE VIEW critical_health_metrics AS
    SELECT * FROM health_metrics WHERE is_critical = true;

CREATE VIEW pending_operations AS
    SELECT * FROM agent_operations WHERE status IN ('pending', 'running');

CREATE VIEW open_vulnerabilities AS
    SELECT * FROM security_assessments WHERE status = 'open' AND false_positive = false; 