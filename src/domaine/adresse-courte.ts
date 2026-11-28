/**
 * L'adresse courte d'une Séance du Mode animation, à taper à la main sous le QR code. Un fichier à part, sans rien
 * d'autre : le jeu la lit au démarrage (main.tsx) sans charger le code des Séances, et le serveur s'en sert aussi.
 */

/** L'adresse courte à taper à la main, affichée sous le QR code : duelcarbone.fr/rejoindre (décidé le 28/11). */
export const CHEMIN_REJOINDRE = '/rejoindre'

/**
 * L'ancre de la page du téléphone qu'ouvre l'adresse courte : « /rejoindre » donne « #rejoindre » (le code reste à
 * taper), « /rejoindre/K7RM4P » donne « #rejoindre/K7RM4P ». null pour toute autre adresse. Le jeu ne navigue que par
 * ancres (navigateur/adresse.ts) : le serveur renvoie l'adresse courte vers l'ancre, et le jeu fait de même quand le
 * service worker sert la page sans passer par le serveur.
 */
export function ancreDuCheminCourt(chemin: string): string | null {
  const trouve = /^\/rejoindre(?:\/([^/]+))?\/?$/i.exec(chemin)
  if (!trouve) return null
  return trouve[1] ? `#rejoindre/${trouve[1]}` : '#rejoindre'
}
