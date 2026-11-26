# Ce que permettent les Durable Objects pour une Séance en direct

Recherche du ticket #128, pour la décision #129 (Mode animation, ticket parent #112). Ce document rapporte des faits sourcés et des calculs d'ordre de grandeur ; il ne tranche rien. Sources consultées le 25 novembre 2026 sur la documentation officielle de Cloudflare et le registre npm : les prix et limites changent, à revérifier au moment de construire. Ce qui est une déduction ou un calcul, et non une citation, est signalé comme tel.

## La question

Que permettent les Durable Objects de Cloudflare pour faire tourner une Séance du Mode animation en direct (un Animateur, jusqu'à 100 Participants sur téléphone, au plus 3 h, chaque révélation visible aussitôt sur tous les téléphones, tout effacé sous 24 h), et à quel coût ?

## En bref : un objet par Séance

Un Durable Object est un petit serveur à mémoire, créé à la demande et désigné par un nom, qui reçoit toutes les connexions d'un même groupe. Il suffit de prendre le code d'entrée de la Séance comme nom : l'Animateur et tous les Participants se branchent sur le même objet, qui garde l'état de la Séance (Duel en cours, réponses, Classement) dans sa propre petite base SQLite et pousse chaque révélation à tous les téléphones par WebSocket (une connexion qui reste ouverte, dans laquelle le serveur peut parler le premier).

## L'essentiel : la réponse à chaque point du ticket

- **Offre gratuite : oui.** Les Durable Objects « are available both on Workers Free and Workers Paid plans », mais seulement avec le stockage SQLite ; le stockage clé-valeur est réservé au payant ([tarifs DO](https://developers.cloudflare.com/durable-objects/platform/pricing/)). Quotas gratuits, par jour : 100 000 requêtes, 13 000 Go-s de durée, 5 M lignes lues, 100 000 lignes écrites, 5 Go stockés au total. Au-delà, les opérations échouent jusqu'à minuit UTC.
- **Messages WebSocket : très peu chers.** Les messages envoyés par le serveur (la révélation poussée aux téléphones) sont gratuits ; les messages reçus comptent pour 1 requête toutes les 20. Ouvrir une connexion compte pour 1 requête ([tarifs DO](https://developers.cloudflare.com/durable-objects/platform/pricing/)).
- **Mise en veille (« WebSocket Hibernation ») : c'est elle qui rend le direct presque gratuit.** Entre deux messages, l'objet est retiré de la mémoire mais les téléphones restent connectés, et la durée n'est plus facturée. Sans elle, l'objet est facturé à la minute pendant toute la Séance ([WebSockets DO](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)).
- **Connexions par objet : 32 768 au maximum** avec la mise en veille ([API State](https://developers.cloudflare.com/durable-objects/api/state/)). 100 Participants en sont loin.
- **Reconnexion d'un téléphone : à prévoir dans le jeu.** Cloudflare ne garantit pas qu'une connexion tienne 3 h (mises à jour de ses serveurs, déploiements) et demande de concevoir des clients qui se reconnectent et retrouvent leur état ([WebSockets Workers](https://developers.cloudflare.com/workers/runtime-apis/websockets/)). L'objet doit donc garder l'état de la Séance dans sa base et le renvoyer à chaque téléphone qui revient.
- **Données dans l'UE : oui.** La juridiction `eu` garantit que l'objet « only run and store data » dans l'UE, comme la base D1 du jeu ([emplacement des données DO](https://developers.cloudflare.com/durable-objects/reference/data-location/)).
- **Effacement sous 24 h : oui, par une alarme.** L'objet programme à sa création une alarme à +24 h qui efface toute sa base (`deleteAll()`) ; une fois les données effacées, Cloudflare nettoie l'objet de lui-même ([alarmes](https://developers.cloudflare.com/durable-objects/api/alarms/), [API SQLite](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/), [tarifs DO](https://developers.cloudflare.com/durable-objects/platform/pricing/)).
- **`wrangler.jsonc` : quelques lignes**, et **les aperçus de branche fonctionnent** : chaque aperçu reçoit automatiquement ses propres objets, séparés de la production, effacés avec l'aperçu ([aperçus, ressources](https://developers.cloudflare.com/workers/previews/resources/)).
- **Coût d'une Séance type (30 Participants, 10 Duels, 45 min) : 0 €** sur l'offre gratuite, en consommant de l'ordre de 0,3 % des requêtes, moins de 0,1 % de la durée et environ 1,5 % des écritures d'une journée gratuite (calcul en section 5).
- **Un mois à 50 Séances : 0 €** sur l'offre gratuite, les quotas étant journaliers. Même sur l'offre payante, tout tiendrait dans ce qui est inclus : on ne paierait que le minimum de 5 $ par mois.
- **Les limites « 100 Participants » et « 3 heures » tiennent dans le gratuit**, avec une large marge, à condition d'utiliser la mise en veille. Sans elle, une Séance de 3 h consommerait encore seulement 11 % de la durée gratuite d'une journée. La vraie difficulté des 3 h n'est pas le coût mais la reconnexion des téléphones.
- **Tests : oui, avec Vitest.** Le paquet `@cloudflare/vitest-plugin` (nouveau nom de `@cloudflare/vitest-pool-workers`) accepte Vitest 5, la version du projet, et sait tester un objet, son alarme et ses WebSockets ([npm](https://www.npmjs.com/package/@cloudflare/vitest-plugin), [tester les DO](https://developers.cloudflare.com/durable-objects/examples/testing-with-durable-objects/)). Il demande une configuration de test à part et a une limite connue avec les WebSockets.

## 1. Disponibilité et prix

« Durable Objects are available both on Workers Free and Workers Paid plans. » Sur l'offre gratuite, « Only Durable Objects with SQLite storage backend are available » ([tarifs DO](https://developers.cloudflare.com/durable-objects/platform/pricing/)). Ils y sont arrivés le 7 avril 2025 ([notes de version DO](https://developers.cloudflare.com/durable-objects/release-notes/)).

| Ce qui est compté | Offre gratuite (par jour) | Offre payante (5 $/mois minimum) |
| --- | --- | --- |
| Requêtes (HTTP, appels RPC, messages WebSocket reçus, alarmes) | 100 000 | 1 M/mois inclus, puis 0,15 $ par million |
| Durée (temps d'horloge × 128 Mo) | 13 000 Go-s | 400 000 Go-s/mois inclus, puis 12,50 $ par million de Go-s |
| Lignes lues (SQLite) | 5 M | 25 Md/mois inclus, puis 0,001 $ par million |
| Lignes écrites (SQLite) | 100 000 | 50 M/mois inclus, puis 1,00 $ par million |
| Données stockées (SQLite) | 5 Go au total | 5 Go-mois inclus, puis 0,20 $ par Go-mois |

Source : [tarifs DO](https://developers.cloudflare.com/durable-objects/platform/pricing/). Points à retenir :

- **Dépassement sur l'offre gratuite :** « If you exceed any one of the free tier limits, further operations of that type will fail with an error. » Les compteurs repartent à zéro à 00:00 UTC (1 h ou 2 h du matin à Paris).
- **La durée** est facturée sur 128 Mo de mémoire, quelle que soit la mémoire réellement utilisée : une seconde d'objet actif coûte 0,128 Go-s. Un objet inactif ne coûte rien.
- **WebSocket :** « A request is needed to create a WebSocket connection. There is no charge for outgoing WebSocket messages », ni pour les « pings » du protocole ; pour les messages reçus, « a 20:1 ratio is applied » (100 messages reçus = 5 requêtes).
- **Alarme :** chaque `setAlarm()` compte pour une ligne écrite ; chaque déclenchement compte pour une requête.
- **Effacements :** « Deletes are counted as rows written. »
- **Stockage :** une base SQLite vide pèse environ 12 Ko ; une fois les données effacées, « the object will be cleaned up automatically by the system ».
- **Côté Worker** (le code qui reçoit l'appel du téléphone et le transmet à l'objet) : « WebSocket connections made to a Worker are charged as a request », mais « WebSocket messages routed through a Worker do not count as requests » ([tarifs Workers](https://developers.cloudflare.com/workers/platform/pricing/)). Chaque connexion d'un téléphone consomme donc aussi 1 des 100 000 appels quotidiens du Worker gratuit, déjà partagés avec le Rang du jour et le Taux d'erreur.
- **Autres limites de l'offre gratuite :** 100 classes d'objets par compte, 1 Go de stockage par objet ([limites DO](https://developers.cloudflare.com/durable-objects/platform/limits/), [FAQ tarifs DO](https://developers.cloudflare.com/durable-objects/platform/pricing/#frequently-asked-questions)).

## 2. WebSockets et mise en veille

### Comment ça marche

- Le téléphone ouvre une connexion WebSocket vers le Worker, qui la transmet à l'objet de la Séance. L'objet l'accepte avec `this.ctx.acceptWebSocket(server)` et réagit aux messages dans `webSocketMessage()` et `webSocketClose()` ([WebSockets DO](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)).
- **Pendant la veille**, l'objet est retiré de la mémoire, « In-memory state is reset », mais les connexions restent ouvertes chez Cloudflare. Au message suivant, l'objet est recréé (son constructeur s'exécute) et traite le message. Chaque connexion peut porter une petite fiche (`serializeAttachment`, 16 384 octets au plus) qui survit à la veille, par exemple l'identifiant du Participant ([WebSockets DO](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)).
- **Quand l'objet s'endort :** après 10 secondes sans événement, et seulement si aucun minuteur `setTimeout`/`setInterval` n'est en cours, aucune opération réseau n'est en attente, et qu'aucune connexion n'a été acceptée par l'ancienne méthode `accept()` ([cycle de vie DO](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/)). Une alarme programmée n'empêche pas la veille ; c'est son déclenchement qui réveille l'objet.
- **Les « ping » de maintien en vie** peuvent recevoir une réponse automatique (`setWebSocketAutoResponse`) sans réveiller l'objet ni facturer de durée ([API State](https://developers.cloudflare.com/durable-objects/api/state/)).

### Effet sur la facture

- « Durable Objects that are idle and eligible for hibernation are not billed for duration, even before the runtime has hibernated them » ([tarifs DO](https://developers.cloudflare.com/durable-objects/platform/pricing/)). Pour une Séance, seule compte la durée pendant laquelle l'objet traite réellement un message (quelques millisecondes à chaque fois), et non les 45 minutes.
- À l'inverse, « Calling `accept()` on a WebSocket in an Object will incur duration charges for the entire time the WebSocket is connected » : sans mise en veille, toute la Séance est facturée ([tarifs DO](https://developers.cloudflare.com/durable-objects/platform/pricing/)).
- Conséquence pratique (déduction) : un compte à rebours côté serveur fait avec `setTimeout` empêcherait la veille. Un délai se programme plutôt avec l'alarme de l'objet, ou reste sur l'écran de l'Animateur.

### Nombre de connexions

« The WebSocket Hibernation API permits a maximum of 32,768 WebSocket connections per Durable Object, but the CPU and memory usage of a given workload may further limit the practical number of simultaneous connections » ([API State](https://developers.cloudflare.com/durable-objects/api/state/)). Un objet accepte en outre environ 1 000 requêtes par seconde (limite indicative) ; au-delà, l'appelant reçoit une erreur de surcharge ([limites DO](https://developers.cloudflare.com/durable-objects/platform/limits/)). Les messages reçus peuvent peser jusqu'à 32 Mio.

### Reconnexion d'un téléphone

- **Les coupures arriveront.** Lors des mises à jour régulières de leurs serveurs, Cloudflare laisse aux connexions WebSocket jusqu'à 20 minutes pour se terminer, puis les coupe ; « Crashes, resource pressure, and shutdowns can interrupt work earlier » ([limites Workers](https://developers.cloudflare.com/workers/platform/limits/#runtime-updates)). La consigne officielle : « Design clients to reconnect after a disconnection and restore application state » ([WebSockets Workers](https://developers.cloudflare.com/workers/runtime-apis/websockets/)).
- **Un déploiement du jeu pendant une Séance :** les connexions en veille restent ouvertes quand l'objet adopte le nouveau code ; une mise à jour forcée (stratégie `immediate`, ou délai maximal atteint avant la veille) les coupe ([WebSockets DO](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)).
- **Ce qui est perdu à la coupure :** la fiche attachée à la connexion (« attachments are lost » quand un côté ferme). Ce qui est dans la base SQLite de l'objet reste.
- **Ce qu'il faut donc construire (déduction) :** le téléphone se reconnecte de lui-même et se représente avec un jeton tiré au hasard à son arrivée et gardé dans le navigateur ; l'objet lui renvoie l'état courant (Duel en cours, révélé ou non, sa réponse, son score). Ce jeton est un identifiant d'appareil : au sens de la CNIL, c'est une donnée personnelle, même sans pseudo (voir la recherche du ticket #85, branche `research/serveur-cloudflare`). Il ne vit que le temps de la Séance et s'efface avec elle, mais l'ADR 0005 (« sans identité ») devra en tenir compte.

## 3. Un objet par Séance : code, lieu, effacement

### Créer l'objet à partir du code d'entrée

- `env.SEANCE.getByName(code)` (ou `idFromName`) désigne toujours le même objet pour un même nom, et le crée au premier appel ([API Namespace](https://developers.cloudflare.com/durable-objects/api/namespace/)). Le code affiché par l'Animateur suffit donc à rejoindre la bonne Séance.
- Rien n'empêche deux Séances de tomber sur le même code court ; l'objet doit savoir s'il est déjà occupé (déduction). Cloudflare ne fournit pas de liste des objets à consulter depuis le Worker.

### Garder les données dans l'UE

- « Jurisdictions are used to create Durable Objects that only run and store data within a region », avec la valeur `eu`. On l'écrit `env.SEANCE.jurisdiction("eu").getByName(code)` ([emplacement des données DO](https://developers.cloudflare.com/durable-objects/reference/data-location/)).
- Le même nom avec et sans juridiction désigne deux objets différents : il faut toujours passer par la juridiction.
- Seul l'identifiant technique de l'objet sort de l'UE : « A `DurableObjectId` will be logged outside of the specified jurisdiction for billing and debugging purposes. »
- Les « location hints » (`weur`…) ne sont qu'une préférence, « a best effort and not a guarantee » : ils ne suffisent pas pour une promesse de localisation.
- La page ne dit pas si la juridiction est réservée à une offre ; elle ne mentionne aucune restriction (voir « Ce qui reste incertain »).

### Effacer sous 24 h

- Chaque objet a **une seule alarme à la fois** ; la reprogrammer remplace la précédente. Exécution « at-least-once », avec jusqu'à 6 nouvelles tentatives si elle échoue ([alarmes](https://developers.cloudflare.com/durable-objects/api/alarms/)).
- `deleteAll()` « Deletes all stored data, effectively deallocating all storage », de façon atomique. Avec une date de compatibilité à partir du 24/02/2026 (le jeu utilise le 01/11/2026), il supprime aussi l'alarme en cours ([API SQLite](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)).
- Après effacement, « the object will be cleaned up automatically by the system » ([tarifs DO](https://developers.cloudflare.com/durable-objects/platform/pricing/)).
- Schéma possible (déduction) : à la création, `setAlarm(maintenant + 24 h)` ; dans `alarm()`, fermer les connexions restantes puis `deleteAll()`. Comme il n'y a qu'une alarme par objet, tout autre délai (fin automatique d'une Séance oubliée, par exemple après 3 h) doit partager cette alarme : on programme la plus proche, et l'alarme reprogramme la suivante.

## 4. `wrangler.jsonc` et aperçus de branche

### Ce qu'il faut ajouter

- La classe de l'objet doit être exportée par le code du serveur (`serveur/index.ts`) et déclarée dans `wrangler.jsonc`. La forme actuelle est le champ `exports`, qui remplace depuis le 30/06/2026 l'ancien tableau `migrations` (les deux restent acceptés, mais pas ensemble) ([déclaration des classes](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/), [notes de version DO](https://developers.cloudflare.com/durable-objects/release-notes/)) :

  ```jsonc
  "durable_objects": { "bindings": [{ "name": "SEANCE", "class_name": "Seance" }] },
  "exports": { "Seance": { "type": "durable-object", "storage": "sqlite" } }
  ```

  Avec l'ancien tableau, il faut `new_sqlite_classes` (et non `new_classes`, qui crée un stockage clé-valeur refusé sur l'offre gratuite).
- Supprimer ou renommer une classe plus tard se fait par une « pierre tombale » dans `exports` ; la suppression est définitive.
- Ces changements ne s'appliquent qu'avec `wrangler deploy` (pas avec `wrangler versions upload`) ([déclaration des classes](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)). Pas besoin de migration SQL pour D1 : l'objet crée ses propres tables dans sa base.

### Les aperçus (Workers Builds, `wrangler preview`)

- « For a class defined in the same Worker without `script_name`, each Preview automatically gets its own namespace and storage. State persists across deployments within the same Preview and is deleted when the Preview is deleted » ([aperçus, ressources](https://developers.cloudflare.com/workers/previews/resources/)). Contrairement à D1, rien à créer ni à partager : chaque branche a ses propres Séances, sans risque de mélanger les essais.
- Deux façons d'atteindre l'objet :
  - **`ctx.exports.Seance`** (recommandée, active d'office avec notre date de compatibilité) : rien à ajouter dans le bloc `previews` ;
  - **`env.SEANCE`** (comme `env.BASE` aujourd'hui) : il faut répéter la liaison dans `previews.durable_objects.bindings`, sinon l'aperçu répond par une erreur 1101.
- Les limites connues des aperçus concernent les liaisons entre Workers, les Workflows, les Queues, les Cron Triggers et les routes, pas les Durable Objects.

## 5. Coût d'une Séance type et d'un mois

Calcul d'ordre de grandeur (pas une source), avec des hypothèses prudentes : 30 Participants + l'Animateur sur deux appareils (écran projeté et téléphone) = 32 connexions ; chaque appareil se reconnecte 3 fois ; un « ping » de maintien toutes les 30 s par appareil, compté comme message reçu même s'il reçoit une réponse automatique ; 50 ms de traitement par événement.

| Poste | Séance type (30 Participants, 10 Duels, 45 min) | Part du quota gratuit d'un jour |
| --- | --- | --- |
| Connexions (32 + 96 reconnexions) | 128 requêtes | |
| Messages reçus : 300 réponses, ~50 commandes de l'Animateur, 30 arrivées, ~2 900 pings = ~3 300 ÷ 20 | ~165 requêtes | |
| Création, alarme | ~3 requêtes | |
| **Requêtes de l'objet** | **~300** | **0,3 % de 100 000** |
| Appels du Worker (une par connexion, plus quelques appels) | ~150 | 0,15 % de 100 000 (partagés avec le Rang du jour) |
| Durée, avec mise en veille (~550 événements × 50 ms × 0,128 Go) | ~3,5 Go-s | 0,03 % de 13 000 |
| Durée, sans mise en veille (2 700 s × 0,128 Go) | ~346 Go-s | 2,7 % de 13 000 |
| Lignes écrites (Participants, réponses, état, index, effacement final) | ~1 500 | 1,5 % de 100 000 |
| Lignes lues (Classement après chaque Duel, état renvoyé aux reconnexions) | < 10 000 | 0,2 % de 5 M |
| Stockage | quelques dizaines de Ko pendant 24 h | négligeable sur 5 Go |
| **Coût** | **0 €** | |

**Un mois à 50 Séances :** sur l'offre gratuite, les quotas sont journaliers ; 2 ou 3 Séances un même jour restent sous 5 % de chaque quota. **Coût : 0 €.** Sur un mois, cela fait environ 15 000 requêtes, 175 Go-s (ou 17 000 Go-s sans mise en veille) et 75 000 lignes écrites : même sur l'offre payante, tout tiendrait dans ce qui est inclus (1 M de requêtes, 400 000 Go-s, 50 M de lignes), et l'on ne paierait que le minimum de 5 $ par mois.

**Combien de Séances par jour avant de toucher un plafond gratuit ?** Avec la mise en veille, ce sont les lignes écrites qui plafonnent en premier : environ 60 Séances types par jour. Sans mise en veille, ce serait la durée : environ 37 Séances par jour.

## 6. Les limites « 100 Participants » et « 3 heures »

Même calcul, cas le plus lourd : 100 Participants + 2 appareils de l'Animateur, 3 h, 10 reconnexions par appareil.

| Poste | Séance de 3 h à 100 Participants | Part du quota gratuit d'un jour |
| --- | --- | --- |
| Requêtes (1 020 connexions + ~38 000 messages ÷ 20) | ~2 900 | 2,9 % |
| Durée avec mise en veille | ~15 Go-s | 0,1 % |
| Durée sans mise en veille (10 800 s × 0,128 Go) | ~1 380 Go-s | 10,6 % |
| Lignes écrites | ~4 000 | 4 % |
| Connexions simultanées | 102 | sur 32 768 permises |
| Pic de réponses | 100 réponses en quelques secondes | sous la limite indicative de 1 000 par seconde |

- **Le gratuit tient**, avec ou sans mise en veille.
- **Aucune durée maximale de connexion n'est documentée** : « No hard limit while the client remains connected » ([limites Workers](https://developers.cloudflare.com/workers/platform/limits/)). Mais sur 3 h, au moins une coupure par téléphone est probable (mises à jour des serveurs de Cloudflare, qui ne laissent que 20 minutes aux connexions en cours ; téléphones mis en veille ; réseau) : la reconnexion n'est pas une option, c'est une condition pour que les 3 h tiennent (déduction).
- **Calcul par message :** chaque message reçu redonne à l'objet 30 s de calcul ([limites DO](https://developers.cloudflare.com/durable-objects/platform/limits/)) ; enregistrer une réponse et diffuser une révélation à 100 téléphones en prend quelques millisecondes (estimation, non mesurée).

## 7. Tester avec Vitest

- **Le paquet :** `@cloudflare/vitest-pool-workers` s'appelle désormais `@cloudflare/vitest-plugin` (changement du 19/08/2026 ; un « codemod » fait le renommage) ([changelog Cloudflare](https://developers.cloudflare.com/changelog/post/2026-08-19-vitest-plugin/)). La version 1.9.2 déclare accepter `vitest ^4.1.0 || ^5.0.0`, donc la version 5.1 du projet ([registre npm](https://www.npmjs.com/package/@cloudflare/vitest-plugin), relevé par `npm view` le 25/11/2026). La page d'exemple de Cloudflare cite encore `vitest@^4.1.0`.
- **Ce qu'il permet :** les tests s'exécutent dans le vrai moteur des Workers (en local), avec la configuration de `wrangler.jsonc`. On peut appeler l'objet, regarder sa base (`runInDurableObject`), déclencher son alarme tout de suite (`runDurableObjectAlarm`, utile pour tester l'effacement à 24 h), simuler la mise en veille (`evictDurableObject`) et ouvrir une WebSocket vers l'objet ([tester les DO](https://developers.cloudflare.com/durable-objects/examples/testing-with-durable-objects/)).
- **Limite connue :** « Using WebSockets with Durable Objects is not supported with per-file storage isolation » ; le contournement est de lancer ces tests avec `--max-workers=1 --no-isolate` ([problèmes connus](https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/)).
- **Ce que cela change pour le projet (constat) :** les tests actuels tournent dans jsdom (le jeu) et dans Node avec `node:sqlite` en mémoire (le serveur, `serveur/api.test.ts`). Les tests de l'objet demanderaient un troisième environnement de test, configuré à part. Une option est de garder les règles de la Séance en fonctions pures dans `src/domaine/` (comme `partie.ts`), testées comme aujourd'hui, et de ne tester avec le plugin que la partie réseau et l'effacement.
- **Essai local :** `wrangler dev` gère la mise en veille des WebSockets depuis Wrangler 3.13.2 ([WebSockets DO](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)).

## Ce qui reste incertain

- **La juridiction `eu` sur l'offre gratuite :** la documentation n'en parle pas et ne mentionne aucune restriction. La base D1 du jeu a bien été créée en juridiction `eu` sur l'offre gratuite, mais c'est un autre produit. À vérifier au premier déploiement d'essai. **Vérifié le 26/11/2026** sur l'aperçu de la branche du lot 1 (issue 134) : `env.SEANCE.jurisdiction("eu").getByName(…)` crée bien un objet SQLite, avec le champ `exports` et `wrangler preview`.
- **La juridiction avec `ctx.exports` et dans les aperçus :** `ctx.exports` fournit « a Durable Object namespace binding » ([API Context](https://developers.cloudflare.com/workers/runtime-apis/context/)), qui devrait donc offrir `.jurisdiction("eu")`, mais aucun exemple ne le montre, et la page des aperçus ne parle pas de juridiction.
- **Le champ `exports` avec la version de Wrangler du projet et avec `wrangler preview` :** la documentation dit que les aperçus « follow the same rules », sans exemple. À vérifier avec un `wrangler deploy --dry-run`, sinon revenir au tableau `migrations`.
- **La façon dont `deleteAll()` est décompté :** chaque effacement compte comme une ligne écrite, mais la documentation ne dit pas si `deleteAll()` compte une ligne par ligne effacée. L'estimation ci-dessus le suppose (cas le plus cher).
- **Les pings à réponse automatique :** la documentation dit qu'ils ne facturent pas de durée, mais pas s'ils comptent dans les requêtes ; le calcul les compte.
- **Les téléphones :** combien de fois un téléphone mis en veille ou qui change d'application coupe sa WebSocket dépend du navigateur et du système (aucune source Cloudflare ; non recherché ici). Les 3 reconnexions par Séance sont une hypothèse, à mesurer sur l'aperçu avec de vrais téléphones.
- **Les temps de traitement (50 ms par événement) et le nombre de lignes écrites** sont des estimations, non mesurées. Même multipliés par 10, ils restent dans le gratuit.
- **Le jeton de reconnexion du Participant** est un identifiant d'appareil : c'est une question de vie privée et d'ADR, pas de Cloudflare, à trancher dans la décision #129.

## Sources

Toutes consultées le 25/11/2026.

- Tarifs des Durable Objects : https://developers.cloudflare.com/durable-objects/platform/pricing/
- Limites des Durable Objects : https://developers.cloudflare.com/durable-objects/platform/limits/
- Notes de version des Durable Objects : https://developers.cloudflare.com/durable-objects/release-notes/
- WebSockets et mise en veille (bonnes pratiques) : https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- API State (`acceptWebSocket`, 32 768 connexions, `setWebSocketAutoResponse`) : https://developers.cloudflare.com/durable-objects/api/state/
- Cycle de vie d'un Durable Object : https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/
- Emplacement des données (juridictions) : https://developers.cloudflare.com/durable-objects/reference/data-location/
- API Namespace (`getByName`, `idFromName`) : https://developers.cloudflare.com/durable-objects/api/namespace/
- Alarmes : https://developers.cloudflare.com/durable-objects/api/alarms/
- API de stockage SQLite (`deleteAll`) : https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- Déclaration des classes (`exports`, migrations) : https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/
- Aperçus, ressources et isolation : https://developers.cloudflare.com/workers/previews/resources/
- Aperçus, présentation : https://developers.cloudflare.com/workers/previews/
- API Context (`ctx.exports`) : https://developers.cloudflare.com/workers/runtime-apis/context/
- Tarifs Workers : https://developers.cloudflare.com/workers/platform/pricing/
- Limites Workers (mises à jour du moteur) : https://developers.cloudflare.com/workers/platform/limits/
- WebSockets dans les Workers : https://developers.cloudflare.com/workers/runtime-apis/websockets/
- Tester des Durable Objects : https://developers.cloudflare.com/durable-objects/examples/testing-with-durable-objects/
- Intégration Vitest, problèmes connus : https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/
- Renommage en `@cloudflare/vitest-plugin` : https://developers.cloudflare.com/changelog/post/2026-08-19-vitest-plugin/
- Paquet npm `@cloudflare/vitest-plugin` : https://www.npmjs.com/package/@cloudflare/vitest-plugin
