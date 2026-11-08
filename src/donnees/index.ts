/** Point d'entrée des données du jeu : l'Instantané ADEME et le catalogue, prêts à l'emploi. */
import { calculerGeste, type GesteCalcule } from '../domaine/geste.ts'
import { GESTES } from './gestes.ts'
import instantaneJson from './instantane.json'
import type { Instantane } from './referentiel.ts'

export const INSTANTANE = instantaneJson as Instantane

/** Tous les Gestes du catalogue, calculés une fois pour toutes. */
export const GESTES_CALCULES: GesteCalcule[] = GESTES.map((g) => calculerGeste(g, INSTANTANE))

/** Le Geste calculé à partir de son identifiant dans le catalogue. */
export function gesteCalcule(id: string): GesteCalcule {
  const geste = GESTES.find((g) => g.id === id)
  if (!geste) throw new Error(`Geste « ${id} » absent du catalogue.`)
  return calculerGeste(geste, INSTANTANE)
}
