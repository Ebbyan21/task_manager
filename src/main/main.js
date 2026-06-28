'use strict';

const path = require('path');
const { app, BrowserWindow, ipcMain, Notification, shell, globalShortcut } = require('electron');

const isDev = process.env.NODE_ENV === 'development';
const envPath = isDev
  ? path.join(__dirname, '../../.env')
  : path.join(process.resourcesPath, '.env');

require('dotenv').config({ path: envPath });

const { autoUpdater, setMainWindow } = require('./updater');

app.setPath('userData', path.join(app.getPath('appData'), 'StudioDalangPelo'));

if (isDev) {
  app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication,GpuDiskCache');
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:     1366,
    height:    768,
    minWidth:  1024,
    minHeight: 600,
    frame:     false,
    backgroundColor: '#0F0F1A',
    show: false,
    icon: path.join(__dirname, '../renderer/assets/images/icon.png'),
    webPreferences: {
      preload:          path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
      devTools:         true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    setMainWindow(mainWindow); // ← daftarkan ke updater
  });

  mainWindow.on('maximize',   () => mainWindow.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized', false));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    setMainWindow(null);
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register('CommandOrControl+=', () => {
    if (!mainWindow) return;
    mainWindow.webContents.setZoomFactor(Math.min(mainWindow.webContents.getZoomFactor() + 0.1, 2.0));
  });
  globalShortcut.register('CommandOrControl+Plus', () => {
    if (!mainWindow) return;
    mainWindow.webContents.setZoomFactor(Math.min(mainWindow.webContents.getZoomFactor() + 0.1, 2.0));
  });
  globalShortcut.register('CommandOrControl+-', () => {
    if (!mainWindow) return;
    mainWindow.webContents.setZoomFactor(Math.max(mainWindow.webContents.getZoomFactor() - 0.1, 0.5));
  });
  globalShortcut.register('CommandOrControl+0', () => {
    if (!mainWindow) return;
    mainWindow.webContents.setZoomFactor(1.0);
  });

  if (!isDev) autoUpdater.checkForUpdatesAndNotify();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());

ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);

ipcMain.on('notify:send', (event, { title, body, urgency }) => {
  if (!Notification.isSupported()) return;
  const notification = new Notification({
    title:   title   || 'Studio WFH Manager',
    body:    body    || 'Ada pembaruan baru.',
    icon:    path.join(__dirname, '../renderer/assets/images/icon.png'),
    urgency: urgency || 'normal',
    silent:  false,
  });
  notification.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  notification.show();
});

ipcMain.handle('env:get', () => ({
  SUPABASE_URL:      process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
}));

ipcMain.on('shell:openExternal', (event, url) => {
  if (typeof url === 'string' && url.startsWith('http')) shell.openExternal(url);
});

// IPC: updater — install sekarang saat user konfirmasi
ipcMain.on('updater:install', () => {
  autoUpdater.quitAndInstall();
});