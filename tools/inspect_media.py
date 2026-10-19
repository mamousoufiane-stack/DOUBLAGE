from prepare_media import ROOT
import sys, subprocess, json
import imageio_ffmpeg
import av
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
for name in ['inside','soup','toy']:
    path=ROOT/'media-source'/f'{name}.mp4'
    if not path.exists():continue
    container=av.open(str(path))
    print(name, 'duration',container.duration/1e6, flush=True)
    container.close()
    subprocess.run([ffmpeg,'-y','-i',str(path),'-vf','fps=1/10,scale=480:-1,tile=4x3','-frames:v','1',str(ROOT/'media-source'/f'{name}-contact.png')],capture_output=True,check=True)
