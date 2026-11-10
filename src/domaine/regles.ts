/**
 * LES RÈGLES DU JEU, réunies en un seul endroit (PRD, section « Règles du jeu »).
 *
 * Pour faire évoluer le jeu après des retours de joueurs, c'est ici qu'on change un seuil :
 * les tests du générateur vérifient aussitôt que tout reste cohérent.
 * Pensez à mettre le PRD à jour en même temps, en notant pourquoi la règle a changé,
 * puis à relancer npm run calibrer : les Coefficients d'équilibrage dépendent des règles (un test le rappelle).
 */
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

  /**
   * Aucun Duel tiré au hasard au-delà de ce Rapport : à ×1 000, personne ne se trompe.
   * Les Duels thématiques, choisis à la main, ne sont pas concernés.
   */
  plafond: 500,

  /**
   * La courbe de difficulté : une tranche de Rapport par Duel, du Duel 1 au Duel 10.
   * Elle part du plafond (un premier Duel d'échauffement) et se resserre vite.
   * Les étiquettes facile (1-3), moyen (4-6), difficile (7-9) et ultime (10) regroupent ces tranches.
   */
  tranchesParDuel: [
    { min: 80, max: 500 },
    { min: 25, max: 80 },
    { min: 10, max: 25 },
    { min: 5, max: 10 },
    { min: 3.3, max: 5 },
    { min: 2.4, max: 3.3 },
    { min: 2, max: 2.4 },
    { min: 1.7, max: 2 },
    { min: 1.5, max: 1.7 },
    { min: 1.25, max: 1.5 },
  ] satisfies Tranche[],
}
