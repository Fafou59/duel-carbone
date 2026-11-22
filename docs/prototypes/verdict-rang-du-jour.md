# Verdict du prototype : le Rang du jour

> Prototype jetable · 2026-11-22 · Le code est archivé dans la branche [`prototype/rang-du-jour`](https://github.com/Fafou59/duel-carbone/tree/prototype/rang-du-jour) (dossier `src/PROTOTYPE-rang-du-jour`). Pour le lancer : `npm run dev` sur cette branche, puis `?variant=A`, `B` ou `C` dans l'adresse.

## La question

Comment montrer le Rang du jour sous le score du Duel du jour (écran de fin et tableau de bord de l'accueil) : une phrase seule, ou une phrase avec un petit graphique ?

## Les variantes testées

Sur le vrai accueil et le vrai écran de fin, avec un faux serveur d'environ 200 joueurs et un score simulé de 0 à 10 :

- **A · La phrase seule** : « Tu as fait mieux ou autant que 72 % des joueurs jusqu'ici ».
- **B · La phrase + 11 barres** : combien de joueurs ont fait 0, 1… 10, la barre du joueur marquée « toi ».
- **C · La phrase + 10 silhouettes** : « Sur 10 joueurs, tu fais mieux ou autant que 7 ».

## Le verdict

**A retenue** par Fabien : la page de fin et le tableau de bord sont déjà riches (score, grille, série, partage, Récapitulatif), un graphique de plus les surchargerait.

Les phrases, raccourcies dans la foulée :

- « du jour » disparaît des phrases : elles sont déjà dans l'encadré du Duel du jour. « Tu as fait mieux ou autant que x % des joueurs jusqu'ici », « Sans-faute, comme x % des joueurs jusqu'ici ».
- L'encouragement (0/10, ou personne d'autre n'a fait moins ou autant) tient en une phrase : « Chaque Duel raté t'en apprend un peu plus. Revanche demain ! »
- Validés tels quels : le sans-faute solitaire (« Sans-faute ! Personne d'autre n'y est arrivé aujourd'hui, pour l'instant. ») et le plafond à 99 % tant qu'un autre joueur a fait mieux.
