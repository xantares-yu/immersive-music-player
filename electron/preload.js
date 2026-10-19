/**
 * Aetheria Sound · Preload Security Bridge
 * Safely exposes desktop native APIs to the renderer process via contextBridge.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,

  // Window Controls
  windowControls: {
    minimize: () => ipcRenderer.send('window-control', 'minimize'),
    maximize: () => ipcRenderer.send('window-control', 'maximize'),
    close: () => ipcRenderer.send('window-control', 'close'),
    togglePin: () => ipcRenderer.invoke('window-control-pin'),
    toggleFullscreen: () => ipcRenderer.invoke('window-toggle-fullscreen'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    isPinned: () => ipcRenderer.invoke('window-is-pinned'),
    isFullscreen: () => ipcRenderer.invoke('window-is-fullscreen')
  },

  // State Change Listeners
  onWindowStateChange: (callback) => {
    if (typeof callback !== 'function') return;
    const handler = (event, data) => callback(data);
    ipcRenderer.on('window-state-changed', handler);
    return () => ipcRenderer.removeListener('window-state-changed', handler);
  },

  // Global Shortcut Listener
  onGlobalShortcut: (callback) => {
    if (typeof callback !== 'function') return;
    const handler = (event, data) => callback(data);
    ipcRenderer.on('global-shortcut-trigger', handler);
    return () => ipcRenderer.removeListener('global-shortcut-trigger', handler);
  },

  // Native File Dialogs
  nativeDialog: {
    selectAudioFiles: () => ipcRenderer.invoke('dialog-select-files'),
    selectAudioFolder: () => ipcRenderer.invoke('dialog-select-folder')
  },

  // Sync state to system tray & window title
  updatePlaybackState: (state) => {
    ipcRenderer.send('playback-state-update', state);
  }
});
