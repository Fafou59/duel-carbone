---
status: accepted
date: 2026-11-12
---

# L'empreinte de la création du jeu par IA : une estimation hors ADEME, dans « En savoir plus » seulement

Le jeu est codé avec l'aide d'une IA (Claude, d'Anthropic). Par transparence, nous affichons l'empreinte carbone
de ce travail. Aucune source publique, ADEME comprise, ne donne l'énergie consommée par ce modèle : nous
l'**estimons** à partir des jetons consommés (lus dans les journaux de Claude Code), de l'énergie par jeton
estimée par Epoch AI pour un modèle comparable, et de l'électricité américaine. La méthode, les sources et les
limites sont dans [docs/empreinte-ia.md](../empreinte-ia.md).

C'est une **exception** à la règle qui fonde le jeu, « toutes les valeurs viennent de l'ADEME » (ADR 0001). Elle
est cantonnée à la page « En savoir plus », présentée comme une estimation, avec sa fourchette (de 2 à 23 kg CO2e
au 12 novembre 2026) et la mention explicite qu'elle ne vient pas de l'ADEME.

## Options écartées

- **Ne rien afficher** : plus simple, mais un jeu sur l'empreinte carbone qui tait la sienne perdrait en crédibilité.
- **Un Geste du jeu** (« Créer cette application avec une IA ») : l'idée reste ouverte, mais un Geste se compare à
  des valeurs ADEME dans un Duel ; une estimation à la fourchette aussi large y serait mal à sa place. À rediscuter
  après le lancement.
- **Une valeur unique, sans fourchette** : plus lisible, mais trompeuse vu l'incertitude (un facteur 10 entre les
  hypothèses basse et haute).

## Conséquences

- Les chiffres vivent dans `src/donnees/empreinte-ia.ts`, le calcul dans `src/domaine/empreinte-ia.ts` ; la page
  les lit et suit d'elle-même une mise à jour.
- `npm run empreinte-ia` recompte les jetons dans les journaux de session (sur l'ordinateur où le projet est
  développé) ; on reporte le résultat à la main, avec la date du décompte.
- Si Anthropic publie l'énergie de ses modèles, l'estimation est refaite avec cette source.
