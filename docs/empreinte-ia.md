# L'empreinte de la création du jeu par IA : la méthode

Duel Carbone est codé avec l'aide d'une IA, **Claude Opus** (Anthropic), dans Claude Code : un humain pilote et
valide, l'IA écrit le code et l'explique. Ce document estime l'empreinte carbone de ce travail. Le résultat est
affiché dans la page « En savoir plus ».

> **Première estimation, au 12 novembre 2026 : environ 10 kg CO2e, entre 2 et 23 kg selon les hypothèses.**
> C'est du même ordre que regarder l'intégrale de Friends en streaming (7,9 kg CO2e selon l'ADEME), ou que manger
> trois steaks de bœuf (3,4 kg chacun).

Ce n'est **pas un chiffre de l'ADEME** : aucune source publique ne donne l'énergie consommée par ce modèle. C'est
la seule exception à la règle « seule source : l'ADEME » ; voir [l'ADR 0004](adr/0004-empreinte-ia-hors-ademe.md).

## 1. Ce qu'on mesure : les jetons

Un modèle de langage lit et écrit des **jetons** (des morceaux de mots, environ ¾ de mot en moyenne). Claude Code
garde un journal de chaque session de travail, où chaque réponse du modèle note ses jetons, en quatre sortes :

| Sorte | Ce que c'est | Nombre (au 12/11/2026) |
|---|---|---|
| Lus | La demande, lue pour la première fois | 4 182 |
| Mis en mémoire | Lus, puis gardés en mémoire pour les échanges suivants | 7 191 528 |
| Relus depuis la mémoire | Le contexte de la conversation, relu à chaque échange | 675 877 238 |
| Écrits | Les réponses du modèle : code, explications | 1 929 432 |

Soit **1 919 appels au modèle** depuis le 8 novembre 2026, dans 5 journaux de session (le dépôt et ses worktrees).
Le décompte se refait avec `npm run empreinte-ia` (`scripts/empreinte-ia.ts`).

L'énorme majorité des jetons est **relue depuis la mémoire** : à chaque échange, le modèle relit toute la
conversation (en moyenne environ 350 000 jetons). C'est beaucoup moins coûteux que de la relire « à froid », mais
pas gratuit.

## 2. De jetons à « jetons lus équivalents »

Les quatre sortes de jetons ne demandent pas le même calcul. **Hypothèse : le prix d'Anthropic suit le calcul
nécessaire.** Ses tarifs donnent les pondérations, comparées à un jeton lu :

| Sorte | Pondération | Pourquoi |
|---|---|---|
| Lu | × 1 | La référence |
| Mis en mémoire | × 1,25 | Lu, plus le stockage |
| Relu depuis la mémoire | × 0,1 | Rien à recalculer, seulement à relire |
| Écrit | × 5 | Le modèle produit les jetons un par un |

Résultat : **environ 86 millions de jetons lus équivalents**. Les jetons relus en pèsent les trois quarts
(68 millions), les jetons écrits et mis en mémoire le reste.

## 3. De jetons à kWh

Anthropic ne publie pas l'énergie consommée par ses modèles. La référence la plus détaillée est l'estimation
d'**Epoch AI** pour GPT-4o ([How much energy does ChatGPT use?](https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use),
février 2025), qui compte le serveur et le centre de données (jusqu'à environ 1 500 W par processeur graphique) :

- une demande courte (500 jetons écrits) : environ 0,3 Wh ;
- une demande avec 10 000 jetons lus : environ 2,5 Wh, soit environ **0,2 mWh par jeton lu** ;
- une demande avec 100 000 jetons lus : environ 40 Wh, soit environ **0,4 mWh par jeton lu**.

Claude Opus est sans doute plus gros que GPT-4o (environ 100 milliards de paramètres actifs selon Epoch). D'où
une fourchette : **de 0,1 à 0,6 mWh par jeton lu équivalent, 0,3 au centre**.

## 4. De kWh à CO2e

Les serveurs d'Anthropic tournent surtout aux États-Unis, chez des hébergeurs du cloud. L'électricité américaine
émet en moyenne **environ 0,37 kg CO2e par kWh** (moyenne nationale de l'Agence américaine de protection de
l'environnement, eGRID). Fourchette : de 0,2 (régions les moins carbonées, ou achats d'électricité renouvelable) à
0,45.

## 5. Le résultat

| Hypothèse | Énergie par jeton lu | CO2e par kWh | Énergie | Empreinte |
|---|---|---|---|---|
| Basse | 0,1 mWh | 0,2 kg | 8,6 kWh | **1,7 kg CO2e** |
| Centrale | 0,3 mWh | 0,37 kg | 25,9 kWh | **9,6 kg CO2e** |
| Haute | 0,6 mWh | 0,45 kg | 51,7 kWh | **23,3 kg CO2e** |

La page « En savoir plus » arrondit au kilo : environ 10 kg, entre 2 et 23 kg. Les calculs sont dans
`src/domaine/empreinte-ia.ts`, les chiffres dans `src/donnees/empreinte-ia.ts` (la page les lit : elle suit
d'elle-même une mise à jour).

## 6. Ce qui n'est pas compté

- **L'entraînement du modèle.** Il a coûté beaucoup d'énergie, mais il sert à des millions d'utilisateurs ; la
  part d'un projet est difficile à attribuer et n'est pas publiée.
- **La fabrication des serveurs et des processeurs graphiques** (l'« énergie grise »).
- **L'ordinateur de travail**, quelques dizaines d'heures d'un ordinateur portable branché sur l'électricité
  française, très peu carbonée : quelques dizaines de grammes.
- **Le jeu lui-même, une fois en ligne** : l'hébergement et les téléphones des joueurs.

## 7. Limites

C'est un **ordre de grandeur**, pas une mesure. Les deux hypothèses fortes (le prix suit le calcul, et GPT-4o
ressemble à Claude Opus) peuvent chacune se tromper d'un facteur 2 ou 3, d'où la largeur de la fourchette.
L'estimation sera refaite si Anthropic publie des chiffres.

**Mise à jour : au lancement officiel, puis à chaque PR une fois le jeu livré.** Rien ne se met à jour tout seul : le chiffre
affiché reste celui du dernier décompte (sa date est écrite sur la page). Pour le refaire : `npm run empreinte-ia`,
puis reporter les jetons et la date dans `src/donnees/empreinte-ia.ts`.
