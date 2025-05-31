/**
 * Projects Provider for VANTA VS Code Extension
 * Manages the projects tree view
 */

import * as vscode from 'vscode';
import { VantaAPIClient, ProjectScanResult } from '../clients/apiClient';
import { NotificationManager } from '../utils/notificationManager';

export class ProjectsProvider implements vscode.TreeDataProvider<ProjectItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | null | void> = new vscode.EventEmitter<ProjectItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private projects: ProjectScanResult[] = [];

    constructor(
        private apiClient: VantaAPIClient,
        private notificationManager: NotificationManager
    ) {}

    refresh(): void {
        this.loadProjects();
    }

    getTreeItem(element: ProjectItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ProjectItem): Thenable<ProjectItem[]> {
        if (!element) {
            // Root level - return projects
            if (this.projects.length === 0) {
                // Load projects if not already loaded or if explicitly asked to refresh
                return this.loadProjects().then(() => {
                    return this.projects.map(project => new ProjectItem(
                        project.name,
                        project,
                        vscode.TreeItemCollapsibleState.None
                    ));
                });
            }
            return Promise.resolve(this.projects.map(project => new ProjectItem(
                project.name,
                project,
                vscode.TreeItemCollapsibleState.None
            )));
        }
        return Promise.resolve([]);
    }

    updateProjects(projects: ProjectScanResult[]): void {
        this.projects = projects;
        this._onDidChangeTreeData.fire();
    }

    getProjects(): ProjectScanResult[] {
        return this.projects;
    }

    async loadProjects(): Promise<ProjectScanResult[]> {
        try {
            const projectsData = await this.apiClient.scanProjects();
            this.projects = projectsData;
            this._onDidChangeTreeData.fire();
            return projectsData;
        } catch (error: any) {
            this.notificationManager.showError(`Failed to load projects: ${error.message}`);
            this.projects = [];
            this._onDidChangeTreeData.fire();
            return [];
        }
    }
}

export class ProjectItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly project: ProjectScanResult,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);

        this.tooltip = `${this.project.name} - ${this.project.confidence}% confidence`;
        this.description = `${this.project.confidence}% (${this.project.secrets_count} secrets)`;
        this.contextValue = 'project';

        // Set icon based on confidence level
        if (this.project.confidence >= 80) {
            this.iconPath = new vscode.ThemeIcon('folder', new vscode.ThemeColor('charts.green'));
        } else if (this.project.confidence >= 60) {
            this.iconPath = new vscode.ThemeIcon('folder', new vscode.ThemeColor('charts.yellow'));
        } else {
            this.iconPath = new vscode.ThemeIcon('folder', new vscode.ThemeColor('charts.red'));
        }
    }
} 