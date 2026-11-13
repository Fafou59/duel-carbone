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
est présentée comme une estimation, avec sa fourchette (de 2 à 11 kg CO2e au décompte du lancement, le 13 novembre 2026, après une première estimation de 2 à 23 kg resserrée le 12) et la mention
explicite qu'elle ne vient pas de l'ADEME, à deux endroits seulement :

- la page « En savoir plus » ;
- **l'Easter Egg** (décidé le 12 novembre 2026, #63) : un Geste « Créer Duel Carbone, assisté par IA », qui vaut
  l'hypothèse centrale, **réservé à deux Duels thématiques** (face au steak de bœuf et au jean, environ 3 % des
  Parties). Jamais tiré au hasard : les Duels ordinaires restent 100 % ADEME. Sa révélation dit « estimation de
  Duel Carbone, hors ADEME » et renvoie vers la méthode.

## Options écartées

- **Ne rien afficher** : plus simple, mais un jeu sur l'empreinte carbone qui tait la sienne perdrait en crédibilité.
- **Un Geste tiré comme les autres** : il serait sorti dans environ une Partie sur cinq, face à n'importe quel
  Geste, mêlant une estimation à la fourchette large aux valeurs de l'ADEME. Réservé à deux Duels, il reste un
  clin d'œil.
- **Une valeur unique, sans fourchette** : plus lisible, mais trompeuse vu l'incertitude (un facteur 5 entre les
  hypothèses basse et haute).

## Conséquences

- Les chiffres vivent dans `src/donnees/empreinte-ia.ts`, le calcul dans `src/domaine/empreinte-ia.ts` ; la page
  et le Geste de l'Easter Egg (`src/donnees/geste-ia.ts`) les lisent et suivent d'eux-mêmes une mise à jour. Le
  Geste étant réservé, sa valeur n'entre pas dans l'équilibrage : pas de `npm run calibrer` à chaque décompte.
  Elle fixe en revanche la place de ses deux Duels dans la Partie : `npm run calendrier` les replace dans les
  Parties du jour à venir (aucun test ne l'exige, les jours passés ne bougent pas). Ses deux textes ne le chiffrent
  que par `{a}` ou `{b}` : pas de relecture.
- `npm run empreinte-ia` recompte les jetons dans les journaux de session (sur l'ordinateur où le projet est
  développé) ; on reporte le résultat à la main, avec la date du décompte. Le décompte se refait au lancement
  officiel, puis à chaque PR une fois le jeu livré (environ 20 g CO2e par mise à jour) ; jamais automatiquement.
- Si Anthropic publie l'énergie de ses modèles, l'estimation est refaite avec cette source.
