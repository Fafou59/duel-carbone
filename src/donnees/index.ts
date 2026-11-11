/** Point d'entrée des données du jeu : l'Instantané ADEME, le catalogue et les Coefficients d'équilibrage, prêts à l'emploi. */
import type { Calendrier } from '../domaine/calendrier.ts'
import type { Calibrage } from '../domaine/equilibrage.ts'
import { calculerGeste, type GesteCalcule } from '../domaine/geste.ts'
import coefficientsJson from './coefficients.json'
import { GESTES } from './gestes.ts'
import instantaneJson from './instantane.json'
import type { Instantane } from './referentiel.ts'

export const INSTANTANE = instantaneJson as Instantane

/** Coefficients d'équilibrage des Gestes, calculés par npm run calibrer (ne pas modifier à la main). */
export const CALIBRAGE = coefficientsJson as Calibrage

/** Tous les Gestes du catalogue, calculés une fois pour toutes. */
export const GESTES_CALCULES: GesteCalcule[] = GESTES.map((g) => calculerGeste(g, INSTANTANE))

/**
 * Le calendrier des Parties du jour (npm run calendrier). Chargé à part, à la demande : le jeu démarre
 * sans l'attendre, et Vite le range dans son propre fichier.
 */
export const chargerCalendrier = async (): Promise<Calendrier> =>
  (await import('./calendrier.json')).default as Calendrier

/** Le Geste calculé à partir de son identifiant dans le catalogue. */
export function gesteCalcule(id: string): GesteCalcule {
  const geste = GESTES.find((g) => g.id === id)
  if (!geste) throw new Error(`Geste « ${id} » absent du catalogue.`)
  return calculerGeste(geste, INSTANTANE)
}
