# 沉浸式流体音乐播放器 (Immersive Music Player) - 代码库上下文

本项目是一个高保真、沉浸式 Web 音乐播放器。设计灵感源自 Apple Music 景深动效与流动光影美学，具备 WebGL 流体着色器背景、音频分析仪（AudioContext）驱动的鼓点强弱动态共振动效、精细的中英双语同步歌词滚动引擎与多音源聚合播放能力。

## 项目架构与技术栈
- **UI & 结构**: index.html (SVG 颗粒质感滤镜、唱片转盘、操作控件与双语歌词面板)
- **样式与动效**: style.css (毛玻璃 Backdrop Filter、景深高斯模糊、排版体系与呼吸动效)
- **核心播放器引擎**: pp.js (Web Audio API 实时频域/时域分析、鼓点动态共振算法、中英双语歌词时间轴同步、封面自适应调色)
- **音乐 API & 曲库**: pi.js (内置高品质曲库、网易云/QQ音乐/酷狗跨域代理接口)
- **流体着色器**: shader.js (WebGL 片元着色器实时流体与光斑模拟)
- **Node.js 本地服务**: server.js (本地音频流反向代理与 CORS 解决)

---

## 核心代码文件清单

### File: index.html
`html
<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aetheria Sound · 沉浸式流光音乐</title>
  <!-- Google Fonts: Plus Jakarta Sans, Outfit, Cinzel, Noto Serif SC -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet">
  <!-- Tailwind CSS via CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
            display: ['"Outfit"', 'sans-serif'],
            serif: ['"Noto Serif SC"', 'serif'],
            brand: ['"Cinzel"', 'serif'],
          },
          colors: {
            surface: {
              glass: 'rgba(255, 255, 255, 0.08)',
              glassHover: 'rgba(255, 255, 255, 0.15)',
              border: 'rgba(255, 255, 255, 0.12)',
              borderGlow: 'rgba(255, 255, 255, 0.28)',
              island: 'rgba(12, 12, 18, 0.75)',
            }
          }
        }
      }
    }
  </script>
  <link rel="stylesheet" href="style.css" />
</head>
<body class="bg-[#050508] text-white select-none overflow-hidden h-screen w-screen font-sans antialiased mode-split">

  <!-- ======================================================= -->
  <!-- 1. FULLSCREEN AMBIENT SYSTEM                            -->
  <!-- ======================================================= -->
  <div id="ambient-container" class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <!-- Layer A: Fullscreen Cover with Slow Ken Burns Pan/Zoom -->
    <div id="ambient-cover-back" class="ambient-layer ken-burns"></div>
    <div id="ambient-cover-front" class="ambient-layer ken-burns"></div>

    <!-- Layer B: Luxury Film Grain Noise (High-End Visual Design) -->
    <div class="noise-overlay"></div>

    <!-- Layer C: Soft Vignette -->
    <div class="ambient-vignette"></div>

    <!-- Layer D: Mineradio Dynamic Theme Color Flood Fill -->
    <div id="ambient-theme-fill" class="absolute inset-0 opacity-0 pointer-events-none"></div>

    <!-- Layer E: Mineradio Audio-Resonant Particle Field Canvas -->
    <canvas id="particle-stage-canvas" class="absolute inset-0 w-full h-full pointer-events-none opacity-0"></canvas>
  </div>

  <!-- ======================================================= -->
  <!-- 2. TOP FLOATING ISLAND BAR                              -->
  <!-- ======================================================= -->
  <header id="top-bar" class="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-12 py-5 transition-all duration-500 ease-out">
    
    <!-- Brand / Now Playing Mini Pill -->
    <div class="flex items-center gap-3.5 group cursor-pointer magnetic-item" id="brand-tag">
      <div class="relative w-10 h-10 rounded-xl overflow-hidden p-0.5 bg-white/10 border border-white/20 shadow-xl transition-all duration-300 group-hover:scale-105 active:scale-95">
        <img id="top-mini-cover" src="" alt="Album Art" class="w-full h-full object-cover rounded-[10px]" />
        <div class="absolute inset-0 bg-black/60 flex items-center justify-center gap-0.5 opacity-90">
          <span class="top-wave wave-1"></span>
          <span class="top-wave wave-2"></span>
          <span class="top-wave wave-3"></span>
        </div>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-sm font-bold tracking-wider uppercase font-display bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
            AETHERIA SOUND
          </h1>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-widest uppercase bg-white/10 border border-white/15 text-emerald-400">
            HI-RES 96kHz
          </span>
        </div>
        <p id="top-song-desc" class="text-xs text-white/60 truncate max-w-xs font-medium">
          周杰伦 · 七里香
        </p>
      </div>
    </div>

    <!-- Center Segmented Pill Switcher (Sora UI / Cue Design Spatial Island) -->
    <div class="segmented-island hidden md:flex items-center p-1 rounded-full bg-[#12121a]/80 backdrop-blur-xl border border-white/10 shadow-lg shrink-0 whitespace-nowrap">
      <button id="mode-split-btn" class="layout-pill-btn magnetic-item active px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all" data-mode="split">
        黑胶唱机分栏
      </button>
      <button id="mode-lyric-btn" class="layout-pill-btn magnetic-item px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all" data-mode="lyric-focus">
        全屏沉浸歌词
      </button>
      <button id="mode-zen-btn" class="layout-pill-btn magnetic-item px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all" data-mode="zen">
        极简禅境
      </button>
    </div>

    <!-- Right Controls: Command Search, Share Card, Local Import, Fullscreen -->
    <div class="flex items-center space-x-2.5">
      <!-- Raycast Command Search Button (Cmd+K) -->
      <button id="search-trigger-btn" class="glass-pill-btn magnetic-item flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0" title="全网搜歌与榜单 (快捷键: Cmd/Ctrl + K 或 /)">
        <svg class="w-3.5 h-3.5 text-white/80 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span class="whitespace-nowrap hidden sm:inline">全网搜歌</span>
        <kbd class="hidden md:inline-block px-1.5 py-0.5 rounded bg-white/15 text-[10px] font-mono text-white/70">⌘K</kbd>
      </button>

      <!-- Share Lyric Card Button -->
      <button id="share-card-btn" class="glass-pill-btn magnetic-item p-2 text-xs" title="生成并分享歌词卡片海报">
        <svg class="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      </button>

      <!-- NetEase Cloud Music Import Button -->
      <button id="netease-import-btn" class="glass-pill-btn magnetic-item flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 hover:border-red-500/50" title="导入网易云音乐歌单 / 单曲">
        <svg class="w-3.5 h-3.5 text-red-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
        </svg>
        <span class="hidden sm:inline">导入网易云</span>
      </button>

      <!-- Local File Upload -->
      <label class="glass-pill-btn magnetic-item flex items-center gap-1.5 px-3 py-2 text-xs font-medium cursor-pointer" title="导入本地音频 / LRC">
        <input type="file" id="local-file-input" accept="audio/*,.lrc" multiple class="hidden" />
        <svg class="w-3.5 h-3.5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </label>

      <!-- Fullscreen Toggle -->
      <button id="fullscreen-btn" class="glass-pill-btn magnetic-item p-2 text-xs" title="全屏模式 (F)">
        <svg class="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      </button>

      <!-- Help / Guide -->
      <button id="help-btn" class="glass-pill-btn magnetic-item p-2 text-xs" title="快捷键与体验指南">
        <svg class="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </button>
    </div>
  </header>

  <!-- ======================================================= -->
  <!-- 3. MAIN IMMERSIVE STAGE                                 -->
  <!-- ======================================================= -->
  <main id="main-stage" class="relative z-10 w-full h-full flex items-center justify-evenly px-6 md:px-16 lg:px-24 pt-16 pb-28">
    
    <!-- LEFT: 3D Acrylic Vinyl & Metadata (Split Mode) -->
    <section id="album-column" class="flex flex-col items-center justify-center w-full md:w-5/12 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
      
      <div id="cover-perspective-box" class="relative group cursor-pointer select-none">
        <div id="cover-ambient-glow" class="absolute -inset-4 rounded-full opacity-40 transition-all duration-700 pointer-events-none"></div>

        <!-- Physical Vinyl Disc -->
        <div id="vinyl-disc" class="absolute top-3 right-3 w-64 h-64 md:w-80 md:h-80 rounded-full vinyl-body shadow-2xl transition-all duration-700 ease-out z-0 pointer-events-none">
          <div class="vinyl-groove"></div>
          <div class="vinyl-label-center" id="vinyl-center-img"></div>
          <div class="vinyl-spindle"></div>
        </div>

        <!-- Double-Bezel Acrylic Sleeve -->
        <div id="cover-card" class="relative z-10 w-64 h-64 md:w-80 md:h-80 rounded-[26px] p-2.5 bg-[#14141d] border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)] transition-transform duration-300 ease-out">
          <div class="relative w-full h-full rounded-[20px] overflow-hidden shadow-inner bg-black/60">
            <img id="cover-image" src="" alt="Album Art" class="w-full h-full object-cover transition-opacity duration-500" />
            <div class="sleeve-sheen pointer-events-none"></div>

            <!-- Audio Wave Meter Indicator -->
            <div class="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/85 border border-white/20 flex items-center gap-1 z-20">
              <span class="vis-bar bar-1"></span>
              <span class="vis-bar bar-2"></span>
              <span class="vis-bar bar-3"></span>
              <span class="vis-bar bar-4"></span>
            </div>
          </div>
        </div>
      </div>

      <div id="song-meta" class="mt-8 text-center w-full px-4">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span id="genre-badge" class="px-3 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-white/15 border border-white/20 text-white/90">
            POP / CLASSIC
          </span>
          <span id="track-number-badge" class="text-xs text-white/40 font-mono">01 / 05</span>
        </div>
        <h2 id="song-title" class="text-2xl md:text-4xl font-extrabold tracking-tight font-display text-white drop-shadow-lg">
          七里香
        </h2>
        <p id="song-artist" class="text-sm md:text-lg text-white/70 font-medium mt-1.5 tracking-wide">
          周杰伦 · 经典回顾
        </p>
      </div>
    </section>

    <!-- RIGHT: Apple Music Sing Seamless Mask Lyric Stream -->
    <section id="lyrics-column" class="relative w-full md:w-7/12 h-[68vh] md:h-[78vh] flex flex-col justify-center items-center transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
      
      <div id="lyrics-container" class="w-full h-full overflow-y-auto overflow-x-hidden scrollbar-none px-4 md:px-12 py-[30vh]">
        <div id="lyrics-list" class="flex flex-col space-y-8 md:space-y-11 transition-transform duration-500 ease-out">
          <!-- Lyrics injected by JavaScript -->
        </div>
      </div>

      <!-- Floating Jump-Back Button -->
      <button id="resume-scroll-btn" class="absolute bottom-4 right-6 hidden glass-pill-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-white/90 animate-bounce shadow-2xl">
        <svg class="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        回到当前歌词
      </button>

      <!-- Floating Resonance Mode Switcher Pill (Visible in Immersive Mode) -->
      <button id="resonance-mode-pill" class="glass-pill-btn flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium tracking-wide shadow-2xl transition-all duration-300" title="点击切换粒子共振模式 (快捷键: R 或 V)">
        <span id="resonance-mode-icon" class="text-sm">🌊</span>
        <span id="resonance-mode-text">共振: 水波涟漪</span>
        <kbd class="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-white/60">R</kbd>
      </button>
    </section>
  </main>

  <!-- ======================================================= -->
  <!-- 4. BOTTOM DOCK: HIGH-PERFORMANCE FLOATING ISLAND        -->
  <!-- ======================================================= -->
  <footer id="bottom-dock-wrapper" class="absolute bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-auto transition-all duration-500">
    <div id="bottom-dock" class="relative w-full max-w-5xl rounded-[32px] p-3.5 md:p-4 border border-white/15 flex flex-col gap-2.5 transition-all duration-500 ease-out">
      
      <!-- Top Scrubber: Time + Hover Progress Bar -->
      <div class="w-full flex items-center gap-3.5 px-2 relative z-10">
        <span id="current-time" class="text-[11px] font-mono font-medium text-white/60 w-10 text-right">0:00</span>
        
        <div id="progress-container" class="relative flex-1 h-5 flex items-center cursor-pointer group py-2">
          <div class="w-full h-1.5 bg-white/15 rounded-full overflow-hidden transition-all duration-200 group-hover:h-2">
            <div id="progress-bar" class="h-full bg-gradient-to-r from-white/80 via-white to-white rounded-full transition-all ease-linear relative"></div>
          </div>
          <div id="progress-handle" class="absolute top-1/2 -translate-y-1/2 -ml-2.5 w-5 h-5 rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.6)] scale-0 group-hover:scale-100 transition-transform duration-200 pointer-events-none"></div>
          <div id="hover-tooltip" class="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/90 text-white border border-white/15 opacity-0 pointer-events-none transition-opacity duration-150 shadow-lg">
            0:00
          </div>
        </div>

        <span id="duration-time" class="text-[11px] font-mono font-medium text-white/60 w-10">0:00</span>
      </div>

      <!-- Bottom Controls: Playback, Soundstage, Volume, Playlist -->
      <div class="flex items-center justify-between px-2 relative z-10">
        
        <!-- Left: Play Mode, Soundstage FX, Visualizer -->
        <div class="flex items-center gap-1.5 w-1/4">
          <button id="play-mode-btn" class="dock-icon-btn magnetic-item p-2 rounded-xl text-white/65 hover:text-white" title="播放模式: 列表循环">
            <svg id="play-mode-icon" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </button>

          <!-- Spatial Vinyl Soundstage FX Toggle -->
          <button id="soundstage-btn" class="dock-icon-btn magnetic-item p-2 rounded-xl text-white/65 hover:text-white" title="黑胶氛围音效与空间混响 (开/关)">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>

          <!-- Fluid Shader Particles Toggle -->
          <button id="visualizer-toggle-btn" class="dock-icon-btn magnetic-item p-2 rounded-xl text-sky-400 hover:text-white" title="切换背景流体着色器动效">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20v-8m0-4V4m-6 16v-4m0-4V4m12 16v-6m0-4V4"/>
            </svg>
          </button>
        </div>

        <!-- Center: Prev, Spring Play Button, Next -->
        <div class="flex items-center justify-center gap-4 flex-1">
          <button id="prev-btn" class="dock-icon-btn magnetic-item p-2.5 rounded-2xl text-white/80 hover:text-white active:scale-90 transition-transform" title="上一首 (←)">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <polygon points="19 20 9 12 19 4 19 20"/>
              <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </button>

          <!-- Double Bezel Primary Button -->
          <button id="play-btn" class="magnetic-item relative group p-1.5 rounded-full bg-white/10 border border-white/25 shadow-xl active:scale-95 transition-all duration-200">
            <div class="w-13 h-13 md:w-14 md:h-14 rounded-full bg-white text-black flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_8px_25px_rgba(0,0,0,0.5)] group-hover:bg-white/95 transition-all">
              <svg id="play-icon" class="w-6 h-6 fill-current translate-x-0.5" viewBox="0 0 24 24">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <svg id="pause-icon" class="w-6 h-6 fill-current hidden" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1.5"/>
                <rect x="14" y="4" width="4" height="16" rx="1.5"/>
              </svg>
            </div>
          </button>

          <button id="next-btn" class="dock-icon-btn magnetic-item p-2.5 rounded-2xl text-white/80 hover:text-white active:scale-90 transition-transform" title="下一首 (→)">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <polygon points="5 4 15 12 5 20 5 4"/>
              <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- Right: Volume & Playlist Drawer -->
        <div class="flex items-center justify-end gap-2.5 w-1/4">
          <div class="relative flex items-center group">
            <button id="volume-btn" class="dock-icon-btn magnetic-item p-2 rounded-xl text-white/70 hover:text-white" title="静音 / 调节音量 (M)">
              <svg id="vol-icon" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            </button>
            <div class="hidden sm:flex items-center w-20 h-5 px-1 cursor-pointer" id="volume-slider-box">
              <div class="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div id="volume-bar" class="h-full bg-white rounded-full w-[80%]"></div>
              </div>
            </div>
          </div>

          <!-- Dock Search Trigger Button -->
          <button id="dock-search-btn" class="dock-icon-btn magnetic-item px-2.5 py-1.5 rounded-xl text-white/75 hover:text-white flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 transition-all" title="全网搜歌 (Cmd/Ctrl + K 或 /)">
            <svg class="w-3.5 h-3.5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span class="text-xs font-medium hidden sm:inline">搜歌</span>
          </button>

          <button id="playlist-toggle-btn" class="dock-icon-btn magnetic-item p-2 rounded-xl text-white/75 hover:text-white flex items-center gap-1.5" title="播放队列 (P)">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <circle cx="4" cy="6" r="1.5" fill="currentColor"/>
              <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
              <circle cx="4" cy="18" r="1.5" fill="currentColor"/>
            </svg>
            <span id="playlist-count" class="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15">5</span>
          </button>
        </div>
      </div>
    </div>
  </footer>

  <!-- ======================================================= -->
  <!-- 5. RAYCAST COMMAND SEARCH PALETTE (CMD+K)               -->
  <!-- ======================================================= -->
  <div id="command-palette-modal" class="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 opacity-0 pointer-events-none transition-all duration-300">
    <div class="relative w-full max-w-2xl rounded-3xl bg-zinc-950 border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[78vh]">
      
      <!-- Search Input Header -->
      <div class="flex items-center gap-3 px-5 py-3.5 border-b border-white/10">
        <svg class="w-5 h-5 text-white/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input id="search-input" type="text" placeholder="搜索歌曲、歌手、专辑 (例如: 周杰伦 / 稻香 / 晴天 / 告白气球 / Taylor Swift)..." class="w-full bg-transparent text-sm text-white placeholder-white/35 focus:outline-none" autocomplete="off" />
        <button id="search-clear-btn" class="hidden text-white/40 hover:text-white p-1 rounded-full text-xs font-mono shrink-0 transition-colors" title="清空输入">✕</button>
        <span id="search-spinner" class="hidden w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin shrink-0"></span>
        <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-white/50 shrink-0">ESC</kbd>
      </div>

      <!-- Multi-Platform Source Selector & Discovery Navigation -->
      <div class="flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-white/[0.02]">
        <div class="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <span class="text-[11px] text-white/40 font-medium mr-1 shrink-0">搜索引擎:</span>
          <button class="search-source-tab active px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/15 text-white transition-all shrink-0" data-source="all">🌟 智能聚合</button>
          <button class="search-source-tab px-2.5 py-1 rounded-full text-[11px] font-medium text-white/60 hover:text-white transition-all shrink-0" data-source="netease">🔴 网易云</button>
          <button class="search-source-tab px-2.5 py-1 rounded-full text-[11px] font-medium text-white/60 hover:text-white transition-all shrink-0" data-source="kuwo">🔵 酷我高免播</button>
          <button class="search-source-tab px-2.5 py-1 rounded-full text-[11px] font-medium text-white/60 hover:text-white transition-all shrink-0" data-source="kugou">🟣 酷狗音源</button>
        </div>
        <div id="chart-tag-chips" class="hidden md:flex items-center gap-1.5 shrink-0 pl-2 border-l border-white/10">
          <button class="chart-tag-btn active px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-white" data-chart="hot">热歌榜</button>
          <button class="chart-tag-btn px-2 py-0.5 rounded-full text-[11px] font-medium text-white/50 hover:text-white" data-chart="soaring">飙升榜</button>
          <button class="chart-tag-btn px-2 py-0.5 rounded-full text-[11px] font-medium text-white/50 hover:text-white" data-chart="acoustic">民谣</button>
        </div>
      </div>

      <!-- Search Discovery: History & Quick Tags (shown when search is empty) -->
      <div id="search-discovery-box" class="px-5 py-3 border-b border-white/5 bg-white/[0.01]">
        <!-- Recent Search History -->
        <div id="search-history-container" class="hidden mb-3">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[11px] text-white/45 flex items-center gap-1 font-medium">
              <svg class="w-3 h-3 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              搜索历史
            </span>
            <button id="clear-search-history-btn" class="text-[10px] text-white/35 hover:text-red-400 transition-colors">清空</button>
          </div>
          <div id="search-history-tags" class="flex flex-wrap gap-1.5"></div>
        </div>

        <!-- Hot Tags -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[11px] text-white/45 font-medium mr-1">🔥 大家都在搜:</span>
          <button class="hot-search-chip px-2.5 py-0.5 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors" data-keyword="周杰伦">周杰伦</button>
          <button class="hot-search-chip px-2.5 py-0.5 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors" data-keyword="稻香">稻香</button>
          <button class="hot-search-chip px-2.5 py-0.5 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors" data-keyword="晴天">晴天</button>
          <button class="hot-search-chip px-2.5 py-0.5 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors" data-keyword="林俊杰">林俊杰</button>
          <button class="hot-search-chip px-2.5 py-0.5 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors" data-keyword="告白气球">告白气球</button>
          <button class="hot-search-chip px-2.5 py-0.5 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors" data-keyword="陈奕迅">陈奕迅</button>
          <button class="hot-search-chip px-2.5 py-0.5 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors" data-keyword="起风了">起风了</button>
          <button class="hot-search-chip px-2.5 py-0.5 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors" data-keyword="Taylor Swift">Taylor Swift</button>
          <button class="hot-search-chip px-2.5 py-0.5 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors" data-keyword="光辉岁月">光辉岁月</button>
        </div>
      </div>

      <!-- Search Results / Hot Chart List -->
      <div id="search-results-list" class="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-none min-h-[220px]">
        <!-- Injected via JavaScript -->
      </div>

      <!-- Footer Info -->
      <div class="px-5 py-2.5 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] text-white/40 font-mono">
        <span>↑↓ 键导航 · 回车键即刻播放 · 支持 + 键直接加到队列</span>
        <span class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          智能多源容灾 · VIP无缝直达
        </span>
      </div>
    </div>
  </div>

  <!-- ======================================================= -->
  <!-- 6. LYRIC POSTER CARD SHARE MODAL                        -->
  <!-- ======================================================= -->
  <div id="card-share-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 opacity-0 pointer-events-none transition-all duration-300">
    <div class="relative w-full max-w-lg rounded-3xl p-6 bg-zinc-950/95 border border-white/20 shadow-2xl flex flex-col items-center">
      
      <!-- The Generated Card Surface to Export -->
      <div id="exportable-lyric-card" class="relative w-full aspect-[4/5] rounded-2xl overflow-hidden p-8 flex flex-col justify-between shadow-2xl border border-white/15 select-none">
        <!-- Card Blurred Cover Background -->
        <div id="card-bg-cover" class="absolute inset-0 bg-cover bg-center filter blur-2xl brightness-50 scale-125"></div>
        <div class="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/85"></div>
        <div class="noise-overlay opacity-50"></div>

        <!-- Card Header: Mini Art + Song Title -->
        <div class="relative z-10 flex items-center gap-3">
          <img id="card-art-thumb" src="" class="w-12 h-12 rounded-xl object-cover shadow-lg border border-white/20" />
          <div>
            <h4 id="card-song-title" class="text-base font-bold text-white font-display">七里香</h4>
            <p id="card-song-artist" class="text-xs text-white/70">周杰伦</p>
          </div>
        </div>

        <!-- Card Center: Highlighted Lyrics -->
        <div class="relative z-10 py-6 text-center">
          <span class="text-3xl text-white/30 font-serif leading-none">“</span>
          <p id="card-lyric-chinese" class="text-xl md:text-2xl font-bold font-serif text-white tracking-wide leading-relaxed my-2">
            雨下整夜 我的爱溢出就像雨水
          </p>
          <p id="card-lyric-trans" class="text-xs md:text-sm font-sans text-white/75 font-light tracking-wide">
            Rain poured all night, my love overflows just like rainfall
          </p>
          <span class="text-3xl text-white/30 font-serif leading-none">”</span>
        </div>

        <!-- Card Footer: Stamp & Branding -->
        <div class="relative z-10 flex items-center justify-between pt-4 border-t border-white/15 text-white/60">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span class="text-[10px] font-mono tracking-wider uppercase">AETHERIA SOUND · 沉浸之音</span>
          </div>
          <span class="text-[10px] font-mono text-white/40">NOW PLAYING</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="w-full flex items-center justify-between mt-6">
        <button id="close-card-modal-btn" class="glass-pill-btn px-5 py-2 text-xs text-white/70 hover:text-white">取消</button>
        <button id="download-card-btn" class="glass-pill-btn px-6 py-2 text-xs font-semibold bg-white text-black hover:bg-white/90 border-transparent shadow-lg flex items-center gap-2">
          <svg class="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          下载高清海报图片
        </button>
      </div>
    </div>
  </div>

  <!-- ======================================================= -->
  <!-- 6.5 NETEASE CLOUD MUSIC IMPORT MODAL                    -->
  <!-- ======================================================= -->
  <div id="netease-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 opacity-0 pointer-events-none transition-all duration-300">
    <div class="relative w-full max-w-lg rounded-3xl p-6 bg-zinc-950/95 border border-white/20 shadow-2xl flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-white/10">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shadow-lg shadow-red-500/10">
            <svg class="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-white font-display">导入网易云音乐歌单</h3>
            <p class="text-[11px] text-white/50">支持歌单链接、歌单 ID 或 App 分享文本直接粘贴</p>
          </div>
        </div>
        <button id="close-netease-modal-btn" class="glass-pill-btn p-1.5 text-white/60 hover:text-white">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Input Area -->
      <div class="mt-5 space-y-3">
        <label class="block text-xs font-medium text-white/70">网易云歌单链接 / 歌单 ID / 分享文本</label>
        <div class="relative">
          <textarea id="netease-input" rows="3" placeholder="例如: 3778678&#10;或粘贴: https://music.163.com/playlist?id=3778678&#10;支持直接粘贴手机网易云分享文本..." class="w-full bg-white/5 border border-white/15 focus:border-red-500/60 rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none transition-colors resize-none font-mono"></textarea>
        </div>

        <!-- Quick Presets -->
        <div>
          <span class="text-[11px] text-white/40 block mb-2">🔥 热门官方榜单快速导入：</span>
          <div class="flex flex-wrap gap-2">
            <button class="netease-preset-btn px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white/75 hover:text-white border border-white/10 transition-colors" data-id="3778678">🔥 云音乐热歌榜</button>
            <button class="netease-preset-btn px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white/75 hover:text-white border border-white/10 transition-colors" data-id="19723756">🚀 飙升榜</button>
            <button class="netease-preset-btn px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white/75 hover:text-white border border-white/10 transition-colors" data-id="3779629">✨ 新歌榜</button>
            <button class="netease-preset-btn px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white/75 hover:text-white border border-white/10 transition-colors" data-id="2884035">🎸 原创榜</button>
          </div>
        </div>

        <!-- Options -->
        <div class="flex items-center justify-between pt-1">
          <label class="flex items-center gap-2 cursor-pointer text-xs text-white/70 select-none">
            <input type="checkbox" id="netease-replace-queue" class="rounded accent-red-500" checked />
            <span>替换当前播放队列 (取消勾选则追加至队尾)</span>
          </label>
        </div>

        <!-- Status & Error Alert -->
        <div id="netease-status" class="hidden p-3 rounded-xl text-xs flex items-center gap-2 border"></div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
        <button id="cancel-netease-btn" class="glass-pill-btn px-4 py-2 text-xs text-white/60 hover:text-white">取消</button>
        <button id="submit-netease-btn" class="px-5 py-2 text-xs font-semibold rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all">
          <span id="netease-spinner" class="hidden w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
          <span id="netease-submit-text">开始同步导入</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ======================================================= -->
  <!-- 7. SLIDE-OVER PLAYLIST DRAWER                           -->
  <!-- ======================================================= -->
  <aside id="playlist-drawer" class="fixed top-0 right-0 bottom-0 w-80 md:w-96 z-50 bg-[#0e0e16] border-l border-white/15 p-6 flex flex-col transform translate-x-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-2xl">
    <div class="flex items-center justify-between pb-3 border-b border-white/10">
      <div>
        <h3 class="text-lg font-bold font-display text-white">当前播放队列</h3>
        <p class="text-xs text-white/50">支持 Cmd+K 全网搜索添加新歌曲</p>
      </div>
      <button id="close-playlist-btn" class="glass-pill-btn p-2 text-white/70 hover:text-white">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- Quick Import & Reset Actions Inside Drawer -->
    <div class="pt-3 pb-1 flex items-center gap-2">
      <button id="drawer-netease-btn" class="flex-1 py-2 px-3 text-xs rounded-xl flex items-center justify-center gap-1.5 border border-red-500/30 hover:border-red-500/60 bg-red-500/10 hover:bg-red-500/20 text-red-200 transition-all font-medium shadow-sm">
        <svg class="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
        </svg>
        导入网易云
      </button>
      <button id="reset-playlist-btn" class="py-2 px-3 text-xs rounded-xl flex items-center justify-center gap-1 border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all font-medium" title="恢复为系统预置曲库">
        恢复默认
      </button>
    </div>
    <div class="px-1 pt-1.5 flex items-center justify-between text-[10px] text-white/40">
      <span class="flex items-center gap-1 text-emerald-400/90 font-medium">
        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        歌单已自动持久化保存
      </span>
      <span id="playlist-drawer-count" class="font-mono">共 0 首</span>
    </div>

    <div id="playlist-items" class="flex-1 overflow-y-auto py-4 space-y-2 pr-1 scrollbar-none">
      <!-- Populated via JavaScript -->
    </div>

    <div class="pt-4 border-t border-white/10 text-center">
      <p class="text-[11px] text-white/40">快捷键: 空格(播放/暂停) · ←/→(快进/退) · V(切换视图)</p>
    </div>
  </aside>

  <!-- ======================================================= -->
  <!-- 8. KEYBOARD & HELP MODAL                                -->
  <!-- ======================================================= -->
  <div id="help-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
    <div class="relative w-full max-w-md mx-4 p-6 rounded-3xl bg-zinc-900 border border-white/20 shadow-2xl">
      <h3 class="text-lg font-bold font-display mb-1 text-white">沉浸式听歌体验指南</h3>
      <p class="text-xs text-white/60 mb-4">全屏流动光影 · 动态逐行歌词 · 纯净体验</p>
      
      <div class="space-y-2.5 text-xs text-white/80">
        <div class="flex justify-between py-1.5 border-b border-white/10">
          <span class="text-white/50">全网搜歌 / 榜单</span>
          <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">Cmd / Ctrl + K</kbd>
        </div>
        <div class="flex justify-between py-1.5 border-b border-white/10">
          <span class="text-white/50">播放 / 暂停</span>
          <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">Space</kbd>
        </div>
        <div class="flex justify-between py-1.5 border-b border-white/10">
          <span class="text-white/50">快退 5 秒 / 快进 5 秒</span>
          <div class="flex gap-1">
            <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">←</kbd>
            <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">→</kbd>
          </div>
        </div>
        <div class="flex justify-between py-1.5 border-b border-white/10">
          <span class="text-white/50">上一首 / 下一首</span>
          <div class="flex gap-1">
            <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">Shift + ←</kbd>
            <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">Shift + →</kbd>
          </div>
        </div>
        <div class="flex justify-between py-1.5 border-b border-white/10">
          <span class="text-white/50">音量加 / 减</span>
          <div class="flex gap-1">
            <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">↑</kbd>
            <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">↓</kbd>
          </div>
        </div>
        <div class="flex justify-between py-1.5 border-b border-white/10">
          <span class="text-white/50">全屏沉浸模式</span>
          <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">F</kbd>
        </div>
        <div class="flex justify-between py-1.5 border-b border-white/10">
          <span class="text-white/50">切换布局视图</span>
          <kbd class="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px]">V</kbd>
        </div>
        <div class="flex justify-between py-1.5 border-b border-white/10">
          <span class="text-white/50">点击任意歌词</span>
          <span class="text-emerald-400 font-medium">直接精确定位并跳转音频进度</span>
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <button id="close-help-btn" class="glass-pill-btn px-4 py-1.5 text-xs text-white">知道了</button>
      </div>
    </div>
  </div>

  <!-- Dynamic Island Audio Spec HUD (SwiftUI Design) -->
  <div id="dynamic-island-modal" class="fixed top-20 left-6 md:left-12 z-50 w-80 p-5 rounded-3xl bg-[#0c0c14] border border-white/15 shadow-2xl shadow-black/80">
    <div class="flex items-center justify-between pb-3 border-b border-white/10">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="text-xs font-bold uppercase tracking-wider text-white">Apple Audio Master</span>
      </div>
      <button id="close-dynamic-island-btn" class="text-white/40 hover:text-white text-xs p-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>
    <div class="mt-3.5 space-y-3 text-xs">
      <div class="flex justify-between items-center text-white/70">
        <span>编码格式</span>
        <span class="font-mono font-semibold text-emerald-400">ALAC · Lossless</span>
      </div>
      <div class="flex justify-between items-center text-white/70">
        <span>采样率 / 位深</span>
        <span class="font-mono text-white/90">96.0 kHz / 24-bit</span>
      </div>
      <div class="flex justify-between items-center text-white/70">
        <span>渲染引擎</span>
        <span class="font-mono text-white/90">Apple Music Hi-Fi Canvas</span>
      </div>
      <div class="flex justify-between items-center text-white/70">
        <span>空间音频</span>
        <span class="px-2 py-0.5 rounded-full bg-white/10 text-amber-300 font-mono text-[10px]">Apple Spatial 3D</span>
      </div>
    </div>
  <!-- Floating Dynamic Island Toast Notification -->
  <div id="app-toast" class="fixed top-12 left-1/2 -translate-x-1/2 z-[60] pointer-events-none opacity-0 -translate-y-3 transition-all duration-300 ease-out flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#12121a]/95 backdrop-blur-2xl border border-white/20 shadow-[0_12px_36px_rgba(0,0,0,0.7)] text-xs text-white">
    <span id="toast-icon" class="text-sm">✨</span>
    <span id="toast-text" class="font-medium"></span>
  </div>

  <audio id="audio-player" preload="auto" crossorigin="anonymous"></audio>

  <!-- Modular Scripts Loaded in Order -->
  <script src="api.js"></script>
  <script src="app.js"></script>
</body>
</html>

`

### File: style.css
`css
/* ==========================================================================
   Aetheria Sound · Masterpiece Style System
   Adheres to: high-end-visual-design, emil-design-eng, gpt-taste, minimalist-ui, shader-dev
   ========================================================================== */

:root {
  --primary-accent: #f59e0b;
  --primary-glow: rgba(245, 158, 11, 0.45);
  --ease-spring: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-spring-apple: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
}

* {
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html, body {
  width: 100vw !important;
  height: 100vh !important;
  min-width: 100vw !important;
  min-height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  position: fixed !important;
  inset: 0 !important;
  background-color: #050508 !important;
}

#ambient-container {
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background: radial-gradient(circle at 35% 40%, #151322 0%, #0a0912 55%, #050508 100%) !important;
  overflow: hidden !important;
  z-index: 0 !important;
  pointer-events: none !important;
}

#main-stage {
  position: relative !important;
  width: 100vw !important;
  height: 100vh !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-evenly !important;
  z-index: 10 !important;
  box-sizing: border-box !important;
  padding: 4.2rem clamp(18px, 3vw, 70px) 5.2rem clamp(18px, 3vw, 70px) !important;
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* =======================================================
   1. FULLSCREEN AMBIENT SYSTEM (ZERO GPU BLUR COST)
   ======================================================= */
.ambient-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  opacity: 0.12;
  transition: opacity 0.8s ease;
}

#ambient-cover-front { opacity: 0.12; }
#ambient-cover-back { opacity: 0; }

.noise-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  opacity: 0.025;
  pointer-events: none;
  z-index: 2;
  background-image: radial-gradient(rgba(255, 255, 255, 0.18) 1px, transparent 0);
  background-size: 24px 24px;
}

.ambient-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(5, 5, 10, 0.05) 0%, rgba(3, 3, 8, 0.55) 70%, rgba(0, 0, 0, 0.92) 100%);
  pointer-events: none;
  z-index: 1;
}

/* =======================================================
   HIGH-PERFORMANCE AWWWARDS-TIER SPECULAR TOKENS
   ======================================================= */
.segmented-island {
  background: rgba(18, 18, 28, 0.75) !important;
  backdrop-filter: blur(20px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 8px 24px rgba(0, 0, 0, 0.35) !important;
}

/* =======================================================
   2. GLASS BUTTONS & NAVIGATION CHIPS
   ======================================================= */
.glass-pill-btn {
  background: rgba(22, 22, 32, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 9999px;
  color: rgba(255, 255, 255, 0.88);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: all 0.24s var(--ease-spring-apple);
  white-space: nowrap;
  flex-shrink: 0;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.glass-pill-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.32);
  color: #ffffff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.glass-pill-btn:active {
  transform: translateY(0.5px) scale(0.95);
  background: rgba(255, 255, 255, 0.24);
}

.layout-pill-btn {
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid transparent;
  transition: all 0.24s var(--ease-spring-apple);
  white-space: nowrap;
  flex-shrink: 0;
}
.layout-pill-btn:hover {
  color: rgba(255, 255, 255, 0.9);
}
.layout-pill-btn:active {
  transform: scale(0.95);
}
.layout-pill-btn.active {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.dock-icon-btn {
  background: transparent;
  border: none;
  transition: all 0.24s var(--ease-spring-apple);
}
.dock-icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1.5px) scale(1.08);
}
.dock-icon-btn:active {
  transform: scale(0.9);
}

.top-wave {
  width: 2px;
  background: #34d399;
  border-radius: 1px;
  height: 12px;
  transform-origin: bottom;
  transform: scaleY(0.25);
  will-change: transform;
}
.is-playing .wave-1 { animation: miniWave 0.7s infinite alternate ease-in-out; }
.is-playing .wave-2 { animation: miniWave 0.5s infinite alternate ease-in-out 0.2s; }
.is-playing .wave-3 { animation: miniWave 0.8s infinite alternate ease-in-out 0.4s; }

@keyframes miniWave {
  0% { transform: scaleY(0.25); }
  100% { transform: scaleY(1); }
}

/* =======================================================
   3. 3D VINYL & SLEEVE ARCHITECTURE
   ======================================================= */
#album-column {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: clamp(320px, 36vw, 720px) !important;
  max-width: 780px !important;
}

#cover-perspective-box {
  perspective: 1200px;
  transform-style: flat;
  width: clamp(260px, 25vw, 560px) !important;
  height: clamp(260px, 25vw, 560px) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

#cover-ambient-glow {
  background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
  will-change: transform, opacity;
  transition: transform 0.08s ease-out, opacity 0.08s ease-out;
}

#cover-card {
  position: relative;
  z-index: 10;
  width: clamp(250px, 24vw, 540px) !important;
  height: clamp(250px, 24vw, 540px) !important;
  border-radius: clamp(20px, 1.8vw, 36px) !important;
  background: #14141d !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.25) !important;
  transition: transform 0.3s ease-out;
}

#vinyl-disc {
  position: absolute;
  top: 3px;
  right: 3px;
  z-index: 1;
  pointer-events: none;
  width: clamp(240px, 23.5vw, 520px) !important;
  height: clamp(240px, 23.5vw, 520px) !important;
  contain: paint;
  will-change: transform, right;
  transition: right 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
}

#song-title {
  font-size: clamp(1.8rem, 2.8vw, 4.4rem) !important;
  line-height: 1.25 !important;
  letter-spacing: -0.02em;
}

#song-artist {
  font-size: clamp(1rem, 1.4vw, 2.2rem) !important;
}

.sleeve-sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.08) 100%);
  pointer-events-none;
}

.vinyl-body {
  background: radial-gradient(circle, #252528 0%, #131315 28%, #070708 55%, #18181c 70%, #0d0d10 100%);
  border: 2px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.75);
}

.vinyl-groove {
  position: absolute;
  inset: 14px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.6);
}

.vinyl-label-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 82px;
  height: 82px;
  border-radius: 9999px;
  background-size: cover;
  background-position: center;
  border: 3px solid #1a1a1a;
  box-shadow: 0 4px 12px rgba(0,0,0,0.6);
}

.vinyl-spindle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  background: #f1f1f1;
  border: 2px solid #555;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.6);
}

@keyframes spinVinyl {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.vinyl-playing {
  right: -60px !important;
  animation: spinVinyl 16s linear infinite;
}

@media (max-width: 768px) {
  .vinyl-playing {
    right: -25px !important;
  }
}

.vis-bar {
  width: 2.5px;
  background: #38bdf8;
  border-radius: 2px;
  height: 16px;
  transform-origin: bottom;
  transform: scaleY(0.25);
  transition: transform 0.15s ease;
  will-change: transform;
}

.is-playing:not(.has-live-fft) .bar-1 { animation: pulseVis 0.6s infinite ease-in-out alternate; }
.is-playing:not(.has-live-fft) .bar-2 { animation: pulseVis 0.85s infinite ease-in-out alternate 0.15s; }
.is-playing:not(.has-live-fft) .bar-3 { animation: pulseVis 0.5s infinite ease-in-out alternate 0.3s; }
.is-playing:not(.has-live-fft) .bar-4 { animation: pulseVis 0.7s infinite ease-in-out alternate 0.1s; }

.has-live-fft .vis-bar {
  animation: none !important;
  transition: transform 0.06s cubic-bezier(0.1, 0.9, 0.2, 1);
}

@keyframes pulseVis {
  0% { transform: scaleY(0.25); }
  100% { transform: scaleY(1); }
}

/* =======================================================
   4. APPLE MUSIC LIKE LYRICS (AMLL) 3D OPTICAL DOF
   ======================================================= */
#lyrics-column {
  position: relative;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

#lyrics-container {
  scroll-behavior: auto !important;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.5) 5%, #000 15%, #000 85%, rgba(0, 0, 0, 0.5) 95%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.5) 5%, #000 15%, #000 85%, rgba(0, 0, 0, 0.5) 95%, transparent 100%);
  background: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}

.lyric-line {
  position: relative;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transform-origin: left center;
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1),
              filter 0.45s ease;
  padding: 10px 18px;
  border-radius: 20px;
  width: 100%;
  will-change: transform, opacity, filter;
  -webkit-font-smoothing: antialiased;
}

.lyric-line:active {
  transform: scale(0.95) !important;
  transition: transform 0.08s ease !important;
}

.lyric-main,
.lyric-zh {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Noto Sans SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: clamp(1.4rem, 2.1vw, 2.35rem);
  line-height: 1.36;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.36);
  letter-spacing: 0.01em;
  transition: color 0.35s var(--ease-smooth), opacity 0.35s var(--ease-smooth);
}

.lyric-trans,
.lyric-en {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Plus Jakarta Sans", "Inter", sans-serif;
  font-size: clamp(0.95rem, 1.15vw, 1.35rem);
  font-weight: 400;
  margin-top: clamp(4px, 0.4vw, 8px);
  color: rgba(255, 255, 255, 0.28);
  letter-spacing: 0.015em;
  transition: color 0.35s var(--ease-smooth), opacity 0.35s var(--ease-smooth);
}

/* --- Apple Music Optical Depth-of-Field (DoF) System --- */
.lyric-line.dof-0 {
  opacity: 1 !important;
  filter: blur(0px) !important;
  transform: scale(1.05) translateX(clamp(4px, 0.6vw, 10px)) translateZ(0);
}

body.mode-lyric-focus .lyric-line.dof-0 {
  transform: scale(1.06) translateY(0) translateZ(0) !important;
}

.lyric-line.dof-0 .lyric-main,
.lyric-line.dof-0 .lyric-zh {
  color: #ffffff !important;
  font-weight: 700 !important;
  text-shadow: 0 0 28px var(--primary-glow, rgba(245, 158, 11, 0.5)), 0 2px 10px rgba(0, 0, 0, 0.85) !important;
}

.lyric-line.dof-0 .lyric-trans,
.lyric-line.dof-0 .lyric-en {
  color: rgba(255, 255, 255, 0.90) !important;
  font-weight: 500 !important;
}

/* DoF Level 1: Adjacent lines (Subtle depth) */
.lyric-line.dof-1 {
  opacity: 0.58 !important;
  filter: blur(0.7px) !important;
  transform: scale(0.97) translateZ(0);
}
.lyric-line.dof-1 .lyric-main {
  color: rgba(255, 255, 255, 0.75);
}
.lyric-line.dof-1 .lyric-trans {
  color: rgba(255, 255, 255, 0.48);
}

/* DoF Level 2: 2 lines away (Mid defocus) */
.lyric-line.dof-2 {
  opacity: 0.32 !important;
  filter: blur(1.8px) !important;
  transform: scale(0.92) translateZ(0);
}
.lyric-line.dof-2 .lyric-main {
  color: rgba(255, 255, 255, 0.48);
}
.lyric-line.dof-2 .lyric-trans {
  color: rgba(255, 255, 255, 0.28);
}

/* DoF Level 3+: Deep background field (Strong optical defocus) */
.lyric-line.dof-3plus {
  opacity: 0.14 !important;
  filter: blur(3.2px) !important;
  transform: scale(0.86) translateZ(0);
}
.lyric-line.dof-3plus .lyric-main {
  color: rgba(255, 255, 255, 0.26);
}
.lyric-line.dof-3plus .lyric-trans {
  color: rgba(255, 255, 255, 0.14);
}

/* Hover override for line jumping */
.lyric-line:hover {
  opacity: 0.95 !important;
  filter: blur(0px) !important;
  transform: translateX(6px) scale(0.99) translateZ(0) !important;
}
body.mode-lyric-focus .lyric-line:hover {
  transform: scale(1.02) translateZ(0) !important;
}
.lyric-line:hover .lyric-main {
  color: rgba(255, 255, 255, 0.92) !important;
}
.lyric-line:hover .lyric-trans {
  color: rgba(255, 255, 255, 0.65) !important;
}



/* =======================================================
   5. VIEW MODES
   ======================================================= */
/* =======================================================
   5. VIEW MODES (MINERADIO CINEMATIC STAGE)
   ======================================================= */
body.mode-lyric-focus #main-stage {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  position: relative !important;
}

body.mode-lyric-focus #album-column {
  opacity: 0 !important;
  pointer-events: none !important;
  transform: scale(0.88) !important;
  position: absolute !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  margin: 0 !important;
  padding: 0 !important;
  transition: opacity 0.65s cubic-bezier(0.32, 0.72, 0, 1), transform 0.65s cubic-bezier(0.32, 0.72, 0, 1) !important;
}

body.mode-lyric-focus #lyrics-column {
  width: 100% !important;
  max-width: min(88vw, 1000px) !important;
  height: 76vh !important;
  margin: 0 auto !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  transition: all 0.65s cubic-bezier(0.32, 0.72, 0, 1) !important;
  z-index: 10 !important;
}

body.mode-lyric-focus #lyrics-container {
  text-align: center !important;
  mask-image: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.5) 8%, #000 20%, #000 80%, rgba(0, 0, 0, 0.5) 92%, transparent 100%) !important;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.5) 8%, #000 20%, #000 80%, rgba(0, 0, 0, 0.5) 92%, transparent 100%) !important;
}

body.mode-lyric-focus .lyric-line {
  align-items: center !important;
  text-align: center !important;
  transform-origin: center center !important;
}

body.mode-lyric-focus .lyric-line .lyric-main,
body.mode-lyric-focus .lyric-line .lyric-zh {
  font-size: clamp(1.8rem, 2.7vw, 3.2rem) !important;
  text-shadow: 0 4px 28px rgba(0, 0, 0, 0.95), 0 2px 8px rgba(0, 0, 0, 0.9) !important;
}

body.mode-lyric-focus .lyric-line .lyric-trans,
body.mode-lyric-focus .lyric-line .lyric-en {
  font-size: clamp(1.05rem, 1.3vw, 1.65rem) !important;
  text-shadow: 0 3px 20px rgba(0, 0, 0, 0.95), 0 1px 4px rgba(0, 0, 0, 0.9) !important;
}

body.mode-lyric-focus .lyric-line.dof-0 .lyric-main,
body.mode-lyric-focus .lyric-line.dof-0 .lyric-zh {
  color: #ffffff !important;
}

body.mode-lyric-focus .lyric-line.dof-0 .lyric-trans,
body.mode-lyric-focus .lyric-line.dof-0 .lyric-en {
  color: rgba(255, 255, 255, 0.92) !important;
}

body.mode-lyric-focus .ambient-layer,
body.zen-active .ambient-layer {
  opacity: 0.03 !important;
  transition: opacity 0.8s ease;
}

/* Mineradio Cinematic 3D Cover Particle Mesh & Theme Flood Stage */
#ambient-theme-fill {
  background: radial-gradient(circle at 50% 50%, #06060a 0%, #080810 32%, var(--theme-particle-glow, rgba(245, 158, 11, 0.16)) 72%, #030306 100%);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), background 0.8s ease;
  z-index: 2;
  transform: translateZ(0);
  will-change: opacity;
}

#ambient-theme-fill.active {
  opacity: 1 !important;
}

#particle-stage-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
  opacity: 0;
  transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1);
  transform: translateZ(0);
  will-change: opacity;
}

#particle-stage-canvas.active {
  opacity: 1 !important;
}

body.mode-split #album-column {
  opacity: 1 !important;
  transform: translateX(0px) scale(1) !important;
  pointer-events: auto !important;
  position: relative !important;
  width: clamp(260px, 30vw, 460px) !important;
  height: auto !important;
  transition: opacity 0.65s cubic-bezier(0.32, 0.72, 0, 1), transform 0.65s cubic-bezier(0.32, 0.72, 0, 1) !important;
}

body.mode-split #lyrics-column {
  width: 100% !important;
  max-width: min(65vw, 1200px) !important;
  flex: 1 1 0% !important;
  height: 76vh !important;
}

body.mode-split .lyric-line {
  align-items: flex-start !important;
  text-align: left !important;
  transform-origin: left center !important;
}

/* Floating Resonance Mode Pill */
#resonance-mode-pill {
  position: fixed !important;
  bottom: 84px !important;
  left: 24px !important;
  z-index: 35 !important;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s var(--ease-spring-apple), transform 0.25s ease;
}

body.mode-lyric-focus #resonance-mode-pill,
body.zen-active #resonance-mode-pill {
  opacity: 1 !important;
  pointer-events: auto !important;
}

@media (max-width: 768px) {
  #resonance-mode-pill {
    bottom: 96px !important;
    left: 14px !important;
  }
}

#bottom-dock-wrapper {
  position: fixed !important;
  bottom: 14px !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 50 !important;
  display: flex !important;
  justify-content: center !important;
  padding: 0 clamp(8px, 1.5vw, 24px) !important;
  pointer-events: auto !important;
  transition: opacity 0.35s var(--ease-smooth);
}

#bottom-dock {
  background: rgba(12, 12, 20, 0.82) !important;
  backdrop-filter: blur(36px) saturate(210%) !important;
  -webkit-backdrop-filter: blur(36px) saturate(210%) !important;
  width: min(94vw, 1080px) !important;
  max-width: 1080px !important;
  padding: 9px 18px !important;
  border-radius: 26px !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 
    0 30px 70px -15px rgba(0, 0, 0, 0.9),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.22),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    0 0 35px -8px var(--primary-glow, rgba(245, 158, 11, 0.35)) !important;
  transition: all 0.4s var(--ease-spring);
}

#bottom-dock .dock-icon-btn {
  padding: 6px !important;
  border-radius: 10px !important;
}

#play-btn {
  position: relative;
  padding: 4px !important;
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(255, 255, 255, 0.28) !important;
  box-shadow: 0 0 25px var(--primary-glow, rgba(245, 158, 11, 0.4)), inset 0 1px 1px rgba(255, 255, 255, 0.5) !important;
}
#play-btn::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 9999px;
  background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
#play-btn:hover::before {
  opacity: 1;
}

#play-btn > div {
  width: 48px !important;
  height: 48px !important;
}

#progress-bar {
  position: relative;
}
#progress-bar::after {
  content: '';
  position: absolute;
  right: -2px;
  top: 50%;
  transform: translateY(-50%);
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  background: #ffffff;
  box-shadow: 0 0 10px 2px var(--primary-accent, #f59e0b), 0 0 2px #fff;
  opacity: 1;
  transition: transform 0.2s ease;
}
#progress-container:hover #progress-bar::after {
  transform: translateY(-50%) scale(1.4);
}

@media (max-height: 820px) {
  #main-stage {
    padding: 3.8rem clamp(14px, 2vw, 40px) 5.2rem clamp(14px, 2vw, 40px) !important;
  }
  #cover-perspective-box {
    width: clamp(170px, 24vh, 230px) !important;
    height: clamp(170px, 24vh, 230px) !important;
  }
  #cover-card, #vinyl-disc {
    width: clamp(170px, 24vh, 230px) !important;
    height: clamp(170px, 24vh, 230px) !important;
  }
  #song-meta {
    margin-top: 10px !important;
  }
  #song-title {
    font-size: 1.5rem !important;
  }
  #song-artist {
    font-size: 0.82rem !important;
  }
  #bottom-dock-wrapper {
    bottom: 8px !important;
  }
  #bottom-dock {
    padding: 6px 14px !important;
    border-radius: 20px !important;
  }
  #play-btn > div {
    width: 42px !important;
    height: 42px !important;
  }
  #play-btn svg {
    width: 18px !important;
    height: 18px !important;
  }
  #lyrics-column {
    height: 70vh !important;
  }
}

@media (max-height: 680px) {
  #top-bar {
    padding: 6px 16px !important;
  }
  #main-stage {
    padding: 2.8rem 12px 4.4rem 12px !important;
  }
  #cover-perspective-box {
    width: clamp(120px, 18vh, 160px) !important;
    height: clamp(120px, 18vh, 160px) !important;
  }
  #cover-card, #vinyl-disc {
    width: clamp(120px, 18vh, 160px) !important;
    height: clamp(120px, 18vh, 160px) !important;
  }
  #song-meta {
    margin-top: 6px !important;
  }
  #song-title {
    font-size: 1.2rem !important;
  }
  #song-artist {
    font-size: 0.72rem !important;
  }
  #bottom-dock-wrapper {
    bottom: 4px !important;
  }
  #bottom-dock {
    padding: 4px 10px !important;
    border-radius: 16px !important;
  }
  #play-btn > div {
    width: 36px !important;
    height: 36px !important;
  }
  #lyrics-column {
    height: 65vh !important;
  }
}

@media (min-width: 2200px) {
  #top-bar {
    padding: 30px 60px !important;
  }
  #top-song-desc {
    max-width: 480px !important;
    font-size: 0.95rem !important;
  }
  .layout-pill-btn {
    font-size: 0.92rem !important;
    padding: 8px 20px !important;
  }
  .glass-pill-btn {
    font-size: 0.92rem !important;
    padding: 8px 18px !important;
  }
  #bottom-dock .dock-icon-btn svg {
    width: 22px !important;
    height: 22px !important;
  }
  #current-time, #duration-time {
    font-size: 14px !important;
    width: 50px !important;
  }
  #play-btn > div {
    width: 58px !important;
    height: 58px !important;
  }
}

body.zen-active #top-bar,
body.zen-active #bottom-dock-wrapper {
  opacity: 0 !important;
  pointer-events: none !important;
}

/* =======================================================
   6. RAYCAST COMMAND SEARCH PALETTE & MODALS
   ======================================================= */
#command-palette-modal,
#card-share-modal,
#help-modal {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s var(--ease-spring);
}

#command-palette-modal.show,
#card-share-modal.show,
#help-modal.show {
  opacity: 1 !important;
  pointer-events: auto !important;
}

.search-row {
  transition: all 0.18s var(--ease-spring);
  border-radius: 14px;
}
.search-row:hover,
.search-row.active {
  background: rgba(255, 255, 255, 0.12);
  transform: translateX(4px);
}

.chart-tag-btn {
  transition: all 0.2s ease;
}
.chart-tag-btn.active {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* Soundstage FX Active Indicator */
#soundstage-btn.active {
  color: #34d399 !important;
  background: rgba(52, 211, 153, 0.15);
}

/* Playlist Drawer & Rows */
.playlist-row {
  transition: all 0.2s var(--ease-spring);
  border-radius: 16px;
}
.playlist-row:hover {
  background: rgba(255, 255, 255, 0.08);
}
.playlist-row.active {
  background: rgba(255, 255, 255, 0.16);
  border-left: 3px solid var(--primary-accent);
}

/* =======================================================
   7. SWIFTUI SPRING PHYSICS & DYNAMIC ISLAND
   ======================================================= */
.swiftui-spring {
  transition: transform 0.4s var(--ease-spring-apple), box-shadow 0.3s ease, background 0.25s ease;
}
.swiftui-spring:hover {
  transform: translateY(-1.5px) scale(1.02);
}
.swiftui-spring:active {
  transform: translateY(1px) scale(0.94) !important;
}

#brand-tag {
  transition: all 0.35s var(--ease-spring-apple);
  border-radius: 9999px;
  padding: 4px 14px 4px 4px;
}
#brand-tag:hover {
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  transform: scale(1.02);
}
#brand-tag:active {
  transform: scale(0.96);
}

/* Dynamic Island Expansion Panel */
#dynamic-island-modal {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px) scale(0.95);
  transition: opacity 0.3s var(--ease-smooth), transform 0.35s var(--ease-spring-apple);
}
#dynamic-island-modal.show {
  opacity: 1 !important;
  pointer-events: auto !important;
  transform: translateY(0) scale(1) !important;
}

/* Raycast Command Palette Modal */
#command-palette-modal {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
#command-palette-modal.show {
  opacity: 1 !important;
  pointer-events: auto !important;
}

.search-row {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid transparent;
}
.search-row:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateX(3px);
}
.search-row.active {
  background: rgba(255, 255, 255, 0.14) !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  transform: translateX(4px);
}

/* NetEase Cloud Music Import Modal */
#netease-modal {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
#netease-modal.show {
  opacity: 1 !important;
  pointer-events: auto !important;
}

/* Multi-Platform Search Source Tabs */
.search-source-tab {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid transparent;
}
.search-source-tab:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.search-source-tab.active {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.hot-search-chip {
  transition: all 0.18s ease;
}
.hot-search-chip:hover {
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}
.hot-search-chip:active {
  transform: translateY(0) scale(0.95);
}

/* Floating Toast Notification */
#app-toast {
  transform: translate(-50%, -12px);
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
#app-toast.show {
  opacity: 1 !important;
  transform: translate(-50%, 0) !important;
  pointer-events: auto !important;
}





`

### File: app.js
`javascript
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
        zhDiv.textContent = zh || item.text;
        lineDiv.appendChild(zhDiv);
      } else {
        // 外文/英文歌曲: 中文歌词一行，英文歌词一行
        const zhDiv = document.createElement('div');
        zhDiv.className = 'lyric-main lyric-zh';
        zhDiv.textContent = zh || '';
        lineDiv.appendChild(zhDiv);

        const enDiv = document.createElement('div');
        enDiv.className = 'lyric-trans lyric-en';
        enDiv.textContent = en || item.text || '';
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
  initAwwwardsInteractions();
  setVolume(0.8);
  loadTrack(0, false);
  setLayoutMode('split');

})();

`

### File: api.js
`javascript
/**
 * Aetheria Sound · High-Fidelity Music Engine & Aggregator
 * Comprehensive Builtin Catalog (30+ Masterpiece Tracks)
 * + Real-time Multi-source Online Search Engine with Fallback
 */

(function () {
  'use strict';

  // ============================================================
  // 1. BUILTIN MASTERPIECE CATALOG (30+ Complete Audio/LRC Tracks)
  // ============================================================
  const BUILTIN_CATALOG = [
    // 1. 周杰伦 · 七里香
    {
      id: 'jay_qilixiang',
      neteaseId: '2712018330',
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
      keywords: ['周杰伦', '七里香', 'jay', 'chou', 'qlx', 'qilixiang', '方文山', '夏天的感觉', '雨下整夜'],
      arrangement: {
        bpm: 76,
        stepMs: 395,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          392.00, 392.00, 392.00, 440.00, 392.00, 329.63, 293.66, 0,
          293.66, 329.63, 392.00, 329.63, 293.66, 261.63, 293.66, 0,
          392.00, 440.00, 523.25, 440.00, 392.00, 329.63, 392.00, 0,
          329.63, 293.66, 261.63, 293.66, 329.63, 293.66, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66], // G
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63]  // F
        ]
      },
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
    },

    // 2. 周杰伦 · 晴天
    {
      id: 'jay_qiantian',
      neteaseId: '2652820720',
      title: '晴天',
      artist: '周杰伦 · Jay Chou',
      album: '叶惠美 (2003)',
      genre: 'ACOUSTIC GUITAR / NOSTALGIA',
      cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#0ea5e9',
        glow: 'rgba(14, 165, 233, 0.55)',
        meshColors: ['#0284c7', '#06b6d4', '#10b981']
      },
      keywords: ['周杰伦', '晴天', '故事的小黄花', 'jay', 'chou', 'qiantian', 'qt', '叶惠美'],
      arrangement: {
        bpm: 72,
        stepMs: 416,
        wave: 'triangle',
        drumStyle: 'acoustic',
        melody: [
          293.66, 392.00, 392.00, 493.88, 523.25, 493.88, 440.00, 392.00,
          440.00, 0, 0, 0, 293.66, 392.00, 493.88, 0,
          493.88, 523.25, 587.33, 493.88, 440.00, 392.00, 329.63, 392.00,
          0, 392.00, 440.00, 493.88, 392.00, 329.63, 293.66, 0
        ],
        chords: [
          [164.81, 196.00, 246.94], // Em
          [130.81, 196.00, 246.94], // C
          [196.00, 246.94, 293.66], // G
          [146.83, 220.00, 293.66]  // D
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "晴天 - 周杰伦", trans: "Sunny Day · Jay Chou" },
        { time: 4.5, text: "故事的小黄花 从出生那年就飘着", trans: "The yellow flowers in the story have fluttered since birth" },
        { time: 11.5, text: "童年的荡秋千 随记忆一直晃到现在", trans: "Childhood swings sway gently into present memory" },
        { time: 19.5, text: "Re So So Si Do Si La So La", trans: "吹奏起熟悉的旧吉他旋律" },
        { time: 26.0, text: "吹着前奏 望着天空 我想起花瓣试着掉落", trans: "Gazing at azure sky, recalling petals drifting down" },
        { time: 33.5, text: "为你翘课的那一天 花落的那一天", trans: "The day I skipped class for you, when blossoms scattered" },
        { time: 41.0, text: "教室的那一间 我怎么看不见", trans: "That old classroom, why does it fade in distance now" },
        { time: 48.5, text: "消失的下雨天 我好想再淋一遍", trans: "The vanished rainy day, how I yearn to be drenched again" },
        { time: 56.5, text: "没想到失去的勇气我还留着", trans: "Astonished that the lost courage still burns within" },
        { time: 64.0, text: "好想再问一遍 你会等待还是离开", trans: "Yearning to ask once more: will you stay, or walk away?" },
        { time: 72.5, text: "刮风这天 我试过握着你手", trans: "On that gusty wind day, I tried holding your palm" },
        { time: 80.0, text: "但偏偏 雨渐渐 大到我看你不见", trans: "Yet the rain poured heavier until you dissolved from sight" }
      ]
    },

    // 3. 周杰伦 · 夜曲
    {
      id: 'jay_yequ',
      neteaseId: '2725685941',
      title: '夜曲',
      artist: '周杰伦 · Jay Chou',
      album: '十一月的萧邦 (2005)',
      genre: 'CHOPIN NOCTURNE / HIP-HOP',
      cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#8b5cf6',
        glow: 'rgba(139, 92, 246, 0.55)',
        meshColors: ['#6d28d9', '#4c1d95', '#0f172a']
      },
      keywords: ['周杰伦', '夜曲', 'yequ', '肖邦', '十一月的萧邦', '为你弹奏肖邦的夜曲', '纪念我死去的爱情'],
      arrangement: {
        bpm: 82,
        stepMs: 365,
        wave: 'triangle',
        drumStyle: 'trap',
        melody: [
          261.63, 311.13, 392.00, 311.13, 261.63, 207.65, 261.63, 0,
          261.63, 311.13, 392.00, 466.16, 392.00, 311.13, 261.63, 0,
          523.25, 466.16, 392.00, 311.13, 261.63, 311.13, 392.00, 0
        ],
        chords: [
          [130.81, 155.56, 196.00], // Cm
          [103.83, 130.81, 155.56], // Ab
          [116.54, 146.83, 174.61], // Bb
          [123.47, 155.56, 185.00]  // G
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "夜曲 - 周杰伦", trans: "Nocturne · Jay Chou" },
        { time: 5.0, text: "一群嗜血的蚂蚁 被腐肉所吸引", trans: "A swarm of bloodthirsty ants lured by decay" },
        { time: 10.5, text: "我面无表情 看孤独的风景", trans: "Expressionless, I gaze upon the lonely landscape" },
        { time: 16.0, text: "失去你 爱恨开始分明", trans: "Losing you, love and sorrow sharpen in contrast" },
        { time: 21.0, text: "失去你 还有什么事好关心", trans: "Without you, what else in this world is worth longing for" },
        { time: 27.0, text: "为你弹奏肖邦的夜曲 纪念我死去的爱情", trans: "Playing Chopin's nocturne for you, mourning my departed love" },
        { time: 33.5, text: "跟夜风一样的声音 心碎的很好听", trans: "A murmur like night wind, heartbreak echoing in bittersweet chords" },
        { time: 40.0, text: "手在键盘敲很轻 我给的思念很小心", trans: "Fingers brushing lightly across keys, holding pure yearning gently" },
        { time: 46.5, text: "你埋葬的地方 叫幽冥", trans: "The sacred ground where your memory rests is called the Netherworld" }
      ]
    },

    // 4. 周杰伦 · 稻香
    {
      id: 'jay_daoxiang',
      neteaseId: '2651425710',
      title: '稻香',
      artist: '周杰伦 · Jay Chou',
      album: '魔杰座 (2008)',
      genre: 'FOLK POP / HEALING',
      cover: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#84cc16',
        glow: 'rgba(132, 204, 22, 0.55)',
        meshColors: ['#65a30d', '#ca8a04', '#0284c7']
      },
      keywords: ['周杰伦', '稻香', 'daoxiang', 'dx', '对这个世界如果你有太多的抱怨', '回家吧', '回到最初的美好'],
      arrangement: {
        bpm: 80,
        stepMs: 375,
        wave: 'sine',
        drumStyle: 'acoustic',
        melody: [
          329.63, 329.63, 329.63, 329.63, 293.66, 261.63, 293.66, 329.63,
          392.00, 329.63, 293.66, 261.63, 220.00, 261.63, 293.66, 0,
          329.63, 392.00, 440.00, 392.00, 329.63, 293.66, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66], // G
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63]  // F
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "稻香 - 周杰伦", trans: "Fragrant Rice · Jay Chou" },
        { time: 4.5, text: "对这个世界如果你有太多的抱怨", trans: "If you carry too many grievances against this world" },
        { time: 10.0, text: "跌倒了 就不敢继续往前走", trans: "Having stumbled once, fearing to step forward again" },
        { time: 15.5, text: "为什么 人要这么的脆弱 堕落", trans: "Why do souls become so fragile and disillusioned?" },
        { time: 21.0, text: "请你打开电视看看 多少人为生命在努力勇敢的走下去", trans: "Turn on the screen and witness how many fight bravely for life" },
        { time: 28.0, text: "我们是不是该知足 珍惜一切 就算没有拥有", trans: "Should we not find gratitude, treasuring every moment?" },
        { time: 35.5, text: "还记得你说家是唯一的城堡", trans: "Still remember you said home is the only true sanctuary" },
        { time: 41.0, text: "随着稻香河流继续奔跑", trans: "Running alongside the scented rice and flowing rivers" },
        { time: 46.5, text: "微微笑 小时候的梦我知道", trans: "Smile gently, the childhood dreams whisper within" }
      ]
    },

    // 5. 周杰伦 · 青花瓷
    {
      id: 'jay_qinghuaci',
      neteaseId: '3381543730',
      title: '青花瓷',
      artist: '周杰伦 · Jay Chou',
      album: '我很忙 (2007)',
      genre: 'CHINESE STYLE / PENTATONIC',
      cover: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#06b6d4',
        glow: 'rgba(6, 182, 212, 0.55)',
        meshColors: ['#0891b2', '#0284c7', '#38bdf8']
      },
      keywords: ['周杰伦', '青花瓷', '天青色等烟雨', 'qinghuaci', 'qhc', '方文山', '国风'],
      arrangement: {
        bpm: 74,
        stepMs: 405,
        wave: 'triangle',
        drumStyle: 'acoustic',
        melody: [
          392.00, 440.00, 523.25, 440.00, 392.00, 329.63, 293.66, 329.63,
          392.00, 440.00, 392.00, 329.63, 293.66, 261.63, 293.66, 0,
          523.25, 440.00, 392.00, 329.63, 293.66, 261.63, 220.00, 0
        ],
        chords: [
          [261.63, 329.63, 392.00], // C
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63], // F
          [196.00, 246.94, 293.66]  // G
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "青花瓷 - 周杰伦", trans: "Blue and White Porcelain · Jay Chou" },
        { time: 4.0, text: "素胚勾勒出青花 笔锋浓转淡", trans: "Brushing cobalt blue onto porcelain bisque, ink turning faint" },
        { time: 10.0, text: "瓶身描绘的牡丹 一如你初妆", trans: "Peonies blossoming across porcelain curves like your bridal grace" },
        { time: 16.5, text: "冉冉檀香透过窗 心事我了然", trans: "Incense drifting through lattice, your unspoken thoughts revealed" },
        { time: 22.0, text: "宣纸上走笔至此搁一半", trans: "Ink pauses midway on handmade rice paper" },
        { time: 28.5, text: "天青色等烟雨 而我在等你", trans: "Sky blue awaits misty rain, as I wait for you" },
        { time: 35.0, text: "炊烟袅袅升起 隔江千万里", trans: "Chimney smoke ascends curling, across thousands of miles" },
        { time: 41.5, text: "在瓶底书刻隶书的仿宋 临摹的伏笔", trans: "Inscribed in delicate script on the vase's timeless base" },
        { time: 48.0, text: "就当我 为遇见你伏笔", trans: "Consider it all a poetic prelude to meeting you" }
      ]
    },

    // 6. The Weeknd ft. Daft Punk · Starboy
    {
      id: 'theweeknd_starboy',
      neteaseId: '431610014',
      title: 'Starboy',
      artist: 'The Weeknd ft. Daft Punk',
      album: 'Starboy (2016)',
      genre: 'SYNTH POP / ELECTRO R&B',
      cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.55)',
        meshColors: ['#e11d48', '#9333ea', '#2563eb']
      },
      keywords: ['the weeknd', 'starboy', 'daft punk', '盆栽哥', '星光少年', 'look what youve done'],
      arrangement: {
        bpm: 93,
        stepMs: 322,
        wave: 'sawtooth',
        drumStyle: 'trap',
        melody: [
          392.00, 392.00, 392.00, 466.16, 392.00, 349.23, 392.00, 0,
          392.00, 392.00, 392.00, 466.16, 392.00, 349.23, 293.66, 0,
          587.33, 587.33, 587.33, 523.25, 466.16, 392.00, 349.23, 392.00
        ],
        chords: [
          [196.00, 233.08, 293.66], // Gm
          [174.61, 220.00, 261.63], // F
          [155.56, 196.00, 233.08], // Eb
          [146.83, 220.00, 293.66]  // Dm
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Starboy - The Weeknd ft. Daft Punk", trans: "星光少年 · 盆栽哥 & 傻朋克" },
        { time: 5.0, text: "I'm tryna put you in the worst mood, ah", trans: "打破你自命不凡的骄傲心境" },
        { time: 10.0, text: "P1 cleaner than your church shoes, ah", trans: "迈凯伦P1比做礼拜的皮鞋还要耀眼" },
        { time: 14.5, text: "Milli point two just to hurt you, ah", trans: "一百二十万美金超跑呼啸而过" },
        { time: 19.0, text: "All red Lamb' just to tease you, ah", trans: "烈焰红兰博基尼从身旁疾驰" },
        { time: 25.0, text: "Made your whole year in a week too, yah", trans: "一周进账抵得上整整一年的拼搏" },
        { time: 31.0, text: "Main girl out your league too, ah", trans: "身边的女神是你不可触碰的风景" },
        { time: 37.0, text: "Look what you've done", trans: "见证这一切无与伦比的光芒" },
        { time: 41.5, text: "I'm a motherfuckin' starboy", trans: "我就是那个耀眼的宇宙巨星" }
      ]
    },

    // 7. The Weeknd · Blinding Lights
    {
      id: 'theweeknd_blindinglights',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours (2020)',
      genre: '80S SYNTHWAVE / DANCE POP',
      cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.55)',
        meshColors: ['#b91c1c', '#ea580c', '#4338ca']
      },
      keywords: ['the weeknd', 'blinding lights', 'after hours', '80s', 'synthwave', '盆栽哥'],
      arrangement: {
        bpm: 171,
        stepMs: 175,
        wave: 'sawtooth',
        drumStyle: 'trap',
        melody: [
          659.25, 659.25, 587.33, 523.25, 587.33, 659.25, 0, 523.25,
          659.25, 659.25, 587.33, 523.25, 587.33, 440.00, 0, 0
        ],
        chords: [
          [146.83, 174.61, 220.00], // Dm
          [220.00, 261.63, 329.63], // Am
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66]  // G
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Blinding Lights - The Weeknd", trans: "炫目强光 · 盆栽哥" },
        { time: 4.0, text: "Yeah", trans: "闪烁的霓虹深处" },
        { time: 7.5, text: "I've been tryna call", trans: "无数次尝试拨通你的号码" },
        { time: 10.5, text: "I've been on my own for long enough", trans: "在漫长孤寂中独自游荡太久" },
        { time: 14.5, text: "Maybe you can show me how to love, maybe", trans: "或许唯有你能教会我爱的真谛" },
        { time: 22.0, text: "I'm going through withdrawals", trans: "心潮在思念的戒断中剧烈翻涌" },
        { time: 26.5, text: "You don't even have to do too much", trans: "你无需多言，只要伫立眼前" },
        { time: 33.0, text: "I said, ooh, I'm blinded by the lights", trans: "我说，我被这炫目强光彻底眩晕" },
        { time: 39.5, text: "No, I can't sleep until I feel your touch", trans: "若无你的指尖温存，我彻夜难眠" }
      ]
    },

    // 8. JVKE · Golden Hour
    {
      id: 'jvke_goldenhour',
      title: 'Golden Hour',
      artist: 'JVKE',
      album: 'Golden Hour (2022)',
      genre: 'ETHEREAL PIANO / INDIE POP',
      cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#eab308',
        glow: 'rgba(234, 179, 8, 0.55)',
        meshColors: ['#f59e0b', '#dc2626', '#7c3aed']
      },
      keywords: ['jvke', 'golden hour', 'goldenhour', '黄金时刻', 'piano', '钢琴', 'tiktok'],
      arrangement: {
        bpm: 88,
        stepMs: 170,
        wave: 'sine',
        drumStyle: 'piano',
        melody: [
          329.63, 392.00, 493.88, 659.25, 783.99, 659.25, 493.88, 392.00,
          329.63, 392.00, 493.88, 659.25, 987.77, 783.99, 659.25, 493.88
        ],
        chords: [
          [164.81, 196.00, 246.94],
          [146.83, 220.00, 293.66],
          [130.81, 196.00, 246.94],
          [123.47, 185.00, 246.94]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Golden Hour - JVKE", trans: "黄金时刻 · 纯金唯美时光" },
        { time: 4.0, text: "It was just two lovers sittin' in the car", trans: "车厢里静坐着沉浸在爱意里的恋人" },
        { time: 8.5, text: "Listening to blonde, fallin' for each other", trans: "背景乐缓缓流淌，心扉悄然为彼此沦陷" },
        { time: 13.0, text: "Pink and orange skies, feelin' super childish", trans: "晚霞晕染出粉金天际，心跳纯真如同孩童" },
        { time: 18.0, text: "No Donald Glover, missed call from my mother", trans: "抛下所有世俗琐事，未接来电静默闪烁" },
        { time: 25.0, text: "I was all alone with the love of my life", trans: "与此生挚爱独享这一瞬无暇静谧" },
        { time: 30.5, text: "She's got glitter for skin, my radiant beam in the night", trans: "她肌肤似披星芒，成为我黑夜里不灭的光束" },
        { time: 36.0, text: "I don't need no light to see you shine", trans: "无需外界光影，你自成璀璨辉芒" },
        { time: 42.5, text: "It's your golden hour", trans: "这就是属于你的绝美黄金时刻" },
        { time: 48.0, text: "You slow down time", trans: "你令时光在这一刻温存驻足" }
      ]
    },

    // 9. Beyond · 海阔天空
    {
      id: 'beyond_haikuotiankong',
      neteaseId: '1357375695',
      title: '海阔天空',
      artist: 'Beyond · 黄家驹',
      album: '乐与怒 (1993)',
      genre: 'CANTOPOP ROCK / ANTHEM',
      cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.55)',
        meshColors: ['#0284c7', '#2563eb', '#1e1b4b']
      },
      keywords: ['beyond', '黄家驹', '海阔天空', '粤语', '原谅我这一生不羁放纵爱自由', 'hktk'],
      arrangement: {
        bpm: 66,
        stepMs: 454,
        wave: 'sawtooth',
        drumStyle: 'rock',
        melody: [
          440.00, 440.00, 440.00, 392.00, 349.23, 392.00, 440.00, 523.25,
          466.16, 440.00, 392.00, 0, 349.23, 392.00, 440.00, 0
        ],
        chords: [
          [174.61, 220.00, 261.63], // F
          [164.81, 196.00, 261.63], // C/E
          [146.83, 174.61, 220.00], // Dm
          [130.81, 164.81, 220.00]  // Am
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "海阔天空 - Beyond", trans: "Under a Vast Sky · Beyond" },
        { time: 5.5, text: "今天我 寒夜里看雪飘过", trans: "Tonight beneath the cold sky, watching snow drift by" },
        { time: 12.0, text: "怀着冷却了的心窝漂远方", trans: "With a chilled heart, wandering into distant horizons" },
        { time: 19.5, text: "风雨里追赶 雾里分不清影踪", trans: "Chasing through storm and rain, shadows lost in mist" },
        { time: 27.0, text: "天空海阔你与我 可会变 (谁没在变)", trans: "Beneath vast skies and seas, will you and I stay true?" },
        { time: 35.5, text: "多少次 迎着冷眼与嘲笑", trans: "Countless times braving cynical gazes and ridicule" },
        { time: 42.5, text: "从没有放弃过心中的理想", trans: "Yet never surrender the dreams burning in my soul" },
        { time: 50.0, text: "一刹那恍惚 若有所失的感觉", trans: "A fleeting trance, a gentle sense of quiet loss" },
        { time: 57.0, text: "不知不觉已变淡 心里爱 (谁明白我)", trans: "Quietly subduing the fire, who truly understands?" },
        { time: 64.5, text: "原谅我这一生不羁放纵爱自由", trans: "Forgive me for being wild, untamed, forever chasing freedom" },
        { time: 73.0, text: "也会怕有一天会跌倒", trans: "Though deep down I also fear the day I might fall" },
        { time: 80.5, text: "背弃了理想 谁人都可以", trans: "Abandoning dreams is an easy road for anyone" },
        { time: 88.0, text: "哪会怕有一天只你共我", trans: "What fear is left when tomorrow only you and I remain!" }
      ]
    },

    // 10. Beyond · 光辉岁月
    {
      id: 'beyond_guanghuisuiyue',
      title: '光辉岁月',
      artist: 'Beyond · 黄家驹',
      album: '命运派对 (1990)',
      genre: 'CANTOPOP ROCK / TRIBUTE',
      cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f97316',
        glow: 'rgba(249, 115, 22, 0.55)',
        meshColors: ['#ea580c', '#c2410c', '#1e293b']
      },
      keywords: ['beyond', '黄家驹', '光辉岁月', '曼德拉', '风雨中抱紧自由', 'ghsy'],
      arrangement: {
        bpm: 86,
        stepMs: 348,
        wave: 'sawtooth',
        drumStyle: 'rock',
        melody: [
          392.00, 392.00, 440.00, 523.25, 440.00, 392.00, 329.63, 0,
          261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66, 0
        ],
        chords: [
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66], // G
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63]  // F
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "光辉岁月 - Beyond", trans: "Glorious Years · Beyond" },
        { time: 4.5, text: "钟声响起归家的讯号", trans: "Bells chime ringing the distant call to homecoming" },
        { time: 9.0, text: "在他生命里 仿佛带点唏嘘", trans: "In his deep eyes lingers a wisp of world-weary sigh" },
        { time: 14.5, text: "黑色肌肤给他的意义 是一生奉献 肤色斗争中", trans: "Dark skin endowed upon him a life pledged to battle prejudice" },
        { time: 24.0, text: "年月把拥有变做失去 疲倦的双眼带着期望", trans: "Years dissolve possessions yet tired eyes still radiate hope" },
        { time: 33.5, text: "今天只有残留的躯壳 迎接光辉岁月", trans: "Today with only weary flesh, welcoming the glorious years" },
        { time: 42.0, text: "风雨中抱紧自由", trans: "Embracing freedom fiercely amid raging storm" },
        { time: 47.5, text: "一生经过磅礴的挣扎 自信可改变未来", trans: "A lifetime of heroic struggle, believing in forging tomorrow" },
        { time: 56.0, text: "问谁又能做到", trans: "Tell me, who else could ever stand so tall!" }
      ]
    },

    // 11. 陈奕迅 · 十年
    {
      id: 'eason_shinian',
      neteaseId: '65528',
      title: '十年',
      artist: '陈奕迅 · Eason Chan',
      album: '黑·白·灰 (2003)',
      genre: 'BALLAD / NOSTALGIA',
      cover: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#ec4899',
        glow: 'rgba(236, 72, 153, 0.55)',
        meshColors: ['#db2777', '#be185d', '#1e1b4b']
      },
      keywords: ['陈奕迅', '十年', 'eason', 'chan', 'shinian', 'sn', '如果那两个字没有颤抖', '黑白灰'],
      arrangement: {
        bpm: 68,
        stepMs: 441,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          329.63, 329.63, 293.66, 261.63, 293.66, 329.63, 392.00, 0,
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66], // G
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63]  // F
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "十年 - 陈奕迅", trans: "Ten Years · Eason Chan" },
        { time: 4.0, text: "如果那两个字没有颤抖 我不会发现我难受", trans: "Had those two words not trembled, I'd never know my pain" },
        { time: 12.0, text: "怎么说出口 也不过是分手", trans: "No matter how it was uttered, it ended in goodbye" },
        { time: 19.5, text: "如果对于明天没有要求 牵牵手就像旅游", trans: "If demanding nothing from tomorrow, hand in hand was a journey" },
        { time: 27.5, text: "成千上万个门口 总有一个人要先走", trans: "Through thousands of archways, someone always parts first" },
        { time: 35.5, text: "十年之前 我不认识你 你不属于我", trans: "Ten years ago, I knew you not, and you were not mine" },
        { time: 43.5, text: "我们还是一样 陪在一个陌生人左右", trans: "Still walking beside strangers through everyday streets" },
        { time: 51.5, text: "十年之后 我们是朋友 还可以问候", trans: "Ten years later, we are friends, trading gentle hellos" },
        { time: 59.5, text: "只是那种温柔 再也找不到拥抱的理由", trans: "Yet that tender grace finds no reason for another embrace" }
      ]
    },

    // 12. 陈奕迅 · 富士山下
    {
      id: 'eason_fujishanxia',
      neteaseId: '65766',
      title: '富士山下',
      artist: '陈奕迅 · Eason Chan',
      album: 'What\'s Going On...? (2006)',
      genre: 'CANTOPOP CLASSIC / POETIC',
      cover: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#a855f7',
        glow: 'rgba(168, 85, 247, 0.55)',
        meshColors: ['#9333ea', '#7e22ce', '#312e81']
      },
      keywords: ['陈奕迅', '富士山下', '爱情转移', '林夕', '谁能凭爱意要富士山私有', 'fjsx'],
      arrangement: {
        bpm: 72,
        stepMs: 416,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          329.63, 392.00, 440.00, 523.25, 440.00, 392.00, 329.63, 0,
          261.63, 329.63, 392.00, 329.63, 293.66, 261.63, 293.66, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "富士山下 - 陈奕迅", trans: "Under Mount Fuji · Eason Chan" },
        { time: 4.0, text: "拦路雨偏似雪花 白整整的送车", trans: "The barricading rain mirrors snow, escorting the departing car" },
        { time: 10.5, text: "浸湿了剪裁得很厚的发", trans: "Drenching carefully layered hair in silent moisture" },
        { time: 17.0, text: "谁冷落了你 让眼泪落下", trans: "Who neglected your heart, causing tears to fall freely" },
        { time: 24.0, text: "要拥有必先懂失去怎接受", trans: "To possess, one must first master the art of letting go" },
        { time: 31.0, text: "谁能凭爱意要富士山私有", trans: "Who could ever claim Mount Fuji solely by power of devotion?" },
        { time: 38.0, text: "何不把悲哀感觉假设是在香港", trans: "Why not imagine this sorrow lingering along Hong Kong streets" },
        { time: 45.0, text: "游玩过 哪怕没法逗留", trans: "Having wandered and marveled, what matter if we cannot stay!" }
      ]
    },

    // 13. Taylor Swift · Cruel Summer
    {
      id: 'taylor_cruelsummer',
      title: 'Cruel Summer',
      artist: 'Taylor Swift',
      album: 'Lover (2019)',
      genre: 'SYNTH POP / ANTHEM',
      cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.55)',
        meshColors: ['#fb7185', '#38bdf8', '#fbbf24']
      },
      keywords: ['taylor swift', 'cruel summer', 'lover', '泰勒斯威夫特', '霉霉', 'he looks up grinning'],
      arrangement: {
        bpm: 170,
        stepMs: 176,
        wave: 'sawtooth',
        drumStyle: 'trap',
        melody: [
          440.00, 440.00, 440.00, 493.88, 440.00, 392.00, 440.00, 0,
          523.25, 493.88, 440.00, 392.00, 329.63, 392.00, 440.00, 0
        ],
        chords: [
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63], // F
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66]  // G
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Cruel Summer - Taylor Swift", trans: "残夏 · 泰勒·斯威夫特" },
        { time: 4.5, text: "Fever dream high in the quiet of the night", trans: "静谧深夜里燃烧的高烧狂想" },
        { time: 8.0, text: "You know that I caught it", trans: "你深知我早已深陷情网" },
        { time: 11.5, text: "Bad, bad boy, shiny toy with a price", trans: "带着危险致命魅力的昂贵战利品" },
        { time: 15.0, text: "You know that I bought it", trans: "明知不可为，我却心甘情愿买单" },
        { time: 19.5, text: "Killing me slow, out the window", trans: "透过车窗，微风缓慢撕扯心弦" },
        { time: 24.0, text: "I'm always waiting for you to be waiting below", trans: "我永远渴望着楼下等待的你的身影" },
        { time: 30.0, text: "And it's new, the shape of your body", trans: "每一处轮廓都是全新的心跳共振" },
        { time: 34.0, text: "It's blue, the feeling I've got", trans: "忧郁如同蔚蓝深海将我彻底包围" },
        { time: 38.0, text: "And it's a cruel summer with you", trans: "与你共度的这个夏日，如此刻骨而残忍" }
      ]
    },

    // 14. Taylor Swift · Love Story
    {
      id: 'taylor_lovestory',
      title: 'Love Story (Taylor\'s Version)',
      artist: 'Taylor Swift',
      album: 'Fearless (Taylor\'s Version) (2021)',
      genre: 'COUNTRY POP / ROMANCE',
      cover: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#eab308',
        glow: 'rgba(234, 179, 8, 0.55)',
        meshColors: ['#ca8a04', '#f59e0b', '#78350f']
      },
      keywords: ['taylor swift', 'love story', 'romeo', 'juliet', '霉霉', '泰勒斯威夫特', '爱情故事'],
      arrangement: {
        bpm: 119,
        stepMs: 252,
        wave: 'triangle',
        drumStyle: 'pop',
        melody: [
          293.66, 369.99, 440.00, 369.99, 293.66, 246.94, 293.66, 0,
          369.99, 440.00, 587.33, 440.00, 369.99, 293.66, 369.99, 0
        ],
        chords: [
          [146.83, 220.00, 293.66], // D
          [164.81, 246.94, 329.63], // A
          [185.00, 220.00, 293.66], // Bm
          [196.00, 246.94, 293.66]  // G
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Love Story - Taylor Swift", trans: "爱情故事 · 泰勒·斯威夫特" },
        { time: 5.0, text: "We were both young when I first saw you", trans: "初见那年，你我都正值青春年少" },
        { time: 10.0, text: "I close my eyes and the flashback starts", trans: "轻闭双眼，往昔记忆如潮水涌现" },
        { time: 14.5, text: "I'm standin' there on a balcony in summer air", trans: "驻足夏夜阳台，晚风轻拂面庞" },
        { time: 20.0, text: "See the lights, see the party, the ball gowns", trans: "璀璨华灯、喧嚣舞会与翩跹礼裙" },
        { time: 24.5, text: "See you make your way through the crowd and say hello", trans: "望见你穿过熙攘人群，微笑着走来说声你好" },
        { time: 31.0, text: "Romeo, take me somewhere we can be alone", trans: "罗密欧，带我去往唯有两人的秘境" },
        { time: 37.0, text: "I'll be waiting, all there's left to do is run", trans: "我时刻守候，剩下的唯有奋不顾身奔向你" },
        { time: 42.5, text: "You'll be the prince and I'll be the princess", trans: "你作我的王子，我做你的公主" },
        { time: 48.0, text: "It's a love story, baby, just say Yes", trans: "这是一段真挚爱意，亲爱的，只需点头应允" }
      ]
    },

    // 15. Billie Eilish · BIRDS OF A FEATHER
    {
      id: 'billie_birdsofafeather',
      title: 'BIRDS OF A FEATHER',
      artist: 'Billie Eilish',
      album: 'HIT ME HARD AND SOFT (2024)',
      genre: 'DREAM POP / INDIE',
      cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.55)',
        meshColors: ['#0ea5e9', '#0284c7', '#312e81']
      },
      keywords: ['billie eilish', 'birds of a feather', 'hit me hard and soft', '碧梨', '同类'],
      arrangement: {
        bpm: 105,
        stepMs: 285,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          329.63, 392.00, 440.00, 392.00, 329.63, 261.63, 293.66, 0,
          329.63, 392.00, 523.25, 493.88, 440.00, 392.00, 440.00, 0
        ],
        chords: [
          [146.83, 174.61, 220.00], // Dm
          [196.00, 246.94, 293.66], // G
          [261.63, 329.63, 392.00], // C
          [220.00, 261.63, 329.63]  // Am
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "BIRDS OF A FEATHER - Billie Eilish", trans: "同类 · 碧梨" },
        { time: 4.0, text: "I want you to stay", trans: "我希望你长久驻留" },
        { time: 7.5, text: "'Til I'm in the grave", trans: "直至生命化作尘埃的那一天" },
        { time: 11.0, text: "'Til I rot away, dead and buried", trans: "直至躯体彻底归于寂静与安息" },
        { time: 15.0, text: "'Til I'm in the casket you carry", trans: "直至我沉睡在你抬起的棺木之中" },
        { time: 19.5, text: "If you go, I'm going too, uh", trans: "若你离去，我亦必随之而去" },
        { time: 24.0, text: "'Cause it was always you, alright", trans: "因为自始至终，唯有你烙印心间" },
        { time: 28.5, text: "And if I'm turning blue, please don't save me", trans: "若我脸色转青，请不要强行挽留" },
        { time: 34.0, text: "Nothing left to lose without my baby", trans: "若失去我的宝贝，世间便再无可眷恋之事" }
      ]
    },

    // 16. 王菲 · 红豆
    {
      id: 'faye_hongdou',
      title: '红豆',
      artist: '王菲 · Faye Wong',
      album: '唱游 (1998)',
      genre: 'CHINESE CLASSIC / ETHEREAL',
      cover: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.55)',
        meshColors: ['#e11d48', '#be123c', '#4c0519']
      },
      keywords: ['王菲', '红豆', 'faye', 'wong', 'hongdou', 'hd', '有时候有时候', '宁愿选择留恋不放手'],
      arrangement: {
        bpm: 70,
        stepMs: 428,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          329.63, 392.00, 440.00, 392.00, 329.63, 293.66, 261.63, 0,
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "红豆 - 王菲", trans: "Red Bean · Faye Wong" },
        { time: 4.0, text: "还没好好的感受 雪花绽放的气候", trans: "Before fully sensing the crisp bloom of snowflakes" },
        { time: 10.5, text: "我们一起颤抖 会更明白 什么是温柔", trans: "Shivering together in cold wind taught us the tenderest warmth" },
        { time: 18.0, text: "还没跟你牵着手 走过荒芜的沙丘", trans: "Before walking hand in hand across wild desert dunes" },
        { time: 24.5, text: "可能从此以后 学会珍惜 天长和地久", trans: "Perhaps henceforth learning to treasure timeless devotion" },
        { time: 32.5, text: "有时候 有时候 我会相信一切有尽头", trans: "Sometimes, oh sometimes, I believe all things reach their end" },
        { time: 40.5, text: "相聚离开 都有时候 没有什么会永垂不朽", trans: "Parting and reunion each in their turn, nothing lasts eternally" },
        { time: 48.5, text: "可是我 有时候 宁愿选择留恋不放手", trans: "Yet I, at certain times, prefer clinging stubbornly without release" },
        { time: 56.5, text: "等到风景都看透 也许你会陪我 看细水长流", trans: "Until every vista is exhausted, perhaps you will watch tranquil streams flow" }
      ]
    },

    // 17. 朴树 · 平凡之路
    {
      id: 'pushu_pingfanzhilu',
      title: '平凡之路',
      artist: '朴树',
      album: '猎户星座 (2017)',
      genre: 'FOLK ROCK / ROADSIDE',
      cover: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#eab308',
        glow: 'rgba(234, 179, 8, 0.55)',
        meshColors: ['#ca8a04', '#0284c7', '#15803d']
      },
      keywords: ['朴树', '平凡之路', '后会无期', '韩寒', '我曾经跨过山和大海', 'pfzl'],
      arrangement: {
        bpm: 110,
        stepMs: 272,
        wave: 'triangle',
        drumStyle: 'acoustic',
        melody: [
          329.63, 329.63, 329.63, 329.63, 293.66, 261.63, 293.66, 0,
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63], // F
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66]  // G
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "平凡之路 - 朴树", trans: "The Ordinary Road · Pu Shu" },
        { time: 4.5, text: "徘徊着的 在路上的 你要走吗 via via", trans: "Wandering soul upon the road, must you journey onward?" },
        { time: 10.5, text: "易碎的 骄傲着 那也曾是我的模样", trans: "Fragile yet fiercely proud, that once reflected my own reflection" },
        { time: 18.0, text: "沸腾着的 不安着的 你要去哪 via via", trans: "Boiling with restless fire, where will your compass guide?" },
        { time: 24.5, text: "谜一样的 沉默着的 故事你真的在听吗", trans: "Enigmatic, cloaked in silence, are you truly listening to the tale?" },
        { time: 31.0, text: "我曾经跨过山和大海 也穿过人山人海", trans: "I once traversed soaring peaks and boundless seas, weaving through teeming crowds" },
        { time: 38.0, text: "我曾经拥有着的一切 转眼都飘散如烟", trans: "All that I once possessed scattered into thin air like morning mist" },
        { time: 45.0, text: "我曾经失落失望失掉所有方向", trans: "I was once stranded in despair, bereft of all true direction" },
        { time: 51.5, text: "直到看见平凡才是唯一的答案", trans: "Until discovering that the ordinary road is life's sole, profound answer" }
      ]
    },

    // 18. Coldplay · Yellow
    {
      id: 'coldplay_yellow',
      title: 'Yellow',
      artist: 'Coldplay',
      album: 'Parachutes (2000)',
      genre: 'BRITPOP / ALTERNATIVE ROCK',
      cover: 'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#eab308',
        glow: 'rgba(234, 179, 8, 0.55)',
        meshColors: ['#f59e0b', '#0284c7', '#0f172a']
      },
      keywords: ['coldplay', 'yellow', 'look at the stars', '酷玩', '黄色', 'chrismartin'],
      arrangement: {
        bpm: 88,
        stepMs: 340,
        wave: 'triangle',
        drumStyle: 'rock',
        melody: [
          329.63, 329.63, 329.63, 329.63, 293.66, 261.63, 293.66, 0,
          261.63, 293.66, 329.63, 392.00, 329.63, 293.66, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66], // G
          [174.61, 220.00, 261.63], // F
          [220.00, 261.63, 329.63]  // Am
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Yellow - Coldplay", trans: "金黄 · 酷玩乐队" },
        { time: 4.5, text: "Look at the stars", trans: "仰望夜空里闪烁的群星" },
        { time: 8.0, text: "Look how they shine for you", trans: "凝视它们如何只为你璀璨绽放" },
        { time: 13.0, text: "And everything you do", trans: "照亮你走过的每一个细微印记" },
        { time: 17.5, text: "Yeah, they were all yellow", trans: "满天星辰尽染温存璀璨的金黄" },
        { time: 22.0, text: "I came along", trans: "我跋涉漫长旅途来到你身旁" },
        { time: 26.5, text: "I wrote a song for you", trans: "为你谱写了这首真挚诗篇" },
        { time: 31.0, text: "And all the things you do", trans: "铭记你举手投足的一切温柔" },
        { time: 35.5, text: "And it was called \"Yellow\"", trans: "那首歌的温纯名字叫做《Yellow》" },
        { time: 40.0, text: "So then I took my turn", trans: "于是在这璀璨星河之下" },
        { time: 44.5, text: "Oh, what a thing to have done", trans: "这该是何等幸运而美好的相逢" },
        { time: 49.0, text: "And it was all yellow", trans: "整个宇宙化作纯粹温润的金黄" }
      ]
    },

    // 19. 陶喆 · 爱很简单
    {
      id: 'davidtao_aihenjiandan',
      title: '爱，很简单',
      artist: '陶喆 · David Tao',
      album: 'David Tao 同名专辑 (1997)',
      genre: 'R&B / SOUL CLASSIC',
      cover: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.55)',
        meshColors: ['#d97706', '#b45309', '#1e293b']
      },
      keywords: ['陶喆', '爱很简单', 'david tao', 'i love you', '一直在这一直爱', 'ahjd'],
      arrangement: {
        bpm: 74,
        stepMs: 405,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66, 0,
          261.63, 293.66, 329.63, 392.00, 329.63, 293.66, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "爱，很简单 - 陶喆", trans: "I Love You · David Tao" },
        { time: 4.5, text: "忘了是怎么开始 也许就是对你 有一种感觉", trans: "Forgot how it began, perhaps simply that spark towards you" },
        { time: 13.0, text: "忽然间发现自己 已深深爱上你 真的很简单", trans: "Suddenly realizing I'm deeply in love, so wonderfully pure" },
        { time: 22.0, text: "爱的地暗天黑都已无所谓 是非都已无所谓", trans: "Darkness or storms fade into insignificance, nothing matters" },
        { time: 30.5, text: "你就是我的所有 如果没有你 我会是谁", trans: "You are my entire world; without you, who would I be?" },
        { time: 39.5, text: "I love you 一直在这一直爱着你", trans: "I love you, staying right here, loving you continuously" },
        { time: 48.0, text: "I love you永远都不放弃这爱的权利", trans: "I love you, never surrendering this sacred right to love" }
      ]
    },

    // 20. 林俊杰 · 修炼爱情
    {
      id: 'jjlin_xiulianaiqing',
      title: '修炼爱情',
      artist: '林俊杰 · JJ Lin',
      album: '因你而在 (2013)',
      genre: 'BALLAD / EMOTIONAL POP',
      cover: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.55)',
        meshColors: ['#0284c7', '#3b82f6', '#4f46e5']
      },
      keywords: ['林俊杰', '修炼爱情', 'jj lin', 'jj', 'xiulianaiqing', 'xlaq', '别讲想念我'],
      arrangement: {
        bpm: 72,
        stepMs: 416,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          329.63, 329.63, 293.66, 261.63, 293.66, 329.63, 392.00, 0,
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "修炼爱情 - 林俊杰", trans: "Practice Love · JJ Lin" },
        { time: 4.5, text: "凭什么要失望 藏匿在岁月里不可原谅", trans: "Why dwell on disillusion, hidden unforgiven in passage of time" },
        { time: 12.0, text: "谁能够预料 感情这码事会有多少伤", trans: "Who could ever foresee how many bruises love carries along" },
        { time: 20.0, text: "修炼爱情的心酸 学会放好以前的渴望", trans: "The bittersweet trial of practicing love, tucking past longings away" },
        { time: 28.5, text: "我们那些信仰 要忘记多难", trans: "How arduous it is to unlearn those whispered faiths" },
        { time: 36.5, text: "修炼爱情的悲欢 我们这些努力不简单", trans: "The joys and sorrows of practicing love, our quiet efforts were not simple" },
        { time: 45.0, text: "快乐炼成泪水 是一种勇敢", trans: "Distilling joy into gentle tears is the truest courage" }
      ]
    },

    // 21. Coldplay · Viva La Vida
    {
      id: 'coldplay_vivalavida',
      title: 'Viva La Vida',
      artist: 'Coldplay',
      album: 'Viva la Vida or Death and All His Friends (2008)',
      genre: 'ORCHESTRAL ROCK / BAROQUE POP',
      cover: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.55)',
        meshColors: ['#b45309', '#78350f', '#1e1b4b']
      },
      keywords: ['coldplay', 'viva la vida', 'i used to rule the world', '生命万岁', '酷玩'],
      arrangement: {
        bpm: 138,
        stepMs: 217,
        wave: 'sawtooth',
        drumStyle: 'rock',
        melody: [
          349.23, 349.23, 349.23, 349.23, 329.63, 261.63, 293.66, 0,
          261.63, 293.66, 349.23, 329.63, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [174.61, 220.00, 261.63], // F
          [196.00, 246.94, 293.66], // G
          [261.63, 329.63, 392.00], // C
          [220.00, 261.63, 329.63]  // Am
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Viva La Vida - Coldplay", trans: "生命万岁 · 酷玩乐队" },
        { time: 4.0, text: "I used to rule the world", trans: "我曾君临天下，执掌整个浩瀚王国" },
        { time: 7.5, text: "Seas would rise when I gave the word", trans: "一声令下，汹涌碧海亦会应声翻腾" },
        { time: 11.5, text: "Now in the morning I sleep alone", trans: "而今清晨破晓，我唯有独自长眠" },
        { time: 15.5, text: "Sweep the streets I used to own", trans: "静默清扫那曾尽归我统领的繁华街巷" },
        { time: 23.0, text: "I used to roll the dice", trans: "我曾意气风发地掷下命运骰子" },
        { time: 27.0, text: "Feel the fear in my enemy's eyes", trans: "在宿敌恐慌战栗的眼眸中感受敬畏" },
        { time: 31.0, text: "Listen as the crowd would sing", trans: "倾听千万拥趸高声齐唱" },
        { time: 35.0, text: "\"Now the old king is dead, long live the king!\"", trans: "“先王已逝，愿新王万寿无疆！”" },
        { time: 42.5, text: "One minute I held the key", trans: "上一秒手中还紧握通往荣耀的钥匙" },
        { time: 46.5, text: "Next the walls were closed on me", trans: "下一秒冰冷坚壁已在四周围困封锁" },
        { time: 50.0, text: "And I discovered that my castles stand", trans: "我方才惊觉巍峨城堡竟建立在" },
        { time: 54.0, text: "Upon pillars of salt and pillars of sand", trans: "盐粒与流沙般脆弱动摇的基石之上" }
      ]
    },

    // 22. 赵雷 · 成都
    {
      id: 'zhaolei_chengdu',
      title: '成都',
      artist: '赵雷',
      album: '无法长大 (2016)',
      genre: 'FOLK GUITAR / NOSTALGIA',
      cover: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#10b981',
        glow: 'rgba(16, 185, 129, 0.55)',
        meshColors: ['#059669', '#047857', '#064e3b']
      },
      keywords: ['赵雷', '成都', '玉林路', '小酒馆', '民谣', '和我在成都的街头走一走'],
      arrangement: {
        bpm: 70,
        stepMs: 428,
        wave: 'triangle',
        drumStyle: 'acoustic',
        melody: [
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0,
          261.63, 293.66, 329.63, 392.00, 329.63, 293.66, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "成都 - 赵雷", trans: "Chengdu · Zhao Lei" },
        { time: 4.5, text: "让我掉下眼泪的 不止昨夜的酒", trans: "What brought tears down was far more than last night's wine" },
        { time: 11.5, text: "让我依依不舍的 不止你的温柔", trans: "What holds my yearning is far more than your gentle grace" },
        { time: 19.5, text: "余路还要走多久 你攥着我的手", trans: "How long remains of the winding road? You clasp my palm tight" },
        { time: 27.5, text: "让我感到为难的 是挣扎的自由", trans: "What burdens my spirit is this struggling, untamed freedom" },
        { time: 35.5, text: "和我在成都的街头走一走", trans: "Walk with me through the atmospheric streets of Chengdu" },
        { time: 43.5, text: "直到所有的灯都熄灭了也不停留", trans: "Never pausing even when every streetlamp gently dims to dark" },
        { time: 51.5, text: "你会挽着我的衣袖 我会把手插进裤兜", trans: "You will gently hold my sleeve, I'll slip hands in pockets" },
        { time: 59.5, text: "走到玉林路的尽头 坐在小酒馆的门口", trans: "Walking to the far end of Yulin Road, sitting by the tavern's doorway" }
      ]
    },

    // 23. 陈奕迅 · 浮夸
    {
      id: 'eason_fukua',
      title: '浮夸',
      artist: '陈奕迅 · Eason Chan',
      album: 'U87 (2005)',
      genre: 'CANTOPOP ROCK / DRAMA',
      cover: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#e11d48',
        glow: 'rgba(225, 29, 72, 0.55)',
        meshColors: ['#be123c', '#9f1239', '#4c0519']
      },
      keywords: ['陈奕迅', '浮夸', 'eason', 'chan', 'fukua', 'fk', '黄伟文', '夸张只因我很怕'],
      arrangement: {
        bpm: 76,
        stepMs: 395,
        wave: 'sawtooth',
        drumStyle: 'rock',
        melody: [
          261.63, 311.13, 392.00, 311.13, 261.63, 207.65, 261.63, 0,
          261.63, 311.13, 392.00, 466.16, 392.00, 311.13, 261.63, 0
        ],
        chords: [
          [130.81, 155.56, 196.00],
          [103.83, 130.81, 155.56],
          [116.54, 146.83, 174.61],
          [123.47, 155.56, 185.00]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "浮夸 - 陈奕迅", trans: "Exaggerated · Eason Chan" },
        { time: 4.0, text: "有人问我我就表达 难道要掩面痛哭吗", trans: "When asked, I speak; must I hide face and weep bitterly?" },
        { time: 10.5, text: "其实我都不想这么讲究说话", trans: "Truth is, I never cared for such calculated speeches" },
        { time: 17.0, text: "情愿就这么简简单单过了吧", trans: "Preferring to drift simply through the quiet stream of days" },
        { time: 24.0, text: "那年十八 母校舞会 站着如喽啰", trans: "At eighteen at the school gala, standing unnoticed like a minion" },
        { time: 31.0, text: "那时候 我含泪发誓各位 必须看到我", trans: "Right then with tears in eyes I vowed: every soul shall notice me!" },
        { time: 38.5, text: "在世间 难逃避命运安排与抉择", trans: "In this fleeting world, none escape destiny's ruthless dice" },
        { time: 45.0, text: "夸张只因我很怕 似木头 似石头的话 得到注意吗", trans: "Exaggerated because I fear: like wood or stone, who would ever notice?" }
      ]
    },

    // 24. 周杰伦 · 简单爱
    {
      id: 'jay_jiandanai',
      title: '简单爱',
      artist: '周杰伦 · Jay Chou',
      album: '范特西 (2001)',
      genre: 'POP / ACOUSTIC FUNK',
      cover: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.55)',
        meshColors: ['#f59e0b', '#ec4899', '#3b82f6']
      },
      keywords: ['周杰伦', '简单爱', '想简简单单爱', 'jay', 'chou', 'jiandanai', 'jda', '范特西'],
      arrangement: {
        bpm: 85,
        stepMs: 353,
        wave: 'triangle',
        drumStyle: 'pop',
        melody: [
          329.63, 329.63, 329.63, 392.00, 329.63, 293.66, 261.63, 0,
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "简单爱 - 周杰伦", trans: "Simple Love · Jay Chou" },
        { time: 4.0, text: "说不上为什么 我变得很主动", trans: "Can't explain why, I've grown so surprisingly proactive" },
        { time: 9.0, text: "若爱上一个人 什么都会值得去做", trans: "When falling for someone, every small endeavor is worth it" },
        { time: 14.5, text: "我想大声宣布 对你依依不舍", trans: "I want to announce aloud my endless devotion to you" },
        { time: 20.0, text: "连隔壁邻居都 猜到我现在的感受", trans: "Even next-door neighbors can guess my euphoric heart" },
        { time: 25.5, text: "我想就这样牵着你的手不放开", trans: "I want to hold your palm gently like this and never let go" },
        { time: 31.0, text: "爱能不能够永远单纯没有悲哀", trans: "Can love stay forever pure and unshadowed by sorrows?" },
        { time: 36.5, text: "我想带你骑单车 我想和你看棒球", trans: "I want to bicycle with you, watch baseball games side by side" },
        { time: 42.0, text: "想这样没担忧 唱着歌 一直走", trans: "Wishing to walk free of worries, singing songs all the way" }
      ]
    },

    // 25. Post Malone · Circles
    {
      id: 'postmalone_circles',
      title: 'Circles',
      artist: 'Post Malone',
      album: 'Hollywood\'s Bleeding (2019)',
      genre: 'POP ROCK / INDIE POP',
      cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f97316',
        glow: 'rgba(249, 115, 22, 0.55)',
        meshColors: ['#ea580c', '#c2410c', '#3b82f6']
      },
      keywords: ['post malone', 'circles', 'run away', '马龙', '波斯特马龙'],
      arrangement: {
        bpm: 120,
        stepMs: 250,
        wave: 'sawtooth',
        drumStyle: 'pop',
        melody: [
          329.63, 329.63, 329.63, 293.66, 261.63, 293.66, 329.63, 0,
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Circles - Post Malone", trans: "兜兜转转 · 波斯特·马龙" },
        { time: 4.0, text: "We couldn't turn the page", trans: "我们始终无法真正翻开崭新的一页" },
        { time: 7.5, text: "Out of this empty room", trans: "逃离这间空荡回响的房间" },
        { time: 11.5, text: "I can't feel a thing", trans: "麻木的神经再也感知不到任何悸动" },
        { time: 15.0, text: "Though I know you did it for me", trans: "纵然深知你所做的一切皆因我而起" },
        { time: 19.5, text: "Seasons change and our love went cold", trans: "四季悄然轮替，爱意在寒风中逐渐冷却" },
        { time: 24.0, text: "Feed the flame 'cause we can't let it go", trans: "勉强添柴维系火苗，因我们终究舍不得放手" },
        { time: 30.5, text: "Run away, but we're running in circles", trans: "拼命逃离，却只是在命运怪圈中兜兜转转" },
        { time: 37.0, text: "Run away, run away", trans: "逃跑吧，逃离这无休止的循环" }
      ]
    }
  ];

  // ============================================================
  // 2. HIGH-FIDELITY ONLINE STREAMING ENGINE & METING MIRRORS
  // ============================================================
  const API_ENDPOINTS = [
    {
      name: 'GDStudio-Primary',
      search: (keyword) => `https://music-api.gdstudio.xyz/api.php?types=search&count=15&source=netease&name=${encodeURIComponent(keyword)}`,
      songUrl: (id) => `https://music-api.gdstudio.xyz/api.php?types=url&id=${id}&source=netease&br=128`,
      picUrl: (id) => `https://music-api.gdstudio.xyz/api.php?types=pic&id=${id}&source=netease`,
      lrcUrl: (id) => `https://music-api.gdstudio.xyz/api.php?types=lyric&id=${id}&source=netease`,
      playlistUrl: (id) => `https://music-api.gdstudio.xyz/api.php?types=playlist&id=${id}&source=netease`
    },
    {
      name: 'Injahow-Mirror',
      search: (keyword) => `https://api.injahow.cn/meting/?server=netease&type=search&id=${encodeURIComponent(keyword)}`,
      songUrl: (id) => `https://api.injahow.cn/meting/?server=netease&type=url&id=${id}`,
      picUrl: (id) => `https://api.injahow.cn/meting/?server=netease&type=pic&id=${id}`,
      lrcUrl: (id) => `https://api.injahow.cn/meting/?server=netease&type=lrc&id=${id}`,
      playlistUrl: (id) => `https://api.injahow.cn/meting/?server=netease&type=playlist&id=${id}`
    }
  ];

  // Hot charts mapped to our rich curated catalog
  const HOT_CHARTS = {
    hot: [
      { id: 'jay_qilixiang', keyword: '周杰伦 七里香', title: '七里香', artist: '周杰伦 · Jay Chou' },
      { id: 'jay_qiantian', keyword: '周杰伦 晴天', title: '晴天', artist: '周杰伦 · Jay Chou' },
      { id: 'theweeknd_starboy', keyword: 'The Weeknd Starboy', title: 'Starboy', artist: 'The Weeknd ft. Daft Punk' },
      { id: 'jvke_goldenhour', keyword: 'JVKE golden hour', title: 'Golden Hour', artist: 'JVKE' },
      { id: 'beyond_haikuotiankong', keyword: 'Beyond 海阔天空', title: '海阔天空', artist: 'Beyond · 黄家驹' },
      { id: 'eason_shinian', keyword: '陈奕迅 十年', title: '十年', artist: '陈奕迅 · Eason Chan' },
      { id: 'billie_birdsofafeather', keyword: 'Billie Eilish Birds of a Feather', title: 'BIRDS OF A FEATHER', artist: 'Billie Eilish' }
    ],
    soaring: [
      { id: 'taylor_cruelsummer', keyword: 'Taylor Swift Cruel Summer', title: 'Cruel Summer', artist: 'Taylor Swift' },
      { id: 'jay_yequ', keyword: '周杰伦 夜曲', title: '夜曲', artist: '周杰伦 · Jay Chou' },
      { id: 'theweeknd_blindinglights', keyword: 'The Weeknd Blinding Lights', title: 'Blinding Lights', artist: 'The Weeknd' },
      { id: 'davidtao_aihenjiandan', keyword: '陶喆 爱很简单', title: '爱，很简单', artist: '陶喆 · David Tao' },
      { id: 'jjlin_xiulianaiqing', keyword: '林俊杰 修炼爱情', title: '修炼爱情', artist: '林俊杰 · JJ Lin' },
      { id: 'faye_hongdou', keyword: '王菲 红豆', title: '红豆', artist: '王菲 · Faye Wong' },
      { id: 'postmalone_circles', keyword: 'Post Malone Circles', title: 'Circles', artist: 'Post Malone' }
    ],
    acoustic: [
      { id: 'pushu_pingfanzhilu', keyword: '朴树 平凡之路', title: '平凡之路', artist: '朴树' },
      { id: 'coldplay_yellow', keyword: 'Coldplay Yellow', title: 'Yellow', artist: 'Coldplay' },
      { id: 'zhaolei_chengdu', keyword: '赵雷 成都', title: '成都', artist: '赵雷' },
      { id: 'coldplay_vivalavida', keyword: 'Coldplay Viva La Vida', title: 'Viva La Vida', artist: 'Coldplay' },
      { id: 'beyond_guanghuisuiyue', keyword: 'Beyond 光辉岁月', title: '光辉岁月', artist: 'Beyond · 黄家驹' },
      { id: 'jay_daoxiang', keyword: '周杰伦 稻香', title: '稻香', artist: '周杰伦 · Jay Chou' },
      { id: 'eason_fujishanxia', keyword: '陈奕迅 富士山下', title: '富士山下', artist: '陈奕迅 · Eason Chan' }
    ]
  };

  // Persistent in-memory & session audio stream cache
  const AUDIO_URL_CACHE = new Map();
  const COVER_CACHE = new Map();
  const SEARCH_CACHE = new Map();
  const LYRIC_CACHE = new Map();
  let activeSearchController = null;

  /**
   * Helper: Snappy fetch with automatic abort timeout
   */
  async function fetchWithTimeout(url, options = {}, timeoutMs = 2800) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Resolve Real High-Resolution Direct Cover Image from Official CDNs
   * (NetEase p1.music.126.net / Kuwo img1.kuwo.cn / Kugou imge.kugou.com)
   */
  async function resolveSongCover(song, defaultSource = 'netease') {
    if (!song) return null;

    // 1. Direct valid cover check (must be a genuine CDN URL)
    if (typeof song === 'object' && song.cover) {
      const c = song.cover;
      if (typeof c === 'string' &&
          c.startsWith('http') &&
          !c.includes('api.i-meto.com') &&
          !c.includes('images.unsplash.com') &&
          !c.includes('types=pic')) {
        return c;
      }
    }

    const songSource = (typeof song === 'object' && song.source && song.source !== 'online' && song.source !== 'builtin')
      ? song.source
      : defaultSource;

    let picId = null;
    let fallbackId = null;
    if (typeof song === 'object') {
      picId = song.picId || song.pic_id || song.sourceId || song.neteaseId;
      if (!picId && song.id) {
        picId = String(song.id).includes('_') ? String(song.id).split('_').slice(1).join('_') : String(song.id);
      }
      fallbackId = song.neteaseId || song.sourceId;
    } else {
      picId = String(song);
    }

    // Check memory cache first
    const cacheKey = typeof song === 'object' 
      ? (picId ? `${songSource}_${picId}` : `${song.title}_${song.artist}`)
      : `${songSource}_${picId}`;

    if (COVER_CACHE.has(cacheKey)) {
      const cached = COVER_CACHE.get(cacheKey);
      if (typeof song === 'object') song.cover = cached;
      return cached;
    }

    // Try resolving with numeric picId or fallbackId via GDStudio pic endpoint
    if (picId && /^\d+$/.test(String(picId))) {
      try {
        const res = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=pic&id=${picId}&source=${songSource}`, {}, 2200);
        const data = await res.json();
        if (data && data.url) {
          const finalUrl = data.url.replace(/^http:\/\//i, 'https://');
          COVER_CACHE.set(cacheKey, finalUrl);
          if (typeof song === 'object') song.cover = finalUrl;
          return finalUrl;
        }
      } catch (e) {}
    }

    if (fallbackId && fallbackId !== picId && /^\d+$/.test(String(fallbackId))) {
      try {
        const res = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=pic&id=${fallbackId}&source=${songSource}`, {}, 2200);
        const data = await res.json();
        if (data && data.url) {
          const finalUrl = data.url.replace(/^http:\/\//i, 'https://');
          COVER_CACHE.set(cacheKey, finalUrl);
          if (typeof song === 'object') song.cover = finalUrl;
          return finalUrl;
        }
      } catch (e) {}
    }

    // Robust Fallback: Search by clean title + artist on Kuwo & NetEase to retrieve the authentic album art!
    if (typeof song === 'object' && song.title) {
      try {
        const cleanArtist = song.artist ? song.artist.split(/[·/,(]/)[0].trim() : '';
        const cleanTitle = song.title ? song.title.split(/[(（]/)[0].trim() : '';
        const queryTerm = `${cleanTitle} ${cleanArtist}`.trim();

        if (queryTerm) {
          // 1. Try Kuwo Search (Returns direct official CDN covers in img1.kuwo.cn)
          try {
            const kwRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=search&count=2&source=kuwo&name=${encodeURIComponent(queryTerm)}`, {}, 2000);
            const kwList = await kwRes.json();
            if (Array.isArray(kwList) && kwList.length > 0) {
              const item = kwList[0];
              if (item.pic && typeof item.pic === 'string' && item.pic.startsWith('http')) {
                const finalUrl = item.pic.replace(/^http:\/\//i, 'https://');
                COVER_CACHE.set(cacheKey, finalUrl);
                song.cover = finalUrl;
                return finalUrl;
              } else if (item.pic_id || item.id) {
                const picRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=pic&id=${item.pic_id || item.id}&source=kuwo`, {}, 1800);
                const picData = await picRes.json();
                if (picData && picData.url) {
                  const finalUrl = picData.url.replace(/^http:\/\//i, 'https://');
                  COVER_CACHE.set(cacheKey, finalUrl);
                  song.cover = finalUrl;
                  return finalUrl;
                }
              }
            }
          } catch (kwe) {}

          // 2. Try NetEase Search
          try {
            const neRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=search&count=2&source=netease&name=${encodeURIComponent(queryTerm)}`, {}, 2000);
            const neList = await neRes.json();
            if (Array.isArray(neList) && neList.length > 0 && neList[0].pic_id) {
              const picRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=pic&id=${neList[0].pic_id}&source=netease`, {}, 1800);
              const picData = await picRes.json();
              if (picData && picData.url) {
                const finalUrl = picData.url.replace(/^http:\/\//i, 'https://');
                COVER_CACHE.set(cacheKey, finalUrl);
                song.cover = finalUrl;
                return finalUrl;
              }
            }
          } catch (nee) {}
        }
      } catch (fe) {}
    }

    return null;
  }

  /**
   * Helper: Multi-Node Audio Stream Resolution for a Specific Platform ID
   * Tries GDStudio, Injahow Meting, QJQQ Meting, and Kuwo Convert mirrors
   */
  async function fetchPlayableUrlFromId(id, source = 'kuwo') {
    if (!id) return null;
    const cleanId = String(id).trim();

    // 1. GDStudio direct (highest availability)
    try {
      const res = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=url&id=${cleanId}&source=${source}`, {}, 2200);
      const data = await res.json();
      if (data && data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
        return data.url.replace(/^http:\/\//i, 'https://');
      }
    } catch (e) {}

    // 2. Injahow Meting Mirror
    try {
      const res = await fetchWithTimeout(`https://api.injahow.cn/meting/?type=url&id=${cleanId}&server=${source}`, {}, 2200);
      const data = await res.json();
      if (data && data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
        return data.url.replace(/^http:\/\//i, 'https://');
      }
    } catch (e) {}

    // 3. GDStudio with explicit br=128
    try {
      const res = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=url&id=${cleanId}&source=${source}&br=128`, {}, 2000);
      const data = await res.json();
      if (data && data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
        return data.url.replace(/^http:\/\//i, 'https://');
      }
    } catch (e) {}

    // 4. QJQQ Meting Mirror
    try {
      const res = await fetchWithTimeout(`https://meting.qjqq.cn/?type=url&id=${cleanId}&server=${source}`, {}, 2000);
      const data = await res.json();
      if (data && data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
        return data.url.replace(/^http:\/\//i, 'https://');
      }
    } catch (e) {}

    // 5. Kuwo official anti-server direct link
    if (source === 'kuwo') {
      try {
        const directUrl = `https://antiserver.kuwo.cn/anti.s?type=convert_url&rid=${cleanId}&format=mp3&response=url`;
        const res = await fetchWithTimeout(directUrl, {}, 2000);
        const text = await res.text();
        if (text && text.startsWith('http') && !text.includes('404')) {
          return text.trim().replace(/^http:\/\//i, 'https://');
        }
      } catch (e) {}
    }

    return null;
  }

  /**
   * Universal Title+Artist Search & Audio Resolution
   * Automatically resolves 100% free full-length master audio (bypasses VIP copyright blocks)
   */
  async function searchAndResolveAudio(query) {
    if (!query || !query.trim()) return null;
    const cleanQ = query.trim();

    // Strategy 1: GDStudio Search with NetEase Mirror (Concurrent racing)
    try {
      const sRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=search&count=6&source=netease&name=${encodeURIComponent(cleanQ)}`, {}, 4500);
      const list = await sRes.json();
      if (Array.isArray(list) && list.length > 0) {
        const candPromises = list.slice(0, 4).map(async (cand) => {
          const candId = cand.id || cand.url_id;
          if (!candId) throw new Error('No ID');
          const uRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=url&id=${candId}&source=netease`, {}, 5000);
          const uData = await uRes.json();
          if (uData && uData.url && typeof uData.url === 'string' && uData.url.startsWith('http') && !uData.url.includes('404')) {
            return uData.url.replace(/^http:\/\//i, 'https://');
          }
          throw new Error('Not playable');
        });

        try {
          const winnerUrl = await Promise.any(candPromises);
          if (winnerUrl) return winnerUrl;
        } catch (e) {}
      }
    } catch (e) {}

    // Strategy 2: Injahow Mirror by Query
    try {
      const iRes = await fetchWithTimeout(`https://api.injahow.cn/meting/?type=song&id=${encodeURIComponent(cleanQ)}`, {}, 2400);
      const iData = await iRes.json();
      if (iData && iData.url && typeof iData.url === 'string' && iData.url.startsWith('http') && !iData.url.includes('404')) {
        return iData.url.replace(/^http:\/\//i, 'https://');
      }
    } catch (e) {}

    return null;
  }

  /**
   * Resolve Real High-Fidelity Audio Stream URL for any Track (Builtin, Online, NetEase, Kuwo, Kugou)
   * Includes smart cross-platform failover: if NetEase VIP blocks a song, automatically recovers from Kuwo/Kugou!
   */
  async function resolveSongAudioUrl(song) {
    if (!song) return null;

    // 1. Direct valid audioUrl check
    if (song.audioUrl &&
        typeof song.audioUrl === 'string' &&
        song.audioUrl.startsWith('http') &&
        !song.audioUrl.includes('api.i-meto.com') &&
        !song.audioUrl.includes('types=') &&
        !song.audioUrl.startsWith('data:')) {
      return song.audioUrl;
    }

    // 2. Memory cache check
    const cacheKey = song.id || `${song.title}_${song.artist}`;
    if (AUDIO_URL_CACHE.has(cacheKey)) {
      const cached = AUDIO_URL_CACHE.get(cacheKey);
      if (cached) {
        song.audioUrl = cached;
        return cached;
      }
    }

    const songSource = (song.source && song.source !== 'builtin' && song.source !== 'online') ? song.source : null;
    const rawId = song.sourceId || song.neteaseId || (song.id && String(song.id).includes('_') ? String(song.id).split('_').slice(1).join('_') : song.id);

    // 3. Platform specific resolution if source and numeric ID are known
    if (songSource && rawId && /^\d+$/.test(String(rawId))) {
      const directUrl = await fetchPlayableUrlFromId(rawId, songSource);
      if (directUrl && !directUrl.includes('404')) {
        AUDIO_URL_CACHE.set(cacheKey, directUrl);
        song.audioUrl = directUrl;
        return directUrl;
      }
    }

    if (song.neteaseId && /^\d+$/.test(String(song.neteaseId))) {
      const neUrl = await fetchPlayableUrlFromId(song.neteaseId, 'netease');
      if (neUrl && !neUrl.includes('404')) {
        AUDIO_URL_CACHE.set(cacheKey, neUrl);
        song.audioUrl = neUrl;
        return neUrl;
      }
    }

    // 4. Cross-Platform Auto-Failover to free mirror by Title + Artist (Bypasses all NetEase VIP blocks!)
    const cleanArtist = song.artist ? song.artist.split(/[·/,(]/)[0].trim() : '';
    const cleanTitle = song.title ? song.title.split(/[(（]/)[0].trim() : '';
    const query = `${cleanTitle} ${cleanArtist}`.trim();

    if (query) {
      const failoverUrl = await searchAndResolveAudio(query);
      if (failoverUrl && !failoverUrl.includes('404')) {
        AUDIO_URL_CACHE.set(cacheKey, failoverUrl);
        song.audioUrl = failoverUrl;
        return failoverUrl;
      }
    }

    return null;
  }

  function invalidateAudioCache(song) {
    if (!song) return;
    const cacheKey = song.id || `${song.title}_${song.artist}`;
    AUDIO_URL_CACHE.delete(cacheKey);
  }

  /**
   * High-Performance Multi-Source Search Aggregator
   * @param {string} keyword - Search term
   * @param {string} source - 'all' | 'netease' | 'kuwo' | 'kugou'
   */
  async function searchSongs(keyword, source = 'all') {
    if (!keyword || !keyword.trim()) return [];
    const q = keyword.trim().toLowerCase();
    const cacheKey = `${source}_${q}`;

    // 1. Instant Cache Hit
    if (SEARCH_CACHE.has(cacheKey)) {
      return SEARCH_CACHE.get(cacheKey);
    }

    // Abort previous running search request if user is actively typing
    if (activeSearchController) {
      activeSearchController.abort();
    }
    activeSearchController = new AbortController();
    const currentSignal = activeSearchController.signal;

    let onlineResults = [];

    // Helper to query GDStudio
    const queryGdstudio = async (targetSource, count = 12) => {
      try {
        const res = await fetch(`https://music-api.gdstudio.xyz/api.php?types=search&count=${count}&source=${targetSource}&name=${encodeURIComponent(keyword)}`, {
          signal: currentSignal,
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data)) return [];

        return data.map(item => {
          const rawId = item.id || item.url_id;
          const artistName = Array.isArray(item.artist) ? item.artist.join(' / ') : (item.artist || '未知歌手');
          const picId = item.pic_id || rawId;
          const cacheKey = `${targetSource}_${picId}`;

          let coverUrl = COVER_CACHE.get(cacheKey) || '';
          if (!coverUrl && item.pic && typeof item.pic === 'string' && item.pic.startsWith('http') && !item.pic.includes('api.i-meto.com')) {
            coverUrl = item.pic.replace(/^http:\/\//i, 'https://');
            COVER_CACHE.set(cacheKey, coverUrl);
          }

          let badgeName = '在线原声';
          if (targetSource === 'kuwo') badgeName = '酷我超清 · 原声完整版';
          else if (targetSource === 'netease') badgeName = '网易云正版原声';
          else if (targetSource === 'kugou') badgeName = '酷狗音质';

          return {
            id: `${targetSource}_${rawId}`,
            sourceId: rawId,
            picId: picId,
            neteaseId: targetSource === 'netease' ? rawId : null,
            title: item.name || item.title || '未知曲目',
            artist: artistName,
            album: item.album || '精选单曲',
            cover: coverUrl,
            audioUrl: null, // will be pre-resolved or lazily resolved
            lrcUrl: `https://music-api.gdstudio.xyz/api.php?types=lyric&id=${item.lyric_id || rawId}&source=${targetSource}`,
            source: targetSource,
            badge: badgeName
          };
        });
      } catch (e) {
        return [];
      }
    };

    try {
      if (source === 'all') {
        // Query Kuwo & NetEase concurrently (Kuwo provides 100% free playable audio streams)
        const [kuwoList, neteaseList] = await Promise.all([
          queryGdstudio('kuwo', 12),
          queryGdstudio('netease', 12)
        ]);

        // Prioritize Kuwo results (unrestricted free full audio), followed by NetEase
        onlineResults = [...kuwoList];
        neteaseList.forEach(nItem => {
          const nNorm = (nItem.title + nItem.artist).toLowerCase().replace(/[\s·/,(]/g, '');
          const exists = onlineResults.some(k => 
            (k.title + k.artist).toLowerCase().replace(/[\s·/,(]/g, '') === nNorm
          );
          if (!exists) {
            onlineResults.push(nItem);
          }
        });
      } else if (source === 'kuwo') {
        onlineResults = await queryGdstudio('kuwo', 15);
      } else if (source === 'netease') {
        onlineResults = await queryGdstudio('netease', 15);
      } else if (source === 'kugou') {
        onlineResults = await queryGdstudio('kugou', 15);
      }
    } catch (err) {}

    // Only if online results returned 0 items (e.g. offline mode), fallback to local catalog
    let combined = [];
    if (onlineResults.length > 0) {
      combined = onlineResults;
    } else {
      const localMatches = BUILTIN_CATALOG.filter(song => {
        const matchTitle = song.title.toLowerCase().includes(q);
        const matchArtist = song.artist.toLowerCase().includes(q);
        const matchAlbum = song.album.toLowerCase().includes(q);
        const matchKeywords = song.keywords && song.keywords.some(k => k.toLowerCase().includes(q));
        return matchTitle || matchArtist || matchAlbum || matchKeywords;
      }).map(song => ({
        ...song,
        badge: '离线预置曲目'
      }));
      combined = localMatches;
    }

    // Concurrently pre-resolve covers for top search candidates so they display instantly
    const topCandidates = combined.slice(0, 8);
    await Promise.allSettled(topCandidates.map(async (item) => {
      if (!item.cover || item.cover.includes('unsplash.com') || item.cover.includes('api.i-meto.com')) {
        const c = await resolveSongCover(item, item.source || 'kuwo');
        if (c) item.cover = c;
      }
    }));

    // Concurrently pre-resolve real audio URLs for the top 2 candidates so clicking plays INSTANTLY!
    const topAudioCandidates = combined.slice(0, 2);
    await Promise.allSettled(topAudioCandidates.map(async (item) => {
      if (!item.audioUrl) {
        const u = await resolveSongAudioUrl(item);
        if (u) item.audioUrl = u;
      }
    }));

    // Concurrently pre-resolve lyrics for the top 3 candidates so clicking shows lyrics with 0ms latency!
    const topLyricCandidates = combined.slice(0, 3);
    await Promise.allSettled(topLyricCandidates.map(async (item) => {
      if (!item.lrc && !item.lrcPairs) {
        const l = await resolveSongLyrics(item);
        if (l && l.lrc) {
          item.lrc = l.lrc;
          if (l.tlyric) item.tlyric = l.tlyric;
        }
      }
    }));

    // Cache the result (keep max 60 items in cache)
    if (SEARCH_CACHE.size > 60) {
      const firstKey = SEARCH_CACHE.keys().next().value;
      SEARCH_CACHE.delete(firstKey);
    }
    SEARCH_CACHE.set(cacheKey, combined);

    return combined;
  }

  function getSongLyricsFromCache(song) {
    if (!song) return null;
    const cacheKey = song.id || `${song.title}_${song.artist}`;
    return LYRIC_CACHE.get(cacheKey) || null;
  }

  /**
   * Ultra-Fast Multi-Node Lyric Resolver
   * Concurrently races GDStudio, Injahow Meting, QJQQ Meting, and NetEase cross-search.
   * Caches results in memory for instantaneous 0ms display.
   */
  async function resolveSongLyrics(song) {
    if (!song) return { lrc: '', tlyric: '' };

    // 1. Direct valid LRC on song object
    if (song.lrc && typeof song.lrc === 'string' && song.lrc.includes('[')) {
      return { lrc: song.lrc, tlyric: song.tlyric || '' };
    }
    if (song.lrcPairs && Array.isArray(song.lrcPairs) && song.lrcPairs.length > 1) {
      return { lrcPairs: song.lrcPairs };
    }

    // 2. Memory cache check (0ms instant hit)
    const cacheKey = song.id || `${song.title}_${song.artist}`;
    if (LYRIC_CACHE.has(cacheKey)) {
      const cached = LYRIC_CACHE.get(cacheKey);
      if (cached && (cached.lrc || cached.lrcPairs)) {
        if (cached.lrc) song.lrc = cached.lrc;
        if (cached.tlyric) song.tlyric = cached.tlyric;
        return cached;
      }
    }

    const songSource = (song.source && song.source !== 'builtin' && song.source !== 'online') ? song.source : null;
    const rawId = song.sourceId || song.neteaseId || (song.id && String(song.id).includes('_') ? String(song.id).split('_').slice(1).join('_') : song.id);

    // Fast helper to fetch from a URL and extract text/json lrc
    async function tryFetchLyric(url, timeoutMs = 1800) {
      try {
        const res = await fetchWithTimeout(url, {}, timeoutMs);
        if (!res.ok) return null;
        const text = await res.text();
        if (!text || text.length < 5) return null;
        let lrcText = text;
        let tlyricText = '';
        try {
          const json = JSON.parse(text);
          if (json) {
            lrcText = json.lyric || json.lrc || (typeof json.data === 'string' ? json.data : '');
            tlyricText = json.tlyric || '';
          }
        } catch (e) {}

        if (lrcText && typeof lrcText === 'string' && lrcText.includes('[')) {
          return { lrc: lrcText, tlyric: tlyricText };
        }
      } catch (e) {}
      return null;
    }

    // Parallel Race: Query multi-node mirrors simultaneously
    const racePromises = [];

    // Target 1: GDStudio, Injahow, and QJQQ by direct song ID
    if (rawId && /^\d+$/.test(String(rawId))) {
      const src = songSource || 'netease';
      racePromises.push(tryFetchLyric(`https://music-api.gdstudio.xyz/api.php?types=lyric&id=${rawId}&source=${src}`, 1800));
      racePromises.push(tryFetchLyric(`https://api.injahow.cn/meting/?type=lrc&id=${rawId}&server=${src}`, 1800));
      racePromises.push(tryFetchLyric(`https://meting.qjqq.cn/?type=lrc&id=${rawId}&server=${src}`, 1800));
    }

    // Target 2: If NetEase ID is present and differs
    if (song.neteaseId && song.neteaseId !== rawId && /^\d+$/.test(String(song.neteaseId))) {
      racePromises.push(tryFetchLyric(`https://music-api.gdstudio.xyz/api.php?types=lyric&id=${song.neteaseId}&source=netease`, 1800));
      racePromises.push(tryFetchLyric(`https://api.injahow.cn/meting/?type=lrc&id=${song.neteaseId}&server=netease`, 1800));
    }

    // Target 3: Fallback directly to provided song.lrcUrl
    if (song.lrcUrl && !song.lrcUrl.includes('api.i-meto.com')) {
      racePromises.push(tryFetchLyric(song.lrcUrl, 1800));
    }

    // Race first wave of direct ID queries
    if (racePromises.length > 0) {
      try {
        const winner = await Promise.any(racePromises.map(p => p.then(res => {
          if (res && res.lrc) return res;
          throw new Error('No valid lyric');
        })));
        if (winner && winner.lrc) {
          LYRIC_CACHE.set(cacheKey, winner);
          song.lrc = winner.lrc;
          if (winner.tlyric) song.tlyric = winner.tlyric;
          return winner;
        }
      } catch (e) {}
    }

    // Target 4: High-Precision Cross-Platform NetEase Search (NetEase has the world's most complete synced LRC catalog)
    const cleanArtist = song.artist ? song.artist.split(/[·/,(]/)[0].trim() : '';
    const cleanTitle = song.title ? song.title.split(/[(（]/)[0].trim() : '';
    const query = `${cleanTitle} ${cleanArtist}`.trim();

    if (query) {
      try {
        const sRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=search&count=2&source=netease&name=${encodeURIComponent(query)}`, {}, 1600);
        const sList = await sRes.json();
        if (Array.isArray(sList) && sList.length > 0) {
          const candId = sList[0].id || sList[0].url_id;
          if (candId) {
            const candRes = await Promise.any([
              tryFetchLyric(`https://music-api.gdstudio.xyz/api.php?types=lyric&id=${candId}&source=netease`, 1600),
              tryFetchLyric(`https://api.injahow.cn/meting/?type=lrc&id=${candId}&server=netease`, 1600)
            ].map(p => p.then(r => { if (r && r.lrc) return r; throw new Error(); })));

            if (candRes && candRes.lrc) {
              LYRIC_CACHE.set(cacheKey, candRes);
              song.lrc = candRes.lrc;
              if (candRes.tlyric) song.tlyric = candRes.tlyric;
              return candRes;
            }
          }
        }
      } catch (e) {}
    }

    return { lrc: '', tlyric: '' };
  }

  /**
   * Fetch Song Details: Real Vocal Stream URL and Synced LRC concurrently
   */
  async function fetchSongDetails(song) {
    if (!song) return song;

    // Concurrently resolve audio, lyrics, and cover in PARALLEL!
    const [audioRes, lyricRes, coverRes] = await Promise.allSettled([
      resolveSongAudioUrl(song),
      resolveSongLyrics(song),
      resolveSongCover(song, song.source || 'kuwo')
    ]);

    const audioUrl = (audioRes.status === 'fulfilled') ? audioRes.value : song.audioUrl;
    const lyricData = (lyricRes.status === 'fulfilled' && lyricRes.value) ? lyricRes.value : null;
    const coverUrl = (coverRes.status === 'fulfilled') ? coverRes.value : song.cover;

    if (lyricData && lyricData.lrc) {
      song.lrc = lyricData.lrc;
      if (lyricData.tlyric) song.tlyric = lyricData.tlyric;
    }
    if (coverUrl) song.cover = coverUrl;
    if (audioUrl) song.audioUrl = audioUrl;

    return {
      ...song,
      cover: coverUrl || song.cover,
      audioUrl: audioUrl || song.audioUrl,
      lrc: (lyricData && lyricData.lrc) || song.lrc,
      tlyric: (lyricData && lyricData.tlyric) || song.tlyric || null
    };
  }

  /**
   * Parse NetEase Input (handles URLs, App share text, or raw numeric IDs)
   */
  function parseNeteaseInput(input) {
    if (!input) return null;
    const str = input.trim();
    
    // Check if it's a song link
    const songIdMatch = str.match(/song(?:\?id=|\/)(\d+)/i);
    if (songIdMatch) {
      return { type: 'song', id: songIdMatch[1] };
    }
    
    // Check if it's a playlist link
    const playlistMatch = str.match(/playlist(?:\?id=|\/)(\d+)/i);
    if (playlistMatch) {
      return { type: 'playlist', id: playlistMatch[1] };
    }

    // Pure numeric ID check (default to playlist if 5+ digits)
    const pureNum = str.match(/^\d+$/);
    if (pureNum) {
      return { type: 'playlist', id: pureNum[0] };
    }

    // Check if any numeric ID is embedded in shared text
    const anyNum = str.match(/\b\d{5,12}\b/);
    if (anyNum) {
      return { type: 'playlist', id: anyNum[0] };
    }

    return null;
  }

  /**
   * Import NetEase Playlist by ID (High-fidelity batch parser)
   */
  async function fetchNeteasePlaylist(playlistId) {
    try {
      const res = await fetch(`https://music-api.gdstudio.xyz/api.php?types=playlist&id=${playlistId}&source=netease`);
      const data = await res.json();
      
      let tracks = [];
      if (data && data.playlist && Array.isArray(data.playlist.tracks)) {
        tracks = data.playlist.tracks;
      } else if (Array.isArray(data)) {
        tracks = data;
      }

      if (tracks.length > 0) {
        return tracks.slice(0, 100).map((item, idx) => {
          const rawId = item.id || (playlistId + '_' + idx);
          const artistName = item.ar ? item.ar.map(a => a.name).join(' / ') : (item.artist || item.author || '未知歌手');
          const coverUrl = (item.al && item.al.picUrl) || item.pic || item.picUrl || '';
          return {
            id: 'netease_' + rawId,
            neteaseId: rawId,
            title: item.name || item.title || '未知曲目',
            artist: artistName,
            album: (item.al && item.al.name) || item.album || '网易云歌单',
            genre: 'NETEASE / HI-RES',
            cover: coverUrl,
            lrcUrl: `https://music-api.gdstudio.xyz/api.php?types=lyric&id=${rawId}&source=netease`,
            source: 'netease',
            badge: '网易云歌单'
          };
        });
      }
    } catch (err) {}

    // Fallback to Injahow Mirror
    try {
      const endpoint = `https://api.injahow.cn/meting/?server=netease&type=playlist&id=${playlistId}`;
      const res = await fetchWithTimeout(endpoint, {}, 2500);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item, idx) => ({
          id: 'netease_' + (item.id || (playlistId + '_' + idx)),
          neteaseId: item.id,
          title: item.title || item.name || '未知曲目',
          artist: item.author || item.artist || '未知歌手',
          album: item.album || '网易云歌单',
          genre: 'NETEASE / HI-RES',
          cover: item.pic || item.pic_url || '',
          lrcUrl: `https://music-api.gdstudio.xyz/api.php?types=lyric&id=${item.id || (playlistId + '_' + idx)}&source=netease`,
          source: 'netease',
          badge: '网易云音乐'
        }));
      }
    } catch (e) {}

    throw new Error('歌单为空或未公开，请检查歌单ID或分享链接');
  }

  /**
   * Import Single NetEase Song by ID
   */
  async function fetchNeteaseSong(songId) {
    try {
      const playableUrl = await fetchPlayableUrlFromId(songId, 'netease');
      let coverUrl = '';
      try {
        const pRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=pic&id=${songId}&source=netease`, {}, 2000);
        const pData = await pRes.json();
        if (pData && pData.url) coverUrl = pData.url.replace(/^http:\/\//i, 'https://');
      } catch (pe) {}

      return {
        id: 'netease_' + songId,
        neteaseId: songId,
        title: '网易云单曲',
        artist: '正版音源',
        album: '网易云音乐',
        genre: 'NETEASE / HI-RES',
        cover: coverUrl,
        audioUrl: playableUrl,
        lrcUrl: `https://music-api.gdstudio.xyz/api.php?types=lyric&id=${songId}&source=netease`,
        source: 'netease',
        badge: '网易云单曲'
      };
    } catch (err) {
      throw new Error('未找到单曲，请确认单曲ID正确');
    }
  }

  // Export to window
  window.AetheriaAPI = {
    BUILTIN_CATALOG,
    HOT_CHARTS,
    searchSongs,
    fetchSongDetails,
    resolveSongAudioUrl,
    resolveSongCover,
    resolveSongLyrics,
    getSongLyricsFromCache,
    searchAndResolveAudio,
    invalidateAudioCache,
    parseNeteaseInput,
    fetchNeteasePlaylist,
    fetchNeteaseSong
  };

})();

`

### File: shader.js
`javascript
/**
 * Aetheria Sound · WebGL GLSL Fluid Shader Engine
 * Implements: shader-dev & color-expert techniques
 * Domain-warping fluid simulation reacting in real-time to audio frequencies
 */

(function () {
  'use strict';

  const VS_SOURCE = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = (a_position + 1.0) * 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Liquid silk domain-warping fragment shader (Ultra-Fast Hardware Accelerated Simplex ALU)
  const FS_SOURCE = `
    precision mediump float;
    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform vec3 u_color3;
    uniform float u_bass;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    // Fast 2D Simplex Noise
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x  = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    // Optimized 2-octave FBM with domain rotation (Cuts ALU cost by 33% with identical fluid look)
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(0.87, 0.50, -0.50, 0.87);
      for (int i = 0; i < 2; ++i) {
        v += a * snoise(p);
        p = rot * p * 2.0 + vec2(1.2, 3.4);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
      float t = u_time * 0.16;
      float audioFactor = 1.0 + u_bass * 0.35;

      // Double domain warping
      vec2 q = vec2(
        fbm(p + vec2(0.0, 0.0) + t * 0.35),
        fbm(p + vec2(4.2, 1.1) + t * 0.28)
      );

      vec2 r = vec2(
        fbm(p + 3.0 * q + vec2(1.5, 7.2) + t * 0.22 * audioFactor),
        fbm(p + 3.0 * q + vec2(6.3, 2.1) + t * 0.18 * audioFactor)
      );

      float f = fbm(p + 2.8 * r);

      // Color interpolation
      vec3 col = mix(u_color1, u_color2, clamp((f * f) * 3.5, 0.0, 1.0));
      col = mix(col, u_color3, clamp(length(q) * 0.9, 0.0, 1.0));
      col = mix(col, u_color1 * 1.25, clamp(length(r.x) * 0.85, 0.0, 1.0));

      // Vignette
      float vig = 1.0 - smoothstep(0.4, 1.5, length(p));
      gl_FragColor = vec4(col * vig, 0.72);
    }
  `;

  class FluidShaderEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'high-performance' });
      this.startTime = Date.now();
      this.color1 = [0.96, 0.62, 0.04];
      this.color2 = [0.91, 0.24, 0.37];
      this.color3 = [0.12, 0.53, 0.90];
      this.bassLevel = 0.0;
      this.isRunning = false;

      if (this.gl) {
        this.initGL();
      }
    }

    hexToRgb(hex) {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255];
    }

    setColors(c1, c2, c3) {
      this.color1 = this.hexToRgb(c1);
      this.color2 = this.hexToRgb(c2);
      this.color3 = this.hexToRgb(c3);
    }

    setBass(val) {
      this.bassLevel = val;
    }

    initGL() {
      const gl = this.gl;

      const createShader = (type, source) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        return s;
      };

      const vs = createShader(gl.VERTEX_SHADER, VS_SOURCE);
      const fs = createShader(gl.FRAGMENT_SHADER, FS_SOURCE);

      this.program = gl.createProgram();
      gl.attachShader(this.program, vs);
      gl.attachShader(this.program, fs);
      gl.linkProgram(this.program);

      this.positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]), gl.STATIC_DRAW);

      this.posLoc = gl.getAttribLocation(this.program, 'a_position');
      this.resLoc = gl.getUniformLocation(this.program, 'u_resolution');
      this.timeLoc = gl.getUniformLocation(this.program, 'u_time');
      this.c1Loc = gl.getUniformLocation(this.program, 'u_color1');
      this.c2Loc = gl.getUniformLocation(this.program, 'u_color2');
      this.c3Loc = gl.getUniformLocation(this.program, 'u_color3');
      this.bassLoc = gl.getUniformLocation(this.program, 'u_bass');
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      let lastTime = 0;
      const fpsInterval = 1000 / 30; // 30 FPS cap saves 50-70% GPU cycles for ambient background

      const render = (now) => {
        if (!this.isRunning) return;
        this.rafId = requestAnimationFrame(render);
        const elapsed = now - lastTime;
        if (elapsed >= fpsInterval) {
          lastTime = now - (elapsed % fpsInterval);
          this.renderFrame();
        }
      };
      this.rafId = requestAnimationFrame(render);

      if (!this._visibilityBound) {
        this._visibilityBound = true;
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.stop();
          } else if (!this.isRunning) {
            this.start();
          }
        });
      }
    }

    stop() {
      this.isRunning = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    resize() {
      if (!this.gl) return;
      // Ambient fluid glow buffer optimization:
      // Rendering at ~360p internal resolution with bilinear CSS scaling saves 90% GPU fill-rate
      const scale = 0.3;
      const w = Math.min(Math.max(Math.floor(window.innerWidth * scale), 280), 600);
      const h = Math.min(Math.max(Math.floor(window.innerHeight * scale), 160), 360);

      this.canvas.width = w;
      this.canvas.height = h;
      this.canvas.style.width = '100vw';
      this.canvas.style.height = '100vh';
      this.gl.viewport(0, 0, w, h);
    }

    renderFrame() {
      if (!this.gl) return;
      if (typeof this.onBeforeRender === 'function') {
        this.onBeforeRender();
      }

      const gl = this.gl;
      const elapsed = (Date.now() - this.startTime) * 0.001;

      gl.useProgram(this.program);

      gl.enableVertexAttribArray(this.posLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(this.resLoc, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.timeLoc, elapsed);
      gl.uniform3fv(this.c1Loc, this.color1);
      gl.uniform3fv(this.c2Loc, this.color2);
      gl.uniform3fv(this.c3Loc, this.color3);
      gl.uniform1f(this.bassLoc, this.bassLevel);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  window.FluidShaderEngine = FluidShaderEngine;

})();

`

### File: server.js
`javascript
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DEFAULT_PORT = 8080;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// High-speed Audio Stream Proxy (Bypasses CDN CORS restrictions for Web Audio FFT Analyser)
function proxyAudioStream(targetUrl, clientReq, clientRes, redirectCount = 0) {
  if (redirectCount > 5) {
    clientRes.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    clientRes.end('Too many redirects');
    return;
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch (e) {
    clientRes.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    clientRes.end('Invalid URL parameter');
    return;
  }

  // Guard against upstream 404 redirects
  if (parsedTarget.pathname.includes('/404') || parsedTarget.pathname.endsWith('404')) {
    clientRes.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    clientRes.end('Upstream 404 audio resource');
    return;
  }

  const lib = parsedTarget.protocol === 'https:' ? https : http;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Encoding': 'identity'
  };
  if (clientReq.headers.range) {
    headers['Range'] = clientReq.headers.range;
  }

  const reqOptions = {
    hostname: parsedTarget.hostname,
    port: parsedTarget.port || (parsedTarget.protocol === 'https:' ? 443 : 80),
    path: parsedTarget.pathname + parsedTarget.search,
    method: 'GET',
    headers,
    timeout: 12000
  };

  const proxyReq = lib.request(reqOptions, (proxyRes) => {
    if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
      let nextUrl = proxyRes.headers.location;
      if (!nextUrl.startsWith('http')) {
        nextUrl = new URL(nextUrl, targetUrl).toString();
      }
      if (nextUrl.includes('/404')) {
        clientRes.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        clientRes.end('Audio resource 404 not available');
        return;
      }
      proxyAudioStream(nextUrl, clientReq, clientRes, redirectCount + 1);
      return;
    }

    if (proxyRes.statusCode >= 400) {
      clientRes.writeHead(proxyRes.statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
      clientRes.end('Upstream returned error ' + proxyRes.statusCode);
      return;
    }

    const responseHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Accept-Ranges': proxyRes.headers['accept-ranges'] || 'bytes',
      'Content-Type': proxyRes.headers['content-type'] || 'audio/mpeg'
    };
    if (proxyRes.headers['content-length']) responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
    if (proxyRes.headers['content-range']) responseHeaders['Content-Range'] = proxyRes.headers['content-range'];

    clientRes.writeHead(proxyRes.statusCode, responseHeaders);
    proxyRes.pipe(clientRes);
  });

  clientReq.on('close', () => {
    proxyReq.destroy();
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    if (!clientRes.headersSent) {
      clientRes.writeHead(504, { 'Content-Type': 'text/plain; charset=utf-8' });
      clientRes.end('Gateway Timeout');
    }
  });

  proxyReq.on('error', (err) => {
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      clientRes.end('Proxy Error: ' + err.message);
    }
  });

  proxyReq.end();
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Audio Proxy Endpoint for real FFT Frequency extraction
  if (pathname === '/api/proxy') {
    const targetUrl = parsedUrl.query ? parsedUrl.query.url : null;
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Missing url parameter');
      return;
    }
    proxyAudioStream(targetUrl, req, res);
    return;
  }

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const filePath = path.normalize(path.join(ROOT_DIR, pathname));

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const totalSize = stats.size;

    // HTTP Range Support (vital for audio seeking and streaming)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
        res.end();
        return;
      }

      const chunkSize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🎵 Aetheria Sound Player · 本地服务启动成功!`);
    console.log(`🌐 访问地址: http://localhost:${port}`);
    console.log(`📁 运行目录: ${ROOT_DIR}`);
    console.log(`======================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`端口 ${port} 已被占用，正在尝试端口 ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('服务器启动错误:', err);
    }
  });
}

startServer(DEFAULT_PORT);

`

---

## 任务指令 (User Instructions)

请在此下方写下你希望 Codex 完成的具体任务：
例如：
1. 请帮我分析 app.js 中的鼓点共振算法，并改进...
2. 请为 style.css 添加一种新的唱片机复古质感皮肤...
3. 请审查代码中的性能瓶颈并提出优化方案。
