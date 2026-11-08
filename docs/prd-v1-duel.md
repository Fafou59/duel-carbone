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
11. En tant que joueur, je veux tomber sur des Duels qui mélangent les Thématiques (un steak contre un jean), afin d'être surpris.
12. En tant que joueur, je veux que le dernier Duel soit un vrai piège contre-intuitif (un Duel thématique), afin de finir sur un moment fort.
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
29. En tant que joueur au clavier, je veux jouer une Partie entière sans souris.
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
| Difficulté | facile ≥ ×10 · moyen ×3 à ×10 · difficile ×1,5 à ×3 · ultime ×1,25 à ×1,5 |
| Plancher | aucun Duel sous ×1,25, aucune égalité |
| Duel thématique | Difficulté éventuellement imposée ; tiré en priorité pour le Duel ultime |
| Unicité | jamais la même paire dans une Partie ; on évite les paires des Parties récentes |
| Assouplissement | si une tranche manque de paires : 1) réutiliser une paire récente de la tranche ; 2) si la tranche est vide, prendre la paire au Rapport le plus proche. Jamais sous le plancher |
| Score | 1 point par bonne réponse, score sur 10, pas de chrono |
| Ton | tutoiement, ludique mais rigoureux, jamais moralisateur |

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
- **Icônes** : un jeu d'icônes cohérent sur tous les appareils (les emojis système ne suffisent pas), à choisir au moment des tickets.

## 6. Décisions d'implémentation

### Pile technique
- **React + TypeScript + Vite**, site 100 % statique, sans serveur.
- **PWA** (installable, utilisable hors ligne) grâce à un module dédié de Vite.
- Code sur **GitHub** (dépôt public), hébergement sur **Netlify** avec une prévisualisation automatique à chaque modification proposée, domaine **duelcarbone.fr** acheté à la mise en ligne.
- Mesure d'audience avec **GoatCounter**, sans cookie.

### Les modules principaux

1. **Script d'import** (TypeScript, lancé à la main). Il appelle `GET /thematiques/ecv/{id}?detail=1` pour chaque Thématique utile, avec la clé d'API ADEME si elle est disponible. Il complète les données avec les libellés de Répartition (absents de l'API) et l'unité de référence de chaque Thématique, puis écrit l'Instantané daté dans le dépôt. Il vérifie aussi que chaque Geste du catalogue pointe vers un Équivalent existant (ADR 0002).
2. **Catalogue des Gestes** : un fichier éditorial avec, pour chaque Geste, son identifiant, son libellé, l'identifiant (*slug*) de son Équivalent, sa Quantité et la justification de cette Quantité. Environ 80 entrées, de préférence avec une Répartition.
3. **Catalogue des Duels thématiques** : un fichier éditorial avec, pour chaque Duel, ses deux Gestes, son texte explicatif et, éventuellement, une Difficulté imposée. Une quinzaine d'entrées en v1.
4. **Calcul d'un Geste** (fonction pure) : Empreinte carbone = valeur de l'Équivalent × Quantité ; la Répartition est mise à la même échelle.
5. **Générateur de Partie** (fonction pure, cœur testable du produit). Il reçoit les Gestes, les Duels thématiques, les paires vues récemment et une source de hasard ; il renvoie 10 Duels qui respectent les règles de la section 5. Si une tranche de Difficulté manque de paires disponibles, il réutilise d'abord une paire récente de cette tranche ; si la tranche est vide, il prend la paire dont le Rapport est le plus proche de la tranche. Jamais sous le plancher de ×1,25. Les seuils sont réunis dans `src/domaine/regles.ts` : les modifier après des retours de joueurs se fait en une ligne, en mettant ce PRD à jour en même temps.
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

- **Tests unitaires (Vitest)** sur les fonctions pures : calcul d'un Geste, générateur de Partie (respect des tranches de Difficulté, plancher ×1,25, unicité des paires, priorité des Duels thématiques pour le Duel ultime, assouplissement quand les paires manquent), mise en forme des nombres, transformation des réponses de l'API dans le script d'import.
- Un bon test vérifie un **comportement observable** (« le Duel n°10 est un Duel thématique quand il y en a un de disponible »), pas les détails internes du code.
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
