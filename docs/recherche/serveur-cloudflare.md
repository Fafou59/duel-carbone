# Ce que Cloudflare Workers et D1 permettent pour un serveur

Recherche du ticket #85, pour la décision #86 « Le jeu prend-il un serveur, et pour quoi faire ? ». Ce document rapporte des faits sourcés, il ne tranche rien. Sources consultées en novembre 2026 : les chiffres de Cloudflare et des services d'e-mail changent, à revérifier au moment de construire.

## La question

Que permettent Cloudflare Workers et D1 (le site tourne déjà chez Cloudflare) pour donner un serveur à Duel Carbone, et à quel coût ? Pour : un rang « mieux que x % » du Duel du jour, des abonnements Web Push avec envoi quotidien, un e-mail quotidien, une identité légère (pseudo, appareil) sans compte ni mot de passe, et ce que le RGPD impose pour chacun.

## L'essentiel

- **Le même Worker peut porter le serveur.** Aujourd'hui `wrangler.jsonc` ne déclare que des fichiers statiques. Si on ajoute un script, une requête qui correspond à un fichier reste servie sans l'invoquer ; une requête sans fichier correspondant (ex. `/api/score`) appelle son `fetch()` ([routage Worker + assets](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)). Les fichiers statiques restent « free and unlimited » ; seules les invocations du script sont décomptées ([facturation des assets](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)).
- **À 50-500 joueurs par jour, le plan gratuit couvre le classement**, avec une marge de deux ordres de grandeur (D1 : 100 000 lignes écrites et 5 M lues par jour).
- **Web Push est faisable sur le plan gratuit**, mais deux limites par invocation (50 sous-requêtes, 10 ms de CPU) obligent à découper l'envoi (Queues) et à mesurer le coût CPU du chiffrement.
- **Sur iOS, Web Push ne marche que si le jeu est ajouté à l'écran d'accueil** (iOS 16.4+). Le manifeste actuel (`display: 'standalone'`, `id: '/'`) remplit déjà la condition.
- **L'e-mail par Cloudflare exige le plan payant** (5 $/mois minimum). Brevo (300 e-mails/jour, données dans l'UE) et Resend (100/jour) ont une offre gratuite.
- **Un pseudo, un identifiant d'appareil, une adresse e-mail et un abonnement push sont tous des données personnelles** au sens de la CNIL : le jeu deviendrait responsable de traitement, avec information, durées de conservation et droits à gérer.

## 1. Ce que le plan gratuit donne

Limites de Workers Free, par jour sauf mention contraire ([tarifs Workers](https://developers.cloudflare.com/workers/platform/pricing/), [limites Workers](https://developers.cloudflare.com/workers/platform/limits/)) :

| Brique | Workers Free | Workers Paid (5 $/mois minimum) |
| --- | --- | --- |
| Invocations du Worker | 100 000 / jour | 10 M / mois inclus, puis 0,30 $ / M |
| CPU par invocation (HTTP ou Cron) | 10 ms | 30 s par défaut, 5 min max (15 min pour un Cron horaire ou plus espacé) |
| Sous-requêtes (`fetch` sortants) par invocation | 50 | 10 000 |
| Cron Triggers par compte | 5 | 1 000 |
| D1 lignes lues | 5 M / jour | 25 Md / mois inclus |
| D1 lignes écrites | 100 000 / jour | 50 M / mois inclus, puis 1 $ / M |
| D1 stockage | 5 Go au total, 500 Mo par base, 10 bases | 5 Go inclus, 10 Go par base |
| KV lectures / écritures | 100 000 / 1 000 par jour | 10 M / 1 M par mois inclus |
| Durable Objects (SQLite) | 100 000 requêtes / jour, 5 Go | 1 M requêtes / mois inclus |
| Queues | 10 000 opérations / jour, rétention 24 h | 1 M / mois inclus, rétention jusqu'à 14 jours |

- Le Workers Paid coûte « a minimum charge of $5 USD per month for an account » ([tarifs Workers](https://developers.cloudflare.com/workers/platform/pricing/)).
- Les compteurs quotidiens de D1 repartent à zéro à 00:00 UTC. Au-delà, les requêtes D1 échouent avec une erreur de limite journalière, jusqu'au lendemain ou au passage au plan payant ([tarifs D1](https://developers.cloudflare.com/d1/platform/pricing/)).
- Au-delà de 100 000 invocations par jour, les routes qui passent par le Worker reçoivent une erreur 429. Les fichiers statiques continuent d'être servis ([facturation des assets](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)).
- Un message Queues coûte en général 3 opérations : écriture, lecture, suppression ([tarifs Workers](https://developers.cloudflare.com/workers/platform/pricing/)).

## 2. Stocker les scores et calculer « mieux que x % » (D1)

- **D1 est une base SQLite** accessible depuis le Worker par un binding. Elle est facturée au nombre de lignes lues et écrites ([tarifs D1](https://developers.cloudflare.com/d1/platform/pricing/)).
- **Les index comptent double à l'écriture et allègent la lecture.** « Indexes will add an additional written row when writes include the indexed column » ([tarifs Workers](https://developers.cloudflare.com/workers/platform/pricing/)), mais « Using an index can reduce the number of rows read by a query » ([index D1](https://developers.cloudflare.com/d1/best-practices/use-indexes/)).
- **Ordre de grandeur à notre échelle** (calcul, pas une source) : 500 scores par jour avec un index, soit environ 1 000 lignes écrites, 1 % du quota gratuit. Un `COUNT(*)` des scores inférieurs, par joueur et sur un jour de 500 scores, lit au plus 500 lignes, soit 250 000 lignes lues par jour, 5 % du quota. Un tableau d'effectifs par score, le jeu ayant peu de scores possibles, ramènerait la lecture à quelques lignes.
- **KV ne convient pas pour un compteur partagé.** Il est à cohérence éventuelle : « Changes may take up to 60 seconds or more to be visible in other global network locations ». Il ne fait pas d'opérations atomiques : « KV is not ideal for applications where you need support for atomic operations ». La page renvoie vers Durable Objects pour les compteurs ([fonctionnement de KV](https://developers.cloudflare.com/kv/concepts/how-kv-works/)). Sur le plan gratuit, KV n'accepte de plus que 1 000 écritures par jour.
- **Limites par invocation :** 50 requêtes D1 par invocation sur le plan gratuit (1 000 en payant). Un `db.batch()` compte pour une ([limites D1](https://developers.cloudflare.com/d1/platform/limits/)).
- **Triche :** rien n'empêche un client d'envoyer un faux score à une API publique. Cloudflare Turnstile est gratuit, avec 20 widgets et des vérifications illimitées ([offres Turnstile](https://developers.cloudflare.com/turnstile/plans/)). Le serveur peut aussi recalculer le score à partir des réponses, puisque le Duel du jour est connu d'avance (constat sur le jeu, pas une source).

## 3. Latence, emplacement des données, sauvegarde

- **Emplacement :** une base D1 tourne à un seul endroit. Le *location hint* (`weur`, `eeur`…) n'est qu'une préférence : « Providing a location hint does not guarantee that D1 runs in your preferred location ». La juridiction `eu`, elle, garantit que la base s'exécute et stocke ses données dans l'UE. Elle ne se choisit qu'à la création : « Jurisdictions can only be set on database creation and cannot be added or updated after the database exists » ([emplacement des données D1](https://developers.cloudflare.com/d1/configuration/data-location/), [changelog](https://developers.cloudflare.com/changelog/post/2025-11-05-d1-jurisdiction/)).
- **Latence :** Cloudflare ne publie pas de chiffre de latence pour D1. Les écritures passent toujours par l'instance primaire. La réplication en lecture rapproche les lectures des joueurs, sans surcoût, mais exige la Sessions API ([réplication en lecture](https://developers.cloudflare.com/d1/best-practices/read-replication/)). Avec une juridiction, les répliques restent dans cette juridiction ([emplacement des données D1](https://developers.cloudflare.com/d1/configuration/data-location/)). Pour des joueurs surtout en France et une base en UE, la question de la latence se pose peu (déduction).
- **Sauvegarde : Time Travel**, toujours actif et sans surcoût, permet de restaurer à la minute près sur 7 jours en gratuit et 30 jours en payant. La restauration écrase la base en place. Pour garder plus longtemps, Cloudflare décrit un export automatisé vers R2 ([Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), [limites D1](https://developers.cloudflare.com/d1/platform/limits/)).

## 4. Identité légère sans compte ni mot de passe

- **Ce que Cloudflare fournit :** aucune brique d'identité légère. Il faut un identifiant aléatoire généré côté client (ou par le Worker), gardé dans le stockage du navigateur, et éventuellement un pseudo choisi (constat : rien dans les docs Workers/D1 consultées).
- **Statut juridique :** la CNIL range parmi les données personnelles le « pseudonyme » et les identifiants en ligne : « adresse IP, identifiant de connexion informatique ou identifiant de cookie ». Les données pseudonymisées « restent donc soumises aux obligations du RGPD » ([CNIL, identifier les données personnelles](https://www.cnil.fr/fr/identifier-les-donnees-personnelles)).
- **Stockage sur l'appareil (article 82) :** écrire ou lire un identifiant sur le terminal demande un consentement préalable, sauf pour les traceurs « strictement nécessaires à la fourniture d'un service de communication en ligne expressément demandé par l'utilisateur ». L'authentification et la personnalisation attendue de l'interface figurent parmi les exemples de cette exception ([CNIL, que dit la loi](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/que-dit-la-loi)). Un identifiant créé quand le joueur demande à rejoindre un classement ou un Groupe relève a priori de l'exception. Le même identifiant réutilisé pour mesurer l'audience n'en relèverait plus (lecture de la page, pas un avis juridique).
- **Adresse IP :** le Worker voit l'IP de chaque requête, mais il ne la stocke que si le code le fait (constat). L'IP est une donnée personnelle (même source CNIL).

## 5. Web Push quotidien

### Côté serveur (Workers)

- **Planifier :** un Cron Trigger se déclare dans `wrangler.jsonc` (`"triggers": { "crons": ["0 6 * * *"] }`) et appelle le handler `scheduled()`. « Cron Triggers execute on UTC time. » 8 h à Paris tombe donc à 7 h UTC en hiver et 6 h UTC en été. Une modification met jusqu'à 15 minutes à se propager, et des déclenchements peuvent être manqués entre-temps ([Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)).
- **Le protocole :** le serveur doit envoyer un en-tête TTL. Un abonnement expiré renvoie 404, ce qui permet au serveur de le supprimer ([RFC 8030 §5.2, §7.3](https://www.rfc-editor.org/rfc/rfc8030.html)). Le contenu doit être chiffré de bout en bout, car « The protection afforded by TLS does not protect content from the push service » ([RFC 8030 §8](https://www.rfc-editor.org/rfc/rfc8030.html)). Le chiffrement suit [RFC 8291](https://www.rfc-editor.org/rfc/rfc8291.html), l'identification du serveur VAPID [RFC 8292](https://www.rfc-editor.org/rfc/rfc8292.html).
- **Bibliothèques :** le paquet Node `web-push` ne vise pas les Workers. Son issue « support Cloudflare Workers » est ouverte depuis juin 2022 (`crypto.createECDH is not a function`) ([web-push #718](https://github.com/web-push-libs/web-push/issues/718)). Depuis, Cloudflare annonce que « All node:crypto APIs are fully supported in Workers », à quelques exceptions près (x448, ed448, argon2…) ([node:crypto sur Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/)). Des alternatives en Web Crypto pur existent, comme `@pushforge/builder` : MIT, sans dépendance, Workers cités, clés VAPID générées par `npx @pushforge/builder vapid` ([dépôt PushForge](https://github.com/draphy/pushforge)). Aucune n'a été testée ici. L'issue #718 mentionne un échec signalé vers un iPhone en février 2026.
- **Limites à 500 abonnés (plan gratuit) :** un envoi push est une sous-requête, et une invocation n'en permet que 50. 500 envois dans un seul Cron ne passent donc pas. En les répartissant dans une Queue (par lots de 50 au plus), cela fait environ 1 500 opérations par jour, sur 10 000 gratuites. Le chiffrement de chaque message (ECDH, HKDF, AES-GCM, signature VAPID) consomme du CPU, plafonné à 10 ms par invocation : à mesurer, aucune source ne donne ce coût ([limites Workers](https://developers.cloudflare.com/workers/platform/limits/), [tarifs Workers](https://developers.cloudflare.com/workers/platform/pricing/)). Le plan payant lève ces deux limites (10 000 sous-requêtes, 30 s de CPU).
- **Stockage :** un abonnement (endpoint, clés `p256dh` et `auth`) fait une ligne D1, à supprimer sur 404 (déduction de la RFC 8030).

### Côté navigateur

- **iOS et iPadOS :** Web Push n'existe que pour les web apps ajoutées à l'écran d'accueil, depuis la version 16.4. Le manifeste doit déclarer `display` à `standalone` ou `fullscreen`. La permission se demande après une interaction directe (un bouton « s'abonner »). Aucun compte Apple Developer n'est nécessaire. Côté serveur, il faut autoriser `*.push.apple.com` ([WebKit, Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)). Le manifeste du jeu déclare déjà `display: 'standalone'` et `id: '/'` (`vite.config.ts`).
- **Service worker :** le jeu utilise `vite-plugin-pwa` en mode `generateSW`. L'option Workbox `importScripts` ajoute des fichiers au service worker généré, par exemple « a push event listener » ([Workbox, GenerateSWOptions.importScripts](https://developer.chrome.com/docs/workbox/reference/workbox-build#property-GenerateSWOptions-importScripts)). L'autre voie est `injectManifest`, qui sert à écrire son propre service worker ([vite-plugin-pwa, injectManifest](https://vite-pwa-org.netlify.app/guide/inject-manifest.html)).

## 6. E-mail quotidien

| Service | Offre gratuite | Envoi depuis un Worker | Données |
| --- | --- | --- | --- |
| Cloudflare Email Service | Aucun envoi sortant sur Workers Free. Workers Paid : 3 000 e-mails/mois inclus, puis 0,35 $ / 1 000. Envois gratuits vers les adresses vérifiées seulement ([tarifs Email Service](https://developers.cloudflare.com/email-service/platform/pricing/)) | Binding `send_email`, puis `env.EMAIL.send({ to, from, subject, text })`. Le domaine d'envoi doit être intégré à Email Service ([API Workers](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)). Statut : « Email Sending Beta » ([Email Service](https://developers.cloudflare.com/email-service/), [changelog public beta avril 2026](https://developers.cloudflare.com/changelog/post/2026-04-16-email-sending-public-beta/)) | Chez Cloudflare (DPA ci-dessous) |
| Brevo (France) | 300 e-mails/jour, sans report ; 100 000 contacts ; au-delà, jusqu'à 1 000 e-mails transactionnels mis en file ([aide Brevo, limites du plan gratuit](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), page lue via un moteur de recherche, accès direct refusé) | API HTTP (`POST /v3/smtp/email`), donc un `fetch` depuis le Worker | Serveurs dans l'UE (OVH France/Allemagne, Google Cloud Belgique) ([aide Brevo, lieux de stockage](https://help.brevo.com/hc/en-us/articles/360001005510-Data-storage-location)) |
| Resend | 3 000 e-mails/mois, 100/jour, 3 domaines, rétention 30 jours ([tarifs Resend](https://resend.com/pricing)) | API HTTP, donc un `fetch` depuis le Worker | Envoi possible depuis l'Irlande (`eu-west-1`), mais « All account data, including email metadata, logs, and API records, is stored in the United States » ([régions Resend](https://resend.com/docs/dashboard/domains/regions)) |

- **À 500 abonnés quotidiens** (calcul) : 500 e-mails par jour, soit environ 15 000 par mois. Cela dépasse le gratuit de Brevo (300/jour) et de Resend (100/jour). Chez Cloudflare, c'est 5 $ d'abonnement plus environ 12 000 × 0,35 $/1 000 ≈ 4,20 $, soit environ 9 $/mois. À 50 abonnés, Brevo et Resend restent gratuits.
- **Domaine :** il faut un domaine d'envoi authentifié. Le jeu prévoit `duelcarbone.fr` avec un DNS confié à Cloudflare ([ADR 0003](../adr/0003-hebergement-cloudflare.md), #19).

## 7. Ce que le RGPD impose

Le jeu deviendrait responsable de traitement pour chaque donnée stockée. Obligations générales du [RGPD](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679) :

- une base légale par finalité (art. 6) ;
- la minimisation et une durée de conservation limitée (art. 5.1.c et e) ;
- l'information au moment de la collecte (art. 13) ;
- les droits d'accès, d'effacement et d'opposition (art. 15, 17, 21) ;
- un contrat avec chaque sous-traitant (art. 28) ;
- un registre des traitements (art. 30).

Points propres à chaque brique :

- **Pseudo et identifiant d'appareil :** données personnelles, même pseudonymes ([CNIL](https://www.cnil.fr/fr/identifier-les-donnees-personnelles)). Leur dépôt sur l'appareil relève de l'article 82, avec l'exception du service expressément demandé ([CNIL, que dit la loi](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/que-dit-la-loi)).
- **Adresse e-mail :** l'envoi de prospection à des particuliers repose « en principe, sur le recueil préalable du consentement », avec un moyen de désinscription « dans chaque message ». Une lettre d'information peut être « qualifiée de prospection commerciale » selon son objectif. Les messages relationnels, qui accompagnent l'usage du service, reposent en général sur le contrat ou l'intérêt légitime, à condition de ne pas « dissimuler un contenu promotionnel » ([CNIL, communications électroniques](https://www.cnil.fr/fr/communication-electronique-quelles-regles)). La CNIL elle-même ne garde, pour sa lettre, que l'adresse et la date d'abonnement, jusqu'à la désinscription ([CNIL, données de la newsletter](https://www.cnil.fr/fr/donnees-personnelles/abonnements-newsletter-cnil)).
- **Abonnement push :** l'endpoint est un identifiant en ligne lié à un navigateur (déduction de la définition CNIL). Le navigateur impose sa propre permission, mais un réglage de navigateur ne suffit pas, à lui seul, à exprimer un consentement valide ([CNIL, FAQ cookies](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ)). Dans sa recommandation sur les applications mobiles, la CNIL conseille de limiter les données affichées dans les notifications et d'en chiffrer le contenu, pour que le fournisseur de l'OS n'y accède pas ([recommandation applications mobiles, 2024](https://www.cnil.fr/sites/cnil/files/2024-09/recommandation-applications-mobiles.pdf)). Le chiffrement est déjà obligatoire en Web Push (RFC 8030 §8).
- **Mineurs :** si une base légale est le consentement, la France fixe à 15 ans l'âge où un mineur consent seul pour un service en ligne. En dessous, il faut aussi l'accord d'un titulaire de l'autorité parentale (loi Informatique et Libertés, art. 45) ([CNIL, recommandation 4](https://www.cnil.fr/fr/recommandation-4-rechercher-le-consentement-dun-parent-pour-les-mineurs-de-moins-de-15-ans)).
- **Cloudflare comme sous-traitant :** le DPA de Cloudflare dit « Cloudflare is a Processor ». Il couvre les transferts hors UE par les clauses contractuelles types et le EU-U.S. Data Privacy Framework. Il fait partie du contrat principal, y compris le Self-Serve Subscription Agreement. La page ne dit pas explicitement s'il couvre le plan gratuit ([DPA Cloudflare](https://www.cloudflare.com/cloudflare-customer-dpa/)). La juridiction `eu` de D1 garde la base dans l'UE ([emplacement des données D1](https://developers.cloudflare.com/d1/configuration/data-location/)).

## 8. Tableau récapitulatif

| Besoin | Brique Cloudflare | Coût à notre échelle (~50-500 joueurs/jour) | Obligations RGPD |
| --- | --- | --- | --- |
| API du jeu (`/api/...`) à côté des fichiers statiques | Script dans le Worker existant (`main` dans `wrangler.jsonc`) | Gratuit : quelques milliers d'invocations par jour, sur 100 000 | Le Worker voit les IP : ne pas les stocker, ou le déclarer |
| Rang « mieux que x % » du Duel du jour | D1 (juridiction `eu`, table des scores par jour avec index, ou tableau d'effectifs par score) | Gratuit : environ 1 000 lignes écrites (1 %) et au plus 250 000 lues par jour (5 %) | Un score sans identifiant ni pseudo ne vise personne. Lié à un identifiant d'appareil, il devient une donnée personnelle : durée de conservation et information |
| Identité légère (identifiant d'appareil, pseudo) | Aucune brique dédiée : identifiant aléatoire côté client et ligne D1 | Gratuit | Données personnelles (CNIL). Dépôt sur l'appareil exempté de consentement s'il sert au service demandé (art. 82). Information, droit d'effacement, durée de conservation. Règle des 15 ans si la base légale est le consentement |
| Groupes d'amis/collègues avec pseudo | D1 (tables groupe et membre). Durable Objects seulement si du temps réel est voulu | Gratuit | Idem pseudo. Les membres d'un Groupe voient les pseudos des autres : à dire à la collecte |
| Push quotidien | Cron Trigger (UTC) ; abonnements en D1 ; envoi par lots via Queues ; bibliothèque Web Crypto ; clés VAPID en secret du Worker | Gratuit probable : environ 1 500 opérations Queues par jour sur 10 000, mais 50 sous-requêtes et 10 ms CPU par invocation (CPU à mesurer). Sinon Workers Paid, 5 $/mois | Endpoint = identifiant en ligne. Permission du navigateur, plus information et désabonnement dans le jeu. Effacer l'abonnement sur 404 ou désinscription. Contenu chiffré (déjà imposé) et minimal |
| Push sur iPhone | Même chose, plus `*.push.apple.com` | Gratuit | Idem. Le joueur doit d'abord installer le jeu sur l'écran d'accueil (iOS 16.4+) |
| E-mail quotidien | Cloudflare Email Service (Paid, bêta) ou API Brevo/Resend appelée par `fetch` depuis le Cron | 50 abonnés : gratuit chez Brevo (300/jour) ou Resend (100/jour). 500 abonnés : environ 9 $/mois chez Cloudflare, ou une offre payante Brevo/Resend | Consentement préalable si le message est qualifié de prospection. Lien de désinscription dans chaque message. Ne garder que l'adresse et la date. Contrat de sous-traitance. Brevo héberge dans l'UE, Resend stocke les métadonnées aux États-Unis |
| Sauvegarde | D1 Time Travel (7 jours en gratuit, 30 en payant), export vers R2 au-delà | Gratuit | Les sauvegardes suivent la durée de conservation : un effacement reste restaurable jusqu'à 7 ou 30 jours |
| Anti-triche | Turnstile, plus vérification du score côté serveur | Gratuit (20 widgets, vérifications illimitées) | Turnstile est un service Cloudflare de plus, à mentionner dans l'information |

## Ce qui n'a pas été vérifié

- Le coût CPU réel d'un envoi Web Push chiffré sur Workers Free (10 ms par invocation) : à mesurer sur un prototype.
- Le bon fonctionnement de `@pushforge/builder` (ou de `web-push` avec `nodejs_compat`) vers les serveurs push d'Apple : l'issue #718 rapporte un échec iPhone en 2026.
- La page tarifs de Brevo n'a pas pu être lue directement (403) : chiffres repris de son centre d'aide via un moteur de recherche.
- Si le DPA de Cloudflare s'applique au plan gratuit sans signature : la page ne le dit pas.
- Si la juridiction `eu` de D1 couvre aussi Time Travel et les journaux : non documenté dans les pages lues.
