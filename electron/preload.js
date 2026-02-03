const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('storageApi', {
  scan: () => ipcRenderer.invoke('storage:scan'),
  cleanCaches: (paths) => ipcRenderer.invoke('storage:cleanCaches', paths),
  cleanNpm: () => ipcRenderer.invoke('storage:cleanNpm'),
  cleanDocker: () => ipcRenderer.invoke('storage:cleanDocker'),
  cleanSimulators: () => ipcRenderer.invoke('storage:cleanSimulators'),
  cleanCursorBackup: () => ipcRenderer.invoke('storage:cleanCursorBackup'),
});
