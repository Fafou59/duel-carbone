---
status: accepted
date: 2026-11-11
---

# Héberger le jeu chez Cloudflare (Workers, fichiers statiques), à la place de Netlify

Le 2026-11-11, l'offre gratuite de Netlify a épuisé ses crédits du mois : les mises en production sont en pause jusqu'au 7 décembre (le site reste figé sur une ancienne version), et le même blocage pourrait revenir chaque mois avec le succès du jeu. Duel Carbone est un site 100 % statique : nous l'hébergeons désormais chez **Cloudflare**, avec **Workers et ses fichiers statiques** (« Requests to static assets are free and unlimited »), que Cloudflare recommande pour les nouveaux projets à la place de Pages. Cloudflare construit le jeu à chaque modification du dépôt GitHub : la branche `main` part en production, les autres branches ont un aperçu, à l'adresse `<nom-de-la-branche>-duel-carbone.<sous-domaine du compte>.workers.dev` (son état apparaît dans les vérifications de la PR, « Workers Builds »). La configuration est versionnée dans `wrangler.jsonc`.

## Options écartées

- **Attendre le 7 décembre** : rien à changer, mais le lancement est décalé de trois semaines et le blocage peut revenir.
- **Netlify payant** : immédiat, mais une facture à l'usage pour un projet non commercial.
- **GitHub Pages** (production) + Netlify (aperçus) : gratuit et sans nouveau compte, mais deux hébergeurs à suivre, et les aperçus Netlify restent soumis aux mêmes crédits.
- **Vercel** (offre gratuite) : aperçus de PR, mais réservée aux projets non commerciaux et aux quotas plus serrés.

## Conséquences

- Fabien crée le compte et relie le dépôt (étapes manuelles guidées) ; aucun jeton n'est stocké dans le dépôt.
- Les aperçus de branche sont publics (le code du jeu l'est aussi) ; on pourra les protéger plus tard si besoin.
- Le domaine duelcarbone.fr (#19) demandera de confier son DNS à Cloudflare.
- La page Sources nomme l'hébergeur, qui reçoit les demandes des navigateurs (dont l'adresse IP), comme tout hébergeur.
- Une fois Cloudflare validé, Netlify est débranché (`netlify.toml` supprimé) pour garder un seul hébergeur.
