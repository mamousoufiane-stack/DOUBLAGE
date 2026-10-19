from prepare_media import ROOT
import json, subprocess, sys
import imageio_ffmpeg, numpy as np
from faster_whisper import WhisperModel
sys.stdout.reconfigure(encoding='utf8')
model=WhisperModel('small',device='cpu',compute_type='int8',download_root=str(ROOT/'.tools/models'),cpu_threads=6)
for name in sys.argv[1:] or ['toy','inside','soup']:
    path=ROOT/'media-source'/f'{name}-vf.mp4'
    if not path.exists():continue
    raw=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(path),'-vn','-f','f32le','-ac','1','-ar','16000','pipe:1'],capture_output=True,check=True).stdout
    segments,info=model.transcribe(np.frombuffer(raw,dtype=np.float32),language='fr',vad_filter=False,word_timestamps=True)
    data=[{'start':s.start,'end':s.end,'text':s.text,'words':[{'start':w.start,'end':w.end,'text':w.word} for w in s.words]} for s in segments]
    (ROOT/'media-source'/f'{name}-vf-transcript.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
    print(name,json.dumps([{k:v for k,v in s.items() if k!='words'} for s in data],ensure_ascii=False),flush=True)
