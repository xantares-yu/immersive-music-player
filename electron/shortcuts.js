/**
 * Aetheria Sound · Global Shortcuts Manager
 * Registers OS-wide media shortcuts and sends actions to the active window.
 */
const { globalShortcut } = require('electron');

class ShortcutManager {
  constructor(getMainWindow) {
    this.getMainWindow = getMainWindow;
    this.registeredKeys = [];
  }

  registerAll() {
    const shortcuts = [
      {
        accelerators: ['MediaPlayPause', 'CommandOrControl+Alt+Space', 'Alt+Space'],
        action: 'toggle-play',
        description: '播放 / 暂停'
      },
      {
        accelerators: ['MediaNextTrack', 'CommandOrControl+Shift+Right', 'CommandOrControl+Alt+]', 'CommandOrControl+Alt+Right'],
        action: 'next-track',
        description: '下一首'
      },
      {
        accelerators: ['MediaPreviousTrack', 'CommandOrControl+Shift+Left', 'CommandOrControl+Alt+[', 'CommandOrControl+Alt+Left'],
        action: 'prev-track',
        description: '上一首'
      },
      {
        accelerators: ['MediaStop'],
        action: 'stop',
        description: '停止播放'
      },
      {
        accelerators: ['VolumeUp', 'CommandOrControl+Shift+Up', 'CommandOrControl+Alt+=', 'CommandOrControl+Alt+Up'],
        action: 'volume-up',
        description: '音量 +5%'
      },
      {
        accelerators: ['VolumeDown', 'CommandOrControl+Shift+Down', 'CommandOrControl+Alt+-', 'CommandOrControl+Alt+Down'],
        action: 'volume-down',
        description: '音量 -5%'
      },
      {
        accelerators: ['VolumeMute', 'CommandOrControl+Alt+M'],
        action: 'toggle-mute',
        description: '静音切换'
      }
    ];

    shortcuts.forEach(({ accelerators, action, description }) => {
      let registeredCount = 0;
      for (const accelerator of accelerators) {
        try {
          const success = globalShortcut.register(accelerator, () => {
            const win = this.getMainWindow();
            if (win && !win.isDestroyed()) {
              win.webContents.send('global-shortcut-trigger', { action });
            }
          });

          if (success) {
            this.registeredKeys.push(accelerator);
            registeredCount++;
          }
        } catch (err) {
          // ignore unsupported accelerators on specific OS
        }
      }
      if (registeredCount > 0) {
        console.log(`[ShortcutManager] Registered ${registeredCount} keys for: ${description}`);
      } else {
        console.warn(`[ShortcutManager] Could not register any global shortcut for: ${description}`);
      }
    });
  }

  unregisterAll() {
    this.registeredKeys.forEach(acc => {
      try {
        globalShortcut.unregister(acc);
      } catch (e) {
        // ignore
      }
    });
    this.registeredKeys = [];
    console.log('[ShortcutManager] All global shortcuts unregistered');
  }
}

module.exports = ShortcutManager;
