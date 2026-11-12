# Accessibilité : la liste de vérification

Les exigences du PRD (histoires 29 à 31), vérifiées une par une pour le ticket #18. La plupart sont testées
automatiquement à chaque modification (`npm run e2e`, lancé par la CI) ; le reste se vérifie à la main.

Référence : les règles WCAG 2.2, niveaux A et AA (la norme internationale, reprise en France par le RGAA).

## Ce que vérifie le robot (Playwright)

| Exigence | Comment | État |
|---|---|---|
| Jeu entièrement au clavier | Le Duel du jour et une Partie libre joués de bout en bout avec Tab, 1, 2, Entrée et Échap (`e2e/partie-au-clavier.spec.ts`) | ✓ |
| Focus visible | À chaque appui sur Tab, l'élément atteint doit montrer un contour | ✓ |
| Le focus va au bon endroit | Sur la position (« Duel 3/10 ») à chaque Duel, sur l'explication après le choix, sur le titre à la fin, sur la case du Récapitulatif après la fermeture de son détail | ✓ |
| Contrastes, noms des boutons, tableaux, rôles ARIA | Analyse axe-core de chaque écran (accueil, tutoriel, Sources, Duel, réponse, fin, détail d'un Duel, tableau de bord du jour), en mode clair et en mode sombre (`e2e/accessibilite.spec.ts`) | ✓ |
| Zoom à 200 % | Chaque écran à 320 px de large (un écran de 640 px zoomé à 200 %) : rien ne déborde sur le côté | ✓ |
| Réglage « réduire les animations » | Plus aucune animation en cours sur l'accueil ni pendant un Duel, pas de confettis | ✓ |
| Arrêter ce qui défile | Un clic sur la vitrine met ses rubans en pause ; Entrée les relance | ✓ |

L'annonce d'un Duel thématique n'est analysée que lorsque le hasard en tire un pendant le test ; son code suit
le même modèle que le détail d'un Duel (balise `<dialog>`), qui, lui, est toujours analysé.

## Ce qui a été corrigé (ticket #18)

- **Récapitulatif** : le nom lu de chaque case commence maintenant par ce qui est affiché (« Duel 1 (réussi) : … »).
  On peut donc la désigner à la voix (« clique sur Duel 1 », WCAG 2.5.3).
- **Tutoriel** : l'étape en cours (« Étape 2 sur 5 ») était posée sur un paragraphe, où les lecteurs d'écran
  l'ignorent ; elle est maintenant écrite en texte caché.
- **Grille du Duel du jour (accueil)** : chaque case porte un ✓ ou un ✗. Le vert et le rouge seuls se confondent
  pour un daltonien (WCAG 1.4.1, « la couleur n'est jamais la seule information »).
- **Icônes qui défilent** (WCAG 2.2.2, un contenu qui bouge plus de 5 secondes doit pouvoir s'arrêter) : un clic,
  un toucher ou Entrée sur la vitrine ou la frise les arrête, un second les relance. Pas de bouton « pause » visible :
  on touche simplement les icônes, et un lecteur d'écran annonce « Mettre en pause le défilement des icônes ».
- **Frise d'icônes** : seulement à la fin d'une Partie et dans les Sources. Ni sur l'accueil (avec la vitrine, deux
  rubans bougeaient en même temps), ni pendant les Duels (elle détournait l'attention des cartes).

## Information jamais portée par la seule couleur (relu à la main)

| Endroit | La couleur est doublée par… |
|---|---|
| Verdict | « ✓ Bonne réponse ! » / « ✗ Raté ! » |
| Cartes révélées | « ✓ émet le plus » / « ✗ Ton choix » |
| Difficulté | Son nom écrit (facile, moyen, difficile, ultime, ★ thématique) |
| Barre de progression | « Duel 3/10 », écrit au-dessus (la barre est cachée aux lecteurs d'écran) |
| Récapitulatif et grille du jour | ✓ et ✗ |

## À vérifier à la main : le lecteur d'écran

À faire par Fabien avec **NVDA** (gratuit, Windows : [nvaccess.org](https://www.nvaccess.org)), dans Firefox ou
Chrome. Raccourcis utiles : Insert + flèche bas lit la suite ; Tab passe d'un bouton à l'autre ; H saute de titre
en titre ; T va au tableau, puis Ctrl + Alt + flèches s'y déplacent.

1. **Accueil** : le titre, l'accroche et le bouton « Jouer le Duel du jour n° N » sont lus.
2. **Un Duel** : « Duel 1 sur 10 » est lu, puis les deux cartes, chacune comme un bouton avec son geste et sa quantité.
3. **Après le choix** : le verdict (« Bonne réponse ! ») est annoncé sans rien faire, puis l'équivalence en phrase
   (« … émet 10,8 fois plus que… »).
4. **Tableau de Répartition** : en s'y déplaçant, chaque chiffre est lu avec son étape et son geste.
5. **Duel thématique** : l'annonce est lue à son ouverture, et Échap ou « Au Duel ! » la ferme.
6. **Fin** : le score est lu, puis chaque case du Récapitulatif (« Duel 1 (réussi) : … »).
7. **Partage** : après « Défier mes proches », la confirmation « Score copié ! » est annoncée.

Bonus sur iPhone : la même chose avec **VoiceOver** (Réglages → Accessibilité → VoiceOver), en glissant le doigt
vers la droite pour passer d'un élément à l'autre.
