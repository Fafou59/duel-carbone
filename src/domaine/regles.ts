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
   * (« un repas avec du bœuf » contre « 150 g de bœuf »). Les Duels thématiques, écrits à la main, ne sont pas concernés.
   */
  combinaisonsInterdites: [['repas', 'aliment']] as [Nature, Nature][],

  /**
   * Aucun Duel tiré au hasard au-delà de ce Rapport : à ×1 000, personne ne se trompe.
   * Les Duels thématiques, choisis à la main, ne sont pas concernés.
   */
  plafond: 500,

  /**
   * Chance qu'une Partie contienne un Duel thématique (un au plus), tirée à chaque Partie
   * indépendamment des précédentes : deux Parties de suite peuvent en avoir un. Le hasard seul
   * n'en donnait que dans 14 % des Parties, très inégalement selon les pièges.
   */
  probabiliteDuelThematique: 0.5,

  /**
   * Garantie contre les longues séries : si les Parties récentes (ce nombre-là) n'ont eu aucun
   * Duel thématique, la suivante en a un. Le hasard seul laissait parfois passer 5 ou 6 Parties sans.
   */
  partiesMaxSansDuelThematique: 3,

  /**
   * La Partie du jour a ses propres réglages : c'est le Duel dont les joueurs parlent entre eux (bilan J+7, issue 93).
   * Un Duel thématique 2 jours sur 3, forcé si les 2 jours précédents n'en avaient pas : 9/13 ≈ 69 % des jours.
   * Et chaque Duel thématique passe une fois avant qu'un autre ne revienne, dans un ordre tiré au hasard
   * (thematiquesDuCycle) : avec 41 Duels, chacun revient 6 ou 7 fois par an.
   * La Partie libre garde les deux réglages ci-dessus.
   */
  duelDuJour: {
    probabiliteDuelThematique: 2 / 3,
    joursMaxSansDuelThematique: 2,
  },

  /**
   * Le Rang du jour (« Tu as fait mieux ou autant que x % des joueurs ») ne s'affiche qu'à partir de ce
   * nombre de joueurs ce jour-là, le joueur compris (issue 87) : avec 2 ou 3 joueurs, le chiffre ne veut rien dire
   * et laisse deviner le score des autres. À relever quand l'audience grandira.
   */
  rangDuJour: {
    joueursMinimum: 4,
  },

  /**
   * Le Taux d'erreur d'un Duel (« 72 % de réponses fausses sur ce Duel », issue 107, ADR 0006) ne s'affiche qu'à
   * partir de ce nombre de réponses sur la paire de Gestes, tous jours et toutes Parties confondus. On compte des
   * réponses, pas des joueurs : un même joueur peut retomber sur une paire. Comme le Rang, hors de l'empreinte du
   * tirage (equilibrage.ts) : le changer ne demande pas de recalibrer.
   */
  tauxDErreur: {
    reponsesMinimum: 4,
  },

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
