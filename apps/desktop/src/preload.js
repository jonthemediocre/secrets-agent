const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // CLI operations
  executeCLI: (command, args) => ipcRenderer.invoke('cli:execute', command, args),
  
  // File operations
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
  
  // Dialog operations
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: () => ipcRenderer.invoke('dialog:saveFile'),
  
  // Menu event listeners
  onMenuAction: (callback) => {
    ipcRenderer.on('vault:create', callback);
    ipcRenderer.on('vault:unlock', callback);
    ipcRenderer.on('vault:lock', callback);
    ipcRenderer.on('vault:status', callback);
    ipcRenderer.on('tools:secret-sauce', callback);
    ipcRenderer.on('tools:logs', callback);
    ipcRenderer.on('tools:mcp', callback);
    ipcRenderer.on('file:import', callback);
    ipcRenderer.on('file:export', callback);
  },
  
  // Remove listeners
  removeMenuListeners: () => {
    ipcRenderer.removeAllListeners('vault:create');
    ipcRenderer.removeAllListeners('vault:unlock');
    ipcRenderer.removeAllListeners('vault:lock');
    ipcRenderer.removeAllListeners('vault:status');
    ipcRenderer.removeAllListeners('tools:secret-sauce');
    ipcRenderer.removeAllListeners('tools:logs');
    ipcRenderer.removeAllListeners('tools:mcp');
    ipcRenderer.removeAllListeners('file:import');
    ipcRenderer.removeAllListeners('file:export');
  }
}); 