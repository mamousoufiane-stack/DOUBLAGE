from prepare_media import ROOT
import yt_dlp, imageio_ffmpeg, sys
SOURCES={'toy':'Cb-EW5gwkrk','soup':'9YaIdE5jIUI'}
if len(sys.argv)>2:SOURCES={sys.argv[1]:sys.argv[2]}
for name,vid in SOURCES.items():
    path=ROOT/'media-source'/f'{name}-vf.mp4'
    if path.exists():continue
    with yt_dlp.YoutubeDL({'outtmpl':str(path.with_suffix('.%(ext)s')),'format':'bv*[height<=360][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b','merge_output_format':'mp4','ffmpeg_location':imageio_ffmpeg.get_ffmpeg_exe(),'js_runtimes':{'node':{}},'http_chunk_size':1024*1024,'writeinfojson':True,'noplaylist':True,'retries':1,'socket_timeout':20,'quiet':True,'noprogress':True}) as dl:
        dl.download(['https://www.youtube.com/watch?v='+vid])
    print('Downloaded '+name,flush=True)
