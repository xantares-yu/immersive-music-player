/**
 * Aetheria Sound · Spotify-Style Artist Profile & Album View Engine
 * Provides:
 *   - Spotify Verified Artist Page (Hero banner, top tracks, discography grid, bio)
 *   - Spotify Album Page (HD vinyl cover elevation, metadata, full tracklist)
 *   - Multi-layer Navigation History Stack (Back / Forward)
 *   - Real-time Online Enrichment via Meting Aggregator
 *   - Local Library & AetheriaDB Indexing
 */

(function () {
  'use strict';

  // ============================================================
  // 1. Navigation State & Caches
  // ============================================================
  const historyStack = [];
  const artistCache = new Map();
  const albumCache = new Map();

  // Multi-tier persistent client cache (Memory Map + localStorage)
  const PROFILE_STORAGE_KEY = 'aetheria_profile_cache_v2';
  function getCachedProfile(key) {
    if (artistCache.has(key)) return artistCache.get(key);
    if (albumCache.has(key)) return albumCache.get(key);
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return null;
      const store = JSON.parse(raw);
      const val = store[key] || null;
      if (val) {
        if (key.startsWith('artist_')) artistCache.set(key, val);
        else albumCache.set(key, val);
      }
      return val;
    } catch (e) { return null; }
  }

  function setCachedProfile(key, data) {
    if (!key || !data) return;
    if (key.startsWith('artist_')) artistCache.set(key, data);
    else albumCache.set(key, data);
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      const store = raw ? JSON.parse(raw) : {};
      store[key] = data;
      const keys = Object.keys(store);
      if (keys.length > 80) {
        delete store[keys[0]];
      }
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {}
  }

  let followedArtists = new Set();
  try {
    const saved = localStorage.getItem('aetheria_followed_artists');
    if (saved) followedArtists = new Set(JSON.parse(saved));
  } catch (e) {}

  let likedAlbums = new Set();
  try {
    const saved = localStorage.getItem('aetheria_liked_albums');
    if (saved) likedAlbums = new Set(JSON.parse(saved));
  } catch (e) {}

  function saveFollowedArtists() {
    try {
      localStorage.setItem('aetheria_followed_artists', JSON.stringify([...followedArtists]));
    } catch (e) {}
  }

  function saveLikedAlbums() {
    try {
      localStorage.setItem('aetheria_liked_albums', JSON.stringify([...likedAlbums]));
    } catch (e) {}
  }

  // DOM References
  let modalEl = null;
  let headerTitleEl = null;
  let headerTypeEl = null;
  let contentEl = null;
  let backBtn = null;
  let closeBtn = null;

  function initDOMElements() {
    modalEl = document.getElementById('profile-view-modal');
    headerTitleEl = document.getElementById('profile-modal-title');
    headerTypeEl = document.getElementById('profile-breadcrumb-type');
    contentEl = document.getElementById('profile-modal-content');
    backBtn = document.getElementById('profile-back-btn');
    closeBtn = document.getElementById('profile-close-btn');

    if (backBtn) {
      backBtn.addEventListener('click', navigateBack);
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', closeProfileModal);
    }

    // Keyboard Esc listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isModalOpen()) {
        e.preventDefault();
        e.stopPropagation();
        navigateBack();
      }
    });

    // Delegated click handler for artist and album links across the entire application
    document.addEventListener('click', (e) => {
      // 0. Ignore clicks within modal header navigation controls (back/close buttons)
      if (e.target.closest('#profile-modal-header')) return;

      // 1. Check if the clicked target is an Album target (.album-nav-link, .album-card, or [data-album])
      const albumTarget = e.target.closest('.album-nav-link, .album-card, [data-album]');
      if (albumTarget) {
        // If clicking a nested artist link inside an album card or row, prioritize the artist link
        const nestedArtist = e.target.closest('.artist-nav-link');
        if (nestedArtist && nestedArtist !== albumTarget && albumTarget.contains(nestedArtist)) {
          const artist = nestedArtist.getAttribute('data-artist') || nestedArtist.textContent.trim();
          if (artist && artist !== '未知歌手' && artist !== '点击右上角「全网搜歌」或导入音乐开始播放') {
            e.preventDefault();
            e.stopPropagation();
            openArtist(artist);
            return;
          }
        }

        const album = albumTarget.getAttribute('data-album') || albumTarget.textContent.trim();
        const artist = albumTarget.getAttribute('data-artist') || '';
        const albumMid = albumTarget.getAttribute('data-album-mid') || '';
        if (album && album !== '未知专辑') {
          e.preventDefault();
          e.stopPropagation();
          openAlbum(album, artist, albumMid);
          return;
        }
      }

      // 2. Check if the clicked target is an Artist target (.artist-nav-link, or [data-artist])
      const artistTarget = e.target.closest('.artist-nav-link, [data-artist]');
      if (artistTarget) {
        // Guard against any album element that may carry data-artist
        if (artistTarget.classList.contains('album-nav-link') || artistTarget.classList.contains('album-card') || artistTarget.hasAttribute('data-album')) {
          const album = artistTarget.getAttribute('data-album') || artistTarget.textContent.trim();
          const artist = artistTarget.getAttribute('data-artist') || '';
          const albumMid = artistTarget.getAttribute('data-album-mid') || '';
          if (album && album !== '未知专辑') {
            e.preventDefault();
            e.stopPropagation();
            openAlbum(album, artist, albumMid);
            return;
          }
        }

        const artist = artistTarget.getAttribute('data-artist') || artistTarget.textContent.trim();
        if (artist && artist !== '未知歌手' && artist !== '点击右上角「全网搜歌」或导入音乐开始播放') {
          e.preventDefault();
          e.stopPropagation();
          openArtist(artist);
          return;
        }
      }
    });
  }

  function isModalOpen() {
    return modalEl && modalEl.classList.contains('show');
  }

  // ============================================================
  // 2. Navigation Actions
  // ============================================================
  function openArtist(rawArtistName, pushHistory = true) {
    if (!rawArtistName) return;
    const cleanName = cleanArtistName(rawArtistName);
    if (!cleanName) return;

    if (pushHistory) {
      historyStack.push({ type: 'artist', name: cleanName });
    }
    updateBackButtonUI();

    showModal();
    if (headerTypeEl) headerTypeEl.textContent = '歌手档案';
    if (headerTitleEl) headerTitleEl.textContent = cleanName;

    renderArtistProfile(cleanName);
  }

  function openAlbum(albumName, artistName = '', albumMid = '', pushHistory = true) {
    if (!albumName && !albumMid) return;
    const cleanAlbum = (albumName || '').trim();
    const cleanArtist = cleanArtistName(artistName || '');
    const cleanMid = (albumMid || '').trim();

    if (pushHistory) {
      historyStack.push({ type: 'album', name: cleanAlbum, artist: cleanArtist, albumMid: cleanMid });
    }
    updateBackButtonUI();

    showModal();
    if (headerTypeEl) headerTypeEl.textContent = '精选专辑';
    if (headerTitleEl) headerTitleEl.textContent = cleanAlbum || '官方精选专辑';

    renderAlbumProfile(cleanAlbum, cleanArtist, cleanMid);
  }

  function navigateBack() {
    if (historyStack.length > 1) {
      historyStack.pop(); // pop current
      const prev = historyStack[historyStack.length - 1];
      if (prev.type === 'artist') {
        openArtist(prev.name, false);
      } else if (prev.type === 'album') {
        openAlbum(prev.name, prev.artist, prev.albumMid || '', false);
      }
      updateBackButtonUI();
    } else {
      closeProfileModal();
    }
  }

  function closeProfileModal() {
    if (!modalEl) return;
    modalEl.classList.remove('show');
    historyStack.length = 0;
    updateBackButtonUI();
  }

  function showModal() {
    if (!modalEl) initDOMElements();
    if (!modalEl) return;
    modalEl.classList.add('show');
    contentEl.scrollTop = 0;
  }

  function updateBackButtonUI() {
    if (!backBtn) return;
    if (historyStack.length > 1) {
      backBtn.classList.remove('opacity-60');
      backBtn.querySelector('span').textContent = '返回上一页';
    } else {
      backBtn.classList.add('opacity-60');
      backBtn.querySelector('span').textContent = '返回';
    }
  }

  function cleanArtistName(name) {
    if (!name) return '';
    // E.g. "周杰伦 · Jay Chou" -> "周杰伦"
    // "The Weeknd ft. Daft Punk" -> "The Weeknd"
    return name.split(/·|&|\/|ft\.|feat\./i)[0].trim();
  }

  // ============================================================
  // 3. Spotify Artist Page Rendering
  // ============================================================
  async function renderArtistProfile(artistName) {
    if (!contentEl) return;

    // 1. Gather all local tracks matching this artist strictly
    const localTracks = getLocalTracksByArtist(artistName);
    let avatarCover = localTracks[0]?.cover || '';
    const isFollowed = followedArtists.has(artistName);

    const cacheKey = ('artist_' + artistName).toLowerCase();
    const cachedData = getCachedProfile(cacheKey);

    let initialTracks = localTracks;
    let initialAlbums = extractAlbumsFromTracks(localTracks, artistName);
    let initialStatsText = `收录 ${localTracks.length} 首高保真音源 · 24-Bit / 96kHz Lossless`;
    let showSpinner = true;

    if (cachedData) {
      if (cachedData.avatar) avatarCover = cachedData.avatar;
      if (Array.isArray(cachedData.topSongs) && cachedData.topSongs.length > 0) {
        initialTracks = cachedData.topSongs;
        initialStatsText = `收录 ${cachedData.topSongs.length} 首热门金曲 · ${cachedData.albumCount || 20} 部官方精选专辑 · 24-Bit / 96kHz Lossless`;
      }
      if (Array.isArray(cachedData.albums) && cachedData.albums.length > 0) {
        initialAlbums = cachedData.albums;
      }
      showSpinner = false;
    }

    // Initial Render (0ms instant render if cached!)
    contentEl.innerHTML = `
      <!-- Spotify Verified Artist Hero Banner -->
      <div class="relative w-full px-6 md:px-12 pt-10 pb-12 overflow-hidden border-b border-white/10 bg-gradient-to-b from-emerald-950/30 via-black/40 to-black/80">
        <!-- Ambient Radial Glow -->
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none"></div>

        <div class="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 max-w-6xl mx-auto">
          <!-- Artist Avatar (Round, Spotify Style) -->
          <div class="relative w-36 h-36 md:w-48 md:h-48 rounded-full overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.8)] border border-white/20 shrink-0 group">
            <img id="artist-hero-avatar" src="${avatarCover || 'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\" viewBox=\"0 0 200 200\"><rect width=\"200\" height=\"200\" fill=\"%23181824\"/><circle cx=\"100\" cy=\"100\" r=\"60\" fill=\"%2334d399\"/></svg>'}" alt="${escapeHtml(artistName)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>

          <!-- Artist Typographic Hierarchy -->
          <div class="flex-1 text-center md:text-left space-y-2.5">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-white/10 border border-white/15 text-emerald-400">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              认证音乐人 · Verified Artist
            </div>
            
            <h1 class="text-3xl md:text-6xl font-black font-display tracking-tight text-white drop-shadow-md">
              ${escapeHtml(artistName)}
            </h1>

            <p id="artist-track-stats" class="text-xs md:text-sm text-white/60 font-medium">
              ${initialStatsText}
            </p>

            <!-- Actions Row -->
            <div class="pt-3 flex items-center justify-center md:justify-start gap-3.5">
              <!-- Big Spotify Play Button -->
              <button id="artist-play-all-btn" class="px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-[0_8px_24px_rgba(16,185,129,0.4)] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>播放热门歌曲</span>
              </button>

              <!-- Follow Button -->
              <button id="artist-follow-btn" class="px-5 py-2.5 rounded-full border border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs tracking-wider uppercase transition-all">
                ${isFollowed ? '✓ 已关注' : '+ 关注'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Columns: Top Songs & Discography -->
      <div class="max-w-6xl mx-auto px-6 md:px-12 py-10 space-y-12">
        <!-- 1. Popular Tracks Table -->
        <section>
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-xl font-bold font-display text-white tracking-wide flex items-center gap-2">
              <span>🔥 热门曲目</span>
              <span id="artist-loading-spinner" class="w-3.5 h-3.5 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin ${showSpinner ? '' : 'hidden'}"></span>
            </h3>
            <span class="text-xs text-white/40">点击任意歌曲立即试听</span>
          </div>

          <div id="artist-songs-table" class="space-y-1.5">
            ${renderTracksTableRows(initialTracks)}
          </div>
        </section>

        <!-- 2. Discography / Albums Grid -->
        <section>
          <div class="flex items-center justify-between mb-5">
            <h3 class="text-xl font-bold font-display text-white tracking-wide">
              💿 精选专辑与单曲
            </h3>
            <span class="text-xs text-white/40">点击进入专辑收听</span>
          </div>

          <div id="artist-albums-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            ${renderAlbumsGridCards(initialAlbums)}
          </div>
        </section>

        <!-- 3. About / Bio Section -->
        <section class="p-6 md:p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
          <h3 class="text-lg font-bold font-display text-white mb-2">关于 ${escapeHtml(artistName)}</h3>
          <p class="text-xs md:text-sm text-white/60 leading-relaxed font-sans">
            ${escapeHtml(artistName)} 是极具代表性的杰出华语音乐人，其创作融合了流行、R&B、中国风与古典编曲艺术，作品以真挚的情感共鸣与高保真录音棚级母带制作闻名。在 Aetheria Sound 中享受经由 WebGL 流体着色器与 5 段母带均衡器深度优化的原声体验。
          </p>
          <div class="mt-4 flex flex-wrap gap-2 text-[11px] text-white/50">
            <span class="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">华语流行</span>
            <span class="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">R&B / Soul</span>
            <span class="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">高保真无损</span>
            <span class="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">录音棚母带</span>
          </div>
        </section>
      </div>
    `;

    // Bind Hero Actions
    const playAllBtn = document.getElementById('artist-play-all-btn');
    if (playAllBtn) {
      playAllBtn.onclick = () => playTracksSequence(initialTracks);
    }

    const followBtn = document.getElementById('artist-follow-btn');
    if (followBtn) {
      followBtn.addEventListener('click', () => {
        if (followedArtists.has(artistName)) {
          followedArtists.delete(artistName);
          followBtn.textContent = '+ 关注';
          showToast(`已取消关注 ${artistName}`, 'info');
        } else {
          followedArtists.add(artistName);
          followBtn.textContent = '✓ 已关注';
          showToast(`已关注 ${artistName}！将优先为您推荐其经典曲目`, 'success');
        }
        saveFollowedArtists();
      });
    }

    bindTrackRowsEvents(initialTracks);

    // 2. Background Revalidation via AetheriaAPI
    if (window.AetheriaAPI && typeof window.AetheriaAPI.fetchArtistDetails === 'function') {
      try {
        const artistData = await window.AetheriaAPI.fetchArtistDetails(artistName);

        const spinner = document.getElementById('artist-loading-spinner');
        if (spinner) spinner.classList.add('hidden');

        if (artistData && Array.isArray(artistData.topSongs) && artistData.topSongs.length > 0) {
          const localMap = new Map();
          localTracks.forEach(lt => {
            const k = (lt.title || '').toLowerCase().replace(/[\s·\-_,()（）]/g, '');
            localMap.set(k, lt);
          });

          const mergedTracks = artistData.topSongs.map((offTrack) => {
            const k = (offTrack.title || '').toLowerCase().replace(/[\s·\-_,()（）]/g, '');
            const loc = localMap.get(k);
            if (loc) {
              return {
                ...offTrack,
                audioUrl: loc.audioUrl || offTrack.audioUrl,
                isLocal: true,
                genre: loc.genre || '本地母带 Hi-Res'
              };
            }
            return offTrack;
          });

          // Only unshift remaining local tracks if their artist explicitly matches artistName!
          for (const remaining of localMap.values()) {
            const remArt = (remaining.artist || '').trim().toLowerCase();
            if (remArt && (remArt.includes(artistName.toLowerCase()) || artistName.toLowerCase().includes(remArt))) {
              mergedTracks.unshift(remaining);
            }
          }

          if (artistData.avatar) {
            const avatarImg = document.getElementById('artist-hero-avatar');
            if (avatarImg) avatarImg.src = artistData.avatar;
          }

          const statsEl = document.getElementById('artist-track-stats');
          if (statsEl) {
            const albCount = artistData.albums ? artistData.albums.length : 10;
            statsEl.textContent = `收录 ${mergedTracks.length} 首热门金曲 · ${albCount} 部官方精选专辑 · 24-Bit / 96kHz Lossless`;
          }

          const tableEl = document.getElementById('artist-songs-table');
          if (tableEl) {
            tableEl.innerHTML = renderTracksTableRows(mergedTracks);
            bindTrackRowsEvents(mergedTracks);
          }

          const albumsGrid = document.getElementById('artist-albums-grid');
          if (albumsGrid && Array.isArray(artistData.albums) && artistData.albums.length > 0) {
            albumsGrid.innerHTML = renderAlbumsGridCards(artistData.albums);
          }

          if (playAllBtn) {
            playAllBtn.onclick = () => playTracksSequence(mergedTracks);
          }

          // Cache in client storage
          setCachedProfile(cacheKey, {
            avatar: artistData.avatar || avatarCover,
            topSongs: mergedTracks,
            albums: artistData.albums || [],
            albumCount: artistData.albums ? artistData.albums.length : 20
          });
        }
      } catch (err) {
        console.warn('[Profile] Online artist enrichment notice:', err);
        const spinner = document.getElementById('artist-loading-spinner');
        if (spinner) spinner.classList.add('hidden');
      }
    } else {
      const spinner = document.getElementById('artist-loading-spinner');
      if (spinner) spinner.classList.add('hidden');
    }
  }

  // ============================================================
  // 4. Spotify Album Page Rendering
  // ============================================================
  async function renderAlbumProfile(albumName, artistName = '', albumMid = '') {
    if (!contentEl) return;

    // 1. Gather strictly-matching local tracks belonging to this album
    const localTracks = getLocalTracksByAlbum(albumName, artistName);
    const primaryArtist = artistName || localTracks[0]?.artist || '未知音乐人';
    const isLiked = likedAlbums.has(albumName);

    const cacheKey = ('album_' + albumName + '_' + (artistName || '') + '_' + (albumMid || '')).toLowerCase();
    const cachedData = getCachedProfile(cacheKey);

    let initialTracks = localTracks;
    let initialCover = localTracks[0]?.cover || '';
    let initialCountText = localTracks.length > 0 ? `${localTracks.length} 首已收录歌曲` : '正在同步官方完整音轨...';

    if (cachedData && Array.isArray(cachedData.tracks) && cachedData.tracks.length > 0) {
      initialTracks = cachedData.tracks;
      initialCover = cachedData.cover || initialCover;
      initialCountText = `${cachedData.totalTracks || cachedData.tracks.length} 首完整曲目 · CD 原声音轨`;
    }

    // Initial Render (0ms instant render if cached!)
    contentEl.innerHTML = `
      <!-- Spotify Album Hero Header -->
      <div class="relative w-full px-6 md:px-12 pt-10 pb-12 overflow-hidden border-b border-white/10 bg-gradient-to-b from-indigo-950/30 via-black/40 to-black/80">
        <!-- Ambient Blur Glow -->
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none"></div>

        <div class="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 max-w-6xl mx-auto">
          <!-- Album Cover with Vinyl Drop Shadow -->
          <div class="relative w-44 h-44 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/20 shrink-0 group">
            <img id="album-hero-cover" src="${initialCover || 'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"300\" height=\"300\" viewBox=\"0 0 300 300\"><rect width=\"300\" height=\"300\" fill=\"%23181824\"/><circle cx=\"150\" cy=\"150\" r=\"90\" fill=\"%23222232\"/><circle cx=\"150\" cy=\"150\" r=\"30\" fill=\"%236366f1\"/></svg>'}" alt="${escapeHtml(albumName)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>

          <!-- Album Info -->
          <div class="flex-1 text-center md:text-left space-y-2.5">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-white/10 border border-white/15 text-indigo-300">
              💿 精选专辑 · Album
            </div>
            
            <h1 class="text-2xl md:text-5xl font-black font-display tracking-tight text-white drop-shadow-md">
              ${escapeHtml(albumName)}
            </h1>

            <div class="flex items-center justify-center md:justify-start flex-wrap gap-2 text-xs md:text-sm text-white/70 font-medium">
              <!-- Clickable Artist Link in Album Header -->
              <span class="artist-nav-link text-white font-bold hover:text-emerald-400 hover:underline cursor-pointer transition-colors" data-artist="${escapeHtml(primaryArtist)}">
                ${escapeHtml(primaryArtist)}
              </span>
              <span class="text-white/30">•</span>
              <span>经典录音棚母带</span>
              <span class="text-white/30">•</span>
              <span id="album-track-count-text">${initialCountText}</span>
              <span class="text-white/30">•</span>
              <span class="px-2 py-0.5 rounded bg-white/10 text-emerald-400 font-mono text-[10px]">Hi-Res 96kHz</span>
            </div>

            <!-- Actions Row -->
            <div class="pt-3 flex items-center justify-center md:justify-start gap-3.5">
              <!-- Play Album Button -->
              <button id="album-play-all-btn" class="px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-[0_8px_24px_rgba(16,185,129,0.4)] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>播放整张专辑</span>
              </button>

              <!-- Like Album Button -->
              <button id="album-like-btn" class="px-4 py-2.5 rounded-full border border-white/20 hover:border-white/50 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-all flex items-center gap-1.5">
                <span id="album-like-icon">${isLiked ? '♥' : '♡'}</span>
                <span id="album-like-text">${isLiked ? '已收藏' : '收藏专辑'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Album Tracklist Table -->
      <div class="max-w-6xl mx-auto px-6 md:px-12 py-10 space-y-6">
        <div class="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-mono text-white/40 uppercase tracking-wider">
          <div class="w-10 text-center">#</div>
          <div class="flex-1">标题与歌手</div>
          <div class="hidden sm:block w-32 text-right">音质格式</div>
          <div class="w-20 text-right pr-4">操作</div>
        </div>

        <div id="album-songs-table" class="space-y-1.5">
          ${initialTracks.length > 0 ? renderTracksTableRows(initialTracks, true) : `
            <div class="py-16 text-center text-white/50 text-xs font-mono flex flex-col items-center justify-center gap-3">
              <span class="w-5 h-5 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin"></span>
              <span>正在获取官方完整 CD 原声音轨 (母带级解析)...</span>
            </div>
          `}
        </div>
      </div>
    `;

    // Bind Actions
    let currentAlbumTracks = [...initialTracks];
    const playAlbumBtn = document.getElementById('album-play-all-btn');
    if (playAlbumBtn) {
      playAlbumBtn.onclick = () => playTracksSequence(currentAlbumTracks);
    }

    const likeAlbumBtn = document.getElementById('album-like-btn');
    if (likeAlbumBtn) {
      likeAlbumBtn.addEventListener('click', () => {
        if (likedAlbums.has(albumName)) {
          likedAlbums.delete(albumName);
          document.getElementById('album-like-icon').textContent = '♡';
          document.getElementById('album-like-text').textContent = '收藏专辑';
          showToast(`已取消收藏专辑《${albumName}》`, 'info');
        } else {
          likedAlbums.add(albumName);
          document.getElementById('album-like-icon').textContent = '♥';
          document.getElementById('album-like-text').textContent = '已收藏';
          showToast(`已收藏专辑《${albumName}》到我的媒体库`, 'success');
        }
        saveLikedAlbums();
      });
    }

    if (initialTracks.length > 0) {
      bindTrackRowsEvents(initialTracks);
    }

    // 2. Fetch 100% COMPLETE official album details with exact CD track sequence!
    if (window.AetheriaAPI && typeof window.AetheriaAPI.fetchAlbumDetails === 'function') {
      try {
        const albumData = await window.AetheriaAPI.fetchAlbumDetails(albumName, primaryArtist, albumMid);

        if (albumData && Array.isArray(albumData.tracks) && albumData.tracks.length > 0) {
          const coverImg = document.getElementById('album-hero-cover');
          if (coverImg && albumData.cover) {
            coverImg.src = albumData.cover;
          }

          const countText = document.getElementById('album-track-count-text');
          if (countText) {
            countText.textContent = `${albumData.totalTracks || albumData.tracks.length} 首完整曲目 · CD 原声音轨`;
          }

          // Build a lookup map of local tracks by clean title so local high-res audio files take priority
          const localMap = new Map();
          localTracks.forEach(lt => {
            const cleanTitle = (lt.title || '').toLowerCase().replace(/[\s·\-_,()（）]/g, '');
            localMap.set(cleanTitle, lt);
          });

          // Map official tracks in strict CD track order (1, 2, 3...)
          const mergedList = albumData.tracks.map((offTrack) => {
            const cleanOff = (offTrack.title || '').toLowerCase().replace(/[\s·\-_,()（）]/g, '');
            const localMatch = localMap.get(cleanOff);
            if (localMatch) {
              return {
                ...offTrack,
                audioUrl: localMatch.audioUrl || offTrack.audioUrl,
                source: localMatch.source || offTrack.source,
                isLocal: true,
                genre: localMatch.genre || '本地母带 Hi-Res'
              };
            }
            return offTrack;
          });

          // Strict sort order by trackNo (1, 2, 3...)
          mergedList.sort((a, b) => (a.trackNo || 0) - (b.trackNo || 0));
          currentAlbumTracks = mergedList;

          const tableEl = document.getElementById('album-songs-table');
          if (tableEl) {
            tableEl.innerHTML = renderTracksTableRows(mergedList, true);
            bindTrackRowsEvents(mergedList);
          }

          if (playAlbumBtn) {
            playAlbumBtn.onclick = () => playTracksSequence(mergedList);
          }

          // Cache in client storage
          setCachedProfile(cacheKey, {
            ...albumData,
            tracks: mergedList
          });
        } else if (currentAlbumTracks.length === 0) {
          const tableEl = document.getElementById('album-songs-table');
          if (tableEl) {
            tableEl.innerHTML = `
              <div class="py-14 text-center text-white/40 text-xs font-mono space-y-2">
                <p>未在官方母带库中匹配到《${escapeHtml(albumName)}》的收录曲目</p>
                <p class="text-white/20 text-[11px]">可点击右上角搜索框直接搜索该专辑歌曲</p>
              </div>
            `;
          }
        }
      } catch (err) {
        console.warn('[Profile] Online album resolution notice:', err);
      }
    }
  }

  // ============================================================
  // 5. HTML Builders & Helpers
  // ============================================================
  function renderTracksTableRows(tracks, isAlbumView = false) {
    if (!tracks || tracks.length === 0) {
      return `
        <div class="py-12 text-center text-white/40 text-xs font-mono">
          暂无收录曲目，正在通过全网聚合引擎探索...
        </div>
      `;
    }

    return tracks.map((track, idx) => {
      const trackNumber = track.trackNo || (idx + 1);
      const num = String(trackNumber).padStart(2, '0');
      const isCurrent = window.PLAYLIST && window.PLAYLIST[window.currentTrackIndex]?.title === track.title;
      const albumTitle = track.album || '单曲精选';

      return `
        <div class="track-row group flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.07] transition-all cursor-pointer border border-transparent hover:border-white/10 ${isCurrent ? 'bg-white/10 border-emerald-500/30' : ''}" data-track-index="${idx}">
          <!-- Index / Play Icon -->
          <div class="w-10 text-center font-mono text-xs text-white/40 group-hover:hidden">
            ${isCurrent ? '<span class="text-emerald-400">▶</span>' : num}
          </div>
          <div class="w-10 text-center text-xs text-emerald-400 hidden group-hover:block">
            ▶
          </div>

          <!-- Cover + Title + Artist -->
          <div class="flex items-center gap-3.5 flex-1 min-w-0 pr-3">
            <img src="${track.cover || 'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"50\" height=\"50\" viewBox=\"0 0 50 50\"><rect width=\"50\" height=\"50\" fill=\"%23181824\"/></svg>'}" alt="${escapeHtml(track.title)}" class="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm" />
            <div class="min-w-0">
              <div class="text-sm font-semibold text-white/90 group-hover:text-white truncate font-display ${isCurrent ? 'text-emerald-400 font-bold' : ''}">
                ${escapeHtml(track.title)}
              </div>
              <div class="text-[11px] text-white/50 truncate flex items-center gap-1.5">
                <span class="artist-nav-link hover:text-emerald-300 hover:underline cursor-pointer" data-artist="${escapeHtml(track.artist)}">
                  ${escapeHtml(track.artist)}
                </span>
                ${!isAlbumView ? `
                  <span class="text-white/20">•</span>
                  <span class="album-nav-link text-white/40 hover:text-emerald-300 hover:underline cursor-pointer" data-album="${escapeHtml(albumTitle)}" data-artist="${escapeHtml(track.artist)}">
                    ${escapeHtml(albumTitle)}
                  </span>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Audio Spec -->
          <div class="hidden sm:flex items-center justify-end w-32 font-mono text-[10px] text-white/40">
            <span class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-400/80">96kHz · 24-bit</span>
          </div>

          <!-- Actions -->
          <div class="w-20 flex items-center justify-end gap-2 text-right">
            <button class="add-queue-btn p-1.5 rounded-lg hover:bg-white/15 text-white/40 hover:text-white transition-colors" title="添加至播放队列" data-track-index="${idx}">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderAlbumsGridCards(albums) {
    if (!albums || albums.length === 0) {
      return `
        <div class="col-span-full py-8 text-center text-white/40 text-xs font-mono">
          正在检索歌手相关专辑与发行版...
        </div>
      `;
    }

    return albums.map(alb => {
      return `
        <div class="album-card group p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-1" data-album="${escapeHtml(alb.name)}" data-artist="${escapeHtml(alb.artist)}" data-album-mid="${escapeHtml(alb.albumMid || '')}">
          <div class="relative w-full aspect-square rounded-xl overflow-hidden mb-3 shadow-md">
            <img src="${alb.cover || 'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\" viewBox=\"0 0 200 200\"><rect width=\"200\" height=\"200\" fill=\"%23181824\"/><circle cx=\"100\" cy=\"100\" r=\"60\" fill=\"%236366f1\"/></svg>'}" alt="${escapeHtml(alb.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div class="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-emerald-500 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-xl transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <svg class="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div class="text-xs font-bold text-white truncate font-display group-hover:text-emerald-300 transition-colors">
            ${escapeHtml(alb.name)}
          </div>
          <div class="text-[11px] text-white/40 truncate mt-0.5">
            ${alb.trackCount} 首歌曲 · 经典专辑
          </div>
        </div>
      `;
    }).join('');
  }

  function bindTrackRowsEvents(tracks) {
    if (!contentEl) return;

    // Row click -> play track
    contentEl.querySelectorAll('.track-row').forEach(row => {
      row.addEventListener('click', (e) => {
        // Ignore if clicking internal artist/album links or add-to-queue button
        if (e.target.closest('.artist-nav-link, .album-nav-link, .add-queue-btn')) return;
        const idx = parseInt(row.getAttribute('data-track-index'), 10);
        const targetTrack = tracks[idx];
        if (targetTrack) {
          playSingleTrack(targetTrack);
        }
      });
    });

    // Add to queue button click
    contentEl.querySelectorAll('.add-queue-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-track-index'), 10);
        const targetTrack = tracks[idx];
        if (targetTrack && window.PLAYLIST) {
          window.PLAYLIST.push({ ...targetTrack });
          if (typeof window.savePlaylistToStorage === 'function') window.savePlaylistToStorage();
          if (typeof window.renderPlaylistDrawer === 'function') window.renderPlaylistDrawer();
          showToast(`已添加「${targetTrack.title}」至播放队列`, 'success');
        }
      });
    });

    // Album card click in grid
    contentEl.querySelectorAll('.album-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const albName = card.getAttribute('data-album');
        const artName = card.getAttribute('data-artist');
        const albMid = card.getAttribute('data-album-mid') || '';
        if (albName || albMid) {
          openAlbum(albName, artName, albMid);
        }
      });
    });
  }

  // ============================================================
  // 6. Playback Coordination
  // ============================================================
  function playSingleTrack(track) {
    if (!track) return;
    if (!window.PLAYLIST) window.PLAYLIST = [];

    // Find if already in queue
    const existingIdx = window.PLAYLIST.findIndex(t => t.title.toLowerCase() === track.title.toLowerCase());
    if (existingIdx >= 0) {
      if (typeof window.loadTrack === 'function') {
        window.loadTrack(existingIdx, true);
      }
    } else {
      // Add and play
      window.PLAYLIST.unshift({ ...track });
      if (typeof window.savePlaylistToStorage === 'function') window.savePlaylistToStorage();
      if (typeof window.renderPlaylistDrawer === 'function') window.renderPlaylistDrawer();
      if (typeof window.loadTrack === 'function') {
        window.loadTrack(0, true);
      }
    }
    showToast(`▶ 正在播放: ${track.title} - ${track.artist}`, 'music');
  }

  function playTracksSequence(tracks) {
    if (!tracks || tracks.length === 0) return;
    if (!window.PLAYLIST) window.PLAYLIST = [];

    // Replace or prepend tracks
    window.PLAYLIST.splice(0, 0, ...tracks);
    if (typeof window.savePlaylistToStorage === 'function') window.savePlaylistToStorage();
    if (typeof window.renderPlaylistDrawer === 'function') window.renderPlaylistDrawer();
    if (typeof window.loadTrack === 'function') {
      window.loadTrack(0, true);
    }
    showToast(`▶ 开始播放列表中的 ${tracks.length} 首歌曲`, 'music');
  }

  // ============================================================
  // 7. Track & Album Filters
  // ============================================================
  function getLocalTracksByArtist(artistName) {
    const list = Array.isArray(window.PLAYLIST) ? window.PLAYLIST : [];
    const target = (artistName || '').trim().toLowerCase();
    if (!target) return [];
    return list.filter(t => {
      const art = (t.artist || '').trim().toLowerCase();
      if (!art) return false;
      if (art === target) return true;
      const parts = art.split(/[\/,·&、|]/).map(p => p.trim());
      return parts.some(p => p === target || (p.length >= 2 && target.includes(p)));
    });
  }

  function getLocalTracksByAlbum(albumName, artistName = '') {
    const list = Array.isArray(window.PLAYLIST) ? window.PLAYLIST : [];
    const targetAlb = (albumName || '').trim().toLowerCase();
    if (!targetAlb) return [];
    const targetArt = (artistName || '').trim().toLowerCase();

    return list.filter(t => {
      const alb = (t.album || '').trim().toLowerCase();
      if (!alb) return false;
      const albMatch = (alb === targetAlb) || 
        (alb.replace(/[\s·\-_,()（）]/g, '') === targetAlb.replace(/[\s·\-_,()（）]/g, ''));
      if (!albMatch) return false;

      if (targetArt) {
        const art = (t.artist || '').trim().toLowerCase();
        if (art && !art.includes(targetArt) && !targetArt.includes(art)) {
          return false;
        }
      }
      return true;
    });
  }

  function extractAlbumsFromTracks(tracks, artistName) {
    const map = new Map();
    tracks.forEach(t => {
      const alb = t.album || '经典单曲集';
      if (!map.has(alb)) {
        map.set(alb, {
          name: alb,
          artist: t.artist || artistName,
          cover: t.cover || '',
          trackCount: 1
        });
      } else {
        const item = map.get(alb);
        item.trackCount++;
        if (!item.cover && t.cover) item.cover = t.cover;
      }
    });
    return [...map.values()];
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(msg, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    }
  }

  // ============================================================
  // 8. Bootstrap
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDOMElements);
  } else {
    initDOMElements();
  }

  // Global Expose
  window.AetheriaProfile = {
    openArtist,
    openAlbum,
    close: closeProfileModal,
    back: navigateBack,
    isOpen: isModalOpen
  };

})();
