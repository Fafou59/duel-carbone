---
status: accepted
date: 2026-11-26
---

# Une Séance du Mode animation : un Durable Object par Séance, un pseudo et un jeton effacés sous 24 h

Le Mode animation (issue 113) fait jouer une salle en direct : un Animateur projette les Duels, jusqu'à 100 Participants répondent sur leur téléphone, et la révélation doit apparaître aussitôt sur tous les écrans. La base D1 (ADR 0005) ne sait pas prévenir un téléphone : il faudrait que chacun la réinterroge sans cesse. Nous ajoutons donc au Worker un **Durable Object par Séance** : un petit serveur à mémoire, désigné par le code de la Séance, qui reçoit toutes les connexions de la salle par **WebSocket** (une connexion qui reste ouverte, où le serveur peut parler le premier), garde l'état de la Séance dans sa propre base SQLite et pousse chaque étape à tous les téléphones. Il est créé dans la **juridiction `eu`**, comme D1. Grâce à la mise en veille des WebSockets, une Séance type ne coûte rien sur le plan gratuit (recherche de l'issue 128, `docs/recherches/durable-objects-seance.md`).

C'est la **première fois que le serveur garde des données personnelles**, et nous les réduisons au strict nécessaire :

- **un jeton de Participant**, tiré au hasard par le téléphone quand il rejoint la Séance, gardé sur le téléphone et envoyé avec chaque message. Il sert à reprendre sa place après une coupure : Cloudflare coupe les connexions au moins toutes les 20 minutes lors de ses mises à jour, et un téléphone se met en veille. Il ne vaut que pour cette Séance : il ne permet pas de suivre quelqu'un d'une Séance à l'autre ;
- **un pseudo** (20 caractères au plus), seulement si l'Animateur a choisi un Classement. L'Animateur peut le retirer d'un clic s'il est déplacé ;
- **les réponses** de chaque Participant, pour le score, le Classement et la part de la salle ;
- **un jeton d'Animateur**, tiré au hasard à la création et gardé sur son ordinateur : lui seul peut lancer, révéler, passer au Duel suivant et retirer un pseudo.

L'adresse IP n'est jamais stockée. La Séance se **ferme 3 heures après sa création** ; une **alarme programmée à +24 h efface toute la base de l'objet**, que Cloudflare nettoie ensuite de lui-même. Ne restent que des totaux sans identité : les réponses ajoutées aux compteurs du Taux d'erreur (ADR 0006), et le nombre de Séances et de Participants pour la mesure d'audience.

Le **responsable du traitement est l'éditeur du jeu** : le Mode animation est un outil public et gratuit, l'Animateur ne fait que s'en servir. Garder les jetons sur l'appareil est **strictement nécessaire au service demandé** (rejoindre ou animer une Séance) : la règle de la CNIL dispense alors de consentement, il n'y a donc pas de bandeau. La page Vie privée l'explique.

**L'ordinateur de l'Animateur tire les Duels et choisit le Conseil**, avec la mémoire de son navigateur, comme en Partie libre : les paires récentes et les 10 derniers Conseils montrés y sont écartés, si bien qu'un groupe qui enchaîne les Séances ne revoit ni les mêmes Duels ni le même Conseil. Le Durable Object vérifie chaque paire (`estUnePaireJouable`, comme pour le Taux d'erreur), recalcule lui-même les bonnes réponses et ne croit jamais un score annoncé.

## Options écartées

- **Faire interroger D1 par chaque téléphone toutes les secondes** : pas de nouvelle brique, mais 100 téléphones × 3 600 appels par heure dépasseraient vite les 100 000 appels quotidiens du Worker gratuit, avec une seconde de retard sur la révélation.
- **Pas de jeton, on se reconnecte en retapant son pseudo** : aucune donnée sur l'appareil, mais deux « Camille » se confondent, quelqu'un peut prendre la place d'un autre, et sans Classement il n'y a pas de pseudo du tout.
- **Un identifiant durable du téléphone, gardé d'une Séance à l'autre** : il permettrait de reconnaître un Participant d'une fois sur l'autre, donc de le suivre. Rien dans le Mode animation n'en a besoin.
- **Un compte d'Animateur** : il permettrait de retrouver ses Séances et ses Conseils récents sur un autre ordinateur, au prix d'une adresse e-mail et d'un mot de passe. Il relève de l'offre Environnement, hors de cette décision.
- **Laisser le serveur tirer les Duels** : il faudrait lui confier la mémoire des paires récentes de l'Animateur, donc reconnaître l'Animateur d'une Séance à l'autre.

## Conséquences

- **Le principe « sans identité » de l'ADR 0005 reste vrai pour tout le reste du jeu** (Rang du jour, Taux d'erreur, Partie du jour, Partie libre). Il est assoupli pour la seule Séance, et pour 24 heures au plus.
- **Le jeu en solo ne dépend toujours pas du serveur.** Le Mode animation, lui, en dépend : sans connexion, une Séance ne peut pas se jouer. Un téléphone coupé se reconnecte de lui-même et retrouve la Séance où elle en est.
- **La juridiction `eu` des Durable Objects sur le plan gratuit n'est pas documentée** : le premier lot de construction l'a vérifiée sur un aperçu le 26/11/2026 (issue 134) : un objet SQLite s'y crée, répond `jurisdiction: "eu"` et garde ses données. Le moteur local (workerd), lui, ne connaît pas les juridictions : les tests de l'objet s'en passent (`SEANCE_SANS_JURIDICTION`, jamais déclaré dans `wrangler.jsonc`).
- **Les quotas gratuits** (100 000 requêtes et 100 000 lignes écrites par jour pour les Durable Objects) laissent environ 60 Séances types par jour. Au-delà, une nouvelle Séance ne peut plus se créer jusqu'au lendemain (00:00 UTC), ou on passe au plan payant (5 $ par mois).
- **De nouveaux outils de test** : `@cloudflare/vitest-plugin`, dans une configuration Vitest à part, pour tester l'objet, son alarme et ses WebSockets.
- À la construction, la page Vie privée, la page En savoir plus, le PRD (`docs/prd-mode-animation.md`) et `CLAUDE.md` sont mis à jour.
