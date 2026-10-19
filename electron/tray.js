/**
 * Aetheria Sound · System Tray Controller
 * Manages notification area icon, right-click context menu, and quick player controls.
 */
const { Tray, Menu, app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

class TrayManager {
  constructor(getMainWindow) {
    this.getMainWindow = getMainWindow;
    this.tray = null;
    this.currentTrack = {
      title: 'Aetheria Sound',
      artist: '沉浸式流光音乐',
      isPlaying: false
    };
  }

  init() {
    try {
      const icoPath = path.join(__dirname, 'assets', 'app.ico');
      const pngPath = path.join(__dirname, 'assets', 'icon.png');
      let trayIcon;

      if (fs.existsSync(icoPath)) {
        trayIcon = nativeImage.createFromPath(icoPath);
      } else if (fs.existsSync(pngPath)) {
        trayIcon = nativeImage.createFromPath(pngPath).resize({ width: 16, height: 16 });
      } else {
        trayIcon = nativeImage.createEmpty();
      }

      this.tray = new Tray(trayIcon);
      this.tray.setToolTip('Aetheria Sound · 沉浸式流光音乐');

      // Click to toggle window
      this.tray.on('click', () => {
        this.toggleWindow();
      });

      this.updateContextMenu();
    } catch (err) {
      console.warn('[TrayManager] Tray initialization warning (non-fatal):', err.message);
    }
  }

  toggleWindow() {
    const win = this.getMainWindow();
    if (!win || win.isDestroyed()) return;

    if (win.isVisible() && !win.isMinimized() && win.isFocused()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  }

  updatePlaybackState(trackInfo = {}) {
    if (trackInfo.title) this.currentTrack.title = trackInfo.title;
    if (trackInfo.artist) this.currentTrack.artist = trackInfo.artist;
    if (typeof trackInfo.isPlaying === 'boolean') this.currentTrack.isPlaying = trackInfo.isPlaying;

    if (this.tray && !this.tray.isDestroyed()) {
      const statusText = this.currentTrack.isPlaying ? '▶ 正在播放' : '⏸ 已暂停';
      this.tray.setToolTip(`Aetheria Sound · [${statusText}]\n${this.currentTrack.title} - ${this.currentTrack.artist}`);
      this.updateContextMenu();
    }
  }

  updateContextMenu() {
    if (!this.tray || this.tray.isDestroyed()) return;

    const win = this.getMainWindow();
    const isAlwaysOnTop = win && !win.isDestroyed() ? win.isAlwaysOnTop() : false;
    const playLabel = this.currentTrack.isPlaying ? '⏸ 暂停' : '▶ 播放';

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `🎵 ${this.currentTrack.title} - ${this.currentTrack.artist}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: playLabel,
        click: () => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('global-shortcut-trigger', { action: 'toggle-play' });
          }
        }
      },
      {
        label: '⏭ 下一首',
        click: () => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('global-shortcut-trigger', { action: 'next-track' });
          }
        }
      },
      {
        label: '⏮ 上一首',
        click: () => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('global-shortcut-trigger', { action: 'prev-track' });
          }
        }
      },
      { type: 'separator' },
      {
        label: '🪟 显示主窗口',
        click: () => {
          if (win && !win.isDestroyed()) {
            win.show();
            win.focus();
          }
        }
      },
      {
        label: '📌 窗口置顶',
        type: 'checkbox',
        checked: isAlwaysOnTop,
        click: (item) => {
          if (win && !win.isDestroyed()) {
            win.setAlwaysOnTop(item.checked);
            win.webContents.send('window-pin-change', { isPinned: item.checked });
          }
        }
      },
      { type: 'separator' },
      {
        label: '❌ 退出 Aetheria Sound',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  destroy() {
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

module.exports = TrayManager;
