from prepare_media import ROOT
import numpy as np, subprocess,json,sys
import imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe()
def frame(path,time,band):
    crop='crop=iw:ih*0.75:0:0,' if band else ''
    r=subprocess.run([ff,'-v','error','-ss',str(time),'-i',str(path),'-frames:v','1','-vf',crop+'scale=96:54:flags=area,format=gray','-f','rawvideo','pipe:1'],capture_output=True,check=True)
    a=np.frombuffer(r.stdout,dtype=np.uint8).reshape(54,96)[5:48,8:88].astype(np.float32).ravel();a-=a.mean();return a/np.linalg.norm(a)
def series(path,start,length):
    r=subprocess.run([ff,'-v','error','-ss',str(start),'-i',str(path),'-t',str(length),'-vf','fps=25,scale=96:54:flags=area,format=gray','-f','rawvideo','pipe:1'],capture_output=True,check=True)
    a=np.frombuffer(r.stdout,dtype=np.uint8).reshape(-1,54,96)[:,5:48,8:88].astype(np.float32).reshape(-1,43*80);a-=a.mean(axis=1,keepdims=True);return a/np.maximum(1,np.linalg.norm(a,axis=1,keepdims=True))
jobs=[('toy','toy',[60,65,69],-41.4),('inside','inside',[12,17,21],-11.2)]
if len(sys.argv)>1:jobs=[('soup',sys.argv[1],[13,15,17],float(sys.argv[2]))]
for name,vf,times,guess in jobs:
    results=[]
    for time in times:
        a=frame(ROOT/'media-source'/f'{name}.mp4',time,True)
        start=max(0,time+guess-.7);b=series(ROOT/'media-source'/f'{vf}-vf.mp4',start,1.4)
        score=b@a;idx=int(np.argmax(score));results.append({'band':time,'vf':round(start+idx/25,3),'correlation':round(float(score[idx]),3)})
    print(name,json.dumps(results),flush=True)
    (ROOT/'media-source'/f'{name}-vf-alignment.json').write_text(json.dumps(results,indent=2))
