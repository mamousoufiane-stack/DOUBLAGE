from prepare_media import ROOT
import json, subprocess
import imageio_ffmpeg
import numpy as np
from faster_whisper import WhisperModel

model = WhisperModel('small', device='cpu', compute_type='int8', download_root=str(ROOT/'.tools/models'), cpu_threads=6)
for name in ['toy','inside','soup']:
    path=ROOT/'media-source'/f'{name}-voice.mp4'
    if not path.exists():continue
    result=ROOT/'media-source'/f'{name}-transcript-en.json'
    if result.exists():continue
    print('Transcribing '+name, flush=True)
    raw=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(path),'-vn','-f','f32le','-ac','1','-ar','16000','pipe:1'],capture_output=True,check=True).stdout
    segments, info = model.transcribe(np.frombuffer(raw,dtype=np.float32),language='en',word_timestamps=True,vad_filter=True)
    data=[]
    for seg in segments:
        data.append({'start':seg.start,'end':seg.end,'text':seg.text,'words':[{'start':w.start,'end':w.end,'text':w.word} for w in seg.words]})
    result.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Done '+name, flush=True)
