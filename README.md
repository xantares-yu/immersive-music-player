# Aetheria Sound · 全屏沉浸流光音乐系统

<p align="center">
  <img src="https://img.shields.io/badge/Release-v1.0.0-1B365D?style=flat-square" alt="Release" />
  <img src="https://img.shields.io/badge/WebGL-GLSL%20Shaders-38bdf8?style=flat-square&logo=webgl" alt="WebGL" />
  <img src="https://img.shields.io/badge/Web%20Audio%20API-FFT%20Analyzer-f59e0b?style=flat-square" alt="Web Audio" />
  <img src="https://img.shields.io/badge/Design-Apple%20Music%20Sing-10b981?style=flat-square&logo=apple" alt="Apple Music" />
  <img src="https://img.shields.io/badge/Palette-Raycast%20Cmd%2BK-6366f1?style=flat-square" alt="Raycast UI" />
  <img src="https://img.shields.io/badge/License-MIT-gray?style=flat-square" alt="License" />
</p>

<p align="center">
  <b>一款融合 Apple Music Sing 沉浸流光美学、WebGL GLSL 流体着色器与 Raycast / Spectrum UI 磨砂玻璃设计的现代前端音乐体验系统。</b><br>
  <sub>深度集成在线聚合曲库、毫秒级逐字双语歌词渲染引擎、3D 黑胶透视交互与一键艺术歌词海报生成。</sub>
</p>

---

## ✨ 核心特性矩阵

### 1. 🌌 WebGL GLSL 流体着色器背景 (`shader.js`)
- **双重域扭曲 (Domain Warping)**：通过两层嵌套的 FBM (Fractal Brownian Motion) 分形噪声，在 GPU 上实时演算如丝绸流动的流体动态极光。
- **音频频谱共振反应**：实时挂接 Web Audio API 分析器，将低音频段与鼓点振幅映射为着色器的流动速率与湍流扰动，声画高度同频。
- **动态 OKLCH 专辑主色提取**：自动采样当前封面色彩矩阵（琥珀金、深海蓝、电光绯红、极光青），平滑渐变注入片元着色器。

### 2. 🎤 Apple Music Sing 级无界逐行歌词
- **边缘自然渐隐遮罩**：采用 CSS `mask-image` 消除边界黑框，歌词自适应悬浮于全屏流体极光之中。
- **逐行光效辐射聚焦**：活跃歌词自动放大、白芒耀眼伴随色调辐射发光（`text-shadow: 0 0 35px var(--primary-glow)`）；未激活歌词带有景深模糊（Depth of Field Blur）与透明度渐进衰减。
- **毫秒级中英双语对齐**：精准双语对齐，支持点击任意歌词即时瞬移跳播；手动滚动阅读时自动显示“回到当前歌词”悬浮胶囊。

### 3. 🔍 全局 Raycast 搜索岛 (`Cmd / Ctrl + K`)
- 全局任意时刻按下快捷键即可唤出居中浮动搜岛。
- 输入歌名/歌手支持即时防抖模糊联想，键盘上下方向键平滑导航，回车键无缝切歌。
- 内置【官方热歌榜】、【云音乐飙升榜】、【民谣与不朽】榜单分类快速切换。

### 4. 💽 三重沉浸视图 & 3D 拟物黑胶
- **全屏纯粹歌词模式**：居中巨幕歌词与全屏流光背景。
- **黑胶唱机分栏模式**：亚克力黑胶封套随鼠标位移产生 3D 透视物理倾斜与微反光，伴随黑胶唱盘匀速旋转。
- **极简禅境模式 (Zen Mode)**：无操作 3.5 秒后自动隐退所有导航栏与底部操控岛，轻移鼠标即刻唤醒。

### 5. 🎨 歌词海报分享器 (Lyric Card Generator)
- 实时捕获当前播放歌词、封面与版式，一键渲染导出 1080×1350 高清艺术级流光分享海报。

### 6. 🎧 多乐器程序化编曲引擎 & 本地音频拖拽
- 内置多首标志性曲目的程序化合成编曲模式（吉他扫弦、808 重低音、古典钢琴琶音）。
- 支持向网页任意区域拖拽本地 `.mp3` / `.flac` / `.lrc` 文件，立即畅享原版无损播放。

---

## 🏗️ 架构概览

```
├── index.html       # 响应式结构骨架 (Raycast 搜岛、3D 唱机、歌词舞台、灵动岛 HUD)
├── style.css        # Apple HIG 磨砂玻璃质感、物理弹簧曲线、OKLCH 色彩变量
├── shader.js        # WebGL 2.0 片元着色器引擎 (Domain Warping + FBM + 音频振幅联动)
├── app.js           # 核心控制器 (Web Audio 管线、LRC 毫秒级解析、状态机、海报生成)
├── api.js           # 在线曲库聚合与搜索服务层
├── server.js        # 高速音频流代理服务 (规避 CDN CORS 限制，支持完整 FFT 频域分析)
└── start.bat        # Windows 一键启动脚本
```

---

## 🚀 快速上手与运行

### 方式一：本地轻量服务启动（推荐，支持完整音频频谱分析）

由于浏览器跨域安全策略，Web Audio API 的频谱分析器在挂接跨域外链音频时需要本地代理，推荐通过轻量 Node 服务启动：

```bash
# 启动本地服务
node server.js

# 或在 Windows 上直接双击 start.bat
```

浏览器访问：`http://localhost:8080`

### 方式二：纯静态直开

双击直接打开 `index.html` 即可畅享完整 UI、着色器流光视觉、搜索切歌与本地音频拖拽播放。

---

## ⌨️ 全局快捷键指南

| 快捷键 | 功能动作 |
| :--- | :--- |
| `Cmd / Ctrl + K` | 呼出 / 关闭全局极速搜歌面板 |
| `Space` | 播放 / 暂停 |
| `←` / `→` | 快退 5 秒 / 快进 5 秒 |
| `Shift + ← / →` | 切换上一首 / 下一首 |
| `↑` / `↓` | 调节音量 (`M`: 一键静音) |
| `V` | 切换【全屏歌词】与【3D 黑胶分栏】视图 |
| `F` | 全屏模式切换 |
| `P` | 展开 / 收起当前播放队列 |
| `Esc` | 关闭当前打开的任何弹窗与浮层 |

---

## 💡 致谢与灵感来源

- [Apple Music Sing](https://www.apple.com/apple-music/) — 启发了逐行沉浸流光与动态景深虚化美学
- [Mineradio](https://github.com/XxHuberrr/Mineradio-paused) — 桌面音乐视觉与暗场沉浸理念参考
- [Raycast](https://www.raycast.com/) — 键盘优先的指令搜索岛设计灵感

---

## 📄 开源许可

本项目遵循 [MIT License](./LICENSE) 开源协议。
