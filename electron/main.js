/**
 * Aetheria Sound · Desktop Client Master Controller
 * Production-grade Electron Main Process
 * Features:
 *   - Direct3D 11/12 GPU Hardware Acceleration
 *   - WASAPI Low-Latency Audio Pipeline (anti-background throttling)
 *   - Custom Frameless Glass Window & Window State Memory
 *   - Single-Instance Lock
 *   - OS-wide Global Media Shortcuts
 *   - System Tray with Context Menu & Tooltip Sync
 *   - Streaming local-audio protocol for native audio files
 */

const { app, BrowserWindow, ipcMain, protocol, net, nativeImage } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const WindowStateManager = require('./window-state');
const ServerManager = require('./server-manager');
const ShortcutManager = require('./shortcuts');
const TrayManager = require('./tray');
const NativeLibraryEngine = require('./native-library');

// ==========================================
// 1. Hardware Acceleration & Audio Flags
// ==========================================
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
// Low latency audio buffer for crisp beat synchronization
app.commandLine.appendSwitch('audio-buffer-size', '512');
// Expand V8 heap size for smooth 1080P canvas and WebGL rendering
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048');
// Prevent Chromium from freezing timers or audio processing in background
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// ==========================================
// 2. Custom Protocol Privileges
// ==========================================
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-audio',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
      bypassCSP: true
    }
  }
]);

// ==========================================
// 3. Single Instance Guard
// ==========================================
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Exiting...');
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Global References
let mainWindow = null;
let windowStateManager = null;
let serverManager = null;
let shortcutManager = null;
let trayManager = null;
let nativeLibrary = null;

// ==========================================
// 4. Create Main Application Window
// ==========================================
async function createMainWindow() {
  windowStateManager = new WindowStateManager({
    defaultWidth: 1280,
    defaultHeight: 820,
    minWidth: 980,
    minHeight: 640
  });

  const savedState = windowStateManager.getState();
  const iconPath = path.join(__dirname, 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    x: savedState.x,
    y: savedState.y,
    width: savedState.width,
    height: savedState.height,
    minWidth: 980,
    minHeight: 640,
    frame: false, // Frameless design
    show: true,  // Immediate show to guarantee window visibility
    backgroundColor: '#0a0a10',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Enable desktop audio streaming and CDN cross-origin assets
      spellcheck: false
    }
  });

  windowStateManager.manage(mainWindow);

  if (savedState.isMaximized) {
    mainWindow.maximize();
  }
  if (savedState.isPinned) {
    mainWindow.setAlwaysOnTop(true);
  }

  // Graceful Show & Focus
  mainWindow.show();
  mainWindow.focus();
  notifyWindowState();

  // Track window events for renderer state sync
  mainWindow.on('maximize', () => notifyWindowState());
  mainWindow.on('unmaximize', () => notifyWindowState());
  mainWindow.on('focus', () => notifyWindowState());

  mainWindow.on('enter-full-screen', () => notifyWindowState());
  mainWindow.on('leave-full-screen', () => notifyWindowState());

  mainWindow.on('closed', () => {
    mainWindow = null;
    serverManager?.shutdown();
    app.quit();
    setTimeout(() => {
      process.exit(0);
    }, 200);
  });

  const showWindowSafely = () => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
      notifyWindowState();
    }
  };

  mainWindow.once('ready-to-show', showWindowSafely);
  mainWindow.webContents.on('did-finish-load', showWindowSafely);
  mainWindow.webContents.on('did-fail-load', (event, code, desc) => {
    console.error(`[Main] Load URL warning: ${code} - ${desc}`);
    showWindowSafely();
  });
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2) {
      console.warn(`[Renderer] ${message} (${sourceId}:${line})`);
    }
  });
  setTimeout(showWindowSafely, 2000);

  // Clear Chromium cache to ensure latest JS assets are always loaded
  try {
    const { session } = require('electron');
    if (session.defaultSession) {
      await session.defaultSession.clearCache();
    }
  } catch (e) {}

  // Ensure Backend Server is ready and load URL
  serverManager = new ServerManager(8080);
  const serverUrl = await serverManager.ensureServer();
  console.log(`[Main] Loading player from ${serverUrl}`);

  try {
    await mainWindow.loadURL(serverUrl);
  } catch (err) {
    console.warn('[Main] loadURL caught error:', err.message);
    showWindowSafely();
  }
}

function notifyWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('window-state-changed', {
    isMaximized: mainWindow.isMaximized(),
    isPinned: mainWindow.isAlwaysOnTop(),
    isFullscreen: mainWindow.isFullScreen()
  });
}

// ==========================================
// 5. IPC Handlers
// ==========================================
function setupIpcHandlers() {
  ipcMain.on('window-control', (event, action) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    switch (action) {
      case 'minimize':
        mainWindow.minimize();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        notifyWindowState();
        break;
      case 'close':
        mainWindow.close();
        break;
    }
  });

  ipcMain.handle('window-control-pin', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    const nextPinned = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(nextPinned);
    notifyWindowState();
    trayManager?.updateContextMenu();
    return nextPinned;
  });

  ipcMain.handle('window-toggle-fullscreen', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    const nextFS = !mainWindow.isFullScreen();
    mainWindow.setFullScreen(nextFS);
    notifyWindowState();
    return nextFS;
  });

  ipcMain.handle('window-is-fullscreen', () => {
    return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isFullScreen() : false;
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
  });

  ipcMain.handle('window-is-pinned', () => {
    return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isAlwaysOnTop() : false;
  });

  ipcMain.handle('dialog-select-files', async () => {
    return await nativeLibrary.selectAudioFiles();
  });

  ipcMain.handle('dialog-select-folder', async () => {
    return await nativeLibrary.selectAudioFolder();
  });

  ipcMain.on('playback-state-update', (event, trackInfo) => {
    trayManager?.updatePlaybackState(trackInfo);
    updateTaskbarThumbar(trackInfo?.isPlaying);
  });
}

// Windows 10/11 Taskbar Thumbnail Toolbar (SMTC Taskbar Playback)
let thumbarIcons = null;
function getThumbarIcons() {
  if (thumbarIcons) return thumbarIcons;
  try {
    const prevSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20" fill="#ffffff"/><line x1="5" y1="19" x2="5" y2="5" stroke="#ffffff" stroke-width="2.5"/></svg>';
    const playSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4" fill="#ffffff"/></svg>';
    const pauseSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="#ffffff"/><rect x="14" y="4" width="4" height="16" fill="#ffffff"/></svg>';
    const nextSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4" fill="#ffffff"/><line x1="19" y1="5" x2="19" y2="19" stroke="#ffffff" stroke-width="2.5"/></svg>';

    thumbarIcons = {
      prev: nativeImage.createFromBuffer(Buffer.from(prevSvg)),
      play: nativeImage.createFromBuffer(Buffer.from(playSvg)),
      pause: nativeImage.createFromBuffer(Buffer.from(pauseSvg)),
      next: nativeImage.createFromBuffer(Buffer.from(nextSvg))
    };
  } catch (err) {
    console.warn('[Main] Failed to create thumbar SVG icons:', err);
  }
  return thumbarIcons;
}

function updateTaskbarThumbar(isPlaying = false) {
  if (process.platform !== 'win32' || !mainWindow || mainWindow.isDestroyed()) return;
  try {
    const icons = getThumbarIcons();
    if (!icons) return;

    mainWindow.setThumbarButtons([
      {
        tooltip: '上一首 (Global Media Prev)',
        icon: icons.prev,
        click: () => mainWindow.webContents.send('global-shortcut-trigger', { action: 'prev-track' })
      },
      {
        tooltip: isPlaying ? '暂停 (Global Media Pause)' : '播放 (Global Media Play)',
        icon: isPlaying ? icons.pause : icons.play,
        click: () => mainWindow.webContents.send('global-shortcut-trigger', { action: 'toggle-play' })
      },
      {
        tooltip: '下一首 (Global Media Next)',
        icon: icons.next,
        click: () => mainWindow.webContents.send('global-shortcut-trigger', { action: 'next-track' })
      }
    ]);
  } catch (err) {
    // Windows thumbar rate-limit guard
  }
}

// ==========================================
// 6. Application Lifecycle
// ==========================================
app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(false);
  } else {
    createMainWindow();
  }
});

app.whenReady().then(async () => {
  // Protocol handler for streaming local audio files
  protocol.handle('local-audio', (request) => {
    try {
      const parsedUrl = new URL(request.url);
      const filePath = decodeURIComponent(parsedUrl.host + parsedUrl.pathname);
      return net.fetch(pathToFileURL(filePath).toString());
    } catch (err) {
      console.warn('[Protocol local-audio error]:', err);
      return new Response('File not found', { status: 404 });
    }
  });

  nativeLibrary = new NativeLibraryEngine(() => mainWindow);
  setupIpcHandlers();

  await createMainWindow();

  // Initialize Shortcuts & Tray
  shortcutManager = new ShortcutManager(() => mainWindow);
  shortcutManager.registerAll();

  trayManager = new TrayManager(() => mainWindow);
  try {
    trayManager.init();
  } catch (err) {
    console.warn('[Main] Tray init ignored:', err.message);
  }

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed() || BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('child-process-gone', (event, details) => {
  console.warn(`[Process] Child process (${details.type}) exited with code ${details.exitCode}: ${details.reason}`);
});

app.on('render-process-gone', (event, webContents, details) => {
  console.warn(`[Process] Render process gone: ${details.reason} (code: ${details.exitCode})`);
  if (details.reason !== 'clean-exit' && details.reason !== 'killed') {
    webContents.reload();
  }
});

app.on('will-quit', () => {
  shortcutManager?.unregisterAll();
  trayManager?.destroy();
  serverManager?.shutdown();
  setTimeout(() => process.exit(0), 200);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    serverManager?.shutdown();
    app.quit();
    setTimeout(() => process.exit(0), 200);
  }
});
