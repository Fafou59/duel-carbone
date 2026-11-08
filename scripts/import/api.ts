/** Appels réseau à l'API Impact CO2. C'est la seule partie du script qui dépend d'Internet. */
import { API_IMPACT_CO2, type Thematique } from '../../src/donnees/referentiel.ts'
import type { ReponseEcv } from './transformer.ts'

export async function chargerThematique(thematique: Thematique, cleApi?: string): Promise<ReponseEcv[]> {
  const url = `${API_IMPACT_CO2}/thematiques/ecv/${thematique.id}?detail=1&language=fr`
  // La clé d'API est facultative ; l'ADEME s'en sert pour suivre l'usage de son API.
  const enTetes: Record<string, string> = cleApi ? { Authorization: `Bearer ${cleApi}` } : {}

  let reponse: Response
  try {
    reponse = await fetch(url, { headers: enTetes, signal: AbortSignal.timeout(20_000) })
  } catch (erreur) {
    throw new Error(`Impossible de joindre l'API pour « ${thematique.nom} » (${url}) : ${(erreur as Error).message}`)
  }
  if (!reponse.ok) {
    throw new Error(`L'API a répondu ${reponse.status} pour « ${thematique.nom} » (${url}).`)
  }
  const corps = (await reponse.json()) as { data?: ReponseEcv[] }
  if (!Array.isArray(corps.data) || corps.data.length === 0) {
    throw new Error(`Réponse vide ou inattendue pour « ${thematique.nom} » (${url}).`)
  }
  return corps.data
}
