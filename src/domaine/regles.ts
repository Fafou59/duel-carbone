/**
 * LES RÈGLES DU JEU, réunies en un seul endroit (PRD, section « Règles du jeu »).
 *
 * Pour faire évoluer le jeu après des retours de joueurs, c'est ici qu'on change un seuil :
 * les tests du générateur vérifient aussitôt que tout reste cohérent.
 * Pensez à mettre le PRD à jour en même temps, en notant pourquoi la règle a changé.
 */
import type { Difficulte } from './difficulte.ts'
import type { Nature } from './geste.ts'

/** Un intervalle de Rapport : min inclus, max exclu. */
export type Tranche = { min: number; max: number }

export const REGLES = {
  /** Nombre de Duels dans une Partie. */
  nombreDeDuels: 10,

  /**
   * Aucun Duel sous ce Rapport, jamais. L'ADEME ne publie pas de marge d'incertitude :
   * en dessous, l'écart risque d'être dans la marge d'erreur, et le joueur se sentirait volé.
   */
  plancher: 1.25,

  /**
   * Natures qui ne s'affrontent jamais dans un Duel tiré au hasard : la comparaison n'aurait pas de sens
   * (« un repas avec du bœuf » contre « 120 g de bœuf »). Les Duels thématiques, écrits à la main, ne sont pas concernés.
   */
  combinaisonsInterdites: [['repas', 'aliment']] as [Nature, Nature][],

  /** Tranche de Rapport de chaque Difficulté. */
  tranches: {
    facile: { min: 10, max: Number.POSITIVE_INFINITY },
    moyen: { min: 3, max: 10 },
    difficile: { min: 1.5, max: 3 },
    ultime: { min: 1.25, max: 1.5 },
  } satisfies Record<Difficulte, Tranche>,
}
