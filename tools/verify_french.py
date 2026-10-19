from prepare_media import ROOT
from build_scenes import run
from faster_whisper import WhisperModel
import json, numpy as np, sys
sys.stdout.reconfigure(encoding='utf8')
model=WhisperModel('small',device='cpu',compute_type='int8',download_root=str(ROOT/'.tools/models'),cpu_threads=6)
report=[]
for scene in json.loads((ROOT/'dist/media/scenes.json').read_text(encoding='utf8')):
    raw=run('-i',ROOT/'dist'/scene['reference'],'-f','f32le','-ac','1','-ar','16000','pipe:1')
    segments,info=model.transcribe(np.frombuffer(raw,dtype=np.float32),beam_size=3,vad_filter=False)
    text=' '.join(s.text.strip() for s in segments)
    result={'scene':scene['id'],'language':info.language,'probability':round(info.language_probability,3),'transcript':text}
    print(json.dumps(result,ensure_ascii=False),flush=True)
    assert scene['referenceLanguage']=='fr' and info.language=='fr',result
    assert len(raw)/4/16000>=scene['duration']-.1
    report.append(result)
(ROOT/'media-source/french-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
