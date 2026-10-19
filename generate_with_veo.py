import os
import sys
import time
import json
import subprocess
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from google import genai
from google.genai import types

def get_api_key():
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip()
    
    # Try clipboard
    try:
        p = subprocess.run(['powershell', '-command', 'Get-Clipboard'], capture_output=True, text=True)
        clip = p.stdout.strip()
        if len(clip) > 20:
            # Save to .env for future use
            env_file.write_text(f"GEMINI_API_KEY={clip}\n", encoding="utf-8")
            return clip
    except Exception:
        pass
    
    return os.environ.get("GEMINI_API_KEY")

def main():
    api_key = get_api_key()
    if not api_key:
        print("❌ 未找到有效 API Key，请检查剪贴板或 .env 文件")
        sys.exit(1)
        
    print(f"🔑 成功加载 Gemini API Key (前缀: {api_key[:6]}...)")
    client = genai.Client(api_key=api_key)
    
    project_dir = Path(__file__).parent
    covers_dir = project_dir / "covers"
    covers_dir.mkdir(exist_ok=True)
    
    # Target song: 周杰伦 · 七里香
    song_id = "jay_qilixiang"
    image_path = covers_dir / f"{song_id}_static.jpg"
    
    if not image_path.exists():
        print(f"📥 下载《七里香》封面原图...")
        import urllib.request
        url = "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop"
        urllib.request.urlretrieve(url, str(image_path))
        
    print(f"🖼️ 正在载入封面图像: {image_path.name}")
    image = types.Image.from_file(location=str(image_path))
    
    prompt = (
        "Apple Music animated album artwork. Soft gentle breeze blowing through green grass field, "
        "subtle atmospheric dust motes floating in warm golden hour sunlight, slow smooth cinematic camera zoom, "
        "delicate photorealistic movements, seamless looping cinemagraph, 4k ultra high fidelity, serene and nostalgic mood."
    )
    
    model_name = "veo-3.1-generate-preview"
    print(f"🚀 正在向 Google 提交图生视频任务 (模型: {model_name})...")
    print(f"📝 专属动效提示词: {prompt[:80]}...")
    
    source = types.GenerateVideosSource(
        prompt=prompt,
        image=image
    )
    
    operation = client.models.generate_videos(
        model=model_name,
        source=source,
        config=types.GenerateVideosConfig(
            duration_seconds=6,
            aspect_ratio="16:9",
            person_generation="allow_adult"
        )
    )
    
    print(f"⏳ 任务已提交，操作名称: {operation.name}")
    print("⏳ Veo 3.1 正在逐帧渲染视频，通常需要 30~60 秒，请稍候...")
    
    start_time = time.time()
    while not operation.done:
        time.sleep(10)
        elapsed = int(time.time() - start_time)
        print(f"⏳ 正在渲染中... [已耗时: {elapsed}s]")
        operation = client.operations.get(operation)
        
    if operation.error:
        print(f"❌ Veo 生成失败: {operation.error}")
        sys.exit(1)
        
    print("🎉 Veo 视频渲染完成！正在下载 MP4 文件...")
    generated_video = operation.response.generated_videos[0].video
    output_video_path = covers_dir / f"{song_id}_motion.mp4"
    
    client.files.download(file=generated_video, destination=str(output_video_path))
    print(f"💾 视频已保存至: {output_video_path} (文件大小: {output_video_path.stat().st_size / 1024:.1f} KB)")
    
    # 更新 motion_covers.json 注册表
    reg_file = project_dir / "motion_covers.json"
    registry = {}
    if reg_file.exists():
        try:
            registry = json.loads(reg_file.read_text(encoding="utf-8"))
        except Exception:
            registry = {}
            
    registry[song_id] = {
        "video": f"/covers/{song_id}_motion.mp4",
        "title": "周杰伦 · 七里香",
        "model": model_name,
        "type": "veo_ai_generated",
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    reg_file.write_text(json.dumps(registry, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"📋 已自动同步到播放器 motion_covers.json 注册表！")
    print("✨ 大功告成！打开或刷新 http://localhost:8080 即可在播放器中欣赏由 Google Veo 生成的动态封面！")

if __name__ == "__main__":
    main()
