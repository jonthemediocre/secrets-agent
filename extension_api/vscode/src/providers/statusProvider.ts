/**
 * Status Provider for VANTA VS Code Extension
 * Manages the status tree view
 */

import * as vscode from 'vscode';
import { VantaAPIClient, StatusResult } from '../clients/apiClient';

export class StatusProvider implements vscode.TreeDataProvider<StatusItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<StatusItem | undefined | null | void> = new vscode.EventEmitter<StatusItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StatusItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private status: StatusResult | undefined;

    constructor(private apiClient: VantaAPIClient) {}

    refresh(): void {
        this.loadStatus();
    }

    getTreeItem(element: StatusItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: StatusItem): Thenable<StatusItem[]> {
        if (!element) {
            // Root level - return status items
            if (!this.status) {
                // Load status if not already loaded
                return this.loadStatus().then(statusResult => {
                    if (!statusResult) { // Check if statusResult is undefined (error case)
                         return [new StatusItem('Error', 'Failed to load status', 'error')];
                    }
                    return this.buildStatusItems(statusResult);
                });
            }
            return Promise.resolve(this.buildStatusItems(this.status));
        }
        return Promise.resolve([]);
    }

    private buildStatusItems(statusData: StatusResult): StatusItem[] {
        const items: StatusItem[] = [
            new StatusItem('Vault Status', statusData.vault_status, statusData.vault_status === 'healthy' ? 'check' : 'warning'),
            new StatusItem('Active Projects', statusData.active_projects.toString(), 'folder'),
            new StatusItem('Total Secrets', statusData.total_secrets.toString(), 'key'),
        ];

        if (statusData.server_version) {
            items.push(new StatusItem('Server Version', statusData.server_version, 'info'));
        }

        if (statusData.uptime) {
            const uptimeSeconds = statusData.uptime; // Assuming uptime is in seconds
            const d = Math.floor(uptimeSeconds / (3600*24));
            const h = Math.floor(uptimeSeconds % (3600*24) / 3600);
            const m = Math.floor(uptimeSeconds % 3600 / 60);
            const s = Math.floor(uptimeSeconds % 60);
            
            let uptimeStr = '';
            if (d > 0) uptimeStr += `${d}d `;
            if (h > 0) uptimeStr += `${h}h `;
            if (m > 0) uptimeStr += `${m}m `;
            if (s > 0 || uptimeStr === '') uptimeStr += `${s}s`;
            
            items.push(new StatusItem('Uptime', uptimeStr.trim(), 'clock'));
        }
         if (statusData.recent_activity && statusData.recent_activity.length > 0) {
            items.push(new StatusItem('Recent Activity', statusData.recent_activity[0], 'history'));
        }

        return items;
    }

    // updateStatus is no longer strictly necessary as loadStatus handles it.
    // However, it can be kept if direct status updates are needed elsewhere.
    updateStatus(status: StatusResult): void {
        this.status = status;
        this._onDidChangeTreeData.fire();
    }

    async loadStatus(): Promise<StatusResult | undefined> {
        try {
            const statusData = await this.apiClient.getStatus();
            this.status = statusData;
            this._onDidChangeTreeData.fire();
            return statusData;
        } catch (error: any) {
            // Handle error silently for status provider, but log it
            console.error("Failed to load VANTA status:", error);
            this.status = undefined; // Clear status on error
            this._onDidChangeTreeData.fire(); // Refresh to show error or empty state
            return undefined;
        }
    }
}

export class StatusItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly value: string,
        public readonly iconName: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);

        this.description = value;
        this.tooltip = `${label}: ${value}`;
        this.iconPath = new vscode.ThemeIcon(iconName);
        this.contextValue = 'statusItem';
    }
} 