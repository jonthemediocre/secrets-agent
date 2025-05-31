/**
 * VANTA Secrets Agent VS Code Extension
 * Cross-Platform Feature Parity Implementation
 */

import * as vscode from 'vscode';
import { VantaAPIClient } from './clients/apiClient';
import { ProjectsProvider } from './providers/projectsProvider';
import { SecretsProvider } from './providers/secretsProvider';
import { StatusProvider } from './providers/statusProvider';
import { WelcomeProvider } from './providers/welcomeProvider';
import { CommandManager } from './commands/commandManager';
import { ConfigurationManager } from './utils/configurationManager';
import { NotificationManager } from './utils/notificationManager';
import { StatusBarManager } from './utils/statusBarManager';

export function activate(context: vscode.ExtensionContext) {
    console.log('🔐 VANTA Secrets Agent extension is now active!');

    // Initialize core services
    const configManager = new ConfigurationManager();
    const apiClient = new VantaAPIClient(configManager);
    const notificationManager = new NotificationManager();
    const statusBarManager = new StatusBarManager();

    // Initialize providers
    const projectsProvider = new ProjectsProvider(apiClient, notificationManager);
    const secretsProvider = new SecretsProvider(apiClient, notificationManager);
    const statusProvider = new StatusProvider(apiClient);
    const welcomeProvider = new WelcomeProvider(context.extensionUri);

    // Register tree data providers
    vscode.window.registerTreeDataProvider('vantaProjectsView', projectsProvider);
    vscode.window.registerTreeDataProvider('vantaSecretsView', secretsProvider);
    vscode.window.registerTreeDataProvider('vantaStatusView', statusProvider);
    vscode.window.registerWebviewViewProvider('vantaWelcomeView', welcomeProvider);

    // Initialize command manager
    const commandManager = new CommandManager(
        apiClient,
        projectsProvider,
        secretsProvider,
        statusProvider,
        notificationManager,
        statusBarManager
    );

    // Register all commands
    const commands = [
        // Core functionality commands
        vscode.commands.registerCommand('vanta.scanProject', () => commandManager.scanProject()),
        vscode.commands.registerCommand('vanta.detectSecrets', (project?: any) => commandManager.detectSecrets(project)),
        vscode.commands.registerCommand('vanta.exportVault', (project?: any) => commandManager.exportVault(project)),
        vscode.commands.registerCommand('vanta.rotateSecrets', (project?: any) => commandManager.rotateSecrets(project)),
        vscode.commands.registerCommand('vanta.showStatus', () => commandManager.showStatus()),
        vscode.commands.registerCommand('vanta.refreshAll', () => commandManager.refreshAll()),

        // Secret management commands
        vscode.commands.registerCommand('vanta.addSecret', () => commandManager.addSecret()),
        vscode.commands.registerCommand('vanta.editSecret', (secret: any) => commandManager.editSecret(secret)),
        vscode.commands.registerCommand('vanta.deleteSecret', (secret: any) => commandManager.deleteSecret(secret)),
        vscode.commands.registerCommand('vanta.copySecret', (secret: any) => commandManager.copySecret(secret)),

        // Project management commands
        vscode.commands.registerCommand('vanta.openProject', (project: any) => commandManager.openProject(project)),

        // Utility commands
        vscode.commands.registerCommand('vanta.configureSettings', () => commandManager.configureSettings()),
        vscode.commands.registerCommand('vanta.showHelp', () => commandManager.showHelp())
    ];

    // Add all commands to subscriptions
    context.subscriptions.push(...commands);

    // Set up context variables
    vscode.commands.executeCommand('setContext', 'vanta.isActive', true);

    // Initialize status bar
    statusBarManager.initialize();
    context.subscriptions.push(statusBarManager);

    // Set up auto-refresh if enabled
    if (configManager.getAutoRefresh()) {
        const refreshInterval = configManager.getRefreshInterval() * 1000;
        const intervalId = setInterval(() => {
            commandManager.refreshAll();
        }, refreshInterval);

        context.subscriptions.push({
            dispose: () => clearInterval(intervalId)
        });
    }

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('vanta')) {
                configManager.reload();
                apiClient.updateConfiguration(configManager);
                
                if (configManager.getEnableNotifications()) {
                    notificationManager.showInfo('VANTA configuration updated');
                }
            }
        })
    );

    // Listen for workspace changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            projectsProvider.refresh();
        })
    );

    // Initial data load
    commandManager.refreshAll();

    // Show welcome message for first-time users
    const hasShownWelcome = context.globalState.get('vanta.hasShownWelcome', false);
    if (!hasShownWelcome) {
        commandManager.showHelp();
        context.globalState.update('vanta.hasShownWelcome', true);
    }

    console.log('✅ VANTA Secrets Agent extension activated successfully');
}

export function deactivate() {
    console.log('🔐 VANTA Secrets Agent extension is now deactivated');
} 