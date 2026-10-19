from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'tools/build_scenes.py';s=p.read_text(encoding='utf8');s=s[:s.index('def build():')]+'''def build():
    from build_french_scenes import build as build_french
    build_french()

if __name__ == '__main__': build()
''';p.write_text(s,encoding='utf8')
p=ROOT/'dist/index.html';s=p.read_text(encoding='utf8').replace('Écouter le témoin (anglais)','Écouter les voix françaises');p.write_text(s,encoding='utf8')
p=ROOT/'dist/studio.js';s=p.read_text(encoding='utf8')
s=s.replace('Les extraits de films proviennent des bandes rythmo et versions avec voix publiées par Romandub.','Les images et voix témoins proviennent des versions françaises des films. Les ambiances sans dialogues sont issues des bandes rythmo Romandub.')
s=s.replace('Source Romandub','Source VF')
s=s.replace('Les dialogues ont été transcrits localement, puis relus et répartis par personnage.','Les dialogues français ont été vérifiés par transcription locale, relus et répartis par personnage. Image et voix témoin proviennent du même extrait VF.')
p.write_text(s,encoding='utf8')
