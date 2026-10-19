from prepare_media import ROOT
import subprocess, json
import imageio_ffmpeg, numpy as np
ff=imageio_ffmpeg.get_ffmpeg_exe()
def frames(path, start, length, band=False, fps=2):
    crop='crop=iw:ih*0.72:0:0,' if band else ''
    r=subprocess.run([ff,'-v','error','-ss',str(start),'-i',str(path),'-t',str(length),'-vf',crop+f'fps={fps},scale=96:54:flags=area,format=gray','-f','rawvideo','pipe:1'],capture_output=True,check=True)
    return np.frombuffer(r.stdout,dtype=np.uint8).reshape(-1,54,96)
for name,start in [('toy',56.95),('inside',10.5),('soup',11)]:
    target=frames(ROOT/'media-source'/f'{name}.mp4',start,12 if name!='soup' else 7,True)
    source=frames(ROOT/'media-source'/f'{name}-vf.mp4',0,600)
    # Match frame sequences with per-frame normalized luminance. Letterboxing
    # differs slightly, so use the central region and rank several candidates.
    a=target[:,6:46,8:88].reshape(len(target),-1).astype(np.float32)
    b=source[:,6:46,8:88].reshape(len(source),-1).astype(np.float32)
    a-=a.mean(axis=1,keepdims=True);b-=b.mean(axis=1,keepdims=True)
    a/=np.maximum(1,np.linalg.norm(a,axis=1,keepdims=True));b/=np.maximum(1,np.linalg.norm(b,axis=1,keepdims=True))
    scores=[]
    for i in range(len(b)-len(a)):
        scores.append((float((a*b[i:i+len(a)]).sum(axis=1).mean()),i/2))
    print(name,sorted(scores,reverse=True)[:5],flush=True)
