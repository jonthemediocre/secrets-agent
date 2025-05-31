/**
 * Configuration Manager for VANTA VS Code Extension
 * Handles all extension settings and preferences
 */

import * as vscode from 'vscode';

export class ConfigurationManager {
    private static readonly CONFIG_SECTION = 'vanta';

    constructor() {
        // Initialize with default values if needed
    }

    /**
     * Get the VANTA server URL
     */
    getServerUrl(): string {
        return this.getConfig<string>('serverUrl', 'http://localhost:3000');
    }

    /**
     * Get auto-refresh setting
     */
    getAutoRefresh(): boolean {
        return this.getConfig<boolean>('autoRefresh', true);
    }

    /**
     * Get refresh interval in seconds
     */
    getRefreshInterval(): number {
        return this.getConfig<number>('refreshInterval', 30);
    }

    /**
     * Get show confidence scores setting
     */
    getShowConfidenceScores(): boolean {
        return this.getConfig<boolean>('showConfidenceScores', true);
    }

    /**
     * Get enable deep analysis setting
     */
    getEnableDeepAnalysis(): boolean {
        return this.getConfig<boolean>('enableDeepAnalysis', false);
    }

    /**
     * Get default export format
     */
    getDefaultExportFormat(): string {
        return this.getConfig<string>('defaultExportFormat', 'env');
    }

    /**
     * Get enable notifications setting
     */
    getEnableNotifications(): boolean {
        return this.getConfig<boolean>('enableNotifications', true);
    }

    /**
     * Update a configuration value
     */
    async updateConfig<T>(key: string, value: T, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        await config.update(key, value, target);
    }

    /**
     * Reload configuration (useful after changes)
     */
    reload(): void {
        // Configuration is automatically reloaded by VS Code
        // This method exists for consistency and future extensibility
    }

    /**
     * Get all configuration as an object
     */
    getAllConfig(): any {
        return vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
    }

    /**
     * Reset configuration to defaults
     */
    async resetToDefaults(): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        const keys = [
            'serverUrl',
            'autoRefresh',
            'refreshInterval',
            'showConfidenceScores',
            'enableDeepAnalysis',
            'defaultExportFormat',
            'enableNotifications'
        ];

        for (const key of keys) {
            await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
        }
    }

    /**
     * Validate configuration
     */
    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        // Validate server URL
        const serverUrl = this.getServerUrl();
        try {
            new URL(serverUrl);
        } catch {
            errors.push(`Invalid server URL: ${serverUrl}`);
        }

        // Validate refresh interval
        const refreshInterval = this.getRefreshInterval();
        if (refreshInterval < 5 || refreshInterval > 300) {
            errors.push(`Refresh interval must be between 5 and 300 seconds, got: ${refreshInterval}`);
        }

        // Validate export format
        const exportFormat = this.getDefaultExportFormat();
        const validFormats = ['env', 'json', 'yaml'];
        if (!validFormats.includes(exportFormat)) {
            errors.push(`Invalid export format: ${exportFormat}. Must be one of: ${validFormats.join(', ')}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get configuration value with fallback
     */
    private getConfig<T>(key: string, defaultValue: T): T {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        return config.get<T>(key, defaultValue);
    }

    /**
     * Check if configuration has been customized
     */
    hasCustomConfig(): boolean {
        const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
        const inspect = config.inspect('serverUrl');
        
        return !!(
            inspect?.workspaceValue ||
            inspect?.workspaceFolderValue ||
            inspect?.globalValue
        );
    }

    /**
     * Export configuration for backup/sharing
     */
    exportConfig(): any {
        return {
            serverUrl: this.getServerUrl(),
            autoRefresh: this.getAutoRefresh(),
            refreshInterval: this.getRefreshInterval(),
            showConfidenceScores: this.getShowConfidenceScores(),
            enableDeepAnalysis: this.getEnableDeepAnalysis(),
            defaultExportFormat: this.getDefaultExportFormat(),
            enableNotifications: this.getEnableNotifications()
        };
    }

    /**
     * Import configuration from backup
     */
    async importConfig(config: any): Promise<void> {
        const validKeys = [
            'serverUrl',
            'autoRefresh',
            'refreshInterval',
            'showConfidenceScores',
            'enableDeepAnalysis',
            'defaultExportFormat',
            'enableNotifications'
        ];

        for (const key of validKeys) {
            if (config.hasOwnProperty(key)) {
                await this.updateConfig(key, config[key]);
            }
        }
    }
} 