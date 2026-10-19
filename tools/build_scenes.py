"""Build short local dubbing scenes from downloaded Romandub band + VO pairs.

French lines were read from the on-screen rhythm band. Character assignments
follow its role/color legend; VO recognition provides timing cross-checks only.
No speaker separation or voice cloning is performed.
"""
from prepare_media import ROOT
import subprocess, json
import imageio_ffmpeg
import numpy as np

SPECS = [
    dict(id='toy', title='Toy Story · Bonjour, Woody !', category='LES PRÉSENTATIONS', color='#3d526a', icons=['🚀','🤠'],
         start=56.95, end=70.15, roles=['Buzz','Woody'], level='7–9 ans · au ralenti',
         tip='Woody se présente gentiment. Buzz est surpris ! Essaie à 0,75× et fais une petite pause entre les phrases.',
         source='https://www.youtube.com/watch?v=zpbiUrU7I54',
         lines=[[57.3,57.7,1,'Coucou !'],[58.04,58.46,0,'Houya !'],[58.9,59.5,1,'Wow !'],
                [60.0,61.55,1,'Wow ! Woh woh woh !'],[61.74,62.5,1,"Quoi ? Je t’ai fait peur ?"],
                [63.0,63.8,1,"Je l’ai pas fait exprès."],[64.0,64.9,1,'Non, pardon. Salut, cow-boy.'],
                [65.0,66.0,1,"Moi, c’est Woody."],[66.05,68.3,1,"Et ça, c’est la chambre d’Andy."],
                [68.7,70.04,1,'Voilà, les présentations sont faites.']]),
    dict(id='inside', title='Vice-Versa · Quelle surprise !', category='JOUE LA SURPRISE',color='#655073', icons=['🐘','😢','🌟'],
         start=10.5,end=22.9,roles=['Bing Bong','Tristesse','Joie'],level='8–9 ans · accompagné',
         tip='Joue la surprise : les personnages changent de forme. Répète une voix à la fois ; ce passage peut impressionner les plus sensibles.',
         source='https://www.youtube.com/watch?v=IrG4QTQfFU0',
         lines=[[11.6,12.3,0,"Qu’est-ce que j’avais dit ?"],[12.55,14.1,0,'Vous y serez en un rien de temps.'],
                [15.5,17.2,0,"Waouh ! Un feu d’artifice."],[17.7,18.05,2,'Quoi ?'],
                [18.4,19.05,2,"Qu’est-ce qui se passe ?"],[19.4,20.6,1,"Oh non. Ils l’ont allumé."],
                [20.85,21.1,0,'Oh.'],[21.45,22.7,0,"Alors ça, c’est complètement fou."]]),
    dict(id='soup',title='Ratatouille · Où est la soupe ?',category='UN CHEF PRESSÉ',color='#63533e',icons=['👨‍🍳','🥣'],
         start=11.0,end=18.0,roles=['Skinner'],level='7–9 ans · très court',
         tip='Le chef est pressé : parle avec énergie, sans crier dans le micro. Le passage s’arrête avant les menaces de la scène complète.',
         source='https://www.youtube.com/watch?v=AdQl1UVIiIA',
         lines=[[13.3,14.0,0,'La soupe !'],[14.75,16.1,0,'Où est la soupe ?'],[16.4,17.6,0,'Poussez-vous de là !']]),
]

def run(*args):
    result=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y',*map(str,args)],capture_output=True)
    if result.returncode:raise RuntimeError(result.stderr.decode(errors='replace'))
    return result.stdout

def build():
    from build_french_scenes import build as build_french
    build_french()

if __name__ == '__main__': build()
