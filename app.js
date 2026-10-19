/**
 * Aetheria Sound · Masterpiece Interactive Audio & Lyric Engine
 * Implements: Web Audio API, WebGL GLSL Fluid Shader, Raycast Command Palette, Lyric Card Export
 */

(function () {
  'use strict';

  // ==========================================
  // ==========================================
  // 1. Initial Curated Tracklist & Persistent Storage
  // ==========================================
  const STORAGE_PLAYLIST_KEY = 'aetheria_saved_playlist';

  function savePlaylistToStorage() {
    try {
      if (!Array.isArray(PLAYLIST)) return;
      if (PLAYLIST.length === 0) {
        localStorage.removeItem(STORAGE_PLAYLIST_KEY);
        const drawerCountEl = document.getElementById('playlist-drawer-count');
        if (drawerCountEl) drawerCountEl.textContent = '共 0 首';
        const playlistCountEl = document.getElementById('playlist-count');
        if (playlistCountEl) playlistCountEl.textContent = '0';
        return;
      }
      const serializable = PLAYLIST.map(track => {
        const copy = { ...track };
        if (copy.id && copy.id.startsWith('local_')) {
          copy.audioUrl = 'indexeddb:' + copy.id;
        } else if (copy.audioUrl && (
          copy.audioUrl.startsWith('blob:') ||
          copy.audioUrl.startsWith('/api/proxy') ||
          copy.audioUrl.includes('music.126.net') ||
          copy.audioUrl.includes('music.163.com')
        )) {
          delete copy.audioUrl;
        }
        return copy;
      });
      localStorage.setItem(STORAGE_PLAYLIST_KEY, JSON.stringify(serializable));
      const drawerCountEl = document.getElementById('playlist-drawer-count');
      if (drawerCountEl) drawerCountEl.textContent = `共 ${PLAYLIST.length} 首`;
      const playlistCountEl = document.getElementById('playlist-count');
      if (playlistCountEl) playlistCountEl.textContent = PLAYLIST.length;
    } catch (e) {
      console.warn('Failed to save playlist to localStorage:', e);
    }
  }

  function loadPlaylistFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_PLAYLIST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach(track => {
            if (track.id && track.id.startsWith('local_')) {
              // Local track audio blob restored via AetheriaDB
            } else if (track.audioUrl && !track.audioUrl.startsWith('indexeddb:')) {
              // Delete stale audio URL so track dynamically resolves with NetEase priority
              delete track.audioUrl;
            }
          });
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load playlist from localStorage:', e);
    }
    return null;
  }

  // ==========================================
  // 1.1 IndexedDB Storage Engine for Local Audio
  // ==========================================
  const AetheriaDB = {
    dbName: 'AetheriaAudioDB',
    dbVersion: 1,
    storeName: 'local_audio_tracks',
    db: null,

    async getDB() {
      if (this.db) return this.db;
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(this.dbName, this.dbVersion);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id' });
          }
        };
        req.onsuccess = (e) => {
          this.db = e.target.result;
          resolve(this.db);
        };
        req.onerror = (e) => reject(e.target.error);
      });
    },

    async saveTrackAudio(id, fileOrBlob, metadata = {}) {
      try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          const record = {
            id,
            blob: fileOrBlob,
            name: fileOrBlob.name || metadata.title || 'audio.mp3',
            type: fileOrBlob.type || 'audio/mpeg',
            metadata,
            updatedAt: Date.now()
          };
          const putReq = store.put(record);
          putReq.onsuccess = () => resolve(true);
          putReq.onerror = (e) => reject(e.target.error);
        });
      } catch (err) {
        console.warn('[AetheriaDB save error]:', err);
        return false;
      }
    },

    async getTrackAudio(id) {
      try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result ? req.result.blob : null);
          req.onerror = (e) => reject(e.target.error);
        });
      } catch (err) {
        console.warn('[AetheriaDB get error]:', err);
        return null;
      }
    },

    async deleteTrackAudio(id) {
      try {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          const req = store.delete(id);
          req.onsuccess = () => resolve(true);
          req.onerror = (e) => reject(e.target.error);
        });
      } catch (err) {
        console.warn('[AetheriaDB delete error]:', err);
        return false;
      }
    },

    async restoreLocalAudioUrls(playlist) {
      if (!Array.isArray(playlist)) return;
      for (const track of playlist) {
        if (track && track.id && track.id.startsWith('local_')) {
          const blob = await this.getTrackAudio(track.id);
          if (blob) {
            track.audioUrl = URL.createObjectURL(blob);
          }
        }
      }
    }
  };

  // ==========================================
  // 1.2 Pure In-Browser ID3v2 & FLAC Tag Parser
  // ==========================================
  const AudioMetadataReader = {
    async parseFile(file) {
      const result = {
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: '本地音乐',
        album: '本地媒体库',
        coverUrl: null
      };

      try {
        const sliceSize = Math.min(file.size, 512 * 1024);
        const buffer = await file.slice(0, sliceSize).arrayBuffer();
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);

        // ID3v2 Tag Signature
        if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
          const version = bytes[3];
          const tagSize = ((bytes[6] & 0x7F) << 21) |
                          ((bytes[7] & 0x7F) << 14) |
                          ((bytes[8] & 0x7F) << 7) |
                          (bytes[9] & 0x7F);

          let offset = 10;
          const maxOffset = Math.min(sliceSize, 10 + tagSize);

          while (offset < maxOffset - 10) {
            if (bytes[offset] === 0) break;
            const frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
            let frameSize = 0;

            if (version === 4) {
              frameSize = ((bytes[offset + 4] & 0x7F) << 21) |
                          ((bytes[offset + 5] & 0x7F) << 14) |
                          ((bytes[offset + 6] & 0x7F) << 7) |
                          (bytes[offset + 7] & 0x7F);
            } else {
              frameSize = view.getUint32(offset + 4);
            }

            if (frameSize <= 0 || offset + 10 + frameSize > buffer.byteLength) break;
            const frameData = bytes.subarray(offset + 10, offset + 10 + frameSize);

            if (frameId === 'TIT2') {
              const text = this.decodeText(frameData);
              if (text) result.title = text;
            } else if (frameId === 'TPE1' || frameId === 'TPE2') {
              const text = this.decodeText(frameData);
              if (text && result.artist === '本地音乐') result.artist = text;
            } else if (frameId === 'TALB') {
              const text = this.decodeText(frameData);
              if (text) result.album = text;
            } else if (frameId === 'APIC') {
              const pic = this.decodePicture(frameData);
              if (pic && !result.coverUrl) result.coverUrl = pic;
            }

            offset += 10 + frameSize;
          }
        }
      } catch (err) {
        console.warn('ID3 tag parse notice:', err);
      }

      return result;
    },

    decodeText(frameData) {
      if (!frameData || frameData.length < 2) return '';
      const encoding = frameData[0];
      const textBytes = frameData.subarray(1);

      try {
        if (encoding === 0) {
          let str = '';
          for (let i = 0; i < textBytes.length; i++) {
            if (textBytes[i] === 0) break;
            str += String.fromCharCode(textBytes[i]);
          }
          return str.trim();
        } else if (encoding === 1) {
          return new TextDecoder('utf-16').decode(textBytes).replace(/\0/g, '').trim();
        } else if (encoding === 2) {
          return new TextDecoder('utf-16be').decode(textBytes).replace(/\0/g, '').trim();
        } else if (encoding === 3) {
          return new TextDecoder('utf-8').decode(textBytes).replace(/\0/g, '').trim();
        }
      } catch (e) {}

      return '';
    },

    decodePicture(frameData) {
      try {
        const encoding = frameData[0];
        let pos = 1;
        let mime = '';

        while (pos < frameData.length && frameData[pos] !== 0) {
          mime += String.fromCharCode(frameData[pos]);
          pos++;
        }
        pos++;

        if (!mime) mime = 'image/jpeg';
        else if (mime === 'image/jpg') mime = 'image/jpeg';

        pos++; // Skip picture type byte

        // Skip description
        if (encoding === 1 || encoding === 2) {
          while (pos < frameData.length - 1 && !(frameData[pos] === 0 && frameData[pos + 1] === 0)) {
            pos += 2;
          }
          pos += 2;
        } else {
          while (pos < frameData.length && frameData[pos] !== 0) {
            pos++;
          }
          pos++;
        }

        if (pos < frameData.length) {
          const imgBytes = frameData.subarray(pos);
          const blob = new Blob([imgBytes], { type: mime });
          return URL.createObjectURL(blob);
        }
      } catch (e) {}
      return null;
    }
  };

  const DEFAULT_CURATED_TRACKS = [
    {
      id: 'jvke_goldenhour',
      title: 'Golden Hour',
      artist: 'JVKE',
      album: 'this is what ____ feels like',
      genre: 'POP / PIANO / INDIE',
      cover: '/covers/jvke_goldenhour_static.jpg',
      theme: {
        accent: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.45)',
        meshColors: ['#d97706', '#ea580c', '#3b82f6']
      }
    },
    {
      id: 'theweeknd_starboy',
      title: 'Starboy',
      artist: 'The Weeknd ft. Daft Punk',
      album: 'Starboy',
      genre: 'R&B / ELECTROPOP',
      cover: '/covers/theweeknd_starboy_static.jpg',
      theme: {
        accent: '#3b82f6',
        glow: 'rgba(59, 130, 246, 0.45)',
        meshColors: ['#1d4ed8', '#7c3aed', '#ec4899']
      }
    },
    {
      id: 'theweeknd_blindinglights',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      genre: 'SYNTHWAVE / RETRO POP',
      cover: '/covers/theweeknd_blindinglights_static.jpg',
      theme: {
        accent: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.45)',
        meshColors: ['#b91c1c', '#f59e0b', '#7c3aed']
      }
    },
    {
      id: 'taylor_cruelsummer',
      title: 'Cruel Summer',
      artist: 'Taylor Swift',
      album: 'Lover',
      genre: 'SYNTH-POP',
      cover: '/covers/taylor_cruelsummer_static.jpg',
      theme: {
        accent: '#ec4899',
        glow: 'rgba(236, 72, 153, 0.45)',
        meshColors: ['#db2777', '#8b5cf6', '#06b6d4']
      }
    },
    {
      id: 'beyond_haikuotiankong',
      title: '海阔天空',
      artist: 'Beyond · 黄家驹',
      album: '乐与怒',
      genre: 'CLASSIC ROCK / CANTONESE',
      cover: '/covers/beyond_haikuotiankong_static.jpg',
      theme: {
        accent: '#06b6d4',
        glow: 'rgba(6, 182, 212, 0.45)',
        meshColors: ['#0891b2', '#3b82f6', '#10b981']
      }
    }
  ];

  const savedUserPlaylist = loadPlaylistFromStorage();
  let PLAYLIST = (savedUserPlaylist && savedUserPlaylist.length > 0)
    ? savedUserPlaylist
    : [...DEFAULT_CURATED_TRACKS];
  window.PLAYLIST = PLAYLIST;

  // Restore IndexedDB audio streams for local tracks asynchronously
  if (PLAYLIST && PLAYLIST.length > 0) {
    AetheriaDB.restoreLocalAudioUrls(PLAYLIST).then(() => {
      const cur = PLAYLIST[currentTrackIndex];
      if (cur && cur.id && cur.id.startsWith('local_') && cur.audioUrl) {
        if (!audioEl.src || audioEl.src.includes('localhost') && !audioEl.src.includes('blob:')) {
          audioEl.src = cur.audioUrl;
        }
      }
    });
  }

  window.AetheriaDB = AetheriaDB;
  window.AudioMetadataReader = AudioMetadataReader;

  // ==========================================
  // 2. Global State Variables
  // ==========================================
  let currentTrackIndex = 0;
  let isPlaying = false;
  let isMuted = false;
  let currentVolume = 0.8;
  let parsedLyrics = [];
  let currentLyricIndex = -1;
  let userScrolledRecently = false;
  let userScrollTimeout = null;
  let playMode = 'list';
  let currentLayoutMode = 'split';
  let isVisualizerEnabled = true;
  let isSoundstageActive = false;

  // Web Audio Context & Nodes
  let audioCtx = null;
  let analyser = null;
  let synthGain = null;
  let synthFilter = null;
  let bassBoostFilter = null;
  let eqFilters = [];
  let synthInterval = null;
  let visualizerDataArray = null;

  // 5-Band Equalizer Presets (Master Audio Processing)
  const EQ_PRESETS = [
    { key: 'flat', name: '原声监听', tag: 'FLAT', color: 'text-white/80', gains: [0, 0, 0, 0, 0] },
    { key: 'bass', name: '重低音', tag: 'BASS', color: 'text-amber-400', gains: [5.5, 3.5, 0, -1.0, 1.0] },
    { key: 'vocal', name: '清澈人声', tag: 'VOCAL', color: 'text-emerald-400', gains: [-2.0, -1.0, 3.5, 4.0, 2.0] },
    { key: 'electronic', name: '动感电音', tag: 'EDM', color: 'text-purple-400', gains: [4.5, 2.5, -1.5, 2.5, 4.0] },
    { key: 'acoustic', name: '温暖民谣', tag: 'ACOUSTIC', color: 'text-sky-400', gains: [1.0, 2.0, 1.5, 2.0, 2.5] }
  ];
  let currentEQIndex = 0;

  // Procedural Timeline
  let proceduralDuration = 180;
  let proceduralCurrentTime = 0;
  let proceduralTimer = null;

  // DOM Elements Cache
  const audioEl = document.getElementById('audio-player');
  const ambientCoverBack = document.getElementById('ambient-cover-back');
  const ambientCoverFront = document.getElementById('ambient-cover-front');

  const topMiniCover = document.getElementById('top-mini-cover');
  const topSongDesc = document.getElementById('top-song-desc');
  const coverImage = document.getElementById('cover-image');
  const vinylCenterImg = document.getElementById('vinyl-center-img');
  const vinylDisc = document.getElementById('vinyl-disc');
  const coverCard = document.getElementById('cover-card');
  const coverAmbientGlow = document.getElementById('cover-ambient-glow');
  const motionCoverVideo = document.getElementById('motion-cover-video');
  const motionBadge = document.getElementById('motion-badge');
  const veoMotionBtn = document.getElementById('veo-motion-btn');
  const veoMotionModal = document.getElementById('veo-motion-modal');
  let motionCoversMap = {};
  const songTitle = document.getElementById('song-title');
  const songArtist = document.getElementById('song-artist');
  const songAlbum = document.getElementById('song-album');
  const songMetaDot = document.getElementById('song-meta-dot');
  const genreBadge = document.getElementById('genre-badge');
  const trackNumberBadge = document.getElementById('track-number-badge');

  // Bottom Dock Mini Track Info (Immersive Lyric Mode)
  const dockMiniTrackInfo = document.getElementById('dock-mini-track-info');
  const dockMiniCover = document.getElementById('dock-mini-cover');
  const dockMiniTitle = document.getElementById('dock-mini-title');
  const dockMiniArtist = document.getElementById('dock-mini-artist');
  const dockMiniVinyl = document.getElementById('dock-mini-vinyl');

  const lyricsList = document.getElementById('lyrics-list');
  const lyricsContainer = document.getElementById('lyrics-container');
  const resumeScrollBtn = document.getElementById('resume-scroll-btn');
  const amllLyricsRoot = document.getElementById('amll-lyrics-root');
  const amllBgRoot = document.getElementById('amll-bg-root');

  // Spotify Canvas Looping Motion Background Instances & Controls
  const canvasAmbientVideo = document.getElementById('canvas-ambient-video');
  const spotifyCanvasBtn = document.getElementById('spotify-canvas-btn');
  const spotifyCanvasModal = document.getElementById('spotify-canvas-modal');
  const closeCanvasModalBtn = document.getElementById('close-canvas-modal-btn');
  const closeCanvasBtn = document.getElementById('close-canvas-btn');
  const canvasCurrentSongBadge = document.getElementById('canvas-current-song-badge');
  const canvasStatusText = document.getElementById('canvas-status-text');
  const toggleCanvasAmbient = document.getElementById('toggle-canvas-ambient');
  const toggleCanvasSleeve = document.getElementById('toggle-canvas-sleeve');
  const canvasBlurSlider = document.getElementById('canvas-blur-slider');
  const canvasBlurVal = document.getElementById('canvas-blur-val');
  const canvasOpacitySlider = document.getElementById('canvas-opacity-slider');
  const canvasOpacityVal = document.getElementById('canvas-opacity-val');
  const customCanvasInput = document.getElementById('custom-canvas-input');
  const applyCustomCanvasBtn = document.getElementById('apply-custom-canvas-btn');
  const autoBindCanvasBtn = document.getElementById('auto-bind-canvas-btn');

  let isCanvasAmbientEnabled = true;
  let isCanvasSleeveEnabled = true;

  // AMLL Official Core Player & WebGL Mesh Gradient Background Instances
  let amllPlayer = null;
  let amllBg = null;
  let lastAmllFrameTime = performance.now();

  // Controls
  const playBtn = document.getElementById('play-btn');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const progressHandle = document.getElementById('progress-handle');
  const currentTimeEl = document.getElementById('current-time');
  const durationTimeEl = document.getElementById('duration-time');
  const hoverTooltip = document.getElementById('hover-tooltip');

  const volumeBtn = document.getElementById('volume-btn');
  const volumeBar = document.getElementById('volume-bar');
  const volumeSliderBox = document.getElementById('volume-slider-box');

  const playModeBtn = document.getElementById('play-mode-btn');
  const playModeIcon = document.getElementById('play-mode-icon');
  const soundstageBtn = document.getElementById('soundstage-btn');
  const visualizerToggleBtn = document.getElementById('visualizer-toggle-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  const playlistToggleBtn = document.getElementById('playlist-toggle-btn');
  const playlistDrawer = document.getElementById('playlist-drawer');
  const closePlaylistBtn = document.getElementById('close-playlist-btn');
  const playlistItems = document.getElementById('playlist-items');

  const modeDashboardBtn = document.getElementById('mode-dashboard-btn');
  const modeLyricBtn = document.getElementById('mode-lyric-btn');
  const modeSplitBtn = document.getElementById('mode-split-btn');

  // Modals & Triggers
  const searchTriggerBtn = document.getElementById('search-trigger-btn');
  const commandPaletteModal = document.getElementById('command-palette-modal');
  const searchInput = document.getElementById('search-input');
  const searchResultsList = document.getElementById('search-results-list');
  const searchSpinner = document.getElementById('search-spinner');
  const chartTagBtns = document.querySelectorAll('.chart-tag-btn');

  const shareCardBtn = document.getElementById('share-card-btn');
  const cardShareModal = document.getElementById('card-share-modal');
  const closeCardModalBtn = document.getElementById('close-card-modal-btn');
  const downloadCardBtn = document.getElementById('download-card-btn');
  const cardBgCover = document.getElementById('card-bg-cover');
  const cardArtThumb = document.getElementById('card-art-thumb');
  const cardSongTitle = document.getElementById('card-song-title');
  const cardSongArtist = document.getElementById('card-song-artist');
  const cardLyricChinese = document.getElementById('card-lyric-chinese');
  const cardLyricTrans = document.getElementById('card-lyric-trans');

  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('help-modal');
  const closeHelpBtn = document.getElementById('close-help-btn');
  const localFileInput = document.getElementById('local-file-input');

  // ==========================================
  // 3. Audio Stream Formatter (CORS Audio Proxy for FFT Analysis)
  // ==========================================
  function formatAudioStreamUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return rawUrl || '';
    if (
      rawUrl.startsWith('/api/proxy') ||
      rawUrl.startsWith('blob:') ||
      rawUrl.startsWith('data:') ||
      rawUrl.startsWith('./') ||
      rawUrl.startsWith('/') ||
      rawUrl.startsWith('http://localhost') ||
      rawUrl.startsWith('http://127.0.0.1')
    ) {
      return rawUrl;
    }
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return `/api/proxy?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  }

  // ==========================================
  // 3. In-Browser Algorithmic Drum Beat & Dynamic Resonance Detector
  // ==========================================
  const BeatDetector = {
    historyBuffer: new Float32Array(60), // ~1.0s statistical baseline window
    historyIdx: 0,
    historyCount: 0,
    prevKickEnergy: 0,
    prevSnareEnergy: 0,
    lastKickTime: 0,
    lastSnareTime: 0,
    kickImpulse: 0,
    snareImpulse: 0,
    detectedBPM: 78,
    lastBeatIntervals: [],
    currentWeight: 1.0, // Dynamic velocity: 0.25 (ghost note / 轻拍) to 2.5 (heavy drop / 重拍)
    lastProcessTime: 0,
    lastResult: null,

    process(freqArray, nowMs, currentTime, song) {
      // Frame-level memoization: Avoid recomputing multiple times within the same RAF tick
      if (this.lastProcessTime === nowMs && this.lastResult) {
        return this.lastResult;
      }
      this.lastProcessTime = nowMs;

      let isKick = false;
      let isSnare = false;
      let rawKickEnergy = 0;
      let rawSnareEnergy = 0;
      let hasRealAudioSignal = false;
      let beatWeight = 1.0;

      // 1. Analyze Real-Time FFT Spectrum
      if (freqArray && freqArray.length >= 10) {
        // Bin 0 (~43Hz), Bin 1 (~86Hz), Bin 2 (~129Hz): Sub-Bass & Deep Kick Drum
        const b0 = freqArray[0] || 0;
        const b1 = freqArray[1] || 0;
        const b2 = freqArray[2] || 0;
        const b3 = freqArray[3] || 0;
        rawKickEnergy = (b0 * 1.5 + b1 * 1.25 + b2 * 0.95 + b3 * 0.4) / (4.1 * 255);

        // Bins 4-9 (~170Hz - 430Hz): Snare body, claps & punch transients
        let snareSum = 0;
        for (let i = 4; i <= 9; i++) snareSum += freqArray[i] || 0;
        rawSnareEnergy = snareSum / (6.0 * 255);

        if (rawKickEnergy > 0.015 || rawSnareEnergy > 0.018) {
          hasRealAudioSignal = true;
        }
      }

      if (hasRealAudioSignal) {
        // Moving average and variance across rolling history
        const buf = this.historyBuffer;
        buf[this.historyIdx] = rawKickEnergy;
        this.historyIdx = (this.historyIdx + 1) % buf.length;
        if (this.historyCount < buf.length) this.historyCount++;

        let mean = 0;
        for (let i = 0; i < this.historyCount; i++) mean += buf[i];
        mean /= this.historyCount;

        let variance = 0;
        for (let i = 0; i < this.historyCount; i++) {
          const diff = buf[i] - mean;
          variance += diff * diff;
        }
        const stdDev = Math.sqrt(variance / this.historyCount);

        // Spectral Flux (First-order derivative dE/dt - instantaneous transient attack)
        const kickFlux = Math.max(0, rawKickEnergy - this.prevKickEnergy);
        const snareFlux = Math.max(0, rawSnareEnergy - this.prevSnareEnergy);

        // Adaptive Dynamic Threshold with anti-lockout ceiling
        // Cap the baseline mean at 0.38 so continuous sub-bass or 808 lines don't lock out drum kicks
        const dynamicBase = Math.min(mean, 0.38);
        const kickThreshold = dynamicBase + Math.max(0.024, 0.95 * stdDev);

        // Kick Drum Transient Detection:
        // Exceeds adaptive threshold with attack flux OR sharp transient attack kicks in even during loud passages
        const isTimeSeparated = (nowMs - this.lastKickTime > 135);
        if (((rawKickEnergy > kickThreshold && kickFlux > 0.012) || (kickFlux > 0.036)) && isTimeSeparated) {
          isKick = true;

          // Dynamic velocity / weight calculation (轻重强弱)
          const excessRatio = (rawKickEnergy - mean) / (stdDev + 0.008);
          const fluxRatio = kickFlux * 5.5;
          const absRatio = rawKickEnergy * 1.5;

          // Weight spectrum:
          // Soft / ghost note (轻拍): 0.35 ~ 0.6
          // Standard groove kick (中拍): 0.8 ~ 1.3
          // Heavy bass drop / downbeat crash (重拍): 1.6 ~ 2.5+
          beatWeight = Math.min(2.5, Math.max(0.35, excessRatio * 0.42 + fluxRatio * 0.42 + absRatio * 0.45));
          this.currentWeight = beatWeight;

          // Scale kick impulse with dynamic weight - instant attack
          const strength = Math.min(1.0, 0.48 + beatWeight * 0.38);
          this.kickImpulse = Math.max(this.kickImpulse, strength);

          // Real-time BPM extraction
          if (this.lastKickTime > 0) {
            const interval = nowMs - this.lastKickTime;
            if (interval >= 240 && interval <= 1350) {
              this.lastBeatIntervals.push(interval);
              if (this.lastBeatIntervals.length > 8) this.lastBeatIntervals.shift();
              const avgInterval = this.lastBeatIntervals.reduce((a, b) => a + b, 0) / this.lastBeatIntervals.length;
              this.detectedBPM = Math.round(60000 / avgInterval);
            }
          }
          this.lastKickTime = nowMs;
        }

        // Snare / Clap transient
        if (rawSnareEnergy > mean * 1.35 + 0.06 && snareFlux > 0.028 && (nowMs - this.lastSnareTime > 200)) {
          isSnare = true;
          const snareWeight = Math.min(2.0, Math.max(0.3, rawSnareEnergy * 2.2 + snareFlux * 4.2));
          this.snareImpulse = Math.min(1.0, 0.38 + snareWeight * 0.35);
          this.lastSnareTime = nowMs;
        }

        // Dynamic continuous bass floor tracker: ensures continuous basslines resonate even between discrete kicks
        if (typeof this.bassFloor !== 'number') this.bassFloor = 0;
        this.bassFloor += (rawKickEnergy - this.bassFloor) * 0.05;

        this.prevKickEnergy = rawKickEnergy;
        this.prevSnareEnergy = rawSnareEnergy;

      } else {
        // 2. Intelligent Rhythm Matrix Algorithm (CORS / Zero-signal / Synthesizer Fallback)
        // Multi-bar dynamic musical groove structure (downbeat accents, ghost taps, phrase variations)
        const bpm = (song?.arrangement?.bpm) || this.detectedBPM || 78;
        const beatSec = 60 / bpm;
        const barSec = beatSec * 4;
        const timeInPhrase = (currentTime % (barSec * 4)); // 4-bar phrase (16 beats)
        const barInPhrase = Math.floor(timeInPhrase / barSec); // 0, 1, 2, 3
        const timeInBar = (timeInPhrase % barSec);
        const beatNum = Math.floor(timeInBar / beatSec); // 0, 1, 2, 3
        const timeInBeat = (timeInBar % beatSec);
        const beatPhase = timeInBeat / beatSec;

        let plannedKick = false;
        let plannedSnare = false;
        let plannedWeight = 1.0;

        if (timeInBeat < 0.075) {
          if (beatNum === 0) {
            // Beat 1: Heavy Downbeat Kick (重拍)
            plannedKick = true;
            plannedWeight = (barInPhrase === 0 || barInPhrase === 3) ? 2.0 : 1.4;
          } else if (beatNum === 1) {
            // Beat 2: Snare backbeat (轻/中)
            plannedSnare = true;
            plannedWeight = 0.85;
          } else if (beatNum === 2) {
            // Beat 3: Syncopated Kick (中拍)
            plannedKick = true;
            plannedWeight = (barInPhrase === 2) ? 1.6 : 0.95;
          } else if (beatNum === 3) {
            // Beat 4: Snare or build (中/重)
            plannedSnare = true;
            plannedWeight = (barInPhrase === 3) ? 1.3 : 0.75;
          }
        } else if (timeInBeat > beatSec * 0.48 && timeInBeat < beatSec * 0.55) {
          // Offbeat syncopation / ghost note (微弱轻拍)
          if (barInPhrase >= 1 && (beatNum === 1 || beatNum === 2)) {
            plannedKick = true;
            plannedWeight = 0.42;
          }
        }

        if (plannedKick && (nowMs - this.lastKickTime > 150)) {
          isKick = true;
          beatWeight = plannedWeight;
          this.currentWeight = beatWeight;
          this.kickImpulse = Math.min(1.0, 0.40 + beatWeight * 0.35);
          this.lastKickTime = nowMs;
        }

        if (plannedSnare && (nowMs - this.lastSnareTime > 180)) {
          isSnare = true;
          this.snareImpulse = Math.min(1.0, 0.30 + plannedWeight * 0.40);
          this.lastSnareTime = nowMs;
        }

        rawKickEnergy = Math.max(0, 1.0 - beatPhase * 3.5) * (this.currentWeight * 0.45);
      }

      // 3. Exponential Physical Decay
      this.kickImpulse *= 0.85;
      this.snareImpulse *= 0.82;

      // Direct continuous bass punch: sub-bass energy above tracking floor
      const directBassPunch = hasRealAudioSignal
        ? Math.max(0, rawKickEnergy - (this.bassFloor || 0) * 0.65)
        : 0;

      const combinedImpulse = Math.min(1.0, Math.max(this.kickImpulse, directBassPunch * 1.35, this.snareImpulse * 0.70));

      this.lastResult = {
        isKick,
        isSnare,
        rawEnergy: rawKickEnergy,
        impulse: combinedImpulse,
        weight: this.currentWeight, // Current dynamic strength (0.25 - 2.5)
        bpm: this.detectedBPM
      };
      return this.lastResult;
    }
  };

  // ==========================================
  // 3. Web Audio Synthesis & Bass Reactor
  // ==========================================
  let audioElSource = null;

  function initWebAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();

      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.16;
      visualizerDataArray = new Uint8Array(analyser.frequencyBinCount);

      synthGain = audioCtx.createGain();
      synthGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);

      synthFilter = audioCtx.createBiquadFilter();
      synthFilter.type = 'lowpass';
      synthFilter.frequency.setValueAtTime(2400, audioCtx.currentTime);

      // 5-Band Studio Parametric Equalizer Chain
      eqFilters = [];
      const eqFrequencies = [60, 250, 1000, 4000, 12000];
      eqFrequencies.forEach((freq, idx) => {
        const filter = audioCtx.createBiquadFilter();
        if (idx === 0) {
          filter.type = 'lowshelf';
        } else if (idx === eqFrequencies.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.setValueAtTime(1.1, audioCtx.currentTime);
        }
        filter.frequency.setValueAtTime(freq, audioCtx.currentTime);
        const gainVal = EQ_PRESETS[currentEQIndex].gains[idx] || 0;
        filter.gain.setValueAtTime(gainVal, audioCtx.currentTime);
        eqFilters.push(filter);
      });

      for (let i = 0; i < eqFilters.length - 1; i++) {
        eqFilters[i].connect(eqFilters[i + 1]);
      }

      bassBoostFilter = audioCtx.createBiquadFilter();
      bassBoostFilter.type = 'lowshelf';
      bassBoostFilter.frequency.setValueAtTime(200, audioCtx.currentTime);
      bassBoostFilter.gain.setValueAtTime(2.2, audioCtx.currentTime);

      eqFilters[eqFilters.length - 1].connect(bassBoostFilter);
      bassBoostFilter.connect(analyser);
      analyser.connect(audioCtx.destination);

      synthGain.connect(synthFilter);
      synthFilter.connect(eqFilters[0]);
    }

    if (!audioElSource && audioCtx && audioEl) {
      try {
        audioElSource = audioCtx.createMediaElementSource(audioEl);
        if (eqFilters && eqFilters.length > 0) {
          audioElSource.connect(eqFilters[0]);
        } else {
          audioElSource.connect(bassBoostFilter);
        }
      } catch (err) {
        console.warn('AudioElement WebAudio pipe notice:', err);
      }
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // ==========================================
  // 3. Audio Stream Management
  // ==========================================
  function startProceduralMusic(song) {
    stopProceduralMusic();
  }

  function stopProceduralMusic() {
    if (synthInterval) {
      clearInterval(synthInterval);
      synthInterval = null;
    }
    if (proceduralTimer) {
      clearInterval(proceduralTimer);
      proceduralTimer = null;
    }
  }

  // ==========================================
  // 4. Track Loading & Synchronization
  // ==========================================
  // Generate a high-end procedural vinyl SVG data URL as aesthetic fallback cover
  function getAestheticPlaceholderCover(title = 'Aetheria', artist = 'Sound') {
    const rawChar = (title || 'A').trim().charAt(0).toUpperCase();
    const char = /[a-zA-Z0-9\u4e00-\u9fa5]/.test(rawChar) ? rawChar : 'A';
    const palettes = [
      ['#3b82f6', '#1d4ed8'],
      ['#8b5cf6', '#6d28d9'],
      ['#ec4899', '#be185d'],
      ['#f59e0b', '#b45309'],
      ['#10b981', '#047857'],
      ['#06b6d4', '#0e7490']
    ];
    const code = char.charCodeAt(0) || 65;
    const pair = palettes[code % palettes.length];

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="100%" height="100%">
      <defs>
        <radialGradient id="vDisc" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#24242e"/>
          <stop offset="45%" stop-color="#141419"/>
          <stop offset="90%" stop-color="#0a0a0d"/>
          <stop offset="100%" stop-color="#050507"/>
        </radialGradient>
        <linearGradient id="vLabel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${pair[0]}"/>
          <stop offset="100%" stop-color="${pair[1]}"/>
        </linearGradient>
      </defs>
      <rect width="320" height="320" fill="#09090c"/>
      <circle cx="160" cy="160" r="150" fill="url(#vDisc)" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
      <circle cx="160" cy="160" r="135" fill="none" stroke="rgba(255,255,255,0.035)" stroke-width="1.2"/>
      <circle cx="160" cy="160" r="115" fill="none" stroke="rgba(255,255,255,0.035)" stroke-width="1.2"/>
      <circle cx="160" cy="160" r="95" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1.2"/>
      <circle cx="160" cy="160" r="62" fill="url(#vLabel)" stroke="rgba(255,255,255,0.25)" stroke-width="2.5"/>
      <circle cx="160" cy="160" r="18" fill="#09090c" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      <circle cx="160" cy="160" r="6" fill="#ffffff" opacity="0.85"/>
      <text x="160" y="152" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${char}</text>
      <text x="160" y="196" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="7.5" font-weight="700" fill="rgba(255,255,255,0.9)" letter-spacing="1.5" text-anchor="middle">HI-RES AUDIO</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  // Gemini Veo 3.1 & Spotify Canvas Motion Artwork Engine
  function checkAndApplyMotionCover(songObj) {
    if (!songObj || !coverCard) return;

    const songId = songObj.id || (songObj.neteaseId ? `netease_${songObj.neteaseId}` : null);
    let videoUrl = songObj.spotifyCanvas || songObj.motionVideo || null;

    if (!videoUrl && songId && motionCoversMap[songId]) {
      videoUrl = motionCoversMap[songId].video;
    }
    if (!videoUrl && songObj.id && motionCoversMap[songObj.id]) {
      videoUrl = motionCoversMap[songObj.id].video;
    }

    if (videoUrl) {
      // 1. Acrylic Cover Sleeve Motion Video
      if (motionCoverVideo) {
        if (isCanvasSleeveEnabled) {
          if (motionCoverVideo.getAttribute('src') !== videoUrl) {
            motionCoverVideo.src = videoUrl;
            motionCoverVideo.muted = true;
            motionCoverVideo.loop = true;
            motionCoverVideo.load();
          }
          coverCard.classList.add('has-motion-cover');
          motionCoverVideo.play().catch(() => {});
          if (motionBadge) motionBadge.classList.remove('opacity-0');
        } else {
          coverCard.classList.remove('has-motion-cover');
          try { motionCoverVideo.pause(); } catch (e) {}
        }
      }

      // 2. Spotify Canvas Fullscreen Cinematic Ambient Looping Video
      if (canvasAmbientVideo) {
        if (isCanvasAmbientEnabled) {
          if (canvasAmbientVideo.getAttribute('src') !== videoUrl) {
            canvasAmbientVideo.src = videoUrl;
            canvasAmbientVideo.muted = true;
            canvasAmbientVideo.loop = true;
            canvasAmbientVideo.load();
          }
          document.body.classList.add('has-canvas-bg');
          if (isPlaying) {
            canvasAmbientVideo.play().catch(() => {});
          }
        } else {
          document.body.classList.remove('has-canvas-bg');
          try { canvasAmbientVideo.pause(); } catch (e) {}
        }
      }
    } else {
      if (motionCoverVideo) {
        coverCard.classList.remove('has-motion-cover');
        try { motionCoverVideo.pause(); } catch (e) {}
        motionCoverVideo.removeAttribute('src');
      }

      if (canvasAmbientVideo) {
        document.body.classList.remove('has-canvas-bg');
        try { canvasAmbientVideo.pause(); } catch (e) {}
        canvasAmbientVideo.removeAttribute('src');
      }

      // Proactively fetch official Spotify Canvas loop
      fetchSpotifyCanvas(songObj);
    }
  }

  let activeCanvasFetchingId = null;
  async function fetchSpotifyCanvas(songObj, force = false) {
    if (!songObj) return;
    const songId = songObj.id || (songObj.neteaseId ? `netease_${songObj.neteaseId}` : '');
    const title = songObj.title || '';
    const artist = songObj.artist || '';
    const cover = songObj.cover || '';
    if (!title) return;

    const reqKey = songId || title;
    if (!force && activeCanvasFetchingId === reqKey) return;
    activeCanvasFetchingId = reqKey;

    try {
      const q = `id=${encodeURIComponent(songId)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}&cover=${encodeURIComponent(cover)}`;
      const res = await fetch(`/api/spotify/canvas?${q}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ready' && data.video) {
          songObj.spotifyCanvas = data.video;
          songObj.motionVideo = data.video;
          if (songId) motionCoversMap[songId] = { video: data.video, title, type: data.type || 'spotify_canvas' };
          if (PLAYLIST[currentTrackIndex] === songObj) {
            checkAndApplyMotionCover(songObj);
            if (window.updateCanvasModalUI) window.updateCanvasModalUI();
            const badgeMap = {
              'spotify_canvas': 'Spotify Canvas 官方微动循环',
              'official_music_video': '官方原生 MV 伴读画卷',
              'auto_generated_canvas': 'JIT 8秒无缝微动循环'
            };
            const desc = badgeMap[data.type] || '8秒微动艺术画卷';
            showToast(`🟢 已全自动激活「${songObj.title}」${desc}`, 'music');
          }
        }
      }
    } catch (e) {
      console.warn('[Spotify Canvas] Auto-fetch notice:', e);
    } finally {
      if (activeCanvasFetchingId === reqKey) {
        activeCanvasFetchingId = null;
      }
    }
  }

  // Background Preloader for upcoming songs in the queue
  function preloadUpcomingCanvases() {
    if (!Array.isArray(PLAYLIST) || PLAYLIST.length === 0) return;
    const nextIndices = [
      (currentTrackIndex + 1) % PLAYLIST.length,
      (currentTrackIndex + 2) % PLAYLIST.length
    ];
    nextIndices.forEach(idx => {
      const nextSong = PLAYLIST[idx];
      if (nextSong && !nextSong.spotifyCanvas && !nextSong.motionVideo) {
        setTimeout(() => {
          if (!nextSong.spotifyCanvas && !nextSong.motionVideo) {
            fetchSpotifyCanvas(nextSong);
          }
        }, 1200);
      }
    });
  }

  let currentGeneratingId = null;

  async function triggerAutoMotionCover(songObj) {
    if (!songObj) return;
    const songId = songObj.id || (songObj.neteaseId ? `netease_${songObj.neteaseId}` : null);
    if (!songId) return;
    const safeId = songId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const coverUrl = songObj.cover;
    if (!coverUrl || coverUrl.startsWith('data:image/svg+xml')) return;

    currentGeneratingId = safeId;

    try {
      const apiUrl = `/api/auto-motion-cover?id=${encodeURIComponent(safeId)}&cover=${encodeURIComponent(coverUrl)}&title=${encodeURIComponent(songObj.title || '')}`;
      const res = await fetch(apiUrl);
      if (!res.ok) return;
      const data = await res.json();

      if (data.status === 'ready' && data.video) {
        if (PLAYLIST[currentTrackIndex] === songObj) {
          songObj.motionVideo = data.video;
          motionCoversMap[safeId] = { video: data.video };
          checkAndApplyMotionCover(songObj);
        }
        return;
      }

      // If background rendering, poll every 600ms
      let attempts = 0;
      const pollTimer = setInterval(async () => {
        attempts++;
        if (attempts > 20 || currentGeneratingId !== safeId || PLAYLIST[currentTrackIndex] !== songObj) {
          clearInterval(pollTimer);
          return;
        }

        try {
          const statusRes = await fetch(`/api/motion-cover-status?id=${encodeURIComponent(safeId)}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.status === 'ready' && statusData.video) {
              clearInterval(pollTimer);
              songObj.motionVideo = statusData.video;
              motionCoversMap[safeId] = { video: statusData.video };
              if (PLAYLIST[currentTrackIndex] === songObj) {
                checkAndApplyMotionCover(songObj);
                showToast(`✨「${songObj.title}」动态封面已自动生成并激活！`, 'music');
              }
            }
          }
        } catch (e) {}
      }, 600);

    } catch (e) {
      console.warn('Auto motion cover notice:', e);
    }
  }

  // Globally apply track cover to player, vinyl disc, ambient visuals, and WebGL particle engine
  function applyTrackCover(coverUrl, songObj) {
    if (!coverUrl) return;

    if (songObj) {
      songObj.cover = coverUrl;
      checkAndApplyMotionCover(songObj);
    }

    const miniUrl = (coverUrl && coverUrl.includes('music.126.net'))
      ? (coverUrl.replace(/\?param=\d+y\d+/, '') + '?param=120y120')
      : coverUrl;

    const mainCardUrl = (coverUrl && coverUrl.includes('music.126.net'))
      ? (coverUrl.replace(/\?param=\d+y\d+/, '') + '?param=450y450')
      : coverUrl;

    // 1. Cover Image (Left Card)
    if (coverImage) {
      coverImage.src = mainCardUrl;
    }

    // 2. Vinyl Center Label (Right Turntable)
    if (vinylCenterImg) {
      vinylCenterImg.style.backgroundImage = `url("${miniUrl}")`;
    }
    if (window.CoverMotion) window.CoverMotion.setCover(mainCardUrl, songObj);

    // 3. Mini Cover in Top Navigation Pill & Bottom Dock
    if (topMiniCover) {
      topMiniCover.src = miniUrl;
    }
    if (dockMiniCover) {
      dockMiniCover.src = miniUrl;
    }

    // 4. Ambient Background Cross-fade & AMLL WebGL Mesh Gradient
    if (amllBg && coverUrl) {
      amllBg.setAlbum(coverUrl).catch(() => {});
    }

    if (isVisualizerEnabled) {
      if (ambientCoverBack && ambientCoverFront) {
        ambientCoverBack.style.backgroundImage = `url("${mainCardUrl}")`;
        ambientCoverBack.style.opacity = '0.08';
        ambientCoverFront.style.opacity = '0';
        setTimeout(() => {
          ambientCoverFront.style.backgroundImage = `url("${mainCardUrl}")`;
          ambientCoverFront.style.opacity = '0.08';
          ambientCoverBack.style.opacity = '0';
        }, 300);
      }
    }

    // 5. WebGL 3D Particle Cover Texture
    if (typeof updateParticleCover === 'function') {
      updateParticleCover(coverUrl);
    }

    // 6. Adaptive Glass Ambient Glow (Spicetify / Blossom)
    if (typeof extractAdaptivePalette === 'function') {
      extractAdaptivePalette(coverUrl, (palette) => {
        if (palette && songObj && PLAYLIST[currentTrackIndex] === songObj) {
          songObj.theme = palette;
          applyAdaptivePalette(palette);
        }
      });
    } else if (typeof extractThemeFromCover === 'function') {
      extractThemeFromCover(coverUrl, (extracted) => {
        if (extracted && songObj && PLAYLIST[currentTrackIndex] === songObj) {
          songObj.theme = extracted;
          updateParticleTheme(extracted);
        }
      });
    }

    // 7. Update active item thumbnail in playlist drawer if opened
    const activeDrawerThumb = document.querySelector(`.playlist-row.active img, .playlist-drawer-item.active img`);
    if (activeDrawerThumb) {
      activeDrawerThumb.src = coverUrl;
    }
  }

  function formatAudioStreamUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (!trimmed.startsWith('http')) return trimmed;
    if (trimmed.startsWith('/api/proxy') || trimmed.includes('/api/proxy?url=')) return trimmed;
    if (window.location && window.location.protocol === 'file:') return trimmed;
    return `/api/proxy?url=${encodeURIComponent(trimmed)}`;
  }

  function loadTrack(index, autoPlay = true) {
    if (!PLAYLIST || PLAYLIST.length === 0) {
      currentTrackIndex = -1;
      proceduralCurrentTime = 0;
      currentLyricIndex = -1;
      pauseTrack();
      songTitle.textContent = '暂无播放歌曲';
      if (songArtist) {
        songArtist.textContent = '点击上方「全网搜歌」或导入音乐开始播放';
        songArtist.removeAttribute('data-artist');
      }
      if (songAlbum) {
        songAlbum.textContent = '';
        songAlbum.removeAttribute('data-album');
        songAlbum.removeAttribute('data-artist');
        songAlbum.classList.add('hidden');
      }
      if (songMetaDot) songMetaDot.classList.add('hidden');
      genreBadge.textContent = 'AETHERIA SOUND';
      trackNumberBadge.textContent = '00 / 00';
      if (topSongDesc) topSongDesc.textContent = '播放列表为空';
      parsedLyrics = [{ time: 0, text: '播放列表为空', trans: '点击右上角「全网搜歌」或「导入网易云/本地文件」添加您喜欢的歌曲' }];
      renderLyricsList();
      updatePlaylistDrawerUI();
      const countEl = document.getElementById('playlist-count');
      if (countEl) countEl.textContent = '0';
      const drawerCountEl = document.getElementById('playlist-drawer-count');
      if (drawerCountEl) drawerCountEl.textContent = '共 0 首';
      audioEl.removeAttribute('src');
      try { audioEl.load(); } catch (e) {}
      const defaultPlaceholder = getAestheticPlaceholderCover('Aetheria', 'Sound');
      if (topMiniCover) topMiniCover.src = defaultPlaceholder;
      if (dockMiniCover) dockMiniCover.src = defaultPlaceholder;
      if (dockMiniTitle) dockMiniTitle.textContent = '暂无播放歌曲';
      if (dockMiniArtist) {
        dockMiniArtist.textContent = '未选择歌曲';
        dockMiniArtist.removeAttribute('data-artist');
      }
      coverImage.src = defaultPlaceholder;
      vinylCenterImg.style.backgroundImage = `url("${defaultPlaceholder}")`;
      if (window.CoverMotion) window.CoverMotion.setCover(defaultPlaceholder, null);
      return;
    }

    currentTrackIndex = (index + PLAYLIST.length) % PLAYLIST.length;
    const song = PLAYLIST[currentTrackIndex];
    if (!song) return;

    // Invalidate stale audio URLs (NetEase CDN tokens expire in ~15-20 minutes)
    if (song.audioUrl && (
      (song._audioResolvedAt && (Date.now() - song._audioResolvedAt > 14 * 60 * 1000)) ||
      (song.audioUrl.includes('music.126.net/') && !song._audioResolvedAt)
    )) {
      song.audioUrl = null;
    }
    streamRecoveryRetries = 0;

    proceduralCurrentTime = 0;
    currentLyricIndex = -1;

    // 4. Adaptive Glass Ambient Glow & Theme Tokens
    const theme = song.theme || {
      accent: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.45)',
      meshColors: ['#d97706', '#ea580c', '#3b82f6']
    };

    if (song.theme && typeof applyAdaptivePalette === 'function') {
      applyAdaptivePalette(song.theme);
    } else {
      document.documentElement.style.setProperty('--primary-accent', theme.accent);
      document.documentElement.style.setProperty('--primary-glow', theme.glow);
      if (typeof updateParticleTheme === 'function') {
        updateParticleTheme(theme);
      }
    }

    // High-Resolution Cover Architecture
    const defaultPlaceholder = getAestheticPlaceholderCover(song.title, song.artist);
    const hasGenuineCover = song.cover &&
      !song.cover.includes('unsplash.com') &&
      !song.cover.includes('api.i-meto.com') &&
      !song.cover.startsWith('data:image/svg+xml');

    const activeCover = hasGenuineCover ? song.cover : (song.cover || defaultPlaceholder);

    if (topMiniCover) {
      topMiniCover.onerror = () => { topMiniCover.src = defaultPlaceholder; };
    }
    coverImage.onerror = () => {
      coverImage.src = defaultPlaceholder;
      vinylCenterImg.style.backgroundImage = `url("${defaultPlaceholder}")`;
      if (typeof updateParticleCover === 'function') updateParticleCover(defaultPlaceholder);
    };

    applyTrackCover(activeCover, song);
    if (coverAmbientGlow) {
      coverAmbientGlow.style.background = theme.accent;
    }

    // Automatic Real Album Art Resolution: If song does not have genuine cover, fetch immediately!
    if (!hasGenuineCover && window.AetheriaAPI && window.AetheriaAPI.resolveSongCover) {
      const currentTrackSnapshot = song;
      const targetSource = currentTrackSnapshot.source || 'netease';
      window.AetheriaAPI.resolveSongCover(currentTrackSnapshot, targetSource).then(realCover => {
        if (realCover) {
          currentTrackSnapshot.cover = realCover;
          savePlaylistToStorage();
          if (PLAYLIST[currentTrackIndex] === currentTrackSnapshot) {
            applyTrackCover(realCover, currentTrackSnapshot);
            updateMediaSession(currentTrackSnapshot);
          }
        }
      }).catch(() => {});
    }

    // Metadata text
    songTitle.textContent = song.title;
    if (songArtist) {
      songArtist.textContent = song.artist;
      songArtist.setAttribute('data-artist', song.artist);
    }
    if (dockMiniTitle) {
      dockMiniTitle.textContent = song.title;
      dockMiniTitle.title = song.title;
    }
    if (dockMiniArtist) {
      dockMiniArtist.textContent = song.artist;
      dockMiniArtist.title = song.artist;
      dockMiniArtist.setAttribute('data-artist', song.artist);
    }
    if (dockMiniCover && song.cover) {
      dockMiniCover.src = song.cover;
    }
    if (songAlbum) {
      const albName = song.album || '精选单曲';
      songAlbum.textContent = albName;
      songAlbum.setAttribute('data-album', albName);
      songAlbum.setAttribute('data-artist', song.artist);
      songAlbum.classList.remove('hidden');
    }
    if (songMetaDot) {
      songMetaDot.classList.remove('hidden');
    }
    genreBadge.textContent = song.genre || 'HI-RES AUDIO';
    trackNumberBadge.textContent = `${String(currentTrackIndex + 1).padStart(2, '0')} / ${String(PLAYLIST.length).padStart(2, '0')}`;
    const cleanPrimaryArtist = (song.artist || '').split('·')[0].trim();
    if (topSongDesc) {
      topSongDesc.innerHTML = `<span class="artist-nav-link hover:text-emerald-300 hover:underline cursor-pointer transition-colors" data-artist="${cleanPrimaryArtist}">${cleanPrimaryArtist}</span> · <span>${song.title}</span>`;
    }

    updateMediaSession(song);
    preloadUpcomingCanvases();
    if (typeof updateBentoFeaturedCard === 'function') updateBentoFeaturedCard(song);
    if (typeof renderBentoTrendingList === 'function') renderBentoTrendingList();

    // Parse lyrics with 0ms cache priority & fast multi-node resolution
    const thisTrackIdx = currentTrackIndex;
    const cachedLyrics = (window.AetheriaAPI && window.AetheriaAPI.getSongLyricsFromCache)
      ? window.AetheriaAPI.getSongLyricsFromCache(song)
      : null;

    if (song.lrcPairs && Array.isArray(song.lrcPairs) && song.lrcPairs.length > 0) {
      parsedLyrics = song.lrcPairs;
      renderLyricsList();
    } else if (song.lrc && song.lrc.includes('[')) {
      parsedLyrics = parseLRC(song.lrc, song.tlyric);
      renderLyricsList();
    } else if (cachedLyrics && (cachedLyrics.lrc || cachedLyrics.lrcPairs)) {
      if (cachedLyrics.lrcPairs) {
        parsedLyrics = cachedLyrics.lrcPairs;
      } else {
        parsedLyrics = parseLRC(cachedLyrics.lrc, cachedLyrics.tlyric);
        song.lrc = cachedLyrics.lrc;
        if (cachedLyrics.tlyric) song.tlyric = cachedLyrics.tlyric;
      }
      renderLyricsList();
    } else {
      // Snappy non-blocking placeholder while racing mirrors
      parsedLyrics = [{ time: 0, text: song.title, trans: '正在同步滚动歌词...' }];
      renderLyricsList();

      if (window.AetheriaAPI && window.AetheriaAPI.resolveSongLyrics) {
        window.AetheriaAPI.resolveSongLyrics(song).then((res) => {
          if (currentTrackIndex !== thisTrackIdx) return;
          if (res && res.lrc && res.lrc.includes('[')) {
            song.lrc = res.lrc;
            if (res.tlyric) song.tlyric = res.tlyric;
            parsedLyrics = parseLRC(res.lrc, res.tlyric);
            renderLyricsList();
            syncLyrics(audioEl.currentTime || 0);
          } else {
            // Clean graceful fallback for instrumentals / songs without synced lyrics
            parsedLyrics = [{ time: 0, text: song.title, trans: `${song.artist} · 享受纯净音乐` }];
            renderLyricsList();
          }
        }).catch(() => {
          if (currentTrackIndex === thisTrackIdx) {
            parsedLyrics = [{ time: 0, text: song.title, trans: `${song.artist} · 享受纯净音乐` }];
            renderLyricsList();
          }
        });
      } else {
        parsedLyrics = [{ time: 0, text: song.title, trans: `${song.artist} · 享受纯净音乐` }];
        renderLyricsList();
      }
    }

    // Update playlist drawer & badge
    updatePlaylistDrawerUI();
    document.getElementById('playlist-count').textContent = PLAYLIST.length;

    // Stop any previous audio playback immediately
    try { audioEl.pause(); } catch (e) {}
    stopProceduralMusic();

    // Audio setup with genuine audio stream resolution
    if (song.audioUrl && !song.audioUrl.includes('api.i-meto.com') && !song.audioUrl.includes('types=url')) {
      audioEl.src = formatAudioStreamUrl(song.audioUrl);
      audioEl.load();
      if (autoPlay) {
        playTrack();
      } else {
        pauseTrack();
      }
    } else {
      audioEl.removeAttribute('src');
      try { audioEl.load(); } catch (e) {}
      if (autoPlay) {
        isPlaying = true;
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        document.body.classList.add('is-playing');
        vinylDisc.classList.add('vinyl-playing');
      } else {
        pauseTrack();
      }

      genreBadge.textContent = 'CONNECTING HI-RES...';
      if (window.AetheriaAPI && window.AetheriaAPI.resolveSongAudioUrl) {
        window.AetheriaAPI.resolveSongAudioUrl(song).then((url) => {
          if (currentTrackIndex !== thisTrackIdx) return;
          genreBadge.textContent = song.genre || 'LOSSLESS 24-BIT';
          if (url) {
            song.audioUrl = url;
            const wasPlaying = isPlaying;
            audioEl.src = formatAudioStreamUrl(url);
            audioEl.load();
            if (wasPlaying) {
              audioEl.volume = currentVolume;
              audioEl.play().catch(e => console.warn('Autoplay wait user gesture:', e));
            }
          } else {
            showToast('该歌曲暂无可用完整母带音源', 'warning');
          }
        }).catch(() => {
          if (currentTrackIndex === thisTrackIdx) {
            genreBadge.textContent = song.genre || 'LOSSLESS 24-BIT';
            showToast('网络音源连接超时，请重试', 'warning');
          }
        });
      }
    }
  }

  // ==========================================
  // 4.9 AMLL Apple Music Syllable Karaoke & Typography Engine
  // ==========================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function generateSyllables(text, startTime, lineDuration) {
    if (!text || typeof text !== 'string') return [];
    const trimmed = text.trim();
    if (!trimmed) return [];

    // 1. Check for explicit syllable timestamps, e.g. <00:01.20> or (00:01.20)
    const enhancedRegex = /<(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?>/g;
    if (enhancedRegex.test(trimmed)) {
      enhancedRegex.lastIndex = 0;
      const syls = [];
      let lastIndex = 0;
      let lastTime = startTime;
      let m;
      while ((m = enhancedRegex.exec(trimmed)) !== null) {
        const wordText = trimmed.substring(lastIndex, m.index);
        const min = parseInt(m[1], 10);
        const sec = parseInt(m[2], 10);
        const ms = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const curTime = min * 60 + sec + ms / 1000;
        if (wordText) {
          syls.push({
            text: wordText,
            start: lastTime,
            end: curTime
          });
        }
        lastTime = curTime;
        lastIndex = enhancedRegex.lastIndex;
      }
      const rest = trimmed.substring(lastIndex);
      if (rest) {
        syls.push({
          text: rest,
          start: lastTime,
          end: startTime + lineDuration
        });
      }
      if (syls.length > 0) return syls;
    }

    // 2. Natural CJK & Latin Word-Segmentation Engine
    // CJK characters split individually; Latin words split with trailing space preserved
    const tokenRegex = /([\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]|[A-Za-z0-9'-]+[ \t]*|[^\s\w]+[ \t]*|\s+)/g;
    const tokens = [];
    let match;
    while ((match = tokenRegex.exec(trimmed)) !== null) {
      if (match[0]) tokens.push(match[0]);
    }

    if (tokens.length === 0) {
      tokens.push(trimmed);
    }

    // Singing duration is distributed across ~82% of line duration (18% breathing margin)
    const vocalDuration = Math.max(1.0, Math.min(lineDuration * 0.85, tokens.length * 0.52));
    const tokenCount = tokens.length;
    const avgDuration = vocalDuration / tokenCount;

    let curStart = startTime;
    return tokens.map((token, idx) => {
      // Natural cadence: slightly longer hold for phrase-ending syllable
      const weight = (idx === tokenCount - 1) ? 1.35 : 1.0;
      const stepDur = avgDuration * weight;
      const end = curStart + stepDur;
      const item = {
        text: token,
        start: curStart,
        end: end
      };
      curStart = end;
      return item;
    });
  }

  function parseLRC(lrcText, tlyricText = '') {
    if (!lrcText || typeof lrcText !== 'string') return [];
    const lines = lrcText.split(/\r?\n/);
    const parsed = [];
    const timeRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const timestamps = [];
      let match;
      timeRegex.lastIndex = 0;
      while ((match = timeRegex.exec(line)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        let ms = 0;
        if (match[3]) {
          const msStr = match[3];
          if (msStr.length === 1) ms = parseInt(msStr, 10) * 100;
          else if (msStr.length === 2) ms = parseInt(msStr, 10) * 10;
          else ms = parseInt(msStr.slice(0, 3), 10);
        }
        timestamps.push(min * 60 + sec + ms / 1000);
      }

      if (timestamps.length === 0) continue;

      let cleanText = line.replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, '').trim();
      cleanText = cleanText.replace(/\[[a-zA-Z]+:[^\]]*\]/g, '').trim();
      if (!cleanText) continue;

      for (const t of timestamps) {
        parsed.push({ time: t, text: cleanText, trans: '' });
      }
    }

    // Parse separate translation lyrics if provided
    if (tlyricText && typeof tlyricText === 'string') {
      const tLines = tlyricText.split(/\r?\n/);
      const tMap = [];
      for (const tLine of tLines) {
        const trimT = tLine.trim();
        if (!trimT) continue;
        timeRegex.lastIndex = 0;
        let tMatch;
        const tTimes = [];
        while ((tMatch = timeRegex.exec(trimT)) !== null) {
          const min = parseInt(tMatch[1], 10);
          const sec = parseInt(tMatch[2], 10);
          let ms = 0;
          if (tMatch[3]) {
            const msStr = tMatch[3];
            if (msStr.length === 1) ms = parseInt(msStr, 10) * 100;
            else if (msStr.length === 2) ms = parseInt(msStr, 10) * 10;
            else ms = parseInt(msStr.slice(0, 3), 10);
          }
          tTimes.push(min * 60 + sec + ms / 1000);
        }
        const cleanT = trimT.replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, '').trim();
        if (cleanT) {
          for (const tt of tTimes) {
            tMap.push({ time: tt, trans: cleanT });
          }
        }
      }

      for (const item of parsed) {
        const matchT = tMap.find(m => Math.abs(m.time - item.time) < 0.6);
        if (matchT && matchT.trans) {
          item.trans = matchT.trans;
        }
      }
    }

    parsed.sort((a, b) => a.time - b.time);

    // Merge near-identical bilingual lines with strict Chinese/English ordering
    const merged = [];
    for (let i = 0; i < parsed.length; i++) {
      const cur = parsed[i];
      if (merged.length > 0) {
        const prev = merged[merged.length - 1];
        if (Math.abs(cur.time - prev.time) < 0.35) {
          if (!prev.trans && cur.text !== prev.text) {
            const prevHasZh = /[\u4e00-\u9fa5]/.test(prev.text);
            const curHasZh = /[\u4e00-\u9fa5]/.test(cur.text);
            if (curHasZh && !prevHasZh) {
              prev.trans = prev.text;
              prev.text = cur.text;
            } else {
              prev.trans = cur.text;
            }
            continue;
          }
        }
      }
      merged.push(cur);
    }

    // Compute line duration and generate kinetic syllables
    for (let i = 0; i < merged.length; i++) {
      const cur = merged[i];
      const nextTime = (i < merged.length - 1) ? merged[i + 1].time : (cur.time + 5.5);
      const rawDur = nextTime - cur.time;
      cur.duration = Math.max(1.2, Math.min(rawDur, 9.0));
      cur.syllables = generateSyllables(cur.text, cur.time, cur.duration);
      if (cur.trans) {
        cur.transSyllables = generateSyllables(cur.trans, cur.time, cur.duration);
      }
    }

    return merged;
  }

  // ==========================================
  // 5. AMLL Optical Depth-of-Field (DoF) System
  // ==========================================
  function updateLyricDoF(activeIdx) {
    const allLines = lyricsList.querySelectorAll('.lyric-line');
    if (!allLines.length) return;

    allLines.forEach((el, i) => {
      const dist = Math.abs(i - activeIdx);
      el.classList.remove('active', 'dof-0', 'dof-1', 'dof-2', 'dof-3plus');

      if (dist === 0) {
        el.classList.add('active', 'dof-0');
      } else {
        if (dist === 1) {
          el.classList.add('dof-1');
        } else if (dist === 2) {
          el.classList.add('dof-2');
        } else {
          el.classList.add('dof-3plus');
        }

        // Reset progress and syllable states on non-active lines
        el.style.removeProperty('--line-progress');
        const syls = el.querySelectorAll('.amll-syl');
        if (i < activeIdx) {
          syls.forEach(s => {
            s.classList.remove('amll-singing');
            s.classList.add('amll-sung');
            s.style.transform = '';
          });
        } else {
          syls.forEach(s => {
            s.classList.remove('amll-singing', 'amll-sung');
            s.style.transform = '';
          });
        }
      }
    });
  }

  let lyricScrollRaf = null;
  let isProgrammaticScrolling = false;

  function scrollToActiveLyric(force = false) {
    if (userScrolledRecently && !force) return;
    const allLines = lyricsList.querySelectorAll('.lyric-line');
    const activeEl = allLines[currentLyricIndex];
    if (!activeEl || !lyricsContainer) return;

    const containerRect = lyricsContainer.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();
    const relativeTop = activeRect.top - containerRect.top + lyricsContainer.scrollTop;
    const containerHeight = lyricsContainer.clientHeight;
    const lineHeight = activeEl.clientHeight;

    // Apple Music signature sweet-spot: position active line at ~40% of container height
    const targetScroll = Math.max(0, relativeTop - (containerHeight * 0.40) + (lineHeight / 2));

    if (lyricScrollRaf) {
      cancelAnimationFrame(lyricScrollRaf);
      lyricScrollRaf = null;
    }

    const startScroll = lyricsContainer.scrollTop;
    const distance = targetScroll - startScroll;
    if (Math.abs(distance) < 2) return;

    const startTime = performance.now();
    const duration = Math.min(Math.max(Math.abs(distance) * 0.85, 380), 650);

    isProgrammaticScrolling = true;

    function springScroll(now) {
      if (userScrolledRecently && !force) {
        isProgrammaticScrolling = false;
        lyricScrollRaf = null;
        return;
      }
      const p = Math.min((now - startTime) / duration, 1.0);
      // Apple ease-out-quint spring momentum curve
      const ease = 1.0 - Math.pow(1.0 - p, 4.0);
      lyricsContainer.scrollTop = startScroll + distance * ease;
      if (p < 1.0) {
        lyricScrollRaf = requestAnimationFrame(springScroll);
      } else {
        lyricsContainer.scrollTop = targetScroll;
        lyricScrollRaf = null;
        setTimeout(() => {
          isProgrammaticScrolling = false;
        }, 50);
      }
    }
    lyricScrollRaf = requestAnimationFrame(springScroll);
  }

  // ==========================================
  // 5.5 High-End Bilingual Engine: Chinese (pure single line) / Foreign (Line 1: Chinese, Line 2: English)
  // ==========================================
  const BILINGUAL_TRANS_CACHE = new Map();

  function formatBilingualLyric(rawText = '', rawTrans = '') {
    let t1 = (rawText || '').trim();
    let t2 = (rawTrans || '').trim();

    // Check if original text (t1) contains Chinese characters
    const t1HasZh = /[\u4e00-\u9fa5]/.test(t1);
    const t2HasZh = /[\u4e00-\u9fa5]/.test(t2);

    // 1. 中文歌曲: 绝不翻译成英文，纯中文单行展示，去除多余英文
    if (t1HasZh) {
      if (t1.includes(' / ') || t1.includes(' // ') || t1.includes('\n')) {
        const parts = t1.split(/\s*(?:\/{1,2}|\n)\s*/);
        const zhPart = parts.find(p => /[\u4e00-\u9fa5]/.test(p));
        if (zhPart) t1 = zhPart.trim();
      } else if (/\([A-Za-z\s',.-]{3,}\)$/.test(t1)) {
        const match = t1.match(/^(.*?)\s*\([A-Za-z\s',.-]{3,}\)$/);
        if (match && /[\u4e00-\u9fa5]/.test(match[1])) {
          t1 = match[1].trim();
        }
      }
      return { zh: t1, en: '', isChineseSong: true };
    }

    // 2. 外文/英文歌曲: 保持“中文歌词一行，英文歌词一行”对照排版
    let zh = '';
    let en = t1;

    if (t2HasZh) {
      zh = t2;
    }

    return { zh, en, isChineseSong: false };
  }

  // Only translate English/foreign lyrics into Chinese (en2zh); never translate Chinese to English
  async function resolveMissingTranslations(batch, trackIdx) {
    if (!batch || batch.length === 0) return;
    const chunkSize = 8;
    for (let i = 0; i < batch.length; i += chunkSize) {
      if (currentTrackIndex !== trackIdx) return;
      const chunk = batch.slice(i, i + chunkSize);
      const en2zhList = chunk.filter(c => c.type === 'en2zh');

      if (en2zhList.length > 0) {
        try {
          const combined = en2zhList.map(item => item.text.replace(/\n/g, ' ')).join('\n');
          const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(combined)}`);
          if (res.ok) {
            const data = await res.json();
            const translatedFull = data[0].map(s => s[0]).join('');
            const lines = translatedFull.split('\n');
            en2zhList.forEach((item, lIdx) => {
              const transText = (lines[lIdx] || '').trim();
              if (transText) {
                BILINGUAL_TRANS_CACHE.set('en2zh_' + item.text, transText);
                item.item.trans = transText;
                if (item.el && currentTrackIndex === trackIdx) {
                  item.el.textContent = transText;
                }
              }
            });
          }
        } catch (e) {}
      }
    }
  }

  function getAMLL() {
    if (!window.AMLL) return null;
    return window.AMLL.DomLyricPlayer ? window.AMLL : (window.AMLL.default || window.AMLL);
  }

  function initAMLL() {
    const amll = getAMLL();
    if (!amll || !amll.DomLyricPlayer) {
      console.warn('[AMLL] window.AMLL.DomLyricPlayer not loaded yet.');
      return;
    }
    if (!amllLyricsRoot) return;

    try {
      if (!amllPlayer) {
        amllPlayer = new amll.DomLyricPlayer();
        amllPlayer.setWordFadeWidth(1.2); // Apple Music wide fluid liquid sheen (upgraded from 0.5)
        amllPlayer.setEnableSpring(true); // Smooth spring physics
        amllPlayer.setEnableBlur(true);   // Apple 3D depth-of-field optical blur
        amllPlayer.setEnableScale(true);  // Dynamic scale highlighting
        amllPlayer.setAlignPosition(0.38); // 38% focus anchor

        // Interactive Click to Seek on any Lyric Line
        amllPlayer.addEventListener('line-click', (e) => {
          if (e && e.line) {
            const lineObj = e.line.getLine();
            if (lineObj && Number.isFinite(lineObj.startTime)) {
              const targetSec = lineObj.startTime / 1000;
              seekToTime(targetSec);
              userScrolledRecently = false;
              if (userScrollTimeout) clearTimeout(userScrollTimeout);
              resumeScrollBtn.classList.add('hidden');
            }
          }
        });

        amllLyricsRoot.innerHTML = '';
        amllLyricsRoot.appendChild(amllPlayer.getElement());
        window.amllPlayer = amllPlayer;

        // Force initial dimension measurement and layout sync
        const updatePlayerBounds = () => {
          if (!amllPlayer || !amllLyricsRoot) return;
          const rect = amllLyricsRoot.getBoundingClientRect();
          if (rect && rect.height > 0 && Array.isArray(amllPlayer.size)) {
            amllPlayer.size[0] = rect.width;
            amllPlayer.size[1] = rect.height;
          }
          if (typeof amllPlayer.onResize === 'function') {
            amllPlayer.onResize();
          }
        };
        updatePlayerBounds();
        startAMLLLoop();
        console.log('✨ [AMLL] Official Apple Music Sing Core Player engine mounted successfully');
      }
      initAMLLBackground();
    } catch (err) {
      console.error('[AMLL] Failed to initialize DomLyricPlayer:', err);
    }
  }

  function initAMLLBackground() {
    const amll = getAMLL();
    if (!amll || !amll.BackgroundRender || !amll.MeshGradientRenderer) return;
    if (!amllBgRoot || amllBg) return;

    try {
      amllBg = amll.BackgroundRender.new(amll.MeshGradientRenderer);
      amllBg.setFPS(60);
      amllBg.setRenderScale(0.75); // Apple Music high-fidelity rendering scale
      amllBg.setFlowSpeed(3.0);    // Elegant fluid flow speed

      const canvas = amllBg.getElement();
      canvas.id = 'amll-bg-canvas';
      canvas.style.position = 'absolute';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';

      amllBgRoot.innerHTML = '';
      amllBgRoot.appendChild(canvas);
      window.amllBg = amllBg;

      // If current song already has a valid cover, load it into mesh background immediately
      const curSong = PLAYLIST && currentTrackIndex >= 0 ? PLAYLIST[currentTrackIndex] : null;
      if (curSong && curSong.cover) {
        amllBg.setAlbum(curSong.cover).catch(() => {});
      }

      console.log('🌈 [AMLL] Official Apple Music WebGL Mesh Gradient Background engine mounted successfully');
    } catch (err) {
      console.warn('[AMLL] Failed to initialize BackgroundRender:', err);
    }
  }

  let amllRafId = null;
  function startAMLLLoop() {
    if (amllRafId) return;
    let lastTime = performance.now();
    function amllFrame(now) {
      if (amllPlayer) {
        const delta = Math.min(now - lastTime, 100);
        lastTime = now;
        const currTime = audioEl.currentTime || proceduralCurrentTime || 0;
        const timeMs = Math.round(currTime * 1000);
        amllPlayer.setCurrentTime(timeMs);
        amllPlayer.update(delta);
        if (amllPlayer.scrollState && amllPlayer.scrollState.isAutoAlignSuspended) {
          resumeScrollBtn.classList.remove('hidden');
        }
      } else {
        lastTime = now;
      }
      amllRafId = requestAnimationFrame(amllFrame);
    }
    amllRafId = requestAnimationFrame(amllFrame);
  }

  function updateAMLLLyrics(song, parsedList) {
    const amll = getAMLL();
    if (!amllPlayer && amll) initAMLL();
    if (!amllPlayer || !amll) return;
    try {
      const hint = song ? (song.title || '') : '';
      let rawContent = (song && (song.ttml || song.yrc || song.lrc)) || '';
      let tlyric = (song && song.tlyric) || '';

      let amllLines = [];
      let metadata = [];

      if (rawContent && typeof rawContent === 'string' && (rawContent.includes('[') || rawContent.includes('<') || rawContent.includes('<?xml'))) {
        const smartRes = amll.parseLyricSmart(rawContent, hint, tlyric, true);
        amllLines = smartRes.lines || [];
        metadata = smartRes.metadata || [];
      } else if (parsedList && parsedList.length > 0) {
        amllLines = parsedList.map((p, idx) => {
          const nextP = parsedList[idx + 1];
          const startTime = Math.round(p.time * 1000);
          const endTime = nextP ? Math.round(nextP.time * 1000) : startTime + 4000;
          return {
            startTime,
            endTime,
            words: [{ word: p.text || '', startTime, endTime, romanWord: '', obscene: false }],
            translatedLyric: p.trans || '',
            romanLyric: '',
            isBG: false,
            isDuet: false
          };
        });
        if (typeof amll.enhancePlainLrcWithSyllables === 'function') {
          amll.enhancePlainLrcWithSyllables(amllLines);
        }
      }

      if (amllPlayer && amllPlayer.size && amllPlayer.size[1] <= 0 && amllLyricsRoot) {
        const rect = amllLyricsRoot.getBoundingClientRect();
        if (rect && rect.height > 0) {
          amllPlayer.size[0] = rect.width;
          amllPlayer.size[1] = rect.height;
          if (typeof amllPlayer.onResize === 'function') amllPlayer.onResize();
        }
      }

      const curMs = Math.round((audioEl.currentTime || proceduralCurrentTime || 0) * 1000);
      amllPlayer.setLyricLines(amllLines, curMs);
      amllPlayer.setCurrentTime(curMs, true);

      // Fast-forward initial spring settles so lines mount and layout immediately
      for (let i = 0; i < 25; i++) {
        amllPlayer.update(16);
      }

      // Bottom line metadata (songwriter / credit)
      const bottomEl = amllPlayer.getBottomLineElement();
      if (bottomEl) {
        const songwriters = typeof amll.extractSongwriters === 'function' ? amll.extractSongwriters(metadata) : [];
        if (songwriters && songwriters.length > 0) {
          bottomEl.innerHTML = `<span class="opacity-40 text-xs font-mono tracking-wide">词曲 / 制作：${escapeHtml(songwriters.join('，'))}</span>`;
        } else if (song && song.artist) {
          bottomEl.innerHTML = `<span class="opacity-40 text-xs font-mono tracking-wide">${escapeHtml(song.artist)} · ${escapeHtml(song.album || 'Aetheria Sound')}</span>`;
        } else {
          bottomEl.innerHTML = '';
        }
      }
    } catch (e) {
      console.warn('[AMLL] updateAMLLLyrics error:', e);
    }
  }

  function renderLyricsList() {
    lyricsList.innerHTML = '';

    if (!parsedLyrics || parsedLyrics.length === 0) {
      lyricsList.innerHTML = '<div class="text-white/40 text-xl py-20 text-center">纯音乐 · 请静心感受流光</div>';
      return;
    }

    const missingTransBatch = [];
    const thisRenderTrackIdx = currentTrackIndex;

    parsedLyrics.forEach((item, idx) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'lyric-line group';
      lineDiv.dataset.index = idx;
      lineDiv.dataset.time = item.time;

      const { zh, en, isChineseSong } = formatBilingualLyric(item.text, item.trans);

      if (isChineseSong) {
        // 中文原版歌曲: 纯粹展示中文歌词单行，不显示英文翻译
        const zhDiv = document.createElement('div');
        zhDiv.className = 'lyric-main lyric-zh';
        const displayZh = zh || item.text;
        const syls = item.syllables || generateSyllables(displayZh, item.time, item.duration || 4.0);
        if (syls && syls.length > 0) {
          zhDiv.innerHTML = syls.map((s, sIdx) => 
            `<span class="amll-syl" data-syl-idx="${sIdx}" data-start="${s.start.toFixed(3)}" data-end="${s.end.toFixed(3)}">${escapeHtml(s.text)}</span>`
          ).join('');
        } else {
          zhDiv.textContent = displayZh;
        }
        lineDiv.appendChild(zhDiv);
      } else {
        // 外文/英文歌曲: 中文歌词一行，英文歌词一行
        const zhDiv = document.createElement('div');
        zhDiv.className = 'lyric-main lyric-zh';
        zhDiv.textContent = zh || '';
        lineDiv.appendChild(zhDiv);

        const enDiv = document.createElement('div');
        enDiv.className = 'lyric-trans lyric-en';
        const displayEn = en || item.text || '';
        const enSyls = generateSyllables(displayEn, item.time, item.duration || 4.0);
        if (enSyls && enSyls.length > 0) {
          enDiv.innerHTML = enSyls.map((s, sIdx) => 
            `<span class="amll-syl" data-syl-idx="${sIdx}" data-start="${s.start.toFixed(3)}" data-end="${s.end.toFixed(3)}">${escapeHtml(s.text)}</span>`
          ).join('');
        } else {
          enDiv.textContent = displayEn;
        }
        lineDiv.appendChild(enDiv);

        if (!zh && en) {
          if (BILINGUAL_TRANS_CACHE.has('en2zh_' + en)) {
            zhDiv.textContent = BILINGUAL_TRANS_CACHE.get('en2zh_' + en);
          } else {
            missingTransBatch.push({ idx, type: 'en2zh', text: en, el: zhDiv, item });
          }
        }
      }

      lineDiv.addEventListener('click', () => {
        userScrolledRecently = false;
        if (userScrollTimeout) clearTimeout(userScrollTimeout);
        resumeScrollBtn.classList.add('hidden');
        seekToTime(item.time);
        currentLyricIndex = idx;
        updateLyricDoF(idx);
        scrollToActiveLyric(true);
      });

      lyricsList.appendChild(lineDiv);
    });

    lyricsContainer.scrollTop = 0;
    currentLyricIndex = 0;
    updateLyricDoF(0);

    if (missingTransBatch.length > 0) {
      resolveMissingTranslations(missingTransBatch, thisRenderTrackIdx);
    }

    const currentSong = (PLAYLIST && PLAYLIST[currentTrackIndex]) || null;
    updateAMLLLyrics(currentSong, parsedLyrics);
  }

  function syncLyrics(time) {
    if (!parsedLyrics || !parsedLyrics.length) return;

    let activeIdx = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (time >= parsedLyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx === -1 && parsedLyrics.length > 0) {
      activeIdx = 0;
    }

    if (activeIdx !== currentLyricIndex && activeIdx >= 0) {
      currentLyricIndex = activeIdx;
      updateLyricDoF(activeIdx);
      scrollToActiveLyric();
    }
  }

  // User manual scroll detection
  function markUserScrolled() {
    if (isProgrammaticScrolling) return;
    userScrolledRecently = true;
    resumeScrollBtn.classList.remove('hidden');

    if (userScrollTimeout) clearTimeout(userScrollTimeout);
    userScrollTimeout = setTimeout(() => {
      userScrolledRecently = false;
      resumeScrollBtn.classList.add('hidden');
    }, 4000);
  }

  lyricsContainer.addEventListener('wheel', markUserScrolled, { passive: true });
  lyricsContainer.addEventListener('touchstart', markUserScrolled, { passive: true });
  lyricsContainer.addEventListener('touchmove', markUserScrolled, { passive: true });
  lyricsContainer.addEventListener('pointerdown', markUserScrolled, { passive: true });
  lyricsContainer.addEventListener('scroll', () => {
    if (!isProgrammaticScrolling) {
      markUserScrolled();
    }
  });

  resumeScrollBtn.addEventListener('click', () => {
    userScrolledRecently = false;
    if (userScrollTimeout) clearTimeout(userScrollTimeout);
    resumeScrollBtn.classList.add('hidden');
    if (amllPlayer && typeof amllPlayer.resetScroll === 'function') {
      amllPlayer.resetScroll();
    }
    scrollToActiveLyric(true);
  });

  // ==========================================
  // 6. Playback Controls & Progress Bar
  // ==========================================
  let playLoopRaf = null;
  const miniVisBars = document.querySelectorAll('.vis-bar');
  let smoothGlowScale = 1.0;
  let smoothGlowOpacity = 0.55;
  let lastBgThrottleTime = 0;

  function updatePlayLoop() {
    if (!isPlaying) {
      if (playLoopRaf) {
        cancelAnimationFrame(playLoopRaf);
        playLoopRaf = null;
      }
      return;
    }
    const now = performance.now();

    const currTime = audioEl.currentTime || proceduralCurrentTime;

    if (currTime) {
      syncLyrics(currTime);
      if (audioEl.duration && !isNaN(audioEl.duration)) {
        updateProgressUI(currTime, audioEl.duration);
      }

      // AMLL Syllable Kinetic Bounce & Gradient Progress
      if (parsedLyrics && parsedLyrics.length > 0 && currentLyricIndex >= 0 && currentLyricIndex < parsedLyrics.length) {
        const activeItem = parsedLyrics[currentLyricIndex];
        const activeEl = lyricsList.querySelector(`.lyric-line[data-index="${currentLyricIndex}"]`);
        if (activeItem && activeEl) {
          const elapsed = currTime - activeItem.time;
          const dur = activeItem.duration || 4.0;
          const progress = Math.min(Math.max(elapsed / dur, 0), 1.0);
          activeEl.style.setProperty('--line-progress', (progress * 100).toFixed(1) + '%');

          const sylEls = activeEl.querySelectorAll('.amll-syl');
          const sylLen = sylEls.length;
          for (let i = 0; i < sylLen; i++) {
            const el = sylEls[i];
            const sStart = parseFloat(el.dataset.start);
            const sEnd = parseFloat(el.dataset.end);

            if (currTime >= sEnd) {
              if (!el.classList.contains('amll-sung')) {
                el.classList.add('amll-sung');
                el.classList.remove('amll-singing');
                el.style.transform = '';
              }
            } else if (currTime >= sStart && currTime < sEnd) {
              if (!el.classList.contains('amll-singing')) {
                el.classList.add('amll-singing');
                el.classList.remove('amll-sung');
              }
              const sylP = (currTime - sStart) / Math.max(0.06, sEnd - sStart);
              const bounce = Math.sin(sylP * Math.PI);
              const scale = (1.0 + bounce * 0.16).toFixed(3);
              const ty = (-bounce * 3.2).toFixed(1);
              el.style.transform = `scale(${scale}) translateY(${ty}px)`;
            } else {
              if (el.classList.contains('amll-sung') || el.classList.contains('amll-singing')) {
                el.classList.remove('amll-sung', 'amll-singing');
                el.style.transform = '';
              }
            }
          }
        }
      }
    }

    // AMLL Official Core 60fps Spring Physics & Word Gradient Progress Sync
    if (amllPlayer) {
      const delta = Math.min(now - (lastAmllFrameTime || now), 100);
      lastAmllFrameTime = now;
      const timeMs = Math.round(currTime * 1000);
      amllPlayer.setCurrentTime(timeMs);
      amllPlayer.update(delta);

      if (amllPlayer.scrollState && amllPlayer.scrollState.isAutoAlignSuspended) {
        resumeScrollBtn.classList.remove('hidden');
      }
    }

    // Battery Saver Guard: Throttle visualizer loop to 10fps when tab is in background
    if (document.hidden) {
      if (now - lastBgThrottleTime < 100) {
        playLoopRaf = requestAnimationFrame(updatePlayLoop);
        return;
      }
      lastBgThrottleTime = now;
    }

    // Ensure Web Audio context remains active during playback
    if (audioCtx && audioCtx.state === 'suspended' && isPlaying) {
      audioCtx.resume().catch(() => {});
    }

    // Live Web Audio FFT sampling for Beat Detection and Dynamic Resonance
    let lowEnergy = 0;
    if (analyser && visualizerDataArray) {
      analyser.getByteFrequencyData(visualizerDataArray);
      lowEnergy = (visualizerDataArray[0] + (visualizerDataArray[1] || 0) + (visualizerDataArray[2] || 0)) / (255 * 3);
    }
    const beatInfo = BeatDetector.process(
      visualizerDataArray,
      now,
      currTime,
      PLAYLIST[currentTrackIndex]
    );

    const dynamicWeight = beatInfo.weight || 1.0;
    const kickImpulse = Math.min(1.0, (beatInfo.impulse || 0) * dynamicWeight);

    // Synchronize 3D Cover Canvas with sub-bass audio level and instant kick transient
    if (window.CoverMotion) {
      window.CoverMotion.setAudioLevel(lowEnergy, kickImpulse);
    }

    // Synchronize AMLL WebGL Mesh Gradient with sub-bass kick
    if (amllBg) {
      amllBg.setLowFreqVolume(Math.min(Math.max((lowEnergy || 0) * 1.5, 0), 1.0));
    }

    // Synchronize Lyric Streaming Glow with music beat impulse
    const lyricBeatGlow = (1.0 + kickImpulse * 0.45).toFixed(3);
    document.documentElement.style.setProperty('--lyric-beat-glow', lyricBeatGlow);

    // Direct beat kick scale to coverCard on every frame (0ms latency instant attack)
    if (coverCard) {
      const beatScale = 1.0 + kickImpulse * 0.055;
      coverCard.style.setProperty('--beat-scale', beatScale.toFixed(4));
    }

    // Live Mini Visualizer Bars Reaction
    if (miniVisBars && miniVisBars.length >= 4 && visualizerDataArray) {
      const b0 = visualizerDataArray[0] || 0;
      const b1 = visualizerDataArray[2] || 0;
      const b2 = visualizerDataArray[5] || 0;
      const b3 = visualizerDataArray[9] || 0;

      if (b0 > 4 || b1 > 4 || b2 > 4) {
        document.body.classList.add('has-live-fft');
      } else {
        document.body.classList.remove('has-live-fft');
      }

      miniVisBars[0].style.transform = `scaleY(${Math.max(0.15, (b0 / 255) * 1.25).toFixed(2)})`;
      miniVisBars[1].style.transform = `scaleY(${Math.max(0.15, (b1 / 255) * 1.15).toFixed(2)})`;
      miniVisBars[2].style.transform = `scaleY(${Math.max(0.15, (b2 / 255) * 1.10).toFixed(2)})`;
      miniVisBars[3].style.transform = `scaleY(${Math.max(0.15, (b3 / 255) * 1.05).toFixed(2)})`;
    }

    // Dynamic Resonance for Split-View Cover Ambient Glow & Vinyl Disc
    if (coverAmbientGlow) {
      const targetScale = 1.0 + kickImpulse * 0.12;
      const targetOpacity = Math.min(1.0, 0.45 + kickImpulse * 0.45);
      smoothGlowScale += (targetScale - smoothGlowScale) * 0.55;
      smoothGlowOpacity += (targetOpacity - smoothGlowOpacity) * 0.55;

      coverAmbientGlow.style.transform = `scale(${smoothGlowScale.toFixed(3)})`;
      coverAmbientGlow.style.opacity = smoothGlowOpacity.toFixed(3);
    }

    // Dynamic Resonance for Gemini Veo 3.1 Motion Cover Video
    if (coverCard && coverCard.classList.contains('has-motion-cover')) {
      const videoScale = 1.0 + kickImpulse * 0.045;
      const videoBrightness = 1.0 + kickImpulse * 0.12;
      coverCard.style.setProperty('--motion-scale', videoScale.toFixed(3));
      coverCard.style.setProperty('--motion-brightness', videoBrightness.toFixed(3));
    }

    playLoopRaf = requestAnimationFrame(updatePlayLoop);
  }

  // ==========================================
  // 6.1 Broadcast-Grade Volume Crossfade
  // ==========================================
  let volumeFadeRaf = null;

  function fadeVolume(targetVol, durationMs = 320) {
    if (!audioEl) return Promise.resolve();
    if (volumeFadeRaf) {
      cancelAnimationFrame(volumeFadeRaf);
      volumeFadeRaf = null;
    }
    const startVol = audioEl.volume;
    if (Math.abs(startVol - targetVol) < 0.01) {
      audioEl.volume = targetVol;
      return Promise.resolve();
    }
    const startTime = performance.now();

    return new Promise((resolve) => {
      function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(1.0, elapsed / durationMs);
        // Smooth sine ease in/out curve
        const curve = 0.5 - 0.5 * Math.cos(t * Math.PI);
        const newVol = startVol + (targetVol - startVol) * curve;
        audioEl.volume = Math.max(0, Math.min(1.0, newVol));

        if (t < 1.0) {
          volumeFadeRaf = requestAnimationFrame(step);
        } else {
          audioEl.volume = targetVol;
          volumeFadeRaf = null;
          resolve();
        }
      }
      volumeFadeRaf = requestAnimationFrame(step);
    });
  }

  // ==========================================
  // 6.2 Native OS MediaSession Integration
  // ==========================================
  function updateMediaSession(song) {
    if (!('mediaSession' in navigator)) return;
    if (!song) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      return;
    }
    try {
      const coverUrl = song.cover || '';
      const artwork = [];
      if (coverUrl && !coverUrl.startsWith('data:image/svg')) {
        artwork.push(
          { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: coverUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: coverUrl, sizes: '512x512', type: 'image/jpeg' }
        );
      }
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title || 'Aetheria Sound',
        artist: (song.artist || 'Unknown Artist').split('·')[0].trim(),
        album: song.album || 'Lossless Hi-Res Audio',
        artwork
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      if (window.electronAPI && typeof window.electronAPI.updatePlaybackState === 'function') {
        window.electronAPI.updatePlaybackState({
          title: song.title,
          artist: song.artist,
          isPlaying
        });
        const titlebarTrackEl = document.getElementById('desktop-titlebar-track');
        if (titlebarTrackEl) {
          titlebarTrackEl.textContent = `${song.title} · ${song.artist}`;
        }
      }
    } catch (err) {
      console.warn('MediaSession metadata notice:', err);
    }
  }

  function syncMediaSessionPosition() {
    if (!('mediaSession' in navigator) || typeof navigator.mediaSession.setPositionState !== 'function') return;
    if (!audioEl || !audioEl.duration || isNaN(audioEl.duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: Math.max(0, audioEl.duration),
        playbackRate: audioEl.playbackRate || 1.0,
        position: Math.max(0, Math.min(audioEl.currentTime, audioEl.duration))
      });
    } catch (e) {}
  }

  function initMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const actions = [
      ['play', () => playTrack()],
      ['pause', () => pauseTrack()],
      ['previoustrack', () => prevTrack()],
      ['nexttrack', () => nextTrack()],
      ['seekto', (details) => {
        if (details.seekTime != null && (audioEl.duration || proceduralDuration)) {
          seekToTime(details.seekTime);
        }
      }],
      ['seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        seekToTime(Math.max(0, (audioEl.currentTime || proceduralCurrentTime) - offset));
      }],
      ['seekforward', (details) => {
        const offset = details.seekOffset || 10;
        const dur = audioEl.duration || proceduralDuration || 300;
        seekToTime(Math.min(dur, (audioEl.currentTime || proceduralCurrentTime) + offset));
      }],
      ['stop', () => pauseTrack(true)]
    ];

    actions.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (err) {}
    });
  }

  function playTrack() {
    if (!PLAYLIST || PLAYLIST.length === 0) {
      showToast('播放列表暂无歌曲，请先搜索或导入歌曲', 'music');
      pauseTrack();
      return;
    }
    initWebAudio();
    isPlaying = true;
    if (amllPlayer) amllPlayer.resume();
    if (amllBg) {
      amllBg.resume();
      amllBg.setFlowSpeed(3.2);
    }
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    document.body.classList.add('is-playing');
    vinylDisc.classList.add('vinyl-playing');
    if (window.CoverMotion) window.CoverMotion.setPlaying(true);
    if (motionCoverVideo && coverCard && coverCard.classList.contains('has-motion-cover')) {
      motionCoverVideo.play().catch(() => {});
    }
    if (canvasAmbientVideo && document.body.classList.contains('has-canvas-bg')) {
      canvasAmbientVideo.play().catch(() => {});
    }

    if (!playLoopRaf) {
      playLoopRaf = requestAnimationFrame(updatePlayLoop);
    }

    const song = PLAYLIST[currentTrackIndex];
    if (!song) return;

    updateMediaSession(song);

    // Never play procedural synth music on search/playlist tracks
    stopProceduralMusic();

    // Priority 1: If audioEl has a real audio source, attempt native playback with soft volume fade-in
    if (audioEl.src && audioEl.src !== window.location.href && !audioEl.src.endsWith('/') && !audioEl.src.includes('types=url')) {
      if (audioEl.volume === 0) {
        fadeVolume(currentVolume, 280);
      } else {
        audioEl.volume = currentVolume;
      }
      const playPromise = audioEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Native stream deferred or waiting user gesture:', err);
        });
      }
    } else {
      // Priority 2: Resolve genuine high-res audio stream
      if (window.AetheriaAPI && window.AetheriaAPI.resolveSongAudioUrl) {
        genreBadge.textContent = 'CONNECTING HI-RES...';
        window.AetheriaAPI.resolveSongAudioUrl(song).then((url) => {
          if (currentTrackIndex !== PLAYLIST.indexOf(song)) return;
          genreBadge.textContent = song.genre || 'LOSSLESS 24-BIT';
          if (url) {
            song.audioUrl = url;
            audioEl.src = formatAudioStreamUrl(url);
            audioEl.load();
            if (isPlaying) {
              audioEl.volume = 0;
              audioEl.play().then(() => {
                fadeVolume(currentVolume, 280);
              }).catch((err) => {
                console.warn('Playback deferred by browser policy:', err);
              });
            }
          } else {
            showToast('该歌曲暂无可用完整母带音源，请尝试搜索其他版本', 'warning');
          }
        }).catch(() => {
          genreBadge.textContent = song.genre || 'LOSSLESS 24-BIT';
        });
      }
    }
  }

  function pauseTrack(immediate = false) {
    if (!isPlaying) return;
    isPlaying = false;
    if (amllPlayer) amllPlayer.pause();
    if (amllBg) {
      amllBg.setFlowSpeed(0.8);
    }
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    document.body.classList.remove('is-playing', 'has-live-fft');
    vinylDisc.classList.remove('vinyl-playing');
    if (window.CoverMotion) window.CoverMotion.setPlaying(false);
    if (motionCoverVideo) {
      try { motionCoverVideo.pause(); } catch (e) {}
    }
    if (canvasAmbientVideo) {
      try { canvasAmbientVideo.pause(); } catch (e) {}
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
    if (window.electronAPI && typeof window.electronAPI.updatePlaybackState === 'function') {
      window.electronAPI.updatePlaybackState({ isPlaying: false });
    }

    if (playLoopRaf) {
      cancelAnimationFrame(playLoopRaf);
      playLoopRaf = null;
    }

    if (immediate) {
      try { audioEl.pause(); } catch (e) {}
    } else {
      fadeVolume(0, 180).then(() => {
        if (!isPlaying) {
          try { audioEl.pause(); } catch (e) {}
        }
      });
    }
    stopProceduralMusic();
  }

  function togglePlay() {
    if (isPlaying) pauseTrack();
    else playTrack();
  }

  function nextTrack() {
    if (!PLAYLIST || PLAYLIST.length === 0) return;
    if (playMode === 'shuffle') {
      let randIdx = Math.floor(Math.random() * PLAYLIST.length);
      if (randIdx === currentTrackIndex && PLAYLIST.length > 1) randIdx = (randIdx + 1) % PLAYLIST.length;
      loadTrack(randIdx, true);
    } else {
      loadTrack(currentTrackIndex + 1, true);
    }
  }

  function prevTrack() {
    if (!PLAYLIST || PLAYLIST.length === 0) return;
    if (proceduralCurrentTime > 4 || (audioEl.currentTime > 4)) {
      seekToTime(0);
    } else {
      loadTrack(currentTrackIndex - 1, true);
    }
  }

  function handleTrackEnd() {
    if (playMode === 'single') {
      seekToTime(0);
      playTrack();
    } else {
      nextTrack();
    }
  }

  function seekToTime(targetTime) {
    const duration = audioEl.duration || proceduralDuration;
    const clampedTime = Math.max(0, Math.min(targetTime, duration));
    proceduralCurrentTime = clampedTime;
    if (audioEl.src && audioEl.src !== window.location.href) {
      try {
        audioEl.currentTime = clampedTime;
      } catch (e) {}
    }
    updateProgressUI(clampedTime, duration);
    syncLyrics(clampedTime);
    if (amllPlayer) {
      amllPlayer.setCurrentTime(Math.round(clampedTime * 1000), true);
      amllPlayer.update(0);
    }
  }

  function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }

  function updateProgressUI(current, duration) {
    const ratio = Math.min(Math.max(current / (duration || 1), 0), 1);
    progressBar.style.width = `${ratio * 100}%`;
    progressHandle.style.left = `${ratio * 100}%`;
    currentTimeEl.textContent = formatTime(current);
    durationTimeEl.textContent = formatTime(duration);
  }

  audioEl.addEventListener('timeupdate', () => {
    if (audioEl.duration && !isNaN(audioEl.duration)) {
      updateProgressUI(audioEl.currentTime, audioEl.duration);
      syncMediaSessionPosition();
    }
    syncLyrics(audioEl.currentTime);
  });

  audioEl.addEventListener('ended', handleTrackEnd);

  audioEl.addEventListener('playing', () => {
    // When real vocal/instrument stream starts playing, stop procedural synth
    stopProceduralMusic();
    if (audioEl.volume < currentVolume) {
      fadeVolume(currentVolume, 260);
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
      syncMediaSessionPosition();
    }
  });

  audioEl.addEventListener('pause', () => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  });

  let isRecoveringStream = false;
  let streamRecoveryRetries = 0;
  audioEl.addEventListener('error', (e) => {
    // Ignore if audioEl has no valid src or is pointing to the page URL
    if (!audioEl.src || audioEl.src === window.location.href || audioEl.src.endsWith('/')) {
      return;
    }

    const failedUrl = audioEl.src;
    console.warn('Native audio stream error on:', failedUrl);

    const song = PLAYLIST[currentTrackIndex];
    if (!song) return;

    // Never play procedural synth music on search/playlist errors
    stopProceduralMusic();

    if (streamRecoveryRetries >= 2) {
      streamRecoveryRetries = 0;
      isRecoveringStream = false;
      genreBadge.textContent = song.genre || 'LOSSLESS 24-BIT';
      showToast('当前歌曲音源受限，已自动切换至下一首', 'warning');
      setTimeout(() => nextTrack(), 1000);
      return;
    }

    // Auto-failover attempt: force fresh audio stream resolution in background
    if (!isRecoveringStream && window.AetheriaAPI) {
      isRecoveringStream = true;
      streamRecoveryRetries++;
      genreBadge.textContent = 'RE-CONNECTING...';
      const thisTrack = song;
      thisTrack.audioUrl = null;
      delete thisTrack._audioResolvedAt;

      if (window.AetheriaAPI.invalidateAudioCache) {
        window.AetheriaAPI.invalidateAudioCache(thisTrack);
      }

      window.AetheriaAPI.resolveSongAudioUrl(thisTrack, true).then((newUrl) => {
        isRecoveringStream = false;
        if (thisTrack === PLAYLIST[currentTrackIndex] && newUrl && newUrl !== failedUrl) {
          thisTrack.audioUrl = newUrl;
          thisTrack._audioResolvedAt = Date.now();
          streamRecoveryRetries = 0;
          audioEl.src = formatAudioStreamUrl(newUrl);
          audioEl.load();
          if (isPlaying) {
            audioEl.volume = currentVolume;
            audioEl.play().then(() => {
              genreBadge.textContent = thisTrack.genre || 'LOSSLESS 24-BIT';
              showToast('已无缝重连高保真音源', 'success');
            }).catch(e => console.warn('Play retry interrupted:', e));
          }
        } else {
          genreBadge.textContent = thisTrack.genre || 'LOSSLESS 24-BIT';
          showToast('当前歌曲音源受限，跳至下一首', 'warning');
          setTimeout(() => nextTrack(), 1000);
        }
      }).catch(() => {
        isRecoveringStream = false;
        genreBadge.textContent = thisTrack.genre || 'LOSSLESS 24-BIT';
        showToast('音源连接超时，跳至下一首', 'warning');
        setTimeout(() => nextTrack(), 1000);
      });
    }
  });

  // Scrubber scrubbing
  let isDraggingProgress = false;
  function handleProgressMove(e) {
    const rect = progressContainer.getBoundingClientRect();
    const pos = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    const duration = audioEl.duration || proceduralDuration;
    const targetTime = pos * duration;

    hoverTooltip.style.left = `${pos * 100}%`;
    hoverTooltip.textContent = formatTime(targetTime);
    hoverTooltip.style.opacity = '1';

    if (isDraggingProgress) {
      seekToTime(targetTime);
    }
  }

  progressContainer.addEventListener('mouseenter', () => hoverTooltip.style.opacity = '1');
  progressContainer.addEventListener('mouseleave', () => {
    if (!isDraggingProgress) hoverTooltip.style.opacity = '0';
  });
  progressContainer.addEventListener('mousemove', handleProgressMove);
  progressContainer.addEventListener('mousedown', (e) => {
    isDraggingProgress = true;
    handleProgressMove(e);
    const onMouseUp = () => {
      isDraggingProgress = false;
      hoverTooltip.style.opacity = '0';
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mouseup', onMouseUp);
  });

  // Volume
  volumeSliderBox.addEventListener('click', (e) => {
    const rect = volumeSliderBox.getBoundingClientRect();
    const level = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    setVolume(level);
  });

  function setVolume(level) {
    currentVolume = level;
    isMuted = level === 0;
    volumeBar.style.width = `${level * 100}%`;
    audioEl.volume = level;
    if (synthGain && audioCtx) {
      synthGain.gain.setValueAtTime(level, audioCtx.currentTime);
    }
  }

  volumeBtn.addEventListener('click', () => setVolume(isMuted ? 0.8 : 0));

  // 5-Band Equalizer Preset Cycling (Pro Audio Mastering Engine)
  const eqPresetBadge = document.getElementById('eq-preset-badge');

  function updateEQButtonUI() {
    if (!eqPresetBadge) return;
    const preset = EQ_PRESETS[currentEQIndex];
    eqPresetBadge.textContent = preset.tag;
    eqPresetBadge.className = `hidden md:inline-block text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/10 ${preset.color}`;
  }

  function cycleEQPreset() {
    initWebAudio();
    currentEQIndex = (currentEQIndex + 1) % EQ_PRESETS.length;
    const preset = EQ_PRESETS[currentEQIndex];
    if (audioCtx && eqFilters && eqFilters.length === 5) {
      preset.gains.forEach((gainVal, idx) => {
        const f = eqFilters[idx];
        if (f) {
          f.gain.cancelScheduledValues(audioCtx.currentTime);
          f.gain.linearRampToValueAtTime(gainVal, audioCtx.currentTime + 0.2);
        }
      });
    }
    updateEQButtonUI();
    showToast(`🎛️ 音效均衡器: ${preset.name} (${preset.tag})`, 'music');
  }

  soundstageBtn.addEventListener('click', cycleEQPreset);

  // Play Mode
  playModeBtn.addEventListener('click', () => {
    if (playMode === 'list') {
      playMode = 'single';
      playModeBtn.title = '播放模式: 单曲循环';
      playModeIcon.innerHTML = `<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="12" y="15" font-size="8" fill="currentColor" text-anchor="middle">1</text>`;
    } else if (playMode === 'single') {
      playMode = 'shuffle';
      playModeBtn.title = '播放模式: 随机播放';
      playModeIcon.innerHTML = `<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>`;
    } else {
      playMode = 'list';
      playModeBtn.title = '播放模式: 列表循环';
      playModeIcon.innerHTML = `<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>`;
    }
  });

  // ==========================================
  // 6.5 Floating Toast Notification HUD
  // ==========================================
  const appToast = document.getElementById('app-toast');
  const toastIcon = document.getElementById('toast-icon');
  const toastText = document.getElementById('toast-text');
  let toastTimer = null;

  function showToast(message, type = 'info', icon = null) {
    if (!appToast || !toastText) return;
    clearTimeout(toastTimer);

    let defaultIcon = '✨';
    if (type === 'success') defaultIcon = '✅';
    else if (type === 'warning') defaultIcon = '⚠️';
    else if (type === 'music') defaultIcon = '🎵';

    if (toastIcon) toastIcon.textContent = icon || defaultIcon;
    toastText.textContent = message;

    appToast.classList.add('show');
    toastTimer = setTimeout(() => {
      appToast.classList.remove('show');
    }, 2800);
  }

  // ==========================================
  // 7. Raycast Command Palette Search (Cmd+K / /)
  // ==========================================
  let activeSearchIndex = 0;
  let searchDebounce = null;
  let currentSearchSource = 'all';
  const dockSearchBtn = document.getElementById('dock-search-btn');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const searchSourceTabs = document.querySelectorAll('.search-source-tab');
  const searchDiscoveryBox = document.getElementById('search-discovery-box');
  const searchHistoryContainer = document.getElementById('search-history-container');
  const searchHistoryTags = document.getElementById('search-history-tags');
  const clearSearchHistoryBtn = document.getElementById('clear-search-history-btn');
  const hotSearchChips = document.querySelectorAll('.hot-search-chip');

  // Search History Storage
  const SEARCH_HISTORY_KEY = 'aetheria_search_history_v1';
  function getSearchHistory() {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function addSearchHistory(keyword) {
    if (!keyword || !keyword.trim()) return;
    const clean = keyword.trim();
    let history = getSearchHistory();
    history = history.filter(item => item.toLowerCase() !== clean.toLowerCase());
    history.unshift(clean);
    if (history.length > 10) history = history.slice(0, 10);
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {}
    renderSearchHistory();
  }

  function clearSearchHistory() {
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (e) {}
    renderSearchHistory();
  }

  function renderSearchHistory() {
    if (!searchHistoryContainer || !searchHistoryTags) return;
    const history = getSearchHistory();
    if (history.length === 0) {
      searchHistoryContainer.classList.add('hidden');
      searchHistoryTags.innerHTML = '';
      return;
    }

    searchHistoryContainer.classList.remove('hidden');
    searchHistoryTags.innerHTML = '';
    history.forEach(item => {
      const chip = document.createElement('button');
      chip.className = 'px-2.5 py-0.5 rounded-full text-[11px] bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all flex items-center gap-1';
      chip.innerHTML = `<span>${item}</span>`;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        searchInput.value = item;
        handleSearchInput(item);
      });
      searchHistoryTags.appendChild(chip);
    });
  }

  if (clearSearchHistoryBtn) {
    clearSearchHistoryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearSearchHistory();
    });
  }

  function openCommandPalette() {
    commandPaletteModal.classList.add('show');
    searchInput.value = '';
    if (searchClearBtn) searchClearBtn.classList.add('hidden');
    if (searchDiscoveryBox) searchDiscoveryBox.classList.remove('hidden');
    renderSearchHistory();
    activeSearchIndex = 0;
    renderChartResults('hot');
    setTimeout(() => searchInput.focus(), 80);
  }

  function closeCommandPalette() {
    commandPaletteModal.classList.remove('show');
    searchInput.blur();
  }

  if (searchTriggerBtn) searchTriggerBtn.addEventListener('click', openCommandPalette);
  if (dockSearchBtn) dockSearchBtn.addEventListener('click', openCommandPalette);

  // Close modal when clicking dark backdrop
  commandPaletteModal.addEventListener('click', (e) => {
    if (e.target === commandPaletteModal) {
      closeCommandPalette();
    }
  });

  // Source selector tabs (All / NetEase / Kuwo / Kugou)
  searchSourceTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      searchSourceTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentSearchSource = tab.dataset.source || 'all';

      const val = searchInput.value.trim();
      if (val) {
        handleSearchInput(val, true);
      }
    });
  });

  // Hot Search Chips
  hotSearchChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const kw = chip.dataset.keyword || chip.textContent.trim();
      searchInput.value = kw;
      handleSearchInput(kw, true);
    });
  });

  // Clear input button
  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchClearBtn.classList.add('hidden');
      searchSpinner.classList.add('hidden');
      if (searchDiscoveryBox) searchDiscoveryBox.classList.remove('hidden');
      renderSearchHistory();
      renderChartResults('hot');
      searchInput.focus();
    });
  }

  function updateSearchSelection(newIdx) {
    const rows = searchResultsList.querySelectorAll('.search-row');
    if (!rows.length) return;
    activeSearchIndex = Math.max(0, Math.min(newIdx, rows.length - 1));
    rows.forEach((r, idx) => {
      if (idx === activeSearchIndex) {
        r.classList.add('active', 'bg-white/10');
        r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        r.classList.remove('active', 'bg-white/10');
      }
    });
  }

  // Keyboard navigation & Enter execution on searchInput
  searchInput.addEventListener('keydown', (e) => {
    const rows = searchResultsList.querySelectorAll('.search-row');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateSearchSelection(activeSearchIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateSearchSelection(activeSearchIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rows.length > 0 && rows[activeSearchIndex]) {
        rows[activeSearchIndex].click();
      } else if (searchInput.value.trim()) {
        executeSearchSong(searchInput.value.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCommandPalette();
    }
  });

  function handleSearchInput(val, immediate = false) {
    clearTimeout(searchDebounce);

    if (!val) {
      if (searchClearBtn) searchClearBtn.classList.add('hidden');
      searchSpinner.classList.add('hidden');
      if (searchDiscoveryBox) searchDiscoveryBox.classList.remove('hidden');
      renderSearchHistory();
      activeSearchIndex = 0;
      renderChartResults('hot');
      return;
    }

    if (searchClearBtn) searchClearBtn.classList.remove('hidden');
    if (searchDiscoveryBox) searchDiscoveryBox.classList.add('hidden');

    const neteaseParsed = window.AetheriaAPI && window.AetheriaAPI.parseNeteaseInput(val);

    searchSpinner.classList.remove('hidden');

    const execute = async () => {
      if (window.AetheriaAPI) {
        const results = await window.AetheriaAPI.searchSongs(val, currentSearchSource);
        searchSpinner.classList.add('hidden');
        renderSearchResults(results, neteaseParsed, val);
      }
    };

    if (immediate) {
      execute();
    } else {
      searchDebounce = setTimeout(execute, 150);
    }
  }

  searchInput.addEventListener('input', (e) => {
    handleSearchInput(e.target.value.trim());
  });

  function renderChartResults(chartKey) {
    if (!window.AetheriaAPI) return;
    const songs = window.AetheriaAPI.HOT_CHARTS[chartKey] || [];
    searchResultsList.innerHTML = '';
    activeSearchIndex = 0;

    songs.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = `search-row p-3 flex items-center justify-between cursor-pointer rounded-2xl transition-all ${idx === 0 ? 'active bg-white/10' : 'hover:bg-white/5'}`;
      row.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-6 text-center font-mono text-xs font-bold shrink-0 ${idx < 3 ? 'text-amber-400' : 'text-white/40'}">${String(idx + 1).padStart(2, '0')}</span>
          <div class="min-w-0">
            <h4 class="text-xs font-semibold text-white truncate">${item.title}</h4>
            <p class="text-[11px] text-white/50 truncate">${item.artist}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">无损</span>
          <button class="queue-btn text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors" title="加到播放队列">+ 队列</button>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 text-white font-medium">播放</span>
        </div>
      `;

      // Queue button click
      const queueBtn = row.querySelector('.queue-btn');
      if (queueBtn) {
        queueBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const queryTerm = item.keyword || `${item.title} ${item.artist}`.trim();
          if (window.AetheriaAPI && window.AetheriaAPI.searchSongs) {
            window.AetheriaAPI.searchSongs(queryTerm).then(res => {
              if (res.length > 0) addSearchResultToQueue(res[0]);
              else addSearchResultToQueue(item);
            });
          } else {
            addSearchResultToQueue(item);
          }
        });
      }

      // Play row click (Searches and plays genuine master recording)
      row.addEventListener('click', () => {
        const queryTerm = item.keyword || `${item.title} ${item.artist}`.trim();
        executeSearchSong(queryTerm);
      });
      searchResultsList.appendChild(row);
    });
  }

  function renderSearchResults(results, neteaseParsed = null, rawQuery = '') {
    searchResultsList.innerHTML = '';
    activeSearchIndex = 0;

    if (neteaseParsed) {
      const neteaseRow = document.createElement('div');
      neteaseRow.className = 'search-row p-3 flex items-center justify-between cursor-pointer rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/35 transition-all text-white mb-2 shadow-lg';
      neteaseRow.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-red-500/30 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white">识别到网易云${neteaseParsed.type === 'playlist' ? '歌单' : '单曲'} (ID: ${neteaseParsed.id})</h4>
            <p class="text-[11px] text-white/60">点击立即一键同步并载入整个歌单曲目</p>
          </div>
        </div>
        <span class="text-[10px] font-mono px-2.5 py-1 rounded bg-red-600 text-white font-semibold">一键同步</span>
      `;
      neteaseRow.addEventListener('click', () => {
        closeCommandPalette();
        openNeteaseModal();
        neteaseInput.value = rawQuery;
        executeNeteaseImport();
      });
      searchResultsList.appendChild(neteaseRow);
    }

    if (!results || results.length === 0) {
      if (!neteaseParsed) {
        searchResultsList.innerHTML = `
          <div class="p-8 text-center flex flex-col items-center justify-center gap-2">
            <span class="text-2xl">🔍</span>
            <p class="text-xs text-white/50">未在当前引擎搜索到相关歌曲</p>
            <p class="text-[11px] text-white/35">可尝试切换顶部【酷我高免播】或【智能聚合】引擎重新搜索</p>
          </div>
        `;
      }
      return;
    }

    results.forEach((item, idx) => {
      const row = document.createElement('div');
      const isFirst = !neteaseParsed && idx === 0;
      row.className = `search-row p-2.5 flex items-center justify-between cursor-pointer rounded-2xl transition-all ${isFirst ? 'active bg-white/10' : 'hover:bg-white/5'}`;

      let badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      if (item.source === 'netease') badgeClass = 'bg-red-500/20 text-red-300 border-red-500/30';
      else if (item.source === 'kuwo') badgeClass = 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      else if (item.source === 'kugou') badgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/30';

      const defaultPlaceholder = getAestheticPlaceholderCover(item.title, item.artist);
      const hasRealCover = item.cover &&
        !item.cover.includes('unsplash.com') &&
        !item.cover.includes('api.i-meto.com') &&
        !item.cover.startsWith('data:image/svg+xml');

      let thumbCover = hasRealCover ? item.cover : defaultPlaceholder;
      if (hasRealCover && thumbCover && thumbCover.includes('music.126.net')) {
        thumbCover = thumbCover.replace(/\?param=\d+y\d+/, '') + '?param=120y120';
      }

      row.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <img src="${thumbCover}" loading="lazy" class="search-row-thumb w-10 h-10 rounded-xl object-cover shadow shrink-0 bg-white/5" />
          <div class="min-w-0">
            <h4 class="text-xs font-semibold text-white leading-tight truncate">${item.title}</h4>
            <p class="text-[11px] text-white/50 truncate">${item.artist} · ${item.album || '精选'}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${item.badge ? `<span class="text-[10px] font-mono px-2 py-0.5 rounded border ${badgeClass}">${item.badge}</span>` : ''}
          <button class="search-queue-btn text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors" title="添加至当前播放队列">+ 队列</button>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-white/15 text-white font-medium">回车播放</span>
        </div>
      `;

      const thumbImg = row.querySelector('.search-row-thumb');
      if (thumbImg) {
        thumbImg.onerror = () => { thumbImg.src = defaultPlaceholder; };
      }

      // If not yet a genuine CDN cover, lazily resolve in background to update thumbnail
      if (!hasRealCover && window.AetheriaAPI && window.AetheriaAPI.resolveSongCover) {
        window.AetheriaAPI.resolveSongCover(item, item.source || 'netease').then(realCover => {
          if (realCover) {
            item.cover = realCover;
            if (thumbImg) thumbImg.src = realCover;
          }
        }).catch(() => {});
      }

      // + 队列 button (Append without interrupting current song)
      const queueBtn = row.querySelector('.search-queue-btn');
      if (queueBtn) {
        queueBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          addSearchResultToQueue(item);
        });
      }

      // Play row click (Instant playback)
      row.addEventListener('click', () => {
        playSearchResultItem(item);
      });

      searchResultsList.appendChild(row);
    });
  }

  // Play search item immediately with 0ms UI response
  function playSearchResultItem(item) {
    stopProceduralMusic();
    closeCommandPalette();

    const queryText = searchInput.value.trim();
    if (queryText) {
      addSearchHistory(queryText);
    }

    // Check if track is already in PLAYLIST
    const existingIdx = PLAYLIST.findIndex(p => 
      p.id === item.id || 
      (p.title.trim().toLowerCase() === item.title.trim().toLowerCase() && 
       p.artist.trim().toLowerCase() === item.artist.trim().toLowerCase())
    );

    let targetIdx = 0;
    if (existingIdx >= 0) {
      targetIdx = existingIdx;
      // Upgrade existing track with search cover if better
      if (item.cover && !item.cover.includes('unsplash.com') && !item.cover.includes('api.i-meto.com')) {
        PLAYLIST[existingIdx].cover = item.cover;
      }
      if (item.audioUrl && !PLAYLIST[existingIdx].audioUrl) {
        PLAYLIST[existingIdx].audioUrl = item.audioUrl;
      }
    } else {
      PLAYLIST.unshift(item);
      savePlaylistToStorage();
      targetIdx = 0;
    }

    // 0ms instant playback trigger!
    loadTrack(targetIdx, true);
    showToast(`正在播放: ${item.title} · ${item.artist}`, 'music');

    // Trigger instant cover resolution if still missing genuine cover
    const hasGenuine = item.cover && !item.cover.includes('unsplash.com') && !item.cover.startsWith('data:image/svg+xml');
    if (!hasGenuine && window.AetheriaAPI && window.AetheriaAPI.resolveSongCover) {
      window.AetheriaAPI.resolveSongCover(item, item.source || 'netease').then(realCover => {
        if (realCover) {
          item.cover = realCover;
          savePlaylistToStorage();
          if (PLAYLIST[currentTrackIndex] === item) {
            applyTrackCover(realCover, item);
          }
        }
      }).catch(() => {});
    }

    // Asynchronously resolve lyrics, audio stream and full details
    window.AetheriaAPI.fetchSongDetails(item).then(enhanced => {
      if (enhanced) {
        Object.assign(item, enhanced);
        savePlaylistToStorage();
        if (PLAYLIST[currentTrackIndex] === item) {
          if (enhanced.cover && !enhanced.cover.includes('unsplash.com')) {
            applyTrackCover(enhanced.cover, item);
          }
          if (enhanced.lrc && (!parsedLyrics || parsedLyrics.length <= 1)) {
            parsedLyrics = parseLRC(enhanced.lrc, enhanced.tlyric);
            renderLyricsList();
            syncLyrics(audioEl.currentTime || proceduralCurrentTime);
          }
        }
      }
    }).catch(() => {});
  }

  // Add search item to playlist queue without interrupting
  function addSearchResultToQueue(item) {
    const queryText = searchInput.value.trim();
    if (queryText) {
      addSearchHistory(queryText);
    }

    const existing = PLAYLIST.some(p => 
      p.id === item.id || 
      (p.title.trim().toLowerCase() === item.title.trim().toLowerCase() && 
       p.artist.trim().toLowerCase() === item.artist.trim().toLowerCase())
    );

    if (!existing) {
      PLAYLIST.push(item);
      savePlaylistToStorage();
      updatePlaylistDrawerUI();
      document.getElementById('playlist-count').textContent = PLAYLIST.length;
      showToast(`已加入播放队列: ${item.title}`, 'success');

      // Preload details and genuine cover in background
      window.AetheriaAPI.fetchSongDetails(item).then(enhanced => {
        if (enhanced) {
          Object.assign(item, enhanced);
          savePlaylistToStorage();
          updatePlaylistDrawerUI();
        }
      }).catch(() => {});
    } else {
      showToast(`歌曲已在播放队列中: ${item.title}`, 'info');
    }
  }

  async function executeSearchSong(keyword) {
    closeCommandPalette();
    addSearchHistory(keyword);

    if (window.AetheriaAPI) {
      showToast(`正在全网搜索: ${keyword}...`, 'info');
      const results = await window.AetheriaAPI.searchSongs(keyword, currentSearchSource);
      if (results.length > 0) {
        playSearchResultItem(results[0]);
      } else {
        showToast(`未搜索到相关音源: ${keyword}`, 'warning');
      }
    }
  }

  chartTagBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      chartTagBtns.forEach(b => b.classList.remove('active', 'bg-white/10', 'text-white'));
      btn.classList.add('active', 'bg-white/10', 'text-white');
      renderChartResults(btn.dataset.chart);
    });
  });

  // ==========================================
  // 7.5 NetEase Cloud Music Import Controller
  // ==========================================
  const neteaseImportBtn = document.getElementById('netease-import-btn');
  const drawerNeteaseBtn = document.getElementById('drawer-netease-btn');
  const neteaseModal = document.getElementById('netease-modal');
  const closeNeteaseModalBtn = document.getElementById('close-netease-modal-btn');
  const cancelNeteaseBtn = document.getElementById('cancel-netease-btn');
  const submitNeteaseBtn = document.getElementById('submit-netease-btn');
  const neteaseInput = document.getElementById('netease-input');
  const neteaseReplaceQueue = document.getElementById('netease-replace-queue');
  const neteaseStatus = document.getElementById('netease-status');
  const neteaseSpinner = document.getElementById('netease-spinner');
  const neteaseSubmitText = document.getElementById('netease-submit-text');
  const neteasePresetBtns = document.querySelectorAll('.netease-preset-btn');

  function openNeteaseModal() {
    if (!neteaseModal) return;
    neteaseModal.classList.add('show');
    neteaseInput.value = '';
    neteaseStatus.className = 'hidden p-3 rounded-xl text-xs flex items-center gap-2 border';
    neteaseStatus.textContent = '';
    neteaseSpinner.classList.add('hidden');
    neteaseSubmitText.textContent = '开始同步导入';
    submitNeteaseBtn.disabled = false;
    setTimeout(() => neteaseInput.focus(), 100);
  }

  function closeNeteaseModal() {
    if (!neteaseModal) return;
    neteaseModal.classList.remove('show');
  }

  if (neteaseImportBtn) neteaseImportBtn.addEventListener('click', openNeteaseModal);
  if (drawerNeteaseBtn) {
    drawerNeteaseBtn.addEventListener('click', () => {
      togglePlaylistDrawer(false);
      openNeteaseModal();
    });
  }
  if (closeNeteaseModalBtn) closeNeteaseModalBtn.addEventListener('click', closeNeteaseModal);
  if (cancelNeteaseBtn) cancelNeteaseBtn.addEventListener('click', closeNeteaseModal);

  neteaseModal?.addEventListener('click', (e) => {
    if (e.target === neteaseModal) closeNeteaseModal();
  });

  neteasePresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      neteaseInput.value = btn.dataset.id;
      executeNeteaseImport();
    });
  });

  async function executeNeteaseImport() {
    const rawVal = neteaseInput.value.trim();
    if (!rawVal) {
      showNeteaseStatus('请输入网易云歌单链接或歌单 ID', 'error');
      return;
    }

    if (!window.AetheriaAPI) {
      showNeteaseStatus('API 核心服务初始化中，请稍候...', 'error');
      return;
    }

    const parsed = window.AetheriaAPI.parseNeteaseInput(rawVal);
    if (!parsed) {
      showNeteaseStatus('无法解析该输入，请直接输入纯数字歌单 ID (如 3778678) 或完整链接', 'error');
      return;
    }

    // Start loading
    submitNeteaseBtn.disabled = true;
    neteaseSpinner.classList.remove('hidden');
    neteaseSubmitText.textContent = '正在连接网易云节点...';
    showNeteaseStatus(`正在同步${parsed.type === 'playlist' ? '歌单' : '单曲'}数据，请稍候...`, 'info');

    try {
      if (parsed.type === 'playlist') {
        const tracks = await window.AetheriaAPI.fetchNeteasePlaylist(parsed.id);
        const shouldReplace = neteaseReplaceQueue.checked;
        if (shouldReplace) {
          PLAYLIST = tracks;
          window.PLAYLIST = PLAYLIST;
          savePlaylistToStorage();
          loadTrack(0, true);
        } else {
          PLAYLIST = PLAYLIST.concat(tracks);
          window.PLAYLIST = PLAYLIST;
          savePlaylistToStorage();
          updatePlaylistDrawerUI();
          document.getElementById('playlist-count').textContent = PLAYLIST.length;
        }

        showNeteaseStatus(`🎉 成功同步 ${tracks.length} 首曲目并永久保存！正在开启播放...`, 'success');
        setTimeout(() => {
          closeNeteaseModal();
        }, 1200);
      } else {
        const song = await window.AetheriaAPI.fetchNeteaseSong(parsed.id);
        PLAYLIST.unshift(song);
        savePlaylistToStorage();
        loadTrack(0, true);
        showNeteaseStatus(`🎉 成功导入《${song.title}》并已保存！`, 'success');
        setTimeout(() => {
          closeNeteaseModal();
        }, 1000);
      }
    } catch (err) {
      showNeteaseStatus(`导入失败: ${err.message || '网络连接超时或歌单未公开'}，请检查 ID 后重试`, 'error');
    } finally {
      submitNeteaseBtn.disabled = false;
      neteaseSpinner.classList.add('hidden');
      neteaseSubmitText.textContent = '开始同步导入';
    }
  }

  function showNeteaseStatus(msg, type = 'info') {
    neteaseStatus.classList.remove('hidden');
    if (type === 'error') {
      neteaseStatus.className = 'p-3 rounded-xl text-xs flex items-center gap-2 border border-red-500/30 bg-red-500/10 text-red-300';
    } else if (type === 'success') {
      neteaseStatus.className = 'p-3 rounded-xl text-xs flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    } else {
      neteaseStatus.className = 'p-3 rounded-xl text-xs flex items-center gap-2 border border-sky-500/30 bg-sky-500/10 text-sky-300';
    }
    neteaseStatus.textContent = msg;
  }

  submitNeteaseBtn?.addEventListener('click', executeNeteaseImport);

  neteaseInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeNeteaseImport();
    }
  });

  // ==========================================
  // 8. Lyric Card Share Modal & Export (social-spotify-card)
  // ==========================================
  function openLyricCardModal() {
    const song = PLAYLIST[currentTrackIndex];
    cardBgCover.style.backgroundImage = `url("${song.cover}")`;
    cardArtThumb.src = song.cover;
    cardSongTitle.textContent = song.title;
    cardSongArtist.textContent = song.artist;
    cardSongArtist.setAttribute('data-artist', song.artist);
    cardSongArtist.className = 'text-xs text-white/70 artist-nav-link hover:text-emerald-300 hover:underline cursor-pointer transition-colors';

    if (parsedLyrics.length > 0 && currentLyricIndex >= 0) {
      const activeItem = parsedLyrics[currentLyricIndex];
      const { zh, en, isChineseSong } = formatBilingualLyric(activeItem.text, activeItem.trans);
      if (isChineseSong) {
        cardLyricChinese.textContent = zh || activeItem.text;
        cardLyricTrans.textContent = '';
      } else {
        cardLyricChinese.textContent = zh || '';
        cardLyricTrans.textContent = en || activeItem.text;
      }
    } else {
      cardLyricChinese.textContent = song.title;
      cardLyricTrans.textContent = '';
    }

    cardShareModal.classList.add('show');
  }

  shareCardBtn.addEventListener('click', openLyricCardModal);
  closeCardModalBtn.addEventListener('click', () => cardShareModal.classList.remove('show'));

  // Export card via HTML5 Canvas
  downloadCardBtn.addEventListener('click', () => {
    const song = PLAYLIST[currentTrackIndex];
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 1080;
    offCanvas.height = 1350;
    const c = offCanvas.getContext('2d');

    // Background gradient & image
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.onload = () => {
      c.drawImage(bgImg, 0, 0, 1080, 1350);

      // Dark frosted wash
      c.fillStyle = 'rgba(10, 10, 15, 0.72)';
      c.fillRect(0, 0, 1080, 1350);

      // Top brand
      c.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
      c.fillStyle = 'rgba(255, 255, 255, 0.6)';
      c.fillText('AETHERIA SOUND · 沉浸之音', 100, 140);

      // Song Info
      c.font = 'bold 48px "Outfit", sans-serif';
      c.fillStyle = '#ffffff';
      c.fillText(song.title, 100, 230);
      c.font = '32px "Plus Jakarta Sans", sans-serif';
      c.fillStyle = 'rgba(255, 255, 255, 0.7)';
      c.fillText(song.artist, 100, 290);

      // Big Quotes & Lyrics
      c.font = 'italic 70px "Noto Serif SC", serif';
      c.fillStyle = 'rgba(255, 255, 255, 0.3)';
      c.fillText('“', 100, 560);

      c.font = 'bold 54px "Noto Serif SC", serif';
      c.fillStyle = '#ffffff';
      c.fillText(cardLyricChinese.textContent, 100, 660);

      if (cardLyricTrans.textContent) {
        c.font = '32px "Plus Jakarta Sans", sans-serif';
        c.fillStyle = 'rgba(255, 255, 255, 0.75)';
        c.fillText(cardLyricTrans.textContent, 100, 730);
      }

      c.font = 'italic 70px "Noto Serif SC", serif';
      c.fillStyle = 'rgba(255, 255, 255, 0.3)';
      c.fillText('”', 100, 840);

      // Bottom stamp
      c.fillStyle = 'rgba(255, 255, 255, 0.15)';
      c.fillRect(100, 1180, 880, 2);

      c.font = '24px monospace';
      c.fillStyle = 'rgba(255, 255, 255, 0.4)';
      c.fillText('NOW PLAYING · LOSSLESS 24-BIT', 100, 1240);

      // Download trigger
      const link = document.createElement('a');
      link.download = `Aetheria_${song.title.slice(0, 10)}_Lyric_Card.png`;
      link.href = offCanvas.toDataURL('image/png');
      link.click();
    };

    bgImg.onerror = () => {
      // Direct text export fallback
      c.fillStyle = '#111827';
      c.fillRect(0, 0, 1080, 1350);
      c.font = 'bold 50px "Noto Serif SC", serif';
      c.fillStyle = '#ffffff';
      c.fillText(cardLyricChinese.textContent, 100, 600);
      const link = document.createElement('a');
      link.download = `Lyric_Card.png`;
      link.href = offCanvas.toDataURL('image/png');
      link.click();
    };
    bgImg.src = song.cover;
  });

  // ==========================================
  // 8.5 Adaptive Glass Ambient Glow Engine (Spicetify / Blossom)
  // ==========================================
  const paletteCache = new Map();

  function extractAdaptivePalette(coverUrl, callback) {
    if (!coverUrl) {
      if (callback) callback(null);
      return;
    }

    if (paletteCache.has(coverUrl)) {
      if (callback) callback(paletteCache.get(coverUrl));
      return;
    }

    const tryExtract = (src, isRetry = false) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 64;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, size, size);
          const imgData = ctx.getImageData(0, 0, size, size).data;

          // 12 Hue Bins (each 30 degrees: 0-30, 30-60, ... 330-360)
          const bins = Array.from({ length: 12 }, () => ({
            count: 0, r: 0, g: 0, b: 0, sTotal: 0, lTotal: 0, score: 0
          }));

          let overallR = 0, overallG = 0, overallB = 0, totalValid = 0;

          for (let i = 0; i < imgData.length; i += 4) {
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            const a = imgData[i + 3];
            if (a < 128) continue;

            const rN = r / 255, gN = g / 255, bN = b / 255;
            const max = Math.max(rN, gN, bN);
            const min = Math.min(rN, gN, bN);
            let h = 0, s = 0;
            const l = (max + min) / 2;

            if (max !== min) {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              switch (max) {
                case rN: h = (gN - bN) / d + (gN < bN ? 6 : 0); break;
                case gN: h = (bN - rN) / d + 2; break;
                case bN: h = (rN - gN) / d + 4; break;
              }
              h *= 60;
            }

            overallR += r;
            overallG += g;
            overallB += b;
            totalValid++;

            // Skip dull grays, pure blacks, blown out whites
            if (l < 0.12 || l > 0.88 || s < 0.14) {
              continue;
            }

            const binIdx = Math.min(11, Math.floor(h / 30));
            const bin = bins[binIdx];
            bin.count++;
            bin.r += r;
            bin.g += g;
            bin.b += b;
            bin.sTotal += s;
            bin.lTotal += l;

            // Vibrancy formula favoring rich saturated tones
            const lightnessFactor = 1.0 - Math.abs(l - 0.52) * 1.5;
            const vibrancy = Math.max(0.1, s * 2.0 + lightnessFactor * 0.9);
            bin.score += vibrancy;
          }

          const activeBins = bins.filter(b => b.count > 0).sort((a, b) => b.score - a.score);

          let pR = 245, pG = 158, pB = 11;
          let sR = 236, sG = 72, sB = 153;

          if (activeBins.length > 0) {
            const top = activeBins[0];
            pR = Math.round(top.r / top.count);
            pG = Math.round(top.g / top.count);
            pB = Math.round(top.b / top.count);

            if (activeBins.length > 1) {
              let second = null;
              for (let k = 1; k < activeBins.length; k++) {
                const cand = activeBins[k];
                const candR = cand.r / cand.count;
                const candG = cand.g / cand.count;
                const candB = cand.b / cand.count;
                const dist = Math.hypot(pR - candR, pG - candG, pB - candB);
                if (dist > 45) {
                  second = cand;
                  break;
                }
              }
              if (!second) second = activeBins[1];
              sR = Math.round(second.r / second.count);
              sG = Math.round(second.g / second.count);
              sB = Math.round(second.b / second.count);
            } else {
              // Synthesize a harmonious color
              sR = Math.min(255, Math.max(20, Math.round(pG * 0.85 + 40)));
              sG = Math.min(255, Math.max(20, Math.round(pB * 0.90 + 35)));
              sB = Math.min(255, Math.max(20, Math.round(pR * 0.75 + 55)));
            }
          } else if (totalValid > 0) {
            pR = Math.round(overallR / totalValid);
            pG = Math.round(overallG / totalValid);
            pB = Math.round(overallB / totalValid);
            sR = Math.min(255, pR + 40);
            sG = Math.min(255, pG + 40);
            sB = Math.min(255, pB + 40);
          }

          const toHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
          const primaryHex = toHex(pR, pG, pB);
          const secondaryHex = toHex(sR, sG, sB);

          const palette = {
            primary: `rgb(${pR}, ${pG}, ${pB})`,
            secondary: `rgb(${sR}, ${sG}, ${sB})`,
            primaryHex: primaryHex,
            secondaryHex: secondaryHex,
            primaryGlow: `rgba(${pR}, ${pG}, ${pB}, 0.45)`,
            secondaryGlow: `rgba(${sR}, ${sG}, ${sB}, 0.35)`,
            glassBorderAdaptive: `rgba(${pR}, ${pG}, ${pB}, 0.32)`,
            glassBorderHover: `rgba(${pR}, ${pG}, ${pB}, 0.72)`,
            glassAmbientBg: `rgba(${pR}, ${pG}, ${pB}, 0.10)`,
            glassAuraShadow: `0 16px 40px -8px rgba(${pR}, ${pG}, ${pB}, 0.42)`,
            r: pR / 255,
            g: pG / 255,
            b: pB / 255,
            accent: primaryHex,
            glow: `rgba(${pR}, ${pG}, ${pB}, 0.55)`,
            base: `rgb(${Math.round(pR * 0.18)}, ${Math.round(pG * 0.18)}, ${Math.round(pB * 0.18)})`
          };

          paletteCache.set(coverUrl, palette);
          if (callback) callback(palette);
        } catch (e) {
          if (!isRetry && coverUrl.startsWith('http') && !coverUrl.includes('/api/proxy')) {
            tryExtract(`/api/proxy?url=${encodeURIComponent(coverUrl)}`, true);
          } else if (callback) {
            callback(null);
          }
        }
      };

      img.onerror = () => {
        if (!isRetry && coverUrl.startsWith('http') && !coverUrl.includes('/api/proxy')) {
          tryExtract(`/api/proxy?url=${encodeURIComponent(coverUrl)}`, true);
        } else if (callback) {
          callback(null);
        }
      };

      img.src = src;
    };

    tryExtract(coverUrl);
  }

  function applyAdaptivePalette(palette) {
    if (!palette) return;

    const root = document.documentElement;
    root.style.setProperty('--primary-accent', palette.primaryHex || palette.accent);
    root.style.setProperty('--secondary-accent', palette.secondaryHex || palette.secondary);
    root.style.setProperty('--primary-glow', palette.primaryGlow || palette.glow);
    root.style.setProperty('--secondary-glow', palette.secondaryGlow);
    root.style.setProperty('--glass-border-adaptive', palette.glassBorderAdaptive);
    root.style.setProperty('--glass-border-hover', palette.glassBorderHover);
    root.style.setProperty('--glass-ambient-bg', palette.glassAmbientBg);
    root.style.setProperty('--glass-aura-shadow', palette.glassAuraShadow);
    root.style.setProperty('--theme-particle-glow', palette.primaryGlow || palette.glow);

    // Update Top Brand Palette Indicator Pill
    const dotPrimary = document.getElementById('palette-dot-primary');
    const dotSecondary = document.getElementById('palette-dot-secondary');
    const hexLabel = document.getElementById('palette-hex-label');
    if (dotPrimary) dotPrimary.style.backgroundColor = palette.primaryHex || palette.accent;
    if (dotSecondary) dotSecondary.style.backgroundColor = palette.secondaryHex;
    if (hexLabel) hexLabel.textContent = (palette.primaryHex || '').toUpperCase();

    // Subtle ambient background wash
    const ambientThemeFill = document.getElementById('ambient-theme-fill');
    if (ambientThemeFill && (palette.primaryGlow || palette.glow)) {
      const g = palette.primaryGlow || palette.glow;
      const subtleGlow = g.replace(/[\d.]+\)$/, '0.14)');
      ambientThemeFill.style.background = `radial-gradient(circle at 50% 50%, #06060a 0%, #080810 32%, ${subtleGlow} 72%, #030306 100%)`;
    }

    // Update Particle Theme Vectors
    if (typeof updateParticleTheme === 'function') {
      updateParticleTheme(palette);
    }

    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        const CustomEventClass = typeof CustomEvent === 'function' ? CustomEvent : window.CustomEvent;
        if (typeof CustomEventClass === 'function') {
          window.dispatchEvent(new CustomEventClass('adaptivepalettechange', { detail: palette }));
        }
      }
    } catch (e) {}
  }

  // Backward compatibility alias for legacy call sites
  function extractThemeFromCover(coverUrl, callback) {
    extractAdaptivePalette(coverUrl, (palette) => {
      if (palette) applyAdaptivePalette(palette);
      if (callback) callback(palette);
    });
  }

  window.extractAdaptivePalette = extractAdaptivePalette;
  window.applyAdaptivePalette = applyAdaptivePalette;
  window.extractThemeFromCover = extractThemeFromCover;

  // ==========================================
  // 8.6 Mineradio Emily 3D Cover Particle Mesh Engine (WebGL)
  // ==========================================
  const particleCanvas = document.getElementById('particle-stage-canvas');
  const ambientThemeFill = document.getElementById('ambient-theme-fill');
  let gl = null;
  let particleAnimId = null;
  let particleStageActive = false;
  let particleStageTimer = null;
  let smoothBassEnergy = 0;
  let simTime = 0;
  let lastFrameTime = performance.now();
  let mouseWorld = { x: -999, y: -999 };
  let currentCoverUrl = '';

  let particleProgram = null;
  let gridVbo = null;
  let vertexCount = 0;
  let currentGridCols = 0;
  let currentGridRows = 0;
  let coverTexture = null;

  let uTimeLoc, uBassEnergyLoc, uScreenAspectLoc, uCoverScaleLoc, uPointSizeLoc, uDprLoc, uMouseLoc;
  let uThemeColorLoc, uThemeGlowLoc, uCoverTexLoc, uResonanceModeLoc;
  let uRipple0Loc, uRipple1Loc, uRipple2Loc, uRipple3Loc;
  let aGridCoordLoc;

  // Active Multi-Center Localized Ripples Pool (for Mode 0: Random Droplets)
  const RIPPLE_POOL_SIZE = 4;
  const ripples = [
    { x: 0, y: 0, startTime: -999, intensity: 0 },
    { x: 0, y: 0, startTime: -999, intensity: 0 },
    { x: 0, y: 0, startTime: -999, intensity: 0 },
    { x: 0, y: 0, startTime: -999, intensity: 0 }
  ];
  let nextRippleIdx = 0;
  let lastRippleSpawnTime = 0;

  function spawnRandomRipple(intensity = 0.85, customX = null, customY = null) {
    const rip = ripples[nextRippleIdx];
    nextRippleIdx = (nextRippleIdx + 1) % RIPPLE_POOL_SIZE;

    const aspect = (window.innerWidth || 1) / (window.innerHeight || 1);
    if (customX !== null && customY !== null) {
      rip.x = customX;
      rip.y = customY;
    } else {
      // Natural distributed droplet placement across visual field
      const angle = Math.random() * Math.PI * 2;
      const rad = 0.15 + Math.random() * 0.95;
      rip.x = Math.cos(angle) * rad * Math.min(aspect, 1.4);
      rip.y = Math.sin(angle) * rad;
    }
    rip.startTime = simTime;
    rip.intensity = Math.min(2.8, Math.max(0.35, intensity));
  }

  // 5 Distinct Audio Resonance Modes
  let currentResonanceMode = 0;
  const RESONANCE_MODES = [
    { id: 0, name: '水波涟漪', icon: '🌊', desc: '随机落点水滴涟漪与柔和声学生态' },
    { id: 1, name: '引力脉冲', icon: '🌌', desc: '鼓点引力坍缩与超新星爆炸式环形激波' },
    { id: 2, name: '克拉尼驻波', icon: '🪐', desc: '物理声学几何沙盘与节点线共振' },
    { id: 3, name: '声学地表', icon: '🏔️', desc: '3D 频谱山脊向镜头层层推进' },
    { id: 4, name: '量子星系', icon: '🌀', desc: '双螺旋旋转星云与节奏角动量加速' }
  ];

  const currentThemeVec = {
    color: [0.96, 0.62, 0.07],
    glow: [0.99, 0.78, 0.25]
  };

  const VS_SOURCE = `
    precision highp float;

    attribute vec2 aGridCoord;

    uniform float uTime;
    uniform float uBassEnergy;
    uniform float uScreenAspect;
    uniform float uCoverScale;
    uniform float uPointSize;
    uniform float uDpr;
    uniform vec2 uMouse;
    uniform float uResonanceMode;
    uniform vec3 uThemeColor;
    uniform vec3 uThemeGlow;
    uniform vec4 uRipple0;
    uniform vec4 uRipple1;
    uniform vec4 uRipple2;
    uniform vec4 uRipple3;

    varying vec2 vCoverUv;
    varying float vIsInsideCover;
    varying float vAlpha;
    varying vec3 vMarginColor;
    varying vec3 vResonanceTint;
    varying float vEdgeDist;

    // 2D/3D localized physical water ripple packet: returns vec3(dx, dy, dz)
    vec3 calcRipple(vec2 pos, vec4 rip, float time) {
      if (rip.w <= 0.001) return vec3(0.0);
      float age = time - rip.z;
      if (age < 0.0 || age > 3.0) return vec3(0.0);

      vec2 diff = pos - rip.xy;
      float d = length(diff);
      float speed = 0.95;
      float waveFront = d - age * speed;

      // Realistic Gaussian packet envelope that gracefully expands as ripple travels
      float sigma = mix(18.0, 9.0, clamp(age / 3.0, 0.0, 1.0));
      float ringEnvelope = exp(-waveFront * waveFront * sigma);
      float timeDecay = max(0.0, 1.0 - age / 3.0) * exp(-age * 0.85);

      // Multi-harmonic ripple: primary crest + secondary rebound ring
      float waveOsc = sin(d * 14.0 - age * 9.5) * 0.82 + sin(d * 22.0 - age * 13.0) * 0.28;
      float amp = waveOsc * ringEnvelope * timeDecay * rip.w * 0.16;

      // Lateral fluid displacement: particles push outward at crest, pull inward at trough
      vec2 dir = diff / (d + 0.03);
      vec2 lateralDisp = dir * (amp * 0.20);

      return vec3(lateralDisp.x, lateralDisp.y, amp);
    }

    void main() {
      // 1. Map to aspect-corrected normalized world space
      float wx = (aGridCoord.x - 0.5) * 2.0 * uScreenAspect;
      float wy = (0.5 - aGridCoord.y) * 2.0;

      // 2. Check if inside center square cover
      float halfSize = uCoverScale;
      float edgeD = max(abs(wx), abs(wy)) - halfSize;
      vEdgeDist = edgeD;

      if (abs(wx) <= halfSize && abs(wy) <= halfSize) {
        vIsInsideCover = 1.0;
        vCoverUv = vec2(
          (wx / halfSize) * 0.5 + 0.5,
          1.0 - ((wy / halfSize) * 0.5 + 0.5)
        );
      } else {
        vIsInsideCover = 0.0;
        vCoverUv = vec2(0.5, 0.5);
      }

      // 3. 3D Wave Dynamics & 5 Selectable Acoustic Resonance Modes
      float d = length(vec2(wx, wy));
      float z = 0.0;

      // Non-linear acoustic response: soft beats remain delicate, heavy drops explode!
      float bassPow = pow(clamp(uBassEnergy, 0.0, 2.4), 1.35);

      if (uResonanceMode < 0.5) {
        // Mode 0: 水波涟漪 (Random Droplet Centers & Localized Wave Packets)
        vec3 r0 = calcRipple(vec2(wx, wy), uRipple0, uTime);
        vec3 r1 = calcRipple(vec2(wx, wy), uRipple1, uTime);
        vec3 r2 = calcRipple(vec2(wx, wy), uRipple2, uTime);
        vec3 r3 = calcRipple(vec2(wx, wy), uRipple3, uTime);
        vec3 rSum = r0 + r1 + r2 + r3;

        // Physical lateral fluid displacement (parting and compression of water surface)
        wx += rSum.x;
        wy += rSum.y;

        // Ambient fluid undulation
        float w1 = sin(d * 5.2 - uTime * 1.5) * 0.018;
        float w2 = cos(wx * 3.8 + uTime * 1.1) * 0.014;
        float w3 = sin(wy * 4.2 - uTime * 1.2) * 0.014;

        float centerBreathe = exp(-d * 2.4) * bassPow * 0.35;
        z = w1 + w2 + w3 + rSum.z + centerBreathe;

      } else if (uResonanceMode < 1.5) {
        // Mode 1: 引力脉冲
        float pullWave = sin(d * 6.5 - uTime * 3.2) * (0.012 + bassPow * 0.08);
        float ringDist = abs(d - mod(uTime * 1.6, 2.4));
        float blastRing = exp(-ringDist * ringDist * 16.0) * (0.06 + bassPow * 0.65);
        float singularityCenter = exp(-d * 3.2) * (sin(uTime * 3.2) * 0.03 + bassPow * 0.72);
        z = pullWave + blastRing + singularityCenter + sin(uTime * 1.8) * 0.02;

      } else if (uResonanceMode < 2.5) {
        // Mode 2: 克拉尼驻波
        float k1 = 3.14159 * 2.2;
        float k2 = 3.14159 * 3.6;
        float chladni = (sin(wx * k1) * sin(wy * k2) - sin(wx * k2) * sin(wy * k1)) * (0.03 + bassPow * 0.35);
        float standing = sin(d * 16.0) * cos(uTime * 4.5) * (0.02 + bassPow * 0.22);
        z = chladni + standing + sin(wx * 8.0) * cos(wy * 8.0) * 0.02;

      } else if (uResonanceMode < 3.5) {
        // Mode 3: 声学地表
        float ridge1 = sin(wy * 8.5 - uTime * 3.6 + wx * 1.2) * (0.04 + bassPow * 0.42);
        float ridge2 = cos(wy * 16.0 - uTime * 5.2) * (0.015 + bassPow * 0.16);
        z = ridge1 + ridge2 + sin(wx * 6.0 + uTime * 1.4) * 0.02;

      } else {
        // Mode 4: 量子星系旋涡
        float angle = atan(wy, wx);
        float spiral = sin(angle * 3.0 + d * 6.5 - uTime * (2.2 + bassPow * 2.8)) * (0.03 + bassPow * 0.18);
        float galaxyCenter = exp(-d * 2.2) * (0.06 + bassPow * 0.68);
        z = spiral + galaxyCenter + cos(angle * 2.0 - d * 4.0 + uTime * 1.8) * 0.03;
      }

      // Interactive mouse wave
      vec2 mDiff = vec2(wx, wy) - uMouse;
      float mDist = length(mDiff);
      z += exp(-mDist * 4.0) * 0.12;

      // 4. 3D Camera Perspective Projection
      float cameraZ = 2.4;
      float pScale = cameraZ / (cameraZ - z);

      vec2 projPos = vec2(wx / uScreenAspect, wy) * pScale;
      gl_Position = vec4(projPos, z * 0.35, 1.0);

      // 5. Ultra-Fine Point Size with Audio Pop
      float size = uPointSize * pScale * (1.0 + bassPow * 0.42);
      if (vIsInsideCover > 0.5) {
        size *= 1.10;
      }
      gl_PointSize = clamp(size * uDpr, 1.5, 32.0);

      // Vignette falloff towards extreme screen corners
      vAlpha = smoothstep(uScreenAspect * 1.35, 0.28, d);

      // 6. Pre-calculate Margin Lighting & Mode Tint in Vertex Shader (Massive 70%+ Fragment Shader Speedup!)
      float marginVignette = smoothstep(uScreenAspect * 1.5, 0.30, d);
      vec3 themeBase = mix(uThemeColor * 0.35, uThemeGlow, marginVignette * 0.88);
      vMarginColor = themeBase * (0.75 + z * 1.6) * (1.0 + bassPow * 0.50);

      vec3 resTint = vec3(0.0);
      if (uResonanceMode < 0.5) {
        // Mode 0: Liquid water specular glint & caustic highlights on wave crests
        float crest = max(0.0, z - 0.02) * 2.6;
        resTint += vec3(0.12, 0.28, 0.45) * crest + vec3(0.38, 0.48, 0.60) * pow(clamp(crest * 0.75, 0.0, 1.0), 3.0);
      } else if (uResonanceMode > 3.5) {
        resTint.r = sin(d * 6.0 - uTime * 2.0) * 0.035;
        resTint.b = cos(d * 6.0 - uTime * 2.0) * 0.035;
      } else if (uResonanceMode > 1.5 && uResonanceMode < 2.5) {
        resTint = vec3(0.14 * smoothstep(0.02, 0.0, abs(z)));
      }
      if (z > 0.08) {
        resTint += vec3(0.10, 0.10, 0.14) * smoothstep(0.08, 0.20, z);
      }
      vResonanceTint = resTint;
    }
  `;

  const FS_SOURCE = `
    precision highp float;

    uniform sampler2D uCoverTex;
    uniform vec3 uThemeColor;
    uniform vec3 uThemeGlow;
    uniform float uBassEnergy;

    varying vec2 vCoverUv;
    varying float vIsInsideCover;
    varying float vAlpha;
    varying vec3 vMarginColor;
    varying vec3 vResonanceTint;
    varying float vEdgeDist;

    void main() {
      // Crisp round luminous disc (optimized: dot() instead of length() avoids sqrt)
      vec2 coord = gl_PointCoord - vec2(0.5);
      float r2 = dot(coord, coord);
      if (r2 > 0.25) discard;

      // Razor-sharp subpixel boundary (no overlapping gray fog)
      float discAlpha = smoothstep(0.25, 0.16, r2);
      float core = smoothstep(0.032, 0.0, r2);

      vec3 col;
      if (vIsInsideCover > 0.5) {
        vec4 tex = texture2D(uCoverTex, vCoverUv);
        col = tex.rgb;

        // 1. Black-Point De-fogging: purge milky ambient gray and restore deep pitch blacks
        col = max(vec3(0.0), col - 0.032) / 0.968;

        // 2. High-dynamic S-curve contrast expansion
        col = col * col * (3.0 - 2.0 * col);

        // 3. Vibrancy / Saturation boost (+22% crystal pop)
        float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(lum), col, 1.22);

        // 4. Diamond specular facet sparkle on highlights (ONLY on non-black areas)
        float sparkMask = smoothstep(0.12, 0.72, lum);
        col += (col + vec3(0.14)) * (core * 0.42 * sparkMask);

        // 5. Multiplicative acoustic pulse (blacks stay pitch black!)
        col *= (1.0 + uBassEnergy * 0.30);
      } else {
        // Outer margin: fast precomputed vertex lighting + diamond core
        col = vMarginColor + vMarginColor * (core * 0.55);
      }

      // Pre-calculated mode tint & specular highlights
      col += vResonanceTint;

      // Soft transition blend at cover boundary
      if (abs(vEdgeDist) < 0.025) {
        float blend = smoothstep(-0.025, 0.025, vEdgeDist);
        vec3 marginCol = mix(uThemeColor * 0.45, uThemeGlow, 0.55);
        col = mix(col, marginCol, blend);
      }

      gl_FragColor = vec4(col, discAlpha * vAlpha);
    }
  `;

  function createShader(glCtx, type, source) {
    const shader = glCtx.createShader(type);
    glCtx.shaderSource(shader, source);
    glCtx.compileShader(shader);
    if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
      console.warn('Shader compile failed:', glCtx.getShaderInfoLog(shader));
      glCtx.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(glCtx, vsSource, fsSource) {
    const vs = createShader(glCtx, glCtx.VERTEX_SHADER, vsSource);
    const fs = createShader(glCtx, glCtx.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;
    const prog = glCtx.createProgram();
    glCtx.attachShader(prog, vs);
    glCtx.attachShader(prog, fs);
    glCtx.linkProgram(prog);
    if (!glCtx.getProgramParameter(prog, glCtx.LINK_STATUS)) {
      console.warn('Program link failed:', glCtx.getProgramInfoLog(prog));
      glCtx.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  function initWebGL() {
    if (!particleCanvas) return false;
    if (gl) return true;

    try {
      gl = particleCanvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        premultipliedAlpha: false,
        powerPreference: 'high-performance'
      }) || particleCanvas.getContext('experimental-webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        premultipliedAlpha: false,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      gl = null;
    }

    if (!gl) {
      console.warn('WebGL not available for particle stage.');
      return false;
    }

    particleProgram = createProgram(gl, VS_SOURCE, FS_SOURCE);
    if (!particleProgram) return false;

    gl.useProgram(particleProgram);

    // Uniform locations
    uTimeLoc = gl.getUniformLocation(particleProgram, 'uTime');
    uBassEnergyLoc = gl.getUniformLocation(particleProgram, 'uBassEnergy');
    uScreenAspectLoc = gl.getUniformLocation(particleProgram, 'uScreenAspect');
    uCoverScaleLoc = gl.getUniformLocation(particleProgram, 'uCoverScale');
    uPointSizeLoc = gl.getUniformLocation(particleProgram, 'uPointSize');
    uDprLoc = gl.getUniformLocation(particleProgram, 'uDpr');
    uMouseLoc = gl.getUniformLocation(particleProgram, 'uMouse');
    uThemeColorLoc = gl.getUniformLocation(particleProgram, 'uThemeColor');
    uThemeGlowLoc = gl.getUniformLocation(particleProgram, 'uThemeGlow');
    uCoverTexLoc = gl.getUniformLocation(particleProgram, 'uCoverTex');
    uResonanceModeLoc = gl.getUniformLocation(particleProgram, 'uResonanceMode');
    uRipple0Loc = gl.getUniformLocation(particleProgram, 'uRipple0');
    uRipple1Loc = gl.getUniformLocation(particleProgram, 'uRipple1');
    uRipple2Loc = gl.getUniformLocation(particleProgram, 'uRipple2');
    uRipple3Loc = gl.getUniformLocation(particleProgram, 'uRipple3');

    aGridCoordLoc = gl.getAttribLocation(particleProgram, 'aGridCoord');

    // Additive alpha blending for luminous point glow
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Placeholder texture
    createDefaultTexture();

    // Passive Mouse listener with cached dimensions
    let cachedWinW = window.innerWidth || 1920;
    let cachedWinH = window.innerHeight || 1080;
    let cachedAspect = cachedWinW / cachedWinH;

    window.addEventListener('mousemove', (e) => {
      if (!particleStageActive) return;
      mouseWorld.x = (e.clientX / cachedWinW - 0.5) * 2.0 * cachedAspect;
      mouseWorld.y = (0.5 - e.clientY / cachedWinH) * 2.0;
    }, { passive: true });

    // Interactive pointer/click ripple generator on stage
    window.addEventListener('pointerdown', (e) => {
      if (!particleStageActive) return;
      if (e.target && e.target.closest && e.target.closest('button, input, select, textarea, .playlist-drawer, #command-palette, .dock-island, .scrubber-container, .interactive-btn')) {
        return;
      }
      const clickX = (e.clientX / cachedWinW - 0.5) * 2.0 * cachedAspect;
      const clickY = (0.5 - e.clientY / cachedWinH) * 2.0;
      spawnRandomRipple(1.65, clickX, clickY);
    }, { passive: true });

    window.addEventListener('resize', () => {
      cachedWinW = window.innerWidth || 1920;
      cachedWinH = window.innerHeight || 1080;
      cachedAspect = cachedWinW / cachedWinH;
      resizeParticleCanvas();
      if (amllPlayer && typeof amllPlayer.onResize === 'function') {
        amllPlayer.onResize();
      }
    });
    return true;
  }
  const initParticleStage = initWebGL;

  function createDefaultTexture() {
    if (!gl) return;
    coverTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, coverTexture);
    const pixel = new Uint8Array([
      245, 158, 11, 255,   217, 119, 6, 255,
      234, 88, 12, 255,    59, 130, 246, 255
    ]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  function updateParticleCover(coverUrl) {
    if (!coverUrl) return;
    currentCoverUrl = coverUrl;
    if (!gl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!gl || currentCoverUrl !== coverUrl) return;
      try {
        if (!coverTexture) coverTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, coverTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      } catch (err) {
        // Fallback: copy via canvas if direct gl.texImage2D is blocked
        try {
          const offCanvas = document.createElement('canvas');
          offCanvas.width = 512;
          offCanvas.height = 512;
          const offCtx = offCanvas.getContext('2d');
          offCtx.drawImage(img, 0, 0, 512, 512);
          gl.bindTexture(gl.TEXTURE_2D, coverTexture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offCanvas);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          offCanvas.width = 0;
          offCanvas.height = 0;
        } catch (e2) {}
      }
    };
    img.src = coverUrl;
  }

  function setupGridGeometry(w, h) {
    if (!gl) return;
    const aspect = w / h;
    // Ultra-optimized lightweight particle grid (~10,000 to 14,000 points)
    // Pitch ~9.5px: crystal-clear organic stardust visual with 90% less GPU memory & zero lag
    const rows = Math.min(Math.max(Math.round(h / 9.5), 70), 120);
    const cols = Math.min(Math.max(Math.round(rows * aspect), 95), 190);

    if (cols === currentGridCols && rows === currentGridRows && gridVbo) {
      return;
    }

    currentGridCols = cols;
    currentGridRows = rows;
    vertexCount = cols * rows;

    const positions = new Float32Array(vertexCount * 2);
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const v = rows > 1 ? r / (rows - 1) : 0.5;
      for (let c = 0; c < cols; c++) {
        const u = cols > 1 ? c / (cols - 1) : 0.5;
        positions[idx++] = u;
        positions[idx++] = v;
      }
    }

    if (!gridVbo) {
      gridVbo = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gridVbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  }

  function resizeParticleCanvas() {
    if (!particleCanvas) return;
    // Cap DPR at 1.0 to save hundreds of megabytes of GPU framebuffer memory
    const dpr = Math.min(window.devicePixelRatio || 1, 1.0);
    const w = window.innerWidth;
    const h = window.innerHeight;
    particleCanvas.width = Math.round(w * dpr);
    particleCanvas.height = Math.round(h * dpr);

    if (gl) {
      gl.viewport(0, 0, particleCanvas.width, particleCanvas.height);
      setupGridGeometry(w, h);
    }
  }

  function updateParticleTheme(theme) {
    if (!theme) return;
    const accent = theme.accent || '#f59e0b';
    const glow = theme.glow || 'rgba(245, 158, 11, 0.45)';

    document.documentElement.style.setProperty('--primary-accent', accent);
    document.documentElement.style.setProperty('--primary-glow', glow);
    document.documentElement.style.setProperty('--theme-particle-glow', glow);

    if (ambientThemeFill) {
      const subtleGlow = glow.replace(/[\d.]+\)$/, '0.16)');
      ambientThemeFill.style.background = `radial-gradient(circle at 50% 50%, #06060a 0%, #080810 32%, ${subtleGlow} 72%, #030306 100%)`;
    }

    if (theme.r !== undefined && theme.g !== undefined && theme.b !== undefined) {
      currentThemeVec.color = [theme.r, theme.g, theme.b];
    } else {
      const match = accent.match(/\d+/g);
      if (match && match.length >= 3) {
        currentThemeVec.color = [
          parseInt(match[0], 10) / 255,
          parseInt(match[1], 10) / 255,
          parseInt(match[2], 10) / 255
        ];
      }
    }
    currentThemeVec.glow = [
      Math.min(1.0, currentThemeVec.color[0] * 1.35),
      Math.min(1.0, currentThemeVec.color[1] * 1.35),
      Math.min(1.0, currentThemeVec.color[2] * 1.35)
    ];
  }

  function activateParticleStage(active) {
    if (particleStageTimer) clearTimeout(particleStageTimer);

    if (active) {
      particleStageActive = true;
      if (!gl) {
        initWebGL();
      }
      resizeParticleCanvas();

      const song = PLAYLIST[currentTrackIndex];
      if (song && song.cover) {
        updateParticleCover(song.cover);
      }

      if (ambientThemeFill) ambientThemeFill.classList.add('active');
      if (particleCanvas) particleCanvas.classList.add('active');

      if (!particleAnimId) {
        particleAnimLoop();
      }
    } else {
      particleStageActive = false;
      if (ambientThemeFill) ambientThemeFill.classList.remove('active');
      if (particleCanvas) particleCanvas.classList.remove('active');

      // Allow 750ms for CSS fade-out before cancelling RAF loop to conserve 100% CPU/GPU
      particleStageTimer = setTimeout(() => {
        if (!particleStageActive && particleAnimId) {
          cancelAnimationFrame(particleAnimId);
          particleAnimId = null;
          if (gl) {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
          }
        }
      }, 750);
    }
  }

  function particleAnimLoop() {
    if (!particleStageActive && !particleCanvas?.classList.contains('active')) {
      particleAnimId = null;
      return;
    }

    const now = performance.now();
    const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;
    simTime += dt;

    // 1. In-Browser Algorithmic Drum Beat & Transient Detector
    const currentSong = PLAYLIST[currentTrackIndex];
    const beatInfo = BeatDetector.process(
      visualizerDataArray,
      now,
      audioEl.currentTime || proceduralCurrentTime,
      currentSong
    );

    // High-precision 60fps real-time lyric synchronization
    if (isPlaying && audioEl.currentTime) {
      syncLyrics(audioEl.currentTime);
    }

    // Smooth baseline energy + Instant physical drum transient impact scaled by dynamic weight
    smoothBassEnergy += (beatInfo.rawEnergy - smoothBassEnergy) * 0.26;
    const dynamicImpact = beatInfo.impulse * Math.pow(beatInfo.weight || 1.0, 1.15);
    const totalAcousticEnergy = Math.min(2.4, smoothBassEnergy * 0.35 + dynamicImpact * 0.85);

    // Mode 0: Rhythmic droplet ripple triggered precisely on drum kicks with dynamic velocity amplitude
    if (currentResonanceMode === 0) {
      if (isPlaying) {
        if (beatInfo.isKick && beatInfo.impulse > 0.30) {
          lastRippleSpawnTime = now;
          const rippleIntensity = Math.min(2.5, Math.max(0.4, beatInfo.impulse * (beatInfo.weight || 1.0) * 1.25));
          spawnRandomRipple(rippleIntensity);
        } else if (now - lastRippleSpawnTime > 1500) {
          lastRippleSpawnTime = now;
          spawnRandomRipple(0.45);
        }
      } else if (now - lastRippleSpawnTime > 3200) {
        lastRippleSpawnTime = now;
        spawnRandomRipple(0.35);
      }
    }

    if (document.hidden) {
      particleAnimId = requestAnimationFrame(particleAnimLoop);
      return;
    }

    if (gl && particleProgram && gridVbo && vertexCount > 0) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const aspect = w / h;
      const coverScale = Math.min(0.70, aspect * 0.82);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.0);
      const basePointSize = (h / (currentGridRows || 100)) * 1.05;

      gl.useProgram(particleProgram);

      gl.uniform1f(uTimeLoc, simTime);
      gl.uniform1f(uBassEnergyLoc, totalAcousticEnergy);
      gl.uniform1f(uScreenAspectLoc, aspect);
      gl.uniform1f(uCoverScaleLoc, coverScale);
      gl.uniform1f(uPointSizeLoc, basePointSize);
      gl.uniform1f(uDprLoc, dpr);
      gl.uniform2f(uMouseLoc, mouseWorld.x, mouseWorld.y);
      gl.uniform3f(uThemeColorLoc, currentThemeVec.color[0], currentThemeVec.color[1], currentThemeVec.color[2]);
      gl.uniform3f(uThemeGlowLoc, currentThemeVec.glow[0], currentThemeVec.glow[1], currentThemeVec.glow[2]);
      gl.uniform1f(uResonanceModeLoc, currentResonanceMode);
      gl.uniform4f(uRipple0Loc, ripples[0].x, ripples[0].y, ripples[0].startTime, ripples[0].intensity);
      gl.uniform4f(uRipple1Loc, ripples[1].x, ripples[1].y, ripples[1].startTime, ripples[1].intensity);
      gl.uniform4f(uRipple2Loc, ripples[2].x, ripples[2].y, ripples[2].startTime, ripples[2].intensity);
      gl.uniform4f(uRipple3Loc, ripples[3].x, ripples[3].y, ripples[3].startTime, ripples[3].intensity);

      // Texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, coverTexture);
      gl.uniform1i(uCoverTexLoc, 0);

      // Attribute
      gl.bindBuffer(gl.ARRAY_BUFFER, gridVbo);
      gl.vertexAttribPointer(aGridCoordLoc, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(aGridCoordLoc);

      // Single hardware draw call (gl.POINTS)
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, vertexCount);
    }

    particleAnimId = requestAnimationFrame(particleAnimLoop);
  }

  let resonanceToastTimer = null;
  function showResonanceToast(mode) {
    let toast = document.getElementById('resonance-mode-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'resonance-mode-toast';
      toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#14141e]/95 backdrop-blur-2xl border border-white/20 text-white shadow-2xl flex items-center gap-2.5 text-xs font-medium pointer-events-none transition-all duration-300 opacity-0 -translate-y-2';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="text-base">${mode.icon}</span><span>共振模式: <strong class="text-emerald-400 font-semibold">${mode.name}</strong></span><span class="text-white/50 text-[11px] ml-1">· ${mode.desc}</span>`;
    toast.classList.remove('opacity-0', '-translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');

    clearTimeout(resonanceToastTimer);
    resonanceToastTimer = setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', '-translate-y-2');
    }, 1900);
  }

  function cycleResonanceMode() {
    currentResonanceMode = (currentResonanceMode + 1) % RESONANCE_MODES.length;
    const mode = RESONANCE_MODES[currentResonanceMode];
    showResonanceToast(mode);

    const pillText = document.getElementById('resonance-mode-text');
    if (pillText) pillText.textContent = `共振: ${mode.name}`;
    const pillIcon = document.getElementById('resonance-mode-icon');
    if (pillIcon) pillIcon.textContent = mode.icon;
  }

  // ==========================================
  // 9. Layout Mode & Mineradio Cinematic Immersion
  // ==========================================
  let modeSwitchTimer = null;

  function setLayoutMode(mode) {
    currentLayoutMode = mode;
    document.body.classList.remove('mode-lyric-focus', 'mode-split', 'mode-dashboard');
    [modeDashboardBtn, modeLyricBtn, modeSplitBtn].forEach(btn => btn?.classList.remove('active'));

    const dashboardColumn = document.getElementById('dashboard-column');
    const albumColumn = document.getElementById('album-column');
    const lyricsColumn = document.getElementById('lyrics-column');

    clearTimeout(modeSwitchTimer);

    if (mode === 'dashboard') {
      document.body.classList.add('mode-dashboard');
      modeDashboardBtn?.classList.add('active');
      if (dashboardColumn) {
        dashboardColumn.classList.remove('hidden');
        dashboardColumn.style.display = 'flex';
        dashboardColumn.style.opacity = '1';
        dashboardColumn.style.pointerEvents = 'auto';
      }
      if (albumColumn) albumColumn.style.display = 'none';
      if (lyricsColumn) lyricsColumn.style.display = 'none';

      activateParticleStage(false);
      updateDashboardData();
    } else if (mode === 'lyric-focus') {
      document.body.classList.add('mode-lyric-focus');
      modeLyricBtn?.classList.add('active');
      if (dashboardColumn) {
        dashboardColumn.classList.add('hidden');
        dashboardColumn.style.display = 'none';
        dashboardColumn.style.opacity = '0';
        dashboardColumn.style.pointerEvents = 'none';
      }
      if (albumColumn) albumColumn.style.display = '';
      if (lyricsColumn) lyricsColumn.style.display = '';

      // Layout animation completes at 650ms, then activate 3D particle cover mesh
      modeSwitchTimer = setTimeout(() => {
        activateParticleStage(true);
        if (amllPlayer && typeof amllPlayer.onResize === 'function') amllPlayer.onResize();
      }, 650);
    } else {
      document.body.classList.add('mode-split');
      modeSplitBtn?.classList.add('active');
      if (dashboardColumn) {
        dashboardColumn.classList.add('hidden');
        dashboardColumn.style.display = 'none';
        dashboardColumn.style.opacity = '0';
        dashboardColumn.style.pointerEvents = 'none';
      }
      if (albumColumn) albumColumn.style.display = '';
      if (lyricsColumn) lyricsColumn.style.display = '';

      activateParticleStage(false);
      modeSwitchTimer = setTimeout(() => {
        if (amllPlayer && typeof amllPlayer.onResize === 'function') amllPlayer.onResize();
      }, 350);
    }
  }

  if (modeDashboardBtn) modeDashboardBtn.addEventListener('click', () => setLayoutMode('dashboard'));
  modeLyricBtn.addEventListener('click', () => setLayoutMode('lyric-focus'));
  modeSplitBtn.addEventListener('click', () => setLayoutMode('split'));

  const brandHomeBtn = document.getElementById('brand-home-btn');
  if (brandHomeBtn) {
    brandHomeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setLayoutMode('dashboard');
    });
  }

  const neteaseActionHome = document.getElementById('netease-action-home');
  if (neteaseActionHome) {
    neteaseActionHome.addEventListener('click', () => {
      document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.classList.remove('show'));
      setLayoutMode('dashboard');
    });
  }

  if (dockMiniTrackInfo) {
    dockMiniTrackInfo.addEventListener('click', (e) => {
      // If clicking artist nav link, allow artist profile modal to open
      if (e.target.closest('#dock-mini-artist, .artist-nav-link')) return;
      // In lyric focus mode or dashboard mode, clicking mini card smoothly returns to split view
      if (currentLayoutMode === 'lyric-focus' || currentLayoutMode === 'dashboard') {
        setLayoutMode('split');
      }
    });
  }

  // ==========================================
  // 9.5 Spicetify Minimal Fluent Bento Dashboard Engine
  // ==========================================
  const TOP_TRENDING_CATALOG = [
    {
      id: 'jvke_goldenhour',
      title: 'Golden Hour',
      artist: 'JVKE',
      album: 'this is what ____ feels like',
      genre: 'POP / PIANO / INDIE',
      duration: '3:29',
      cover: '/covers/jvke_goldenhour_static.jpg',
      theme: { accent: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)' }
    },
    {
      id: 'theweeknd_starboy',
      title: 'Starboy',
      artist: 'The Weeknd ft. Daft Punk',
      album: 'Starboy',
      genre: 'R&B / ELECTROPOP',
      duration: '3:50',
      cover: '/covers/theweeknd_starboy_static.jpg',
      theme: { accent: '#3b82f6', glow: 'rgba(59, 130, 246, 0.45)' }
    },
    {
      id: 'taylor_cruelsummer',
      title: 'Cruel Summer',
      artist: 'Taylor Swift',
      album: 'Lover',
      genre: 'SYNTH-POP',
      duration: '2:58',
      cover: '/covers/taylor_cruelsummer_static.jpg',
      theme: { accent: '#ec4899', glow: 'rgba(236, 72, 153, 0.45)' }
    },
    {
      id: 'theweeknd_blindinglights',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      genre: 'SYNTHWAVE / RETRO POP',
      duration: '3:20',
      cover: '/covers/theweeknd_blindinglights_static.jpg',
      theme: { accent: '#ef4444', glow: 'rgba(239, 68, 68, 0.45)' }
    },
    {
      id: 'beyond_haikuotiankong',
      title: '海阔天空',
      artist: 'Beyond · 黄家驹',
      album: '乐与怒',
      genre: 'CLASSIC ROCK / CANTONESE',
      duration: '5:24',
      cover: '/covers/beyond_haikuotiankong_static.jpg',
      theme: { accent: '#06b6d4', glow: 'rgba(6, 182, 212, 0.45)' }
    }
  ];

  function updateDashboardClockGreeting() {
    const clockEl = document.getElementById('dashboard-live-clock');
    const greetingEl = document.getElementById('dashboard-greeting-text');
    if (!clockEl && !greetingEl) return;

    const now = new Date();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    if (clockEl) clockEl.textContent = `${String(hours).padStart(2, '0')}:${minutes}`;

    if (greetingEl) {
      if (hours >= 5 && hours < 12) {
        greetingEl.textContent = 'Morning Focus / 晨光自习';
      } else if (hours >= 12 && hours < 18) {
        greetingEl.textContent = 'Afternoon Chill / 午后漫步';
      } else if (hours >= 18 && hours < 23) {
        greetingEl.textContent = 'Evening Pulse / 暮色律动';
      } else {
        greetingEl.textContent = 'Late Night Focus / 夜间漫游';
      }
    }
  }

  function updateBentoFeaturedCard(song) {
    const curSong = song || PLAYLIST[currentTrackIndex] || TOP_TRENDING_CATALOG[1];
    const fTitle = document.getElementById('bento-featured-title');
    const fArtist = document.getElementById('bento-featured-artist');
    const fCover = document.getElementById('bento-featured-cover');
    const fGenre = document.getElementById('bento-featured-genre');

    if (fTitle && curSong.title) fTitle.textContent = curSong.title;
    if (fArtist && curSong.artist) fArtist.textContent = curSong.artist;
    if (fGenre) fGenre.textContent = curSong.genre || 'POP / HI-RES';
    if (fCover && curSong.cover) {
      fCover.src = curSong.cover;
    }
  }

  function renderBentoTrendingList() {
    const listContainer = document.getElementById('bento-trending-list');
    if (!listContainer) return;

    const curSong = PLAYLIST[currentTrackIndex];
    listContainer.innerHTML = TOP_TRENDING_CATALOG.map((track, idx) => {
      const isCur = curSong && (curSong.title === track.title || curSong.id === track.id);
      const rankNum = String(idx + 1).padStart(2, '0');
      return `
        <div class="bento-rank-row flex items-center justify-between cursor-pointer group/row ${isCur ? 'is-active' : ''}" data-track-id="${track.id}">
          <div class="flex items-center gap-3 overflow-hidden">
            <span class="w-6 text-center font-mono text-xs font-bold ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-amber-600' : 'text-white/40'}">
              ${rankNum}
            </span>
            <img src="${track.cover}" alt="${track.title}" class="w-9 h-9 rounded-lg object-cover shadow-sm shrink-0" />
            <div class="overflow-hidden">
              <div class="text-xs font-semibold text-white/90 truncate group-hover/row:text-emerald-300 transition-colors">${track.title}</div>
              <div class="text-[10px] text-white/50 truncate">${track.artist}</div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[10px] text-white/40 font-mono hidden sm:inline">${track.duration}</span>
            <div class="w-7 h-7 rounded-full bg-white/10 group-hover/row:bg-emerald-400 group-hover/row:text-black text-white/70 flex items-center justify-center transition-all duration-200">
              <svg class="w-3.5 h-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Bind click events on rows
    listContainer.querySelectorAll('.bento-rank-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-track-id');
        const found = TOP_TRENDING_CATALOG.find(t => t.id === id);
        if (!found) return;

        // Check if track is already in PLAYLIST
        let playlistIdx = PLAYLIST.findIndex(p => p.id === id || p.title === found.title);
        if (playlistIdx === -1) {
          PLAYLIST.push({ ...found });
          playlistIdx = PLAYLIST.length - 1;
          savePlaylistToStorage();
          updatePlaylistDrawerUI();
        }
        loadTrack(playlistIdx, true);
        renderBentoTrendingList();
        updateBentoFeaturedCard();
      });
    });
  }

  function updateDashboardData() {
    updateDashboardClockGreeting();
    updateBentoFeaturedCard();
    renderBentoTrendingList();
  }

  // Dashboard Controls & Mood Stations Binding
  const bentoFeaturedCard = document.getElementById('bento-featured-card');
  const bentoFeaturedPlayBtn = document.getElementById('bento-featured-play-btn');
  if (bentoFeaturedPlayBtn) {
    bentoFeaturedPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isPlaying) {
        togglePlay();
      } else {
        if (!audioEl.src || audioEl.src.includes('localhost') && audioEl.paused) {
          loadTrack(currentTrackIndex, true);
        } else {
          playTrack();
        }
      }
    });
  }
  if (bentoFeaturedCard) {
    bentoFeaturedCard.addEventListener('click', () => {
      setLayoutMode('split');
    });
  }

  const dashboardRandomBtn = document.getElementById('dashboard-random-play-btn');
  if (dashboardRandomBtn) {
    dashboardRandomBtn.addEventListener('click', () => {
      if (window.isNeteaseLoggedIn) {
        triggerFullNetworkRoaming();
      } else if (PLAYLIST && PLAYLIST.length > 0) {
        const randIdx = Math.floor(Math.random() * PLAYLIST.length);
        loadTrack(randIdx, true);
        updateDashboardData();
        showToast(`🎲 随机漫游: 《${PLAYLIST[randIdx].title}》 (登录网易云可解锁全网智能漫游)`, 'info');
      }
    });
  }

  const dashboardQueueBtn = document.getElementById('dashboard-queue-btn');
  if (dashboardQueueBtn) {
    dashboardQueueBtn.addEventListener('click', () => {
      togglePlaylistDrawer(true);
    });
  }

  const bentoStationLofi = document.getElementById('bento-station-lofi');
  if (bentoStationLofi) {
    bentoStationLofi.addEventListener('click', () => {
      const idx = PLAYLIST.findIndex(p => p.id === 'jvke_goldenhour' || p.title.includes('Golden Hour'));
      if (idx !== -1) {
        loadTrack(idx, true);
      } else {
        loadTrack(0, true);
      }
      showToast('☕ 已开启每日解压慢享场景', 'success');
      updateDashboardData();
    });
  }

  const bentoStationSynth = document.getElementById('bento-station-synth');
  if (bentoStationSynth) {
    bentoStationSynth.addEventListener('click', () => {
      const idx = PLAYLIST.findIndex(p => p.id === 'theweeknd_blindinglights' || p.title.includes('Blinding Lights'));
      if (idx !== -1) {
        loadTrack(idx, true);
      } else {
        loadTrack(0, true);
      }
      showToast('🌌 已开启霓虹赛博夜行电台', 'success');
      updateDashboardData();
    });
  }

  // 3D Tilt on Album Cover with rAF damping & fluid micro-perspective
  const perspectiveBox = document.getElementById('cover-perspective-box');
  let tiltRaf = null;

  let cachedCoverRect = null;
  perspectiveBox.addEventListener('mouseenter', () => {
    coverCard.style.transition = 'transform 0.08s ease-out';
    cachedCoverRect = coverCard.getBoundingClientRect();
  });

  perspectiveBox.addEventListener('mousemove', (e) => {
    if (tiltRaf) cancelAnimationFrame(tiltRaf);
    tiltRaf = requestAnimationFrame(() => {
      const rect = cachedCoverRect || coverCard.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      // Controlled subtle tilt (max ±8.5 deg) - prevents 3D clipping and extreme distortion
      const rotateX = Math.max(Math.min(-(y / (rect.height / 2)) * 8.5, 8.5), -8.5);
      const rotateY = Math.max(Math.min((x / (rect.width / 2)) * 8.5, 8.5), -8.5);

      coverCard.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
    });
  });

  perspectiveBox.addEventListener('mouseleave', () => {
    cachedCoverRect = null;
    if (tiltRaf) cancelAnimationFrame(tiltRaf);
    coverCard.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
    coverCard.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  });

  // Fullscreen & Auto-hiding Top Bar Immersion
  let topbarHideTimeout = null;

  function setFullscreenUI(isFS) {
    if (isFS) {
      document.body.classList.add('is-fullscreen');
      fullscreenBtn.title = '退出全屏 (Esc 或 F)';
      fullscreenBtn.innerHTML = `
        <svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
        </svg>
      `;
    } else {
      document.body.classList.remove('is-fullscreen', 'topbar-revealed');
      fullscreenBtn.title = '全屏模式 (F)';
      fullscreenBtn.innerHTML = `
        <svg class="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      `;
      clearTimeout(topbarHideTimeout);
    }
  }

  async function toggleFullscreen() {
    if (window.electronAPI && typeof window.electronAPI.windowControls?.toggleFullscreen === 'function') {
      const isFS = await window.electronAPI.windowControls.toggleFullscreen();
      setFullscreenUI(isFS);
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  fullscreenBtn.addEventListener('click', toggleFullscreen);

  // Standard Fullscreen Event Listener
  const onFullscreenChange = () => {
    setFullscreenUI(!!document.fullscreenElement);
  };
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  // Reveal top bar when mouse approaches upper edge in Fullscreen
  window.addEventListener('mousemove', (e) => {
    if (!document.body.classList.contains('is-fullscreen')) return;

    if (e.clientY <= 55) {
      document.body.classList.add('topbar-revealed');
      clearTimeout(topbarHideTimeout);
    } else if (e.clientY > 110) {
      clearTimeout(topbarHideTimeout);
      topbarHideTimeout = setTimeout(() => {
        document.body.classList.remove('topbar-revealed');
      }, 1500);
    }
  });

  // Ambient Glow Toggle
  visualizerToggleBtn.addEventListener('click', () => {
    isVisualizerEnabled = !isVisualizerEnabled;
    const ambientBack = document.getElementById('ambient-cover-back');
    const ambientFront = document.getElementById('ambient-cover-front');
    if (ambientFront) ambientFront.style.opacity = isVisualizerEnabled ? '0.12' : '0';
    if (ambientBack) ambientBack.style.opacity = isVisualizerEnabled ? '0.12' : '0';
    visualizerToggleBtn.classList.toggle('text-sky-400', isVisualizerEnabled);
    visualizerToggleBtn.classList.toggle('text-white/40', !isVisualizerEnabled);
  });

  // Playlist Drawer
  function updatePlaylistDrawerUI() {
    playlistItems.innerHTML = '';
    const drawerCountEl = document.getElementById('playlist-drawer-count');
    if (drawerCountEl) drawerCountEl.textContent = `共 ${PLAYLIST.length} 首`;
    const playlistCountEl = document.getElementById('playlist-count');
    if (playlistCountEl) playlistCountEl.textContent = PLAYLIST.length;

    if (!PLAYLIST || PLAYLIST.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'p-8 text-center text-white/40 text-xs flex flex-col items-center justify-center gap-3';
      emptyDiv.innerHTML = `
        <span class="text-3xl opacity-50">🎵</span>
        <p class="font-medium text-white/60">播放列表暂无歌曲</p>
        <p class="text-[11px] text-white/35">可通过「全网搜歌」或「导入网易云/本地文件」添加歌曲</p>
      `;
      playlistItems.appendChild(emptyDiv);
      return;
    }

    PLAYLIST.forEach((song, idx) => {
      const row = document.createElement('div');
      row.className = `playlist-row p-3 flex items-center justify-between cursor-pointer group ${idx === currentTrackIndex ? 'active' : ''}`;

      const defaultPlaceholder = getAestheticPlaceholderCover(song.title, song.artist);
      const hasRealCover = song.cover &&
        !song.cover.includes('unsplash.com') &&
        !song.cover.includes('api.i-meto.com') &&
        !song.cover.startsWith('data:image/svg+xml');

      let thumbCover = hasRealCover ? song.cover : defaultPlaceholder;
      if (hasRealCover && thumbCover && thumbCover.includes('music.126.net')) {
        thumbCover = thumbCover.replace(/\?param=\d+y\d+/, '') + '?param=100y100';
      }

      row.innerHTML = `
        <div class="flex items-center gap-3 overflow-hidden min-w-0 flex-1 pr-2">
          <img src="${thumbCover}" loading="lazy" class="drawer-row-thumb w-11 h-11 rounded-xl object-cover shadow shrink-0 bg-white/5" />
          <div class="text-left overflow-hidden min-w-0">
            <h4 class="text-xs font-semibold text-white leading-tight truncate">${song.title}</h4>
            <p class="text-[11px] text-white/50 truncate flex items-center gap-1.5 mt-0.5">
              <span class="artist-nav-link hover:text-emerald-300 hover:underline cursor-pointer" data-artist="${song.artist}">${song.artist}</span>
              ${song.album ? `<span class="text-white/20">•</span><span class="album-nav-link text-white/40 hover:text-emerald-300 hover:underline cursor-pointer" data-album="${song.album}" data-artist="${song.artist}">${song.album}</span>` : ''}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <div class="text-[10px] font-mono text-white/40">
            ${idx === currentTrackIndex ? '<span class="text-emerald-400 font-bold">PLAYING</span>' : (song.genre ? song.genre.split('/')[0] : 'TRACK')}
          </div>
          <button class="delete-track-btn opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 text-white/30 text-xs transition-opacity" title="从歌单移除">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;

      const rowImg = row.querySelector('.drawer-row-thumb');
      if (rowImg) {
        rowImg.onerror = () => { rowImg.src = defaultPlaceholder; };
      }

      row.addEventListener('click', (e) => {
        if (e.target.closest('.delete-track-btn, .artist-nav-link, .album-nav-link')) return;
        loadTrack(idx, true);
        togglePlaylistDrawer(false);
      });

      const delBtn = row.querySelector('.delete-track-btn');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          PLAYLIST.splice(idx, 1);
          savePlaylistToStorage();
          if (PLAYLIST.length === 0) {
            loadTrack(0, false);
          } else if (idx === currentTrackIndex) {
            loadTrack(Math.min(idx, PLAYLIST.length - 1), isPlaying);
          } else if (idx < currentTrackIndex) {
            currentTrackIndex--;
            updatePlaylistDrawerUI();
          } else {
            updatePlaylistDrawerUI();
          }
        });
      }

      playlistItems.appendChild(row);
    });
  }

  function togglePlaylistDrawer(show) {
    if (show) playlistDrawer.classList.remove('translate-x-full');
    else playlistDrawer.classList.add('translate-x-full');
  }

  playlistToggleBtn.addEventListener('click', () => togglePlaylistDrawer(true));
  closePlaylistBtn.addEventListener('click', () => togglePlaylistDrawer(false));

  const clearPlaylistBtn = document.getElementById('clear-playlist-btn') || document.getElementById('reset-playlist-btn');
  if (clearPlaylistBtn) {
    clearPlaylistBtn.addEventListener('click', () => {
      if (!PLAYLIST || PLAYLIST.length === 0) {
        showToast('播放列表已为空', 'info');
        return;
      }
      if (confirm('是否清空当前播放队列？')) {
        PLAYLIST = [];
        window.PLAYLIST = PLAYLIST;
        savePlaylistToStorage();
        loadTrack(0, false);
        showToast('播放列表已清空', 'info');
      }
    });
  }

  // Local File Upload with Pure ID3 / FLAC Parser and IndexedDB Persistence
  localFileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    let audioFiles = [];
    let lrcFiles = [];

    files.forEach(f => {
      if (f.name.endsWith('.lrc')) lrcFiles.push(f);
      else if (f.type.startsWith('audio/') || f.name.endsWith('.mp3') || f.name.endsWith('.wav') || f.name.endsWith('.flac') || f.name.endsWith('.m4a') || f.name.endsWith('.ogg')) {
        audioFiles.push(f);
      }
    });

    if (audioFiles.length === 0) return;

    showToast(`正在解析 ${audioFiles.length} 首本地音频标签与内嵌封面...`, 'music');

    for (let i = 0; i < audioFiles.length; i++) {
      const audioFile = audioFiles[i];
      // 1. Extract genuine metadata & embedded APIC cover from file binary
      const meta = await AudioMetadataReader.parseFile(audioFile);
      const trackId = 'local_' + Date.now() + '_' + i + '_' + Math.floor(Math.random() * 1000);

      // 2. Persist audio file blob into IndexedDB
      await AetheriaDB.saveTrackAudio(trackId, audioFile, meta);

      // 3. Create active session ObjectURL
      const audioUrl = URL.createObjectURL(audioFile);

      // 4. Determine cover: embedded ID3 cover, or aesthetic theme placeholder
      const coverUrl = meta.coverUrl || getAestheticPlaceholderCover(meta.title, meta.artist);

      const newTrack = {
        id: trackId,
        title: meta.title || audioFile.name.replace(/\.[^/.]+$/, ""),
        artist: meta.artist || '本地音乐',
        album: meta.album || '本地媒体库',
        genre: 'LOCAL / LOSSLESS',
        cover: coverUrl,
        theme: {
          accent: '#38bdf8',
          glow: 'rgba(56, 189, 248, 0.55)',
          meshColors: ['#0284c7', '#3b82f6', '#4f46e5']
        },
        audioUrl: audioUrl,
        lrcPairs: [
          { time: 0.0, text: meta.title || audioFile.name, trans: meta.artist || "本地导入音频" },
          { time: 3.0, text: "高保真本地音乐流 · 沉浸聆听", trans: "High-Fidelity Lossless Local Audio" }
        ]
      };

      // Match matching .lrc file if provided
      const baseName = audioFile.name.replace(/\.[^/.]+$/, "");
      const matchedLrc = lrcFiles.find(l => l.name.replace(/\.[^/.]+$/, "") === baseName);
      if (matchedLrc) {
        try {
          const lrcText = await matchedLrc.text();
          newTrack.lrcPairs = parseLRC(lrcText);
        } catch (err) {}
      }

      PLAYLIST.unshift(newTrack);
    }

    savePlaylistToStorage();
    loadTrack(0, true);
    showToast(`✓ 已成功导入 ${audioFiles.length} 首本地歌曲并持久化保存`, 'success');
  });

  // Drag and drop
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      localFileInput.files = e.dataTransfer.files;
      localFileInput.dispatchEvent(new Event('change'));
    }
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      if (e.key === 'Escape') closeCommandPalette();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
      return;
    }

    if (e.key === '/') {
      e.preventDefault();
      openCommandPalette();
      return;
    }

    switch (e.code) {
      case 'Escape':
        closeCommandPalette();
        cardShareModal.classList.remove('show');
        helpModal.classList.remove('show');
        break;
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (e.shiftKey) prevTrack();
        else seekToTime(Math.max((audioEl.currentTime || proceduralCurrentTime) - 5, 0));
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (e.shiftKey) nextTrack();
        else seekToTime((audioEl.currentTime || proceduralCurrentTime) + 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setVolume(Math.min(currentVolume + 0.1, 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setVolume(Math.max(currentVolume - 0.1, 0));
        break;
      case 'KeyM':
        setVolume(isMuted ? 0.8 : 0);
        break;
      case 'KeyF':
        toggleFullscreen();
        break;
      case 'KeyR':
        cycleResonanceMode();
        break;
      case 'KeyH':
        setLayoutMode(currentLayoutMode === 'dashboard' ? 'split' : 'dashboard');
        break;
      case 'KeyV':
        setLayoutMode(currentLayoutMode === 'split' ? 'dashboard' : 'split');
        break;
      case 'KeyL':
        setLayoutMode(currentLayoutMode === 'lyric-focus' ? 'split' : 'lyric-focus');
        break;
      case 'KeyP':
        togglePlaylistDrawer(playlistDrawer.classList.contains('translate-x-full'));
        break;
    }
  });

  // Help Modal
  helpBtn.addEventListener('click', () => helpModal.classList.add('show'));
  closeHelpBtn.addEventListener('click', () => helpModal.classList.remove('show'));
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.classList.remove('show');
  });

  // Controls Binding
  playBtn.addEventListener('click', togglePlay);
  nextBtn.addEventListener('click', nextTrack);
  prevBtn.addEventListener('click', prevTrack);

  // Resonance Mode Controls
  const resonancePillBtn = document.getElementById('resonance-mode-pill');
  if (resonancePillBtn) resonancePillBtn.addEventListener('click', cycleResonanceMode);

  const visualizerBtn = document.getElementById('visualizer-toggle-btn');
  if (visualizerBtn) {
    visualizerBtn.title = '切换粒子共振模式 (快捷键: R)';
    visualizerBtn.addEventListener('click', cycleResonanceMode);
  }

  if (particleCanvas) {
    particleCanvas.addEventListener('click', () => {
      if (particleStageActive) cycleResonanceMode();
    });
  }

  // Dynamic Island Audio Spec HUD (SwiftUI Interaction)
  const dynamicIslandModal = document.getElementById('dynamic-island-modal');
  const brandMiniPill = document.getElementById('brand-mini-pill');
  const closeDynamicIslandBtn = document.getElementById('close-dynamic-island-btn');

  if (brandMiniPill && dynamicIslandModal) {
    brandMiniPill.addEventListener('click', (e) => {
      e.stopPropagation();
      dynamicIslandModal.classList.toggle('show');
    });

    if (closeDynamicIslandBtn) {
      closeDynamicIslandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dynamicIslandModal.classList.remove('show');
      });
    }

    document.addEventListener('click', (e) => {
      if (!dynamicIslandModal.contains(e.target) && !brandMiniPill.contains(e.target)) {
        dynamicIslandModal.classList.remove('show');
      }
    });
  }

  try {
    localStorage.removeItem('aetheria_living_cover_mode');
    document.body.classList.remove('living-cover-cinematic', 'living-cover-sheen', 'living-cover-pulse', 'living-cover-liquid', 'living-cover-breath', 'living-cover-off');
  } catch (e) {}

  // ==========================================
  // 8.8 High-Performance UI Micro-Interactions
  // ==========================================
  function initAwwwardsInteractions() {
    const progContainer = document.getElementById('progress-container');
    const hoverTooltip = document.getElementById('hover-tooltip');
    if (progContainer && hoverTooltip) {
      progContainer.addEventListener('mousemove', (e) => {
        const rect = progContainer.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const duration = audioEl ? (audioEl.duration || 0) : 0;
        const seekSec = p * duration;
        hoverTooltip.textContent = formatTime(seekSec);
        hoverTooltip.style.left = `${(p * 100).toFixed(1)}%`;
        hoverTooltip.style.opacity = '1';
      });
      progContainer.addEventListener('mouseleave', () => {
        hoverTooltip.style.opacity = '0';
      });
    }
  }

  // ==========================================
  // 8.9 Gemini Veo 3.1 Motion Cover System
  // ==========================================
  async function fetchMotionCoversRegistry() {
    try {
      const res = await fetch('/api/motion-covers');
      if (res.ok) {
        const data = await res.json();
        motionCoversMap = data || {};
        if (PLAYLIST[currentTrackIndex]) {
          checkAndApplyMotionCover(PLAYLIST[currentTrackIndex]);
        }
      }
    } catch (e) {
      console.warn('Motion covers registry fetch notice:', e);
    }
  }

  function initVeoMotionControls() {
    const closeVeoModalBtn = document.getElementById('close-veo-modal-btn');
    const closeVeoBtn = document.getElementById('close-veo-btn');
    const veoStatusText = document.getElementById('veo-status-text');
    const veoCurrentSongBadge = document.getElementById('veo-current-song-badge');
    const veoCliCommand = document.getElementById('veo-cli-command');
    const copyVeoCliBtn = document.getElementById('copy-veo-cli-btn');
    const veoDropzone = document.getElementById('veo-dropzone');
    const veoVideoFileInput = document.getElementById('veo-video-file-input');

    function updateVeoModalUI() {
      const song = PLAYLIST[currentTrackIndex];
      if (!song) return;

      if (veoCurrentSongBadge) {
        veoCurrentSongBadge.textContent = `${song.artist} · ${song.title}`;
      }

      const songId = song.id || (song.neteaseId ? `netease_${song.neteaseId}` : 'custom_song');
      const hasMotion = coverCard && coverCard.classList.contains('has-motion-cover');

      if (veoStatusText) {
        if (hasMotion) {
          veoStatusText.innerHTML = '<span class="text-amber-400 font-bold">✨ 已激活 Veo 3.1 动态流光封面</span>';
        } else {
          veoStatusText.innerHTML = '<span class="text-white/50">当前为静态封面 (尚未生成动态视频)</span>';
        }
      }

      if (veoCliCommand) {
        veoCliCommand.textContent = `node generate_motion_cover.js --song=${songId}`;
      }
    }

    if (veoMotionBtn && veoMotionModal) {
      veoMotionBtn.addEventListener('click', () => {
        updateVeoModalUI();
        veoMotionModal.classList.remove('hidden');
      });

      const hideModal = () => veoMotionModal.classList.add('hidden');
      if (closeVeoModalBtn) closeVeoModalBtn.addEventListener('click', hideModal);
      if (closeVeoBtn) closeVeoBtn.addEventListener('click', hideModal);
      veoMotionModal.addEventListener('click', (e) => {
        if (e.target === veoMotionModal) hideModal();
      });
    }

    if (copyVeoCliBtn && veoCliCommand) {
      copyVeoCliBtn.addEventListener('click', () => {
        const text = veoCliCommand.textContent.trim();
        navigator.clipboard.writeText(text).then(() => {
          showToast('已复制生成命令到剪贴板！', 'success');
        }).catch(() => {
          showToast('复制失败，请手动选择复制', 'warning');
        });
      });
    }

    // Video File Drop / Select
    if (veoDropzone && veoVideoFileInput) {
      veoDropzone.addEventListener('click', () => veoVideoFileInput.click());

      veoDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        veoDropzone.classList.add('dragover');
      });

      veoDropzone.addEventListener('dragleave', () => {
        veoDropzone.classList.remove('dragover');
      });

      veoDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        veoDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          applyCustomVideoFile(e.dataTransfer.files[0]);
        }
      });

      veoVideoFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          applyCustomVideoFile(e.target.files[0]);
        }
      });
    }

    function applyCustomVideoFile(file) {
      if (!file.type.startsWith('video/')) {
        showToast('请上传 MP4 或 WebM 格式的视频文件', 'warning');
        return;
      }
      const videoBlobUrl = URL.createObjectURL(file);
      const song = PLAYLIST[currentTrackIndex];
      if (song) {
        song.motionVideo = videoBlobUrl;
        checkAndApplyMotionCover(song);
        updateVeoModalUI();
        showToast(`✨ 已成功将动态视频封面绑定至「${song.title}」！`, 'success');
      }
    }
  }

  // ==========================================
  // 8.5 Spotify Canvas Looping Background Controls
  // ==========================================
  function initSpotifyCanvasModal() {
    if (!spotifyCanvasModal || !spotifyCanvasBtn) return;

    let canvasConfig = {
      ambientEnabled: true,
      sleeveEnabled: true,
      blur: 36,
      opacity: 55
    };

    try {
      const saved = localStorage.getItem('aetheria_canvas_config');
      if (saved) {
        canvasConfig = { ...canvasConfig, ...JSON.parse(saved) };
      }
    } catch (e) {}

    const saveConfig = () => {
      try {
        localStorage.setItem('aetheria_canvas_config', JSON.stringify(canvasConfig));
      } catch (e) {}
    };

    // Apply saved configuration
    isCanvasAmbientEnabled = canvasConfig.ambientEnabled !== false;
    isCanvasSleeveEnabled = canvasConfig.sleeveEnabled !== false;

    if (toggleCanvasAmbient) toggleCanvasAmbient.checked = isCanvasAmbientEnabled;
    if (toggleCanvasSleeve) toggleCanvasSleeve.checked = isCanvasSleeveEnabled;
    if (canvasBlurSlider) canvasBlurSlider.value = canvasConfig.blur;
    if (canvasBlurVal) canvasBlurVal.textContent = `${canvasConfig.blur}px`;
    if (canvasOpacitySlider) canvasOpacitySlider.value = canvasConfig.opacity;
    if (canvasOpacityVal) canvasOpacityVal.textContent = `${canvasConfig.opacity}%`;

    document.documentElement.style.setProperty('--canvas-ambient-blur', `${canvasConfig.blur}px`);
    document.documentElement.style.setProperty('--canvas-ambient-opacity', `${canvasConfig.opacity / 100}`);
    if (!isCanvasAmbientEnabled) {
      document.body.classList.add('canvas-ambient-disabled');
    } else {
      document.body.classList.remove('canvas-ambient-disabled');
    }

    function updateCanvasModalUI() {
      const song = PLAYLIST[currentTrackIndex];
      if (!song) return;

      if (canvasCurrentSongBadge) {
        canvasCurrentSongBadge.textContent = `${song.artist} · ${song.title}`;
      }

      const hasCanvas = Boolean(song.spotifyCanvas || (song.motionVideo && (song.motionVideo.includes('canvaz.scdn.co') || song.motionVideo.includes('_motion.'))));
      const hasMotion = Boolean(song.motionVideo);

      if (canvasStatusText) {
        if (hasCanvas) {
          canvasStatusText.innerHTML = '<span class="text-emerald-400 font-bold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>已全自动激活 Spotify Canvas 官方微动画卷</span>';
        } else if (hasMotion) {
          canvasStatusText.innerHTML = '<span class="text-teal-300 font-bold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>已全自动激活 8秒高保真无缝微动画卷</span>';
        } else {
          canvasStatusText.innerHTML = '<span class="text-amber-300/90 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>正在全自动检索 / 实时 JIT 合成画卷...</span>';
        }
      }
    }
    window.updateCanvasModalUI = updateCanvasModalUI;

    // Force Re-detect & JIT Generation Trigger
    if (autoBindCanvasBtn) {
      autoBindCanvasBtn.addEventListener('click', () => {
        const song = PLAYLIST[currentTrackIndex];
        if (!song) return;
        showToast(`⚡ 正在为「${song.title}」全自动重新嗅探与实时渲染画卷...`, 'music');
        delete song.spotifyCanvas;
        delete song.motionVideo;
        fetchSpotifyCanvas(song, true);
      });
    }

    // Modal open / close handlers
    spotifyCanvasBtn.addEventListener('click', () => {
      updateCanvasModalUI();
      spotifyCanvasModal.classList.remove('hidden');
    });

    const hideModal = () => spotifyCanvasModal.classList.add('hidden');
    if (closeCanvasModalBtn) closeCanvasModalBtn.addEventListener('click', hideModal);
    if (closeCanvasBtn) closeCanvasBtn.addEventListener('click', hideModal);
    spotifyCanvasModal.addEventListener('click', (e) => {
      if (e.target === spotifyCanvasModal) hideModal();
    });

    // Toggle 1: Fullscreen Ambient Flowing Background
    if (toggleCanvasAmbient) {
      toggleCanvasAmbient.addEventListener('change', (e) => {
        isCanvasAmbientEnabled = e.target.checked;
        canvasConfig.ambientEnabled = isCanvasAmbientEnabled;
        saveConfig();
        if (isCanvasAmbientEnabled) {
          document.body.classList.remove('canvas-ambient-disabled');
          const song = PLAYLIST[currentTrackIndex];
          if (song && (song.spotifyCanvas || song.motionVideo)) {
            document.body.classList.add('has-canvas-bg');
            if (canvasAmbientVideo && isPlaying) {
              canvasAmbientVideo.play().catch(() => {});
            }
          }
          showToast('已开启全屏 Spotify Canvas 沉浸流动背景', 'music');
        } else {
          document.body.classList.add('canvas-ambient-disabled');
          document.body.classList.remove('has-canvas-bg');
          if (canvasAmbientVideo) {
            try { canvasAmbientVideo.pause(); } catch (err) {}
          }
          showToast('已关闭全屏 Canvas 流动背景', 'info');
        }
      });
    }

    // Toggle 2: Acrylic Cover Sleeve Loop
    if (toggleCanvasSleeve) {
      toggleCanvasSleeve.addEventListener('change', (e) => {
        isCanvasSleeveEnabled = e.target.checked;
        canvasConfig.sleeveEnabled = isCanvasSleeveEnabled;
        saveConfig();
        const song = PLAYLIST[currentTrackIndex];
        if (song) {
          checkAndApplyMotionCover(song);
        }
        showToast(isCanvasSleeveEnabled ? '已开启唱机亚克力封面动态循环' : '已关闭唱机亚克力封面动态循环', 'info');
      });
    }

    // Slider 1: Blur Depth
    if (canvasBlurSlider && canvasBlurVal) {
      canvasBlurSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        canvasBlurVal.textContent = `${val}px`;
        canvasConfig.blur = val;
        document.documentElement.style.setProperty('--canvas-ambient-blur', `${val}px`);
        saveConfig();
      });
    }

    // Slider 2: Opacity
    if (canvasOpacitySlider && canvasOpacityVal) {
      canvasOpacitySlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        canvasOpacityVal.textContent = `${val}%`;
        canvasConfig.opacity = val;
        document.documentElement.style.setProperty('--canvas-ambient-opacity', `${val / 100}`);
        saveConfig();
      });
    }

    // Custom Canvas Link Binding Form
    if (applyCustomCanvasBtn && customCanvasInput) {
      applyCustomCanvasBtn.addEventListener('click', async () => {
        const rawUrl = customCanvasInput.value.trim();
        if (!rawUrl) {
          showToast('请输入有效的 Spotify Canvas 或 MP4 视频链接', 'warning');
          return;
        }

        const song = PLAYLIST[currentTrackIndex];
        if (!song) {
          showToast('当前未选定播放曲目', 'warning');
          return;
        }

        const songId = song.id || (song.neteaseId ? `netease_${song.neteaseId}` : `track_${Date.now()}`);
        showToast(`🔗 正在为「${song.title}」绑定 Canvas 循环背景...`, 'music');

        try {
          const res = await fetch('/api/spotify/canvas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: songId,
              title: song.title,
              artist: song.artist,
              video: rawUrl,
              canvasUrl: rawUrl
            })
          });

          if (res.ok) {
            const result = await res.json();
            const boundUrl = (result.entry && result.entry.video) || result.video || rawUrl;
            song.spotifyCanvas = boundUrl;
            song.motionVideo = boundUrl;
            motionCoversMap[songId] = { video: boundUrl, title: song.title, type: 'spotify_canvas' };
            checkAndApplyMotionCover(song);
            updateCanvasModalUI();
            customCanvasInput.value = '';
            showToast(`🟢 成功绑定 Canvas 循环背景到「${song.title}」！`, 'success');
          } else {
            showToast('绑定保存失败，请检查服务器连接', 'error');
          }
        } catch (err) {
          console.error('[Spotify Canvas Bind Error]:', err);
          showToast('绑定异常: ' + err.message, 'error');
        }
      });
    }
  }

  // ==========================================
  // 8.51 Apple macOS Sequoia Top Navigation Capsule & Dropdowns
  // ==========================================
  function initTopBarDropdowns() {
    const dropdownBtns = [
      { btnId: 'nav-dropdown-fx-btn', menuId: 'nav-dropdown-fx-menu' },
      { btnId: 'nav-dropdown-import-btn', menuId: 'nav-dropdown-import-menu' },
      { btnId: 'netease-user-btn', menuId: 'netease-user-menu', condition: () => window.isNeteaseLoggedIn },
      { btnId: 'nav-dropdown-more-btn', menuId: 'nav-dropdown-more-menu' },
    ];

    const allMenus = document.querySelectorAll('.nav-dropdown-menu');
    const closeAllDropdowns = () => {
      allMenus.forEach(m => m.classList.remove('show'));
    };

    dropdownBtns.forEach(({ btnId, menuId, condition }) => {
      const btn = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      if (!btn || !menu) return;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (condition && !condition()) {
          // If condition is false (e.g. netease user button clicked while logged out), trigger login modal instead!
          openNeteaseLoginModal();
          return;
        }
        const isShown = menu.classList.contains('show');
        closeAllDropdowns();
        if (!isShown) menu.classList.add('show');
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.dropdown-container')) {
        closeAllDropdowns();
      }
    });

    // Sub-item action bridges
    const bindProxy = (optId, targetBtnId) => {
      const opt = document.getElementById(optId);
      const target = document.getElementById(targetBtnId);
      if (opt && target) {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          closeAllDropdowns();
          target.click();
        });
      }
    };

    bindProxy('menu-opt-canvas', 'spotify-canvas-btn');
    bindProxy('menu-opt-veo', 'veo-motion-btn');
    bindProxy('menu-opt-netease-import', 'netease-import-btn');
    bindProxy('menu-opt-share', 'share-card-btn');
    bindProxy('menu-opt-fullscreen', 'fullscreen-btn');
    bindProxy('menu-opt-help', 'help-btn');
  }

  // ==========================================
  // 8.52 NetEase Cloud Music Full-Network Auth & Roaming Engine
  // ==========================================
  window.isNeteaseLoggedIn = false;
  let neteaseQrPollTimer = null;

  async function checkNeteaseLoginStatus() {
    try {
      const res = await fetch('/api/netease/user/status');
      if (!res.ok) return;
      const data = await res.json();
      const userBtnText = document.getElementById('netease-btn-text');
      const userBtnAvatar = document.getElementById('netease-btn-avatar');
      const userBtnIcon = document.getElementById('netease-btn-icon');
      const menuAvatar = document.getElementById('netease-menu-avatar');
      const menuName = document.getElementById('netease-menu-name');
      const menuVip = document.getElementById('netease-menu-vip');

      if (data.loggedIn && data.profile) {
        window.isNeteaseLoggedIn = true;
        const p = data.profile;
        if (userBtnText) userBtnText.textContent = p.nickname || '网易云用户';
        if (userBtnAvatar) {
          userBtnAvatar.src = p.avatarUrl || '';
          userBtnAvatar.classList.remove('hidden');
        }
        if (userBtnIcon) userBtnIcon.classList.add('hidden');

        if (menuAvatar) menuAvatar.src = p.avatarUrl || '';
        if (menuName) menuName.textContent = p.nickname || '网易云用户';
        if (menuVip) {
          menuVip.textContent = p.vipType > 0 ? '✨ 黑胶 VIP 用户' : '标准用户';
          menuVip.className = p.vipType > 0 ? 'text-[10px] text-amber-400 font-mono flex items-center gap-1 mt-0.5' : 'text-[10px] text-white/50 font-mono flex items-center gap-1 mt-0.5';
        }
      } else {
        window.isNeteaseLoggedIn = false;
        if (userBtnText) userBtnText.textContent = '登录网易云';
        if (userBtnAvatar) userBtnAvatar.classList.add('hidden');
        if (userBtnIcon) userBtnIcon.classList.remove('hidden');
      }
    } catch (e) {
      console.warn('[NetEase Auth Status]:', e);
    }
  }

  async function openNeteaseLoginModal() {
    const modal = document.getElementById('netease-login-modal');
    const qrImg = document.getElementById('netease-qr-img');
    const qrStatus = document.getElementById('netease-qr-status');
    const qrMask = document.getElementById('netease-qr-mask');
    if (!modal) return;

    modal.classList.remove('hidden');
    if (qrMask) qrMask.classList.add('hidden');
    if (qrStatus) qrStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span><span>正在获取网易云登录二维码...</span>';

    clearInterval(neteaseQrPollTimer);

    try {
      const keyRes = await fetch('/api/netease/qr/key');
      const keyData = await keyRes.json();
      const unikey = keyData.key;
      if (!unikey) throw new Error('获取 key 失败');

      const createRes = await fetch(`/api/netease/qr/create?key=${encodeURIComponent(unikey)}`);
      const createData = await createRes.json();
      if (!createData.img) throw new Error('生成二维码失败');

      if (qrImg) qrImg.src = createData.img;
      if (qrStatus) qrStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>请使用网易云音乐 App 扫一扫</span>';

      // Poll status every 1.5s
      neteaseQrPollTimer = setInterval(async () => {
        try {
          const checkRes = await fetch(`/api/netease/qr/check?key=${encodeURIComponent(unikey)}`);
          const checkData = await checkRes.json();
          const code = checkData.code;

          if (code === 801) {
            if (qrStatus) qrStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>等待网易云音乐 App 扫码中...</span>';
          } else if (code === 802) {
            if (qrStatus) qrStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span><span class="text-sky-300 font-semibold">扫码成功！请在手机端点击确认登录</span>';
          } else if (code === 803) {
            clearInterval(neteaseQrPollTimer);
            if (qrStatus) qrStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400"></span><span class="text-emerald-400 font-bold">登录成功！正在同步账户...</span>';
            setTimeout(() => {
              modal.classList.add('hidden');
              checkNeteaseLoginStatus();
              showToast('🎉 成功登录网易云音乐！全网歌曲与心动漫游已就绪', 'success');
            }, 800);
          } else if (code === 800) {
            clearInterval(neteaseQrPollTimer);
            if (qrMask) qrMask.classList.remove('hidden');
            if (qrStatus) qrStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500"></span><span class="text-rose-400">二维码已过期</span>';
          }
        } catch (pollErr) {
          console.warn('[QR Poll Error]:', pollErr);
        }
      }, 1500);

    } catch (err) {
      if (qrStatus) qrStatus.innerHTML = `<span class="text-red-400">二维码生成失败: ${err.message}</span>`;
    }
  }

  function initNeteaseLoginEngine() {
    const closeBtn = document.getElementById('close-netease-modal-btn');
    const refreshBtn = document.getElementById('netease-qr-refresh-btn');
    const modal = document.getElementById('netease-login-modal');

    const closeModal = () => {
      clearInterval(neteaseQrPollTimer);
      if (modal) modal.classList.add('hidden');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }
    if (refreshBtn) refreshBtn.addEventListener('click', openNeteaseLoginModal);

    // 1. Sync User Likes (我喜欢的音乐)
    const syncAndShowNeteaseLikes = async () => {
      document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.classList.remove('show'));
      showToast('📥 正在同步网易云「我喜欢的音乐」...', 'music');
      try {
        const pRes = await fetch('/api/netease/user/playlists');
        if (!pRes.ok) throw new Error('获取歌单失败');
        const pData = await pRes.json();
        const firstPlaylist = pData.playlists?.[0];
        if (!firstPlaylist) throw new Error('未找到红心歌单');

        const tRes = await fetch(`/api/netease/playlist/tracks?id=${firstPlaylist.id}&limit=100`);
        if (!tRes.ok) throw new Error('获取曲目失败');
        const tData = await tRes.json();
        if (!tData.tracks || tData.tracks.length === 0) throw new Error('歌单为空');

        // Append / Replace with user tracks
        PLAYLIST.splice(0, PLAYLIST.length, ...tData.tracks);
        savePlaylistToStorage();
        updatePlaylistDrawerUI();
        loadTrack(0, true);
        togglePlaylistDrawer(true);
        showToast(`❤️ 成功载入「${firstPlaylist.name}」共 ${tData.tracks.length} 首歌曲！已展开播放队列`, 'success');
      } catch (err) {
        showToast('同步歌单失败: ' + err.message, 'error');
      }
    };
    window.syncAndShowNeteaseLikes = syncAndShowNeteaseLikes;

    const actionLikes = document.getElementById('netease-action-likes');
    if (actionLikes) actionLikes.addEventListener('click', syncAndShowNeteaseLikes);

    const drawerLikesBtn = document.getElementById('drawer-likes-btn');
    if (drawerLikesBtn) drawerLikesBtn.addEventListener('click', syncAndShowNeteaseLikes);

    const dashboardLikesBtn = document.getElementById('dashboard-likes-btn');
    if (dashboardLikesBtn) dashboardLikesBtn.addEventListener('click', syncAndShowNeteaseLikes);

    // 2. Daily Recommendations (每日推荐单曲)
    const actionDaily = document.getElementById('netease-action-daily');
    if (actionDaily) {
      actionDaily.addEventListener('click', async () => {
        document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.classList.remove('show'));
        showToast('📅 正在加载今日专属每日推荐...', 'music');
        try {
          const res = await fetch('/api/netease/recommend/songs');
          if (!res.ok) throw new Error('获取日推失败');
          const data = await res.json();
          if (!data.tracks || data.tracks.length === 0) throw new Error('今日推荐为空');

          PLAYLIST.splice(0, PLAYLIST.length, ...data.tracks);
          savePlaylistToStorage();
          updatePlaylistDrawerUI();
          loadTrack(0, true);
          showToast(`✨ 成功载入今日推荐 ${data.tracks.length} 首全网好歌！`, 'success');
        } catch (err) {
          showToast('加载每日推荐失败: ' + err.message, 'error');
        }
      });
    }

    // 3. Full-Network Intelligence Roaming / Personal FM (全网心动漫游)
    const actionRoaming = document.getElementById('netease-action-roaming');
    if (actionRoaming) {
      actionRoaming.addEventListener('click', async () => {
        document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.classList.remove('show'));
        triggerFullNetworkRoaming();
      });
    }

    // 4. Logout
    const actionLogout = document.getElementById('netease-action-logout');
    if (actionLogout) {
      actionLogout.addEventListener('click', async () => {
        document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.classList.remove('show'));
        try {
          await fetch('/api/netease/logout', { method: 'POST' });
          window.isNeteaseLoggedIn = false;
          checkNeteaseLoginStatus();
          showToast('已安全退出网易云音乐账号', 'info');
        } catch (err) {
          showToast('退出异常: ' + err.message, 'error');
        }
      });
    }

    // Check status on startup
    checkNeteaseLoginStatus();
  }

  // Full-Network Roaming Trigger (used by user menu & Bento Dashboard random button)
  async function triggerFullNetworkRoaming() {
    const curSong = PLAYLIST[currentTrackIndex];
    const songId = curSong?.neteaseId || curSong?.sourceId || '';
    showToast('📻 正在全网检索个性化智能心动漫游...', 'music');

    try {
      const url = songId ? `/api/netease/intelligence?songId=${songId}` : '/api/netease/personal_fm';
      const res = await fetch(url);
      if (!res.ok) throw new Error('漫游获取失败');
      const data = await res.json();
      if (!data.tracks || data.tracks.length === 0) throw new Error('暂未获取到推荐曲目');

      // Add to playlist queue
      const startIdx = PLAYLIST.length;
      PLAYLIST.push(...data.tracks);
      savePlaylistToStorage();
      updatePlaylistDrawerUI();
      loadTrack(startIdx, true);
      showToast(`📻 已开启全网心动漫游，正在播放「${data.tracks[0].title}」！`, 'success');
    } catch (err) {
      // Fallback
      if (!window.isNeteaseLoggedIn) {
        showToast('💡 登录网易云账号即可享受全网无缝心动漫游推荐！', 'info');
      } else {
        showToast('漫游请求异常: ' + err.message, 'error');
      }
    }
  }

  // ==========================================
  // 8.6 Desktop Client Integration (Electron)
  // ==========================================
  function initDesktopClient() {
    if (!window.electronAPI || !window.electronAPI.isDesktop) {
      return;
    }

    console.log('[Platform] 🚀 Aetheria Sound Desktop Client mode active');
    document.body.classList.add('is-desktop-app');

    // Reveal desktop-specific elements
    const desktopTitlebar = document.getElementById('desktop-titlebar');
    if (desktopTitlebar) desktopTitlebar.classList.remove('hidden');

    const drawerFolderBtn = document.getElementById('drawer-folder-btn');
    if (drawerFolderBtn) {
      drawerFolderBtn.classList.remove('hidden');
      drawerFolderBtn.classList.add('flex');
    }

    // Window Controls
    const winMinBtn = document.getElementById('win-min-btn');
    const winMaxBtn = document.getElementById('win-max-btn');
    const winCloseBtn = document.getElementById('win-close-btn');
    const winPinBtn = document.getElementById('win-pin-btn');
    const winMaxIcon = document.getElementById('win-max-icon');

    if (winMinBtn) winMinBtn.addEventListener('click', () => window.electronAPI.windowControls.minimize());
    if (winMaxBtn) winMaxBtn.addEventListener('click', () => window.electronAPI.windowControls.maximize());
    if (winCloseBtn) winCloseBtn.addEventListener('click', () => window.electronAPI.windowControls.close());
    if (winPinBtn) {
      winPinBtn.addEventListener('click', async () => {
        const isPinned = await window.electronAPI.windowControls.togglePin();
        if (isPinned) {
          winPinBtn.classList.add('is-pinned');
          showToast('📌 已锁定窗口置顶', 'success');
        } else {
          winPinBtn.classList.remove('is-pinned');
          showToast('已取消窗口置顶', 'info');
        }
      });
    }

    // Window state change listener
    window.electronAPI.onWindowStateChange((state) => {
      if (typeof state.isFullscreen === 'boolean') {
        setFullscreenUI(state.isFullscreen);
      }
      if (winPinBtn) {
        if (state.isPinned) winPinBtn.classList.add('is-pinned');
        else winPinBtn.classList.remove('is-pinned');
      }
      if (winMaxIcon) {
        if (state.isMaximized) {
          winMaxIcon.innerHTML = '<rect x="6" y="3" width="15" height="15" rx="1.5" ry="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="3" y="6" width="15" height="15" rx="1.5" ry="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/>';
        } else {
          winMaxIcon.innerHTML = '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>';
        }
      }
    });

    // Global Shortcuts listener
    window.electronAPI.onGlobalShortcut(({ action }) => {
      switch (action) {
        case 'toggle-play':
          togglePlay();
          break;
        case 'next-track':
          nextTrack();
          break;
        case 'prev-track':
          prevTrack();
          break;
        case 'volume-up':
          setVolume(Math.min(1, currentVolume + 0.05));
          showToast(`🔊 音量: ${Math.round(currentVolume * 100)}%`, 'music');
          break;
        case 'volume-down':
          setVolume(Math.max(0, currentVolume - 0.05));
          showToast(`🔉 音量: ${Math.round(currentVolume * 100)}%`, 'music');
          break;
        case 'stop':
          pauseTrack(true);
          showToast('⏹ 已停止播放', 'music');
          break;
        case 'toggle-mute':
          if (audioEl) {
            audioEl.muted = !audioEl.muted;
            showToast(audioEl.muted ? '🔇 已静音' : '🔊 已恢复声音', 'music');
          }
          break;
      }
    });

    // Native Directory Picker for Local Audio Library
    if (drawerFolderBtn) {
      drawerFolderBtn.addEventListener('click', async () => {
        try {
          const files = await window.electronAPI.nativeDialog.selectAudioFolder();
          if (!files || files.length === 0) return;

          showToast(`正在导入 ${files.length} 首本地音乐...`, 'music');
          let addedCount = 0;
          for (const item of files) {
            const trackId = `native_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            const newTrack = {
              id: trackId,
              title: item.title,
              artist: '本地曲库',
              album: '本地高保真',
              duration: 0,
              audioUrl: item.streamUrl,
              cover: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23181824"/><circle cx="150" cy="150" r="90" fill="%23222232"/><circle cx="150" cy="150" r="30" fill="%2334d399"/><path d="M142 135v30l24-15z" fill="%23ffffff"/></svg>',
              lrc: '[00:00.00]本地高保真音频\n[00:02.00]享受纯净无损音乐\n',
              motionVideo: null
            };
            PLAYLIST.push(newTrack);
            addedCount++;
          }
          savePlaylistToStorage();
          renderPlaylistDrawer();
          showToast(`🎉 成功导入 ${addedCount} 首本地歌曲！`, 'success');
        } catch (err) {
          console.error('[Native Import Error]:', err);
          showToast('导入本地音乐失败: ' + err.message, 'error');
        }
      });
    }
  }

  // Interoperability Layer for Aetheria Artist/Album Views & Modular Extensions
  const renderPlaylistDrawer = updatePlaylistDrawerUI;
  window.PLAYLIST = PLAYLIST;
  window.loadTrack = loadTrack;
  window.savePlaylistToStorage = savePlaylistToStorage;
  window.renderPlaylistDrawer = updatePlaylistDrawerUI;
  window.updatePlaylistDrawerUI = updatePlaylistDrawerUI;
  window.showToast = showToast;
  window.seekToTime = seekToTime;
  window.setLayoutMode = setLayoutMode;

  // ==========================================
  // 9. Initialization & Global Audio Unlock
  // ==========================================
  const unlockAudio = () => {
    initWebAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });

  initAMLL();
  initParticleStage();
  initAwwwardsInteractions();
  initVeoMotionControls();
  initSpotifyCanvasModal();
  initTopBarDropdowns();
  initNeteaseLoginEngine();
  fetchMotionCoversRegistry();
  initMediaSession();
  initDesktopClient();
  setVolume(0.8);
  loadTrack(0, false);
  setLayoutMode('dashboard');

})();
