/**
 * Secrets Provider for VANTA VS Code Extension
 * Manages the secrets tree view
 */

import * as vscode from 'vscode';
import { VantaAPIClient, Secret } from '../clients/apiClient';
import { NotificationManager } from '../utils/notificationManager';

export class SecretsProvider implements vscode.TreeDataProvider<SecretItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SecretItem | undefined | null | void> = new vscode.EventEmitter<SecretItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SecretItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private secrets: Secret[] = [];
    private currentProject: string | undefined;

    constructor(
        private apiClient: VantaAPIClient,
        private notificationManager: NotificationManager
    ) {}

    refresh(): void {
        this.loadSecrets();
    }

    getTreeItem(element: SecretItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SecretItem): Thenable<SecretItem[]> {
        if (!element) {
            // Root level - return secrets
            if (!this.currentProject) {
                return Promise.resolve([]); // No project selected, show empty
            }
            if (this.secrets.length === 0) {
                // Load secrets if a project is selected but no secrets are loaded
                return this.loadSecrets().then(() => {
                    return this.secrets.map(secret => new SecretItem(secret));
                });
            }
            return Promise.resolve(this.secrets.map(secret => new SecretItem(secret)));
        }
        return Promise.resolve([]);
    }

    setCurrentProject(projectName: string | undefined): void {
        if (this.currentProject !== projectName) {
            this.currentProject = projectName;
            this.secrets = []; // Clear old secrets when project changes
            if (projectName) {
                this.loadSecrets(); // Load new secrets and refresh tree
            } else {
                this._onDidChangeTreeData.fire(); // Refresh to show empty state
            }
        }
    }

    getCurrentProjectName(): string | undefined {
        return this.currentProject;
    }

    async loadSecrets(): Promise<Secret[]> {
        if (!this.currentProject) {
            this.secrets = [];
            this._onDidChangeTreeData.fire();
            return [];
        }

        try {
            const secretsData = await this.apiClient.getSecrets(this.currentProject);
            this.secrets = secretsData;
            this._onDidChangeTreeData.fire();
            return secretsData;
        } catch (error: any) {
            this.notificationManager.showError(`Failed to load secrets for ${this.currentProject}: ${error.message}`);
            this.secrets = [];
            this._onDidChangeTreeData.fire();
            return [];
        }
    }
}

export class SecretItem extends vscode.TreeItem {
    constructor(public readonly secret: Secret) {
        super(secret.key, vscode.TreeItemCollapsibleState.None);

        this.tooltip = secret.description || secret.key;
        this.description = secret.category || 'Secret';
        this.contextValue = 'secret';

        // Set icon
        this.iconPath = new vscode.ThemeIcon('key');

        // Add command to copy on click
        this.command = {
            command: 'vanta.copySecret',
            title: 'Copy Secret',
            arguments: [this.secret]
        };
    }
} 