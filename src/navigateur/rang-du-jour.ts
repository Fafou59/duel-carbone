/**
 * Le serveur du jeu, côté navigateur (serveur/api.ts, ADR 0005 et 0006) : le Rang du jour et le Taux d'erreur.
 *
 * Le jeu ne dépend jamais du serveur : hors ligne, serveur lent ou en panne, ces fonctions renvoient simplement
 * null au bout de quelques secondes, sans erreur, et l'écran n'affiche ni Rang ni Taux d'erreur. Un seul envoi par
 * Partie du jour, sans file d'attente ni nouvel essai (c'est App qui décide quand envoyer).
 */
import { sontDesEffectifs, type Effectifs } from '../domaine/rang-du-jour.ts'
import { sontDesComptes, type ComptesDesPaires } from '../domaine/taux-d-erreur.ts'

export const ADRESSE_DU_RANG = '/api/rang-du-jour'
export const ADRESSE_DU_TAUX = '/api/taux-d-erreur'

/** Au-delà, on n'attend plus : le joueur a déjà son score sous les yeux. */
const DELAI_MS = 5000

/** Ce que rapporte l'envoi de fin : les Effectifs du jour, et les comptes à jour des 10 paires (ou null). */
export type ReponseDeFin = { effectifs: Effectifs; paires: ComptesDesPaires | null }

export type ServeurDuRang = {
  /** À la première fin de la Partie du jour : compte le joueur et ses réponses, et rend ce qu'il faut afficher. */
  envoyer: (numero: number, choix: string[]) => Promise<ReponseDeFin | null>
  /** Les Effectifs du jour, s'ils sont bien ceux du Duel du jour n° `numero` (sinon null). */
  lire: (numero: number) => Promise<Effectifs | null>
  /** Au lancement d'une Partie : les comptes de ses paires de Gestes (clés de cleDuDuel), ou null. */
  lireTaux: (cles: string[]) => Promise<ComptesDesPaires | null>
}

/** Le corps JSON d'une réponse réussie, ou null. */
async function corpsDe(reponse: Response): Promise<Record<string, unknown> | null> {
  if (!reponse.ok) return null
  const corps: unknown = await reponse.json()
  return typeof corps === 'object' && corps !== null ? (corps as Record<string, unknown>) : null
}

/** Les Effectifs reçus, vérifiés : ceux du Duel du jour attendu, ou null. */
const effectifsDe = (corps: Record<string, unknown> | null, numero: number): Effectifs | null =>
  // Juste après minuit, le serveur peut déjà être au Duel du lendemain : ces Effectifs-là ne nous concernent pas.
  corps && corps.numero === numero && sontDesEffectifs(corps.effectifs) ? corps.effectifs : null

/** Les comptes reçus, vérifiés, ou null. */
const comptesDe = (corps: Record<string, unknown> | null): ComptesDesPaires | null =>
  corps && sontDesComptes(corps.paires) ? corps.paires : null

/** Le serveur du jeu. `faireFetch` et `delai` sont remplaçables dans les tests. */
export function serveurDuRang(faireFetch: typeof fetch = (...args) => fetch(...args), delai = DELAI_MS): ServeurDuRang {
  const appeler = async (adresse: string, init: RequestInit = {}): Promise<Record<string, unknown> | null> => {
    try {
      return await corpsDe(await faireFetch(adresse, { ...init, signal: AbortSignal.timeout(delai) }))
    } catch {
      // Hors ligne, délai dépassé, réponse illisible : rien à afficher, et rien d'autre à faire.
      return null
    }
  }
  return {
    envoyer: async (numero, choix) => {
      const corps = await appeler(ADRESSE_DU_RANG, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero, choix }),
      })
      const effectifs = effectifsDe(corps, numero)
      return effectifs ? { effectifs, paires: comptesDe(corps) } : null
    },
    lire: async (numero) => effectifsDe(await appeler(ADRESSE_DU_RANG, { cache: 'no-store' }), numero),
    lireTaux: async (cles) => {
      if (cles.length === 0) return null
      const adresse = `${ADRESSE_DU_TAUX}?${new URLSearchParams({ paires: cles.join(',') })}`
      return comptesDe(await appeler(adresse, { cache: 'no-store' }))
    },
  }
}
