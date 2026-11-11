# PRD — Duel Carbone v1 : le Duel

> Statut : validé · Date : 2026-11-08
> Vocabulaire : voir [CONTEXT.md](../CONTEXT.md). Décisions structurantes : voir [docs/adr](./adr).

## 1. Problème

On estime très mal l'empreinte carbone de nos gestes quotidiens. On surestime souvent ce qui se voit (un emballage, un mail) et on sous-estime ce qui ne se voit pas (la viande, la fabrication d'un smartphone, l'avion). Les données de référence existent et sont publiques : l'ADEME les publie sur Impact CO2. Mais un comparateur informe sans retenir l'attention, et on lit un chiffre sans le retenir.

## 2. Solution

Duel Carbone est un jeu web gratuit, en français, pensé d'abord pour le mobile. On y apprend en se trompant. Une Partie enchaîne 10 Duels : deux Gestes s'affichent et le joueur désigne celui qui a la plus grande Empreinte carbone. La réponse révèle les chiffres, le Rapport entre les deux et la Répartition sur le cycle de vie. La difficulté monte au fil de la Partie. À la fin, un score sur 10 se partage en un geste. Toutes les valeurs viennent de l'ADEME, sont citées et sont vérifiables.

## 3. Public cible

Grand public francophone, à partir d'environ 15 ans, majoritairement sur smartphone. Le joueur n'a besoin d'aucune connaissance préalable sur le climat.

## 4. Récits utilisateurs

### Démarrer
1. En tant que visiteur, je veux comprendre en une phrase le principe du jeu, afin de savoir si j'ai envie de jouer.
2. En tant que visiteur, je veux lancer une Partie en un seul clic, sans compte ni inscription, afin de jouer immédiatement.
3. En tant que visiteur sur mobile, je veux pouvoir installer le jeu sur mon écran d'accueil, afin d'y revenir facilement.
4. En tant que joueur sans connexion, je veux pouvoir jouer quand même une fois le site déjà visité, afin de jouer dans le métro.

### Jouer un Duel
5. En tant que joueur, je veux voir deux Gestes dont le libellé indique la quantité (« Manger un steak de bœuf (120 g) »), afin de comparer des choses comparables.
6. En tant que joueur, je veux choisir le Geste qui émet le plus d'un simple toucher ou clic, afin que le jeu reste fluide.
7. En tant que joueur, je veux savoir où j'en suis dans la Partie (Duel n/10 et Difficulté en cours), afin de sentir la progression.
8. En tant que joueur, je veux que les premiers Duels soient faciles et que la difficulté monte, afin de prendre confiance avant d'être piégé.
9. En tant que joueur, je ne veux jamais voir deux fois la même paire dans une Partie, afin de ne pas m'ennuyer.
10. En tant que joueur régulier, je veux éviter autant que possible les paires vues lors de mes Parties récentes, afin de découvrir de nouveaux Gestes.
11. En tant que joueur, je veux tomber sur des Duels qui mélangent les Thématiques (un steak contre un jean), afin d'être surpris. Je veux aussi voir passer tous les Gestes, des plus légers (un thé) aux plus lourds (un vol Paris–New York), afin de découvrir toute l'étendue des ordres de grandeur.
12. En tant que joueur, je veux tomber de temps en temps sur un vrai piège contre-intuitif (un Duel thématique), afin de vivre des moments forts.
13. En tant que joueur, je ne veux jamais tomber sur un Duel quasi à égalité (Rapport inférieur à ×1,25), afin de ne pas me sentir volé.

### Comprendre la réponse
14. En tant que joueur, je veux savoir immédiatement si j'ai eu juste, sans que l'information repose uniquement sur la couleur, afin que ce soit clair pour tout le monde.
15. En tant que joueur, je veux voir l'Empreinte carbone des deux Gestes dans une unité lisible (g, kg ou t de CO2e), afin de me faire une idée des ordres de grandeur.
16. En tant que joueur, je veux voir le Rapport (« ×11 »), afin de mesurer l'écart en un coup d'œil.
17. En tant que joueur, je veux voir la Répartition de chaque Geste (fabrication, usage, fin de vie ; agriculture, transport…), afin de comprendre d'où vient l'empreinte.
18. En tant que joueur, je veux lire le texte rédigé d'un Duel thématique, afin de comprendre le piège.
19. En tant que joueur curieux, je veux ouvrir la fiche ADEME de l'Équivalent, afin de vérifier la source et d'aller plus loin.
20. En tant que joueur, je veux passer au Duel suivant quand je suis prêt (pas de chrono), afin d'avoir le temps de lire.
21. En tant que joueur, je veux voir la Quantité et la valeur par unité de l'ADEME, afin de pouvoir refaire le calcul.

### Finir une Partie
22. En tant que joueur, je veux voir mon score sur 10 avec un message adapté à ma performance, afin de savoir comment je m'en suis sorti.
23. En tant que joueur, je veux voir le Récapitulatif des 10 Duels (bon ou mauvais choix, Rapport), afin de retenir ce que j'ai appris.
24. En tant que joueur, je veux partager mon score (texte et lien) via les applications de mon téléphone, ou le copier sur ordinateur, afin de défier mes proches.
25. En tant que joueur, je veux rejouer en un clic, afin d'enchaîner les Parties.
26. En tant que joueur régulier, je veux retrouver mon meilleur score sur mon appareil, afin d'essayer de le battre.

### Confiance et transparence
27. En tant que visiteur sceptique, je veux une page « Sources et méthode » qui cite l'ADEME, la date de l'Instantané et le calcul Geste = Équivalent × Quantité, afin de faire confiance aux chiffres.
28. En tant que visiteur, je veux savoir que le jeu ne pose aucun cookie et ne collecte aucune donnée personnelle, afin de jouer sereinement.

### Accessibilité
29. En tant que joueur au clavier, je veux jouer une Partie entière sans souris (raccourcis : 1 et 2 pour choisir, Entrée pour passer au Duel suivant).
30. En tant que joueur utilisant un lecteur d'écran, je veux que les Gestes, le résultat et la Répartition soient annoncés correctement.
31. En tant que joueur malvoyant, je veux des contrastes suffisants et des textes qui supportent le zoom.

### Le Product Builder (toi)
32. En tant que mainteneur, je veux relancer l'import du Référentiel avec une seule commande, afin de mettre à jour l'Instantané.
33. En tant que mainteneur, je veux que l'import échoue clairement si un Geste du catalogue pointe vers un Équivalent qui n'existe plus, afin de ne jamais publier de données cassées.
34. En tant que mainteneur, je veux ajouter un Geste ou un Duel thématique en modifiant un simple fichier, sans toucher au code.
35. En tant que mainteneur, je veux suivre le nombre de Parties lancées et de Parties terminées (et donc le taux de complétion), le temps de jeu, le taux de « Rejouer » et le nombre de partages, afin de savoir si le jeu fonctionne.

## 5. Règles du jeu

| Élément | Règle |
|---|---|
| Partie | 10 Duels : 1-3 faciles, 4-6 moyens, 7-9 difficiles, 10 ultime |
| Difficulté | une tranche de Rapport par Duel : 1) ×80 à ×500 · 2) ×25 à ×80 · 3) ×10 à ×25 · 4) ×5 à ×10 · 5) ×3,3 à ×5 · 6) ×2,4 à ×3,3 · 7) ×2 à ×2,4 · 8) ×1,7 à ×2 · 9) ×1,5 à ×1,7 · 10) ×1,25 à ×1,5. Les étiquettes facile (1-3), moyen (4-6), difficile (7-9) et ultime (10) regroupent ces tranches |
| Plafond | aucun Duel tiré au hasard au-delà de ×500 : au-delà, personne ne se trompe |
| Plancher | aucun Duel sous ×1,25, aucune égalité |
| Tirage | on tire d'abord un Geste, puis son adversaire dans la tranche du Duel. Chaque tirage tient compte du Coefficient d'équilibrage des Gestes, pour que tous apparaissent aussi souvent. Un Geste peut revenir dans une même Partie : le joueur attentif aux réponses en profite |
| Coefficient d'équilibrage | calculé par `npm run calibrer`, qui se lance aussi après `npm run import`. La CI refuse des coefficients qui ne correspondent plus au catalogue, aux valeurs ADEME ou aux règles |
| Diversité | sur 2 000 Parties simulées, le Geste le moins vu apparaît dans au moins 80 % des Parties où apparaît un Geste moyen |
| Duel thématique | hors plafond, hors tranche et hors Coefficient d'équilibrage ; sa propre Difficulté ; peut apparaître à n'importe quel Duel (règle de placement : ticket #13) |
| Combinaisons interdites | un repas n'affronte jamais un aliment dans un Duel tiré au hasard (liste dans `regles.ts`) |
| Parcours | deux trajets ne s'affrontent que s'ils font le même Parcours (on compare des modes de transport, pas des distances) |
| Gestes réservés | un Geste d'empreinte nulle ou quasi nulle (l'eau du robinet) n'apparaît que dans un Duel thématique |
| Unicité | jamais la même paire dans une Partie ; on évite les paires des Parties récentes |
| Assouplissement | si la tranche n'a plus de paire jamais vue : 1) la paire jamais vue au Rapport le plus proche ; 2) sinon, une paire récente (de la tranche s'il en reste). Même tirage pondéré à chaque niveau. Jamais sous le plancher, jamais au-delà du plafond |
| Score | 1 point par bonne réponse, score sur 10, pas de chrono |
| Ton | tutoiement, ludique mais rigoureux, jamais moralisateur |

> **Pourquoi ces règles ont changé (novembre 2026, ticket #33).** Les premiers testeurs trouvaient les Duels faciles *trop* faciles : sans plafond, le tirage pouvait opposer un vol Paris–New York à 10 km en métro (×189 047). Les 4 tranches de Difficulté faisaient aussi monter la difficulté par paliers. D'où le plafond à ×500 (le Duel 1 reste un échauffement assumé) et une tranche par Duel, qui se resserre vite. Les simulations ont montré un second défaut : en tirant une paire au hasard, les Gestes extrêmes sortaient presque deux fois moins souvent qu'un Geste moyen (le thé dans 13 % des Parties, contre 22 %), car ils ont peu d'adversaires dans chaque tranche. Tirer un Geste d'abord, avec un Coefficient d'équilibrage calculé par simulation, ramène le Geste le moins vu à environ 90 % de la moyenne.

### Écrans (validés par prototype)

La référence visuelle est la variante **A2** du prototype ; le détail et les raisons sont dans [docs/prototypes/verdict-duel-ui.md](prototypes/verdict-duel-ui.md).

- **Duel** : deux cartes (empilées sur mobile) qui tiennent sur un écran de téléphone. Le libellé tient sur deux lignes : le geste, puis la quantité ou la durée d'utilisation.
- **Révélation** :
  - les empreintes s'affichent sur les cartes ;
  - le bon Geste est encadré en vert, un mauvais choix en rouge, toujours doublé d'un texte ;
  - le Rapport apparaît dans un gros badge ;
  - la page descend automatiquement vers l'explication après 1,5 s.
- **Explication**, dans cet ordre :
  - le verdict ;
  - l'équivalence « 1 [A] = x [B] » ;
  - le texte du Duel thématique, s'il y en a un ;
  - un tableau comparatif unique (étapes × Gestes, ligne Total), avec des jauges à échelle commune derrière les chiffres ;
  - les liens vers les fiches ADEME.
- **Récapitulatif** : une grille de cases « ✓/✗ Duel n » puis « 1 [A] = x [B] », encadrées en vert ou en rouge. Chaque case ouvre le détail du Duel dans un panneau qu'on peut fermer.
- **Icônes** : un jeu d'icônes cohérent sur tous les appareils (les emojis système ne suffisent pas). Choix du ticket #14 : **Fluent Emoji « Flat »** (Microsoft, licence MIT), plutôt qu'OpenMoji (contour noir illisible en mode sombre, licence « share-alike ») ou Twemoji (crédit visible obligatoire). Quand l'icône officielle n'est pas parlante, on dessine la nôtre dans le même style, et deux Gestes semblables reçoivent des couleurs différentes. Une icône est un fichier par Geste (`public/icones/`, fabriqué par `npm run icones`), chargé à part : un Duel ne télécharge que ses deux icônes, et celles du Duel suivant sont préchargées.

## 6. Décisions d'implémentation

### Pile technique
- **React + TypeScript + Vite**, site 100 % statique, sans serveur.
- **PWA** (installable, utilisable hors ligne) grâce à un module dédié de Vite.
- **Navigation sans routeur** : la page Sources et méthode a pour adresse l'ancre `#sources` (`src/navigateur/adresse.ts`). Pas de bibliothèque ni de réglage Netlify ; le bouton « Retour » et les liens partagés fonctionnent, et une Partie en cours reste intacte pendant la lecture des sources.
- Code sur **GitHub** (dépôt public), hébergement sur **Netlify** avec une prévisualisation automatique à chaque modification proposée, domaine **duelcarbone.fr** acheté à la mise en ligne.
- Mesure d'audience avec **GoatCounter**, sans cookie.

### Les modules principaux

1. **Script d'import** (TypeScript, lancé à la main). Il appelle `GET /thematiques/ecv/{id}?detail=1` pour chaque Thématique utile, avec la clé d'API ADEME si elle est disponible. Il complète les données avec les libellés de Répartition (absents de l'API) et l'unité de référence de chaque Thématique, puis écrit l'Instantané daté dans le dépôt. Il vérifie aussi que chaque Geste du catalogue pointe vers un Équivalent existant (ADR 0002). Il enchaîne sur le calibrage des Coefficients d'équilibrage, qui dépendent des valeurs ADEME.
2. **Catalogue des Gestes** : un fichier éditorial avec, pour chaque Geste, son identifiant, son libellé, l'identifiant (*slug*) de son Équivalent, sa Quantité, la justification de cette Quantité, sa Nature (aliment, repas, boisson, objet, trajet, livraison, usage) et, pour un trajet, son Parcours. Environ 80 entrées, de préférence avec une Répartition.
3. **Catalogue des Duels thématiques** : un fichier éditorial avec, pour chaque Duel, ses deux Gestes, son texte explicatif et, éventuellement, une Difficulté imposée. Une quinzaine d'entrées en v1.
4. **Calcul d'un Geste** (fonction pure) : Empreinte carbone = valeur de l'Équivalent × Quantité ; la Répartition est mise à la même échelle.
5. **Générateur de Partie** (fonction pure, cœur testable du produit). Il reçoit les Gestes, les paires vues récemment, les Coefficients d'équilibrage et une source de hasard ; il renvoie 10 Duels qui respectent les règles de la section 5. Pour chaque Duel, il tire un Geste puis son adversaire dans la tranche du Duel, en suivant l'ordre d'assouplissement si la tranche n'a plus de paire jamais vue. Jamais sous le plancher de ×1,25, jamais au-delà du plafond de ×500. Les seuils sont réunis dans `src/domaine/regles.ts` : les modifier après des retours de joueurs se fait en une ligne, en mettant ce PRD à jour en même temps (puis `npm run calibrer`).
   **Calibrage** (`src/domaine/equilibrage.ts`, `npm run calibrer`) : il simule des milliers de Parties, mesure la fréquence de chaque Geste et ajuste les Coefficients d'équilibrage jusqu'à ce que tous sortent aussi souvent. Il les enregistre dans `src/donnees/coefficients.json` avec une empreinte du catalogue, des valeurs ADEME et des règles. `npm run analyse:paires` affiche les paires par Duel et les indicateurs de diversité.
6. **Moteur de Partie** : les états successifs d'une Partie (accueil → Duel → révélation → … → fin), le score et le Récapitulatif.
7. **Stockage local** (dans le navigateur) : le meilleur score et les paires vues récemment. Aucune donnée personnelle.
8. **Partage** : le menu de partage natif du téléphone, ou une copie dans le presse-papiers sur ordinateur.
9. **Mise en forme des nombres** : unité automatique (g, kg, t) et conventions françaises (virgule décimale).
10. **Pages** : Accueil, Partie, Fin de Partie, Sources et méthode.

### Événements de mesure d'audience
`partie_lancee`, `partie_terminee`, `rejouer`, `partage`, `duree_partie/<tranche>`.
Le **taux de complétion** se calcule ainsi : `partie_terminee` / `partie_lancee`.
Le **temps de jeu** est mesuré sur l'appareil, de l'affichage du premier Duel jusqu'à l'écran de fin de Partie. GoatCounter compte des événements mais ne sait pas calculer de moyenne. Le temps est donc envoyé sous forme de tranche, avec l'événement `partie_terminee` : moins de 2 min, 2 à 5 min, 5 à 10 min, plus de 10 min. On obtient ainsi une distribution du temps de jeu.

## 7. Stratégie de test

- **Tests unitaires (Vitest)** sur les fonctions pures : calcul d'un Geste, générateur de Partie (respect de la tranche de chaque Duel, plancher ×1,25, plafond ×500, unicité des paires, tirage d'un Geste d'abord, Coefficient d'équilibrage, assouplissement quand les paires manquent), calibrage, mise en forme des nombres, transformation des réponses de l'API dans le script d'import.
- **Garde-fous du calibrage** : un test vérifie que les Coefficients d'équilibrage correspondent au catalogue actuel (empreinte), un autre que la diversité atteint le seuil sur 2 000 Parties simulées.
- Un bon test vérifie un **comportement observable** (« le Duel n°10 a un Rapport entre ×1,25 et ×1,5 »), pas les détails internes du code.
- **Test de bout en bout** (plus tard, avec Playwright) : jouer une Partie complète au clavier.
- **Contrôle des données** : l'import échoue si le catalogue référence un Équivalent inconnu, ou si une Quantité est absente ou inférieure ou égale à zéro.

## 8. Hors périmètre de la v1

- La Juste émission (v1.1, cadrée à ce moment-là) et le Comparateur (v2).
- Les comptes utilisateurs, les classements et toute donnée personnelle.
- Les gestes absents du Référentiel ADEME (requête IA, pipi sous la douche, vélo carbone contre vélo alu…), à garder dans une liste d'idées.
- La modification des paramètres ADEME (forçage radiatif, taux de remplissage).
- Le chrono et le score pondéré.
- La publicité, les sponsors et les dons (en attente de la réponse de l'ADEME).
- Les autres langues que le français.

## 9. Indicateurs de succès (hypothèses à confirmer après la mise en ligne)

| Indicateur | Calcul | Cible initiale |
|---|---|---|
| Taux de complétion | Parties terminées / Parties lancées | ≥ 60 % |
| Temps de jeu | répartition des Parties terminées par tranche de durée | majorité entre 2 et 5 min |
| Taux de « Rejouer » | rejouer / Parties terminées | ≥ 30 % |
| Partages | partages / Parties terminées | ≥ 5 % |

## 10. Notes et dépendances

- **ADEME** : la demande de clé d'API et de confirmation des conditions de réutilisation a été envoyée le 2026-11-08. Elle ne bloque pas la publication : l'API est accessible sans clé, et les mentions légales autorisent déjà la réutilisation non commerciale et pédagogique. Dès réception, la clé sera ajoutée au script d'import. Seul l'ajout d'un bouton de dons dépend de leur réponse.
- **Citation** : « Source : ADEME, Impact CO2 », avec la date de l'Instantané, sur chaque révélation (lien vers la fiche) et sur la page Sources et méthode.
- **Domaine** : duelcarbone.fr était disponible le 2026-11-08.
