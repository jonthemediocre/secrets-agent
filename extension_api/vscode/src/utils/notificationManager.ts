/**
 * Notification Manager for VANTA VS Code Extension
 * Handles all user notifications and messages
 */

import * as vscode from 'vscode';

export class NotificationManager {
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('VANTA Secrets Agent');
    }

    /**
     * Show information message
     */
    showInfo(message: string, ...items: string[]): Thenable<string | undefined> {
        this.log('INFO', message);
        return vscode.window.showInformationMessage(message, ...items);
    }

    /**
     * Show warning message
     */
    showWarning(message: string, ...items: string[]): Thenable<string | undefined> {
        this.log('WARN', message);
        return vscode.window.showWarningMessage(message, ...items);
    }

    /**
     * Show error message
     */
    showError(message: string, ...items: string[]): Thenable<string | undefined> {
        this.log('ERROR', message);
        return vscode.window.showErrorMessage(message, ...items);
    }

    /**
     * Show progress notification
     */
    async showProgress<T>(
        title: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
    ): Promise<T> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: false
            },
            task
        );
    }

    /**
     * Show status bar message temporarily
     */
    showStatusMessage(message: string, hideAfterTimeout?: number): vscode.Disposable {
        this.log('STATUS', message);
        if (hideAfterTimeout !== undefined) {
            return vscode.window.setStatusBarMessage(message, hideAfterTimeout);
        } else {
            return vscode.window.setStatusBarMessage(message);
        }
    }

    /**
     * Log message to output channel
     */
    private log(level: string, message: string): void {
        const timestamp = new Date().toISOString();
        this.outputChannel.appendLine(`[${timestamp}] ${level}: ${message}`);
    }

    /**
     * Show output channel
     */
    showOutputChannel(): void {
        this.outputChannel.show();
    }

    /**
     * Clear output channel
     */
    clearOutput(): void {
        this.outputChannel.clear();
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
} 