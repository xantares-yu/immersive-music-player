const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { exec } = require('child_process');

const activeGenerationJobs = new Set();

const DEFAULT_PORT = 8080;
const ROOT_DIR = __dirname;

// =======================================================
// NetEase Cloud Music Engine & QR Login Session Storage
// =======================================================
let NCM = null;
try {
  NCM = require('NeteaseCloudMusicApi');
  console.log('[NetEase Engine] 🚀 NeteaseCloudMusicApi loaded successfully.');
} catch (e) {
  try {
    NCM = require(path.join(ROOT_DIR, 'node_modules', 'NeteaseCloudMusicApi'));
  } catch (err2) {
    console.warn('[NetEase Engine] Warning: Could not load NeteaseCloudMusicApi:', e.message);
  }
}

const NETEASE_COOKIE_FILE = path.join(ROOT_DIR, '.cookie');
const COOKIE_IGNORE_ATTRS = new Set(['path', 'domain', 'expires', 'max-age', 'samesite', 'secure', 'httponly', 'priority']);

function normalizeCookieString(raw) {
  if (!raw) return '';
  const picked = new Map();
  String(raw).split(/[,;\n]/).forEach(part => {
    const eq = part.indexOf('=');
    if (eq <= 0) return;
    const k = part.substring(0, eq).trim();
    const v = part.substring(eq + 1).trim();
    if (k && !COOKIE_IGNORE_ATTRS.has(k.toLowerCase()) && v) {
      picked.set(k, v);
    }
  });
  return Array.from(picked.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

let neteaseUserCookie = '';
try {
  if (fs.existsSync(NETEASE_COOKIE_FILE)) {
    neteaseUserCookie = normalizeCookieString(fs.readFileSync(NETEASE_COOKIE_FILE, 'utf8'));
    if (neteaseUserCookie) console.log('[NetEase Engine] 🟢 Restored existing NetEase session from .cookie');
  }
} catch (e) {}

function saveNeteaseCookie(c) {
  neteaseUserCookie = normalizeCookieString(c);
  try {
    fs.writeFileSync(NETEASE_COOKIE_FILE, neteaseUserCookie, 'utf8');
    console.log('[NetEase Engine] 💾 Saved normalized NetEase login cookie to disk.');
  } catch (e) {
    console.error('[NetEase Engine] Error saving cookie:', e.message);
  }
}

function clearNeteaseCookie() {
  neteaseUserCookie = '';
  try {
    if (fs.existsSync(NETEASE_COOKIE_FILE)) {
      fs.unlinkSync(NETEASE_COOKIE_FILE);
      console.log('[NetEase Engine] 🗑️ Cleared NetEase login cookie.');
    }
  } catch (e) {}
}

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
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
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
    timeout: 0
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
      if (typeof evictAudioUrl === 'function') evictAudioUrl(targetUrl);
      clientRes.writeHead(proxyRes.statusCode, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Audio-Expired': 'true'
      });
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

async function resolveNetEaseMV(songId, title) {
  try {
    let numId = null;
    if (songId && String(songId).startsWith('netease_')) {
      numId = String(songId).replace(/^netease_/, '');
    } else if (/^\d+$/.test(songId)) {
      numId = String(songId);
    }
    if (!numId) return null;

    const detailRes = await fetch(`https://music.163.com/api/song/detail/?id=${numId}&ids=[${numId}]`, {
      headers: { 'Referer': 'https://music.163.com/' },
      signal: AbortSignal.timeout(2000)
    });
    if (!detailRes.ok) return null;
    const detailData = await detailRes.json();
    const mvid = detailData?.songs?.[0]?.mvid;
    if (!mvid || mvid <= 0) return null;

    const mvRes = await fetch(`https://music.163.com/api/mv/detail?id=${mvid}&type=mp4`, {
      headers: { 'Referer': 'https://music.163.com/' },
      signal: AbortSignal.timeout(2000)
    });
    if (!mvRes.ok) return null;
    const mvData = await mvRes.json();
    const brs = mvData?.data?.brs;
    if (brs) {
      return brs['720'] || brs['1080'] || brs['480'] || brs['240'] || null;
    }
  } catch (e) {
    // silent fallback
  }
  return null;
}

async function autoGenerateMotionCover(safeId, coverUrl, title) {
  if (activeGenerationJobs.has(safeId)) return null;
  activeGenerationJobs.add(safeId);

  const coversDir = path.join(ROOT_DIR, 'covers');
  if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

  const imgPath = path.join(coversDir, `${safeId}_static.jpg`);
  const outVideoPath = path.join(coversDir, `${safeId}_motion.mp4`);

  try {
    // 1. Download cover image if not cached
    if (!fs.existsSync(imgPath) && coverUrl) {
      if (coverUrl.startsWith('http')) {
        const response = await fetch(coverUrl);
        if (response.ok) {
          const buf = Buffer.from(await response.arrayBuffer());
          if (buf.length >= 1024) {
            fs.writeFileSync(imgPath, buf);
          } else {
            console.warn(`[AutoMotion] Skipped downloading cover for ${safeId}: buffer too small (${buf.length} bytes)`);
          }
        }
      }
    }

    if (fs.existsSync(imgPath) && fs.statSync(imgPath).size >= 1024) {
      console.log(`[AutoMotion] Rendering seamless 8s canvas loop for ${title} (${safeId})...`);
      const filter = [
        'scale=720:720:force_original_aspect_ratio=increase',
        'crop=720:720',
        'zoompan=z=\'1.0+0.06*sin(2*PI*in/240)\':d=240:x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':s=720x720:fps=30',
        'eq=brightness=\'0.03*sin(2*PI*t/8)\':contrast=\'1.0+0.03*cos(2*PI*t/8)\'',
        'format=yuv420p'
      ].join(',');

      const cmd = `ffmpeg -y -loop 1 -i "${imgPath}" -vf "${filter}" -t 8 -c:v libx264 -preset ultrafast -crf 22 -movflags +faststart "${outVideoPath}"`;
      await new Promise((resolve) => {
        exec(cmd, { windowsHide: true }, () => resolve());
      });

      // 2. Validate resulting video file size
      if (fs.existsSync(outVideoPath)) {
        const stat = fs.statSync(outVideoPath);
        if (stat.size >= 1024) {
          // 3. Update registry
          const regFile = path.join(ROOT_DIR, 'motion_covers.json');
          let registry = {};
          if (fs.existsSync(regFile)) {
            try { registry = JSON.parse(fs.readFileSync(regFile, 'utf8')); } catch (e) {}
          }
          registry[safeId] = {
            video: `/covers/${safeId}_motion.mp4`,
            title: title || safeId,
            type: 'auto_generated_canvas',
            updatedAt: new Date().toISOString()
          };
          fs.writeFileSync(regFile, JSON.stringify(registry, null, 2), 'utf8');
          console.log(`[AutoMotion] ✓ Successfully auto-generated 8s canvas loop for ${safeId}!`);
          return `/covers/${safeId}_motion.mp4`;
        } else {
          console.warn(`[AutoMotion] Video generated for ${safeId} is corrupted (${stat.size} bytes), removing...`);
          try { fs.unlinkSync(outVideoPath); } catch (e) {}
        }
      } else {
        console.warn(`[AutoMotion] ffmpeg failed to output video for ${safeId}`);
      }
    }
  } catch (err) {
    console.error(`[AutoMotion] Failed for ${safeId}:`, err);
  } finally {
    activeGenerationJobs.delete(safeId);
  }
  return null;
}

// ============================================================
// Google Gemini Flash AI Vision Engine for Album Art Analysis
// ============================================================
function getGeminiApiKey() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const line of lines) {
        if (line.startsWith('GEMINI_API_KEY=')) {
          return line.split('=')[1].trim();
        }
      }
    } catch (e) {}
  }
  return process.env.GEMINI_API_KEY || '';
}

async function callGeminiVision(base64Data, mimeType, songTitle, songArtist) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error('No GEMINI_API_KEY found in .env');

  // Try gemini-3.8-flash first, then ultra-fast gemini-flash-lite-latest fallback
  const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-lite-latest', 'gemini-flash-latest'];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const prompt = `You are an AI visual art director for a music player.
Analyze this album cover for "${songTitle || 'Unknown'}" by "${songArtist || 'Unknown'}".
Determine whether it contains a person/character (e.g. portrait, bust, face, singer) or is a scenery/nature/abstract/typography/still-life scene.
If person is detected, estimate the person's chest center position (as percentage from top, 0-100) and horizontal center position (0-100).
Return ONLY a valid JSON object matching this schema:
{
  "has_person": boolean,
  "confidence": number,
  "subject": "person" or "scene",
  "person_chest_y_percent": number or null,
  "person_center_x_percent": number or null,
  "recommended_motion": "breathing" or "panning",
  "reason": "concise Chinese explanation in 1 sentence describing what visual elements are in the cover"
}`;

      const postData = JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } },
            { text: prompt }
          ]
        }]
      });

      const urlStr = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const resultText = await new Promise((resolve, reject) => {
        const parsed = new URL(urlStr);
        const req = https.request(parsed, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 12000
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsedRes = JSON.parse(data);
                const text = parsedRes.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) resolve(text);
                else reject(new Error('Empty candidate in response'));
              } catch (e) {
                reject(new Error('JSON parse error: ' + data));
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 160)}`));
            }
          });
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[0]);
        parsedJson.modelUsed = modelName;
        return parsedJson;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[GeminiVision] Model ${modelName} failed, trying next... Reason:`, err.message.slice(0, 90));
    }
  }

  throw lastError || new Error('All Gemini Vision models failed');
}

// ============================================================
// Official High-Fidelity Album & Artist Metadata Resolvers
// ============================================================
// Persistent Disk & Memory Multi-Tier Cache for Artist/Album Metadata
const METADATA_CACHE_FILE = path.join(ROOT_DIR, 'metadata_cache.json');
const METADATA_CACHE = new Map();

// Ephemeral High-Speed In-Memory Cache for Audio Stream Tokens (14-min strict TTL)
const AUDIO_STREAM_CACHE = new Map();
const AUDIO_STREAM_TTL = 14 * 60 * 1000; // 14 minutes TTL (safely expires before NetEase 20-30m token cutoff)

function getCachedAudioUrl(cacheKey) {
  if (!AUDIO_STREAM_CACHE.has(cacheKey)) return null;
  const entry = AUDIO_STREAM_CACHE.get(cacheKey);
  if (!entry || !entry.url || Date.now() > entry.expiresAt) {
    AUDIO_STREAM_CACHE.delete(cacheKey);
    return null;
  }
  return entry.url;
}

function setCachedAudioUrl(cacheKey, url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http') || url.includes('/404') || url.includes('jd-musicrep-ts')) return;
  AUDIO_STREAM_CACHE.set(cacheKey, {
    url,
    expiresAt: Date.now() + AUDIO_STREAM_TTL
  });
}

function evictAudioUrl(targetUrl) {
  if (!targetUrl) return;
  for (const [k, v] of AUDIO_STREAM_CACHE.entries()) {
    if (v && v.url && (v.url === targetUrl || targetUrl.includes(v.url) || v.url.includes(targetUrl))) {
      AUDIO_STREAM_CACHE.delete(k);
    }
  }
}

// Initialize cache from disk and clean out any stale legacy audio entries
try {
  if (fs.existsSync(METADATA_CACHE_FILE)) {
    const diskData = JSON.parse(fs.readFileSync(METADATA_CACHE_FILE, 'utf8'));
    let purgedCount = 0;
    for (const [k, v] of Object.entries(diskData)) {
      if (k.startsWith('audio_')) {
        purgedCount++;
      } else {
        METADATA_CACHE.set(k, v);
      }
    }
    console.log(`[Server] Loaded ${METADATA_CACHE.size} persistent artist/album metadata entries (purged ${purgedCount} stale audio stream tokens).`);
  }
} catch (e) {
  console.warn('[Server] Error loading metadata_cache.json:', e.message);
}

function saveMetadataCacheToDisk() {
  try {
    const obj = {};
    for (const [k, v] of METADATA_CACHE.entries()) {
      if (!k.startsWith('audio_')) {
        obj[k] = v;
      }
    }
    fs.writeFileSync(METADATA_CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {}
}

function putMetadataCache(key, value) {
  if (key.startsWith('audio_')) {
    setCachedAudioUrl(key, value);
    return;
  }
  METADATA_CACHE.set(key, value);
  saveMetadataCacheToDisk();
}

function httpsGetJson(targetUrl, referer = 'https://y.qq.com/', timeout = 4500) {
  return new Promise((resolve) => {
    const req = https.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer
      },
      timeout
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

function httpGetText(targetUrl) {
  return new Promise((resolve) => {
    const lib = targetUrl.startsWith('https:') ? https : http;
    lib.get(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

function normalizeSearchText(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .replace(/[\s\-_'"`~·!@#$%^&*()（）\[\]【】{}|\\:;,.?<>，。：；！？“”‘’《》、～]+/g, '')
    .trim();
}

function isBadAudioTrack(name, targetTitle) {
  if (!name) return false;
  const normN = normalizeSearchText(name);
  const normT = normalizeSearchText(targetTitle);
  const badWords = [
    '伴奏', 'instrumental', 'karaoke', 'ktv', 'dj', 'remix', '翻唱', 'cover',
    '片段', '铃声', '串烧', 'typebeat', '纯音乐', '钢琴版', '吉他版'
  ];
  return badWords.some(w => !normT.includes(w) && normN.includes(w));
}

function isAccurateSongMatch(candName, candArtists, targetTitle, targetArtist) {
  if (!candName || !targetTitle) return false;
  if (isBadAudioTrack(candName, targetTitle)) return false;

  const normTargetTitle = normalizeSearchText(targetTitle);
  const normCandName = normalizeSearchText(candName);
  const normTargetArtist = normalizeSearchText(targetArtist);

  let normCandArtists = '';
  if (Array.isArray(candArtists)) {
    normCandArtists = normalizeSearchText(candArtists.map(a => typeof a === 'object' ? a.name : a).join(' '));
  } else {
    normCandArtists = normalizeSearchText(candArtists);
  }

  // 1. Title matching:
  // Cand name must equal target title, or start with target title (e.g. "消愁" vs "消愁 (Live版)"),
  // or target title starts with cand name
  const titleMatches = (normCandName === normTargetTitle) ||
                       normCandName.startsWith(normTargetTitle) ||
                       normTargetTitle.startsWith(normCandName);
  if (!titleMatches) return false;

  // 2. Artist matching (if target artist provided):
  if (normTargetArtist) {
    const artistMatches = normCandArtists.includes(normTargetArtist) ||
                          normTargetArtist.includes(normCandArtists);
    if (!artistMatches) return false;
  }

  return true;
}

function fetchJsonWithTimeout(url, headers = {}, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, { headers, timeout: timeoutMs }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function fetchLocationWithTimeout(url, headers = {}, timeoutMs = 4500) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, { headers, timeout: timeoutMs }, (res) => {
      res.resume();
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(res.headers.location);
      }
      if (res.statusCode === 200) {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          const trimmed = d.trim();
          if (trimmed.startsWith('http')) {
            return resolve(trimmed);
          }
          try {
            const j = JSON.parse(d);
            const found = j.url || j.data?.[0]?.url || j.data?.url || (Array.isArray(j.data) ? j.data[0] : null);
            if (found && typeof found === 'string' && found.startsWith('http')) {
              return resolve(found);
            }
          } catch (e) {}
          resolve(null);
        });
        return;
      }
      resolve(null);
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function checkAudioStreamValid(targetUrl, timeoutMs = 1500, redirectCount = 0) {
  if (!targetUrl || typeof targetUrl !== 'string') return Promise.resolve(false);
  if (!targetUrl.startsWith('http')) return Promise.resolve(false);
  if (targetUrl.includes('jd-musicrep-ts') || targetUrl.includes('/404')) {
    return Promise.resolve(false);
  }
  if (redirectCount > 3) return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const mod = parsed.protocol === 'https:' ? https : http;
      const req = mod.request({
        method: 'GET',
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Range': 'bytes=0-10'
        },
        timeout: timeoutMs
      }, (res) => {
        req.destroy();

        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          let nextUrl = res.headers.location;
          if (!nextUrl.startsWith('http')) {
            nextUrl = new URL(nextUrl, targetUrl).toString();
          }
          return checkAudioStreamValid(nextUrl, timeoutMs, redirectCount + 1).then(resolve);
        }

        if (res.statusCode >= 400) return resolve(false);

        const cr = res.headers['content-range'];
        if (cr) {
          const match = cr.match(/\/(\d+)$/);
          if (match && match[1]) {
            const totalSize = parseInt(match[1], 10);
            return resolve(totalSize >= 1200000);
          }
        }
        const cl = res.headers['content-length'];
        if (cl) {
          const totalSize = parseInt(cl, 10);
          return resolve(totalSize >= 1200000);
        }
        resolve(res.statusCode === 200 || res.statusCode === 206);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch (e) {
      resolve(false);
    }
  });
}

async function getNeteasePlayableUrl(id) {
  if (!id || !/^\d+$/.test(String(id))) return null;
  const cleanId = String(id).trim();

  // 0. VIP / User Authenticated Stream (Direct High-Res / Lossless CDN via NCM)
  if (neteaseUserCookie && NCM && typeof NCM.song_url_v1 === 'function') {
    try {
      const res = await NCM.song_url_v1({ id: cleanId, level: 'lossless', cookie: neteaseUserCookie });
      const songData = res?.body?.data?.[0];
      const u = songData?.url;
      if (u && typeof u === 'string' && u.startsWith('http') && !u.includes('/404')) {
        const fixed = u.replace(/^http:\/\//i, 'https://');
        const isValid = await checkAudioStreamValid(fixed, 1500);
        if (isValid) return fixed;
      }
    } catch (e) {}
  }

  // 1. Fast attempt: NetEase Official Enhance API (non-VIP full songs, responds in ~80ms)
  try {
    const json = await fetchJsonWithTimeout(
      `https://music.163.com/api/song/enhance/player/url?id=${cleanId}&ids=[${cleanId}]&br=320000`,
      {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://music.163.com/'
      },
      1200
    );
    const u = json?.data?.[0]?.url;
    if (u && typeof u === 'string' && u.startsWith('http') && !u.includes('/404') && !u.includes('jd-musicrep-ts')) {
      const fixed = u.replace(/^http:\/\//i, 'https://');
      const isValid = await checkAudioStreamValid(fixed, 1200);
      if (isValid) return fixed;
    }
  } catch (e) {}

  // 2. High-Speed Concurrent VIP Unblock Race (Promise.any)
  // Concurrently queries multiple independent mirrors to return the fastest valid full-length stream (<300ms)
  const racers = [
    // Engine A: byfuns (High-bitrate studio stream)
    async () => {
      const bfRes = await fetchLocationWithTimeout(
        `https://api.byfuns.top/1/?id=${cleanId}&level=exhigh`,
        { 'User-Agent': 'Mozilla/5.0' },
        3500
      );
      if (bfRes && typeof bfRes === 'string' && bfRes.startsWith('http') && !bfRes.includes('/404') && !bfRes.includes('jd-musicrep-ts')) {
        const isValid = await checkAudioStreamValid(bfRes, 2000);
        if (isValid) return bfRes;
      }
      throw new Error('byfuns fail');
    },
    // Engine B: oiapi (Genuine official master stream)
    async () => {
      const oiJson = await fetchJsonWithTimeout(
        `https://oiapi.net/api/Music_163?id=${cleanId}`,
        { 'User-Agent': 'Mozilla/5.0' },
        3500
      );
      const oiUrl = oiJson?.data?.[0]?.url;
      if (oiUrl && typeof oiUrl === 'string' && oiUrl.startsWith('http') && !oiUrl.includes('/404') && !oiUrl.includes('jd-musicrep-ts')) {
        const isValid = await checkAudioStreamValid(oiUrl, 2000);
        if (isValid) return oiUrl;
      }
      throw new Error('oiapi fail');
    },
    // Engine C: qijieya Meting
    async () => {
      const qjUrl = await fetchLocationWithTimeout(
        `https://api.qijieya.cn/meting/?type=url&id=${cleanId}`,
        { 'User-Agent': 'Mozilla/5.0' },
        3500
      );
      if (qjUrl && typeof qjUrl === 'string' && qjUrl.startsWith('http') && !qjUrl.includes('/404') && !qjUrl.includes('jd-musicrep-ts')) {
        const isValid = await checkAudioStreamValid(qjUrl, 2000);
        if (isValid) return qjUrl;
      }
      throw new Error('qijieya fail');
    },
    // Engine D: Outer URL redirect
    async () => {
      const outerUrl = await fetchLocationWithTimeout(
        `http://music.163.com/song/media/outer/url?id=${cleanId}.mp3`,
        { 'User-Agent': 'Mozilla/5.0' },
        2500
      );
      if (outerUrl && typeof outerUrl === 'string' && outerUrl.startsWith('http') && !outerUrl.includes('/404') && !outerUrl.includes('jd-musicrep-ts')) {
        const isValid = await checkAudioStreamValid(outerUrl, 1800);
        if (isValid) return outerUrl;
      }
      throw new Error('outerUrl fail');
    }
  ];

  try {
    const fastWinner = await Promise.any(racers.map(fn => fn()));
    if (fastWinner) return fastWinner;
  } catch (e) {}

  return null;
}

async function resolveAudioStreamOnline(title, artist = '', neteaseId = '', forceRefresh = false) {
  if (!title && !neteaseId) return null;
  const cleanTitle = (title || '').split(/[(（]/)[0].trim();
  const cleanArtist = (artist || '').split(/·|&|\/|ft\.|feat\./i)[0].trim();
  const q = `${cleanTitle} ${cleanArtist}`.trim();
  const targetNeId = (neteaseId || '').trim();
  const cacheKey = `audio_${targetNeId}_${cleanTitle}_${cleanArtist}`.toLowerCase();

  if (!forceRefresh) {
    const cached = getCachedAudioUrl(cacheKey);
    if (cached) return cached;
  } else {
    AUDIO_STREAM_CACHE.delete(cacheKey);
  }

  // Strategy 1: Direct NetEase ID Resolution (Instant NetEase 320k stream + Full VIP unblock)
  if (targetNeId && /^\d+$/.test(targetNeId)) {
    try {
      const neDirectUrl = await getNeteasePlayableUrl(targetNeId);
      if (neDirectUrl) {
        setCachedAudioUrl(cacheKey, neDirectUrl);
        return neDirectUrl;
      }
    } catch (e) {}
  }

  // Strategy 2: NetEase Official CloudSearch Engine with Title & Artist Matching (NetEase Priority)
  if (q) {
    try {
      let songs = null;
      const searchRes = await httpsGetJson(`https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(q)}&type=1&offset=0&limit=15`, 'https://music.163.com/');
      songs = searchRes?.result?.songs;

      if (!Array.isArray(songs) || songs.length === 0) {
        // Fallback: search by title only if title + artist returned empty
        if (cleanTitle && cleanTitle !== q) {
          const titleSearchRes = await httpsGetJson(`https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(cleanTitle)}&type=1&offset=0&limit=15`, 'https://music.163.com/');
          songs = titleSearchRes?.result?.songs;
        }
      }

      if (Array.isArray(songs) && songs.length > 0) {
        // Filter candidates: check title and artist match
        const validCandidates = songs.filter(s => {
          if (!s || !s.id || !s.name) return false;
          return isAccurateSongMatch(s.name, s.ar || s.artists, cleanTitle, cleanArtist);
        });

        // Sort candidates: exact title match first
        validCandidates.sort((a, b) => {
          const normA = normalizeSearchText(a.name);
          const normB = normalizeSearchText(b.name);
          const normT = normalizeSearchText(cleanTitle);
          const aExact = normA === normT ? 1 : 0;
          const bExact = normB === normT ? 1 : 0;
          return bExact - aExact;
        });

        // Try resolving audio sequentially on verified candidates
        for (const cand of validCandidates.slice(0, 4)) {
          try {
            const candUrl = await getNeteasePlayableUrl(cand.id);
            if (candUrl) {
              setCachedAudioUrl(cacheKey, candUrl);
              return candUrl;
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }


  // Strategy 3: Kuwo Anti-Server Fallback with STRICT Title & Artist Matching
  if (q) {
    try {
      const rawKuwo = await httpGetText(`http://search.kuwo.cn/r.s?all=${encodeURIComponent(q)}&ft=music&itemset=web_2013&client=kt&pn=0&rn=12&rformat=json&encoding=utf8`);
      if (rawKuwo) {
        let parsedObj = null;
        try {
          const vm = require('vm');
          parsedObj = vm.runInNewContext('(' + rawKuwo + ')', {});
        } catch (e) {}

        if (parsedObj && Array.isArray(parsedObj.abslist)) {
          const validKuwo = parsedObj.abslist.filter(item => {
            const sName = (item.SONGNAME || '').replace(/&nbsp;/g, ' ');
            const sArtist = (item.ARTIST || '').replace(/&nbsp;/g, ' ');
            return isAccurateSongMatch(sName, sArtist, cleanTitle, cleanArtist);
          });

          for (const item of validKuwo.slice(0, 3)) {
            if (item.DC_TARGETID) {
              const audioUrl = await httpGetText(`http://antiserver.kuwo.cn/anti.s?type=convert_url&rid=${item.DC_TARGETID}&format=mp3&response=url`);
              if (audioUrl && audioUrl.startsWith('http') && !audioUrl.includes('/404')) {
                const trimmed = audioUrl.trim();
                const isValid = await checkAudioStreamValid(trimmed);
                if (isValid) {
                  setCachedAudioUrl(cacheKey, trimmed);
                  return trimmed;
                }
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  return null;
}

async function getOfficialAlbumDetails(albumName, artistName = '', albumMid = '') {
  let cleanAlbum = (albumName || '').replace(/[《》【】[\]()（）]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanArtist = (artistName || '').split(/·|&|\/|ft\.|feat\./i)[0].trim();
  const targetMid = (albumMid || '').trim();
  const cacheKey = `album_${cleanAlbum}_${cleanArtist}_${targetMid}`.toLowerCase();
  if (METADATA_CACHE.has(cacheKey)) return METADATA_CACHE.get(cacheKey);

  // Strategy 1: Direct QQ Music albumMID fetch (100% accurate, 0ms search delay)
  let midToFetch = targetMid;

  // If no direct MID, search QQ Music for album
  if (!midToFetch && cleanAlbum) {
    try {
      const q = encodeURIComponent(`${cleanAlbum} ${cleanArtist}`.trim());
      const searchRes = await httpsGetJson(`https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=12&w=${q}&format=json&t=8`);
      let albumList = searchRes?.data?.album?.list;
      if (!Array.isArray(albumList) || albumList.length === 0) {
        const fbRes = await httpsGetJson(`https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=8&w=${encodeURIComponent(cleanAlbum)}&format=json&t=8`);
        albumList = fbRes?.data?.album?.list;
      }

      if (Array.isArray(albumList) && albumList.length > 0) {
        let best = null;
        const normTarget = cleanAlbum.toLowerCase().replace(/[\s·\-_,()（）]/g, '');

        // 1. Strict title match + artist match
        for (const a of albumList) {
          const normA = (a.albumName || '').toLowerCase().replace(/[\s·\-_,()（）]/g, '');
          const matchTitle = normA === normTarget || normA.includes(normTarget) || normTarget.includes(normA);
          const matchArtist = cleanArtist ? (a.singerName || '').toLowerCase().includes(cleanArtist.toLowerCase()) : true;
          if (matchTitle && matchArtist) {
            best = a;
            break;
          }
        }

        // 2. Title match only if no artist specified
        if (!best && !cleanArtist) {
          for (const a of albumList) {
            const normA = (a.albumName || '').toLowerCase().replace(/[\s·\-_,()（）]/g, '');
            if (normA === normTarget || normA.includes(normTarget) || normTarget.includes(normA)) {
              best = a;
              break;
            }
          }
        }

        if (best?.albumMID) midToFetch = best.albumMID;
      }
    } catch (e) {
      console.warn('[Server] QQ album search warning:', e.message);
    }
  }

  // If we have a target QQ Music album MID, fetch full CD details!
  if (midToFetch) {
    try {
      const detailRes = await httpsGetJson(`https://c.y.qq.com/v8/fcg-bin/fcg_v8_album_info_cp.fcg?albummid=${midToFetch}&format=json`);
      const songList = detailRes?.data?.list;
      const albumMeta = detailRes?.data;
      if (Array.isArray(songList) && songList.length > 0) {
        const coverUrl = `https://y.gtimg.cn/music/photo_new/T002R500x500M000${midToFetch}.jpg`;
        const officialTracks = songList.map((s, idx) => {
          const sArtists = Array.isArray(s.singer) ? s.singer.map(a => a.name).join(' / ') : (albumMeta?.singername || cleanArtist || '正版音乐人');
          const trackNumber = idx + 1;
          return {
            id: `qq_${s.songmid || s.songid || (midToFetch + '_' + trackNumber)}`,
            source: 'qq',
            sourceId: s.songmid || s.songid,
            trackNo: trackNumber,
            title: s.songname || s.name || `Track ${trackNumber}`,
            artist: sArtists,
            album: albumMeta?.name || cleanAlbum,
            cover: coverUrl,
            genre: 'Hi-Res Lossless Master',
            audioUrl: null,
            badge: 'Hi-Res · 原声母带'
          };
        });

        // Any official album with 1 or more songs
        if (officialTracks.length >= 1) {
          const result = {
            name: albumMeta?.name || cleanAlbum,
            artist: albumMeta?.singername || cleanArtist,
            cover: coverUrl,
            publishDate: albumMeta?.aDate || '',
            company: albumMeta?.company || '',
            desc: albumMeta?.desc || '',
            totalTracks: officialTracks.length,
            tracks: officialTracks
          };
          putMetadataCache(cacheKey, result);
          return result;
        }
      }
    } catch (e) {
      console.warn('[Server] QQ album detail fetch warning:', e.message);
    }
  }

  // Strategy 2: NetEase Official Album Engine Fallback (Guarantees Western, Deluxe & Indie Albums)
  try {
    const neQ = encodeURIComponent(`${cleanAlbum} ${cleanArtist}`.trim());
    const neSearch = await httpsGetJson(`https://music.163.com/api/cloudsearch/pc?s=${neQ}&type=10&offset=0&limit=5`, 'https://music.163.com/');
    const neAlbums = neSearch?.result?.albums;
    if (Array.isArray(neAlbums) && neAlbums.length > 0) {
      let bestNe = neAlbums[0];
      const normTarget = cleanAlbum.toLowerCase().replace(/[\s·\-_,()（）]/g, '');
      for (const a of neAlbums) {
        const normA = (a.name || '').toLowerCase().replace(/[\s·\-_,()（）]/g, '');
        if (normA === normTarget || normA.includes(normTarget) || normTarget.includes(normA)) {
          bestNe = a;
          break;
        }
      }

      if (bestNe?.id) {
        const neDetail = await httpsGetJson(`https://music.163.com/api/album/${bestNe.id}`, 'https://music.163.com/');
        const neSongs = neDetail?.album?.songs;
        if (Array.isArray(neSongs) && neSongs.length > 0) {
          const coverUrl = neDetail.album?.picUrl || bestNe.picUrl;
          const officialTracks = neSongs.map((s, idx) => ({
            id: `netease_${s.id}`,
            neteaseId: s.id,
            source: 'netease',
            sourceId: s.id,
            trackNo: idx + 1,
            title: s.name,
            artist: Array.isArray(s.ar || s.artists) ? (s.ar || s.artists).map(a => a.name).join(' / ') : cleanArtist,
            album: neDetail.album.name || cleanAlbum,
            cover: s.al?.picUrl || s.album?.picUrl || coverUrl,
            genre: 'Hi-Res Lossless Master',
            audioUrl: null,
            badge: '网易云正版 · 原声音轨'
          }));

          const result = {
            name: neDetail.album.name || cleanAlbum,
            artist: neDetail.album.artist?.name || cleanArtist,
            cover: coverUrl,
            publishDate: neDetail.album.publishTime ? new Date(neDetail.album.publishTime).toISOString().slice(0, 10) : '',
            company: neDetail.album.company || '',
            desc: neDetail.album.description || '',
            totalTracks: officialTracks.length,
            tracks: officialTracks
          };
          putMetadataCache(cacheKey, result);
          return result;
        }
      }
    }
  } catch (e) {
    console.warn('[Server] NetEase album fallback warning:', e.message);
  }

  return null;
}

async function getOfficialArtistDetails(artistName) {
  const cleanArtist = (artistName || '').split(/·|&|\/|ft\.|feat\./i)[0].trim();
  if (!cleanArtist) return null;
  const cacheKey = `artist_${cleanArtist}`.toLowerCase();
  if (METADATA_CACHE.has(cacheKey)) return METADATA_CACHE.get(cacheKey);

  try {
    const q = encodeURIComponent(cleanArtist);
    
    // Concurrently fetch:
    // 1. QQ Singer Mid & info
    // 2. QQ Hot songs (searched by artist name, returns top hits like 晴天, 七里香, 稻香, etc.)
    // 3. NetEase artist search (as avatar/song fallback)
    const [qqSingerSearch, qqSongsSearch, neteaseSearch] = await Promise.all([
      httpsGetJson(`https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=5&w=${q}&format=json&t=9`),
      httpsGetJson(`https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=35&w=${q}&format=json`),
      httpsGetJson(`https://music.163.com/api/cloudsearch/pc?s=${q}&type=100&offset=0&limit=3`, 'https://music.163.com/')
    ]);

    const qqSinger = qqSingerSearch?.data?.singer?.list?.[0];
    const singerMid = qqSinger?.singerMID;
    const avatarUrl = singerMid 
      ? `https://y.gtimg.cn/music/photo_new/T001R500x500M000${singerMid}.jpg`
      : (neteaseSearch?.result?.artists?.[0]?.picUrl || '');

    // Fetch Singer Official Albums & NetEase artist details in parallel
    const promises = [];
    if (singerMid) {
      promises.push(httpsGetJson(`https://c.y.qq.com/v8/fcg-bin/fcg_v8_singer_album.fcg?singermid=${singerMid}&order=time&begin=0&num=30&format=json`));
    } else {
      promises.push(Promise.resolve(null));
    }

    const neteaseArtistId = neteaseSearch?.result?.artists?.[0]?.id;
    if (neteaseArtistId) {
      promises.push(httpsGetJson(`https://music.163.com/api/artist/${neteaseArtistId}`, 'https://music.163.com/'));
    } else {
      promises.push(Promise.resolve(null));
    }

    const [albumsRes, neteaseArtistRes] = await Promise.all(promises);

    // Build NetEase song map to link neteaseId to top hits for 1-click NetEase streaming
    const neteaseSongMap = new Map();
    if (neteaseArtistRes && Array.isArray(neteaseArtistRes.hotSongs)) {
      for (const ns of neteaseArtistRes.hotSongs) {
        if (ns.name && ns.id) {
          const norm = ns.name.trim().toLowerCase().replace(/[\s·\-_,()（）]/g, '');
          if (!neteaseSongMap.has(norm)) {
            neteaseSongMap.set(norm, ns.id);
          }
        }
      }
    }

    // 1. Top Songs: prioritize QQ Music's real top hits (晴天, 七里香, 稻香, etc.), strictly filtered by lead singer!
    let topSongs = [];
    const rawQqSongs = qqSongsSearch?.data?.song?.list;
    if (Array.isArray(rawQqSongs) && rawQqSongs.length > 0) {
      const cleanLower = cleanArtist.toLowerCase();
      const filtered = rawQqSongs.filter(s => {
        const primary = (s.singer && s.singer[0] ? s.singer[0].name : '').toLowerCase();
        // Lead artist must contain cleanArtist, or match
        return primary.includes(cleanLower) || cleanLower.includes(primary);
      });

      topSongs = filtered.map((s, idx) => {
        const normTitle = (s.songname || '').trim().toLowerCase().replace(/[\s·\-_,()（）]/g, '');
        const matchedNeteaseId = neteaseSongMap.get(normTitle) || null;
        return {
          id: `qq_${s.songmid || s.songid}`,
          source: 'qq',
          sourceId: s.songmid || s.songid,
          neteaseId: matchedNeteaseId,
          trackNo: idx + 1,
          title: s.songname,
          artist: Array.isArray(s.singer) ? s.singer.map(a => a.name).join(' / ') : cleanArtist,
          album: s.albumname || '精选单曲',
          cover: s.albummid ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${s.albummid}.jpg` : avatarUrl,
          genre: 'Hi-Res Lossless Master',
          audioUrl: null,
          badge: matchedNeteaseId ? '网易云优先 · 正版音源' : '官方正版热搜'
        };
      });
    }

    // Fallback to NetEase hotSongs if QQ songs was empty, strictly filtering out songs where primary artist is someone else!
    if (topSongs.length === 0 && neteaseArtistRes && Array.isArray(neteaseArtistRes.hotSongs)) {
      const cleanLower = cleanArtist.toLowerCase();
      const neFiltered = neteaseArtistRes.hotSongs.filter(s => {
        const primary = (s.artists && s.artists[0] ? s.artists[0].name : '').toLowerCase();
        return primary.includes(cleanLower) || cleanLower.includes(primary);
      });

      topSongs = neFiltered.map((s, idx) => ({
        id: `netease_${s.id}`,
        neteaseId: s.id,
        source: 'netease',
        sourceId: s.id,
        trackNo: idx + 1,
        title: s.name,
        artist: Array.isArray(s.artists) ? s.artists.map(a => a.name).join(' / ') : cleanArtist,
        album: s.album?.name || '热门精选',
        cover: s.album?.picUrl || avatarUrl,
        genre: 'Hi-Res Lossless',
        audioUrl: null,
        badge: '网易云正版热门'
      }));
    }

    // 2. Official Albums: strictly filter by singerName so compilations or other singers' albums NEVER mix in!
    let albums = [];
    const aList = albumsRes?.data?.list;
    if (Array.isArray(aList)) {
      const cleanLower = cleanArtist.toLowerCase();
      albums = aList
        .filter(a => {
          const singer = (a.singerName || '').toLowerCase();
          return singer.includes(cleanLower) || cleanLower.includes(singer);
        })
        .map(a => ({
          name: a.albumName,
          artist: a.singerName || cleanArtist,
          cover: `https://y.gtimg.cn/music/photo_new/T002R300x300M000${a.albumMID}.jpg`,
          publishDate: a.pubTime || '',
          trackCount: a.total_song_num || a.cur_song_num || 10,
          albumMid: a.albumMID
        }));
    }

    const result = {
      name: qqSinger?.singerName || cleanArtist,
      avatar: avatarUrl,
      albumCount: albums.length || 20,
      songCount: topSongs.length || 30,
      topSongs,
      albums
    };

    putMetadataCache(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[Server] Artist details error:', err.message);
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // ==========================================
  // NetEase Cloud Music Authentication & Full Network API Endpoints
  // ==========================================

  // 1. QR Login Key
  if (pathname === '/api/netease/qr/key') {
    if (!NCM) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'NeteaseCloudMusicApi not available' }));
      return;
    }
    try {
      const r = await NCM.login_qr_key({ timestamp: Date.now() });
      const key = r.body?.data?.unikey;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ key }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 2. QR Login Image Generator
  if (pathname === '/api/netease/qr/create') {
    const key = parsedUrl.query?.key;
    if (!key) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Missing key parameter' }));
      return;
    }
    try {
      const r = await NCM.login_qr_create({ key, qrimg: true, timestamp: Date.now() });
      const d = r.body?.data;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ img: d?.qrimg, url: d?.qrurl }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 3. QR Login Status Poller
  if (pathname === '/api/netease/qr/check') {
    const key = parsedUrl.query?.key;
    if (!key) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Missing key parameter' }));
      return;
    }
    try {
      let r = await NCM.login_qr_check({ key, timestamp: Date.now() });
      let body = r.body || {};
      let code = Number(body.code || r.code);
      let cookie = r.cookie || body.cookie || '';
      
      // 803 = Auth success, 802 = Scanned awaiting confirm, 801 = Waiting scan, 800 = Expired
      if (code === 803) {
        if (!cookie) {
          try {
            const retry = await NCM.login_qr_check({ key, timestamp: Date.now() });
            cookie = retry.cookie || retry.body?.cookie || '';
          } catch (e) {}
        }
        if (cookie) saveNeteaseCookie(cookie);
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        code,
        message: body.message || r.message || '',
        cookie: code === 803 ? 'SAVED' : null
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 4. NetEase User Account Status
  if (pathname === '/api/netease/user/status') {
    if (!neteaseUserCookie) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ loggedIn: false }));
      return;
    }
    try {
      let r = await NCM.login_status({ cookie: neteaseUserCookie });
      let data = r.body?.data || r.body || {};
      let profile = data.profile || r.body?.profile;
      let account = data.account || r.body?.account;

      if (!profile || !profile.userId) {
        const acc = await NCM.user_account({ cookie: neteaseUserCookie, timestamp: Date.now() });
        profile = acc.body?.profile || profile;
        account = acc.body?.account || account;
      }

      if (profile && (profile.userId || profile.nickname)) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          loggedIn: true,
          profile: {
            userId: profile.userId || account?.id,
            nickname: profile.nickname || '网易云用户',
            avatarUrl: profile.avatarUrl || '',
            vipType: account?.vipType || profile.vipType || 0,
            signature: profile.signature || ''
          }
        }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ loggedIn: false }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ loggedIn: false, error: err.message }));
    }
    return;
  }

  // 5. NetEase Logout
  if (pathname === '/api/netease/logout') {
    clearNeteaseCookie();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 6. NetEase User Playlists (e.g. Favorite Songs)
  if (pathname === '/api/netease/user/playlists') {
    if (!neteaseUserCookie) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Not logged in' }));
      return;
    }
    try {
      let rStatus = await NCM.login_status({ cookie: neteaseUserCookie });
      let data = rStatus.body?.data || rStatus.body || {};
      let uid = data.profile?.userId || data.account?.id;
      if (!uid) {
        const acc = await NCM.user_account({ cookie: neteaseUserCookie });
        uid = acc.body?.profile?.userId || acc.body?.account?.id;
      }
      if (!uid) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'User ID not found' }));
        return;
      }
      const r = await NCM.user_playlist({ uid, cookie: neteaseUserCookie, limit: 30 });
      const list = (r.body?.playlist || []).map(p => ({
        id: p.id,
        name: p.name,
        coverImgUrl: p.coverImgUrl,
        trackCount: p.trackCount,
        playCount: p.playCount
      }));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ playlists: list }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 7. NetEase Playlist Tracks (Sync to Local Queue)
  if (pathname === '/api/netease/playlist/tracks') {
    const id = parsedUrl.query?.id;
    const limit = parseInt(parsedUrl.query?.limit || '50', 10);
    if (!id) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Missing playlist id' }));
      return;
    }
    try {
      const r = await NCM.playlist_track_all({ id, limit, cookie: neteaseUserCookie });
      const songs = r.body?.songs || [];
      const tracks = songs.map(s => {
        const art = Array.isArray(s.ar) ? s.ar.map(a => a.name).join(' / ') : (s.ar?.name || '未知歌手');
        const alb = s.al?.name || '精选单曲';
        let pic = s.al?.picUrl || '';
        if (pic && pic.startsWith('http')) {
          pic = pic.replace(/^http:\/\//i, 'https://');
          if (!pic.includes('?param=')) pic += '?param=300y300';
        }
        return {
          id: `netease_${s.id}`,
          sourceId: s.id,
          neteaseId: s.id,
          title: s.name,
          artist: art,
          album: alb,
          cover: pic,
          audioUrl: null,
          source: 'netease',
          badge: '网易云原声'
        };
      });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ tracks }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 8. NetEase Daily Recommend Songs
  if (pathname === '/api/netease/recommend/songs') {
    if (!neteaseUserCookie) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Not logged in' }));
      return;
    }
    try {
      const r = await NCM.recommend_songs({ cookie: neteaseUserCookie });
      const songs = r.body?.data?.dailySongs || [];
      const tracks = songs.map(s => {
        const art = Array.isArray(s.ar) ? s.ar.map(a => a.name).join(' / ') : '未知歌手';
        const alb = s.al?.name || '每日推荐';
        let pic = s.al?.picUrl || '';
        if (pic && pic.startsWith('http')) {
          pic = pic.replace(/^http:\/\//i, 'https://');
          if (!pic.includes('?param=')) pic += '?param=300y300';
        }
        return {
          id: `netease_${s.id}`,
          sourceId: s.id,
          neteaseId: s.id,
          title: s.name,
          artist: art,
          album: alb,
          cover: pic,
          audioUrl: null,
          source: 'netease',
          badge: s.reason || '每日推荐'
        };
      });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ tracks }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 9. NetEase Intelligence Mode & Personal FM (全网心动漫游)
  if (pathname === '/api/netease/intelligence' || pathname === '/api/netease/personal_fm') {
    if (!neteaseUserCookie) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Not logged in' }));
      return;
    }
    try {
      let rawSongs = [];
      const songId = parsedUrl.query?.songId || parsedUrl.query?.id;
      const pid = parsedUrl.query?.pid || parsedUrl.query?.playlistId;

      if (songId && pid && typeof NCM.playmode_intelligence_list === 'function') {
        const r = await NCM.playmode_intelligence_list({ id: songId, pid, cookie: neteaseUserCookie });
        rawSongs = (r.body?.data || []).map(item => item.songInfo || item);
      } else if (typeof NCM.personal_fm === 'function') {
        const r = await NCM.personal_fm({ cookie: neteaseUserCookie, timestamp: Date.now() });
        rawSongs = r.body?.data || [];
      }

      const tracks = rawSongs.filter(s => s && s.name).map(s => {
        const artists = s.artists || s.ar || [];
        const art = Array.isArray(artists) ? artists.map(a => a.name).join(' / ') : '未知歌手';
        const alb = s.album?.name || s.al?.name || '心动漫游';
        let pic = s.album?.picUrl || s.al?.picUrl || '';
        if (pic && pic.startsWith('http')) {
          pic = pic.replace(/^http:\/\//i, 'https://');
          if (!pic.includes('?param=')) pic += '?param=300y300';
        }
        return {
          id: `netease_${s.id}`,
          sourceId: s.id,
          neteaseId: s.id,
          title: s.name,
          artist: art,
          album: alb,
          cover: pic,
          audioUrl: null,
          source: 'netease',
          badge: '全网心动漫游'
        };
      });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ tracks }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Official Album Details Endpoint
  if (pathname === '/api/album-details') {
    const albName = (parsedUrl.query && (parsedUrl.query.name || parsedUrl.query.album)) ? (parsedUrl.query.name || parsedUrl.query.album).trim() : '';
    const artName = (parsedUrl.query && parsedUrl.query.artist) ? parsedUrl.query.artist.trim() : '';
    const albMid = (parsedUrl.query && (parsedUrl.query.albumMid || parsedUrl.query.mid)) ? (parsedUrl.query.albumMid || parsedUrl.query.mid).trim() : '';
    const details = await getOfficialAlbumDetails(albName, artName, albMid);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(details || { tracks: [] }));
    return;
  }

  // Real Playable Audio Stream Resolver Endpoint (NetEase priority with lossless failover)
  if (pathname === '/api/resolve-audio') {
    const title = (parsedUrl.query && parsedUrl.query.title) ? parsedUrl.query.title.trim() : '';
    const artist = (parsedUrl.query && parsedUrl.query.artist) ? parsedUrl.query.artist.trim() : '';
    const neteaseId = (parsedUrl.query && (parsedUrl.query.neteaseId || parsedUrl.query.id)) ? (parsedUrl.query.neteaseId || parsedUrl.query.id).trim() : '';
    const forceRefresh = parsedUrl.query && (parsedUrl.query.forceRefresh === 'true' || parsedUrl.query.refresh === '1');
    const audioUrl = await resolveAudioStreamOnline(title, artist, neteaseId, forceRefresh);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ url: audioUrl }));
    return;
  }

  // Official NetEase Search Endpoint (High-speed, zero-CORS backend)
  if (pathname === '/api/search') {
    const q = (parsedUrl.query && (parsedUrl.query.keyword || parsedUrl.query.q || parsedUrl.query.name)) ? (parsedUrl.query.keyword || parsedUrl.query.q || parsedUrl.query.name).trim() : '';
    const limit = parseInt(parsedUrl.query.limit || '25', 10);
    if (!q) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ songs: [] }));
      return;
    }
    try {
      const searchRes = await httpsGetJson(`https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(q)}&type=1&offset=0&limit=${limit}`, 'https://music.163.com/');
      const songs = searchRes?.result?.songs;
      let list = [];
      if (Array.isArray(songs)) {
        list = songs.map(s => {
          const arts = s.ar || s.artists;
          const art = Array.isArray(arts) ? arts.map(a => a.name).join(' / ') : '未知歌手';
          const alb = s.al || s.album;
          let coverPic = alb?.picUrl || '';
          if (coverPic && coverPic.startsWith('http')) {
            coverPic = coverPic.replace(/^http:\/\//i, 'https://');
            if (!coverPic.includes('?param=')) {
              coverPic += '?param=300y300';
            }
          }
          return {
            id: `netease_${s.id}`,
            sourceId: s.id,
            neteaseId: s.id,
            title: s.name,
            artist: art,
            album: alb?.name || '精选单曲',
            cover: coverPic,
            audioUrl: null,
            source: 'netease',
            badge: '网易云正版原声'
          };
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ songs: list }));
      return;
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ songs: [] }));
      return;
    }
  }

  // Official NetEase Lyrics Endpoint (with Syllable Karaoke YRC & Translations)
  if (pathname === '/api/lyrics' || pathname === '/api/lyric') {
    const songId = (parsedUrl.query && (parsedUrl.query.id || parsedUrl.query.neteaseId || parsedUrl.query.songId))
      ? String(parsedUrl.query.id || parsedUrl.query.neteaseId || parsedUrl.query.songId).trim()
      : '';
    if (!songId) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ lrc: '', tlyric: '', yrc: '' }));
      return;
    }

    try {
      // 1. Fetch enhanced syllable karaoke (yrc) + translation from interface3
      let lyricRes = await httpsGetJson(
        `https://interface3.music.163.com/api/song/lyric?id=${encodeURIComponent(songId)}&cp=false&tv=1&lv=1&rv=1&kv=1&yv=1`,
        'https://music.163.com/'
      );

      let lrc = (lyricRes?.lrc && lyricRes.lrc.lyric) || '';
      let tlyric = (lyricRes?.tlyric && lyricRes.tlyric.lyric) || '';
      let yrc = (lyricRes?.yrc && lyricRes.yrc.lyric) || '';

      // 2. Fallback to standard lyric API if interface3 had no lrc
      if (!lrc && !yrc) {
        const fallbackRes = await httpsGetJson(
          `https://music.163.com/api/song/lyric?id=${encodeURIComponent(songId)}&lv=1&tv=1`,
          'https://music.163.com/'
        );
        lrc = (fallbackRes?.lrc && fallbackRes.lrc.lyric) || '';
        tlyric = tlyric || ((fallbackRes?.tlyric && fallbackRes.tlyric.lyric) || '');
      }

      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=86400'
      });
      res.end(JSON.stringify({ lrc, tlyric, yrc }));
      return;
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ lrc: '', tlyric: '', yrc: '' }));
      return;
    }
  }

  // Official Artist Details Endpoint
  if (pathname === '/api/artist-details') {
    const artName = (parsedUrl.query && (parsedUrl.query.name || parsedUrl.query.artist)) ? (parsedUrl.query.name || parsedUrl.query.artist).trim() : '';
    const details = await getOfficialArtistDetails(artName);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(details || { topSongs: [], albums: [] }));
    return;
  }

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

  // Spotify Canvas Official Looping Motion Background Endpoint
  if (pathname === '/api/spotify/canvas') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const { id, title, video } = payload;
          if (!id || !video) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Missing id or video URL' }));
            return;
          }
          const registryPath = path.join(ROOT_DIR, 'motion_covers.json');
          let reg = {};
          if (fs.existsSync(registryPath)) {
            try { reg = JSON.parse(fs.readFileSync(registryPath, 'utf8')); } catch (e) {}
          }
          reg[id] = {
            video,
            title: title || id,
            type: 'spotify_canvas',
            updatedAt: new Date().toISOString()
          };
          fs.writeFileSync(registryPath, JSON.stringify(reg, null, 2), 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, entry: reg[id] }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // GET Request - Fully Automated Multi-Tier Resolution
    const songId = (parsedUrl.query && parsedUrl.query.id) ? parsedUrl.query.id.trim() : '';
    const title = (parsedUrl.query && parsedUrl.query.title) ? parsedUrl.query.title.trim() : '';
    const artist = (parsedUrl.query && parsedUrl.query.artist) ? parsedUrl.query.artist.trim() : '';
    const coverUrl = (parsedUrl.query && parsedUrl.query.cover) ? parsedUrl.query.cover.trim() : '';
    const safeId = (songId || title || `song_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');

    const registryPath = path.join(ROOT_DIR, 'motion_covers.json');
    let reg = {};
    if (fs.existsSync(registryPath)) {
      try { reg = JSON.parse(fs.readFileSync(registryPath, 'utf8')); } catch (e) {}
    }

    // Tier 1: Check direct ID match
    if (songId && reg[songId]) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ready', video: reg[songId].video, title: reg[songId].title || title, type: reg[songId].type || 'spotify_canvas' }));
      return;
    }

    // Tier 2: Check fuzzy match on title and artist
    const normStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
    const cleanTitle = normStr(title);
    const cleanArtist = normStr(artist);

    let matchedVideo = null;
    let matchedTitle = '';
    let matchedType = 'spotify_canvas';
    for (const [key, item] of Object.entries(reg)) {
      const kNorm = normStr(key);
      const tNorm = normStr(item.title);
      if (cleanTitle && (kNorm.includes(cleanTitle) || tNorm.includes(cleanTitle))) {
        matchedVideo = item.video;
        matchedTitle = item.title;
        matchedType = item.type || 'spotify_canvas';
        break;
      }
    }

    if (matchedVideo) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ready', video: matchedVideo, title: matchedTitle, type: matchedType }));
      return;
    }

    // Tier 3: Check covers folder for matching .mp4
    const coversDir = path.join(ROOT_DIR, 'covers');
    if (fs.existsSync(coversDir)) {
      try {
        const files = fs.readdirSync(coversDir);
        for (const f of files) {
          if (!f.endsWith('.mp4') && !f.endsWith('.webm')) continue;
          const fNorm = normStr(f);
          if (cleanTitle && fNorm.includes(cleanTitle)) {
            const vidUrl = `/covers/${f}`;
            reg[safeId] = { video: vidUrl, title: title || safeId, type: 'spotify_canvas', updatedAt: new Date().toISOString() };
            fs.writeFileSync(registryPath, JSON.stringify(reg, null, 2), 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ status: 'ready', video: vidUrl, title, type: 'spotify_canvas' }));
            return;
          }
        }
      } catch (e) {}
    }

    // Tier 4: Auto-resolve NetEase Official Music Video (if applicable)
    resolveNetEaseMV(songId, title).then(async (mvUrl) => {
      if (mvUrl) {
        reg[safeId] = { video: mvUrl, title: title || safeId, type: 'official_music_video', updatedAt: new Date().toISOString() };
        fs.writeFileSync(registryPath, JSON.stringify(reg, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'ready', video: mvUrl, title, type: 'official_music_video' }));
        return;
      }

      // Tier 5: JIT Auto-Synthesis of 8s Seamless Looping Canvas using FFmpeg
      if (coverUrl && !coverUrl.startsWith('data:image/svg')) {
        const outVideo = path.join(coversDir, `${safeId}_motion.mp4`);
        if (fs.existsSync(outVideo) && fs.statSync(outVideo).size >= 1024) {
          const vidUrl = `/covers/${safeId}_motion.mp4`;
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ status: 'ready', video: vidUrl, title, type: 'auto_generated_canvas' }));
          return;
        }

        const generatedUrl = await autoGenerateMotionCover(safeId, coverUrl, title);
        if (generatedUrl) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ status: 'ready', video: generatedUrl, title, type: 'auto_generated_canvas' }));
          return;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'none', message: 'No Canvas found and unable to auto-generate' }));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // Motion Covers Registry Endpoint
  if (pathname === '/api/motion-covers') {
    const registryPath = path.join(ROOT_DIR, 'motion_covers.json');
    let reg = {};
    if (fs.existsSync(registryPath)) {
      try { reg = JSON.parse(fs.readFileSync(registryPath, 'utf8')); } catch (e) {}
    }
    const coversDir = path.join(ROOT_DIR, 'covers');
    if (fs.existsSync(coversDir)) {
      try {
        const files = fs.readdirSync(coversDir);
        files.forEach(f => {
          if (f.endsWith('.mp4') || f.endsWith('.webm')) {
            const fPath = path.join(coversDir, f);
            try {
              if (fs.statSync(fPath).size < 1024) return;
            } catch (e) { return; }
            const baseId = f.replace(/_motion\.(mp4|webm)$/i, '').replace(/\.(mp4|webm)$/i, '');
            if (!reg[baseId]) {
              reg[baseId] = { video: `/covers/${f}` };
            }
          }
        });
      } catch (e) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(reg));
    return;
  }

  // Trigger Automatic Just-In-Time Motion Cover Generation
  if (pathname === '/api/auto-motion-cover') {
    const songId = (parsedUrl.query && parsedUrl.query.id) ? parsedUrl.query.id.trim() : null;
    const coverUrl = (parsedUrl.query && parsedUrl.query.cover) ? parsedUrl.query.cover.trim() : null;
    const title = (parsedUrl.query && parsedUrl.query.title) ? parsedUrl.query.title.trim() : (songId || 'Song');

    if (!songId) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Missing song id' }));
      return;
    }

    const safeId = songId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const coversDir = path.join(ROOT_DIR, 'covers');
    const outVideo = path.join(coversDir, `${safeId}_motion.mp4`);

    if (fs.existsSync(outVideo)) {
      try {
        if (fs.statSync(outVideo).size >= 1024) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ status: 'ready', video: `/covers/${safeId}_motion.mp4` }));
          return;
        } else {
          try { fs.unlinkSync(outVideo); } catch (e) {}
        }
      } catch (e) {}
    }

    if (!activeGenerationJobs.has(safeId) && coverUrl) {
      autoGenerateMotionCover(safeId, coverUrl, title);
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'generating', safeId }));
    return;
  }

  // Check Motion Cover Generation Status
  if (pathname === '/api/motion-cover-status') {
    const songId = (parsedUrl.query && parsedUrl.query.id) ? parsedUrl.query.id.trim() : null;
    if (!songId) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Missing song id' }));
      return;
    }

    const safeId = songId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const outVideo = path.join(ROOT_DIR, 'covers', `${safeId}_motion.mp4`);

    if (fs.existsSync(outVideo)) {
      try {
        if (fs.statSync(outVideo).size >= 1024) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ status: 'ready', video: `/covers/${safeId}_motion.mp4` }));
          return;
        } else {
          try { fs.unlinkSync(outVideo); } catch (e) {}
        }
      } catch (e) {}
    }

    const isGenerating = activeGenerationJobs.has(safeId);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: isGenerating ? 'generating' : 'not_found' }));
    return;
  }

  // Gemini Flash Vision Semantic Cover Analysis Endpoint
  if (pathname === '/api/ai-vision-cover') {
    const songId = (parsedUrl.query && parsedUrl.query.id) ? parsedUrl.query.id.trim() : 'unknown';
    const coverUrl = (parsedUrl.query && parsedUrl.query.cover) ? parsedUrl.query.cover.trim() : null;
    const title = (parsedUrl.query && parsedUrl.query.title) ? parsedUrl.query.title.trim() : '';
    const artist = (parsedUrl.query && parsedUrl.query.artist) ? parsedUrl.query.artist.trim() : '';

    const safeId = songId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cacheFile = path.join(ROOT_DIR, 'ai_vision_cache.json');
    let cache = {};
    if (fs.existsSync(cacheFile)) {
      try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch (e) {}
    }

    if (cache[safeId] || (coverUrl && cache[coverUrl])) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'success', cached: true, ...(cache[safeId] || cache[coverUrl]) }));
      return;
    }

    if (!coverUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Missing cover url parameter' }));
      return;
    }

    (async () => {
      try {
        let imgBuffer = null;
        let mimeType = 'image/jpeg';

        if (coverUrl.startsWith('http')) {
          const fetchRes = await fetch(coverUrl);
          if (fetchRes.ok) {
            imgBuffer = Buffer.from(await fetchRes.arrayBuffer());
            const ct = fetchRes.headers.get('content-type');
            if (ct) mimeType = ct.split(';')[0];
          }
        } else if (coverUrl.startsWith('/covers/')) {
          const localPath = path.join(ROOT_DIR, coverUrl);
          if (fs.existsSync(localPath)) {
            imgBuffer = fs.readFileSync(localPath);
          }
        }

        if (!imgBuffer) {
          throw new Error('Unable to retrieve image buffer from cover url');
        }

        const base64Data = imgBuffer.toString('base64');
        const analysis = await callGeminiVision(base64Data, mimeType, title, artist);

        cache[safeId] = analysis;
        if (coverUrl) cache[coverUrl] = analysis;
        fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'success', cached: false, ...analysis }));
      } catch (err) {
        console.error('[GeminiVision Error]:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    })();
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

    const isCodeAsset = ext === '.html' || ext === '.js' || ext === '.css' || ext === '.json';
    const cacheHeaders = isCodeAsset ? {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    } : {};

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
        'Content-Type': contentType,
        ...cacheHeaders
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        ...cacheHeaders
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

function startServer(port) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`端口 ${port} 已被占用，正在尝试端口 ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('服务器启动错误:', err);
    }
  });

  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🎵 Aetheria Sound Player · 本地服务启动成功!`);
    console.log(`🌐 访问地址: http://localhost:${port}`);
    console.log(`📁 运行目录: ${ROOT_DIR}`);
    console.log(`======================================================\n`);
  });
}

if (require.main === module) {
  startServer(DEFAULT_PORT);
}

module.exports = { server, startServer, resolveAudioStreamOnline, getNeteasePlayableUrl };
