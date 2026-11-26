/**
 * Les adresses /api/seance/… du Worker (Mode animation, ADR 0007) :
 *
 * - POST /api/seance { classement, duels } : l'ordinateur de l'Animateur crée une Séance avec les 10 Duels qu'il a
 *   tirés (« idA>idB »). Le Worker vérifie que chaque paire est jouable, tire un code libre, et renvoie le code et le
 *   jeton de l'Animateur ;
 * - GET /api/seance/<code> : ce que l'écran « Rejoindre » doit savoir (faut-il un pseudo ? la Séance est-elle
 *   ouverte ?) ;
 * - GET /api/seance/<code>/connexion (WebSocket) : la connexion d'un écran, transmise au Durable Object de la Séance.
 *
 * Chaque Séance est un Durable Object (serveur/seance.ts), désigné par son code, toujours dans la juridiction « eu » :
 * il ne tourne et ne garde ses données que dans l'Union européenne.
 */
import { duelsDUnePartieLibre } from '../src/domaine/taux-d-erreur.ts'
import { estUnCodeDeSeance, tirerUnCode } from '../src/domaine/seance.ts'
import { DUELS_THEMATIQUES } from '../src/donnees/duels-thematiques.ts'
import { GESTES_CALCULES } from '../src/donnees/index.ts'
import type { Seance } from './seance.ts'

export const ADRESSE_DES_SEANCES = '/api/seance'

/**
 * Ce que le Worker reçoit pour les Séances : l'espace des Durable Objects, si wrangler.jsonc le déclare.
 * `SEANCE_SANS_JURIDICTION` ne sert qu'aux tests (vitest.objet.config.ts) : le moteur local (workerd) ne sait pas
 * créer d'objet dans une juridiction. Il n'est jamais déclaré dans wrangler.jsonc : en ligne, c'est toujours l'UE.
 */
export type EnvironnementDesSeances = { SEANCE?: DurableObjectNamespace<Seance>; SEANCE_SANS_JURIDICTION?: string }

/** Une création fait moins d'1 Ko (10 Duels) : au-delà, ce n'est pas le jeu qui écrit. */
const TAILLE_MAX = 2000

/** Combien de codes essayer avant d'abandonner (avec un milliard de codes, le premier est presque toujours libre). */
const ESSAIS_DE_CODE = 5

const json = (statut: number, corps: unknown) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })

const erreur = (statut: number, message: string) => json(statut, { erreur: message })

/** Du vrai hasard (et non Math.random) : un code ne doit pas se deviner à partir des précédents. */
const hasardCryptographique = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32

/** L'objet d'une Séance, toujours dans l'UE (le même code hors juridiction serait un autre objet). */
const objetDeLaSeance = (espace: DurableObjectNamespace<Seance>, code: string, env: EnvironnementDesSeances) =>
  (env.SEANCE_SANS_JURIDICTION === 'oui' ? espace : espace.jurisdiction('eu')).getByName(code)

/** Lit et vérifie une création : { classement, duels }, ou un message d'erreur. */
async function lireUneCreation(requete: Request): Promise<{ classement: boolean; duels: string[] } | string> {
  const texte = await requete.text()
  if (texte.length > TAILLE_MAX) return 'envoi trop long'
  let corps: unknown
  try {
    corps = JSON.parse(texte)
  } catch {
    return 'JSON illisible'
  }
  if (typeof corps !== 'object' || corps === null) return 'JSON illisible'
  const { classement, duels } = corps as Record<string, unknown>
  if (typeof classement !== 'boolean') return 'classement manquant'
  // Le serveur ne croit pas les Duels sur parole : 10 paires jouables, toutes différentes (comme le Taux d'erreur).
  if (!duelsDUnePartieLibre(duels, GESTES_CALCULES, DUELS_THEMATIQUES)) return 'ces Duels ne viennent pas d’un tirage'
  return { classement, duels: duels as string[] }
}

/** Répond à une requête vers /api/seance/… ; null si l'adresse n'est pas celle d'une Séance. */
export async function traiterUneSeance(requete: Request, env: EnvironnementDesSeances): Promise<Response | null> {
  const { pathname } = new URL(requete.url)
  if (pathname !== ADRESSE_DES_SEANCES && !pathname.startsWith(`${ADRESSE_DES_SEANCES}/`)) return null
  const espace = env.SEANCE
  if (!espace) {
    console.error('Serveur : aucun Durable Object (binding SEANCE) dans wrangler.jsonc pour ce déploiement.')
    return erreur(503, 'Séances indisponibles')
  }

  // La création d'une Séance.
  if (pathname === ADRESSE_DES_SEANCES) {
    if (requete.method !== 'POST') return erreur(405, 'méthode non prise en charge')
    // Comme pour le Rang du jour : exiger du JSON empêche un formulaire d'un autre site de créer des Séances.
    if (!requete.headers.get('Content-Type')?.startsWith('application/json')) return erreur(415, 'JSON attendu')
    const creation = await lireUneCreation(requete)
    if (typeof creation === 'string') return erreur(400, creation)
    try {
      for (let essai = 0; essai < ESSAIS_DE_CODE; essai++) {
        const code = tirerUnCode(hasardCryptographique)
        const resultat = await objetDeLaSeance(espace, code, env).creer({ code, ...creation })
        if ('jetonAnimateur' in resultat) return json(201, { code, jetonAnimateur: resultat.jetonAnimateur })
      }
      return erreur(503, 'aucun code libre')
    } catch (panne) {
      // Quota du jour des Durable Objects épuisé (100 000 requêtes, 100 000 lignes écrites) : réessayer demain.
      console.error('Séance : création impossible.', panne)
      return erreur(503, 'Séances indisponibles')
    }
  }

  // /api/seance/<code> et /api/seance/<code>/connexion
  const [, code, suite, ...reste] = pathname.slice(ADRESSE_DES_SEANCES.length).split('/')
  if (!estUnCodeDeSeance(code) || reste.length > 0 || (suite !== undefined && suite !== 'connexion')) {
    return erreur(404, 'adresse inconnue')
  }
  if (requete.method !== 'GET') return erreur(405, 'méthode non prise en charge')
  const objet = objetDeLaSeance(espace, code, env)
  try {
    if (suite === 'connexion') {
      if (requete.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return erreur(426, 'WebSocket attendue')
      return await objet.fetch(requete)
    }
    const informations = await objet.informations()
    return informations ? json(200, { code, ...informations }) : erreur(404, 'Séance inconnue')
  } catch (panne) {
    console.error('Séance : l’objet ne répond pas.', panne)
    return erreur(503, 'Séances indisponibles')
  }
}
