from prepare_media import ROOT
import subprocess,imageio_ffmpeg
ff=imageio_ffmpeg.get_ffmpeg_exe()
for name,stamp in [('toy',24),('inside',4.5),('soup',13)]:
    subprocess.run([ff,'-y','-v','error','-ss',str(stamp),'-i',str(ROOT/'media-source'/f'{name}-vf.mp4'),'-frames:v','1','-vf','scale=640:-2',str(ROOT/'media-source'/f'{name}-vf-frame.png')],check=True)
