/**
 * VANTA API Client for VS Code Extension
 * Provides full feature parity with CLI and Web interface
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../utils/configurationManager';

export interface ProjectScanResult {
    name: string;
    confidence: number;
    secrets_count: number;
    status: string;
    path: string;
}

export interface SecretDetectionResult {
    key: string;
    description: string;
    confidence: number;
    type?: string;
    category?: string;
}

export interface VaultExportResult {
    data: string;
    format: string;
    encrypted: boolean;
}

export interface RotationResult {
    status: string;
    rotation_id: string;
    message?: string;
}

export interface StatusResult {
    vault_status: string;
    active_projects: number;
    total_secrets: number;
    recent_activity: string[];
    server_version?: string;
    uptime?: number;
}

export interface Secret {
    id: string;
    key: string;
    value: string;
    description?: string;
    category?: string;
    created_at: string;
    updated_at: string;
}

export class VantaAPIClient {
    private client: AxiosInstance;
    private configManager: ConfigurationManager;

    constructor(configManager: ConfigurationManager) {
        this.configManager = configManager;
        this.client = this.createClient();
    }

    private createClient(): AxiosInstance {
        const baseURL = this.configManager.getServerUrl();
        
        return axios.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'VANTA-VSCode-Extension/1.0.0'
            }
        });
    }

    public updateConfiguration(configManager: ConfigurationManager): void {
        this.configManager = configManager;
        this.client = this.createClient();
    }

    private async makeRequest<T>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        endpoint: string,
        data?: any
    ): Promise<T> {
        try {
            const response: AxiosResponse<T> = await this.client.request({
                method,
                url: endpoint,
                data
            });
            return response.data;
        } catch (error: any) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to VANTA server. Make sure it\'s running at ' + this.configManager.getServerUrl());
            }
            if (error.response) {
                throw new Error(`API Error ${error.response.status}: ${error.response.data?.message || error.response.statusText}`);
            }
            throw new Error(`Network Error: ${error.message}`);
        }
    }

    /**
     * Scan projects for secrets intelligence
     */
    async scanProjects(path?: string): Promise<ProjectScanResult[]> {
        const workspacePath = path || this.getWorkspacePath();
        return this.makeRequest<ProjectScanResult[]>('POST', '/api/scan/projects', {
            path: workspacePath
        });
    }

    /**
     * AI-powered secret detection
     */
    async detectSecrets(project: string, deep: boolean = false): Promise<SecretDetectionResult[]> {
        const enableDeepAnalysis = this.configManager.getEnableDeepAnalysis();
        return this.makeRequest<SecretDetectionResult[]>('POST', '/api/secrets/scaffold', {
            project,
            deep: deep || enableDeepAnalysis
        });
    }

    /**
     * Export encrypted vault
     */
    async exportVault(project: string, format?: string): Promise<VaultExportResult> {
        const exportFormat = format || this.configManager.getDefaultExportFormat();
        return this.makeRequest<VaultExportResult>('POST', '/api/env/export', {
            project,
            format: exportFormat
        });
    }

    /**
     * Rotate secrets for project
     */
    async rotateSecrets(project: string): Promise<RotationResult> {
        return this.makeRequest<RotationResult>('POST', '/api/rotation/status', {
            project,
            action: 'rotate'
        });
    }

    /**
     * Get system and vault status
     */
    async getStatus(): Promise<StatusResult> {
        return this.makeRequest<StatusResult>('GET', '/api/events/status');
    }

    /**
     * Get authentication status
     */
    async getAuthStatus(): Promise<{ authenticated: boolean; user?: string }> {
        return this.makeRequest<{ authenticated: boolean; user?: string }>('GET', '/api/auth/status');
    }

    /**
     * Get secrets for a project
     */
    async getSecrets(project: string): Promise<Secret[]> {
        return this.makeRequest<Secret[]>('GET', `/api/secrets/${project}`);
    }

    /**
     * Add a new secret
     */
    async addSecret(project: string, secret: Partial<Secret>): Promise<Secret> {
        return this.makeRequest<Secret>('POST', `/api/secrets/${project}`, secret);
    }

    /**
     * Update an existing secret
     */
    async updateSecret(project: string, secretId: string, secret: Partial<Secret>): Promise<Secret> {
        return this.makeRequest<Secret>('PUT', `/api/secrets/${project}/${secretId}`, secret);
    }

    /**
     * Delete a secret
     */
    async deleteSecret(project: string, secretId: string): Promise<void> {
        return this.makeRequest<void>('DELETE', `/api/secrets/${project}/${secretId}`);
    }

    /**
     * Test connection to VANTA server
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.getAuthStatus();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current workspace path
     */
    private getWorkspacePath(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            return workspaceFolders[0].uri.fsPath;
        }
        return process.cwd();
    }

    /**
     * Health check endpoint
     */
    async healthCheck(): Promise<{ status: string; timestamp: string }> {
        return this.makeRequest<{ status: string; timestamp: string }>('GET', '/api/health');
    }

    /**
     * Get server information
     */
    async getServerInfo(): Promise<{ version: string; features: string[] }> {
        return this.makeRequest<{ version: string; features: string[] }>('GET', '/api/info');
    }
} 