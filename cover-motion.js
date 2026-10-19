/* Aetheria Sound · Intelligent Content-Aware Album Cover Motion Engine */
(function () {
  'use strict';

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  // Core DOM references
  let cover = null;
  let card = null;
  let image = null;
  let badge = null;
  let toastEl = null;

  // Motion physics state
  let currentMode = 'person'; // 'person' | 'scene'
  let manualOverride = false;
  let energy = 0;
  let playing = false;
  let raf = 0;
  let phase = 0;
  let breathPhase = 0;

  // Interactive camera follow state
  let targetMouseX = 0;
  let targetMouseY = 0;
  let smoothMouseX = 0;
  let smoothMouseY = 0;
  let isPointerOverStage = false;

  // Active track cache
  let currentSong = null;
  let currentCoverUrl = '';

  function init() {
    cover = document.getElementById('cover-perspective-box');
    card = document.getElementById('cover-card');
    image = document.getElementById('cover-image');
    badge = document.getElementById('motion-badge');
    toastEl = document.getElementById('app-toast');

    if (!cover || !image) return;

    cover.classList.add('cover-motion-ready');

    // Keep badge hidden per user preference
    if (badge) {
      badge.classList.add('hidden');
      badge.style.display = 'none';
    }

    // Attach pointer tracking for camera parallax
    setupPointerTracking();

    // Listen to image load events for content detection
    image.addEventListener('load', onImageLoaded);
    if (image.complete && image.naturalWidth > 0) {
      onImageLoaded();
    }

    // Battery Saver Guard: Resume loop when tab is focused
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && playing && !raf) {
        raf = requestAnimationFrame(render);
      }
    });

    // Start motion render loop
    if (!raf && !document.hidden) raf = requestAnimationFrame(render);
  }

  function setupPointerTracking() {
    const stage = document.getElementById('main-stage') || document.body;

    function handlePointerMove(e) {
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Normalized coordinates relative to card center (-1 to 1)
      const rangeX = Math.max(window.innerWidth * 0.4, 300);
      const rangeY = Math.max(window.innerHeight * 0.4, 300);

      const dx = (e.clientX - centerX) / rangeX;
      const dy = (e.clientY - centerY) / rangeY;

      targetMouseX = Math.max(-1, Math.min(1, dx));
      targetMouseY = Math.max(-1, Math.min(1, dy));
      isPointerOverStage = true;
    }

    function handlePointerLeave() {
      targetMouseX = 0;
      targetMouseY = 0;
      isPointerOverStage = false;
    }

    stage.addEventListener('pointermove', handlePointerMove, { passive: true });
    stage.addEventListener('pointerleave', handlePointerLeave, { passive: true });
  }

  function onImageLoaded() {
    if (!image || !image.naturalWidth) return;
    if (!manualOverride) {
      detectSubject(image, currentSong);
    }
  }

  // ============================================================
  // Intelligent Content Detection: Person vs. Scene
  // ============================================================
  async function detectSubject(imgEl, songObj) {
    if (!cover) return;

    // 1. Instant client-side heuristic so playback begins with 0ms lag
    let fastMode = analyzeMetadataForSubject(songObj);
    try {
      const skinAnalysis = analyzeSkinDistribution(imgEl);
      if (skinAnalysis && skinAnalysis.conclusive) {
        fastMode = { isPerson: skinAnalysis.isPerson, reason: skinAnalysis.reason };
      }
    } catch (_) {}
    applyMode(fastMode.isPerson ? 'person' : 'scene', fastMode.reason);
  }

  function analyzeSkinDistribution(imgEl) {
    if (!imgEl || !imgEl.naturalWidth || imgEl.naturalWidth < 10) return { conclusive: false };

    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { conclusive: false };

    try {
      ctx.drawImage(imgEl, 0, 0, size, size);
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;

      let skinUpperMid = 0;
      let totalUpperMid = 0;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          if (a < 50) continue;

          // Upper-mid central quadrant where portrait faces & busts sit
          const isUpperMid = (y >= size * 0.16 && y <= size * 0.72 && x >= size * 0.20 && x <= size * 0.80);
          if (isUpperMid) {
            totalUpperMid++;
            if (isSkinColor(r, g, b)) {
              skinUpperMid++;
            }
          }
        }
      }

      const skinRatio = totalUpperMid > 0 ? (skinUpperMid / totalUpperMid) : 0;

      // Portrait: upper-center skin region accounts for 8% ~ 65% of the central crop
      if (skinRatio >= 0.08 && skinRatio <= 0.65) {
        return { conclusive: true, isPerson: true, reason: '特征检测: 人物肖像' };
      }
      // Pure landscape/abstract art: skin ratio is below 3%
      if (skinRatio < 0.03) {
        return { conclusive: true, isPerson: false, reason: '特征检测: 场景风光' };
      }
    } catch (_) {
      // Cross-origin tainted canvas fallback
      return { conclusive: false };
    }
    return { conclusive: false };
  }

  function isSkinColor(r, g, b) {
    // RGB & YCbCr physiological human skin boundary
    if (r <= 60 || g <= 35 || b <= 20) return false;
    if (r <= g || r <= b) return false;
    if ((r - g) < 8) return false;

    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    return (cr >= 132 && cr <= 175 && cb >= 80 && cb <= 126);
  }

  function analyzeMetadataForSubject(songObj) {
    if (!songObj) return { isPerson: true, reason: '默认模式: 人物呼吸' };

    const artist = (songObj.artist || '').toLowerCase();
    const title = (songObj.title || '').toLowerCase();
    const genre = (songObj.genre || '').toLowerCase();

    // Scene / Instrumental / Ambient / OST keywords
    const sceneKeywords = [
      'ost', 'soundtrack', 'orchestra', 'piano', 'cinematic', 'ambient', 'lofi', 'instrumental',
      'interstellar', 'hans zimmer', 'joe hisaishi', '久石让', '纯音乐', '背景音乐', '星际穿越',
      'landscape', 'electronic', 'synthwave', 'classical', 'nature', 'cyberpunk', 'meditation'
    ];

    for (const kw of sceneKeywords) {
      if (artist.includes(kw) || title.includes(kw) || genre.includes(kw)) {
        return { isPerson: false, reason: '风格解析: 场景/原声' };
      }
    }

    // Known vocal / singer portrait keywords
    const vocalKeywords = [
      '周杰伦', 'jay chou', '林俊杰', '陈奕迅', '王菲', '孙燕姿', '蔡依林', '邓紫棋', '薛之谦', '李荣浩',
      '张学友', '莫文蔚', '张惠妹', '陶喆', '王力宏', '五月天', 'taylor swift', 'adele', 'billie eilish',
      'ed sheeran', 'bruno mars', 'lady gaga', 'pop', 'r&b', 'hip-hop', 'vocal'
    ];

    for (const kw of vocalKeywords) {
      if (artist.includes(kw) || title.includes(kw) || genre.includes(kw)) {
        return { isPerson: true, reason: '歌手封面: 人物呼吸' };
      }
    }

    return { isPerson: true, reason: '歌手专辑: 人物呼吸' };
  }

  function applyMode(mode, reason, modelTag) {
    currentMode = mode;
    if (!cover) return;

    cover.classList.remove('cover-has-person', 'cover-scene-mode');
    if (mode === 'person') {
      cover.classList.add('cover-has-person');
    } else {
      cover.classList.add('cover-scene-mode');
    }

    updateBadgeUI(mode, reason, modelTag);
  }

  function updateBadgeUI(mode, reason, modelTag) {
    if (!badge) return;
    badge.classList.add('hidden');
    badge.style.display = 'none';
  }

  function toggleMode() {
    manualOverride = true;
    const nextMode = currentMode === 'person' ? 'scene' : 'person';
    applyMode(nextMode);
  }

  function showNotification(text) {
    if (window.showToast && typeof window.showToast === 'function') {
      window.showToast(text, 'music');
      return;
    }
    if (toastEl) {
      const textEl = toastEl.querySelector('#toast-text');
      if (textEl) textEl.textContent = text;
      toastEl.classList.add('show');
      setTimeout(() => { toastEl.classList.remove('show'); }, 2200);
    }
  }

  // ============================================================
  // Public Interface
  // ============================================================
  function setCover(url, songObj) {
    currentCoverUrl = url || '';
    if (songObj) currentSong = songObj;
    manualOverride = false; // Reset override on new song

    if (cover && url) {
      cover.style.setProperty('--cover-motion-image', `url("${String(url).replace(/"/g, '\\"')}")`);
    }
    if (image && url) {
      image.crossOrigin = 'anonymous';
      if (image.src !== url) {
        image.src = url;
      } else if (image.complete) {
        onImageLoaded();
      }
    }
  }

  let currentBeatImpulse = 0;

  function setAudioLevel(value, impulse = 0) {
    const target = Math.max(0, Math.min(1, value));
    // Fast attack (instantaneous 0ms latency on audio beat), smooth spring decay
    if (target > energy) {
      energy = target;
    } else {
      energy += (target - energy) * 0.22;
    }
    if (impulse > 0) {
      currentBeatImpulse = Math.max(currentBeatImpulse, Math.min(1.5, impulse));
    }
    if (!raf) raf = requestAnimationFrame(render);
  }

  function setPlaying(value) {
    playing = Boolean(value);
    if (cover) cover.classList.toggle('cover-motion-playing', playing && !reduced?.matches);
    if (!raf) raf = requestAnimationFrame(render);
  }

  // ============================================================
  // High-Precision Render Loop (GPU CSS Variable Driven)
  // ============================================================
  function render() {
    raf = 0;
    if (!cover) return;

    // Battery Saver Guard: pause rendering when tab is hidden
    if (document.hidden) return;

    // Time advancement
    if (!reduced?.matches) {
      if (playing) {
        breathPhase += 0.018 + energy * 0.024; // Subtle breath acceleration with rhythm
        phase += 0.015 + energy * 0.028;
      } else {
        breathPhase += 0.012; // Calm resting breath when paused
        phase += 0.008;
      }
    }

    // Smooth pointer tracking (spring physics)
    smoothMouseX += (targetMouseX - smoothMouseX) * 0.08;
    smoothMouseY += (targetMouseY - smoothMouseY) * 0.08;

    // Autonomous subtle organic camera sway
    const idleCamX = Math.sin(phase * 0.55) * 1.6 + Math.cos(phase * 0.25) * 0.8;
    const idleCamY = Math.cos(phase * 0.42) * 1.3;

    // Combined interactive & idle camera rotation
    const totalCamX = smoothMouseX * 8.5 + idleCamX; // degrees rotateY
    const totalCamY = smoothMouseY * -7.5 + idleCamY; // degrees rotateX

    // Instantaneous beat impulse exponential decay
    currentBeatImpulse *= 0.89;

    const pulse = reduced?.matches ? 0 : Math.max(energy, currentBeatImpulse * 0.85);
    cover.style.setProperty('--cover-motion-energy', pulse.toFixed(3));

    // Instantaneous beat punch scale for the acrylic sleeve:
    // Expands immediately on the kick drum beat (0ms lag) and springs back
    const beatCardScale = 1.0 + (currentBeatImpulse * 0.055) + (energy * 0.015);
    cover.style.setProperty('--beat-scale', beatCardScale.toFixed(4));

    if (currentMode === 'person') {
      // ----------------------------------------------------------
      // MODE A: 人物呼吸 + 轻微镜头跟随
      // ----------------------------------------------------------
      // Asymmetric sine curve for human inhalation/exhalation
      const rawBreath = Math.sin(breathPhase);
      const breathNorm = (rawBreath + 1) * 0.5; // 0..1

      // Chest expansion and rhythm pulse
      const chestExpansion = breathNorm * 0.022 + pulse * 0.045;
      const breathScaleY = 1.0 + chestExpansion;
      const breathScaleX = 1.0 + chestExpansion * 0.35;
      const breathLiftY = -chestExpansion * 28; // Inhalation lifts chest upwards (-1px to -3px)

      // Counter-parallax: character stays 3D centered as acrylic sleeve tilts
      const charParallaxX = -totalCamX * 0.85;
      const charParallaxY = totalCamY * 0.75;

      cover.style.setProperty('--breath-scale-y', breathScaleY.toFixed(4));
      cover.style.setProperty('--breath-scale-x', breathScaleX.toFixed(4));
      cover.style.setProperty('--breath-y', `${breathLiftY.toFixed(2)}px`);
      cover.style.setProperty('--char-parallax-x', `${charParallaxX.toFixed(2)}px`);
      cover.style.setProperty('--char-parallax-y', `${charParallaxY.toFixed(2)}px`);

      // 3D perspective camera follow on the cover card
      cover.style.setProperty('--cam-rotate-y', `${totalCamX.toFixed(2)}deg`);
      cover.style.setProperty('--cam-rotate-x', `${totalCamY.toFixed(2)}deg`);
      cover.style.setProperty('--cam-trans-x', `${(totalCamX * 0.4).toFixed(2)}px`);
      cover.style.setProperty('--cam-trans-y', `${(totalCamY * 0.4).toFixed(2)}px`);

    } else {
      // ----------------------------------------------------------
      // MODE B: 场景平移 + 景深漂移
      // ----------------------------------------------------------
      // Slow, majestic continuous cinematic pan across the landscape
      const panX = Math.sin(phase * 0.32) * 16.0 + (smoothMouseX * 10.0);
      const panY = Math.cos(phase * 0.22) * 10.0 + (smoothMouseY * 8.0);

      // Depth-of-field drift: focal scale breathing & lens contrast
      const depthPulse = Math.sin(phase * 0.38) * 0.02 + pulse * 0.052;
      const sceneScale = 1.15 + depthPulse; // Base 1.15x prevents edge reveal
      const sceneContrast = 1.02 + Math.sin(phase * 0.45) * 0.02 + pulse * 0.06;
      const sceneBrightness = 1.01 + Math.cos(phase * 0.32) * 0.02 + pulse * 0.07;

      // Atmospheric volumetric lighting sweep angle
      const lightAngle = 115 + Math.sin(phase * 0.22) * 35;

      cover.style.setProperty('--scene-pan-x', `${panX.toFixed(2)}px`);
      cover.style.setProperty('--scene-pan-y', `${panY.toFixed(2)}px`);
      cover.style.setProperty('--scene-scale', sceneScale.toFixed(4));
      cover.style.setProperty('--scene-contrast', sceneContrast.toFixed(3));
      cover.style.setProperty('--scene-brightness', sceneBrightness.toFixed(3));
      cover.style.setProperty('--scene-light-angle', `${lightAngle.toFixed(1)}deg`);

      // Gentle scenic camera tilt
      cover.style.setProperty('--cam-rotate-y', `${(totalCamX * 0.6).toFixed(2)}deg`);
      cover.style.setProperty('--cam-rotate-x', `${(totalCamY * 0.6).toFixed(2)}deg`);
      cover.style.setProperty('--cam-trans-x', `${(panX * 0.25).toFixed(2)}px`);
      cover.style.setProperty('--cam-trans-y', `${(panY * 0.25).toFixed(2)}px`);
    }

    // Keep loop active when playing or during smooth settle
    if (playing || energy > 0.005 || isPointerOverStage || !reduced?.matches) {
      raf = requestAnimationFrame(render);
    }
  }

  // Export to global scope
  window.CoverMotion = {
    init,
    setCover,
    setAudioLevel,
    setPlaying,
    toggleMode,
    setMode: (m) => applyMode(m, 'API调用'),
    getMode: () => currentMode
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
