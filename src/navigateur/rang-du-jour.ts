/**
 * Le Rang du jour, côté navigateur : parler au serveur (serveur/api.ts, ADR 0005).
 *
 * Le jeu ne dépend jamais du serveur : hors ligne, serveur lent ou en panne, ces fonctions renvoient simplement
 * null au bout de quelques secondes, sans erreur, et l'écran n'affiche pas de Rang. Un seul envoi par Partie du jour,
 * sans file d'attente ni nouvel essai (c'est App qui décide quand envoyer).
 */
import { sontDesEffectifs, type Effectifs } from '../domaine/rang-du-jour.ts'

export const ADRESSE_DU_RANG = '/api/rang-du-jour'

/** Au-delà, on n'attend plus : le joueur a déjà son score sous les yeux. */
const DELAI_MS = 5000

export type ServeurDuRang = {
  /** À la première fin de la Partie du jour : compte le joueur, et renvoie les Effectifs du jour (ou null). */
  envoyer: (numero: number, choix: string[]) => Promise<Effectifs | null>
  /** Les Effectifs du jour, s'ils sont bien ceux du Duel du jour n° `numero` (sinon null). */
  lire: (numero: number) => Promise<Effectifs | null>
}

/** La réponse du serveur, vérifiée : les Effectifs du Duel du jour attendu, ou null. */
async function effectifsDe(reponse: Response, numero: number): Promise<Effectifs | null> {
  if (!reponse.ok) return null
  const corps: unknown = await reponse.json()
  if (typeof corps !== 'object' || corps === null) return null
  const { numero: numeroRecu, effectifs } = corps as Record<string, unknown>
  // Juste après minuit, le serveur peut déjà être au Duel du lendemain : ces Effectifs-là ne nous concernent pas.
  return numeroRecu === numero && sontDesEffectifs(effectifs) ? effectifs : null
}

/** Le serveur du Rang du jour. `faireFetch` et `delai` sont remplaçables dans les tests. */
export function serveurDuRang(faireFetch: typeof fetch = (...args) => fetch(...args), delai = DELAI_MS): ServeurDuRang {
  const appeler = async (numero: number, init: RequestInit = {}): Promise<Effectifs | null> => {
    try {
      const reponse = await faireFetch(ADRESSE_DU_RANG, { ...init, signal: AbortSignal.timeout(delai) })
      return await effectifsDe(reponse, numero)
    } catch {
      // Hors ligne, délai dépassé, réponse illisible : rien à afficher, et rien d'autre à faire.
      return null
    }
  }
  return {
    envoyer: (numero, choix) =>
      appeler(numero, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero, choix }),
      }),
    lire: (numero) => appeler(numero, { cache: 'no-store' }),
  }
}
