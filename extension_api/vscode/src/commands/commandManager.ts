/**
 * Command Manager for VANTA VS Code Extension
 * Handles all extension commands with full feature parity
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { VantaAPIClient, ProjectScanResult, SecretDetectionResult } from '../clients/apiClient';
import { ProjectsProvider } from '../providers/projectsProvider';
import { SecretsProvider, SecretItem } from '../providers/secretsProvider';
import { StatusProvider } from '../providers/statusProvider';
import { NotificationManager } from '../utils/notificationManager';
import { StatusBarManager } from '../utils/statusBarManager';

export class CommandManager {
    constructor(
        private apiClient: VantaAPIClient,
        private projectsProvider: ProjectsProvider,
        private secretsProvider: SecretsProvider,
        private statusProvider: StatusProvider,
        private notificationManager: NotificationManager,
        private statusBarManager: StatusBarManager
    ) {}

    /**
     * Scan projects for secrets intelligence
     */
    async scanProject(): Promise<void> {
        try {
            this.statusBarManager.setStatus('$(search~spin) Scanning...', 'Scanning for projects');
            this.notificationManager.showInfo('🔍 Scanning projects for secrets...');

            // Let the provider handle the API call and its own update
            const results = await this.projectsProvider.loadProjects(); // Now calls the refactored loadProjects
            
            if (results.length === 0) {
                this.notificationManager.showWarning('No projects found in workspace or scan failed.');
                this.statusBarManager.setStatus('$(warning) No projects', 'No projects found or scan failed.');
                // Set context for conditional UI even if no projects
                vscode.commands.executeCommand('setContext', 'vanta.hasProjects', false);
                return;
            }
            
            // Show results (Provider already updated itself and fired event)
            const totalSecrets = results.reduce((sum, project) => sum + project.secrets_count, 0);
            this.notificationManager.showInfo(
                `✅ Found ${results.length} projects with ${totalSecrets} potential secrets`
            );
            
            this.statusBarManager.setStatus(
                `$(check) ${results.length} projects`, 
                `Found ${results.length} projects with ${totalSecrets} secrets`
            );

            // Set context for conditional UI
            vscode.commands.executeCommand('setContext', 'vanta.hasProjects', results.length > 0);

        } catch (error: any) { // This catch might be redundant if loadProjects handles its own errors
            this.notificationManager.showError(`Scan project command failed: ${error.message}`);
            this.statusBarManager.setStatus('$(error) Scan failed', error.message);
            vscode.commands.executeCommand('setContext', 'vanta.hasProjects', false);
        }
    }

    /**
     * AI-powered secret detection
     */
    async detectSecrets(project?: any): Promise<void> {
        let projectName: string;
        let projectPath: string | undefined;

        try {
            if (project && project.name) {
                projectName = project.name;
                if (project.path) projectPath = project.path; // Assuming project object might have path
            } else {
                const projects = await this.projectsProvider.getProjects(); // Assumes projects are loaded
                if (projects.length === 0) {
                    this.notificationManager.showWarning('No projects available. Run scan first.');
                    return;
                }

                const selectedProjectItem = await vscode.window.showQuickPick(
                    projects.map(p => ({
                        label: `$(folder) ${p.name}`,
                        description: `${p.confidence}% confidence, ${p.secrets_count} secrets`,
                        detail: p.path,
                        projectData: p // Store the whole project data
                    })),
                    {
                        placeHolder: 'Select a project for AI secret detection',
                        matchOnDescription: true,
                        matchOnDetail: true
                    }
                );

                if (!selectedProjectItem) return;
                projectName = selectedProjectItem.projectData.name;
                projectPath = selectedProjectItem.projectData.path;
            }

            this.statusBarManager.setStatus('$(robot~spin) AI Analysis...', 'Running AI secret detection');
            this.notificationManager.showInfo(`🤖 Running AI analysis on ${projectName}...`);

            // Set current project in secrets provider BEFORE loading/detecting its secrets
            this.secretsProvider.setCurrentProject(projectName); 

            const detectedResults = await this.apiClient.detectSecrets(projectName, false); // Assuming deep analysis is false by default or configured elsewhere
            
            if (detectedResults.length === 0) {
                this.notificationManager.showInfo('No secrets detected by AI analysis for this project.');
                this.statusBarManager.setStatus('$(check) No secrets', 'AI analysis complete for ' + projectName);
                // Still refresh to ensure the view is accurate (e.g. shows empty)
                this.secretsProvider.refresh(); 
                vscode.commands.executeCommand('setContext', 'vanta.hasSelectedProject', true); // Project is selected, even if no secrets
                vscode.commands.executeCommand('setContext', 'vanta.currentProjectName', projectName);
                return;
            }

            // Show selection dialog for detected secrets
            const selectedSecretsToAdd = await this.showSecretSelectionDialog(detectedResults);
            
            if (selectedSecretsToAdd.length > 0) {
                // Placeholder: Simulate adding secrets to the vault via API
                // In a real scenario, this would involve API calls for each secret or a batch call.
                // For now, we assume success for all selected secrets.
                // await this.apiClient.addSecretsToVault(projectName, selectedSecretsToAdd);
                this.notificationManager.showInfo(
                    `✅ Simulated adding ${selectedSecretsToAdd.length} secrets to vault for ${projectName}`
                );
            } else {
                this.notificationManager.showInfo('No new secrets selected to add to the vault.');
            }

            // Refresh secrets view for the current project to show newly added/detected secrets
            this.secretsProvider.refresh(); 
            
            this.statusBarManager.setStatus(
                `$(check) ${detectedResults.length} detected`, 
                `AI detected ${detectedResults.length} potential secrets in ${projectName}`
            );
            vscode.commands.executeCommand('setContext', 'vanta.hasSelectedProject', true);
            vscode.commands.executeCommand('setContext', 'vanta.currentProjectName', projectName);

        } catch (error: any) {
            this.notificationManager.showError(`AI detection failed: ${error.message}`);
            this.statusBarManager.setStatus('$(error) Detection failed', error.message);
            // If detection fails, we might not have a selected project, or it might be stale
            // Consider clearing current project in secretsProvider or refreshing it carefully
            this.secretsProvider.setCurrentProject(undefined); // Clear if detection failed for an active project
        }
    }

    /**
     * Export vault to various formats
     */
    async exportVault(project?: any): Promise<void> {
        let projectName: string;

        try {
            if (project && project.name) {
                projectName = project.name;
            } else {
                // Try to get from context or current SecretsProvider state
                const currentProjectContext = vscode.workspace.getConfiguration('vanta').get('currentProjectName') as string | undefined || this.secretsProvider.getCurrentProjectName();
                if (currentProjectContext) {
                    projectName = currentProjectContext;
                } else {
                    const projects = await this.projectsProvider.getProjects();
                    if (projects.length === 0) {
                        this.notificationManager.showWarning('No projects available. Run scan first.');
                        return;
                    }
                    const selectedProjectItem = await vscode.window.showQuickPick(
                        projects.map(p => ({
                            label: `$(folder) ${p.name}`,
                            description: `${p.secrets_count} secrets`,
                            projectData: p
                        })),
                        { placeHolder: 'Select a project to export' }
                    );
                    if (!selectedProjectItem) return;
                    projectName = selectedProjectItem.projectData.name;
                }
            }

            if (!projectName) {
                this.notificationManager.showError('Could not determine a project to export.');
                return;
            }

            // Select export format
            const format = await vscode.window.showQuickPick([
                { label: '$(file-text) .env format', value: 'env' },
                { label: '$(json) JSON format', value: 'json' },
                { label: '$(file-code) YAML format', value: 'yaml' }
            ], { placeHolder: 'Select export format' });

            if (!format) return;

            this.statusBarManager.setStatus('$(export~spin) Exporting...', 'Exporting vault for ' + projectName);
            this.notificationManager.showInfo(`📤 Exporting ${projectName} vault as ${format.label}...`);

            const result = await this.apiClient.exportVault(projectName, format.value);
            
            const defaultFileName = `${projectName.replace(/[^a-z0-9_\-]+/gi, '_')}_secrets.${format.value}`;
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 
                            ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, defaultFileName) 
                            : vscode.Uri.file(defaultFileName),
                filters: {
                    [`.${format.value.toUpperCase()} Files`]: [format.value],
                    'All Files': ['*']
                }
            });

            if (saveUri) {
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(result.data, 'utf8'));
                this.notificationManager.showInfo(`✅ Vault for ${projectName} exported to ${path.basename(saveUri.fsPath)}`);
                
                vscode.commands.executeCommand('setContext', 'vanta.lastExportPath', saveUri.fsPath);
                vscode.commands.executeCommand('setContext', 'vanta.lastExportProject', projectName);

                const openFile = await vscode.window.showInformationMessage(
                    'Vault exported successfully!',
                    'Open File', 'Copy Path'
                );
                
                if (openFile === 'Open File') {
                    await vscode.window.showTextDocument(saveUri);
                } else if (openFile === 'Copy Path') {
                    await vscode.env.clipboard.writeText(saveUri.fsPath);
                    this.notificationManager.showInfo('Path copied to clipboard.');
                }
            }

            this.statusBarManager.setStatus('$(check) Export complete', 'Vault exported successfully');

        } catch (error: any) {
            this.notificationManager.showError(`Export failed: ${error.message}`);
            this.statusBarManager.setStatus('$(error) Export failed', error.message);
        }
    }

    /**
     * Rotate secrets for project
     */
    async rotateSecrets(project?: any): Promise<void> {
        let projectName: string;

        try {
            if (project && project.name) {
                projectName = project.name;
            } else {
                const currentProjectContext = vscode.workspace.getConfiguration('vanta').get('currentProjectName') as string | undefined || this.secretsProvider.getCurrentProjectName();
                if (currentProjectContext) {
                    projectName = currentProjectContext;
                } else {
                    const projects = await this.projectsProvider.getProjects();
                    if (projects.length === 0) {
                        this.notificationManager.showWarning('No projects available. Run scan first.');
                        return;
                    }
                    const selectedProjectItem = await vscode.window.showQuickPick(
                        projects.map(p => ({
                            label: `$(folder) ${p.name}`,
                            description: `${p.secrets_count} secrets`,
                            projectData: p
                        })),
                        { placeHolder: 'Select a project for secret rotation' }
                    );
                    if (!selectedProjectItem) return;
                    projectName = selectedProjectItem.projectData.name;
                }
            }

            if (!projectName) {
                this.notificationManager.showError('Could not determine a project for secret rotation.');
                return;
            }

            // Confirm rotation
            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to rotate secrets for '${projectName}'? This action cannot be undone easily.`, 
                { modal: true }, 
                'Yes, Rotate Secrets'
            );

            if (confirm !== 'Yes, Rotate Secrets') {
                this.notificationManager.showInfo('Secret rotation cancelled.');
                return;
            }

            this.statusBarManager.setStatus('$(sync~spin) Rotating...', 'Rotating secrets for ' + projectName);
            this.notificationManager.showInfo(`🔄 Initiating secret rotation for ${projectName}...`);

            // Ensure the secrets provider is focused on the correct project before potential refresh
            if (this.secretsProvider.getCurrentProjectName() !== projectName) {
                 this.secretsProvider.setCurrentProject(projectName);
            }

            const result = await this.apiClient.rotateSecrets(projectName);
            
            if (result.status === 'success') {
                this.notificationManager.showInfo(
                    `✅ Secret rotation initiated successfully for ${projectName}.\nRotation ID: ${result.rotation_id}`
                );
            } else {
                this.notificationManager.showWarning(`Rotation status for ${projectName}: ${result.status}. ${result.message || ''}`);
            }

            this.statusBarManager.setStatus('$(check) Rotation initiated', `Secret rotation for ${projectName} started`);

            // Refresh relevant views
            this.secretsProvider.refresh(); // Refresh secrets to show new statuses
            this.statusProvider.refresh();  // Refresh general status (recent activity, etc.)

        } catch (error: any) {
            this.notificationManager.showError(`Rotation failed: ${error.message}`);
            this.statusBarManager.setStatus('$(error) Rotation failed', error.message);
        }
    }

    /**
     * Show system status
     */
    async showStatus(): Promise<void> {
        try {
            this.statusBarManager.setStatus('$(pulse~spin) Checking...', 'Checking system status');
            
            // The statusProvider.loadStatus() will fetch, update the provider, and fire its event.
            // It also returns the status data directly.
            const status = await this.statusProvider.loadStatus(); 
            
            if (!status) {
                this.notificationManager.showError('Status check failed: Could not retrieve status.');
                this.statusBarManager.setStatus('$(error) Status failed', 'Could not retrieve status.');
                return;
            }
            
            // Show status in information message
            const statusColor = status.vault_status === 'healthy' ? '✅' : '⚠️';
            this.notificationManager.showInfo(
                `${statusColor} Vault: ${status.vault_status} | Projects: ${status.active_projects} | Secrets: ${status.total_secrets}`
            );

            this.statusBarManager.setStatus(
                `$(pulse) ${status.vault_status}`,
                `Vault: ${status.vault_status}, Projects: ${status.active_projects}, Secrets: ${status.total_secrets}`
            );

        } catch (error: any) { // Catch any other unexpected errors
            this.notificationManager.showError(`Status check failed: ${error.message}`);
            this.statusBarManager.setStatus('$(error) Status failed', error.message);
        }
    }

    /**
     * Refresh all data
     */
    async refreshAll(): Promise<void> {
        try {
            this.statusBarManager.setStatus('$(refresh~spin) Refreshing...', 'Refreshing all data');
            
            // Refresh all providers
            this.projectsProvider.refresh();
            this.secretsProvider.refresh();
            this.statusProvider.refresh();
            
            this.notificationManager.showInfo('🔄 All data refreshed');
            this.statusBarManager.setStatus('$(check) Refreshed', 'All data refreshed');

        } catch (error: any) {
            this.notificationManager.showError(`Refresh failed: ${error.message}`);
            this.statusBarManager.setStatus('$(error) Refresh failed', error.message);
        }
    }

    /**
     * Add a new secret
     */
    async addSecret(): Promise<void> {
        let currentProjectName = this.secretsProvider.getCurrentProjectName();

        if (!currentProjectName) {
            const projects = await this.projectsProvider.getProjects();
            if (projects.length === 0) {
                this.notificationManager.showWarning('No projects available. Scan or create a project first.');
                return;
            }
            const selectedProjectItem = await vscode.window.showQuickPick(
                projects.map(p => ({
                    label: `$(folder) ${p.name}`,
                    description: 'Select this project to add the secret to',
                    projectData: p
                })),
                { placeHolder: 'Select a project to add the new secret to' }
            );
            if (!selectedProjectItem) return; // User cancelled
            currentProjectName = selectedProjectItem.projectData.name;
            this.secretsProvider.setCurrentProject(currentProjectName); // Ensure provider is targeting this project
        }

        try {
            const key = await vscode.window.showInputBox({
                prompt: 'Enter secret key (e.g., API_KEY)',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Secret key cannot be empty';
                    }
                    // Basic validation, can be enhanced (e.g., no spaces, specific characters)
                    if (!/^[A-Za-z0-9_\-]+$/.test(value)) {
                        return 'Key can only contain letters, numbers, underscores, and hyphens.';
                    }
                    return null;
                }
            });

            if (!key) return; // User cancelled

            const value = await vscode.window.showInputBox({
                prompt: 'Enter secret value',
                password: true, // Mask the input
                validateInput: (v) => (v && v.length > 0) ? null : 'Secret value cannot be empty'
            });

            if (!value) return; // User cancelled

            const description = await vscode.window.showInputBox({
                prompt: 'Enter a brief description for the secret (optional)'
            });

            // Assuming description can be an empty string if user provides nothing
            const newSecretData = { key, value, description: description || '' };

            this.statusBarManager.setStatus('$(plus~spin) Adding secret...', `Adding secret ${key}`);
            await this.apiClient.addSecret(currentProjectName, newSecretData);
            
            this.notificationManager.showInfo(`✅ Secret '${key}' added successfully to project '${currentProjectName}'.`);
            this.statusBarManager.setStatus('$(check) Secret added', `Secret ${key} added`);
            this.secretsProvider.refresh(); // Refresh the secrets view for the current project
            this.statusProvider.refresh(); // Refresh global status (e.g. total secrets count)

        } catch (error: any) {
            this.notificationManager.showError(`Failed to add secret: ${error.message}`);
            this.statusBarManager.setStatus('$(error) Add failed', 'Failed to add secret');
        }
    }

    /**
     * Edit an existing secret
     */
    async editSecret(secretItem?: SecretItem): Promise<void> {
        if (!secretItem || !secretItem.secret) {
            this.notificationManager.showError('No secret selected to edit. Please select a secret from the tree view.');
            // Optionally, could try to pick a secret if none is provided
            return;
        }

        const projectToEditIn = this.secretsProvider.getCurrentProjectName();
        if (!projectToEditIn) {
            this.notificationManager.showError('Cannot determine the current project for editing the secret.');
            return;
        }

        const oldSecret = secretItem.secret;

        try {
            const newKey = await vscode.window.showInputBox({
                prompt: 'Enter new secret key (leave blank to keep current)',
                value: oldSecret.key,
                validateInput: (value) => {
                    if (value && !/^[A-Za-z0-9_\-]+$/.test(value)) {
                        return 'Key can only contain letters, numbers, underscores, and hyphens.';
                    }
                    return null;
                }
            });

            // If user escapes or provides empty (and it was not empty before), keep old key for update logic
            const keyToUpdate = (newKey === undefined) ? oldSecret.key : (newKey === '' ? oldSecret.key : newKey);

            const newValue = await vscode.window.showInputBox({
                prompt: 'Enter new secret value (leave blank to keep current)',
                password: true,
                placeHolder: 'Leave blank to keep current value'
            });

            // Value can be empty string, but if undefined (escaped), it means no change
            const valueToUpdate = (newValue === undefined) ? oldSecret.value : newValue;

            const newDescription = await vscode.window.showInputBox({
                prompt: 'Enter new description (optional, leave blank to keep current)',
                value: oldSecret.description || ''
            });

            const descriptionToUpdate = (newDescription === undefined) ? oldSecret.description : newDescription;

            // Check if anything actually changed
            if (keyToUpdate === oldSecret.key && 
                valueToUpdate === oldSecret.value && 
                descriptionToUpdate === oldSecret.description) {
                this.notificationManager.showInfo('No changes made to the secret.');
                return;
            }

            const updatedSecretData = { 
                key: keyToUpdate, 
                value: valueToUpdate, 
                description: descriptionToUpdate 
            };

            this.statusBarManager.setStatus('$(pencil~spin) Updating secret...', `Updating secret ${oldSecret.key}`);
            // Assuming an apiClient.updateSecret(projectName, oldKey, newSecretData) method
            await this.apiClient.updateSecret(projectToEditIn, oldSecret.key, updatedSecretData);
            
            this.notificationManager.showInfo(`✅ Secret '${oldSecret.key}' updated successfully in project '${projectToEditIn}'.`);
            this.statusBarManager.setStatus('$(check) Secret updated', `Secret ${oldSecret.key} updated`);
            this.secretsProvider.refresh();
            // No need to refresh statusProvider unless total secret count might change, which it doesn't on edit.

        } catch (error: any) {
            this.notificationManager.showError(`Failed to update secret: ${error.message}`);
            this.statusBarManager.setStatus('$(error) Update failed', 'Failed to update secret');
        }
    }

    /**
     * Delete a secret
     */
    async deleteSecret(secretItem?: SecretItem): Promise<void> {
        if (!secretItem || !secretItem.secret) {
            this.notificationManager.showError('No secret selected to delete. Please select a secret from the tree view.');
            return;
        }

        const projectToDeleteFrom = this.secretsProvider.getCurrentProjectName();
        if (!projectToDeleteFrom) {
            this.notificationManager.showError('Cannot determine the current project for deleting the secret.');
            return;
        }

        const secretToDelete = secretItem.secret;

        const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete the secret '${secretToDelete.key}' from project '${projectToDeleteFrom}'? This action cannot be undone.`, 
            { modal: true }, 
            'Yes, Delete Secret'
        );

        if (confirm !== 'Yes, Delete Secret') {
            this.notificationManager.showInfo('Delete secret cancelled.');
            return;
        }

        try {
            this.statusBarManager.setStatus('$(trash~spin) Deleting secret...', `Deleting secret ${secretToDelete.key}`);
            // Assuming an apiClient.deleteSecret(projectName, secretKey) method
            await this.apiClient.deleteSecret(projectToDeleteFrom, secretToDelete.key);
            
            this.notificationManager.showInfo(`🗑️ Secret '${secretToDelete.key}' deleted successfully from project '${projectToDeleteFrom}'.`);
            this.statusBarManager.setStatus('$(check) Secret deleted', `Secret ${secretToDelete.key} deleted`);
            this.secretsProvider.refresh(); // Refresh secrets view
            this.statusProvider.refresh(); // Refresh global status (e.g. total secrets count)

        } catch (error: any) {
            this.notificationManager.showError(`Failed to delete secret: ${error.message}`);
            this.statusBarManager.setStatus('$(error) Delete failed', 'Failed to delete secret');
        }
    }

    /**
     * Copy secret value to clipboard
     */
    async copySecret(secret: any): Promise<void> {
        await vscode.env.clipboard.writeText(secret.value || '***');
        this.notificationManager.showInfo(`📋 Secret '${secret.key}' copied to clipboard`);
    }

    /**
     * Open project in new window
     */
    async openProject(project: any): Promise<void> {
        if (project.path) {
            const uri = vscode.Uri.file(project.path);
            await vscode.commands.executeCommand('vscode.openFolder', uri, true);
        }
    }

    /**
     * Configure extension settings
     */
    async configureSettings(): Promise<void> {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'vanta');
    }

    /**
     * Show help and documentation
     */
    async showHelp(): Promise<void> {
        const helpContent = `
# 🔐 VANTA Secrets Agent - VS Code Extension

## Quick Start
1. **Scan Projects**: Use Ctrl+Shift+S to scan for projects
2. **AI Detection**: Use Ctrl+Shift+D for AI-powered secret detection  
3. **Export Vault**: Use Ctrl+Shift+E to export secrets

## Features
- 🔍 **Project Scanning**: Discover projects with secrets
- 🤖 **AI Detection**: Smart secret identification
- 📤 **Vault Export**: Export to .env, JSON, or YAML
- 🔄 **Secret Rotation**: Automated secret rotation
- 📊 **Status Monitoring**: Real-time system status

## Commands
- \`VANTA: Scan for Secrets\` - Scan workspace for projects
- \`VANTA: AI Secret Detection\` - Run AI analysis
- \`VANTA: Export Vault\` - Export secrets to file
- \`VANTA: Rotate Secrets\` - Rotate project secrets
- \`VANTA: Show Status\` - Display system status

## Configuration
Access settings via: File → Preferences → Settings → Extensions → VANTA

For more help, visit: https://github.com/vanta/secrets-agent
        `;

        const doc = await vscode.workspace.openTextDocument({
            content: helpContent,
            language: 'markdown'
        });
        
        await vscode.window.showTextDocument(doc);
    }

    /**
     * Show secret selection dialog
     */
    private async showSecretSelectionDialog(secrets: SecretDetectionResult[]): Promise<SecretDetectionResult[]> {
        const items = secrets.map(secret => ({
            label: `$(key) ${secret.key}`,
            description: `${secret.confidence}% confidence`,
            detail: secret.description,
            picked: true, // Default to selected
            secret
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select secrets to add to vault',
            canPickMany: true,
            matchOnDescription: true,
            matchOnDetail: true
        });

        return selected ? selected.map(item => item.secret) : [];
    }
} 