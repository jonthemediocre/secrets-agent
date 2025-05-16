const vscode = require('vscode');

/**
 * Manages different visualization modes for secrets
 */
class SecretVisualizationManager {
    constructor() {
        this.visualizationMode = 'flat';
        this.initialize();
    }

    /**
     * Initialize visualization mode from settings
     */
    initialize() {
        const config = vscode.workspace.getConfiguration('secretsAgent');
        this.visualizationMode = config.get('visualization') || 'flat';
        
        // Watch for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('secretsAgent.visualization')) {
                const config = vscode.workspace.getConfiguration('secretsAgent');
                this.visualizationMode = config.get('visualization') || 'flat';
            }
        });
    }

    /**
     * Change the visualization mode
     * @param {string} mode - The visualization mode to use (flat, categorized, tagged)
     */
    async changeMode(mode) {
        if (!['flat', 'categorized', 'tagged'].includes(mode)) {
            const errorMessage = `Invalid visualization mode: ${mode}`;
            vscode.window.showErrorMessage(errorMessage);
            throw new Error(errorMessage);
        }
        
        const config = vscode.workspace.getConfiguration('secretsAgent');
        try {
            await config.update('visualization', mode, vscode.ConfigurationTarget.Global);
            this.visualizationMode = mode;
        } catch (error) {
            console.error('Failed to update visualization mode setting:', error);
            vscode.window.showErrorMessage(`Failed to set visualization mode to ${mode}. Please try again.`);
            throw error;
        }
    }

    /**
     * Get the current visualization mode
     * @returns {string} The current visualization mode
     */
    getCurrentMode() {
        return this.visualizationMode;
    }

    /**
     * Organize secrets according to the current visualization mode
     * @param {Array<string>} secretKeys - Array of secret keys
     * @returns {Array<vscode.TreeItem>} Organized tree items
     */
    organizeSecrets(secretKeys) {
        switch (this.visualizationMode) {
            case 'flat':
                return this._organizeFlatView(secretKeys);
            case 'categorized':
                return this._organizeCategorizedView(secretKeys);
            case 'tagged':
                return this._organizeTaggedView(secretKeys);
            default:
                return this._organizeFlatView(secretKeys);
        }
    }

    /**
     * Create a flat list of secret items (default)
     * @param {Array<string>} secretKeys - Array of secret keys
     * @returns {Array<vscode.TreeItem>} Flat list of tree items
     * @private
     */
    _organizeFlatView(secretKeys) {
        return secretKeys.map(key => {
            const treeItem = new vscode.TreeItem(key);
            treeItem.iconPath = new vscode.ThemeIcon('key');
            treeItem.tooltip = `Secret: ${key}`;
            treeItem.contextValue = 'secret';
            
            treeItem.command = {
                command: 'vanta.editSecret',
                title: 'Edit Secret',
                arguments: [key]
            };
            
            return treeItem;
        });
    }

    /**
     * Create a categorized view of secrets based on naming patterns
     * @param {Array<string>} secretKeys - Array of secret keys
     * @returns {Array<vscode.TreeItem>} Categorized tree items
     * @private
     */
    _organizeCategorizedView(secretKeys) {
        // Group secrets by category (based on prefix before underscore or common patterns)
        const categories = {};
        
        for (const key of secretKeys) {
            let category = 'Other';
            
            // Try to determine category from prefix
            const prefixMatch = key.match(/^([A-Z]+)_/);
            if (prefixMatch) {
                category = prefixMatch[1];
            } else if (key.includes('API_KEY') || key.includes('TOKEN') || key.includes('SECRET')) {
                category = 'API';
            } else if (key.includes('DB_') || key.includes('DATABASE')) {
                category = 'Database';
            } else if (key.includes('AWS_') || key.includes('AZURE_') || key.includes('GCP_')) {
                category = 'Cloud';
            }
            
            if (!categories[category]) {
                categories[category] = [];
            }
            
            categories[category].push(key);
        }
        
        // Create category items with children
        return Object.entries(categories).map(([category, keys]) => {
            const categoryItem = new vscode.TreeItem(category, vscode.TreeItemCollapsibleState.Expanded);
            categoryItem.contextValue = 'category';
            categoryItem.iconPath = this._getCategoryIcon(category);
            categoryItem.tooltip = `${keys.length} secrets`;
            categoryItem.children = keys.map(key => {
                const secretItem = new vscode.TreeItem(key);
                secretItem.iconPath = new vscode.ThemeIcon('key');
                secretItem.contextValue = 'secret';
                secretItem.tooltip = `Secret: ${key}`;
                
                secretItem.command = {
                    command: 'vanta.editSecret',
                    title: 'Edit Secret',
                    arguments: [key]
                };
                
                return secretItem;
            });
            
            return categoryItem;
        });
    }

    /**
     * Create a tagged view of secrets based on tags in names
     * @param {Array<string>} secretKeys - Array of secret keys
     * @returns {Array<vscode.TreeItem>} Tagged tree items
     * @private
     */
    _organizeTaggedView(secretKeys) {
        // Extract and collate all potential tags from secret names
        const allTags = new Set();
        const secretTags = {};
        
        for (const key of secretKeys) {
            secretTags[key] = new Set();
            
            // Extract tags from key (API, DB, etc.)
            const tags = this._extractTags(key);
            
            tags.forEach(tag => {
                allTags.add(tag);
                secretTags[key].add(tag);
            });
            
            // If no tags were found, add to "Untagged"
            if (secretTags[key].size === 0) {
                secretTags[key].add('Untagged');
                allTags.add('Untagged');
            }
        }
        
        // Create tag-based items
        const tagItems = [];
        
        // Create a single secret item that might appear under multiple tags
        const createSecretItem = (key) => {
            const secretItem = new vscode.TreeItem(key);
            secretItem.iconPath = new vscode.ThemeIcon('key');
            secretItem.contextValue = 'secret';
            secretItem.tooltip = `Secret: ${key}`;
            
            secretItem.command = {
                command: 'vanta.editSecret',
                title: 'Edit Secret',
                arguments: [key]
            };
            
            return secretItem;
        };
        
        // Add tag items with their associated secrets
        for (const tag of allTags) {
            const matchingSecrets = Object.keys(secretTags).filter(key => 
                secretTags[key].has(tag)
            );
            
            if (matchingSecrets.length > 0) {
                const tagItem = new vscode.TreeItem(tag, vscode.TreeItemCollapsibleState.Collapsed);
                tagItem.contextValue = 'tag';
                tagItem.iconPath = this._getTagIcon(tag);
                tagItem.tooltip = `${matchingSecrets.length} secrets`;
                tagItem.children = matchingSecrets.map(key => createSecretItem(key));
                
                tagItems.push(tagItem);
            }
        }
        
        return tagItems;
    }

    /**
     * Extract potential tags from a secret key
     * @param {string} key - The secret key
     * @returns {Set<string>} Set of tags
     * @private
     */
    _extractTags(key) {
        const tags = new Set();
        
        // Common prefixes
        const prefixMatch = key.match(/^([A-Z]+)_/);
        if (prefixMatch) {
            tags.add(prefixMatch[1]);
        }
        
        // Common patterns
        if (key.includes('API') || key.includes('TOKEN') || key.includes('KEY')) {
            tags.add('API');
        }
        
        if (key.includes('DB') || key.includes('DATABASE')) {
            tags.add('Database');
        }
        
        if (key.includes('AWS') || key.includes('AZURE') || key.includes('GCP') || key.includes('CLOUD')) {
            tags.add('Cloud');
        }
        
        if (key.includes('AUTH') || key.includes('LOGIN')) {
            tags.add('Auth');
        }
        
        if (key.includes('STRIPE') || key.includes('PAYMENT')) {
            tags.add('Payment');
        }
        
        if (key.includes('AI') || key.includes('ML') || key.includes('OPENAI') || key.includes('CLAUDE')) {
            tags.add('AI');
        }
        
        return tags;
    }

    /**
     * Get an icon for a category
     * @param {string} category - The category name
     * @returns {vscode.ThemeIcon} The theme icon
     * @private
     */
    _getCategoryIcon(category) {
        const iconMap = {
            'API': 'globe',
            'Database': 'database',
            'Cloud': 'cloud',
            'AWS': 'cloud-upload',
            'AZURE': 'cloud',
            'GCP': 'cloud',
            'Auth': 'lock',
            'Other': 'list-unordered',
            'ENV': 'settings',
            'CONFIG': 'gear',
            'SECRET': 'lock'
        };
        
        return new vscode.ThemeIcon(iconMap[category] || 'symbol-enum');
    }

    /**
     * Get an icon for a tag
     * @param {string} tag - The tag name
     * @returns {vscode.ThemeIcon} The theme icon
     * @private
     */
    _getTagIcon(tag) {
        const iconMap = {
            'API': 'globe',
            'Database': 'database',
            'Cloud': 'cloud',
            'Auth': 'lock',
            'Untagged': 'question',
            'Payment': 'credit-card',
            'AI': 'robot'
        };
        
        return new vscode.ThemeIcon(iconMap[tag] || 'tag');
    }
}

module.exports = new SecretVisualizationManager(); 