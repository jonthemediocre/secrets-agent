const axios = require('axios');
const vscode = require('vscode');

class SecretsAgentAPI {
    constructor() {
        this.initialize();
    }

    initialize() {
        const config = vscode.workspace.getConfiguration('secretsAgent');
        // Default to HTTPS. The backend server must be configured for SSL.
        // For local development with a self-signed certificate, you might need to set
        // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; in extension.js (for development ONLY)
        // or configure axios with a custom httpsAgent to trust the self-signed cert.
        this.apiUrl = config.get('apiUrl') || 'https://localhost:5001/api';
        this.secureStorage = false;
        
        // Watch for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('secretsAgent.apiUrl')) {
                const config = vscode.workspace.getConfiguration('secretsAgent');
                this.apiUrl = config.get('apiUrl');
            }
        });
    }

    /**
     * Check if the API server is running and get its status
     * @returns {Promise<Object>} Status object
     */
    async checkHealth() {
        try {
            const response = await axios.get(`${this.apiUrl}/health`);
            this.secureStorage = response.data.secure_storage;
            return response.data;
        } catch (error) {
            console.error('API Health check error:', error);
            throw error;
        }
    }

    /**
     * Scan a project for environment variables and tools
     * @param {string} projectPath - The path to the project
     * @returns {Promise<Object>} Scan results
     */
    async scanProject(projectPath) {
        try {
            const response = await axios.post(`${this.apiUrl}/scan`, {
                project_path: projectPath
            });
            return response.data;
        } catch (error) {
            console.error('Project scan error:', error);
            throw error;
        }
    }

    /**
     * Link a project to secrets
     * @param {string} projectPath - The path to the project
     * @param {string} password - The master password (if secure storage is enabled)
     * @returns {Promise<Object>} Link results
     */
    async linkProject(projectPath, password) {
        try {
            const response = await axios.post(`${this.apiUrl}/link`, {
                project_path: projectPath,
                secure: this.secureStorage,
                password
            });
            return response.data;
        } catch (error) {
            console.error('Project link error:', error);
            throw error;
        }
    }

    /**
     * Get a list of available secrets
     * @param {string} password - The master password (if secure storage is enabled)
     * @returns {Promise<Array<string>>} List of secret keys
     */
    async listSecrets(password) {
        try {
            let params = {};
            if (this.secureStorage) {
                params.secure = 'true';
                params.password = password;
            }
            
            const response = await axios.get(`${this.apiUrl}/list-secrets`, { params });
            return response.data.keys || [];
        } catch (error) {
            console.error('List secrets error:', error);
            throw error;
        }
    }

    /**
     * Get a specific secret value
     * @param {string} key - The secret key
     * @param {string} password - The master password (if secure storage is enabled)
     * @returns {Promise<string>} The secret value
     */
    async getSecret(key, password) {
        try {
            let params = {};
            if (this.secureStorage) {
                params.secure = 'true';
                params.password = password;
                params.key = key;
            }
            
            const response = await axios.get(`${this.apiUrl}/get-secret`, { params });
            return response.data.value || '';
        } catch (error) {
            console.error('Get secret error:', error);
            throw error;
        }
    }

    /**
     * Add a new secret
     * @param {string} key - The secret key
     * @param {string} value - The secret value
     * @param {string} password - The master password (if secure storage is enabled)
     * @returns {Promise<Object>} Operation result
     */
    async addSecret(key, value, password) {
        try {
            const response = await axios.post(`${this.apiUrl}/add-secret`, {
                key,
                value,
                secure: this.secureStorage,
                password
            });
            return response.data;
        } catch (error) {
            console.error('Add secret error:', error);
            throw error;
        }
    }

    /**
     * Update an existing secret
     * @param {string} key - The secret key
     * @param {string} value - The new secret value
     * @param {string} password - The master password (if secure storage is enabled)
     * @returns {Promise<Object>} Operation result
     */
    async updateSecret(key, value, password) {
        try {
            const response = await axios.post(`${this.apiUrl}/update-secret`, {
                key,
                value,
                secure: this.secureStorage,
                password
            });
            return response.data;
        } catch (error) {
            console.error('Update secret error:', error);
            throw error;
        }
    }

    /**
     * Delete a secret
     * @param {string} key - The secret key to delete
     * @param {string} password - The master password (if secure storage is enabled)
     * @returns {Promise<Object>} Operation result
     */
    async deleteSecret(key, password) {
        try {
            const response = await axios.post(`${this.apiUrl}/delete-secret`, {
                key,
                secure: this.secureStorage,
                password
            });
            return response.data;
        } catch (error) {
            console.error('Delete secret error:', error);
            throw error;
        }
    }

    /**
     * Rotate the master password
     * @param {string} oldPassword - The current master password
     * @param {string} newPassword - The new master password
     * @returns {Promise<Object>} Operation result
     */
    async rotateMasterPassword(oldPassword, newPassword) {
        try {
            const response = await axios.post(`${this.apiUrl}/rotate-master-password`, {
                old_password: oldPassword,
                new_password: newPassword,
                secure: this.secureStorage // Should always be true for this operation
            });
            return response.data;
        } catch (error) {
            console.error('Rotate master password error:', error);
            throw error;
        }
    }

    /**
     * Export all secrets to a JSON file
     * @param {string} password - The master password (if secure storage is enabled)
     * @returns {Promise<Object>} Export data
     */
    async exportSecrets(password) {
        try {
            // Get all secrets
            const keys = await this.listSecrets(password);
            const secrets = {};
            
            // Get each secret value
            for (const key of keys) {
                secrets[key] = await this.getSecret(key, password);
            }
            
            // Metadata about the export
            const exportData = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    secureStorage: this.secureStorage,
                    version: '0.1.0'
                },
                secrets: secrets
            };
            
            return exportData;
        } catch (error) {
            console.error('Export secrets error:', error);
            throw error;
        }
    }

    /**
     * Import secrets from a JSON file
     * @param {Object} importData - The import data object
     * @param {string} password - The master password (if secure storage is enabled)
     * @param {boolean} overwrite - Whether to overwrite existing secrets
     * @returns {Promise<Object>} Result with success count and errors
     */
    async importSecrets(importData, password, overwrite = false) {
        try {
            const result = {
                success: 0,
                errors: [],
                skipped: 0
            };
            
            // Get existing secrets to check for conflicts
            const existingKeys = new Set(await this.listSecrets(password));
            
            // Add each secret
            const secrets = importData.secrets || {};
            for (const [key, value] of Object.entries(secrets)) {
                try {
                    // Skip existing secrets if not overwriting
                    if (existingKeys.has(key) && !overwrite) {
                        result.skipped++;
                        continue;
                    }
                    
                    // Add or update the secret
                    if (existingKeys.has(key)) {
                        await this.updateSecret(key, value, password);
                    } else {
                        await this.addSecret(key, value, password);
                    }
                    result.success++;
                } catch (err) {
                    result.errors.push({
                        key,
                        error: err.message
                    });
                }
            }
            
            return result;
        } catch (error) {
            console.error('Import secrets error:', error);
            throw error;
        }
    }

    /**
     * Get all secrets with values (BE CAREFUL - security sensitive)
     * @param {string} password - The master password (if secure storage is enabled)
     * @returns {Promise<Object>} Object with key-value pairs
     */
    async getAllSecrets(password) {
        try {
            const keys = await this.listSecrets(password);
            const secrets = {};
            
            for (const key of keys) {
                secrets[key] = await this.getSecret(key, password);
            }
            
            return secrets;
        } catch (error) {
            console.error('Get all secrets error:', error);
            throw error;
        }
    }

    /**
     * Check if secure storage is enabled
     * @returns {boolean} True if secure storage is enabled
     */
    isSecureStorageEnabled() {
        return this.secureStorage;
    }
}

module.exports = new SecretsAgentAPI(); 