/**
 * Status Bar Manager for VANTA VS Code Extension
 * Handles status bar updates and indicators
 */

import * as vscode from 'vscode';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private isInitialized = false;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
    }

    /**
     * Initialize the status bar item
     */
    initialize(): void {
        if (this.isInitialized) {
            return;
        }

        this.statusBarItem.command = 'vanta.showStatus';
        this.statusBarItem.tooltip = 'VANTA Secrets Agent - Click for status';
        this.setStatus('$(key) VANTA', 'VANTA Secrets Agent ready');
        this.statusBarItem.show();
        this.isInitialized = true;
    }

    /**
     * Set status bar text and tooltip
     */
    setStatus(text: string, tooltip?: string): void {
        this.statusBarItem.text = text;
        if (tooltip) {
            this.statusBarItem.tooltip = tooltip;
        }
    }

    /**
     * Set status with color
     */
    setStatusWithColor(text: string, color: string, tooltip?: string): void {
        this.statusBarItem.text = text;
        this.statusBarItem.color = color;
        if (tooltip) {
            this.statusBarItem.tooltip = tooltip;
        }
    }

    /**
     * Show loading status
     */
    showLoading(message: string): void {
        this.setStatus(`$(sync~spin) ${message}`, `VANTA: ${message}`);
    }

    /**
     * Show success status
     */
    showSuccess(message: string): void {
        this.setStatusWithColor(`$(check) ${message}`, '#00ff00', `VANTA: ${message}`);
        
        // Reset color after 3 seconds
        setTimeout(() => {
            this.statusBarItem.color = undefined;
        }, 3000);
    }

    /**
     * Show error status
     */
    showError(message: string): void {
        this.setStatusWithColor(`$(error) ${message}`, '#ff0000', `VANTA: ${message}`);
        
        // Reset color after 5 seconds
        setTimeout(() => {
            this.statusBarItem.color = undefined;
        }, 5000);
    }

    /**
     * Show warning status
     */
    showWarning(message: string): void {
        this.setStatusWithColor(`$(warning) ${message}`, '#ffaa00', `VANTA: ${message}`);
        
        // Reset color after 4 seconds
        setTimeout(() => {
            this.statusBarItem.color = undefined;
        }, 4000);
    }

    /**
     * Reset to default status
     */
    resetToDefault(): void {
        this.setStatus('$(key) VANTA', 'VANTA Secrets Agent ready');
        this.statusBarItem.color = undefined;
    }

    /**
     * Hide status bar item
     */
    hide(): void {
        this.statusBarItem.hide();
    }

    /**
     * Show status bar item
     */
    show(): void {
        this.statusBarItem.show();
    }

    /**
     * Update status based on system health
     */
    updateHealthStatus(isHealthy: boolean, details?: string): void {
        if (isHealthy) {
            this.setStatus('$(pulse) VANTA', details || 'System healthy');
        } else {
            this.showWarning('Unhealthy');
        }
    }

    /**
     * Set command for status bar item
     */
    setCommand(command: string): void {
        this.statusBarItem.command = command;
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.statusBarItem.dispose();
    }
} 