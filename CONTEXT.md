# Duel Carbone

Application web grand public qui fait comprendre l'empreinte carbone des gestes du quotidien en les comparant entre eux, principalement sous forme de jeu. Toutes les valeurs proviennent du référentiel Impact CO2 de l'ADEME, systématiquement cité.

## Données

**Empreinte carbone** :
Quantité de gaz à effet de serre émise sur l'ensemble du cycle de vie d'un objet ou d'un geste, exprimée en kg CO2e.
_À éviter_ : eCO2, émission, bilan carbone

**Référentiel** :
L'ensemble des Équivalents publiés par l'ADEME sur Impact CO2, seule source de valeurs du produit.
_À éviter_ : base de données, dataset

**Instantané** :
Une copie datée du Référentiel, enrichie des libellés et unités, que l'application lit à la place de l'API. Voir l'ADR 0002.
_À éviter_ : cache, dump, export

**Équivalent** :
Une entrée du Référentiel : un objet ou un geste, son Empreinte carbone pour une unité de référence propre à sa Thématique (par kg, par km et par passager, par unité…), et sa page de détail ADEME.
_À éviter_ : item, produit, facteur

**Geste** :
Ce que le joueur voit et compare : un Équivalent multiplié par une quantité réaliste qui figure dans son libellé (« Manger un steak de bœuf (120 g) »). Un Geste concerne toujours une seule personne : pour un trajet, c'est la part d'un passager (« Paris–Marseille en covoiturage à 4 (ta part) »). Voir l'ADR 0001.
_À éviter_ : action, activité, item

**Nature** :
Ce qu'est un Geste pour le joueur : un aliment, un repas, une boisson, un objet, un trajet, une livraison ou un usage (chauffer son logement, regarder une série…). Elle sert à écarter les Combinaisons interdites.
_À éviter_ : type, famille, catégorie

**Quantité** :
Le multiplicateur appliqué à l'unité de référence d'un Équivalent pour obtenir un Geste (0,12 kg pour un steak ; 1 pour un objet ou un repas).
_À éviter_ : portion, coefficient

**Thématique** :
Le regroupement d'Équivalents défini par l'ADEME (Alimentation, Transport, Numérique…).
_À éviter_ : catégorie, univers

**Répartition** :
La décomposition de l'Empreinte carbone d'un Équivalent entre les étapes de son cycle de vie (fabrication, usage, fin de vie ; ou agriculture, transport, emballage… pour l'alimentation).
_À éviter_ : détail, ventilation

**Durée d'usage** :
Le nombre d'années d'utilisation retenu par l'ADEME pour inclure l'usage dans l'Empreinte carbone d'un objet (par exemple 8 ans pour une télévision).
_À éviter_ : durée de vie

## Jeux

**Duel** :
La confrontation de deux Gestes dont le joueur doit désigner celui qui a la plus grande Empreinte carbone. Leur Rapport est toujours d'au moins ×1,25. Dans une Partie, chaque Duel porte un numéro de 1 à 10 qui fixe sa Difficulté attendue.
_À éviter_ : manche, question, match, round

**Combinaison interdite** :
Deux Natures qui ne s'affrontent jamais dans un Duel tiré au hasard, parce que la comparaison n'aurait pas de sens : un repas face à un aliment (« Repas avec du bœuf » contre « 120 g de bœuf »). Un Duel thématique, écrit à la main, n'est pas concerné.
_À éviter_ : paire interdite, exclusion

**Geste réservé** :
Un Geste qui n'est jamais tiré au hasard et n'apparaît que dans un Duel thématique, avec un texte qui l'explique. C'est obligatoire pour un Geste dont l'Empreinte carbone est nulle ou quasi nulle (l'eau du robinet), car son Rapport avec presque tout le reste serait démesuré.
_À éviter_ : Geste caché, Geste exclu

**Duel thématique** :
Un Duel choisi et rédigé à la main pour son intérêt pédagogique, avec sa propre explication et éventuellement sa propre Difficulté.
_À éviter_ : duel spécial, duel custom

**Partie** :
Une suite de 10 Duels au terme de laquelle le joueur obtient un score final.
_À éviter_ : session, run

**Rapport** :
Le quotient entre la plus grande et la plus petite Empreinte carbone d'un Duel (« ×11 »).
_À éviter_ : écart, différence

**Difficulté** :
Le niveau d'un Duel, déduit de son Rapport : facile, moyen, difficile ou ultime. Une Partie enchaîne 3 Duels faciles, 3 moyens, 3 difficiles et 1 ultime.
_À éviter_ : niveau

**Récapitulatif** :
La liste des 10 Duels d'une Partie terminée, avec pour chacun le choix du joueur (bon ou mauvais) et le Rapport.
_À éviter_ : historique, résumé

**Juste émission** :
Le jeu où le joueur estime l'Empreinte carbone d'un Geste à l'aide d'un curseur et marque des points selon la justesse de son estimation.
_À éviter_ : jeu du curseur, devinette

**Comparateur** :
La page qui exprime l'Empreinte carbone d'un Geste choisi en nombre d'autres Gestes (« Paris–New York = x steaks »).
_À éviter_ : convertisseur, calculateur
