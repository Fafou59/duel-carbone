/**
 * Les icônes qui défilent dans la vitrine de l'accueil et dans la frise du bas de page.
 * Uniquement des icônes Fluent Emoji d'origine (pas les dessins maison à badge, moins lisibles en petit),
 * dans un ordre mélangé une fois pour toutes (un Geste sur 7 en tournant : aliments, objets et trajets alternent).
 * Liste tirée de scripts/icones/officielles.ts (choix du prototype d'accueil, ticket #52).
 */
const ICONES_DE_LA_VITRINE = [
  'steak-boeuf', 'pates', 'avocat', 'vin', 'enceinte-connectee', 'chaussures-sport', 'paris-marseille-tgv',
  'colis-magasin-voiture', 'bus-electrique-10km', 'porc', 'croissant', 'fraises', 'smartphone', 'telecharger-film',
  'manteau', 'paris-marseille-avion', 'chauffage-fioul', 'ter-100km', 'crevettes', 'kebab', 'the', 'ecran',
  'tshirt-coton', 'scooter-10km', 'colis-magasin-velo', 'nuit-hotel', 'autocar-100km', 'lentilles', 'sushis', 'biere',
  'box', 'chemise-coton', 'voiture-10km', 'livraison-point-relais', 'streaming-film', 'poulet', 'fromage', 'banane',
  'eau-robinet', 'emails', 'jean', 'paris-marseille-voiture', 'chauffage-gaz', 'tramway-10km', 'canard',
  'cheeseburger', 'cafe', 'ordinateur-portable', 'chaise', 'metro-10km', 'paris-new-york', 'friends', 'tgv-100km',
  'oeufs', 'pizza', 'lait', 'television', 'tshirt-polyester', 'bus-10km', 'livraison-domicile', 'journee-ski',
]

const moitie = Math.ceil(ICONES_DE_LA_VITRINE.length / 2)
export const COLONNE_GAUCHE = ICONES_DE_LA_VITRINE.slice(0, moitie)
export const COLONNE_DROITE = ICONES_DE_LA_VITRINE.slice(moitie)
