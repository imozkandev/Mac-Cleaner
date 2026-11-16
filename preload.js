/**
 * preload.js - Secure Electron Preload Bridge
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openInFinder: (filePath) => ipcRenderer.invoke('open-in-finder', filePath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  openMainWindow: () => ipcRenderer.invoke('open-main-window'),
  quitApp: () => ipcRenderer.invoke('quit-app')
});
