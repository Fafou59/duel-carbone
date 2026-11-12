# Le lancement : la check-list

Le lancement public a lieu le **samedi 14 novembre 2026** : c'est le Duel Carbone du jour n° 1 (#19). Le site est
déjà en ligne sur https://duelcarbone.fr ; « lancer », c'est tester une dernière fois, puis partager le lien.

## 1. Une fois, avant le lancement 🧑

- [ ] Double authentification activée sur **OVHcloud**, **Cloudflare** et **GitHub** (qui prend la main sur l'un
      des trois prend le site).
- [ ] **Renouvellement automatique** du domaine duelcarbone.fr activé chez OVHcloud (un domaine qui expire, c'est
      un site qui s'éteint).
- [x] Adresse **contact@duelcarbone.fr** redirigée vers la boîte de l'éditeur (Cloudflare, Routage des e-mails).
- [x] DNSSEC actif (enregistrement DS publié chez OVHcloud).

## 2. Samedi matin : les tests sur téléphone 🧑

Environ 20 minutes par téléphone, sur **https://duelcarbone.fr**, dans le navigateur habituel du téléphone (Chrome
sur Android, Safari sur iPhone). Noter pour chaque point ✅ ou ❌ avec une phrase ; une capture d'écran aide
beaucoup.

| # | À faire | Ce qu'on doit voir | Android | iPhone |
|---|---|---|---|---|
| 1 | Ouvrir le site | L'accueil s'affiche vite, « Jouer le Duel du jour n° 1 » | | |
| 2 | « Comment ça marche ? » | Le diaporama en 5 étapes, qu'on peut fermer | | |
| 3 | Jouer le Duel du jour, jusqu'au Duel 4 | Les cartes se touchent bien ; la réponse, le Rapport et l'explication s'affichent ; « Duel suivant » toujours visible | | |
| 4 | Fermer l'onglet en plein Duel 4, rouvrir le site | « Reprendre le Duel du jour n° 1 », qui repart au Duel 4 | | |
| 5 | Finir la Partie | Le score, la série « 1 jour », le compte à rebours jusqu'à minuit | | |
| 6 | Toucher une case du Récapitulatif | Le détail du Duel s'ouvre, puis se ferme | | |
| 7 | « Défier mes proches » | Le menu de partage du téléphone s'ouvre, avec le texte et la grille de cases | | |
| 8 | Envoyer ce texte à soi-même sur WhatsApp | L'aperçu du lien : image, titre et description de Duel Carbone | | |
| 9 | Revenir à l'accueil | Le tableau de bord : score du jour, grille, série | | |
| 10 | Jouer une Partie libre, puis « Rejouer » | Une nouvelle Partie démarre | | |
| 11 | Passer le téléphone en mode sombre | Le jeu passe en sombre, tout reste lisible | | |
| 12 | Ouvrir « En savoir plus » | La page, les liens vers l'ADEME, « Retour au jeu » collé en bas, les mentions légales en fin de page | | |
| 13 | Installer le jeu sur l'écran d'accueil (Android : menu ⋮, « Installer l'application » ; iPhone : Partager, « Sur l'écran d'accueil ») | L'icône Duel Carbone, et le jeu s'ouvre en plein écran | | |
| 14 | Passer en mode avion, ouvrir le jeu installé | Le jeu s'ouvre et une Partie libre se joue hors ligne | | |
| 15 | L'invitation à installer (#68), sur un navigateur où le jeu n'est pas encore installé, à la fin du Duel du jour | Android : le bouton lance l'installation ; iPhone : l'explication « Partager, puis Sur l'écran d'accueil » ; jamais une deuxième fois après un refus | | |

En cas de ❌ : le noter ici ou l'envoyer à contact@duelcarbone.fr, avec le modèle du téléphone. Si un point bloque
une Partie, on décale le partage du lien, pas le n° 1.

## 3. Samedi, après les tests : la dernière PR

- [ ] Corriger les ❌ des tests.
- [ ] Recompter l'empreinte IA (`npm run empreinte-ia`), reporter les jetons et la date dans
      `src/donnees/empreinte-ia.ts`, puis `npm run calendrier` (voir [empreinte-ia.md](empreinte-ia.md)).
- [ ] Vérifier la production après le merge : la page « En savoir plus » affiche le nouveau décompte.

## 4. Samedi après-midi : partager 🧑

- [ ] Envoyer le lien à ses proches (Friends & Family), avec l'aperçu de lien.
- [ ] Écrire à l'ADEME et à l'équipe d'Impact CO2 pour leur montrer le jeu.
- [ ] Recueillir les retours (contact@duelcarbone.fr, messages) ; décider plus tard d'une publication plus large.

## 5. Après le lancement

- [ ] **J+7, samedi 21/11** : exporter les chiffres de GoatCounter ; calcul des quatre indicateurs du PRD
      (complétion, Rejouer, partages, durée) et des plantages (`erreur/…`).
- [ ] **J+30, lundi 14/12** : même point, puis décider des notifications (#69).
- [ ] Google Search Console : déclarer le site (enregistrement TXT dans le DNS Cloudflare).
