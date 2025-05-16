const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * Manages the welcome/onboarding view for Secrets Agent
 */
class WelcomeViewProvider {
    constructor(context) {
        this.context = context;
        this._view = null;
    }

    /**
     * Resolves the webview view
     * @param {vscode.WebviewView} webviewView The webview view to resolve
     */
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'scanProject':
                    vscode.commands.executeCommand('vanta.scanProject');
                    break;
                case 'addSecret':
                    vscode.commands.executeCommand('vanta.addSecret');
                    break;
                case 'showHelp':
                    vscode.commands.executeCommand('vanta.showHelp');
                    break;
                case 'hideWelcome':
                    this._disableWelcomeView();
                    break;
            }
        });
    }

    /**
     * Disables the welcome view in settings
     */
    _disableWelcomeView() {
        const config = vscode.workspace.getConfiguration('secretsAgent');
        config.update('showWelcomeView', false, vscode.ConfigurationTarget.Global);
    }

    /**
     * Returns the HTML content for the webview
     * @param {vscode.Webview} webview The webview to provide content for
     * @returns {string} HTML content
     */
    _getHtmlForWebview(webview) {
        // Use a light theme or dark theme class based on current VS Code theme
        const isLightTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light;
        const themeClass = isLightTheme ? 'light-theme' : 'dark-theme';
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secrets Agent Welcome</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            padding: 0 20px;
            color: var(--vscode-foreground);
            font-size: 13px;
            line-height: 1.6;
        }
        .light-theme {
            --card-bg: #f5f5f5;
            --card-border: #e0e0e0;
            --button-bg: #007acc;
            --button-hover: #005a9e;
            --button-text: white;
            --link: #007acc;
        }
        .dark-theme {
            --card-bg: #2d2d2d;
            --card-border: #3d3d3d;
            --button-bg: #0e639c;
            --button-hover: #1177bb;
            --button-text: white;
            --link: #3794ff;
        }
        h1 {
            font-size: 1.5em;
            margin-bottom: 1em;
            color: var(--vscode-editor-foreground);
        }
        .welcome-card {
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .welcome-card h2 {
            margin-top: 0;
            font-size: 1.2em;
            color: var(--vscode-editor-foreground);
        }
        .action-button {
            background-color: var(--button-bg);
            color: var(--button-text);
            border: none;
            padding: 6px 12px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
            margin-right: 8px;
            margin-top: 8px;
        }
        .action-button:hover {
            background-color: var(--button-hover);
        }
        .steps {
            padding-left: 20px;
        }
        .steps li {
            margin-bottom: 8px;
        }
        .link {
            color: var(--link);
            cursor: pointer;
        }
        .action-row {
            margin-top: 15px;
        }
        .footer {
            margin-top: 30px;
            font-size: 0.9em;
            display: flex;
            justify-content: space-between;
        }
    </style>
</head>
<body class="${themeClass}">
    <h1>Welcome to Secrets Agent</h1>
    
    <div class="welcome-card">
        <h2>Getting Started</h2>
        <ol class="steps">
            <li>Scan your project to detect environment variables</li>
            <li>Add and manage your secrets</li>
            <li>Link your project with secure secrets</li>
        </ol>
        <div class="action-row">
            <button class="action-button" id="scanProjectBtn">Scan Project</button>
            <button class="action-button" id="showHelpBtn">View Documentation</button>
        </div>
    </div>
    
    <div class="welcome-card">
        <h2>Key Features</h2>
        <ul>
            <li>📦 <strong>Secure Storage</strong>: Encrypt your secrets with AES-256</li>
            <li>🔄 <strong>Auto-linking</strong>: Connect environment variables to secrets</li>
            <li>📤 <strong>Import/Export</strong>: Move secrets between environments</li>
            <li>🔧 <strong>Tool Detection</strong>: Auto-detect AI tools in your project</li>
        </ul>
        <div class="action-row">
            <button class="action-button" id="addSecretBtn">Add Secret</button>
        </div>
    </div>
    
    <div class="footer">
        <span>v0.1.0</span>
        <span class="link" id="hideWelcomeBtn">Don't show this again</span>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        document.getElementById('scanProjectBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'scanProject' });
        });
        
        document.getElementById('addSecretBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'addSecret' });
        });
        
        document.getElementById('showHelpBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'showHelp' });
        });
        
        document.getElementById('hideWelcomeBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'hideWelcome' });
        });
    </script>
</body>
</html>`;
    }
}

module.exports = WelcomeViewProvider; 