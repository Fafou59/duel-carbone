/**
 * Hachage FNV-1a (32 bits) : transforme un texte en 8 caractères qui changent dès que le texte change.
 * Sert d'« empreinte » pour repérer qu'une donnée a bougé (calibrage, chiffres des Duels thématiques).
 * Ce n'est pas un chiffrement : seulement un résumé court et reproductible.
 */
export function fnv1a(texte: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < texte.length; i++) {
    hash ^= texte.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
