const vscode = require('vscode');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:5001/api';
let secureStorage = false;
let masterPassword = '';

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Secrets Agent extension activated');

    // Check if the API server is running
    checkAPIHealth().then(result => {
        vscode.window.setStatusBarMessage(`Secrets Agent: ${result.status}`, 3000);
        secureStorage = result.secure_storage;
        if (secureStorage) {
            vscode.window.setStatusBarMessage('Secrets Agent: Secure Storage Enabled', 3000);
        }
    }).catch(err => {
        vscode.window.showErrorMessage('Secrets Agent API server not running. Start Docker containers to use this extension.');
    });

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(key) Secrets Agent';
    statusBarItem.tooltip = 'Click to show Secrets Agent commands';
    statusBarItem.command = 'vanta.showCommands';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('vanta.showCommands', showCommandsQuickPick),
        vscode.commands.registerCommand('vanta.scanProject', scanCurrentProject),
        vscode.commands.registerCommand('vanta.linkSecrets', linkCurrentProject),
        vscode.commands.registerCommand('vanta.setMasterPassword', setMasterPassword),
        vscode.commands.registerCommand('vanta.listSecrets', listSecrets),
        vscode.commands.registerCommand('vanta.addSecret', addSecret),
        vscode.commands.registerCommand('vanta.refreshSecrets', refreshSecrets)
    );

    // Register views
    const secretsTreeDataProvider = new SecretsTreeDataProvider();
    vscode.window.registerTreeDataProvider('secretsAgentExplorer', secretsTreeDataProvider);

    // Register refresh command for the tree view
    context.subscriptions.push(
        vscode.commands.registerCommand('secretsAgentExplorer.refreshEntry', () => 
            secretsTreeDataProvider.refresh()
        )
    );
}

// Show a quick pick with all available commands
async function showCommandsQuickPick() {
    const commands = [
        { label: 'Scan Project', description: 'Scan current project for env vars and tools', command: 'vanta.scanProject' },
        { label: 'Link Secrets', description: 'Link detected env vars to secrets', command: 'vanta.linkSecrets' },
        { label: 'Set Master Password', description: 'Set master password for secure storage', command: 'vanta.setMasterPassword' },
        { label: 'List Secrets', description: 'Show available secrets', command: 'vanta.listSecrets' },
        { label: 'Add Secret', description: 'Add a new secret to storage', command: 'vanta.addSecret' },
        { label: 'Refresh Secrets', description: 'Refresh secrets view', command: 'vanta.refreshSecrets' }
    ];

    const selectedCommand = await vscode.window.showQuickPick(commands, {
        placeHolder: 'Select a Secrets Agent command...'
    });

    if (selectedCommand) {
        vscode.commands.executeCommand(selectedCommand.command);
    }
}

// Check if the API server is healthy
async function checkAPIHealth() {
    try {
        const response = await axios.get(`${API_URL}/health`);
        return response.data;
    } catch (error) {
        console.error('API Health check error:', error);
        throw error;
    }
}

// Scan the current project for env vars and tools
async function scanCurrentProject() {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a folder/project first.');
            return;
        }

        const projectPath = workspaceFolders[0].uri.fsPath;
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Scanning project...',
            cancellable: false
        }, async (progress) => {
            try {
                const response = await axios.post(`${API_URL}/scan`, {
                    project_path: projectPath
                });
                
                const result = response.data;
                const envKeys = result.env_keys || [];
                const tools = result.tools || [];
                
                if (envKeys.length === 0 && tools.length === 0) {
                    vscode.window.showInformationMessage('No environment variables or tools detected in the project.');
                } else {
                    let message = '';
                    if (envKeys.length > 0) {
                        message += `Environment variables detected: ${envKeys.join(', ')}. `;
                    }
                    if (tools.length > 0) {
                        message += `Tools detected: ${tools.join(', ')}.`;
                    }
                    
                    const linkAction = 'Link Secrets';
                    const result = await vscode.window.showInformationMessage(
                        message, 
                        { modal: false },
                        linkAction
                    );
                    
                    if (result === linkAction) {
                        vscode.commands.executeCommand('vanta.linkSecrets');
                    }
                }
            } catch (error) {
                console.error('Scan error:', error);
                vscode.window.showErrorMessage(`Error scanning project: ${error.message}`);
            }
        });
    } catch (error) {
        console.error('Scan error:', error);
        vscode.window.showErrorMessage(`Error scanning project: ${error.message}`);
    }
}

// Prompt for master password if secure storage is enabled
async function promptForMasterPassword() {
    if (!secureStorage) {
        return '';
    }
    
    if (!masterPassword) {
        masterPassword = await vscode.window.showInputBox({
            prompt: 'Enter master password for secure storage',
            password: true
        });
    }
    
    return masterPassword;
}

// Set the master password for secure storage
async function setMasterPassword() {
    const password = await vscode.window.showInputBox({
        prompt: 'Enter master password for secure storage',
        password: true
    });
    
    if (password) {
        masterPassword = password;
        vscode.window.showInformationMessage('Master password set for this session.');
    }
}

// Link the current project to secrets
async function linkCurrentProject() {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a folder/project first.');
            return;
        }

        const projectPath = workspaceFolders[0].uri.fsPath;
        const password = await promptForMasterPassword();
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Linking project...',
            cancellable: false
        }, async (progress) => {
            try {
                const response = await axios.post(`${API_URL}/link`, {
                    project_path: projectPath,
                    secure: secureStorage,
                    password: password
                });
                
                if (response.data.success) {
                    vscode.window.showInformationMessage('Project successfully linked to secrets.');
                } else {
                    vscode.window.showWarningMessage('Project linking completed with warnings. Check the output.');
                }
            } catch (error) {
                console.error('Link error:', error);
                if (error.response && error.response.data && error.response.data.error) {
                    vscode.window.showErrorMessage(`Error linking project: ${error.response.data.error}`);
                } else {
                    vscode.window.showErrorMessage(`Error linking project: ${error.message}`);
                }
            }
        });
    } catch (error) {
        console.error('Link error:', error);
        vscode.window.showErrorMessage(`Error linking project: ${error.message}`);
    }
}

// List available secrets
async function listSecrets() {
    try {
        const password = await promptForMasterPassword();
        
        let params = {};
        if (secureStorage) {
            params.secure = 'true';
            params.password = password;
        }
        
        const response = await axios.get(`${API_URL}/list-secrets`, { params });
        const keys = response.data.keys || [];
        
        if (keys.length === 0) {
            vscode.window.showInformationMessage('No secrets found in storage.');
            return;
        }
        
        const selectedSecret = await vscode.window.showQuickPick(keys, {
            placeHolder: 'Select a secret to view/edit...'
        });
        
        if (selectedSecret) {
            // In a real implementation, you would add code to view/edit the secret
            vscode.window.showInformationMessage(`Selected secret: ${selectedSecret}`);
        }
    } catch (error) {
        console.error('List secrets error:', error);
        if (error.response && error.response.data && error.response.data.error) {
            vscode.window.showErrorMessage(`Error listing secrets: ${error.response.data.error}`);
        } else {
            vscode.window.showErrorMessage(`Error listing secrets: ${error.message}`);
        }
    }
}

// Add a new secret
async function addSecret() {
    try {
        const key = await vscode.window.showInputBox({
            prompt: 'Enter secret key (e.g., API_KEY)',
            validateInput: value => {
                return value ? null : 'Secret key is required';
            }
        });
        
        if (!key) return;
        
        const value = await vscode.window.showInputBox({
            prompt: `Enter value for ${key}`,
            password: true,
            validateInput: value => {
                return value ? null : 'Secret value is required';
            }
        });
        
        if (!value) return;
        
        const password = await promptForMasterPassword();
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Adding secret...',
            cancellable: false
        }, async (progress) => {
            try {
                const response = await axios.post(`${API_URL}/add-secret`, {
                    key,
                    value,
                    secure: secureStorage,
                    password
                });
                
                if (response.data.success) {
                    vscode.window.showInformationMessage(`Secret ${key} added successfully.`);
                    // Refresh the tree view
                    vscode.commands.executeCommand('secretsAgentExplorer.refreshEntry');
                } else {
                    vscode.window.showWarningMessage(`Failed to add secret ${key}.`);
                }
            } catch (error) {
                console.error('Add secret error:', error);
                if (error.response && error.response.data && error.response.data.error) {
                    vscode.window.showErrorMessage(`Error adding secret: ${error.response.data.error}`);
                } else {
                    vscode.window.showErrorMessage(`Error adding secret: ${error.message}`);
                }
            }
        });
    } catch (error) {
        console.error('Add secret error:', error);
        vscode.window.showErrorMessage(`Error adding secret: ${error.message}`);
    }
}

// Refresh the secrets view
function refreshSecrets() {
    vscode.commands.executeCommand('secretsAgentExplorer.refreshEntry');
}

// Tree data provider for secrets view
class SecretsTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element) {
        if (element) {
            return [];
        }

        try {
            const password = await promptForMasterPassword();
            
            let params = {};
            if (secureStorage) {
                params.secure = 'true';
                params.password = password;
            }
            
            const response = await axios.get(`${API_URL}/list-secrets`, { params });
            const keys = response.data.keys || [];
            
            return keys.map(key => {
                const treeItem = new vscode.TreeItem(key);
                treeItem.iconPath = new vscode.ThemeIcon('key');
                treeItem.tooltip = `Secret: ${key}`;
                return treeItem;
            });
        } catch (error) {
            console.error('Error getting secrets for tree view:', error);
            return [new vscode.TreeItem('Error loading secrets')];
        }
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};