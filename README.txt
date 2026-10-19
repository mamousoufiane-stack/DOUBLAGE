RITMO JUNIOR — STUDIO LOCAL, VERSION 5 — RALENTI ET RACCORDS CORRIGES

DEMARRER
Fermer l'ancienne console Ritmo, puis double-cliquer sur LANCER.bat.
Le navigateur ouvre http://localhost:8767. Garder la console ouverte.
Si une ancienne page est déjà ouverte, actualiser avec Ctrl+F5.
Python 3 est nécessaire. Aucune installation supplémentaire pour jouer.
Alternative : python server.py --open

NOUVEAUTES
- Capture PCM horodatée sur le fil audio : la courbe et la prise utilisent
  les mêmes échantillons, avec des repères toutes les 20 ms. La courbe live
  utilise une fenêtre de 256 échantillons au lieu de 2048. Le micro est demandé
  sans réduction de bruit ni annulation d'écho. Aucun retour micro aux enceintes.
  Cela ne mesure ni n'annule le retard matériel d'un casque Bluetooth.
- La demande de micro part du clic avant l'attente de préparation audio.
  Sur iPad, ouvrir le site HTTPS directement dans Safari et autoriser le micro
  pour ce site. Un refus antérieur se modifie dans les réglages du site.
- Un écran de progression prépare le montage : vidéo entièrement téléchargée
  en mémoire, audio décodé et chronologie prête avant de proposer la réécoute.
  La lecture ne relance plus play/pause à chaque image. Les silences dans les
  marges sont retirés, en conservant 100 ms autour du son détecté ; seules les
  marges audibles prolongent la scène. La zone de dialogue n'est jamais rognée.
- Graphique agrandi par phrase : modèle VF violet et prise verte superposés,
  curseur blanc et zoom temporel x2/x3. Trois zones indiquent quand se préparer,
  parler et terminer. Le modèle contient aussi les bruitages de la VF.
- Le micro capture 0,6 seconde avant et 1 seconde après chaque réplique.
  Ces marges restent dans la prise. Au montage, leur silence est raccourci.
  Le montage insère de courtes pauses d'image aux limites de chaque phrase
  enregistrée, sans accélérer ni superposer la fin avec le personnage suivant.
- Choisir un personnage ou Toutes les voix, puis Enregistrer ma voix.
- Une étape par réplique : écouter la VF, enregistrer après le décompte,
  écouter sa prise, recommencer ou valider. La capture s'arrête à la fin
  de la phrase. Aucune avance automatique sans validation.
- La dernière validation assemble la scène complète dans Mes prises.
  Buzz seul : une courte exclamation à enregistrer dans cet extrait ;
  les neuf répliques de Woody restent en VF. Toutes les voix : dix prises.
- Quitter l'atelier efface ses phrases non montées, sans toucher aux montages.
- Graphique réel du microphone en direct, avec niveau en dBFS et indication
  de saturation. Tester mon micro permet de parler sans enregistrer.
- Chronologie à deux courbes : son témoin et voix enregistrée. Chaque courbe
  vient de données audio réelles. Aucun score de justesse n'est inventé.
- Rejouer avec la scène lit la VIDEO LOCALE, l'ambiance et la prise ensemble.
  Vitesse par défaut : 0,75x. La vitesse choisie est conservée pendant
  l'enregistrement, dans le montage audio exporté et à la réécoute vidéo.
  Le ralenti de la VF conserve la hauteur des voix ; ta prise n'est pas accélérée.
- Lecture, pause, retour au début, déplacement dans la vidéo et arrêt de réécoute.
- Bande rythmo française avec une ligne par personnage et texte agrandi.
- Cliquer une réplique dans le panneau de droite se place juste avant celle-ci.
- Aucun lecteur YouTube, appel publicitaire, compte ou police distante.

SCENES DISPONIBLES
Trois mini-animations originales pour les 7–9 ans sont conservées.
Trois extraits Romandub sont maintenant préparés et inclus dans dist/media :
1. Toy Story — Bonjour, Woody ! : 13,25 secondes, Buzz et Woody.
2. Vice-Versa — Quelle surprise ! : 11,8 secondes, Bing Bong, Tristesse et Joie.
3. Ratatouille — Où est la soupe ? : 6,3 secondes, Skinner.

Pour les enfants : commencer à 0,75x, lire le texte avant de jouer et répéter
un personnage à la fois. Le passage Vice-Versa montre des personnages qui
changent de forme : prévoir un accompagnement pour les enfants sensibles.
L'extrait Ratatouille s'arrête avant les menaces et insultes du passage complet.
Ce sont des choix pédagogiques, pas une classification officielle par âge.

VOIX TEMOINS ET PREPARATION
Toutes les scènes vidéo proposent désormais les vraies voix FRANCAISES.
La case Ecouter les voix françaises permet d'entendre leur interprétation.
L'image et le son témoin sont extraits de la même version française : leurs
dialogues restent synchronisés. L'ambiance sans dialogues provient de la bande
rythmo correspondante, recalée sur ce passage.
Les textes français sont relevés sur les bandes puis vérifiés avec les
transcriptions des sources VF et répartis par personnage. Leurs timings ont
été adaptés aux fichiers français. Les trois pistes finales ont également
passé une détection automatique de langue, sans forcer la langue française.
Il ne s'agit pas d'un alignement labial au phonème ni de voix synthétiques.

La courbe témoin contient la bande sonore complète (voix, musique, bruitages),
pas une voix séparée par intelligence artificielle. Le montage remplace les
intervalles des répliques choisies, y compris les espaces autour des phrases,
par l'ambiance sans dialogues et la voix enregistrée. Les limites de Toy Story
ont été revues pour éviter les fragments de Woody entre deux prises.
Toutes les voix : aucune VF dans le fond sonore du montage. Un personnage :
les autres personnages conservent leur VF. Au ralenti, le fond sonore est
étiré à la vitesse choisie avant l'ajout des prises, sans accélérer celles-ci.
Il s'agit d'un montage par horodatages, adapté à ces extraits sans dialogues
superposés, pas d'une séparation automatique de locuteurs. Des variations
d'ambiance peuvent être perceptibles aux raccords entre les deux sources.
Le son du lecteur est coupé pendant l'enregistrement pour ne pas être repris
par le micro. L'ambiance est ajoutée uniquement au montage.
Les mini-animations originales n'ont pas de voix témoin : les personnages
non joués y restent silencieux, comme indiqué à l'ouverture de l'atelier.

FICHIERS
dist/index.html : interface.
dist/studio.js : lecteur, micro, graphiques et synchronisation.
dist/guided.js : étapes par réplique et assemblage audio local.
dist/comfort.js : graphique agrandi, marges et chronologie du montage.
dist/capture.js et pcm-capture.js : capture audio PCM et courbe horodatée.
dist/playback.js : préparation en mémoire et lecture du montage.
dist/vendor : SoundTouchJS 0.1.30, sources et licence LGPL-2.1 incluses.
dist/local-scenes.js et dist/media/scenes.json : textes, personnages, timings,
sources et courbes des trois extraits.
dist/media : MP4, pistes témoins M4A et vignettes ; tous inclus dans le ZIP.
server.py : serveur local, avec requêtes HTTP Range pour les vidéos.
media-source : téléchargements complets et données d'analyse, conservés dans
le dossier de travail mais NON inclus dans le ZIP destiné à jouer.
tools/build_french_scenes.py : reconstruction des scènes françaises.
tools/verify_french.py : contrôle de langue des pistes finales.
.tools : outils et modèle locaux, non nécessaires pour lancer le studio.

PRISES
Les enregistrements restent en mémoire dans le navigateur pendant la session.
Télécharger les prises à garder avant de fermer ou recharger la page.
Le téléchargement exporte le montage audio complet en WAV stéréo : voix
enregistrées, autres personnages en VF et ambiance.
Il ne produit pas un montage vidéo exportable. Aucun enregistrement n'est envoyé.

VALIDATION
Chrome, microphone simulé : courbe du micro, arrêt des pistes micro, décodage
des trois vidéos, lecture/seek/fin, écoute témoin, enregistrement par phrase,
reprise, validation, filtrage Buzz seul, progression Toutes les voix,
conservation de la VF à 1x hors des intervalles remplacés (écart PCM < 0,00007),
absence de VF dans les espaces attribués au personnage remplacé,
ralenti à 0,75x et conservation de hauteur vérifiés à 16, 44,1 et 48 kHz,
réécoute vidéo et prise ensemble, contrôle du décalage inférieur à 200 ms
dans le scénario de test, arrêt manuel et affichage mobile.
Le test vérifie aussi qu'aucune requête vers un hôte externe n'est émise.
La qualité et la latence d'un microphone physique dépendent du matériel.
Les anciens WAV ne sont pas modifiés : les mots tronqués lors d'une ancienne
capture ne peuvent pas être récupérés. Refaire les prises avec cette version.

SOURCES DES BANDES ET DES VERSIONS FRANÇAISES
Toy Story, bande : https://www.youtube.com/watch?v=zpbiUrU7I54
Toy Story, VF : https://www.youtube.com/watch?v=Cb-EW5gwkrk
Vice-Versa, bande : https://www.youtube.com/watch?v=IrG4QTQfFU0
Vice-Versa, VF : https://www.youtube.com/watch?v=GH2dbJBQQAE
Ratatouille, bande : https://www.youtube.com/watch?v=AdQl1UVIiIA
Ratatouille, VF : https://www.youtube.com/watch?v=GOh218v6KtE
Inspiration de fonctionnement : https://www.dubtake.com/

