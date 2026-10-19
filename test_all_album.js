const fs = require('fs');
const https = require('https');

function normalizeSearchText(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .replace(/[\s\-_'"`~·!@#$%^&*()（）\[\]【】{}|\\:;,.?<>]+/g, '')
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

  const titleMatches = (normCandName === normTargetTitle) ||
                       normCandName.startsWith(normTargetTitle) ||
                       normTargetTitle.startsWith(normCandName);
  if (!titleMatches) return false;

  if (normTargetArtist) {
    const artistMatches = normCandArtists.includes(normTargetArtist) ||
                          normTargetArtist.includes(normCandArtists);
    if (!artistMatches) return false;
  }
  return true;
}

function searchCloudSearch(q) {
  return new Promise(resolve => {
    https.get('https://music.163.com/api/cloudsearch/pc?s=' + encodeURIComponent(q) + '&type=1&offset=0&limit=10', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://music.163.com/'
      }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          resolve(j.result?.songs || []);
        } catch(e) { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

async function resolveTrack(title, artist) {
  const cleanTitle = (title || '').split(/[(（]/)[0].trim();
  const cleanArtist = (artist || '').split(/·|&|\/|ft\.|feat\./i)[0].trim();
  const q = `${cleanTitle} ${cleanArtist}`.trim();

  const songs = await searchCloudSearch(q);
  const valid = songs.filter(s => {
    if (!s || !s.id || !s.name) return false;
    return isAccurateSongMatch(s.name, s.ar || s.artists, cleanTitle, cleanArtist);
  });

  valid.sort((a, b) => {
    const normA = normalizeSearchText(a.name);
    const normB = normalizeSearchText(b.name);
    const normT = normalizeSearchText(cleanTitle);
    const aExact = normA === normT ? 1 : 0;
    const bExact = normB === normT ? 1 : 0;
    return bExact - aExact;
  });

  return valid[0] ? { found: true, id: valid[0].id, name: valid[0].name } : { found: false };
}

async function testAll() {
  const d = JSON.parse(fs.readFileSync('metadata_cache.json', 'utf8'));
  const tracks = d['album_在雨后醒来_艾志恒asen_'].tracks;
  console.log('Testing CloudSearch resolution on all 15 album tracks:');
  for (const t of tracks) {
    const res = await resolveTrack(t.title, t.artist);
    console.log(t.title, '=>', res.found ? '✓ FOUND ID: ' + res.id + ' (' + res.name + ')' : '✗ NOT FOUND');
  }

  const keem = d['artist_baby keem'].topSongs;
  console.log('\nTesting CloudSearch on Baby Keem top tracks:');
  for (const t of keem.slice(0, 5)) {
    const res = await resolveTrack(t.title, t.artist);
    console.log(t.title, '=>', res.found ? '✓ FOUND ID: ' + res.id + ' (' + res.name + ')' : '✗ NOT FOUND');
  }
}
testAll();
