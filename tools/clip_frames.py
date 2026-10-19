from prepare_media import ROOT
import subprocess
import imageio_ffmpeg
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
for name,start,end in [('toy',57,71),('inside',7,20),('soup',4,18)]:
    subprocess.run([ffmpeg,'-y','-ss',str(start),'-i',str(ROOT/'media-source'/f'{name}.mp4'),'-t',str(end-start),'-vf','fps=1,crop=iw:ih*0.35:0:ih*0.65,scale=800:-1,tile=2x7','-frames:v','1',str(ROOT/'media-source'/f'{name}-text.png')],capture_output=True,check=True)
