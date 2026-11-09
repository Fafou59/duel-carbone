/**
 * Icônes PROVISOIRES des Gestes : des emojis système, en attendant le jeu d'icônes du ticket #14.
 * Limite connue (voir docs/prototypes/verdict-duel-ui.md) : leur rendu varie selon l'appareil,
 * et certains objets n'ont pas d'emoji (le micro-ondes, représenté ici par ♨️).
 */
export const ICONES: Record<string, string> = {
  // Alimentation, repas
  'steak-boeuf': '🥩',
  poulet: '🍗',
  porc: '🐖',
  canard: '🦆',
  saumon: '🐟',
  cabillaud: '🎣',
  crevettes: '🦐',
  oeufs: '🥚',
  tofu: '🧈',
  lentilles: '🥣',
  pates: '🍝',
  fromage: '🧀',
  yaourt: '🥛',
  croissant: '🥐',
  cheeseburger: '🍔',
  kebab: '🥙',
  pizza: '🍕',
  sushis: '🍣',
  'repas-vegetarien': '🥗',
  'repas-boeuf': '🍲',
  // Fruits et légumes
  avocat: '🥑',
  'mangue-avion': '🥭',
  'mangue-bateau': '🚢',
  banane: '🍌',
  fraises: '🍓',
  // Boissons
  cafe: '☕',
  the: '🍵',
  lait: '🐄',
  biere: '🍺',
  vin: '🍷',
  'eau-bouteille': '🧴',
  'eau-robinet': '🚰',
  // Numérique
  smartphone: '📱',
  tablette: '📲',
  'ordinateur-portable': '💻',
  'ordinateur-fixe': '🖥️',
  ecran: '🖵',
  television: '📺',
  box: '📶',
  'enceinte-connectee': '🔊',
  emails: '📧',
  'telecharger-film': '🎬',
  // Électroménager
  bouilloire: '🫖',
  aspirateur: '🧹',
  'micro-ondes': '♨️',
  'cafetiere-dosettes': '🫗',
  refrigerateur: '🧊',
  'lave-vaisselle': '🍽️',
  'lave-linge': '🧺',
  // Mobilier
  chaise: '🪑',
  table: '🪵',
  armoire: '🚪',
  // Habillement
  'tshirt-coton': '👕',
  'tshirt-polyester': '🎽',
  'chemise-coton': '👔',
  'chaussures-sport': '👟',
  jean: '👖',
  'pull-acrylique': '🧵',
  'sweat-coton': '🧥',
  'pull-laine': '🧶',
  manteau: '🧣',
  // Transport
  'metro-10km': '🚇',
  'velo-electrique-10km': '🚲',
  'scooter-10km': '🛵',
  'bus-10km': '🚌',
  'voiture-10km': '🚗',
  'voiture-electrique-10km': '🔌',
  'paris-marseille-tgv': '🚄',
  'paris-marseille-covoiturage': '🚙',
  'paris-marseille-voiture': '🛣️',
  'paris-marseille-avion': '🛫',
  'paris-new-york': '✈️',
  // Livraison
  'colis-magasin-velo': '🛍️',
  'livraison-domicile': '🚚',
  'livraison-point-relais': '📦',
  'colis-magasin-voiture': '🏬',
  // Chauffage
  'chauffage-pac': '🌡️',
  'chauffage-gaz': '🔥',
  'chauffage-fioul': '🛢️',
  // Loisirs
  friends: '🛋️',
  'nuit-hotel': '🏨',
  'journee-ski': '⛷️',
}

/** Icône d'un Geste ; un repère neutre si elle manque, pour ne jamais casser l'affichage. */
export const iconeDe = (idGeste: string): string => ICONES[idGeste] ?? '◻️'
