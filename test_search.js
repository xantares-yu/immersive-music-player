const https = require('https');

https.get('https://music.163.com/api/cloudsearch/pc?s=' + encodeURIComponent('在雨后醒来 艾志恒') + '&type=1&offset=0&limit=10', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://music.163.com/'
  }
}, res => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const j = JSON.parse(d);
    const songs = j.result?.songs || [];
    console.log('Returned songs:');
    songs.forEach(s => console.log(' ', s.id, s.name, s.ar?.map(a => a.name).join('/')));
    const filtered = songs.filter(s => {
      const normN = s.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').toLowerCase();
      const normT = '在雨后醒来'.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').toLowerCase();
      return normN === normT || normN.startsWith(normT) || normT.startsWith(normN);
    });
    console.log('Filtered exact matches:');
    filtered.forEach(s => console.log(' ', s.id, s.name, s.ar?.map(a => a.name).join('/')));
  });
});
