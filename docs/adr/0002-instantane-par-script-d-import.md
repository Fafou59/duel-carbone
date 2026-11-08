---
status: accepted
date: 2026-11-08
---

# L'application lit un Instantané produit par un script d'import, jamais l'API en direct

L'API Impact CO2 n'offre aucune garantie de disponibilité (l'ADEME peut l'interrompre sans préavis) et le jeu doit fonctionner hors ligne. Un script d'import, lancé à la main, interroge donc l'API, enrichit les données de ce qu'elle ne fournit pas (libellés de la Répartition, unités de référence) et écrit un Instantané daté dans le dépôt. L'application ne lit que ce fichier.

## Options écartées

- **Appeler l'API depuis le navigateur à chaque visite** : les données seraient toujours à jour, mais le jeu dépendrait d'un service sans garantie, ne fonctionnerait pas hors ligne et ses valeurs pourraient changer en cours de Partie.
- **Télécharger le CSV à la main** : plus simple, mais le CSV ne contient ni la Répartition ni la Durée d'usage.

## Conséquences

- Les valeurs ne changent que lorsqu'on relance le script ; chaque mise à jour devient un commit lisible.
- La page « Sources et méthode » affiche la date de l'Instantané, comme l'exigent les conditions de réutilisation de l'ADEME.
- Les paramètres de l'API restent toujours à leurs valeurs par défaut (forçage radiatif inclus, taux de remplissage ADEME).
