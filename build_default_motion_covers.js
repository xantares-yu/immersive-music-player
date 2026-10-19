const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = __dirname;
const coversDir = path.join(dir, 'covers');
if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

async function createMotionCovers() {
  const songs = [
    {
      id: 'jay_qilixiang',
      url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop',
      title: '周杰伦 · 七里香'
    },
    {
      id: 'jay_qiantian',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
      title: '周杰伦 · 晴天'
    },
    {
      id: 'jay_yequ',
      url: 'https://p2.music.126.net/kBeIsIs1LuDB5aoj8PWdxw==/109951171458803146.jpg?param=500y500',
      title: '周杰伦 · 夜曲'
    },
    {
      id: 'jay_daoxiang',
      url: 'https://p2.music.126.net/QAKbY-OGqsWs-eUvvVzYJQ==/2651425710.jpg?param=500y500',
      title: '周杰伦 · 稻香'
    },
    {
      id: 'jay_qinghuaci',
      url: 'https://p2.music.126.net/mfluOuE9ylKLpO4oMyHFcA==/3381543730.jpg?param=500y500',
      title: '周杰伦 · 青花瓷'
    },
    {
      id: 'theweeknd_starboy',
      url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop',
      title: 'The Weeknd · Starboy'
    },
    {
      id: 'theweeknd_blindinglights',
      url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200&auto=format&fit=crop',
      title: 'The Weeknd · Blinding Lights'
    },
    {
      id: 'jvke_goldenhour',
      url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop',
      title: 'JVKE · Golden Hour'
    },
    {
      id: 'fangdong_yunyan',
      url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
      title: '房东的猫 · 云烟成雨'
    }
  ];

  const regFile = path.join(dir, 'motion_covers.json');
  let registry = {};
  if (fs.existsSync(regFile)) {
    try { registry = JSON.parse(fs.readFileSync(regFile, 'utf8')); } catch (e) {}
  }

  for (const s of songs) {
    const imgPath = path.join(coversDir, `${s.id}_static.jpg`);
    const outVideoPath = path.join(coversDir, `${s.id}_motion.mp4`);

    if (fs.existsSync(outVideoPath)) {
      registry[s.id] = {
        video: `/covers/${s.id}_motion.mp4`,
        title: s.title,
        type: 'apple_motion_artwork',
        updatedAt: new Date().toISOString()
      };
      console.log(`✓ Exists: ${s.id}_motion.mp4`);
      continue;
    }

    console.log(`Downloading image for ${s.title}...`);
    try {
      const res = await fetch(s.url);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(imgPath, buf);

      console.log(`Rendering seamless motion video for ${s.title}...`);
      const filter = [
        'scale=720:720:force_original_aspect_ratio=increase',
        'crop=720:720',
        'zoompan=z=\'1.0+0.07*sin(2*PI*in/180)\':d=180:x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':s=720x720:fps=30',
        'eq=brightness=\'0.04*sin(2*PI*t/6)\':contrast=\'1.0+0.04*cos(2*PI*t/6)\'',
        'format=yuv420p'
      ].join(',');

      const cmd = `ffmpeg -y -loop 1 -i "${imgPath}" -vf "${filter}" -t 6 -c:v libx264 -preset fast -crf 20 -movflags +faststart "${outVideoPath}"`;
      execSync(cmd, { stdio: 'ignore' });

      registry[s.id] = {
        video: `/covers/${s.id}_motion.mp4`,
        title: s.title,
        type: 'apple_motion_artwork',
        updatedAt: new Date().toISOString()
      };
      console.log(`✓ Generated ${s.id}_motion.mp4 (${(fs.statSync(outVideoPath).size / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error(`Error processing ${s.id}:`, e.message);
    }
  }

  fs.writeFileSync(regFile, JSON.stringify(registry, null, 2), 'utf8');
  console.log('✓ All motion covers synchronized into motion_covers.json!');
}

createMotionCovers().catch(console.error);
