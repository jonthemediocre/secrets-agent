import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { spawn, ChildProcess } from 'child_process';

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

class SecretsAgentApp {
  private mainWindow: BrowserWindow | null = null;
  private store: Store;
  private cliProcess: ChildProcess | null = null;

  constructor() {
    this.store = new Store<WindowState>({
      defaults: {
        width: 1200,
        height: 800,
        isMaximized: false
      }
    });

    this.setupApp();
    this.setupIPC();
  }

  private setupApp(): void {
    // Handle app ready
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupMenu();
      
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    // Handle window-all-closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Handle before-quit
    app.on('before-quit', () => {
      if (this.cliProcess) {
        this.cliProcess.kill();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (_, contents) => {
      contents.on('new-window', (navigationEvent, navigationUrl) => {
        navigationEvent.preventDefault();
        shell.openExternal(navigationUrl);
      });
    });
  }

  private createMainWindow(): void {
    const windowState = this.store.get('windowState') as WindowState;

    this.mainWindow = new BrowserWindow({
      width: windowState.width,
      height: windowState.height,
      x: windowState.x,
      y: windowState.y,
      minWidth: 800,
      minHeight: 600,
      show: false,
      icon: path.join(__dirname, '../assets/icon.png'),
      titleBarStyle: 'default',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true
      }
    });

    // Restore maximized state
    if (windowState.isMaximized) {
      this.mainWindow.maximize();
    }

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3002');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../app/index.html'));
    }

    // Show when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      // Focus on the window
      if (process.platform === 'win32') {
        this.mainWindow?.focus();
      }
    });

    // Save window state
    this.mainWindow.on('close', () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds();
        const isMaximized = this.mainWindow.isMaximized();
        
        this.store.set('windowState', {
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
          isMaximized
        });
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Import .env File',
            accelerator: 'CmdOrCtrl+I',
            click: () => this.handleImportEnvFile()
          },
          {
            label: 'Export Secrets',
            accelerator: 'CmdOrCtrl+E',
            click: () => this.handleExportSecrets()
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: 'Vault',
        submenu: [
          {
            label: 'Create New Vault',
            click: () => this.sendToRenderer('vault:create')
          },
          {
            label: 'Unlock Vault',
            accelerator: 'CmdOrCtrl+U',
            click: () => this.sendToRenderer('vault:unlock')
          },
          {
            label: 'Lock Vault',
            accelerator: 'CmdOrCtrl+L',
            click: () => this.sendToRenderer('vault:lock')
          },
          { type: 'separator' },
          {
            label: 'Vault Status',
            click: () => this.sendToRenderer('vault:status')
          }
        ]
      },
      {
        label: 'Tools',
        submenu: [
          {
            label: 'Secret Sauce Analysis',
            accelerator: 'CmdOrCtrl+A',
            click: () => this.sendToRenderer('tools:secret-sauce')
          },
          {
            label: 'Access Logs',
            accelerator: 'CmdOrCtrl+Shift+L',
            click: () => this.sendToRenderer('tools:logs')
          },
          {
            label: 'MCP Tools',
            click: () => this.sendToRenderer('tools:mcp')
          }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' },
          { type: 'separator' },
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Secrets Agent',
            click: () => this.showAboutDialog()
          },
          {
            label: 'Documentation',
            click: () => shell.openExternal('https://github.com/secrets-agent/docs')
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIPC(): void {
    // Handle CLI execution
    ipcMain.handle('cli:execute', async (_, command: string, args: string[]) => {
      return new Promise((resolve, reject) => {
        const cliPath = path.join(__dirname, '../../../cli_enhanced.py');
        const pythonProcess = spawn('python', [cliPath, command, ...args]);
        
        let output = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          error += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve({ success: true, output, error: null });
          } else {
            reject({ success: false, output, error });
          }
        });
      });
    });

    // Handle file operations
    ipcMain.handle('file:read', async (_, filePath: string) => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, content };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    ipcMain.handle('file:write', async (_, filePath: string, content: string) => {
      try {
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Handle dialog operations
    ipcMain.handle('dialog:openFile', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openFile'],
        filters: [
          { name: 'Environment Files', extensions: ['env'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      return result;
    });

    ipcMain.handle('dialog:saveFile', async () => {
      const result = await dialog.showSaveDialog(this.mainWindow!, {
        filters: [
          { name: 'Environment Files', extensions: ['env'] },
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      return result;
    });
  }

  private sendToRenderer(channel: string, ...args: any[]): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  private async handleImportEnvFile(): Promise<void> {
    const result = await dialog.showOpenDialog(this.mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Environment Files', extensions: ['env'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      this.sendToRenderer('file:import', result.filePaths[0]);
    }
  }

  private async handleExportSecrets(): Promise<void> {
    const result = await dialog.showSaveDialog(this.mainWindow!, {
      defaultPath: 'secrets-export.env',
      filters: [
        { name: 'Environment Files', extensions: ['env'] },
        { name: 'JSON Files', extensions: ['json'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      this.sendToRenderer('file:export', result.filePath);
    }
  }

  private showAboutDialog(): void {
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'About Secrets Agent',
      message: 'Secrets Agent',
      detail: `Version: 1.3.4
Platform: ${process.platform}
Node: ${process.version}
Electron: ${process.versions.electron}

Universal Secrets Management Platform with AI-powered governance and multi-platform support.`,
      buttons: ['OK']
    });
  }
}

// Create the app
new SecretsAgentApp(); 