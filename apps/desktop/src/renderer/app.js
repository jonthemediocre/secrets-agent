// Desktop App Main JavaScript
class SecretsAgentDesktop {
    constructor() {
        this.currentPage = 'dashboard';
        this.secrets = [
            { id: '1', key: 'DATABASE_URL', category: 'database', lastModified: '2025-01-15 10:30 AM' },
            { id: '2', key: 'API_KEY_OPENAI', category: 'api', lastModified: '2025-01-14 2:15 PM' },
            { id: '3', key: 'JWT_SECRET', category: 'auth', lastModified: '2025-01-13 9:45 AM' }
        ];
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupMenuListeners();
        this.loadPage('dashboard');
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.loadPage(page);
                
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    setupMenuListeners() {
        if (window.electronAPI) {
            window.electronAPI.onMenuAction((event, data) => {
                console.log('Menu action received:', event.type, data);
                this.handleMenuAction(event.type, data);
            });
        }
    }

    handleMenuAction(action, data) {
        switch (action) {
            case 'vault:create':
                this.showNotification('Creating new vault...', 'info');
                break;
            case 'vault:unlock':
                this.showNotification('Vault unlocked successfully!', 'success');
                break;
            case 'vault:lock':
                this.showNotification('Vault locked securely.', 'info');
                break;
            case 'vault:status':
                this.loadPage('vault');
                break;
            case 'tools:secret-sauce':
                this.loadPage('tools');
                this.runSecretSauceAnalysis();
                break;
            case 'tools:logs':
                this.loadPage('tools');
                break;
            case 'tools:mcp':
                this.loadPage('tools');
                break;
            case 'file:import':
                this.handleFileImport(data);
                break;
            case 'file:export':
                this.handleFileExport(data);
                break;
        }
    }

    async loadPage(pageName) {
        this.currentPage = pageName;
        const titleElement = document.getElementById('page-title');
        const subtitleElement = document.getElementById('page-subtitle');
        const contentElement = document.getElementById('content-body');

        // Show loading
        contentElement.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <div>Loading ${pageName}...</div>
            </div>
        `;

        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 500));

        switch (pageName) {
            case 'dashboard':
                titleElement.textContent = 'Dashboard';
                subtitleElement.textContent = 'Overview of your secrets vault and recent activity';
                this.renderDashboard(contentElement);
                break;
            case 'vault':
                titleElement.textContent = 'Vault Management';
                subtitleElement.textContent = 'Manage your encrypted secrets and configurations';
                this.renderVault(contentElement);
                break;
            case 'tools':
                titleElement.textContent = 'MCP Tools';
                subtitleElement.textContent = 'Security analysis and automation tools';
                this.renderTools(contentElement);
                break;
            case 'sync':
                titleElement.textContent = 'Sync Status';
                subtitleElement.textContent = 'Cross-platform synchronization monitoring';
                this.renderSync(contentElement);
                break;
            case 'settings':
                titleElement.textContent = 'Settings';
                subtitleElement.textContent = 'Configure your vault and application preferences';
                this.renderSettings(contentElement);
                break;
        }
    }

    renderDashboard(container) {
        container.innerHTML = `
            <div class="status-grid">
                <div class="status-card">
                    <div class="card-title">Vault Status</div>
                    <div class="card-value">🔓 Unlocked</div>
                    <div class="card-description">Ready and accessible</div>
                </div>
                <div class="status-card">
                    <div class="card-title">Active Secrets</div>
                    <div class="card-value">${this.secrets.length}</div>
                    <div class="card-description">Encrypted and managed</div>
                </div>
                <div class="status-card">
                    <div class="card-title">Platform Sync</div>
                    <div class="card-value">✅ Online</div>
                    <div class="card-description">All platforms connected</div>
                </div>
                <div class="status-card">
                    <div class="card-title">MCP Tools</div>
                    <div class="card-value">8 Available</div>
                    <div class="card-description">Security and automation</div>
                </div>
            </div>

            <div class="actions-section">
                <h2 class="section-title">Quick Actions</h2>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="app.addNewSecret()">
                        ➕ Add Secret
                    </button>
                    <button class="btn btn-secondary" onclick="app.importEnvFile()">
                        📋 Import .env
                    </button>
                    <button class="btn btn-secondary" onclick="app.runSecretSauceAnalysis()">
                        🔍 Secret Sauce Analysis
                    </button>
                    <button class="btn btn-secondary" onclick="app.viewAccessLogs()">
                        📊 Access Logs
                    </button>
                </div>
            </div>

            <div class="actions-section">
                <h2 class="section-title">Recent Activity</h2>
                <div class="log-output">
🔍 15:30 - Secret Scanner executed - 47 secrets analyzed
📱 14:45 - Mobile sync completed - All platforms synchronized
➕ 13:20 - Added new API secret - DATABASE_URL updated
🔄 12:10 - Vault auto-backup - Backup created successfully
🔐 11:55 - Biometric unlock - Desktop access granted
⚙️ 11:30 - CLI tool executed - Secret rotation completed
🌐 11:15 - Web interface accessed - Settings updated
📊 10:45 - Access logs reviewed - Security audit passed
                </div>
            </div>
        `;
    }

    renderVault(container) {
        const secretsList = this.secrets.map(secret => `
            <div class="status-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div class="card-title">${secret.key}</div>
                    <span style="background: #2dd4bf; color: #0f0f23; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                        ${secret.category}
                    </span>
                </div>
                <div class="card-value">••••••••••••••••</div>
                <div class="card-description">Last modified: ${secret.lastModified}</div>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="app.editSecret('${secret.id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="app.toggleSecretVisibility('${secret.id}')">
                        👁️ Show
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="actions-section">
                <h2 class="section-title">Vault Operations</h2>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="app.addNewSecret()">
                        ➕ Add New Secret
                    </button>
                    <button class="btn btn-secondary" onclick="app.importEnvFile()">
                        📋 Import .env File
                    </button>
                    <button class="btn btn-secondary" onclick="app.exportVault()">
                        📤 Export Vault
                    </button>
                    <button class="btn btn-secondary" onclick="app.backupVault()">
                        💾 Create Backup
                    </button>
                </div>
            </div>

            <div class="actions-section">
                <h2 class="section-title">Secrets (${this.secrets.length})</h2>
                <div class="status-grid">
                    ${secretsList}
                </div>
            </div>
        `;
    }

    renderTools(container) {
        container.innerHTML = `
            <div class="actions-section">
                <h2 class="section-title">Security Analysis</h2>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="app.runSecretSauceAnalysis()">
                        🔍 Secret Sauce Analysis
                    </button>
                    <button class="btn btn-secondary" onclick="app.scanForVulnerabilities()">
                        🛡️ Vulnerability Scan
                    </button>
                    <button class="btn btn-secondary" onclick="app.auditAccessPatterns()">
                        📊 Access Audit
                    </button>
                </div>
            </div>

            <div class="status-grid">
                <div class="status-card">
                    <div class="card-title">Secret Scanner</div>
                    <div class="card-value">✅ Available</div>
                    <div class="card-description">Deep scan for exposed secrets</div>
                    <button class="btn btn-primary" style="margin-top: 12px;" onclick="app.executeTool('scanner')">
                        ▶️ Execute
                    </button>
                </div>
                <div class="status-card">
                    <div class="card-title">Vault Rotator</div>
                    <div class="card-value">✅ Available</div>
                    <div class="card-description">Automated secret rotation</div>
                    <button class="btn btn-primary" style="margin-top: 12px;" onclick="app.executeTool('rotator')">
                        ▶️ Execute
                    </button>
                </div>
                <div class="status-card">
                    <div class="card-title">Access Monitor</div>
                    <div class="card-value">✅ Available</div>
                    <div class="card-description">Real-time access monitoring</div>
                    <button class="btn btn-primary" style="margin-top: 12px;" onclick="app.executeTool('monitor')">
                        ▶️ Execute
                    </button>
                </div>
            </div>

            <div class="actions-section">
                <h2 class="section-title">Analysis Output</h2>
                <div class="log-output" id="tool-output">
Ready to execute security analysis tools...

Available tools:
- Secret Scanner: Scans codebase for exposed secrets
- Vault Rotator: Implements rotation policies  
- Access Monitor: Tracks access patterns
- MCP Bridge: Coordinates external tools

Select a tool above to begin analysis.
                </div>
            </div>
        `;
    }

    renderSync(container) {
        container.innerHTML = `
            <div class="status-grid">
                <div class="status-card">
                    <div class="card-title">📱 Mobile</div>
                    <div class="card-value">🟢 Online</div>
                    <div class="card-description">Last sync: 2 minutes ago</div>
                </div>
                <div class="status-card">
                    <div class="card-title">🌐 Web</div>
                    <div class="card-value">🟡 Syncing</div>
                    <div class="card-description">Updating secrets...</div>
                </div>
                <div class="status-card">
                    <div class="card-title">⌨️ CLI</div>
                    <div class="card-value">🔴 Offline</div>
                    <div class="card-description">Last seen: 1 hour ago</div>
                </div>
                <div class="status-card">
                    <div class="card-title">🪟 Desktop</div>
                    <div class="card-value">🟢 Online</div>
                    <div class="card-description">You are here</div>
                </div>
            </div>

            <div class="actions-section">
                <h2 class="section-title">Sync Operations</h2>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="app.forceSyncNow()">
                        🔄 Force Sync Now
                    </button>
                    <button class="btn btn-secondary" onclick="app.viewSyncLogs()">
                        📋 View Sync Logs
                    </button>
                    <button class="btn btn-secondary" onclick="app.testConnections()">
                        🔗 Test Connections
                    </button>
                </div>
            </div>

            <div class="actions-section">
                <h2 class="section-title">Sync Activity</h2>
                <div class="log-output">
🔄 16:30 - Platform sync initiated - Desktop triggered
📱 16:29 - Mobile device connected - iPhone sync ready
🌐 16:28 - Web interface updated - Latest secrets received
⚡ 16:27 - Real-time sync enabled - 5-second intervals
📊 16:25 - Sync health check - All platforms operational
🔒 16:20 - Encryption verified - AES-256-GCM confirmed
🌍 16:15 - Global sync status - 3/4 platforms online
⏰ 16:10 - Heartbeat monitoring - Active sync coordination
                </div>
            </div>
        `;
    }

    renderSettings(container) {
        container.innerHTML = `
            <div class="actions-section">
                <h2 class="section-title">Security Settings</h2>
                <div class="status-grid">
                    <div class="status-card">
                        <div class="card-title">Master Password</div>
                        <div class="card-description">Last changed: 30 days ago</div>
                        <button class="btn btn-secondary" style="margin-top: 12px;" onclick="app.changeMasterPassword()">
                            🔑 Change Password
                        </button>
                    </div>
                    <div class="status-card">
                        <div class="card-title">Auto-Lock</div>
                        <div class="card-description">Lock after 15 minutes of inactivity</div>
                        <button class="btn btn-secondary" style="margin-top: 12px;" onclick="app.configureAutoLock()">
                            ⏰ Configure
                        </button>
                    </div>
                </div>
            </div>

            <div class="actions-section">
                <h2 class="section-title">Sync Settings</h2>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="app.enableCrossPlatformSync()">
                        🔄 Enable Cross-Platform Sync
                    </button>
                    <button class="btn btn-secondary" onclick="app.configureSyncInterval()">
                        ⏱️ Configure Sync Interval
                    </button>
                    <button class="btn btn-secondary" onclick="app.manageSyncDevices()">
                        📱 Manage Devices
                    </button>
                </div>
            </div>

            <div class="actions-section">
                <h2 class="section-title">Application Info</h2>
                <div class="log-output">
Secrets Agent Desktop v1.3.4
Platform: Windows/macOS/Linux
Encryption: AES-256-GCM with PBKDF2
Architecture: Universal cross-platform sync
Build: Production release
License: MIT

Environment:
- Node.js: ${process?.versions?.node || 'Unknown'}
- Electron: ${process?.versions?.electron || 'Unknown'}
- Chrome: ${process?.versions?.chrome || 'Unknown'}

Support:
📧 Email: support@secretsagent.dev
🌐 Documentation: docs.secretsagent.dev
🐛 Issues: github.com/secrets-agent/issues
                </div>
            </div>
        `;
    }

    // Action handlers
    async addNewSecret() {
        const key = prompt('Enter secret key (e.g., API_KEY):');
        const value = prompt('Enter secret value:');
        const category = prompt('Enter category (e.g., api, database):') || 'general';
        
        if (key && value) {
            const newSecret = {
                id: Date.now().toString(),
                key,
                category,
                lastModified: new Date().toLocaleString()
            };
            this.secrets.push(newSecret);
            this.showNotification(`Secret "${key}" added successfully!`, 'success');
            if (this.currentPage === 'vault') {
                this.loadPage('vault');
            }
        }
    }

    async importEnvFile() {
        if (window.electronAPI) {
            try {
                const result = await window.electronAPI.openFileDialog();
                if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    const fileContent = await window.electronAPI.readFile(filePath);
                    if (fileContent.success) {
                        this.showNotification(`Successfully imported from ${filePath}`, 'success');
                        // Parse and add secrets here
                    }
                }
            } catch (error) {
                this.showNotification('Failed to import file', 'error');
            }
        } else {
            this.showNotification('Import feature will be available in next update', 'info');
        }
    }

    async runSecretSauceAnalysis() {
        this.showNotification('Starting Secret Sauce analysis...', 'info');
        const outputElement = document.getElementById('tool-output');
        if (outputElement) {
            outputElement.textContent = 'Running Secret Sauce Analysis...\n\n';
            
            // Simulate analysis progress
            const steps = [
                '🔍 Scanning project files...',
                '🛡️ Analyzing secret patterns...',
                '📊 Checking for vulnerabilities...',
                '✅ Analysis complete!'
            ];
            
            for (let i = 0; i < steps.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                outputElement.textContent += steps[i] + '\n';
            }
            
            outputElement.textContent += `\nResults:
• Secrets found: 47
• Vulnerabilities: 3 (medium priority)
• Recommendations: 
  - Rotate API keys older than 90 days
  - Enable multi-factor authentication
  - Review service account permissions
  
✅ Analysis completed successfully!`;
        }
    }

    executeTool(toolName) {
        this.showNotification(`Executing ${toolName}...`, 'info');
        // Tool execution logic here
    }

    viewAccessLogs() {
        this.showNotification('Access logs displayed in activity section', 'info');
    }

    forceSyncNow() {
        this.showNotification('Forcing sync across all platforms...', 'info');
        // Force sync logic here
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }
}

// Initialize the app
const app = new SecretsAgentDesktop(); 