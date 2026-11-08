/**
 * Icônes PROVISOIRES des Gestes : des emojis système, en attendant le jeu d'icônes du ticket #14.
 * Limite connue (voir docs/prototypes/verdict-duel-ui.md) : leur rendu varie selon l'appareil,
 * et certains objets n'ont pas d'emoji (le micro-ondes, représenté ici par ♨️).
 */
export const ICONES: Record<string, string> = {
  'steak-boeuf': '🥩',
  poulet: '🍗',
  lentilles: '🥣',
  avocat: '🥑',
  smartphone: '📱',
  television: '📺',
  'enceinte-connectee': '🔊',
  'ordinateur-portable': '💻',
  'micro-ondes': '♨️',
  'lave-linge': '🧺',
  refrigerateur: '🧊',
  jean: '👖',
  'tshirt-coton': '👕',
  'tshirt-polyester': '🎽',
  'pull-laine': '🧶',
  'paris-new-york': '✈️',
  'livraison-domicile': '🚚',
  'colis-magasin-voiture': '🚗',
}

/** Icône d'un Geste ; un repère neutre si elle manque, pour ne jamais casser l'affichage. */
export const iconeDe = (idGeste: string): string => ICONES[idGeste] ?? '◻️'
