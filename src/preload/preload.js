'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  getEnv: () => ipcRenderer.invoke('env:get'),

  window: {
    minimize:    () => ipcRenderer.send('window:minimize'),
    maximize:    () => ipcRenderer.send('window:maximize'),
    close:       () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximized: (cb) => ipcRenderer.on('window:maximized', (_, val) => cb(val)),
  },

  notify: (payload) => ipcRenderer.send('notify:send', payload),
  openExternal: (url) => ipcRenderer.send('shell:openExternal', url),

  // ─── AUTO UPDATER ─────────────────────────
  updater: {
    onStatus: (cb) => ipcRenderer.on('updater:status', (_, data) => cb(data)),
    install:  () => ipcRenderer.send('updater:install'),
  },
});