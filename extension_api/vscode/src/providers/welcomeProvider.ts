/**
 * Welcome Provider for VANTA VS Code Extension
 * Manages the welcome webview shown when the extension is active
 * but no specific project context is available.
 */

import * as vscode from 'vscode';
import * as path from 'path';

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export class WelcomeProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'vantaWelcomeView';
    private _view?: vscode.WebviewView;
    private readonly _extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'assets')]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'scanWorkspace':
                    vscode.commands.executeCommand('vanta.scanProject');
                    break;
                case 'openDocumentation':
                    vscode.commands.executeCommand('vanta.showHelp');
                    break;
                case 'configureSettings':
                    vscode.commands.executeCommand('vanta.configureSettings');
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const logoPath = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'icon.png'));
        const nonce = getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
                <title>VANTA Secrets Agent</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
                        padding: 20px;
                        color: var(--vscode-editor-foreground);
                        background-color: var(--vscode-editor-background);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                    }
                    img.logo {
                        width: 80px;
                        height: 80px;
                        margin-bottom: 20px;
                    }
                    h1 {
                        font-size: 1.5em;
                        margin-bottom: 10px;
                    }
                    p {
                        margin-bottom: 20px;
                        max-width: 400px;
                    }
                    .actions button {
                        display: block;
                        width: 100%;
                        padding: 10px;
                        margin-bottom: 10px;
                        border: 1px solid var(--vscode-button-border, transparent);
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border-radius: 4px;
                        cursor: pointer;
                        text-align: left;
                    }
                    .actions button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .actions button .icon {
                        margin-right: 8px;
                    }
                </style>
            </head>
            <body>
                <img src="${logoPath}" alt="VANTA Logo" class="logo"/>
                <h1>Welcome to VANTA Secrets Agent</h1>
                <p>Secure and manage your secrets with AI-powered insights, directly within VS Code.</p>
                
                <div class="actions">
                    <button id="scanWorkspace">
                        <span class="icon">🔍</span> Scan Workspace for Projects
                    </button>
                    <button id="openDocs">
                        <span class="icon">❓</span> View Documentation & Help
                    </button>
                    <button id="configureSettings">
                        <span class="icon">⚙️</span> Configure Settings
                    </button>
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    document.getElementById('scanWorkspace').addEventListener('click', () => {
                        vscode.postMessage({ type: 'scanWorkspace' });
                    });
                    document.getElementById('openDocs').addEventListener('click', () => {
                        vscode.postMessage({ type: 'openDocumentation' });
                    });
                    document.getElementById('configureSettings').addEventListener('click', () => {
                        vscode.postMessage({ type: 'configureSettings' });
                    });
                </script>
            </body>
            </html>
        `;
    }
} 