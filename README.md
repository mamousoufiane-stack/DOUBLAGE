# DOUBLAGE — Ritmo Junior

Studio de doublage en français pour les enfants de 7 à 9 ans : choix du
personnage, bande rythmo, graphique du micro et enregistrement phrase par phrase.
Le montage conserve les autres personnages en VF. Le ralenti à 0,75× est
conservé à la réécoute, sans accélérer les prises.

## Ouvrir le studio

Adresse prévue après activation de GitHub Pages :
https://mamousoufiane-stack.github.io/DOUBLAGE/

Autoriser le microphone dans le navigateur. Les prises restent dans la mémoire
de l'appareil : télécharger le montage WAV avant de fermer ou recharger la page.
Les vidéos sont servies avec le site ; aucun lecteur YouTube n'est utilisé.

## Publication

Dans les paramètres du dépôt, ouvrir **Pages**, puis sélectionner **GitHub
Actions** comme source. Le workflow `.github/workflows/pages.yml` publie `dist/`
à chaque mise à jour de `main`. Il peut aussi être lancé depuis l'onglet Actions.

## Utilisation locale

Avec Python 3 installé, lancer `LANCER.bat`, ou `python server.py --open`.
Voir `README.txt` pour le fonctionnement, les limites du montage et les sources
des extraits. Les vidéos et voix des films appartiennent à leurs ayants droit.
SoundTouchJS est fourni sous LGPL-2.1-or-later avec sa licence et ses sources.

Les outils de préparation sont dans `tools/`. Les sources vidéo complètes,
modèles de transcription et prises personnelles ne sont pas inclus dans le dépôt.
