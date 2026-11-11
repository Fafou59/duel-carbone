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

/**
 * Les repères climat de l'accueil, en kg CO2e par an, lus dans l'Instantané (jamais écrits à la main) :
 * l'empreinte moyenne d'un Français et l'objectif pour 2050 (Équivalents ADEME « francais » et « 2050 »).
 */
const valeurAdeme = (slug: string) => {
  const equivalent = INSTANTANE.equivalents.find((e) => e.slug === slug)
  if (!equivalent) throw new Error(`Équivalent « ${slug} » absent de l'Instantané.`)
  return equivalent.valeur
}
export const REPERES_CLIMAT = { francais: valeurAdeme('francais'), objectif2050: valeurAdeme('2050') }

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
