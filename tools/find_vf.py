from prepare_media import ROOT
import yt_dlp, json, sys
sys.stdout.reconfigure(encoding='utf-8')
for query in sys.argv[1:] or ['Vice Versa pensée abstraite français','Vice Versa raccourci VF','Ratatouille la soupe français']:
    with yt_dlp.YoutubeDL({'quiet':True,'extract_flat':True,'skip_download':True}) as dl:
        r=dl.extract_info('ytsearch6:'+query,download=False)
        print(json.dumps({'query':query,'results':[{'id':e['id'],'title':e.get('title'),'duration':e.get('duration')} for e in r['entries']]},ensure_ascii=False),flush=True)
