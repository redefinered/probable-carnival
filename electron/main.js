const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const storage = require('./storageLogic');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 920,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    title: 'Storage Manager',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('storage:scan', () => {
  try {
    return storage.runFullScan();
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('storage:cleanCaches', (_, paths) => {
  try {
    return storage.cleanCaches(paths);
  } catch (e) {
    return { ok: false, message: e.message };
  }
});

ipcMain.handle('storage:cleanNpm', () => storage.runNpmCacheClean());
ipcMain.handle('storage:cleanDocker', () => storage.runDockerPrune());
ipcMain.handle('storage:cleanSimulators', () => storage.runSimulatorDeleteUnavailable());
ipcMain.handle('storage:cleanCursorBackup', () => storage.runCursorBackupDelete());
