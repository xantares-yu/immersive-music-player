#!/usr/bin/env node
/**
 * Aetheria Sound · Gemini Veo 3.1 动态封面生成引擎 (Image-to-Video Generator)
 * 
 * 核心功能：
 * 1. 接入 Google 最新 Gemini Veo 3.1 视频生成模型 (veo-3.1-generate-preview)
 * 2. 传入歌曲的高清静态封面图片作为 Starting Frame (起始帧)
 * 3. 注入 Apple Music 级微动运镜与光影氛围 Prompt (Seamless Cinemagraph)
 * 4. 自动异步轮询任务，并将生成的无缝短视频直接下载保存至 covers/ 目录
 * 5. 自动注册到播放器的 motion_covers.json，前端自动加载动态封面并与鼓点强弱共振！
 *
 * 运行方式:
 *   node generate_motion_cover.js --key=YOUR_GEMINI_API_KEY --song=jay_qilixiang
 *   node generate_motion_cover.js (交互式命令行向导)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PROJECT_DIR = __dirname;
const COVERS_DIR = path.join(PROJECT_DIR, 'covers');
const REGISTRY_FILE = path.join(PROJECT_DIR, 'motion_covers.json');

// 预设歌曲清单与专属定制的 Apple Music Cinemagraph Prompt
const PRESET_SONGS = [
  {
    id: 'jay_qilixiang',
    title: '周杰伦 · 七里香',
    coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop',
    prompt: 'Apple Music animated album artwork. Soft gentle breeze blowing through green grass field, subtle atmospheric dust motes floating in warm golden hour sunlight, slow smooth cinematic camera zoom, delicate photorealistic movements, seamless looping cinemagraph, 4k ultra high fidelity, serene and nostalgic mood.'
  },
  {
    id: 'theweeknd_starboy',
    title: 'The Weeknd · Starboy',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop',
    prompt: 'Apple Music animated album artwork. Deep neon blue and crimson red atmospheric fog swirling gently, subtle electric neon reflections pulsing slowly, dark moody aesthetic, slow ambient light drift, cybernetic concert vibe, seamless looping cinemagraph, 4k resolution, high contrast.'
  },
  {
    id: 'jay_qiantian',
    title: '周杰伦 · 晴天',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
    prompt: 'Apple Music animated album artwork. Nostalgic summer breeze, soft clouds drifting slowly across vibrant azure sky, sunlight rays shimmering gently over water, dandelion seeds floating across frame, subtle natural motion, seamless looping cinemagraph, high fidelity 4k.'
  },
  {
    id: 'jvke_goldenhour',
    title: 'JVKE · Golden Hour',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop',
    prompt: 'Apple Music animated album artwork. Radiant cascading golden sunlight rays, glowing dust particles sparkling, slow cinematic macro focus rack, warm dreamy ambient lighting, magical twilight glow, seamless looping cinemagraph, 4k master.'
  },
  {
    id: 'fangdong_yunyan',
    title: '房东的猫 · 云烟成雨',
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
    prompt: 'Apple Music animated album artwork. Gentle rain droplets drizzling on glass window, soft misty morning fog rolling through distant trees, calm poetic indie ambiance, subtle reflections breathing, seamless looping cinemagraph, 4k artistic fidelity.'
  }
];

// 辅助打印
function log(msg, emoji = '✨') {
  console.log(`${emoji} ${msg}`);
}

function errorLog(msg) {
  console.error(`❌ [错误] ${msg}`);
}

// 确保目录存在
if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

// 读取现有注册表
function loadRegistry() {
  if (fs.existsSync(REGISTRY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

// 保存注册表
function saveRegistry(reg) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(reg, null, 2), 'utf8');
}

// 下载或读取图片转为 Base64
async function getImageBase64(imageUrlOrPath) {
  if (fs.existsSync(imageUrlOrPath)) {
    const data = fs.readFileSync(imageUrlOrPath);
    const ext = path.extname(imageUrlOrPath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return { base64: data.toString('base64'), mime };
  }

  log(`正在下载歌曲封面素材: ${imageUrlOrPath}...`, '📥');
  const res = await fetch(imageUrlOrPath);
  if (!res.ok) throw new Error(`无法下载封面: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  return { base64: buffer.toString('base64'), mime: contentType.split(';')[0].trim() };
}

// 调用 Google Gemini Veo 3.1 生成视频
async function generateVeoVideo(apiKey, imageBase64, mimeType, prompt, model = 'veo-3.1-generate-preview') {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${apiKey}`;

  log(`向 Gemini Veo (${model}) 发起图生视频任务...`, '🚀');
  log(`Prompt 提示词: "${prompt}"`, '📝');

  const requestBody = {
    instances: [
      {
        prompt: prompt,
        image: {
          bytesBase64Encoded: imageBase64,
          mimeType: mimeType
        }
      }
    ],
    parameters: {
      durationSeconds: 5,
      aspectRatio: '16:9',
      personGeneration: 'allow_adult'
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Veo 请求失败 (${response.status}): ${errorText}`);
  }

  const operation = await response.json();
  if (!operation.name) {
    throw new Error(`未返回操作 ID (Operation Name): ${JSON.stringify(operation)}`);
  }

  const opName = operation.name;
  log(`视频生成任务已提交，操作 ID: ${opName}`, '⏳');
  log('Veo 3.1 正在逐帧渲染中，大约需要 30~60 秒，请保持耐心...', '🎨');

  // 轮询检查状态
  const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${apiKey}`;
  const startTime = Date.now();
  let completedOp = null;

  while (true) {
    await new Promise((r) => setTimeout(r, 10000));
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    process.stdout.write(`\r⏳ 正在等待 Veo 渲染完成... [已耗时: ${elapsedSec}s] `);

    const checkRes = await fetch(pollUrl);
    if (!checkRes.ok) {
      console.log('');
      const errTxt = await checkRes.text();
      throw new Error(`查询任务状态失败: ${errTxt}`);
    }

    const opData = await checkRes.json();
    if (opData.done) {
      console.log('');
      if (opData.error) {
        throw new Error(`Veo 生成失败: ${JSON.stringify(opData.error)}`);
      }
      completedOp = opData;
      break;
    }
  }

  // 提取视频下载地址
  let videoUri = null;
  try {
    const samples = completedOp.response.generateVideoResponse.generatedSamples;
    if (samples && samples[0] && samples[0].video && samples[0].video.uri) {
      videoUri = samples[0].video.uri;
    }
  } catch (e) {}

  if (!videoUri) {
    try {
      const vids = completedOp.response.generatedVideos;
      if (vids && vids[0] && vids[0].video && vids[0].video.uri) {
        videoUri = vids[0].video.uri;
      }
    } catch (e) {}
  }

  if (!videoUri) {
    throw new Error(`无法从响应中解析视频 URI: ${JSON.stringify(completedOp)}`);
  }

  log(`视频渲染成功！正在下载结果视频: ${videoUri}`, '🎉');

  // 下载视频文件
  const downloadUrl = videoUri.includes('?') ? `${videoUri}&key=${apiKey}` : `${videoUri}?key=${apiKey}`;
  const dlRes = await fetch(downloadUrl, {
    headers: { 'x-goog-api-key': apiKey }
  });

  if (!dlRes.ok) {
    throw new Error(`下载生成的视频失败: ${dlRes.statusText}`);
  }

  const videoBuffer = Buffer.from(await dlRes.arrayBuffer());
  return videoBuffer;
}

// 交互式向导
async function runInteractive() {
  console.log(`\n======================================================`);
  console.log(`🎵 Aetheria Sound · Gemini Veo 3.1 动态封面生成向导`);
  console.log(`======================================================\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  // 获取 API Key
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    apiKey = await question('🔑 请输入你的 Google Gemini API Key: ');
    apiKey = apiKey.trim();
  }

  if (!apiKey) {
    errorLog('Gemini API Key 不能为空！');
    rl.close();
    return;
  }

  console.log('\n请选择你要生成动态封面的歌曲：');
  PRESET_SONGS.forEach((s, idx) => {
    console.log(`  [${idx + 1}] ${s.title}`);
  });
  console.log(`  [C] 自定义图片文件或链接\n`);

  const choice = (await question('请输入编号 (1-5 或 C): ')).trim();

  let targetSong = null;
  let customImagePath = null;
  let customPrompt = null;
  let songId = null;

  if (choice.toUpperCase() === 'C') {
    customImagePath = (await question('请输入图片绝对路径或在线 URL: ')).trim();
    songId = (await question('请输入歌曲唯一标识 (例如 custom_song_1): ')).trim() || 'custom_cover';
    customPrompt = (await question('请输入动效 Prompt (留空使用默认 Apple Music 流体动效): ')).trim();
    if (!customPrompt) {
      customPrompt = 'Apple Music animated album artwork. Subtle atmospheric light drift, gentle floating particles, delicate natural motion, seamless looping cinemagraph, 4k ultra high fidelity.';
    }
  } else {
    const num = parseInt(choice, 10);
    if (num >= 1 && num <= PRESET_SONGS.length) {
      targetSong = PRESET_SONGS[num - 1];
      songId = targetSong.id;
    } else {
      errorLog('无效选项！');
      rl.close();
      return;
    }
  }

  rl.close();

  const imageUrl = customImagePath || targetSong.coverUrl;
  const prompt = customPrompt || targetSong.prompt;

  try {
    const { base64, mime } = await getImageBase64(imageUrl);
    const videoBuffer = await generateVeoVideo(apiKey, base64, mime, prompt);

    const outFileName = `${songId}_motion.mp4`;
    const outPath = path.join(COVERS_DIR, outFileName);
    fs.writeFileSync(outPath, videoBuffer);
    log(`视频已保存至: ${outPath} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`, '💾');

    // 更新注册表
    const registry = loadRegistry();
    registry[songId] = {
      video: `/covers/${outFileName}`,
      title: targetSong ? targetSong.title : songId,
      updatedAt: new Date().toISOString(),
      prompt: prompt,
      model: 'veo-3.1-generate-preview'
    };
    saveRegistry(registry);
    log(`已将动态封面写入 motion_covers.json 注册表！`, '📋');

    console.log(`\n======================================================`);
    console.log(`🎉 恭喜！动态封面已制作完成！`);
    console.log(`▶ 打开播放器 (http://localhost:8080)，切换到该歌曲即可看到实时动态封面！`);
    console.log(`======================================================\n`);
  } catch (err) {
    errorLog(err.message);
  }
}

// 命令行参数解析
async function main() {
  const args = process.argv.slice(2);
  let apiKey = process.env.GEMINI_API_KEY;
  let songParam = null;

  for (const arg of args) {
    if (arg.startsWith('--key=')) apiKey = arg.slice(6).trim();
    if (arg.startsWith('--song=')) songParam = arg.slice(7).trim();
  }

  if (args.includes('--list')) {
    console.log('\n内置可选歌曲列表:');
    PRESET_SONGS.forEach(s => console.log(` - ID: ${s.id} (${s.title})`));
    console.log('');
    return;
  }

  if (apiKey && songParam) {
    const song = PRESET_SONGS.find(s => s.id === songParam);
    if (!song) {
      errorLog(`未找到 ID 为 "${songParam}" 的预设歌曲，使用 --list 查看可用 ID。`);
      return;
    }
    try {
      const { base64, mime } = await getImageBase64(song.coverUrl);
      const videoBuffer = await generateVeoVideo(apiKey, base64, mime, song.prompt);
      const outFileName = `${song.id}_motion.mp4`;
      const outPath = path.join(COVERS_DIR, outFileName);
      fs.writeFileSync(outPath, videoBuffer);
      log(`视频已保存至: ${outPath}`, '💾');

      const registry = loadRegistry();
      registry[song.id] = {
        video: `/covers/${outFileName}`,
        title: song.title,
        updatedAt: new Date().toISOString(),
        prompt: song.prompt,
        model: 'veo-3.1-generate-preview'
      };
      saveRegistry(registry);
      log(`已更新 motion_covers.json`, '📋');
    } catch (e) {
      errorLog(e.message);
    }
    return;
  }

  await runInteractive();
}

main();
