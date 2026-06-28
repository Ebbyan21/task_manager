'use strict';

const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let _mainWindow = null;

exports.setMainWindow = (win) => { _mainWindow = win; };

const send = (channel, data) => {
  _mainWindow?.webContents?.send(channel, data);
};

autoUpdater.on('checking-for-update', () => {
  log.info('[Updater] Mengecek update...');
});

autoUpdater.on('update-available', (info) => {
  log.info(`[Updater] Update tersedia: v${info.version}`);
  send('updater:status', { type: 'available', version: info.version });
});

autoUpdater.on('update-not-available', () => {
  log.info('[Updater] Tidak ada update.');
});

autoUpdater.on('download-progress', (progress) => {
  send('updater:status', { type: 'progress', percent: Math.round(progress.percent) });
});

autoUpdater.on('update-downloaded', (info) => {
  log.info(`[Updater] Update v${info.version} siap diinstall.`);
  send('updater:status', { type: 'downloaded', version: info.version });
});

autoUpdater.on('error', (err) => {
  log.error('[Updater] Error:', err?.message || err);
});

module.exports = { autoUpdater, setMainWindow: exports.setMainWindow };