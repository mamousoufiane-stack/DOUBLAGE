"""Download the three requested public clips; keep all processing local."""
from pathlib import Path
import sys, json, os, re
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools/python'))
os.environ['HF_HOME'] = str(ROOT / '.tools/models')
import yt_dlp
import imageio_ffmpeg

CLIPS = [('toy', 'zpbiUrU7I54'), ('inside', 'IrG4QTQfFU0'), ('soup', 'AdQl1UVIiIA')]

def download(reference=False):
    target = ROOT / 'media-source'
    target.mkdir(exist_ok=True)
    for name, video_id in CLIPS:
        if reference:
            info = json.loads((target / f'{name}.info.json').read_text(encoding='utf-8'))
            match = re.search(r'VO\s*:\s*https://youtu.be/([\w-]+)', info.get('description',''))
            if not match:
                print(f'No voice reference for {name}', flush=True)
                continue
            video_id = match[1]
            name += '-voice'
        if (target / f'{name}.mp4').exists():
            continue
        try:
            with yt_dlp.YoutubeDL({
                'outtmpl': str(target / (name + '.%(ext)s')),
                'format': 'bv*[height<=360][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b' if reference else 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/b[height<=720]',
                'http_chunk_size': 1024 * 1024,
                'merge_output_format': 'mp4',
                'ffmpeg_location': imageio_ffmpeg.get_ffmpeg_exe(),
                'js_runtimes': {'node': {}},
                'writeinfojson': True,
                'noplaylist': True,
                'retries': 1,
                'socket_timeout': 20,
            }) as downloader:
                downloader.download(['https://www.youtube.com/watch?v=' + video_id])
        except Exception as exc:
            print(f'{name}: {exc}', flush=True)

if __name__ == '__main__':
    download('--reference' in sys.argv)
