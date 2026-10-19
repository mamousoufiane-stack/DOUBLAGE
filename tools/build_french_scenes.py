"""Build local scenes from verified French-dubbed picture and sound sources."""
from build_scenes import SPECS, run
from prepare_media import ROOT
import json, numpy as np

FRENCH = {
    'toy': dict(file='toy', start=15.6, end=28.85, bandStart=56.8,
        source='https://www.youtube.com/watch?v=Cb-EW5gwkrk',
        lines=[[15.6,16.32,1,'Coucou !'],[16.6,17.1,0,'Houya !'],[17.5,18.0,1,'Wow !'],
            [18.6,19.7,1,'Wow ! Woh woh woh !'],[20.25,21.2,1,"Quoi ? Je t’ai fait peur ?"],
            [21.2,22.12,1,"Je l’ai pas fait exprès."],[22.56,23.62,1,'Pardon. Salut, cow-boy.'],
            [24.06,24.74,1,"Moi, c’est Woody."],[25.2,26.88,1,"Et ça, c’est la chambre d’Andy."],
            [27.2,28.6,1,'Voilà, les présentations sont faites.']]),
    'inside': dict(file='inside',start=0,end=11.8,bandStart=11.3,
        source='https://www.youtube.com/watch?v=GH2dbJBQQAE',
        lines=[[.4,1.34,0,"Qu’est-ce que j’avais dit ?"],[1.54,2.9,0,'Vous y serez en un rien de temps.'],
            [4.46,5.76,0,"Waouh ! Un feu d’artifice."],[6.35,6.7,2,'Quoi ?'],
            [6.9,7.9,2,"Qu’est-ce qui se passe ?"],[8.22,9.32,1,"Oh non. Ils l’ont allumé."],
            [9.6,11.54,0,"Alors ça, c’est complètement fou."]]),
    'soup': dict(file='soup2',start=92.8,end=99.1,bandStart=12.16,
        source='https://www.youtube.com/watch?v=GOh218v6KtE',
        lines=[[94.0,95.76,0,'La soupe !'],[95.76,97.46,0,'Où est la soupe ?'],[97.46,99.1,0,'Poussez-vous de là !']]),
}

def build():
    output=ROOT/'dist/media';output.mkdir(exist_ok=True)
    scenes=[]
    for base in SPECS:
        name=base['id']; spec=FRENCH[name]; start=spec['start']; length=spec['end']-start
        vf=ROOT/'media-source'/f"{spec['file']}-vf.mp4"; band=ROOT/'media-source'/f'{name}.mp4'
        if not vf.exists() or not band.exists():raise FileNotFoundError(name)
        print('Building French '+name,flush=True)
        # Picture and reference audio come from the SAME French source. Only
        # the optional dialogue-free ambience comes from the Romandub band.
        run('-ss',start,'-i',vf,'-ss',spec['bandStart'],'-i',band,'-t',length,
            '-map','0:v:0','-map','1:a:0','-vf','scale=960:-2','-c:v','libx264','-preset','fast','-crf','21',
            '-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',output/f'{name}-fr.mp4')
        run('-ss',start,'-i',vf,'-t',length,'-vn','-c:a','aac','-b:a','128k',output/f'{name}-reference-fr.m4a')
        run('-ss',min(3,length/2),'-i',output/f'{name}-fr.mp4','-frames:v','1','-vf','scale=640:-2',output/f'{name}.jpg')
        raw=run('-i',output/f'{name}-reference-fr.m4a','-f','f32le','-ac','1','-ar','16000','pipe:1')
        samples=np.frombuffer(raw,dtype=np.float32)
        peaks=[round(min(1,float(np.max(np.abs(samples[i:i+640])))),4) for i in range(0,len(samples),640)]
        scene={k:v for k,v in base.items() if k not in ('start','end','lines','source')}
        scene.update(duration=round(length,3),media=f'media/{name}-fr.mp4',reference=f'media/{name}-reference-fr.m4a',
            poster=f'media/{name}.jpg',referenceLanguage='fr',source=spec['source'],referenceSource=spec['source'],
            sourceRange=[start,spec['end']],bandSource=base['source'],bandRange=[spec['bandStart'],round(spec['bandStart']+length,3)],
            peaks=peaks,note='Image et voix de référence en français · fichiers locaux.',
            lines=[[round(a-start,3),round(b-start,3),role,text] for a,b,role,text in spec['lines']])
        if name == 'toy':
            boundaries = [0, 0.82, 1.65, 2.84, 4.5, 5.54, 6.56, 8.08, 9.2, 11.38, 13.25]
            for i, line in enumerate(scene['lines']): line[:2] = boundaries[i:i+2]
        scenes.append(scene)
    (ROOT/'dist/local-scenes.js').write_text('const localScenes = '+json.dumps(scenes,ensure_ascii=False,indent=2)+';\n',encoding='utf8')
    (output/'scenes.json').write_text(json.dumps(scenes,ensure_ascii=False,indent=2),encoding='utf8')
    print('French picture, references, timelines and waveforms ready.',flush=True)

if __name__=='__main__':build()
