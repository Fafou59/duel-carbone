# L'empreinte de la création du jeu par IA : la méthode

Duel Carbone est codé avec l'aide d'une IA, **Claude Opus 5.5** (Anthropic), dans Claude Code : un humain pilote
et valide, l'IA écrit le code et l'explique. Ce document estime l'empreinte carbone de ce travail. Le résultat est
affiché dans la page « En savoir plus ».

> **Estimation au 14 novembre 2026, jour du lancement : environ 6 kg CO2e, entre 2,5 et 12 kg selon les hypothèses.**
> C'est un peu moins que deux steaks de bœuf (3,4 kg CO2e chacun selon l'ADEME), et moins que regarder l'intégrale de
> Friends en streaming (7,9 kg).

Cette estimation est aussi **l'Easter Egg** du jeu : le Geste « Créer Duel Carbone, assisté par IA »
(`src/donnees/geste-ia.ts`), qui vaut l'hypothèse centrale, caché dans deux Duels thématiques.

Ce n'est **pas un chiffre de l'ADEME** : aucune source publique ne donne l'énergie consommée par ce modèle. C'est
la seule exception à la règle « seule source : l'ADEME » ; voir [l'ADR 0004](adr/0004-empreinte-ia-hors-ademe.md).

## 1. Ce qu'on mesure : les jetons

Un modèle de langage lit et écrit des **jetons** (des morceaux de mots, environ ¾ de mot en moyenne). Claude Code
garde un journal de chaque session de travail, où chaque réponse du modèle note ses jetons, en quatre sortes :

| Sorte | Ce que c'est | Nombre (au 14/11/2026) |
|---|---|---|
| Lus | La demande, lue pour la première fois | 5 794 |
| Mis en mémoire | Lus, puis gardés en mémoire pour les échanges suivants | 9 846 543 |
| Relus depuis la mémoire | Le contexte de la conversation, relu à chaque échange | 850 347 760 |
| Écrits | Les réponses du modèle : code, explications | 2 424 797 |

Soit **2 637 appels au modèle** depuis le 8 novembre 2026, tous avec Claude Opus 5.5 : 2 418 dans les 8 journaux de
session de l'ordinateur de travail (le dépôt et ses worktrees), et 219 dans une session lancée dans le cloud, depuis
un téléphone, pour corriger les derniers défauts avant le lancement (#77). Le décompte se refait avec
`npm run empreinte-ia` (`scripts/empreinte-ia.ts`).

**Les sessions cloud** tournent dans un conteneur éphémère : leur journal disparaît avec lui, et le script ne peut
pas les relire. Elles sont donc comptées à partir d'un relevé fait avec le même script, dans la session, avant la
fin du conteneur, puis ajoutées à la main. Une session cloud qui n'a pas été relevée manquerait au décompte.

L'énorme majorité des jetons est **relue depuis la mémoire** : à chaque échange, le modèle relit toute la
conversation (en moyenne environ 320 000 jetons). C'est beaucoup moins coûteux que de la relire « à froid », mais
pas gratuit.

## 2. De jetons à « jetons lus équivalents »

Les quatre sortes de jetons ne demandent pas le même calcul. **Hypothèse : le prix d'Anthropic suit le calcul
nécessaire.** Les [tarifs de Claude Opus 5.5](https://platform.claude.com/docs/en/about-claude/pricing) donnent les
pondérations, comparées à un jeton lu :

| Sorte | Prix (par million) | Pondération | Pourquoi |
|---|---|---|---|
| Lu | 4 $ | × 1 | La référence |
| Mis en mémoire | 5 $ | × 1,25 | Lu, plus le stockage |
| Relu depuis la mémoire | 0,20 $ | × 0,05 | Rien à recalculer, seulement à relire |
| Écrit | 20 $ | × 5 | Le modèle produit les jetons un par un |

Résultat : **environ 67 millions de jetons lus équivalents**. Les jetons relus en pèsent les deux tiers
(42,5 millions), les jetons mis en mémoire (12,3 millions) et écrits (12,1 millions) le reste.

## 3. De jetons à kWh

Anthropic ne publie pas l'énergie consommée par ses modèles. Trois sources indépendantes donnent un ordre de
grandeur :

| Source | Modèle | Ce qu'elle donne | Par jeton lu équivalent |
|---|---|---|---|
| [Epoch AI](https://epoch.ai/gradient-updates/how-much-energy-does-chatgpt-use) (février 2025), estimation à partir du matériel, centre de données compris | GPT-4o | 2,5 Wh pour 10 000 jetons lus ; 40 Wh pour 100 000 | **0,2 à 0,4 mWh** |
| [Jegham et al., « How Hungry is AI? »](https://arxiv.org/abs/2505.09598) (v6, novembre 2025), estimation à partir des vitesses mesurées par l'API, centre de données compris | Claude 3.7 Sonnet | 5,67 Wh pour une demande longue (10 000 jetons lus, 1 500 écrits) | **0,32 mWh** |
| [Chung et al., « Where Do the Joules Go? »](https://arxiv.org/abs/2601.22076) (ML.ENERGY, 2026), mesures sur processeurs graphiques récents | Qwen 3 235B (modèle ouvert) | environ 0,4 J par jeton écrit, au mieux, processeurs graphiques seuls | **moins de 0,1 mWh** (voir plus bas) |

Les deux premières, pour des demandes longues comme les nôtres, tombent au même endroit : **environ 0,3 mWh**. La
troisième montre que du matériel récent et un modèle « à experts » (qui n'active qu'une partie de ses paramètres)
font beaucoup mieux : même en doublant pour un fonctionnement réel moins optimisé, et en ajoutant la moitié pour le
reste du serveur et le centre de données, on reste sous 0,1 mWh. Mais ce modèle est sans doute plus petit que
Claude Opus.

D'où une fourchette : **de 0,15 à 0,45 mWh par jeton lu équivalent, 0,3 au centre**.

## 4. De kWh à CO2e

Claude tourne surtout dans les centres de données d'**Amazon Web Services**. Jegham et al. estiment l'électricité
de ceux qui servent l'IA, selon leur répartition par région, à **0,287 kg CO2e par kWh**. La moyenne des
États-Unis est d'environ 0,37 kg (eGRID, Agence américaine de protection de l'environnement). Fourchette : **de
0,25 à 0,4 kg CO2e par kWh, 0,3 au centre**.

Ce sont des émissions « selon le lieu » : celles de l'électricité réellement fournie par le réseau. Les achats
d'électricité renouvelable d'Amazon ne sont pas déduits.

## 5. Le résultat

| Hypothèse | Énergie par jeton lu | CO2e par kWh | Énergie | Empreinte |
|---|---|---|---|---|
| Basse | 0,15 mWh | 0,25 kg | 10,0 kWh | **2,5 kg CO2e** |
| Centrale | 0,3 mWh | 0,3 kg | 20,1 kWh | **6,0 kg CO2e** |
| Haute | 0,45 mWh | 0,4 kg | 30,1 kWh | **12,0 kg CO2e** |

La page « En savoir plus » arrondit au kilo : environ 6 kg, entre 3 et 12 kg. Les calculs sont dans
`src/domaine/empreinte-ia.ts`, les chiffres dans `src/donnees/empreinte-ia.ts` (la page les lit : elle suit
d'elle-même une mise à jour).

## 6. Ce qui a changé depuis la première estimation

La première estimation, le 12 novembre, donnait **environ 10 kg, entre 2 et 23 kg** : un facteur 10 entre les
hypothèses basse et haute. Trois corrections l'ont resserrée :

- **Le bon tarif.** Les pondérations venaient des tarifs de Claude Opus 4.5, où relire la mémoire coûte un dixième
  d'un jeton lu. Pour Claude Opus 5.5, le modèle réellement utilisé, c'est un vingtième : au décompte du 12 novembre, 52 millions de
  jetons équivalents au lieu de 86 (soit 4,7 kg au lieu de 9,6 au centre).
- **Une deuxième source pour l'énergie.** Jegham et al. retrouvent, pour un modèle Claude, l'ordre de grandeur
  d'Epoch AI. L'ancienne hypothèse haute (0,6 mWh) supposait Claude Opus bien plus gourmand que GPT-4o, ce que rien
  ne confirme.
- **L'électricité d'AWS plutôt que celle des États-Unis en général**, d'après la répartition des centres de
  données publiée par Jegham et al.

L'écart entre les hypothèses basse et haute passe d'un facteur 10 à un facteur 5.

## 7. Ce qui n'est pas compté

- **L'entraînement du modèle.** Il a coûté beaucoup d'énergie, mais il sert à des millions d'utilisateurs ; la
  part d'un projet est difficile à attribuer et n'est pas publiée.
- **La fabrication des serveurs et des processeurs graphiques** (l'« énergie grise »).
- **L'ordinateur de travail**, quelques dizaines d'heures d'un ordinateur portable branché sur l'électricité
  française, très peu carbonée : quelques dizaines de grammes.
- **Le jeu lui-même, une fois en ligne** : l'hébergement et les téléphones des joueurs.

## 8. Limites

C'est un **ordre de grandeur**, pas une mesure. Trois hypothèses restent fragiles :

- **Le prix suit le calcul.** Relire un très long contexte (320 000 jetons en moyenne) sollicite surtout la
  mémoire des processeurs : son coût réel peut s'écarter du tarif. Avec l'ancienne pondération (un dixième),
  l'estimation centrale serait de 9,9 kg.
- **Claude Opus 5.5 ressemble aux modèles étudiés.** Sa taille et son matériel ne sont pas publics.
- **Où tournent les demandes.** Par défaut, Anthropic peut servir une demande depuis plusieurs régions du monde, et
  pas seulement chez AWS.

Pour aller plus loin, il faudrait qu'Anthropic publie l'énergie de ses modèles, comme Google l'a fait pour Gemini
(0,24 Wh pour une demande médiane, en août 2025). L'estimation sera refaite dès que ce sera le cas.

**Mise à jour : au lancement officiel, puis à chaque PR une fois le jeu livré.** Rien ne se met à jour tout seul :
le chiffre affiché reste celui du dernier décompte (sa date est écrite sur la page). Pour le refaire :
`npm run empreinte-ia`, puis reporter les jetons et la date dans `src/donnees/empreinte-ia.ts`, et lancer
`npm run calendrier` : la valeur de l'Easter Egg fixe la place de ses deux Duels dans les Parties du jour à venir. Une session
cloud se relève avec le même script avant la fin de son conteneur, et ses jetons s'ajoutent à la main.
