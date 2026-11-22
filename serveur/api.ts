/**
 * L'API du Rang du jour (issue 87, ADR 0005), à l'adresse /api/rang-du-jour :
 *
 * - GET : les Effectifs du jour (combien de joueurs ont fait 0, 1… 10 au Duel du jour) ;
 * - POST { numero, choix } : à la première fin de sa Partie du jour, le jeu envoie le numéro du Duel du jour et
 *   les 10 Gestes choisis. Le serveur vérifie que c'est bien le Duel d'aujourd'hui (heure de Paris), recalcule le
 *   score à partir du calendrier (il ne croit jamais un score qu'on lui annonce), ajoute 1 dans la bonne case, et
 *   renvoie les Effectifs du jour.
 *
 * Le serveur ne sait rien du joueur : il ne lit ni ne garde son adresse IP, et n'enregistre ni ses choix ni l'heure.
 * Le jeu calcule lui-même son Rang à partir des Effectifs (src/domaine/rang-du-jour.ts).
 */
import calendrierJson from '../src/donnees/calendrier.json'
import { GESTES_CALCULES } from '../src/donnees/index.ts'
import { partieDuJour, type Calendrier } from '../src/domaine/calendrier.ts'
import { jourDeParis, numeroDuJour } from '../src/domaine/jour.ts'
import { NOMBRE_DE_DUELS } from '../src/domaine/partie.ts'
import { scoreDesChoix } from '../src/domaine/rang-du-jour.ts'
import { compterUnJoueur, lireEffectifs, type BaseD1 } from './base.ts'

/** Ce que Cloudflare passe au Worker : la base D1, si wrangler.jsonc la déclare (sinon, l'API répond 503). */
export type Environnement = { BASE?: BaseD1 }

export const ADRESSE_DU_RANG = '/api/rang-du-jour'

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

/** Répond à une requête vers /api/…, à l'instant `maintenant` (remplaçable dans les tests). */
export async function traiterRequete(requete: Request, env: Environnement, maintenant = new Date()): Promise<Response> {
  const { pathname } = new URL(requete.url)
  if (pathname !== ADRESSE_DU_RANG) return erreur(404, 'adresse inconnue')
  if (requete.method !== 'GET' && requete.method !== 'POST') return erreur(405, 'méthode non prise en charge')

  const jour = jourDeParis(maintenant)
  const numero = numeroDuJour(jour)
  const base = env.BASE
  if (!base) {
    console.error('Rang du jour : aucune base D1 (binding BASE) dans wrangler.jsonc pour ce déploiement.')
    return erreur(503, 'base indisponible')
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
    const score = scoreDesChoix(partieDuJour(CALENDRIER, jour, GESTES_CALCULES, []), envoi.choix)
    if (score === null) return erreur(422, 'ces choix ne correspondent pas aux Duels du jour')
    return json(200, { numero, effectifs: await compterUnJoueur(base, jour, score) })
  } catch (panne) {
    // Quota du jour épuisé, base injoignable… Le jeu n'affiche alors rien, et se joue normalement.
    console.error('Rang du jour : la base D1 ne répond pas.', panne)
    return erreur(503, 'base indisponible')
  }
}
