# Verdict du prototype : animations

> Prototype jetable · 2026-11-10 · Le code des variantes est sur la branche `prototype/animations` (`prototypes/PROTOTYPE-animations/`), hors de `main`.

## Les questions

1. Quels confettis quand le joueur fait le bon choix dans un Duel ?
   Le bon choix, c'est le Geste qui **émet le plus** (`estBonChoix`, `src/domaine/duel.ts`), pas celui qui émet le moins.
2. Comment montrer au joueur la Difficulté du Duel en cours, et le passage à la Difficulté suivante ?
   Côté joueur, le « niveau » est la **Difficulté** (facile, moyen, difficile, ultime), qui change aux Duels 4, 7 et 10.
   Le « niveau de tirage » du générateur (`regle`, `paire-recente`, `tranche-voisine`) est interne : il n'est pas montré.

## Les variantes

### Confettis

- **A · Éclat discret** : ~28 particules, 1 s, jaillissent de la carte gagnante, qui fait un petit bond.
- **B · Canons de fête** : ~160 confettis, 3 s, deux canons depuis le bas de l'écran, aux couleurs des Difficultés.
- **C · Pluie de feuilles** : ~36 feuilles, 3,6 s, tombent lentement du haut en se balançant.

### Difficulté

- **A · Étiquette qui se retourne** : l'étiquette de l'en-tête se retourne vers la nouvelle couleur, la barre s'illumine (0,7 s).
- **B · Annonce de palier** : une carte annonce la nouvelle Difficulté et l'écart attendu (2,8 s, ou « C'est parti »).
- **C · Escalier et teinte** : la barre devient un escalier, un pion saute de marche en marche, l'écran prend la teinte du palier.

Toutes respectent `prefers-reduced-motion` : pas de particules ni de mouvement, seulement un état final fixe
(halo ou ornement à côté du verdict, étiquette et couleurs mises à jour sans transition).
Aucune dépendance : canvas et Web Animations API natifs.

## Le verdict

Choix de Fabien (2026-11-10) :

- **Confettis : A · Éclat discret.**
- **Difficulté : A · Étiquette qui se retourne.**

Les variantes B et C restent sur la branche `prototype/animations` pour mémoire.

## Itération 2 : le Duel thématique

Question : comment annoncer un Duel thématique, que le joueur découvre en arrivant dessus ?
Demande : un pop-up qui l'annonce avec une petite explication, et la case du Duel dans la barre de progression
qui change de couleur et la garde après la réponse. Le prototype place le Duel thématique en 3e position
(eau du robinet contre eau en bouteille) et part des choix A / A ci-dessus.

- **A · Carte au centre** : le pop-up se retourne au centre de l'écran, sur un voile ; la case passe au bleu « thématique ».
- **B · Feuille du bas** : le pop-up monte du bas de l'écran ; la case est rayée bleu et couleur de la Difficulté.
- **C · Bulle sur la barre** : le pop-up sort de la case du Duel, qui devient bleue et gagne une étoile.

### Verdict de l'itération 2

**A · Carte au centre retenue** (Fabien, 2026-11-10).

Ce qui est validé pour l'intégration :

1. **Surprise** : avant d'arriver au Duel thématique, sa case dans la barre a la couleur de sa Difficulté.
2. **À l'arrivée** : l'étiquette se retourne et devient « ★ thématique » (même animation que la Difficulté A),
   la case s'illumine et passe au bleu « thématique » (`#2563b0`, proposition à valider avec les autres couleurs).
3. **Le pop-up** se retourne au centre de l'écran, sur un voile qui commence sous la barre (la case reste visible).
   Il contient « ★ Duel thématique », les icônes des deux Gestes, un titre et une phrase d'accroche **qui ne donne pas la réponse**.
   « Au Duel ! », Échap ou un toucher sur le voile le ferment.
4. **Après la réponse** : confettis A si le choix est bon, puis l'explication du Duel thématique.
   La case garde le bleu jusqu'à la fin de la Partie.
5. **Animations réduites** : le pop-up apparaît sans mouvement, la case change de couleur sans transition.

À prévoir à l'intégration :

- **Position** : le générateur ne place aujourd'hui les Duels thématiques qu'au Duel 10 (ultime).
  Les placer ailleurs, comme en 3e position ici, est une règle à changer dans `generateur.ts`.
- **Accroche** : `DuelThematique` n'a qu'un `texte`, l'explication montrée après la réponse, qui la dévoile.
  Le pop-up a besoin d'un second texte (titre + accroche) par Duel thématique.
- **Accessibilité** du vrai pop-up : `<dialog>` modal, focus sur « Au Duel ! », retour du focus au Duel à la fermeture.
- **Vrai téléphone** : les animations n'ont été vues qu'en émulation mobile ; à vérifier sur un appareil.

## Intégration

Les trois variantes retenues sont intégrées au jeu (confettis A, Difficulté A, annonce A).
Le texte du pop-up est générique (« Un Duel choisi à la main, parce qu'il en dit long ») en attendant une accroche par Duel thématique.
Le placement d'un Duel thématique ailleurs qu'au Duel 10 reste à décider.
