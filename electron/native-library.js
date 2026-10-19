/**
 * Aetheria Sound · Native Audio Library Engine
 * Uses native OS dialogs to select local tracks or scan entire music directories recursively.
 */
const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');

const SUPPORTED_EXTENSIONS = new Set([
  '.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg', '.opus', '.wma', '.alac'
]);

class NativeLibraryEngine {
  constructor(getMainWindow) {
    this.getMainWindow = getMainWindow;
  }

  /**
   * Open native file picker for individual songs
   */
  async selectAudioFiles() {
    const win = this.getMainWindow();
    const result = await dialog.showOpenDialog(win, {
      title: '选择本地音频文件 - Aetheria Sound',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '音频文件 (Audio Files)', extensions: ['mp3', 'flac', 'wav', 'm4a', 'aac', 'ogg', 'opus'] },
        { name: '所有文件 (*.*)', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePaths.length) {
      return [];
    }

    return result.filePaths.map(filePath => {
      const ext = path.extname(filePath).toLowerCase();
      const baseName = path.basename(filePath, ext);
      let size = 0;
      try { size = fs.statSync(filePath).size; } catch (e) {}

      return {
        filePath,
        title: baseName,
        ext,
        size,
        // local-audio protocol URL for streaming
        streamUrl: `local-audio://${encodeURIComponent(filePath)}`
      };
    });
  }

  /**
   * Open directory picker and recursively scan music folder
   */
  async selectAudioFolder() {
    const win = this.getMainWindow();
    const result = await dialog.showOpenDialog(win, {
      title: '扫描本地音乐文件夹 - Aetheria Sound',
      properties: ['openDirectory']
    });

    if (result.canceled || !result.filePaths.length) {
      return [];
    }

    const folderPath = result.filePaths[0];
    const foundTracks = [];

    const scanDir = (dir) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (SUPPORTED_EXTENSIONS.has(ext)) {
              let size = 0;
              try { size = fs.statSync(fullPath).size; } catch (e) {}
              foundTracks.push({
                filePath: fullPath,
                title: path.basename(entry.name, ext),
                ext,
                size,
                streamUrl: `local-audio://${encodeURIComponent(fullPath)}`
              });
            }
          }
        }
      } catch (err) {
        console.warn(`[NativeLibrary] Error reading directory ${dir}:`, err.message);
      }
    };

    scanDir(folderPath);
    console.log(`[NativeLibrary] Scanned ${folderPath}, found ${foundTracks.length} audio files`);
    return foundTracks;
  }
}

module.exports = NativeLibraryEngine;
