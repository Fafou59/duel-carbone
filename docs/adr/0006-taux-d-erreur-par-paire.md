---
status: accepted
date: 2026-11-23
---

# Compter les erreurs par paire de Gestes, en un envoi par Partie

Un joueur a demandé à savoir, pour chaque Duel, combien de personnes se trompent. Le serveur du Rang du jour (ADR 0005) reçoit déjà les 10 choix du Duel du jour pour recalculer le score, puis les oublie. Nous lui faisons désormais garder, **pour chaque paire de Gestes**, deux compteurs : le nombre de réponses et le nombre de réponses fausses. Le jeu en tire le **Taux d'erreur**, qu'il montre au joueur à travers sa propre réponse : « 72 % comme toi », avec une petite barre, sur la ligne du verdict de chaque Duel et dans le Récapitulatif, dès 4 réponses (la part des bonnes réponses s'il a trouvé, des fausses sinon ; prototype du 25/11, branche `prototype/taux-d-erreur`). Les mêmes compteurs permettent de repérer les Gestes sous-estimés et surestimés.

La paire est comptée **sans ordre** (jean contre pull = pull contre jean), **tous jours et toutes Parties confondus** : un Duel thématique et un Duel tiré au hasard sur la même paire comptent ensemble. On compte des **réponses**, pas des joueurs : le serveur ne connaît toujours aucune identité, et un même joueur peut retomber sur une paire.

Le jeu échange **deux fois par Partie** avec le serveur : au lancement, il envoie les 10 paires (tirées dès le début, même en Partie libre) et reçoit leurs Taux d'erreur ; à la fin, il envoie ses 10 choix en une fois, et reçoit les Taux d'erreur à jour. Pour le Duel du jour, cet envoi de fin est aussi celui du Rang du jour. Le Duel du jour vient d'abord ; la Partie libre suit avec le même mécanisme.

## Options écartées

- **Compter par Duel du jour** (le Duel n° 7 du 23/11) : les chiffres repartiraient de zéro chaque jour (rien à afficher pour les premiers joueurs du matin) et la Partie libre, sans calendrier commun, ne pourrait pas en avoir.
- **Un envoi à chaque Duel**, avec le Taux d'erreur en retour : chiffre plus frais et Parties abandonnées comptées, mais 10 appels au serveur par Partie au lieu de 2, des doubles comptes à éviter quand on recharge la page, et un second mécanisme à côté de l'envoi unique du Rang du jour.

## Conséquences

- **Le serveur vérifie avant de compter** : pour le Duel du jour, les 10 choix doivent correspondre au calendrier ; pour la Partie libre, chaque paire doit être une paire jouable du catalogue. Il recalcule lui-même la bonne réponse et ne croit jamais un résultat annoncé.
- **Les Parties abandonnées ne sont pas comptées**, et le Taux d'erreur affiché à la révélation n'inclut pas encore la réponse du joueur. Sur des chiffres cumulés depuis le début, l'écart est négligeable.
- **Le jeu ne dépend jamais du serveur** : hors ligne ou en panne, aucun Taux d'erreur ne s'affiche et la Partie se joue normalement.
- **Lire les paires au lancement ne dévoile rien de nouveau** : le calendrier et les Empreintes sont déjà dans le code du jeu, qui calcule lui-même la bonne réponse pour marcher hors ligne. Ce n'est pas couvert, volontairement.
- **Le plafond du plan gratuit** : chaque Partie terminée écrit 10 lignes dans la base, quelle que soit l'option, et D1 en accepte 100 000 par jour, soit environ 10 000 Parties par jour (le Rang du jour en ajoute une par Duel du jour). Bien au-delà de l'audience actuelle ; au-delà, le Taux d'erreur cesse simplement de s'afficher jusqu'au lendemain, ou on passe au plan payant.
- **Les chiffres commencent à la mise en ligne** : les choix reçus jusque-là n'ont jamais été gardés.
- À la construction, la page En savoir plus (« Ni tes choix… », « La Partie libre n'envoie rien »), le PRD (événements de mesure) et `CLAUDE.md` seront mis à jour. L'ADR 0005 reste valable : le serveur ne garde toujours que des compteurs, sans identité.
