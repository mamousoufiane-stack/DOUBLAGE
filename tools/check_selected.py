from prepare_media import ROOT
import imageio_ffmpeg, subprocess, numpy as np, json
from faster_whisper import WhisperModel
model=WhisperModel('small',device='cpu',compute_type='int8',download_root=str(ROOT/'.tools/models'),cpu_threads=6)
for name,start,length in [('inside',10,12),('soup',11,9),('toy',56,15)]:
    raw=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-ss',str(start),'-i',str(ROOT/'media-source'/f'{name}-voice.mp4'),'-t',str(length),'-vn','-f','f32le','-ac','1','-ar','16000','pipe:1'],capture_output=True,check=True).stdout
    samples=np.frombuffer(raw,dtype=np.float32)
    print(name,'peak',float(np.max(np.abs(samples))),flush=True)
    segments,_=model.transcribe(samples,language='en',vad_filter=False,word_timestamps=True,condition_on_previous_text=False)
    result=[{'start':s.start+start,'end':s.end+start,'text':s.text} for s in segments]
    print(json.dumps(result),flush=True)
    (ROOT/'media-source'/f'{name}-selected.json').write_text(json.dumps(result,indent=2),encoding='utf8')
