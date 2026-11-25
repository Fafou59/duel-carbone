/**
 * L'API du serveur (ADR 0005 et 0006) :
 *
 * - GET /api/rang-du-jour : les Effectifs du jour (combien de joueurs ont fait 0, 1… 10 au Duel du jour) ;
 * - POST /api/rang-du-jour { numero, choix } : à la première fin de sa Partie du jour, le jeu envoie le numéro du
 *   Duel du jour et les 10 Gestes choisis. Le serveur vérifie que c'est bien le Duel d'aujourd'hui (heure de Paris),
 *   recalcule le score et les bonnes réponses à partir du calendrier (il ne croit jamais un résultat qu'on lui
 *   annonce), ajoute 1 dans la case du score et dans les comptes des 10 paires de Gestes, et renvoie les Effectifs du
 *   jour et le Taux d'erreur à jour de ces paires ;
 * - GET /api/taux-d-erreur?paires=… : au lancement d'une Partie, les comptes de ses 10 paires (issue 107).
 *
 * Le serveur ne sait rien du joueur : il ne lit ni ne garde son adresse IP, et n'enregistre ni l'heure ni ses choix
 * un par un, seulement des totaux. Le jeu calcule lui-même son Rang et les Taux d'erreur (src/domaine/).
 */
import calendrierJson from '../src/donnees/calendrier.json'
import { GESTES_CALCULES } from '../src/donnees/index.ts'
import { partieDuJour, type Calendrier } from '../src/domaine/calendrier.ts'
import { jourDeParis, numeroDuJour } from '../src/domaine/jour.ts'
import { NOMBRE_DE_DUELS } from '../src/domaine/partie.ts'
import { scoreDesChoix } from '../src/domaine/rang-du-jour.ts'
import { estUneCleDePaire, reponsesDeLaPartie } from '../src/domaine/taux-d-erreur.ts'
import { compterUnePartieDuJour, lireComptes, lireEffectifs, type BaseD1 } from './base.ts'

/** Ce que Cloudflare passe au Worker : la base D1, si wrangler.jsonc la déclare (sinon, l'API répond 503). */
export type Environnement = { BASE?: BaseD1 }

export const ADRESSE_DU_RANG = '/api/rang-du-jour'
export const ADRESSE_DU_TAUX = '/api/taux-d-erreur'

/** Un envoi fait moins d'1 Ko (10 identifiants de Gestes) : au-delà, ce n'est pas le jeu qui écrit. */
const TAILLE_MAX = 2000

const CALENDRIER = calendrierJson as Calendrier

/** Une réponse en JSON, jamais gardée en copie (le chiffre change à chaque joueur). */
const json = (statut: number, corps: unknown) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })

const erreur = (statut: number, message: string) => json(statut, { erreur: message })

/** Lit et vérifie l'envoi du jeu : { numero, choix }, ou un message d'erreur. */
async function lireEnvoi(requete: Request): Promise<{ numero: number; choix: string[] } | string> {
  const texte = await requete.text()
  if (texte.length > TAILLE_MAX) return 'envoi trop long'
  let brut: unknown
  try {
    brut = JSON.parse(texte)
  } catch {
    return 'JSON illisible'
  }
  const { numero, choix } = (typeof brut === 'object' && brut !== null ? brut : {}) as Record<string, unknown>
  if (typeof numero !== 'number' || !Number.isInteger(numero)) return 'numéro du Duel du jour manquant'
  const choixValides =
    Array.isArray(choix) && choix.length === NOMBRE_DE_DUELS && choix.every((c) => typeof c === 'string' && c.length <= 100)
  if (!choixValides) return `il faut les ${NOMBRE_DE_DUELS} choix de la Partie`
  return { numero, choix }
}

/**
 * Lit les paires demandées (« ?paires=a|b,c|d… », au plus 10, les 10 Duels d'une Partie), ou un message d'erreur.
 * Lire des comptes ne dévoile rien de nouveau : le calendrier et les Empreintes sont déjà dans le code du jeu.
 */
function lirePaires(brut: string | null): string[] | string {
  const cles = [...new Set((brut ?? '').split(',').filter(Boolean))]
  if (cles.length === 0) return 'paires manquantes'
  if (cles.length > NOMBRE_DE_DUELS) return `au plus ${NOMBRE_DE_DUELS} paires`
  if (!cles.every(estUneCleDePaire)) return 'paire mal formée'
  return cles
}

/** Répond à une requête vers /api/…, à l'instant `maintenant` (remplaçable dans les tests). */
export async function traiterRequete(requete: Request, env: Environnement, maintenant = new Date()): Promise<Response> {
  const { pathname, searchParams } = new URL(requete.url)
  if (pathname !== ADRESSE_DU_RANG && pathname !== ADRESSE_DU_TAUX) return erreur(404, 'adresse inconnue')
  const methodes = pathname === ADRESSE_DU_TAUX ? ['GET'] : ['GET', 'POST']
  if (!methodes.includes(requete.method)) return erreur(405, 'méthode non prise en charge')

  const jour = jourDeParis(maintenant)
  const numero = numeroDuJour(jour)
  const base = env.BASE
  if (!base) {
    console.error('Serveur : aucune base D1 (binding BASE) dans wrangler.jsonc pour ce déploiement.')
    return erreur(503, 'base indisponible')
  }

  if (pathname === ADRESSE_DU_TAUX) {
    const cles = lirePaires(searchParams.get('paires'))
    if (typeof cles === 'string') return erreur(400, cles)
    try {
      return json(200, { paires: await lireComptes(base, cles) })
    } catch (panne) {
      console.error('Taux d’erreur : la base D1 ne répond pas.', panne)
      return erreur(503, 'base indisponible')
    }
  }

  try {
    if (requete.method === 'GET') return json(200, { numero, effectifs: await lireEffectifs(base, jour) })

    // Un formulaire d'un autre site ne peut envoyer que du texte brut ; exiger du JSON l'empêche de compter un
    // score à la place d'un joueur (et le navigateur interdit à un autre site de lire nos réponses).
    if (!requete.headers.get('Content-Type')?.startsWith('application/json')) return erreur(415, 'JSON attendu')
    const envoi = await lireEnvoi(requete)
    if (typeof envoi === 'string') return erreur(400, envoi)
    // Seul le Duel du jour d'aujourd'hui compte : une Partie finie après minuit n'est plus celle du jour.
    if (envoi.numero !== numero) return erreur(409, `ce n'est pas le Duel du jour n° ${numero}`)
    // Les Duels du jour, tels que le calendrier les a tirés (sans les textes des Duels thématiques, inutiles ici).
    const duels = partieDuJour(CALENDRIER, jour, GESTES_CALCULES, [])
    const score = scoreDesChoix(duels, envoi.choix)
    const reponses = reponsesDeLaPartie(duels, envoi.choix)
    if (score === null || reponses === null) return erreur(422, 'ces choix ne correspondent pas aux Duels du jour')
    // Le joueur dans la case de son score, et ses 10 réponses dans le Taux d'erreur de leurs paires (ADR 0006).
    return json(200, { numero, ...(await compterUnePartieDuJour(base, jour, score, reponses)) })
  } catch (panne) {
    // Quota du jour épuisé, base injoignable… Le jeu n'affiche alors rien, et se joue normalement.
    console.error('Rang du jour : la base D1 ne répond pas.', panne)
    return erreur(503, 'base indisponible')
  }
}
