---
status: accepted
date: 2026-11-08
---

# Un Geste est un Équivalent ADEME multiplié par une quantité

Le Référentiel Impact CO2 exprime chaque Équivalent dans une unité propre à sa Thématique : par kg pour l'alimentation, par km et par passager pour le transport, par unité pour les objets. Le CSV public n'indique pas cette unité. Comparer ces valeurs brutes produirait des duels absurdes, comme « 1 kg de bœuf contre 1 km en TGV ». Nous montrons donc au joueur des **Gestes** : un Équivalent multiplié par une quantité réaliste que nous fixons (« un steak de bœuf de 120 g » = 28 kg CO2e/kg × 0,12). La valeur par unité reste toujours celle de l'ADEME ; notre seul apport éditorial est la quantité. Les Équivalents qui sont déjà des gestes (un repas, un A/R Paris–New York, un smartphone) prennent une quantité de 1.

## Options écartées

- **Montrer les Équivalents tels quels** (« 1 kg de bœuf contre 1 kg d'avocat ») : aucun travail éditorial, mais des comparaisons peu parlantes, et impossibles d'une Thématique à l'autre.
- **Construire nos propres valeurs** à partir d'autres sources : plus de liberté, mais nous perdrions l'unicité de la source et la crédibilité qu'apporte l'ADEME.

## Conséquences

- Chaque Geste doit afficher sa quantité et renvoyer à son Équivalent (valeur par unité, lien vers la fiche ADEME). Les conditions de réutilisation de l'ADEME exigent de ne pas altérer le sens des informations ; la multiplication doit donc rester visible et vérifiable.
- L'unité de référence de chaque Thématique doit être consignée chez nous, puisque ni le CSV ni l'API ne la fournissent.
