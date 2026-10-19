/**
 * Aetheria Sound · Icon & Asset Generator
 * Generates app icon and system tray icon using Electron's nativeImage
 */
const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(() => {
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // 1. Generate 256x256 App Icon
  const size = 256;
  const buffer = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size * 0.46;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Squircle / Vinyl Disc Design
        const normDist = dist / radius;
        // Deep Obsidian Black Vinyl with grooves
        let r = 16, g = 18, b = 28, a = 255;
        
        // Vinyl grooves
        if (normDist > 0.4 && normDist < 0.95) {
          const groove = Math.sin(dist * 0.8) * 0.5 + 0.5;
          r += Math.floor(groove * 15);
          g += Math.floor(groove * 20);
          b += Math.floor(groove * 35);
        }

        // Center Label: Emerald & Cyan Glow
        if (normDist < 0.38) {
          // Vibrant cyan-emerald gradient
          const angle = Math.atan2(dy, dx);
          r = Math.floor(16 + Math.cos(angle) * 10);
          g = Math.floor(185 + Math.sin(angle) * 40);
          b = Math.floor(180 + Math.cos(angle + 1) * 60);
        }

        // Center Spindle Hole
        if (normDist < 0.08) {
          r = 10; g = 10; b = 15;
        }

        // Smooth antialiasing edge
        if (dist > radius - 1.5) {
          a = Math.max(0, Math.min(255, Math.floor((radius - dist) / 1.5 * 255)));
        }

        buffer[idx] = r;
        buffer[idx + 1] = g;
        buffer[idx + 2] = b;
        buffer[idx + 3] = a;
      } else {
        // Transparent
        buffer[idx] = 0;
        buffer[idx + 1] = 0;
        buffer[idx + 2] = 0;
        buffer[idx + 3] = 0;
      }
    }
  }

  const iconImg = nativeImage.createFromBitmap(buffer, { width: size, height: size });
  fs.writeFileSync(path.join(assetsDir, 'icon.png'), iconImg.toPNG());

  // 2. Generate 32x32 High-DPI Tray Icon (Clean White/Cyan Soundwave Accent)
  const traySize = 32;
  const trayBuf = Buffer.alloc(traySize * traySize * 4);
  const trayCenter = traySize / 2;
  const trayRadius = traySize * 0.44;

  for (let y = 0; y < traySize; y++) {
    for (let x = 0; x < traySize; x++) {
      const idx = (y * traySize + x) * 4;
      const dx = x - trayCenter;
      const dy = y - trayCenter;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= trayRadius) {
        // Crisp White icon with slight transparency for native OS tray
        trayBuf[idx] = 255;
        trayBuf[idx + 1] = 255;
        trayBuf[idx + 2] = 255;
        // Inner vinyl groove hole punch
        if (dist < trayRadius * 0.35) {
          trayBuf[idx + 3] = 0;
        } else {
          trayBuf[idx + 3] = 230;
        }
      }
    }
  }

  const trayImg = nativeImage.createFromBitmap(trayBuf, { width: traySize, height: traySize });
  fs.writeFileSync(path.join(assetsDir, 'tray.png'), trayImg.toPNG());

  console.log('✅ Icons successfully created at', assetsDir);
  app.quit();
});
