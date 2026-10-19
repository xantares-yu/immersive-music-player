const fs = require('fs');
const path = require('path');

const dir = path.join(process.env.APPDATA, 'Aetheria Sound', 'Local Storage', 'leveldb');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ldb') || f.endsWith('.log'));

for (const f of files) {
  const buf = fs.readFileSync(path.join(dir, f));
  const str = buf.toString('latin1');
  if (str.includes('aetheria_saved_playlist')) {
    console.log('File:', f);
    // Find JSON
    const idx = str.indexOf('aetheria_saved_playlist');
    const sub = str.substring(idx, idx + 4000);
    // filter non-printable characters
    const clean = sub.replace(/[^\x20-\x7E\u4E00-\u9FFF]/g, '');
    console.log('Content preview:', clean.substring(0, 500));
  }
}
