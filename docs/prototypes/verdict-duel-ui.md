# Verdict du prototype : écrans du Duel

> Prototype jetable · 2026-11-08 · Le code du prototype est archivé dans la branche [`prototype/duel-ui`](https://github.com/Fafou59/duel-carbone/tree/prototype/duel-ui) (dossier `prototypes/PROTOTYPE-duel-ui`). Pour le lancer : télécharger `index.html` et l'ouvrir dans un navigateur.

## La question

À quoi doit ressembler une Partie de Duel sur mobile : le Duel, la révélation du résultat et la fin de Partie ?

## Les variantes testées

- **A · Cartes face-à-face** : deux grandes cartes, un « VS » qui devient le Rapport.
- **B · La balance** : une balance qui penche du côté le plus lourd.
- **C · L'équivalence** : une question en texte, « 1 🥩 = 10,8 🥑 » et une grille d'icônes.

## Le verdict

**A retenue** (par Fabien et un second testeur), puis améliorée en trois itérations pour donner **A2 · Cartes révisées**. A2 sert de référence pour le vrai jeu.

Ce qui a été validé :

1. **Le Duel** : deux cartes empilées sur mobile, qui tiennent sur un écran de téléphone. Le libellé tient sur deux lignes : le geste (« Acheter une télévision »), puis la quantité ou la durée d'utilisation (« et l'utiliser 8 ans »).
2. **La révélation** :
   - Les empreintes s'affichent sur les cartes.
   - Le bon Geste est encadré en vert (« ✓ émet le plus »). Un mauvais choix est encadré en rouge (« ✗ Ton choix »). Le texte double toujours la couleur.
   - Le Rapport apparaît dans un gros badge (« ×1,6 fois plus »).
3. **Le défilement automatique** vers l'explication, 1,5 s après le choix, sans animation si l'utilisateur a demandé à réduire les animations.
4. **L'explication**, dans cet ordre :
   - le verdict ;
   - l'équivalence « 1 [A] = x [B] » ;
   - le texte du Duel thématique, s'il y en a un ;
   - **un seul tableau comparatif** (une ligne par étape, une colonne par Geste, une ligne Total), avec des jauges derrière les chiffres, **toutes à la même échelle** (100 % = le plus gros des deux totaux) ;
   - les liens vers les fiches ADEME.
5. **La fin de vie négative** (le recyclage évite des émissions) : une jauge hachurée et la mention « dont recyclage ».
6. **Le Récapitulatif** : une grille de deux colonnes. Chaque case affiche « ✓/✗ Duel n », puis « 1 [A] = x [B] » sur une seule ligne, encadrée en vert ou en rouge. Une pression ouvre le détail dans un panneau, qui se ferme avec ×, la touche Échap ou un clic sur le fond.
7. **Le vocabulaire** : « Duel » remplace « Manche » partout (« Duel 3/10 », « Duel suivant → »).
8. **Le ton** : validé tel quel (tutoiement, ludique, rigoureux).

## Ce que le prototype a révélé

- **Les emojis ne suffisent pas** : il n'existe pas d'emoji micro-ondes, et 🫘 ne s'affiche pas sous Windows. Il faut un jeu d'icônes cohérent, à choisir au moment des tickets.
- **Certains Équivalents n'ont pas de Répartition** (l'A/R Paris–New York) : le tableau affiche « – » et une mention explicite.
- **L'origine des durées d'utilisation n'est pas documentée** par l'ADEME. La page Sources dira donc « durée retenue par l'ADEME ».
- **Le mode téléphone d'un navigateur sur PC** ne reproduit pas fidèlement un vrai téléphone : il faut toujours vérifier sur un vrai appareil.
- **Idée de Duel thématique** : « garder son smartphone 2,5 ans ou 5 ans ? ».
