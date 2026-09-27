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
      if (!Array.isArray(PLAYLIST) || PLAYLIST.length === 0) return;
      const serializable = PLAYLIST.map(track => {
        const copy = { ...track };
        if (copy.audioUrl && (
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
            if (track.audioUrl && (
              track.audioUrl.includes('music.126.net') ||
              track.audioUrl.includes('music.163.com') ||
              track.audioUrl.startsWith('/api/proxy')
            )) {
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

  const savedUserPlaylist = loadPlaylistFromStorage();
  let PLAYLIST = (savedUserPlaylist && savedUserPlaylist.length > 0)
    ? savedUserPlaylist
    : (window.AetheriaAPI && window.AetheriaAPI.BUILTIN_CATALOG && window.AetheriaAPI.BUILTIN_CATALOG.length > 0)
      ? [...window.AetheriaAPI.BUILTIN_CATALOG]
      : [
    {
      id: 'jay_qilixiang',
      title: '七里香',
      artist: '周杰伦 · Jay Chou',
      album: '七里香 (2004)',
      genre: 'CHINESE POP / NOSTALGIA',
      cover: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.55)',
        meshColors: ['#d97706', '#ea580c', '#3b82f6']
      },
      chords: [261.63, 329.63, 392.00, 493.88],
      lrcPairs: [
        { time: 0.0, text: "七里香 - 周杰伦", trans: "Common Jasmine Orange · Jay Chou" },
        { time: 3.0, text: "词：方文山 / 曲：周杰伦", trans: "Lyrics: Vincent Fang / Music: Jay Chou" },
        { time: 6.5, text: "窗外的麻雀 在电线杆上多嘴", trans: "The sparrows chatter on telephone poles outside" },
        { time: 12.0, text: "你说这一句 很有夏天的感觉", trans: "You say this sentence brings the essence of summer" },
        { time: 18.2, text: "手中的铅笔 在纸上来来回回", trans: "The pencil in my hand sketches back and forth" },
        { time: 24.5, text: "我用几行字形容你是我的谁", trans: "Capturing in a few lines what you mean to me" },
        { time: 31.0, text: "秋刀鱼的滋味 猫跟你都想了解", trans: "The taste of saury, both the cat and you wish to know" },
        { time: 37.8, text: "初恋的香味就这样被我们寻回", trans: "The sweet scent of first love is gently rediscovered" },
        { time: 44.5, text: "那温暖的阳光 像刚摘的鲜艳草莓", trans: "The tender sunlight shines like freshly picked strawberries" },
        { time: 51.0, text: "你说你舍不得吃掉这一种感觉", trans: "You whisper you cannot bear to consume this pure feeling" },
        { time: 58.2, text: "雨下整夜 我的爱溢出就像雨水", trans: "Rain poured all night, my love overflows just like rainfall" },
        { time: 65.0, text: "院子落叶 跟我的思念厚厚一叠", trans: "Fallen leaves in courtyard, piled as thick as my yearning" },
        { time: 71.8, text: "几句是非 也无法将我的热情冷却", trans: "No passing gossip could ever chill my ardent fire" },
        { time: 78.5, text: "你出现在我诗的每一页", trans: "For you appear across every single page of my poetry" }
      ]
    }
  ];

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
  let synthInterval = null;
  let visualizerDataArray = null;

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
  const songTitle = document.getElementById('song-title');
  const songArtist = document.getElementById('song-artist');
  const genreBadge = document.getElementById('genre-badge');
  const trackNumberBadge = document.getElementById('track-number-badge');

  const lyricsList = document.getElementById('lyrics-list');
  const lyricsContainer = document.getElementById('lyrics-container');
  const resumeScrollBtn = document.getElementById('resume-scroll-btn');

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

  const modeLyricBtn = document.getElementById('mode-lyric-btn');
  const modeSplitBtn = document.getElementById('mode-split-btn');
  const modeZenBtn = document.getElementById('mode-zen-btn');

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

        if (rawKickEnergy > 0.022 || rawSnareEnergy > 0.025) {
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

        // Adaptive Dynamic Threshold
        const kickThreshold = mean + Math.max(0.038, 1.18 * stdDev);

        // Kick Drum Transient Detection:
        // Exceeds adaptive threshold, sharp attack flux, minimum 160ms separation (~375 BPM max)
        if (rawKickEnergy > kickThreshold && kickFlux > 0.028 && (nowMs - this.lastKickTime > 160)) {
          isKick = true;

          // Dynamic velocity / weight calculation (轻重强弱)
          const excessRatio = (rawKickEnergy - mean) / (stdDev + 0.008);
          const fluxRatio = kickFlux * 5.5;
          const absRatio = rawKickEnergy * 1.5;

          // Weight spectrum:
          // Soft / ghost note (轻拍): 0.25 ~ 0.6
          // Standard groove kick (中拍): 0.8 ~ 1.3
          // Heavy bass drop / downbeat crash (重拍): 1.6 ~ 2.5+
          beatWeight = Math.min(2.5, Math.max(0.25, excessRatio * 0.42 + fluxRatio * 0.38 + absRatio * 0.45));
          this.currentWeight = beatWeight;

          // Scale kick impulse with dynamic weight
          const strength = Math.min(1.0, 0.42 + beatWeight * 0.36);
          this.kickImpulse = Math.max(this.kickImpulse, strength);

          // Real-time BPM extraction
          if (this.lastKickTime > 0) {
            const interval = nowMs - this.lastKickTime;
            if (interval >= 260 && interval <= 1300) {
              this.lastBeatIntervals.push(interval);
              if (this.lastBeatIntervals.length > 8) this.lastBeatIntervals.shift();
              const avgInterval = this.lastBeatIntervals.reduce((a, b) => a + b, 0) / this.lastBeatIntervals.length;
              this.detectedBPM = Math.round(60000 / avgInterval);
            }
          }
          this.lastKickTime = nowMs;
        }

        // Snare / Clap transient
        if (rawSnareEnergy > mean * 1.45 + 0.08 && snareFlux > 0.035 && (nowMs - this.lastSnareTime > 220)) {
          isSnare = true;
          const snareWeight = Math.min(2.0, Math.max(0.3, rawSnareEnergy * 2.2 + snareFlux * 4.2));
          this.snareImpulse = Math.min(1.0, 0.35 + snareWeight * 0.35);
          this.lastSnareTime = nowMs;
        }

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
      this.kickImpulse *= 0.86;
      this.snareImpulse *= 0.84;

      const combinedImpulse = Math.max(this.kickImpulse, this.snareImpulse * 0.70);

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
      analyser.smoothingTimeConstant = 0.35;
      visualizerDataArray = new Uint8Array(analyser.frequencyBinCount);

      synthGain = audioCtx.createGain();
      synthGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);

      synthFilter = audioCtx.createBiquadFilter();
      synthFilter.type = 'lowpass';
      synthFilter.frequency.setValueAtTime(2400, audioCtx.currentTime);

      bassBoostFilter = audioCtx.createBiquadFilter();
      bassBoostFilter.type = 'lowshelf';
      bassBoostFilter.frequency.setValueAtTime(200, audioCtx.currentTime);
      bassBoostFilter.gain.setValueAtTime(2.2, audioCtx.currentTime);

      synthGain.connect(synthFilter);
      synthFilter.connect(bassBoostFilter);
      bassBoostFilter.connect(analyser);
      analyser.connect(audioCtx.destination);
    }

    if (!audioElSource && audioCtx && audioEl) {
      try {
        audioElSource = audioCtx.createMediaElementSource(audioEl);
        audioElSource.connect(bassBoostFilter);
      } catch (err) {
        console.warn('AudioElement WebAudio pipe notice:', err);
      }
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // ==========================================
  // 3. High-Fidelity Song-Specific Procedural Arranger
  // ==========================================
  function playNoteTone(freq, time, dur, type = 'sine', gainVal = 0.22, attack = 0.03, decay = 0.25) {
    if (!audioCtx || !synthGain || !freq) return;
    try {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(gainVal, time + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(g);
      g.connect(synthGain);
      osc.start(time);
      osc.stop(time + dur + 0.05);
    } catch (e) {}
  }

  function playSynthPercussion(type, time) {
    if (!audioCtx || !synthGain) return;
    try {
      if (type === 'kick') {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(36, time + 0.12);
        g.gain.setValueAtTime(0.55, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
        osc.connect(g);
        g.connect(synthGain);
        osc.start(time);
        osc.stop(time + 0.29);
      } else if (type === 'snare') {
        const bSize = Math.floor(audioCtx.sampleRate * 0.14);
        const b = audioCtx.createBuffer(1, bSize, audioCtx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < bSize; i++) d[i] = Math.random() * 2 - 1;
        const src = audioCtx.createBufferSource();
        src.buffer = b;
        const f = audioCtx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.setValueAtTime(1100, time);
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.38, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
        src.connect(f);
        f.connect(g);
        g.connect(synthGain);
        src.start(time);
      } else if (type === 'hihat') {
        const bSize = Math.floor(audioCtx.sampleRate * 0.05);
        const b = audioCtx.createBuffer(1, bSize, audioCtx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < bSize; i++) d[i] = Math.random() * 2 - 1;
        const src = audioCtx.createBufferSource();
        src.buffer = b;
        const f = audioCtx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.setValueAtTime(5000, time);
        const g = audioCtx.createGain();
        g.gain.setValueAtTime(0.2, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
        src.connect(f);
        f.connect(g);
        g.connect(synthGain);
        src.start(time);
      }
    } catch (e) {}
  }

  // Authentic Signature Melodies & Grooves
  const SONG_ARRANGEMENTS = {
    // 1. 七里香 - 窗外的麻雀 (76 BPM Acoustic Guitar & Summer Bell)
    qilixiang: {
      stepMs: 395,
      progression: [
        [196.00, 246.94, 293.66], // G
        [146.83, 220.00, 293.66], // D
        [164.81, 196.00, 246.94], // Em
        [130.81, 196.00, 246.94]  // C
      ],
      melody: [
        659.25, 783.99, 880.00, 1046.50, 880.00, 783.99, 659.25, 587.33,
        523.25, 587.33, 659.25, 0, 659.25, 783.99, 880.00, 0,
        783.99, 880.00, 987.77, 1174.66, 987.77, 880.00, 783.99, 659.25,
        783.99, 0, 783.99, 880.00, 783.99, 659.25, 587.33, 0
      ],
      play(step, now) {
        const chord = this.progression[Math.floor(step / 4) % this.progression.length];
        const noteFreq = chord[step % chord.length];
        playNoteTone(noteFreq, now, 0.45, 'triangle', 0.12, 0.02, 0.35);

        const mFreq = this.melody[step % this.melody.length];
        if (mFreq) {
          playNoteTone(mFreq, now, 0.5, 'sine', 0.15, 0.03, 0.45);
        }

        if (step % 4 === 0) playSynthPercussion('kick', now);
        if (step % 2 === 1) playSynthPercussion('hihat', now);
      }
    },

    // 2. Starboy - The Weeknd ft. Daft Punk (93 BPM 808 Trap Electro Dance)
    starboy: {
      stepMs: 322,
      bassNotes: [98.00, 98.00, 87.31, 87.31, 77.78, 77.78, 73.42, 73.42], // G2-F2-Eb2-D2
      melody: [
        392.00, 392.00, 392.00, 466.16, 392.00, 349.23, 392.00, 0,
        392.00, 392.00, 392.00, 466.16, 392.00, 349.23, 293.66, 0,
        587.33, 587.33, 587.33, 523.25, 466.16, 392.00, 349.23, 392.00,
        0, 392.00, 466.16, 523.25, 587.33, 523.25, 466.16, 392.00
      ],
      play(step, now) {
        if (step % 2 === 0) playSynthPercussion('kick', now);
        if (step % 4 === 2) playSynthPercussion('snare', now);
        playSynthPercussion('hihat', now);

        const bFreq = this.bassNotes[Math.floor(step / 2) % this.bassNotes.length];
        playNoteTone(bFreq, now, 0.35, 'sawtooth', 0.22, 0.01, 0.28);

        const mFreq = this.melody[step % this.melody.length];
        if (mFreq) {
          playNoteTone(mFreq, now, 0.28, 'sawtooth', 0.12, 0.02, 0.25);
        }
      }
    },

    // 3. 晴天 - 故事的小黄花 (72 BPM Acoustic Fingerpicking)
    qiantian: {
      stepMs: 416,
      melody: [
        293.66, 392.00, 392.00, 493.88, 523.25, 493.88, 440.00, 392.00,
        440.00, 0, 0, 0, 293.66, 392.00, 493.88, 0,
        493.88, 523.25, 587.33, 493.88, 440.00, 392.00, 329.63, 392.00,
        0, 392.00, 440.00, 493.88, 392.00, 329.63, 293.66, 0,
        392.00, 440.00, 493.88, 587.33, 493.88, 440.00, 392.00, 329.63,
        392.00, 0, 392.00, 440.00, 493.88, 440.00, 392.00, 0
      ],
      chords: [
        [164.81, 196.00, 246.94], // Em
        [130.81, 196.00, 246.94], // C
        [196.00, 246.94, 293.66], // G
        [146.83, 220.00, 293.66]  // D
      ],
      play(step, now) {
        const chord = this.chords[Math.floor(step / 4) % this.chords.length];
        const note = chord[step % chord.length];
        playNoteTone(note, now, 0.45, 'triangle', 0.14, 0.02, 0.38);

        const mFreq = this.melody[step % this.melody.length];
        if (mFreq) {
          playNoteTone(mFreq, now, 0.42, 'triangle', 0.18, 0.015, 0.35);
        }

        if (step % 4 === 0) playSynthPercussion('kick', now);
        if (step % 4 === 2) playSynthPercussion('hihat', now);
      }
    },

    // 4. Golden Hour - JVKE (88 BPM Cascading Grand Piano Arpeggios)
    goldenhour: {
      stepMs: 170,
      cascades: [
        329.63, 392.00, 493.88, 659.25, 783.99, 659.25, 493.88, 392.00,
        329.63, 392.00, 493.88, 659.25, 987.77, 783.99, 659.25, 493.88,
        293.66, 369.99, 440.00, 587.33, 739.99, 587.33, 440.00, 369.99,
        293.66, 369.99, 440.00, 587.33, 880.00, 739.99, 587.33, 440.00,
        261.63, 329.63, 392.00, 523.25, 659.25, 523.25, 392.00, 329.63,
        261.63, 329.63, 392.00, 523.25, 783.99, 659.25, 523.25, 392.00,
        246.94, 311.13, 369.99, 493.88, 622.25, 493.88, 369.99, 311.13,
        246.94, 311.13, 369.99, 493.88, 739.99, 622.25, 493.88, 369.99
      ],
      bassRoots: [82.41, 73.42, 65.41, 61.74],
      play(step, now) {
        const pFreq = this.cascades[step % this.cascades.length];
        playNoteTone(pFreq, now, 0.32, 'sine', 0.16, 0.01, 0.28);
        playNoteTone(pFreq * 2, now, 0.22, 'sine', 0.06, 0.01, 0.18);

        if (step % 16 === 0) {
          const bFreq = this.bassRoots[Math.floor(step / 16) % this.bassRoots.length];
          playNoteTone(bFreq, now, 1.8, 'triangle', 0.28, 0.05, 1.6);
          playSynthPercussion('kick', now);
        }
      }
    },

    // 5. 海阔天空 - Beyond (66 BPM Cantopop Rock Anthem)
    haikuotiankong: {
      stepMs: 454,
      pianoProg: [
        [174.61, 220.00, 261.63], // F
        [164.81, 196.00, 261.63], // C/E
        [146.83, 174.61, 220.00], // Dm
        [130.81, 164.81, 220.00], // Am
        [116.54, 146.83, 174.61], // Bb
        [110.00, 146.83, 174.61], // F/A
        [98.00, 146.83, 174.61],  // Gm
        [130.81, 164.81, 196.00]  // C
      ],
      chorusMelody: [
        440.00, 440.00, 440.00, 392.00, 349.23, 392.00, 440.00, 523.25,
        466.16, 440.00, 392.00, 0, 349.23, 392.00, 440.00, 0,
        349.23, 392.00, 440.00, 349.23, 293.66, 261.63, 293.66, 349.23,
        0, 349.23, 392.00, 349.23, 293.66, 261.63, 293.66, 0
      ],
      play(step, now) {
        if (step % 4 === 0) playSynthPercussion('kick', now);
        if (step % 4 === 2) playSynthPercussion('snare', now);
        playSynthPercussion('hihat', now);

        const chord = this.pianoProg[Math.floor(step / 2) % this.pianoProg.length];
        chord.forEach((f, i) => {
          playNoteTone(f, now + i * 0.02, 0.6, 'sine', 0.12, 0.02, 0.5);
        });

        const mFreq = this.chorusMelody[step % this.chorusMelody.length];
        if (mFreq) {
          playNoteTone(mFreq, now, 0.5, 'sawtooth', 0.16, 0.03, 0.45);
        }
      }
    }
  };

  function getArrangementForSong(song) {
    if (song.arrangement) return song.arrangement;
    if (SONG_ARRANGEMENTS[song.id]) return SONG_ARRANGEMENTS[song.id];

    // Check if ID matches a known key
    for (const key of Object.keys(SONG_ARRANGEMENTS)) {
      if (song.id && song.id.includes(key)) return SONG_ARRANGEMENTS[key];
      if (song.title && song.title.toLowerCase().includes(key)) return SONG_ARRANGEMENTS[key];
    }

    // Deterministically generate a unique arrangement from title + artist
    const str = (song.title || '') + (song.artist || '');
    let seed = 0;
    for (let i = 0; i < str.length; i++) {
      seed = (seed * 31 + str.charCodeAt(i)) & 0xffffffff;
    }
    seed = Math.abs(seed);

    const scales = [
      [261.63, 293.66, 329.63, 392.00, 440.00, 523.25], // C Major Pentatonic
      [220.00, 261.63, 293.66, 329.63, 392.00, 440.00], // A Minor Pentatonic
      [196.00, 220.00, 246.94, 293.66, 329.63, 392.00], // G Major Pentatonic
      [146.83, 174.61, 196.00, 220.00, 261.63, 293.66], // D Dorian
      [329.63, 392.00, 440.00, 493.88, 587.33, 659.25], // E Minor Pentatonic
      [174.61, 220.00, 261.63, 329.63, 349.23, 392.00]  // F Lydian
    ];
    const scale = scales[seed % scales.length];
    const drumStyles = ['pop', 'trap', 'acoustic', 'rock', 'piano'];
    const drumStyle = drumStyles[seed % drumStyles.length];
    const waveTypes = ['sine', 'triangle', 'sawtooth'];
    const wave = waveTypes[seed % waveTypes.length];
    const stepMs = 280 + (seed % 140); // 280ms ~ 420ms (BPM 70 - 107)

    // Generate unique 16-note melody
    const melody = [];
    for (let i = 0; i < 16; i++) {
      if (i % 4 === 3 && (seed + i) % 2 === 0) {
        melody.push(0);
      } else {
        const noteIdx = ((seed * (i + 1) * 7) % scale.length);
        melody.push(scale[noteIdx]);
      }
    }

    // Generate chords
    const chordProgressions = [
      [[scale[0], scale[2], scale[4]], [scale[3], scale[0], scale[2]], [scale[1], scale[3], scale[5]], [scale[2], scale[4], scale[0]]],
      [[scale[1], scale[3], scale[5]], [scale[4], scale[1], scale[3]], [scale[0], scale[2], scale[4]], [scale[3], scale[5], scale[1]]]
    ];
    const chords = chordProgressions[seed % chordProgressions.length];

    return {
      bpm: Math.round(60000 / (stepMs * 2)),
      stepMs,
      wave,
      drumStyle,
      melody,
      chords,
      play(step, now) {
        const chord = chords[Math.floor(step / 4) % chords.length];
        const chordNote = chord[step % chord.length];
        playNoteTone(chordNote, now, 0.4, 'triangle', 0.12, 0.02, 0.35);

        const mNote = melody[step % melody.length];
        if (mNote) {
          playNoteTone(mNote, now, 0.35, wave, 0.15, 0.02, 0.3);
        }

        if (drumStyle === 'trap') {
          if (step % 2 === 0) playSynthPercussion('kick', now);
          if (step % 4 === 2) playSynthPercussion('snare', now);
          playSynthPercussion('hihat', now);
        } else if (drumStyle === 'rock') {
          if (step % 4 === 0) playSynthPercussion('kick', now);
          if (step % 4 === 2) playSynthPercussion('snare', now);
          if (step % 2 === 1) playSynthPercussion('hihat', now);
        } else if (drumStyle === 'acoustic') {
          if (step % 4 === 0) playSynthPercussion('kick', now);
          if (step % 4 === 2) playSynthPercussion('hihat', now);
        } else if (drumStyle === 'piano') {
          playNoteTone(mNote * 2, now, 0.25, 'sine', 0.06, 0.01, 0.2);
          if (step % 8 === 0) playSynthPercussion('kick', now);
        } else {
          // pop
          if (step % 4 === 0) playSynthPercussion('kick', now);
          if (step % 2 === 1) playSynthPercussion('hihat', now);
        }
      }
    };
  }

  function startProceduralMusic(song) {
    // Strictly disabled: player only plays genuine master audio recordings from official platforms
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

  // Globally apply track cover to player, vinyl disc, ambient visuals, and WebGL particle engine
  function applyTrackCover(coverUrl, songObj) {
    if (!coverUrl) return;

    if (songObj) {
      songObj.cover = coverUrl;
    }

    // 1. Cover Image (Left Card)
    if (coverImage) {
      coverImage.src = coverUrl;
    }

    // 2. Vinyl Center Label (Right Turntable)
    if (vinylCenterImg) {
      vinylCenterImg.style.backgroundImage = `url("${coverUrl}")`;
    }

    // 3. Mini Cover in Top Navigation Pill
    if (topMiniCover) {
      topMiniCover.src = coverUrl;
    }

    // 4. Ambient Background Cross-fade
    if (isVisualizerEnabled) {
      if (ambientCoverBack && ambientCoverFront) {
        ambientCoverBack.style.backgroundImage = `url("${coverUrl}")`;
        ambientCoverBack.style.opacity = '0.12';
        ambientCoverFront.style.opacity = '0';
        setTimeout(() => {
          ambientCoverFront.style.backgroundImage = `url("${coverUrl}")`;
          ambientCoverFront.style.opacity = '0.12';
          ambientCoverBack.style.opacity = '0';
        }, 300);
      }
    }

    // 5. WebGL 3D Particle Cover Texture
    if (typeof updateParticleCover === 'function') {
      updateParticleCover(coverUrl);
    }

    // 6. Dynamic Palette Color Extraction
    if (typeof extractThemeFromCover === 'function') {
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
    currentTrackIndex = (index + PLAYLIST.length) % PLAYLIST.length;
    const song = PLAYLIST[currentTrackIndex];

    proceduralCurrentTime = 0;
    currentLyricIndex = -1;

    // Theme tokens
    const theme = song.theme || {
      accent: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.55)',
      meshColors: ['#d97706', '#ea580c', '#3b82f6']
    };

    document.documentElement.style.setProperty('--primary-accent', theme.accent);
    document.documentElement.style.setProperty('--primary-glow', theme.glow);

    // Update particle stage theme & dynamic palette flood
    if (typeof updateParticleTheme === 'function') {
      updateParticleTheme(theme);
    }

    // High-Resolution Cover Architecture
    const defaultPlaceholder = getAestheticPlaceholderCover(song.title, song.artist);
    const hasGenuineCover = song.cover &&
      !song.cover.includes('unsplash.com') &&
      !song.cover.includes('api.i-meto.com') &&
      !song.cover.startsWith('data:image/svg+xml');

    const activeCover = hasGenuineCover ? song.cover : (song.cover || defaultPlaceholder);

    topMiniCover.onerror = () => { topMiniCover.src = defaultPlaceholder; };
    coverImage.onerror = () => {
      coverImage.src = defaultPlaceholder;
      vinylCenterImg.style.backgroundImage = `url("${defaultPlaceholder}")`;
      if (typeof updateParticleCover === 'function') updateParticleCover(defaultPlaceholder);
    };

    applyTrackCover(activeCover, song);
    coverAmbientGlow.style.background = theme.accent;

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
          }
        }
      }).catch(() => {});
    }

    // Metadata text
    songTitle.textContent = song.title;
    songArtist.textContent = `${song.artist} · ${song.album}`;
    genreBadge.textContent = song.genre || 'HI-RES AUDIO';
    trackNumberBadge.textContent = `${String(currentTrackIndex + 1).padStart(2, '0')} / ${String(PLAYLIST.length).padStart(2, '0')}`;
    topSongDesc.textContent = `${song.artist.split('·')[0].trim()} · ${song.title}`;

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

    // Merge near-identical bilingual lines
    const merged = [];
    for (let i = 0; i < parsed.length; i++) {
      const cur = parsed[i];
      if (merged.length > 0) {
        const prev = merged[merged.length - 1];
        if (Math.abs(cur.time - prev.time) < 0.25) {
          if (!prev.trans && cur.text !== prev.text) {
            prev.trans = cur.text;
            continue;
          }
        }
      }
      merged.push(cur);
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
      } else if (dist === 1) {
        el.classList.add('dof-1');
      } else if (dist === 2) {
        el.classList.add('dof-2');
      } else {
        el.classList.add('dof-3plus');
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

  function renderLyricsList() {
    lyricsList.innerHTML = '';

    if (!parsedLyrics || parsedLyrics.length === 0) {
      lyricsList.innerHTML = '<div class="text-white/40 text-xl py-20 text-center">纯音乐 · 请静心感受流光</div>';
      return;
    }

    parsedLyrics.forEach((item, idx) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'lyric-line group';
      lineDiv.dataset.index = idx;
      lineDiv.dataset.time = item.time;

      const mainText = document.createElement('div');
      mainText.className = 'lyric-main';
      mainText.textContent = item.text;
      lineDiv.appendChild(mainText);

      if (item.trans) {
        const transText = document.createElement('div');
        transText.className = 'lyric-trans';
        transText.textContent = item.trans;
        lineDiv.appendChild(transText);
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
    scrollToActiveLyric(true);
  });

  // ==========================================
  // 6. Playback Controls & Progress Bar
  // ==========================================
  let playLoopRaf = null;
  const miniVisBars = document.querySelectorAll('.vis-bar');
  let smoothGlowScale = 1.0;
  let smoothGlowOpacity = 0.55;

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
    }

    // Live Web Audio FFT sampling for Beat Detection and Dynamic Resonance
    if (analyser && visualizerDataArray) {
      analyser.getByteFrequencyData(visualizerDataArray);
    }
    const beatInfo = BeatDetector.process(
      visualizerDataArray,
      now,
      currTime,
      PLAYLIST[currentTrackIndex]
    );

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
      const dynamicWeight = beatInfo.weight || 1.0;
      const kickImpulse = beatInfo.impulse * dynamicWeight;
      const targetScale = 1.0 + kickImpulse * 0.08;
      const targetOpacity = Math.min(1.0, 0.45 + kickImpulse * 0.40);
      smoothGlowScale += (targetScale - smoothGlowScale) * 0.35;
      smoothGlowOpacity += (targetOpacity - smoothGlowOpacity) * 0.35;

      coverAmbientGlow.style.transform = `scale(${smoothGlowScale.toFixed(3)})`;
      coverAmbientGlow.style.opacity = smoothGlowOpacity.toFixed(3);
    }

    playLoopRaf = requestAnimationFrame(updatePlayLoop);
  }

  function playTrack() {
    initWebAudio();
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    document.body.classList.add('is-playing');
    vinylDisc.classList.add('vinyl-playing');

    if (!playLoopRaf) {
      playLoopRaf = requestAnimationFrame(updatePlayLoop);
    }

    const song = PLAYLIST[currentTrackIndex];
    if (!song) return;

    // Never play procedural synth music on search/playlist tracks
    stopProceduralMusic();

    // Priority 1: If audioEl has a real audio source, attempt native playback
    if (audioEl.src && audioEl.src !== window.location.href && !audioEl.src.endsWith('/') && !audioEl.src.includes('types=url')) {
      audioEl.volume = currentVolume;
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
              audioEl.volume = currentVolume;
              audioEl.play().catch((err) => {
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

  function pauseTrack() {
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    document.body.classList.remove('is-playing', 'has-live-fft');
    vinylDisc.classList.remove('vinyl-playing');

    if (playLoopRaf) {
      cancelAnimationFrame(playLoopRaf);
      playLoopRaf = null;
    }

    try { audioEl.pause(); } catch (e) {}
    stopProceduralMusic();
  }

  function togglePlay() {
    if (isPlaying) pauseTrack();
    else playTrack();
  }

  function nextTrack() {
    if (playMode === 'shuffle') {
      let randIdx = Math.floor(Math.random() * PLAYLIST.length);
      if (randIdx === currentTrackIndex) randIdx = (randIdx + 1) % PLAYLIST.length;
      loadTrack(randIdx, true);
    } else {
      loadTrack(currentTrackIndex + 1, true);
    }
  }

  function prevTrack() {
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
    }
    syncLyrics(audioEl.currentTime);
  });

  audioEl.addEventListener('ended', handleTrackEnd);

  audioEl.addEventListener('playing', () => {
    // When real vocal/instrument stream starts playing, stop procedural synth
    stopProceduralMusic();
  });

  let isRecoveringStream = false;
  audioEl.addEventListener('error', (e) => {
    // Ignore if audioEl has no valid src or is pointing to the page URL
    if (!audioEl.src || audioEl.src === window.location.href || audioEl.src.endsWith('/')) {
      return;
    }

    const failedUrl = audioEl.src;
    console.warn('Native audio stream error on:', failedUrl);

    // If stream failed through proxy, attempt instant direct playback fallback
    if (failedUrl.includes('/api/proxy?url=')) {
      try {
        const directUrl = decodeURIComponent(failedUrl.split('/api/proxy?url=')[1]);
        if (directUrl && directUrl.startsWith('http') && !directUrl.includes('404')) {
          console.warn('Proxy streaming error, falling back directly to:', directUrl);
          audioEl.src = directUrl;
          audioEl.load();
          if (isPlaying) {
            audioEl.volume = currentVolume;
            audioEl.play().catch(e => console.warn('Direct fallback deferred:', e));
          }
          return;
        }
      } catch (err) {}
    }

    const song = PLAYLIST[currentTrackIndex];
    if (!song) return;

    // Never play procedural synth music on search/playlist errors
    stopProceduralMusic();

    // Auto-failover attempt: query alternate audio stream in background
    if (!isRecoveringStream && window.AetheriaAPI) {
      isRecoveringStream = true;
      genreBadge.textContent = 'RE-ROUTING HI-RES...';
      const thisTrack = song;
      thisTrack.audioUrl = null;

      if (window.AetheriaAPI.invalidateAudioCache) {
        window.AetheriaAPI.invalidateAudioCache(thisTrack);
      }

      const cleanArtist = thisTrack.artist ? thisTrack.artist.split(/[·/,(]/)[0].trim() : '';
      const cleanTitle = thisTrack.title ? thisTrack.title.split(/[(（]/)[0].trim() : '';
      const query = `${cleanTitle} ${cleanArtist}`.trim();

      const recoverPromise = (window.AetheriaAPI.searchAndResolveAudio && query)
        ? window.AetheriaAPI.searchAndResolveAudio(query)
        : window.AetheriaAPI.resolveSongAudioUrl(thisTrack);

      recoverPromise.then((newUrl) => {
        isRecoveringStream = false;
        if (thisTrack === PLAYLIST[currentTrackIndex] && newUrl && newUrl !== failedUrl) {
          thisTrack.audioUrl = newUrl;
          audioEl.src = formatAudioStreamUrl(newUrl);
          audioEl.load();
          if (isPlaying) {
            audioEl.volume = currentVolume;
            audioEl.play().then(() => {
              genreBadge.textContent = thisTrack.genre || 'LOSSLESS 24-BIT';
              showToast(`已切换至备用高保真音源`, 'success');
            }).catch(() => {});
          }
        } else {
          genreBadge.textContent = thisTrack.genre || 'LOSSLESS 24-BIT';
          showToast(`当前音源受限，请尝试搜索其他版本`, 'warning');
        }
      }).catch(() => {
        isRecoveringStream = false;
        genreBadge.textContent = thisTrack.genre || 'LOSSLESS 24-BIT';
        showToast(`当前音源受限，请尝试搜索其他版本`, 'warning');
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

  // Soundstage Spatial Vinyl FX
  soundstageBtn.addEventListener('click', () => {
    initWebAudio();
    isSoundstageActive = !isSoundstageActive;
    soundstageBtn.classList.toggle('active', isSoundstageActive);

    if (bassBoostFilter && audioCtx) {
      bassBoostFilter.gain.setValueAtTime(isSoundstageActive ? 6.5 : 0, audioCtx.currentTime);
    }
  });

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

    // 0ms Instant Local Preview
    if (window.AetheriaAPI && window.AetheriaAPI.BUILTIN_CATALOG) {
      const q = val.toLowerCase();
      const instantMatches = window.AetheriaAPI.BUILTIN_CATALOG.filter(song => 
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.album.toLowerCase().includes(q) ||
        (song.keywords && song.keywords.some(k => k.toLowerCase().includes(q)))
      ).map(s => ({ ...s, source: 'builtin', badge: '母带无损 · 即刻秒播' }));

      renderSearchResults(instantMatches, neteaseParsed, val);
    }

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
      searchDebounce = setTimeout(execute, 220);
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

      const initialCover = hasRealCover ? item.cover : defaultPlaceholder;

      row.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <img src="${initialCover}" class="search-row-thumb w-10 h-10 rounded-xl object-cover shadow shrink-0 bg-white/5" />
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
          savePlaylistToStorage();
          loadTrack(0, true);
        } else {
          PLAYLIST = PLAYLIST.concat(tracks);
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

    if (parsedLyrics.length > 0 && currentLyricIndex >= 0) {
      const activeItem = parsedLyrics[currentLyricIndex];
      cardLyricChinese.textContent = activeItem.text;
      cardLyricTrans.textContent = activeItem.trans || '';
    } else {
      cardLyricChinese.textContent = song.title;
      cardLyricTrans.textContent = song.artist;
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
  // 8.5 Dynamic Theme Extraction & Palette Analysis
  // ==========================================
  function extractThemeFromCover(coverUrl, callback) {
    if (!coverUrl) return callback(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 16;
        c.height = 16;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
          if (lum > 20 && lum < 235) {
            r += data[i];
            g += data[i+1];
            b += data[i+2];
            count++;
          }
        }
        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          callback({
            r: r / 255,
            g: g / 255,
            b: b / 255,
            accent: `rgb(${r}, ${g}, ${b})`,
            glow: `rgba(${r}, ${g}, ${b}, 0.55)`,
            base: `rgb(${Math.round(r * 0.18)}, ${Math.round(g * 0.18)}, ${Math.round(b * 0.18)})`
          });
          return;
        }
      } catch (e) {}
      callback(null);
    };
    img.onerror = () => callback(null);
    img.src = coverUrl;
  }

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

  function spawnRandomRipple(intensity = 0.75, customX = null, customY = null) {
    const rip = ripples[nextRippleIdx];
    nextRippleIdx = (nextRippleIdx + 1) % RIPPLE_POOL_SIZE;

    const aspect = (window.innerWidth || 1) / (window.innerHeight || 1);
    if (customX !== null && customY !== null) {
      rip.x = customX;
      rip.y = customY;
    } else {
      // Random coordinates: distributed naturally across screen and margins
      const angle = Math.random() * Math.PI * 2;
      const rad = 0.2 + Math.random() * 0.95;
      rip.x = Math.cos(angle) * rad * Math.min(aspect, 1.4);
      rip.y = Math.sin(angle) * rad;
    }
    rip.startTime = simTime;
    rip.intensity = Math.min(2.5, Math.max(0.25, intensity));
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

    // Fast localized wave-packet calculation: dynamically scaled narrow-ring ripple
    float calcRipple(vec2 pos, vec4 rip, float time) {
      if (rip.w <= 0.001) return 0.0;
      float age = time - rip.z;
      if (age < 0.0 || age > 1.8) return 0.0;

      float d = length(pos - rip.xy);
      float radius = age * 0.92;
      float waveFront = d - radius;

      // Narrow gaussian ring envelope
      float ringEnvelope = exp(-waveFront * waveFront * 42.0);
      float timeDecay = max(0.0, 1.0 - age / 1.8) * exp(-age * 1.35);
      return sin(d * 22.0 - age * 11.0) * ringEnvelope * timeDecay * rip.w * 0.055;
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
        float w1 = sin(d * 6.5 - uTime * 1.8) * 0.016;
        float w2 = cos(wx * 4.2 + uTime * 1.2) * 0.012;
        float w3 = sin(wy * 4.6 - uTime * 1.3) * 0.012;

        float r0 = calcRipple(vec2(wx, wy), uRipple0, uTime);
        float r1 = calcRipple(vec2(wx, wy), uRipple1, uTime);
        float r2 = calcRipple(vec2(wx, wy), uRipple2, uTime);
        float r3 = calcRipple(vec2(wx, wy), uRipple3, uTime);

        float centerBreathe = exp(-d * 2.6) * bassPow * 0.32;
        z = w1 + w2 + w3 + r0 + r1 + r2 + r3 + centerBreathe;

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
      if (uResonanceMode > 3.5) {
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

    window.addEventListener('resize', () => {
      cachedWinW = window.innerWidth || 1920;
      cachedWinH = window.innerHeight || 1080;
      cachedAspect = cachedWinW / cachedWinH;
      resizeParticleCanvas();
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
          offCanvas.width = 1024;
          offCanvas.height = 1024;
          const offCtx = offCanvas.getContext('2d');
          offCtx.drawImage(img, 0, 0, 1024, 1024);
          gl.bindTexture(gl.TEXTURE_2D, coverTexture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offCanvas);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } catch (e2) {}
      }
    };
    img.src = coverUrl;
  }

  function setupGridGeometry(w, h) {
    if (!gl) return;
    const aspect = w / h;
    // Balanced high-density retina particle grid (~120,000 to 145,000 points)
    // Pitch ~3.6px: crystal-clear stardust resolution, but 50% fewer calculations than 250k points!
    const rows = Math.min(Math.max(Math.round(h / 3.6), 190), 280);
    const cols = Math.min(Math.max(Math.round(rows * aspect), 260), 500);

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
    // Cap DPR at 1.25 to prevent catastrophic 4K fill-rate thrashing on high-DPI displays
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
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
    if (currentResonanceMode === 0 && isPlaying) {
      if (beatInfo.isKick && beatInfo.impulse > 0.35) {
        lastRippleSpawnTime = now;
        const rippleIntensity = Math.min(2.4, Math.max(0.3, beatInfo.impulse * (beatInfo.weight || 1.0) * 1.1));
        spawnRandomRipple(rippleIntensity);
      } else if (now - lastRippleSpawnTime > 1600) {
        lastRippleSpawnTime = now;
        spawnRandomRipple(0.30);
      }
    }

    if (gl && particleProgram && gridVbo && vertexCount > 0) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const aspect = w / h;
      const coverScale = Math.min(0.70, aspect * 0.82);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const basePointSize = (h / (currentGridRows || 240)) * 0.94;

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
    document.body.classList.remove('mode-lyric-focus', 'mode-split', 'zen-active');
    [modeLyricBtn, modeSplitBtn, modeZenBtn].forEach(btn => btn?.classList.remove('active'));

    clearTimeout(modeSwitchTimer);

    if (mode === 'lyric-focus' || mode === 'zen') {
      if (mode === 'lyric-focus') {
        document.body.classList.add('mode-lyric-focus');
        modeLyricBtn?.classList.add('active');
      } else {
        document.body.classList.add('zen-active');
        modeZenBtn?.classList.add('active');
      }

      // "在我们的切换动画之后 把背景切成粒子状 然后加上视觉动效 与歌曲共振"
      // Layout animation completes at 650ms, then activate 3D particle cover mesh
      modeSwitchTimer = setTimeout(() => {
        activateParticleStage(true);
      }, 650);
    } else {
      document.body.classList.add('mode-split');
      modeSplitBtn?.classList.add('active');
      activateParticleStage(false);
    }
  }

  modeLyricBtn.addEventListener('click', () => setLayoutMode('lyric-focus'));
  modeSplitBtn.addEventListener('click', () => setLayoutMode('split'));
  modeZenBtn.addEventListener('click', () => setLayoutMode('zen'));

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

  // Fullscreen
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
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

    PLAYLIST.forEach((song, idx) => {
      const row = document.createElement('div');
      row.className = `playlist-row p-3 flex items-center justify-between cursor-pointer group ${idx === currentTrackIndex ? 'active' : ''}`;

      const defaultPlaceholder = getAestheticPlaceholderCover(song.title, song.artist);
      const hasRealCover = song.cover &&
        !song.cover.includes('unsplash.com') &&
        !song.cover.includes('api.i-meto.com') &&
        !song.cover.startsWith('data:image/svg+xml');

      const initialCover = hasRealCover ? song.cover : defaultPlaceholder;

      row.innerHTML = `
        <div class="flex items-center gap-3 overflow-hidden">
          <img src="${initialCover}" class="drawer-row-thumb w-11 h-11 rounded-xl object-cover shadow shrink-0 bg-white/5" />
          <div class="text-left overflow-hidden">
            <h4 class="text-xs font-semibold text-white leading-tight truncate">${song.title}</h4>
            <p class="text-[11px] text-white/50 truncate">${song.artist}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <div class="text-[10px] font-mono text-white/40">
            ${idx === currentTrackIndex ? '<span class="text-emerald-400 font-bold">PLAYING</span>' : (song.genre ? song.genre.split('/')[0] : 'TRACK')}
          </div>
          ${PLAYLIST.length > 1 ? `
          <button class="delete-track-btn opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 text-white/30 text-xs transition-opacity" title="从歌单移除">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>` : ''}
        </div>
      `;

      const rowImg = row.querySelector('.drawer-row-thumb');
      if (rowImg) {
        rowImg.onerror = () => { rowImg.src = defaultPlaceholder; };
      }

      if (!hasRealCover && window.AetheriaAPI && window.AetheriaAPI.resolveSongCover) {
        window.AetheriaAPI.resolveSongCover(song, song.source || 'netease').then(realCover => {
          if (realCover) {
            song.cover = realCover;
            if (rowImg) rowImg.src = realCover;
          }
        }).catch(() => {});
      }

      row.addEventListener('click', (e) => {
        if (e.target.closest('.delete-track-btn')) return;
        loadTrack(idx, true);
        togglePlaylistDrawer(false);
      });

      const delBtn = row.querySelector('.delete-track-btn');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (PLAYLIST.length <= 1) return;
          PLAYLIST.splice(idx, 1);
          savePlaylistToStorage();
          if (idx === currentTrackIndex) {
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

  const resetPlaylistBtn = document.getElementById('reset-playlist-btn');
  if (resetPlaylistBtn) {
    resetPlaylistBtn.addEventListener('click', () => {
      if (confirm('是否恢复预置官方曲库 (30+ 首热门曲目)？')) {
        if (window.AetheriaAPI && window.AetheriaAPI.BUILTIN_CATALOG) {
          PLAYLIST = [...window.AetheriaAPI.BUILTIN_CATALOG];
          savePlaylistToStorage();
          loadTrack(0, true);
        }
      }
    });
  }

  // Local File Upload
  localFileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    let audioFile = null;
    let lrcFile = null;

    files.forEach(f => {
      if (f.name.endsWith('.lrc')) lrcFile = f;
      else if (f.type.startsWith('audio/') || f.name.endsWith('.mp3') || f.name.endsWith('.wav') || f.name.endsWith('.flac')) audioFile = f;
    });

    if (audioFile) {
      const audioUrl = URL.createObjectURL(audioFile);
      const newTrack = {
        id: 'local_' + Date.now(),
        title: audioFile.name.replace(/\.[^/.]+$/, ""),
        artist: '本地音乐文件',
        album: '我的媒体库',
        genre: 'LOCAL / AUDIO',
        cover: getAestheticPlaceholderCover(audioFile.name.replace(/\.[^/.]+$/, ""), '本地音乐'),
        theme: {
          accent: '#38bdf8',
          glow: 'rgba(56, 189, 248, 0.55)',
          meshColors: ['#0284c7', '#3b82f6', '#4f46e5']
        },
        audioUrl: audioUrl,
        lrcPairs: [
          { time: 0.0, text: audioFile.name, trans: "本地导入音频文件" },
          { time: 3.0, text: "享受您的私享音乐时光", trans: "Enjoy your personal listening experience" }
        ]
      };

      if (lrcFile) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          newTrack.lrcPairs = parseLRC(evt.target.result);
          PLAYLIST.unshift(newTrack);
          savePlaylistToStorage();
          loadTrack(0, true);
        };
        reader.readAsText(lrcFile, 'utf-8');
      } else {
        PLAYLIST.unshift(newTrack);
        savePlaylistToStorage();
        loadTrack(0, true);
      }
    }
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

  // Zen Inactivity
  let zenTimeout = null;
  function resetZenTimer() {
    if (currentLayoutMode !== 'zen') {
      document.body.classList.remove('zen-active');
    }
    clearTimeout(zenTimeout);
    if (isPlaying && currentLayoutMode === 'zen') {
      zenTimeout = setTimeout(() => {
        document.body.classList.add('zen-active');
      }, 3500);
    }
  }
  window.addEventListener('mousemove', resetZenTimer);
  window.addEventListener('keydown', resetZenTimer);
  window.addEventListener('click', resetZenTimer);

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
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
        break;
      case 'KeyR':
        cycleResonanceMode();
        break;
      case 'KeyV':
        if (currentLayoutMode === 'lyric-focus' || currentLayoutMode === 'zen') {
          cycleResonanceMode();
        } else {
          setLayoutMode('lyric-focus');
        }
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
  const brandTag = document.getElementById('brand-tag');
  const closeDynamicIslandBtn = document.getElementById('close-dynamic-island-btn');

  if (brandTag && dynamicIslandModal) {
    brandTag.addEventListener('click', (e) => {
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
      if (!dynamicIslandModal.contains(e.target) && !brandTag.contains(e.target)) {
        dynamicIslandModal.classList.remove('show');
      }
    });
  }

  try {
    localStorage.removeItem('aetheria_living_cover_mode');
    document.body.classList.remove('living-cover-cinematic', 'living-cover-sheen', 'living-cover-pulse', 'living-cover-liquid', 'living-cover-breath', 'living-cover-off');
  } catch (e) {}

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

  initParticleStage();
  setVolume(0.8);
  loadTrack(0, false);
  setLayoutMode('split');

})();
