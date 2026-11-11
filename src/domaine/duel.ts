/** Règles d'un Duel : deux Gestes, celui qui émet le plus, et leur Rapport. */
import type { GesteCalcule } from './geste.ts'

/** Deux Gestes face à face ; a s'affiche en premier, b en second. */
export type Duel = { a: GesteCalcule; b: GesteCalcule }

export const plusEmetteur = (duel: Duel): GesteCalcule => (duel.a.empreinte >= duel.b.empreinte ? duel.a : duel.b)

export const moinsEmetteur = (duel: Duel): GesteCalcule => (plusEmetteur(duel) === duel.a ? duel.b : duel.a)

/** Combien de fois le plus émetteur émet plus que l'autre (toujours ≥ 1). */
export const rapport = (duel: Duel): number => plusEmetteur(duel).empreinte / moinsEmetteur(duel).empreinte

export const estBonChoix = (duel: Duel, idChoisi: string): boolean => plusEmetteur(duel).id === idChoisi

/** Identifiant d'une paire, indépendant de l'ordre des deux Gestes. */
export const cleDePaire = (idA: string, idB: string): string => [idA, idB].sort().join('|')
