# PRD — Duel Carbone : le Mode animation

Spécification du Mode animation, issue de la [carte de l'offre Entreprise](https://github.com/Fafou59/duel-carbone/issues/112) : décisions du [ticket 113](https://github.com/Fafou59/duel-carbone/issues/113#issuecomment-7174174049), recherche du [ticket 128](https://github.com/Fafou59/duel-carbone/issues/128) ([note](recherches/durable-objects-seance.md)), prototypes validés le 26/11 (branche `prototype/mode-animateur`, [verdict](https://github.com/Fafou59/duel-carbone/issues/129#issuecomment-7199658599)) et [ADR 0007](adr/0007-seance-durable-object-pseudo-ephemere.md). Le vocabulaire (Mode animation, Séance, Animateur, Participant, Classement) est dans [CONTEXT.md](../CONTEXT.md).

## 1. Problème

Duel Carbone se joue seul. Or les ordres de grandeur de l'empreinte carbone se discutent très bien à plusieurs : atelier RSE, Fresque du Climat, réunion d'équipe. Il n'existe aucun moyen de faire jouer une salle ensemble, et donc aucun moyen de toucher ce public, qui parlerait ensuite du jeu à ses proches.

## 2. Solution

Un **Mode animation**, inspiré des quiz en direct : l'Animateur projette une **Séance** depuis son ordinateur ; les **Participants** la rejoignent avec leur téléphone (QR code ou code) ; chaque Duel s'affiche en même temps partout, chacun répond sur son téléphone, puis l'Animateur révèle la réponse à toute la salle, avec la part de la salle qui a trouvé. Gratuit, sans compte, ouvert à tous.

## 3. Public cible

- **L'Animateur** : animateur de Fresque du Climat, référent RSE, manager qui veut lancer une discussion, enseignant. Il découvre le Mode animation par un lien discret du jeu, ou par le bouche-à-oreille.
- **Les Participants** : des adultes en atelier, souvent sans avoir jamais joué, sur leur propre téléphone.

## 4. Récits utilisateurs

### L'Animateur
- Je crée une Séance en un clic, sans compte, et je choisis s'il y aura un Classement.
- J'affiche un QR code et un code faciles à lire de loin, et je vois arriver les pseudos.
- Je lance chaque Duel, je vois combien ont répondu, et je révèle quand je veux : pas de chrono.
- À la révélation, je vois la réponse de la salle Geste par Geste, et je peux ouvrir le détail des émissions pour expliquer un Duel où beaucoup se sont trompés.
- Je peux retirer un pseudo déplacé d'un clic.
- À la fin, je montre le Classement final, les Duels qui ont le plus trompé la salle et un Conseil, puis je peux relancer une nouvelle Séance, avec d'autres Duels et un autre Conseil.
- Si je ferme mon onglet par erreur, je reprends la Séance en rouvrant la page.

### Le Participant
- Je scanne le QR code, je tape un pseudo (si l'Animateur a choisi un Classement), et j'attends le lancement.
- Je réponds sur mon téléphone ; ma réponse attend la révélation de l'Animateur.
- À la révélation, je vois si j'ai trouvé, la part de la salle qui a répondu comme moi, et l'explication, que je lis à mon rythme.
- Entre deux Duels, je vois mon score, mon rang et une petite phrase.
- À la fin, je vois mon score, mon rang, ma médaille, le Conseil (avec son lien), mon Récapitulatif, et une invitation à jouer le Duel du jour.
- Si mon téléphone se met en veille, je retrouve la Séance où elle en est.

## 5. Règles

| Règle | Valeur |
| --- | --- |
| Duels d'une Séance | 10, tirés comme une Partie libre (du facile à l'ultime), **toujours avec un Duel thématique**, placé selon son Rapport. La règle « jamais plus de 3 Parties de suite sans Duel thématique » ne s'applique pas. |
| Tirage | Par l'ordinateur de l'Animateur, qui écarte ses paires récentes ; le serveur vérifie que chaque paire est jouable. |
| Rythme | Pas de chrono. L'Animateur lance, révèle, montre le classement, passe au Duel suivant. |
| Réponse | Une seule par Duel, non modifiable. Les réponses se ferment à la révélation : qui n'a pas répondu ne marque pas de point. |
| Score | Nombre de bonnes réponses, sur les Duels joués. La vitesse ne compte pas. |
| Arrivée en cours | Possible tant que la Séance n'est pas terminée ; le score ne compte que les Duels joués. |
| Classement | Facultatif, choisi à la création. Un **rang par palier de score** : les ex aequo partagent le rang (1, 1, 2…), le rang suivant est le palier suivant. **Médailles** : or pour le 1er palier, argent pour le 2e, bronze pour le 3e, même à 0 bonne réponse si toute la salle en est là. |
| Classement intermédiaire | Après les Duels 1 à 9. **Jamais après le Duel 10**, pour garder la surprise du classement final. **Sans Classement, cette étape n'existe pas** : de la révélation, on passe directement au Duel suivant (décidé au lot 1). |
| Phrases du téléphone | **9 phrases par catégorie de place** (en tête seul, en tête à égalité, dernier, podium, milieu), **une par classement intermédiaire** (après les Duels 1 à 9), écrite pour son moment de la Séance (le début, l'arrivée des Duels moyens puis difficiles, le Duel ultime qui reste) : un Participant ne lit jamais deux fois la même. Sans hasard (décidé au lot 3). |
| Conseil | Choisi par l'ordinateur de l'Animateur : le premier Conseil lié au Duel le plus raté par la salle, puis au suivant, en écartant ses 10 derniers Conseils montrés (`choisirConseil`). Le même sur l'écran projeté et les téléphones. |
| Taux d'erreur | Les réponses d'une Séance comptent dans le Taux d'erreur de leur paire (ADR 0006). L'écran ne montre que la salle. |
| Pseudo | 20 caractères au plus, sans filtre automatique. **Retirer un pseudo retire le Participant** de la Séance, avec ses réponses : son téléphone est déconnecté et son jeton oublié ; il peut revenir sous un autre pseudo (décidé au lot 1). |
| Limites | De 2 à 100 Participants par Séance (le premier Duel ne se lance qu'à partir de 2 ; une fois lancée, la Séance continue même si des Participants sont retirés) ; fermeture 3 h après la création ; tout effacé sous 24 h (ADR 0007). |
| Rien d'autre ne bouge | Une Séance ne compte ni pour la Série, ni pour le record de la Partie libre, ni pour la Partie du jour. |

## 6. Écrans (validés par prototype)

### L'écran projeté de l'Animateur
Pensé pour un projecteur en 16:9 ; le classement final tient sans défiler de 1280×720 à 1920×1080.

- **Page d'explication** (avant la création) : ce qu'est une Séance, comment ça se passe, ce qui est gardé et effacé ; choix du Classement ; bouton de création.
- **Attente** : logo et nom en haut à gauche ; « Rejoins la Séance avec ton téléphone » ; QR code, adresse et code de 6 caractères (sans 0/O ni 1/I) ; nombre de Participants et pseudos qui apparaissent ; frise d'icônes qui défile en bas ; « Lancer le premier Duel » en haut à droite.
- **Duel** : barre de suivi comme dans une Partie (Duel n/10, Difficulté ou ★ thématique, 10 segments) ; annonce du Duel thématique ; les deux Gestes l'un sous l'autre sur toute la largeur, sans numéro, « VS » au centre ; description de la Quantité bien lisible. **Colonne de droite** : QR code et code, jauge « 18 / 24 ont répondu », pseudos dans l'ordre des réponses.
- **Révélation** : « ×N fois plus » au centre, sur deux lignes, à cheval sur les deux Gestes ; Empreintes à droite ; sous chaque Geste, une petite jauge « 54 % de la salle (13) », verte pour le bon Geste, grise pour l'autre ; explication du Duel thématique ; bouton « Voir le détail des émissions » qui ouvre la Répartition dans une fenêtre.
- **Classement intermédiaire** : barres des seules bonnes réponses de la salle, Duel par Duel ; top 10 dans la colonne, avec ▲▼.
- **Révélation du Duel 10** : la colonne reste, avec 🥁 « Qui monte sur le podium ? » ; le bouton mène au classement final.
- **Classement final** : top 10 en deux colonnes, médaille après le nom ; tableau des 3 Duels qui ont le plus trompé la salle (numéro, équivalence en icônes, % de réponses fausses) ; cadre du Conseil (titre plus grand, lien plus discret) ; « 📱 Le Duel du jour t'attend sur ton téléphone, un nouveau chaque jour sur duelcarbone.fr » ; « Rejouer une nouvelle Séance ».
- Toutes les commandes de l'Animateur marchent au clavier (Espace pour le bouton principal).

### Le téléphone du Participant
L'écran de jeu actuel, avec ces ajustements :

- **Rejoindre** : code rempli par le QR code (sinon à taper), pseudo, « Il est effacé à la fin de la Séance », « Rejoindre » ; frise d'icônes fixe en bas, qui continue sur l'attente.
- **Attente** : « C'est bon, Camille ! Regarde l'écran : la Séance va bientôt commencer. »
- **Duel** : après le choix, la carte reste marquée « Ton choix », l'autre s'estompe, et un bandeau en bas (à la place de « Duel suivant ») : « ✓ Réponse envoyée · 6/24 ont répondu · Regarde l'écran ».
- **Révélation** : cartes révélées, **animations de bonne réponse comme dans une Partie**, verdict, « 54 % de la salle comme toi », explication et tableau ; pas de bandeau.
- **Classement intermédiaire** : score, rang (« 2e ex aequo sur 24 ») avec ▲▼, phrase selon la place. Catégories, dans cet ordre (décidé au lot 3, `src/domaine/seance-phrases.ts`) : en tête seul ou à égalité (1er palier) ; dernier (dernier palier, ex aequo compris), avant le podium ; podium (2e et 3e paliers), seulement à partir de 4 Participants ; milieu pour tous les autres. Pas de catégorie « top 10 » : elle n'aurait de sens qu'au-delà d'une vingtaine de Participants. À 3 Participants, le 3e a les phrases du dernier et le 2e celles du milieu.
- **Sans réponse** : à la révélation, « Pas de réponse à temps : ce Duel ne compte pas pour toi » (ou « Tu joues dès le prochain Duel » pour qui est arrivé pendant sa révélation) ; dans le Récapitulatif, la case compte comme ratée et son détail dit « Pas de réponse à ce Duel ».
- **Fin** : score, rang, médaille ; « Jouer le Duel du jour » (`?ref=seance`) ; le Conseil, avec son lien ; le Récapitulatif, dont chaque case ouvre le détail du Duel.

## 7. Décisions d'implémentation

- **Serveur** : un Durable Object par Séance, nommé par le code, juridiction `eu`, stockage SQLite, WebSockets avec mise en veille ; alarme à +24 h qui efface tout (ADR 0007). Les adresses `/api/seance/*` du Worker créent la Séance et ouvrent les connexions.
- **Domaine partagé** : les règles de la Séance (étapes, réponses, score, rang par palier, médailles, part de la salle) en fonctions pures dans `src/domaine/`, utilisées par le jeu et par le Durable Object, comme le Rang du jour.
- **Navigateur** : une connexion qui se rétablit d'elle-même (avec le jeton) et rend `null` au lieu d'une erreur ; la mémoire du navigateur garde le jeton de la Séance en cours, les paires et les Conseils récents de l'Animateur.
- **QR code** : généré dans le navigateur à partir de l'adresse de la Séance, avec la bibliothèque `qrcode` (déjà utilisée par les scripts), chargée seulement avec l'écran de l'Animateur. Il ouvre `/#rejoindre/<code>` (la page arrive avec le téléphone du Participant, lot 3) ; sous le QR code, l'écran projeté affiche le nom du site et le code, pour qui le tape à la main (lot 2).
- **Messages** : l'état complet de la Séance est renvoyé à chaque connexion ; ensuite, une étape à la fois.

### Événements de mesure d'audience
- `seance/creee` à la création ;
- `seance/rejointe` une fois par Participant (pas à chaque reconnexion) ;
- `seance/terminee/<nombre de Participants>`, nombre exact (100 au plus) ;
- `?ref=seance` sur « Jouer le Duel du jour » : GoatCounter range ces arrivées sous la provenance `seance` ;
- `conseil/lien` sur le téléphone, comme en fin de Partie.

## 8. Stratégie de test

- **Vitest** sur le domaine de la Séance : étapes et transitions, fermeture des réponses à la révélation, score avec arrivée en cours, rang par palier et médailles, phrases (une par classement et par catégorie, toutes différentes), choix du Conseil.
- **Le Durable Object** avec `@cloudflare/vitest-plugin`, dans une configuration à part : création, connexion, reconnexion avec le jeton, commandes réservées au jeton d'Animateur, minimum de 2 et limite de 100 Participants, fermeture à 3 h, effacement par l'alarme, paires vérifiées.
- **Playwright** : une Séance entière au clavier, un onglet Animateur et deux onglets Participants (dont un qui se reconnecte), axe-core sur chaque écran, clair et sombre, zoom 200 %, animations réduites.

## 9. Hors périmètre (lot futur)

Mort subite entre ex aequo, filtre automatique des pseudos en français, téléphone de l'Animateur comme télécommande, choix des Duels par l'Animateur, compte d'Animateur, offre Environnement (instance propre à une organisation).

## 10. Lots de construction

1. **Le serveur de la Séance** : Durable Object, routes `/api/seance/*`, domaine partagé, tests ; vérification de la juridiction `eu` sur un aperçu.
2. **L'écran de l'Animateur** : lien discret de l'accueil, page d'explication, création, tous les écrans projetés, « Rejouer ».
3. **Le téléphone du Participant** : rejoindre, attente, Duel, révélation, classement intermédiaire, fin, Récapitulatif, reconnexion, phrases.
4. **Mesure, Vie privée et En savoir plus**, `CLAUDE.md`, tests de bout en bout de la Séance entière.
