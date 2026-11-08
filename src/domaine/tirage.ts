/**
 * Tirage PROVISOIRE des Duels d'une Partie (ticket #7) : 10 paires distinctes au hasard,
 * avec un Rapport d'au moins ×1,25. Les vraies règles de Difficulté arrivent au ticket #8.
 */
import { rapport, type Duel } from './duel.ts'
import type { GesteCalcule } from './geste.ts'
import { melanger, type SourceDeHasard } from './hasard.ts'
import { NOMBRE_DE_DUELS } from './partie.ts'

/** Aucun Duel sous ce Rapport : en dessous, l'écart est trop faible pour être incontestable. */
export const PLANCHER_DU_RAPPORT = 1.25

/** Toutes les paires de Gestes jouables (Rapport ≥ plancher), chacune une seule fois. */
export function pairesJouables(gestes: GesteCalcule[]): Duel[] {
  const paires: Duel[] = []
  for (let i = 0; i < gestes.length; i++) {
    for (let j = i + 1; j < gestes.length; j++) {
      const duel = { a: gestes[i], b: gestes[j] }
      if (rapport(duel) >= PLANCHER_DU_RAPPORT) paires.push(duel)
    }
  }
  return paires
}

export function tirerPartieProvisoire(gestes: GesteCalcule[], hasard: SourceDeHasard = Math.random): Duel[] {
  const paires = pairesJouables(gestes)
  if (paires.length < NOMBRE_DE_DUELS) {
    throw new Error(`Pas assez de paires jouables pour une Partie : ${paires.length} pour ${NOMBRE_DE_DUELS} Duels.`)
  }
  // On mélange, on garde les 10 premières, et on tire au sort le côté de chaque Geste.
  return melanger(paires, hasard)
    .slice(0, NOMBRE_DE_DUELS)
    .map((duel) => (hasard() < 0.5 ? duel : { a: duel.b, b: duel.a }))
}
