---
status: accepted
date: 2026-11-22
---

# Un serveur sur le Worker, avec D1 dans l'UE, sans identité

Jusqu'ici, Duel Carbone était un site 100 % statique : Cloudflare ne faisait que servir des fichiers, tout le jeu tournait dans le navigateur. Pour afficher « tu as fait mieux que x % des joueurs aujourd'hui », il faut une mémoire partagée entre tous les joueurs, donc un serveur. Nous l'ajoutons **dans le Worker qui sert déjà le site** : les fichiers restent servis comme avant, et seules les adresses `/api/...` appellent du code. Ce code range ses données dans une base **D1** (SQLite chez Cloudflare) **créée dans la juridiction `eu`**, pour que les données restent dans l'Union européenne. Le plan gratuit suffit à notre échelle. La recherche qui fonde ce choix est dans l'issue 85 (branche `research/serveur-cloudflare`).

Le serveur ne connaît **aucune identité** : ni pseudo, ni identifiant d'appareil, et l'adresse IP n'est jamais stockée. Il ne garde que des effectifs agrégés (pour chaque jour, combien de joueurs ont fait 0, 1… 10), si bien que le jeu reste sans compte, sans cookie et sans donnée personnelle.

## Options écartées

- **Rester sans serveur** : impossible de comparer un joueur aux autres ; GoatCounter compte des événements mais ne se lit pas depuis le jeu.
- **Un identifiant d'appareil ou un pseudo dès maintenant** : utile plus tard pour les Groupes et les notifications, mais c'est une donnée personnelle (CNIL), avec information, durée de conservation et droit d'effacement à gérer, pour un besoin que des comptages anonymes couvrent.
- **KV au lieu de D1** : KV met jusqu'à 60 s à propager une écriture et n'a pas d'opération atomique ; il ne convient pas à un compteur partagé.
- **Un hébergeur ou une base à part** : un deuxième service à suivre, alors que le Worker existant peut porter l'API.

## Conséquences

- **Le serveur recalcule le score** à partir des 10 réponses (il connaît le calendrier du Duel du jour) : il ne croit jamais un score qu'on lui annonce. Les rares doublons (un joueur qui vide son navigateur et rejoue) sont acceptés.
- **Le jeu ne dépend jamais du serveur**, comme pour la mesure d'audience : hors ligne, serveur lent ou en panne, la Partie se joue normalement et le pourcentage ne s'affiche pas. Un seul envoi, sans file d'attente ni nouvel essai.
- La juridiction `eu` ne se choisit qu'à la création de la base : une base créée sans elle ne pourra jamais y passer.
- Les Groupes et les notifications réutiliseront ce Worker et cette base. S'ils demandent une identité, une nouvelle décision remplacera celle-ci (statut « superseded »).
- À la construction, le PRD, `CLAUDE.md` (« Pas de serveur ») et la page En savoir plus seront mis à jour.
