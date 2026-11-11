# Duel Carbone

[![CI](https://github.com/Fafou59/duel-carbone/actions/workflows/ci.yml/badge.svg)](https://github.com/Fafou59/duel-carbone/actions/workflows/ci.yml)

**Un jeu web gratuit pour comprendre l'empreinte carbone de nos gestes du quotidien, en les opposant en duel.**

Steak ou avocat ? Livraison à domicile ou voiture jusqu'au magasin ? À chaque Duel, tu choisis le geste qui émet le plus de CO2e. La réponse révèle les chiffres, le Rapport entre les deux gestes et d'où viennent les émissions sur le cycle de vie. Une Partie compte 10 Duels de difficulté croissante, avec un score à partager à la fin.

> 🚧 **En cours de construction.** Le cadrage, le cahier des charges et le prototype des écrans sont terminés ; le développement de la v1 commence.
>
> 🌐 Suivre l'avancement en ligne : **https://duel-carbone.netlify.app**

## Pourquoi ce projet

On estime très mal l'empreinte carbone de nos gestes : on surestime ce qui se voit (un emballage) et on sous-estime ce qui ne se voit pas (la viande, la fabrication d'un smartphone, l'avion). Duel Carbone fait apprendre en se trompant, à partir de données publiques et vérifiables.

C'est aussi un projet d'apprentissage : il est conçu de bout en bout avec une IA, en suivant une démarche de *Product Builder* (cadrage, décisions documentées, prototype, développement par tickets, mise en ligne, mesure d'audience).

## Les données

Toutes les valeurs proviennent du référentiel **[Impact CO2](https://impactco2.fr) de l'ADEME** (Agence de la transition écologique), sans modification de leurs paramètres. Un Geste du jeu correspond à un Équivalent ADEME multiplié par une quantité réaliste (par exemple, 120 g de bœuf) : voir l'[ADR 0001](docs/adr/0001-geste-equivalent-fois-quantite.md).

Les données restent la propriété de l'ADEME et sont réutilisées dans le cadre non commercial et pédagogique prévu par ses [mentions légales](https://impactco2.fr/mentions-legales).

## Documentation du projet

| Document | Rôle |
|---|---|
| [CONTEXT.md](CONTEXT.md) | Le glossaire : le vocabulaire commun du projet (Geste, Duel, Rapport, Répartition…) |
| [docs/prd-v1-duel.md](docs/prd-v1-duel.md) | Le cahier des charges de la v1 : problème, récits utilisateurs, règles du jeu, écrans, tests, indicateurs |
| [docs/adr/](docs/adr) | Les décisions structurantes et leurs raisons (*Architecture Decision Records*) |
| [docs/prototypes/](docs/prototypes) | Les enseignements des prototypes. Le code du prototype des écrans est archivé dans la branche [`prototype/duel-ui`](https://github.com/Fafou59/duel-carbone/tree/prototype/duel-ui). |

## Pile technique prévue

React · TypeScript · Vite · application web installable (PWA) · hébergement Cloudflare · mesure d'audience sans cookie (GoatCounter).

## Lancer le projet en local

Prérequis : [Node.js](https://nodejs.org) 26 (voir `.nvmrc`).

```bash
npm install      # installe les dépendances
npm run dev      # lance le site en local, avec rechargement automatique
npm test         # lance les tests
npm run build    # construit la version de production dans dist/
npm run import   # met à jour l'Instantané des données ADEME (src/donnees/instantane.json)
npm run icones   # refait les icônes des Gestes (public/icones/), après l'ajout d'un Geste
```

La clé d'API Impact CO2 est facultative : pour l'utiliser, copier `.env.example` en `.env` et la renseigner.

## Licence

Le code est publié sous licence [MIT](LICENSE). Les données carbone appartiennent à l'ADEME et restent soumises à ses conditions de réutilisation.

Les icônes des Gestes viennent de [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (Microsoft, licence MIT), complétées par des dessins maison dans le même style : voir [public/icones/LICENCE.txt](public/icones/LICENCE.txt). Elles sont fabriquées par `npm run icones` (`scripts/icones/`).
