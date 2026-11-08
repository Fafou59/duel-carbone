/** La Difficulté attendue d'un Duel dépend de sa position dans la Partie (PRD, « Règles du jeu »). */
export type Difficulte = 'facile' | 'moyen' | 'difficile' | 'ultime'

/** Duels 1-3 faciles, 4-6 moyens, 7-9 difficiles, 10 ultime (index de 0 à 9). */
export function difficulteAttendue(index: number): Difficulte {
  if (index < 3) return 'facile'
  if (index < 6) return 'moyen'
  if (index < 9) return 'difficile'
  return 'ultime'
}
