/**
 * Aetheria Sound · Window State Manager
 * Persists window size, position, and maximize state across sessions.
 * Guarantees window never opens off-screen even if secondary monitors are disconnected.
 */
const { screen, app } = require('electron');
const fs = require('fs');
const path = require('path');

class WindowStateManager {
  constructor(options = {}) {
    this.defaultWidth = options.defaultWidth || 1280;
    this.defaultHeight = options.defaultHeight || 820;
    this.minWidth = options.minWidth || 960;
    this.minHeight = options.minHeight || 640;
    
    this.stateFile = path.join(app.getPath('userData'), 'aetheria-window-state.json');
    this.state = this.loadState();
    this.saveTimeout = null;
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const raw = fs.readFileSync(this.stateFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (this.isValidState(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[WindowStateManager] Error loading window state, falling back to defaults:', e.message);
    }
    return {
      width: this.defaultWidth,
      height: this.defaultHeight,
      isMaximized: false,
      isPinned: false
    };
  }

  isValidState(state) {
    if (!state || typeof state.width !== 'number' || typeof state.height !== 'number') {
      return false;
    }
    // Check if bounds fall within any connected display
    if (state.x !== undefined && state.y !== undefined) {
      const displays = screen.getAllDisplays();
      const visible = displays.some(display => {
        const { x, y, width, height } = display.bounds;
        return (
          state.x >= x - 20 &&
          state.y >= y - 20 &&
          state.x + state.width <= x + width + 20 &&
          state.y + state.height <= y + height + 20
        );
      });
      if (!visible) return false;
    }
    return true;
  }

  manage(win) {
    this.win = win;

    const saveHandler = () => {
      if (!this.win) return;
      clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        try {
          if (this.win.isDestroyed()) return;
          const isMaximized = this.win.isMaximized();
          this.state.isMaximized = isMaximized;
          this.state.isPinned = this.win.isAlwaysOnTop();

          if (!isMaximized && !this.win.isMinimized()) {
            const bounds = this.win.getBounds();
            this.state.x = bounds.x;
            this.state.y = bounds.y;
            this.state.width = bounds.width;
            this.state.height = bounds.height;
          }
          fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
        } catch (err) {
          console.warn('[WindowStateManager] Failed to save state:', err.message);
        }
      }, 500);
    };

    win.on('resize', saveHandler);
    win.on('move', saveHandler);
    win.on('close', saveHandler);
  }

  getState() {
    return {
      width: Math.max(this.minWidth, this.state.width || this.defaultWidth),
      height: Math.max(this.minHeight, this.state.height || this.defaultHeight),
      x: this.state.x,
      y: this.state.y,
      isMaximized: !!this.state.isMaximized,
      isPinned: !!this.state.isPinned
    };
  }
}

module.exports = WindowStateManager;
