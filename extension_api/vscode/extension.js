const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const api = require('./api');
const visualization = require('./visualization');
const WelcomeViewProvider = require('./welcome');

// Configuration
let masterPassword = '';
let refreshInterval = null;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Secrets Agent extension activated');

    // Load configuration
    const config = vscode.workspace.getConfiguration('secretsAgent');
    const autoRefreshEnabled = config.get('autoRefresh');
    const autoRefreshInterval = config.get('refreshIntervalSeconds') || 30;

    // Set up auto-refresh if enabled
    if (autoRefreshEnabled) {
        setupAutoRefresh(autoRefreshInterval);
    }

    // Register Welcome View Provider
    const welcomeViewProvider = new WelcomeViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'secretsAgentWelcome',
            welcomeViewProvider
        )
    );

    // Check if the API server is running
    api.checkHealth().then(result => {
        vscode.window.setStatusBarMessage(`Secrets Agent: ${result.status}`, 3000);
        if (api.isSecureStorageEnabled()) {
            vscode.window.setStatusBarMessage('Secrets Agent: Secure Storage Enabled', 3000);
        }
    }).catch(err => {
        handleError('API Connection Error', 'Secrets Agent API server not running. Start Docker containers to use this extension.', err);
    });

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(key) Secrets Agent';
    statusBarItem.tooltip = 'Manage secrets and environment variables for your project';
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
        vscode.commands.registerCommand('vanta.refreshSecrets', refreshSecrets),
        vscode.commands.registerCommand('vanta.editSecret', editSecret),
        vscode.commands.registerCommand('vanta.deleteSecret', deleteSecret),
        vscode.commands.registerCommand('vanta.copySecretValue', copySecretValue),
        vscode.commands.registerCommand('vanta.toggleAutoRefresh', toggleAutoRefresh),
        vscode.commands.registerCommand('vanta.showHelp', showHelp),
        vscode.commands.registerCommand('vanta.importSecrets', importSecrets),
        vscode.commands.registerCommand('vanta.exportSecrets', exportSecrets),
        vscode.commands.registerCommand('vanta.showWelcome', showWelcome),
        vscode.commands.registerCommand('vanta.changeVisualization', changeVisualization),
        vscode.commands.registerCommand('vanta.rotateMasterPassword', rotateMasterPassword)
    );

    // Register tree data provider
    const secretsTreeDataProvider = new SecretsTreeDataProvider();
    vscode.window.registerTreeDataProvider('secretsAgentExplorer', secretsTreeDataProvider);

    // Register refresh command for the tree view
    context.subscriptions.push(
        vscode.commands.registerCommand('secretsAgentExplorer.refreshEntry', () => 
            secretsTreeDataProvider.refresh()
        )
    );

    // Watch for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('secretsAgent')) {
                const newConfig = vscode.workspace.getConfiguration('secretsAgent');
                
                // Update auto-refresh settings
                if (newConfig.get('autoRefresh')) {
                    setupAutoRefresh(newConfig.get('refreshIntervalSeconds') || 30);
                } else {
                    clearAutoRefresh();
                }
                
                // Refresh tree view if visualization mode changed
                if (e.affectsConfiguration('secretsAgent.visualization')) {
                    vscode.commands.executeCommand('secretsAgentExplorer.refreshEntry');
                }
            }
        })
    );
    
    // Auto-scan project if enabled
    if (config.get('autoScan') && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        // Wait a moment for the UI to load
        setTimeout(() => {
            scanCurrentProject();
        }, 2000);
    }
}

// Helper function to handle errors consistently
function handleError(title, message, error = null) {
    console.error(`${title}: ${message}`, error);
    
    // Provide user-friendly error message with potential solution
    let fullMessage = message;
    if (error) {
        if (error.response && error.response.data && error.response.data.error) {
            fullMessage += ` Error: ${error.response.data.error}`;
        } else if (error.message) {
            fullMessage += ` Error: ${error.message}`;
        }
    }
    
    // Add troubleshooting link for common errors
    if (error && error.code === 'ECONNREFUSED') {
        fullMessage += ' Make sure Docker containers are running or the API server is started.';
    }
    
    vscode.window.showErrorMessage(fullMessage);
}

// Setup auto-refresh for the tree view
function setupAutoRefresh(intervalSeconds) {
    // Clear any existing interval
    clearAutoRefresh();
    
    // Set up new interval
    refreshInterval = setInterval(() => {
        vscode.commands.executeCommand('secretsAgentExplorer.refreshEntry');
    }, intervalSeconds * 1000);
}

// Clear auto-refresh interval
function clearAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Toggle auto-refresh setting
async function toggleAutoRefresh() {
    const config = vscode.workspace.getConfiguration('secretsAgent');
    const currentSetting = config.get('autoRefresh');
    
    try {
        await config.update('autoRefresh', !currentSetting, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(
            `Auto-refresh ${!currentSetting ? 'enabled' : 'disabled'}`
        );
    } catch (error) {
        handleError('Config Update Error', 'Failed to toggle auto-refresh setting.', error);
    }
}

// Show the welcome view
async function showWelcome() {
    try {
        // Enable the welcome view
        const config = vscode.workspace.getConfiguration('secretsAgent');
        await config.update('showWelcomeView', true, vscode.ConfigurationTarget.Global);
        
        // Focus the view
        vscode.commands.executeCommand('workbench.view.extension.secrets-agent-sidebar');
        vscode.commands.executeCommand('secretsAgentWelcome.focus');
    } catch (error) {
        handleError('Config Update Error', 'Failed to update welcome view setting.', error);
    }
}

// Change the visualization mode for secrets
async function changeVisualization() {
    const modes = [
        { label: 'Flat List', description: 'Simple flat list of secrets', id: 'flat' },
        { label: 'Categorized', description: 'Group secrets by category', id: 'categorized' },
        { label: 'Tagged', description: 'Organize secrets by detected tags', id: 'tagged' }
    ];
    
    const currentMode = visualization.getCurrentMode();
    
    const selectedMode = await vscode.window.showQuickPick(modes, {
        placeHolder: 'Select visualization mode',
        activeItems: [modes.find(m => m.id === currentMode)]
    });
    
    if (selectedMode && selectedMode.id !== currentMode) {
        await visualization.changeMode(selectedMode.id);
        vscode.window.showInformationMessage(`Visualization mode changed to ${selectedMode.label}`);
        vscode.commands.executeCommand('secretsAgentExplorer.refreshEntry');
    }
}

// Import secrets from a JSON file
async function importSecrets() {
    try {
        // Prompt for password if secure storage is enabled
        const password = await promptForMasterPassword();
        
        // Ask for file to import
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: {
                'JSON Files': ['json']
            },
            title: 'Select Secrets JSON File to Import'
        });
        
        if (!fileUri || fileUri.length === 0) {
            return;
        }
        
        // Read the file
        const importFilePath = fileUri[0].fsPath;
        let importData;
        
        try {
            const fileContent = fs.readFileSync(importFilePath, 'utf8');
            importData = JSON.parse(fileContent);
        } catch (err) {
            throw new Error(`Failed to read or parse import file: ${err.message}`);
        }
        
        // Validate the import data
        if (!importData.secrets || typeof importData.secrets !== 'object') {
            throw new Error('Invalid import file format. Expected a "secrets" object.');
        }
        
        // Ask if user wants to overwrite existing secrets
        const shouldOverwrite = await vscode.window.showQuickPick(
            [
                { label: 'Skip', description: 'Skip secrets that already exist', overwrite: false },
                { label: 'Overwrite', description: 'Replace existing secrets with imported values', overwrite: true }
            ],
            { placeHolder: 'How should we handle existing secrets?' }
        );
        
        if (!shouldOverwrite) {
            return;
        }
        
        // Show progress while importing
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Importing secrets...',
            cancellable: false
        }, async (progress) => {
            const result = await api.importSecrets(importData, password, shouldOverwrite.overwrite);
            
            let message = `Import complete: ${result.success} secrets imported`;
            if (result.skipped > 0) {
                message += `, ${result.skipped} skipped`;
            }
            if (result.errors.length > 0) {
                message += `, ${result.errors.length} errors`;
            }
            
            vscode.window.showInformationMessage(message);
            
            // Refresh the tree view
            vscode.commands.executeCommand('secretsAgentExplorer.refreshEntry');
        });
    } catch (error) {
        handleError('Import Error', 'Failed to import secrets.', error);
    }
}

// Export secrets to a JSON file
async function exportSecrets() {
    try {
        // Prompt for password if secure storage is enabled
        const password = await promptForMasterPassword();
        
        // Get export data
        const exportData = await api.exportSecrets(password);
        
        // Ask for file to save
        const fileUri = await vscode.window.showSaveDialog({
            filters: {
                'JSON Files': ['json']
            },
            defaultUri: vscode.Uri.file('secrets_export.json'),
            title: 'Save Secrets Export'
        });
        
        if (!fileUri) {
            return;
        }
        
        // Save the file
        fs.writeFileSync(fileUri.fsPath, JSON.stringify(exportData, null, 2), 'utf8');
        
        vscode.window.showInformationMessage(`Exported ${Object.keys(exportData.secrets).length} secrets to ${path.basename(fileUri.fsPath)}`);
    } catch (error) {
        handleError('Export Error', 'Failed to export secrets.', error);
    }
}

// Show a quick pick with all available commands
async function showCommandsQuickPick() {
    const commands = [
        { label: '$(search) Scan Project', description: 'Scan current project for env vars and tools', command: 'vanta.scanProject' },
        { label: '$(link) Link Secrets', description: 'Link detected env vars to secrets', command: 'vanta.linkSecrets' },
        { label: '$(settings) Toggle Auto-Refresh', description: 'Enable/disable automatic secret refreshing', command: 'vanta.toggleAutoRefresh' },
        { label: '$(key) Set Master Password', description: 'Set or change the master password for secure storage', command: 'vanta.setMasterPassword' },
        { label: '$(sync~spin) Rotate Master Password', description: 'Rotate the master password for secure storage', command: 'vanta.rotateMasterPassword' },
        { label: '$(list-unordered) List Secrets', description: 'Show available secrets', command: 'vanta.listSecrets' },
        { label: '$(add) Add Secret', description: 'Add a new secret to storage', command: 'vanta.addSecret' },
        { label: '$(refresh) Refresh Secrets', description: 'Refresh secrets view', command: 'vanta.refreshSecrets' },
        { label: '$(cloud-download) Import Secrets', description: 'Import secrets from JSON file', command: 'vanta.importSecrets' },
        { label: '$(cloud-upload) Export Secrets', description: 'Export secrets to JSON file', command: 'vanta.exportSecrets' },
        { label: '$(eye) Change Visualization', description: 'Change how secrets are displayed', command: 'vanta.changeVisualization' },
        { label: '$(book) Show Welcome', description: 'Show welcome page', command: 'vanta.showWelcome' },
        { label: '$(question) Help', description: 'Show help and documentation', command: 'vanta.showHelp' }
    ];

    const selectedCommand = await vscode.window.showQuickPick(commands, {
        placeHolder: 'Select a Secrets Agent command...'
    });

    if (selectedCommand) {
        vscode.commands.executeCommand(selectedCommand.command);
    }
}

// Show help documentation
function showHelp() {
    const helpContent = `# Secrets Agent Help

## Getting Started
1. Scan your project to detect environment variables and tools
2. Link your project to connect env vars with secrets
3. Add or edit secrets as needed

## Common Tasks
- **Add Secret**: Create a new secret key-value pair
- **Edit Secret**: Modify an existing secret
- **Link Secrets**: Connect project env vars to stored secrets
- **Secure Storage**: Enable with master password for encryption
- **Import/Export**: Move secrets between environments
- **Visualization**: Change how secrets are displayed in the Explorer

## Troubleshooting
- If API connection fails, ensure Docker containers are running
- Reset master password if you encounter authentication issues
- Check logs for detailed error information
`;

    try {
        // Create and show a markdown preview of the help content
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-agent-help-'));
        const helpFilePath = path.join(tempDir, 'help.md');
        fs.writeFileSync(helpFilePath, helpContent);
        
        vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.file(helpFilePath));
    } catch (error) {
        handleError('Show Help Error', 'Could not display help content due to a file system error.', error);
    }
}

// Prompt for master password if secure storage is enabled
async function promptForMasterPassword() {
    if (!api.isSecureStorageEnabled()) {
        return '';
    }
    
    if (!masterPassword) {
        masterPassword = await vscode.window.showInputBox({
            prompt: 'Enter master password for secure storage',
            password: true,
            placeHolder: 'Master password required for secure storage access',
            validateInput: value => {
                return value ? null : 'Master password is required';
            }
        });
    }
    
    return masterPassword;
}

// Set the master password for secure storage
async function setMasterPassword() {
    const password = await vscode.window.showInputBox({
        prompt: 'Enter master password for secure storage',
        password: true,
        placeHolder: 'Create a strong password for encrypting your secrets',
        validateInput: value => {
            if (!value) return 'Password is required';
            if (value.length < 8) return 'Password should be at least 8 characters';
            return null;
        }
    });
    
    if (password) {
        masterPassword = password;
        vscode.window.showInformationMessage('Master password set for this session.');
    }
}

// Rotate the master password
async function rotateMasterPassword() {
    if (!api.isSecureStorageEnabled()) {
        vscode.window.showWarningMessage('Master password rotation is only applicable when secure storage is enabled.');
        return;
    }

    try {
        const oldPassword = await vscode.window.showInputBox({
            prompt: 'Enter your CURRENT master password',
            password: true,
            ignoreFocusOut: true,
            placeHolder: 'Current master password',
            validateInput: value => value ? null : 'Current master password is required'
        });

        if (!oldPassword) return;

        const newPassword = await vscode.window.showInputBox({
            prompt: 'Enter your NEW master password',
            password: true,
            ignoreFocusOut: true,
            placeHolder: 'Choose a strong new password (min 8 characters)',
            validateInput: value => {
                if (!value) return 'New master password is required';
                if (value.length < 8) return 'New password must be at least 8 characters';
                return null;
            }
        });

        if (!newPassword) return;

        const confirmNewPassword = await vscode.window.showInputBox({
            prompt: 'CONFIRM your NEW master password',
            password: true,
            ignoreFocusOut: true,
            placeHolder: 'Re-enter new password',
            validateInput: value => {
                if (!value) return 'Confirmation is required';
                if (value !== newPassword) return 'Passwords do not match';
                return null;
            }
        });

        if (!confirmNewPassword) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Rotating master password...',
            cancellable: false
        }, async (progress) => {
            try {
                const response = await api.rotateMasterPassword(oldPassword, newPassword);
                if (response.success) {
                    vscode.window.showInformationMessage('Master password rotated successfully. Please use the new password for future operations.');
                    masterPassword = newPassword; // Update session password if stored
                    // Refresh the tree view to reflect any changes with the new password context
                    vscode.commands.executeCommand('secretsAgentExplorer.refreshEntry');
                } else {
                    handleError('Password Rotation Failed', response.message || 'Could not rotate master password. Please check your current password and try again.');
                }
            } catch (error) {
                handleError('Password Rotation Error', 'An error occurred while rotating the master password.', error);
            }
        });

    } catch (error) {
        handleError('Rotate Master Password Error', 'Failed to initiate master password rotation.', error);
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
                const result = await api.scanProject(projectPath);
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
                
                // Auto-refresh secrets view to show any changes
                vscode.commands.executeCommand('secretsAgentExplorer.refreshEntry');
            } catch (error) {
                handleError('Scan Error', 'Failed to scan project.', error);
            }
        });
    } catch (error) {
        handleError('Scan Error', 'Failed to scan project.', error);
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
                const response = await api.linkProject(projectPath, password);
                
                if (response.success) {
                    vscode.window.showInformationMessage('Project successfully linked to secrets.');
                    // Refresh the secrets view
                    vscode.commands.executeCommand('secretsAgentExplorer.refreshEntry');
                } else {
                    vscode.window.showWarningMessage('Project linking completed with warnings. Check the output.');
                }
            } catch (error) {
                handleError('Link Error', 'Failed to link project to secrets.', error);
            }
        });
    } catch (error) {
        handleError('Link Error', 'Failed to link project to secrets.', error);
    }
}

// List available secrets
async function listSecrets() {
    try {
        const password = await promptForMasterPassword();
        
        const keys = await api.listSecrets(password);
        
        if (keys.length === 0) {
            vscode.window.showInformationMessage('No secrets found in storage.');
            return;
        }
        
        const selectedSecret = await vscode.window.showQuickPick(keys.map(key => ({
            label: key,
            detail: 'Select to view or edit'
        })), {
            placeHolder: 'Select a secret to view/edit...'
        });
        
        if (selectedSecret) {
            vscode.commands.executeCommand('vanta.editSecret', selectedSecret.label);
        }
    } catch (error) {
        handleError('List Secrets Error', 'Failed to retrieve secrets list.', error);
    }
}

// Add a new secret
async function addSecret() {
    try {
        const key = await vscode.window.showInputBox({
            prompt: 'Enter secret key (e.g., API_KEY)',
            placeHolder: 'API_KEY, DB_PASSWORD, etc.',
            validateInput: value => {
                if (!value) return 'Secret key is required';
                if (!/^[A-Za-z0-9_]+$/.test(value)) {
                    return 'Secret key should contain only letters, numbers, and underscores';
                }
                return null;
            }
        });
        
        if (!key) return;
        
        const value = await vscode.window.showInputBox({
            prompt: `Enter value for ${key}`,
            password: true,
            placeHolder: 'Secret value',
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
                const response = await api.addSecret(key, value, password);
                
                if (response.success) {
                    vscode.window.showInformationMessage(`Secret ${key} added successfully.`);
                    // Refresh the tree view
                    vscode.commands.executeCommand('secretsAgentExplorer.refreshEntry');
                } else {
                    vscode.window.showWarningMessage(`Failed to add secret ${key}.`);
                }
            } catch (error) {
                handleError('Add Secret Error', `Failed to add secret ${key}.`, error);
            }
        });
    } catch (error) {
        handleError('Add Secret Error', 'Failed to add secret.', error);
    }
}

// Edit an existing secret
async function editSecret(key) {
    try {
        if (!key) {
            // If key is not provided, show picker to select a key
            return await listSecrets();
        }
        
        // Get existing value
        const password = await promptForMasterPassword();
        
        try {
            const existingValue = await api.getSecret(key, password);
            
            const newValue = await vscode.window.showInputBox({
                prompt: `Update value for ${key}`,
                password: true,
                value: existingValue,
                placeHolder: 'New secret value',
                validateInput: value => {
                    return value ? null : 'Secret value is required';
                }
            });
            
            if (newValue === undefined) return; // User cancelled
            
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Updating secret...',
                cancellable: false
            }, async (progress) => {
                try {
                    const response = await api.updateSecret(key, newValue, password);
                    
                    if (response.success) {
                        vscode.window.showInformationMessage(`Secret ${key} updated successfully.`);
                        // Refresh the tree view
                        vscode.commands.executeCommand('secretsAgentExplorer.refreshEntry');
                    } else {
                        vscode.window.showWarningMessage(`Failed to update secret ${key}.`);
                    }
                } catch (error) {
                    handleError('Update Secret Error', `Failed to update secret ${key}.`, error);
                }
            });
        } catch (error) {
            handleError('Secret Retrieval Error', `Failed to retrieve secret ${key}.`, error);
        }
    } catch (error) {
        handleError('Edit Secret Error', 'Failed to edit secret.', error);
    }
}

// Delete a secret
async function deleteSecret(key) {
    try {
        if (!key) {
            return vscode.window.showErrorMessage('No secret key specified for deletion.');
        }
        
        const confirmDelete = await vscode.window.showWarningMessage(
            `Are you sure you want to delete the secret "${key}"?`,
            { modal: true },
            'Delete',
            'Cancel'
        );
        
        if (confirmDelete !== 'Delete') return;
        
        const password = await promptForMasterPassword();
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Deleting secret...',
            cancellable: false
        }, async (progress) => {
            try {
                const response = await api.deleteSecret(key, password);
                
                if (response.success) {
                    vscode.window.showInformationMessage(`Secret ${key} deleted successfully.`);
                    // Refresh the tree view
                    vscode.commands.executeCommand('secretsAgentExplorer.refreshEntry');
                } else {
                    vscode.window.showWarningMessage(`Failed to delete secret ${key}.`);
                }
            } catch (error) {
                handleError('Delete Secret Error', `Failed to delete secret ${key}.`, error);
            }
        });
    } catch (error) {
        handleError('Delete Secret Error', 'Failed to delete secret.', error);
    }
}

// Copy a secret value to clipboard
async function copySecretValue(key) {
    try {
        if (!key) {
            return vscode.window.showErrorMessage('No secret key specified to copy.');
        }
        
        const password = await promptForMasterPassword();
        
        try {
            const value = await api.getSecret(key, password);
            
            await vscode.env.clipboard.writeText(value);
            vscode.window.showInformationMessage(`Secret ${key} copied to clipboard.`);
        } catch (error) {
            handleError('Copy Secret Error', `Failed to retrieve secret ${key}.`, error);
        }
    } catch (error) {
        handleError('Copy Secret Error', 'Failed to copy secret to clipboard.', error);
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
        // Add tooltip based on element type
        if (element.contextValue === 'secret') {
            element.tooltip = `Secret Key: ${element.label}`;
        } else if (element.contextValue === 'category' || element.contextValue === 'tag') {
            const itemCount = element.children ? element.children.length : 0;
            element.tooltip = `${element.label} (${itemCount} items)`;
        } else if (element.contextValue === 'noSecrets') {
            element.tooltip = 'No secrets found. Add or import secrets.';
        }
        return element;
    }

    async getChildren(element) {
        // If this is a category or tag with children, return its children
        if (element && element.children) {
            return element.children;
        }
        
        // Otherwise, get the top-level items
        if (!element) {
            try {
                const password = await promptForMasterPassword();
                const keys = await api.listSecrets(password);
                
                if (keys.length === 0) {
                    return [
                        this._createNoSecretsItem()
                    ];
                }
                
                // Use visualization manager to organize secrets
                return visualization.organizeSecrets(keys);
            } catch (error) {
                // Use the centralized handleError for user notification
                handleError('Tree View Error', 'Failed to load secrets for the explorer view.', error);
                // Return a specific error item for the tree
                return [this._createErrorItem(error.message || 'Failed to load secrets')];
            }
        }
        
        return [];
    }

    /**
     * Create an item for when no secrets are found
     * @returns {vscode.TreeItem} Tree item
     * @private
     */
    _createNoSecretsItem() {
        const item = new vscode.TreeItem('No secrets found');
        item.tooltip = 'Click "Add Secret" to create your first secret';
        item.iconPath = new vscode.ThemeIcon('info');
        item.command = {
            command: 'vanta.addSecret',
            title: 'Add Secret'
        };
        return item;
    }

    /**
     * Create an error item for the tree view
     * @param {string} errorMessage - The error message to display
     * @returns {vscode.TreeItem} Tree item
     * @private
     */
    _createErrorItem(errorMessage) {
        const item = new vscode.TreeItem('Error loading secrets');
        item.tooltip = errorMessage;
        item.iconPath = new vscode.ThemeIcon('error');
        item.collapsibleState = vscode.TreeItemCollapsibleState.None;
        return item;
    }
}

function deactivate() {
    // Clean up auto-refresh interval
    clearAutoRefresh();
}

module.exports = {
    activate,
    deactivate
};