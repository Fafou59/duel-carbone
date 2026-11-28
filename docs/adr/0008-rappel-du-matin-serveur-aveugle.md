---
status: accepted
date: 2026-11-27
---

# Le Rappel du matin : un push pour tous, envoyé par un serveur aveugle

Pour faire revenir les joueurs chaque jour, Duel Carbone envoie un **Rappel du matin** : une notification push, à **7 h, heure de Paris**, à tous ceux qui l'ont demandé. Titre « Duel Carbone n° N », texte « C'est l'heure du Duel Carbone ! ⚔️ » (la même accroche que le partage). Un clic ouvre l'accueil. Le Rappel expire à minuit, pour qu'un appareil éteint ne reçoive jamais l'annonce du Duel de la veille.

Le serveur (le Worker et la base D1 de l'ADR 0005) reste **aveugle** : il garde la liste des abonnements push et, pour chacun, la date de la dernière ouverture du jeu, **sans aucun lien avec les Parties** (ni score, ni Série, ni « a joué aujourd'hui »). Un abonnement push est une donnée personnelle (CNIL). C'est la première que le jeu confie au serveur, mais seulement sur demande du joueur. Elle est effacée quand le joueur arrête le Rappel (bouton du jeu), quand le service push la déclare invalide (Rappel désactivé dans les réglages, jeu désinstallé), ou après **90 jours** sans ouvrir le jeu.

La décision a été prise avec Fabien dans le ticket « Notifications quotidiennes du Duel du jour » (issue 69). La recherche technique est dans l'issue 85.

## Options écartées

- **Un e-mail quotidien, seul ou en plus du push** : il faudrait garder de vraies adresses, un service d'envoi (Brevo), un lien de désinscription et les règles de la prospection. Tout ça pour un public à 91 % sur téléphone.
- **Une relance le soir, seulement pour qui n'a pas encore joué** (« Ta Série de 6 jours est en jeu ») : sans doute plus efficace. Mais chaque push reçu doit afficher une notification (Safari et Chrome sanctionnent un push silencieux), si bien que le téléphone ne peut pas trier lui-même. Il faudrait que le jeu dise au serveur « cet abonnement a joué aujourd'hui », c'est-à-dire relier l'activité de jeu à un identifiant d'appareil. À reconsidérer seulement si la mesure montre que le Rappel du matin ne suffit pas, par une nouvelle décision.
- **Une heure choisie par le joueur** : un réglage de plus à l'écran et une donnée de plus par abonnement. À 7 h, le Rappel arrive avant le premier pic de visites (8-9 h) sans réveiller personne à minuit.
- **Garder les abonnements sans limite** : la CNIL attend une durée de conservation précise, et un joueur parti depuis trois mois n'a plus à être sollicité.

## Conséquences

- Le Rappel est proposé **partout où le navigateur sait recevoir un push**, ordinateur compris, dans la carte « Ne rate pas le Duel de demain » à la fin du Duel du jour, qui remplace l'invitation à installer. Sur iPhone, il faut d'abord installer le jeu (iOS 16.4+). La demande se fait en deux temps : un bouton du jeu, puis la fenêtre du navigateur. Si le navigateur refuse sans rien montrer (Firefox réglé sur « Notifications : Bloqué », par exemple), la carte dit que le Rappel n'est pas activé et comment l'autoriser dans les réglages du navigateur : le joueur ne doit jamais croire à un Rappel qui n'existe pas. « Non merci » masque la carte pour toujours ; les joueurs qui avaient refusé l'ancienne invitation la revoient une fois.
- À chaque ouverture, le jeu renvoie son abonnement au serveur, qui met à jour la date de dernière ouverture. C'est la seule trace de visite gardée.
- La tâche planifiée de Cloudflare tourne en heure UTC : le code vérifie qu'il est 7 h à Paris, été comme hiver. Le plan gratuit limite chaque exécution à 50 envois et 10 ms de calcul : l'envoi passe par une file (Queue), **par lots de 25** (un envoi coûte au plus 0,33 ms de calcul, mesuré par le prototype : 25 envois font environ 8 ms, 50 en feraient 16).
- Le jeu ne dépend toujours pas du serveur : sans lui, il n'y a simplement pas de Rappel.
- Les aperçus des branches ne lancent ni la tâche planifiée ni la file (Cloudflare ne le permet pas) : une adresse d'essai, ouverte sur les aperçus seulement, y envoie le Rappel tout de suite à l'appareil qui le demande. La chaîne complète (tâche, file, envoi, effacement sur 410) a été essayée en local avec `wrangler dev` avant la mise en production.
- Mesure : `notifications/proposees`, `notifications/acceptees`, `notifications/refusees` (« Non merci »), `notifications/bloquees` (refus du navigateur), et `?ref=notification` à l'ouverture depuis un Rappel. Le taux de retour d'avant sert de point de comparaison.
- Le prototype du ticket 144 (28/11, branche `prototype/rappel`) a validé l'envoi depuis le Worker, en Web Crypto pur (`serveur/web-push.ts`, conforme à l'exemple de la RFC 8291) : Rappel reçu sur iPhone (jeu installé), Chrome et Firefox Android, expiration à minuit et ouverture de l'accueil comprises. À la construction, le PRD, la page En savoir plus et la page Mentions légales et vie privée sont mis à jour.
- Cette décision complète l'ADR 0005 sans la remplacer : les comptages du Rang du jour et du Taux d'erreur restent sans identité.
