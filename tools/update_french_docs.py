from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'README.txt';s=p.read_text(encoding='utf8')
s=s.replace('VERSION 2','VERSION 3 — VOIX FRANÇAISES')
s=s.replace('13,2 secondes','13,25 secondes').replace('12,4 secondes','11,8 secondes').replace('7 secondes, Skinner','6,3 secondes, Skinner')
a=s.index('Les liens VO publiés');b=s.index('La courbe témoin contient',a)
s=s[:a]+'''Toutes les scènes vidéo proposent désormais les vraies voix FRANCAISES.
La case Ecouter les voix françaises permet d'entendre leur interprétation.
L'image et le son témoin sont extraits de la même version française : leurs
dialogues restent synchronisés. L'ambiance sans dialogues provient de la bande
rythmo correspondante, recalée sur ce passage.
Les textes français sont relevés sur les bandes puis vérifiés avec les
transcriptions des sources VF et répartis par personnage. Leurs timings ont
été adaptés aux fichiers français. Les trois pistes finales ont également
passé une détection automatique de langue, sans forcer la langue française.
Il ne s'agit pas d'un alignement labial au phonème ni de voix synthétiques.

'''+s[b:]
s=s.replace('tools/prepare_media.py, transcribe_media.py, build_scenes.py : préparation.','tools/build_french_scenes.py : reconstruction des scènes françaises.\n+tools/verify_french.py : contrôle de langue des pistes finales.'.replace('\n+','\n'))
s=s.replace('Toy Story, VO : https://www.youtube.com/watch?v=yt4YXSgtbBw','Toy Story, VF : https://www.youtube.com/watch?v=Cb-EW5gwkrk')
s=s.replace('Vice-Versa, VO : https://www.youtube.com/watch?v=kYyLso800dg','Vice-Versa, VF : https://www.youtube.com/watch?v=GH2dbJBQQAE')
s=s.replace('Ratatouille, VO : https://www.youtube.com/watch?v=HjJ2D5gKUPY','Ratatouille, VF : https://www.youtube.com/watch?v=GOh218v6KtE')
s=s.replace('SOURCES ROMANDUB','SOURCES DES BANDES ET DES VERSIONS FRANÇAISES')
p.write_text(s,encoding='utf8')
