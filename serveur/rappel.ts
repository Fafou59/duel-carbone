/**
 * Le Rappel du matin (ADR 0008, issue 69) : chaque jour à 7 h, heure de Paris, une notification push pour tous ceux
 * qui l'ont demandée. Le serveur reste « aveugle » : il garde la liste des abonnements push (table « abonnements »,
 * migration 0003) et, pour chacun, le jour de la dernière ouverture du jeu, sans aucun lien avec les Parties.
 *
 * Les adresses, appelées par le jeu (src/navigateur/rappel.ts) :
 * - GET    /api/rappel/cle          : la clé publique VAPID, dont le navigateur a besoin pour s'abonner ;
 * - POST   /api/rappel/abonnement   : à l'activation, puis à chaque ouverture du jeu : range l'abonnement et
 *                                     note le jour (c'est la seule trace de visite gardée) ;
 * - DELETE /api/rappel/abonnement   : « Arrêter le Rappel » : efface l'abonnement ;
 * - POST   /api/rappel/essai        : sur les aperçus seulement (RAPPEL_ESSAI=oui), envoie le Rappel tout de suite
 *                                     à cet appareil, pour l'essayer sans attendre 7 h (les aperçus de Cloudflare
 *                                     ne lancent ni la tâche planifiée ni la file).
 *
 * L'envoi du matin, en deux temps, à cause des limites du plan gratuit (10 ms de calcul et 50 envois par exécution) :
 * 1. la tâche planifiée (Cron, en heure UTC) vérifie qu'il est 7 h à Paris, efface les abonnements oubliés depuis
 *    90 jours, puis découpe la liste en lots de 25 abonnements, rangés dans une file (Queue) : `planifierLeRappel` ;
 * 2. la file confie chaque lot à une exécution à part, qui chiffre et envoie ses 25 Rappels : `envoyerLesLots`.
 *    Un envoi coûte au plus 0,33 ms de calcul (prototype du ticket 144) : 25 envois font environ 8 ms.
 */
import { decalerJour, heureAParis, jourDeParis, numeroDuJour, secondesAvantMinuitAParis } from '../src/domaine/jour.ts'
import { HEURE_DU_RAPPEL, JOURS_DE_CONSERVATION } from '../src/domaine/rappel.ts'
import type { BaseD1 } from './base.ts'
import { depuisBase64Url, importerClePrivee, preparerEnvoi, type ClesVapid } from './web-push.ts'

/** Le nombre d'abonnements d'un lot : 25 envois tiennent dans les 10 ms de calcul d'une exécution. */
export const ENVOIS_PAR_LOT = 25

/** Un lot à envoyer : les abonnements dont le numéro de ligne va de `de` à `a`, pour le Rappel du jour `jour`. */
export type Lot = { jour: string; de: number; a: number }

/** Le strict nécessaire d'une file Cloudflare (Queue), comme BaseD1 pour la base : les tests la remplacent. */
export type FileDuRappel = { sendBatch: (messages: { body: Lot }[]) => Promise<unknown> }

/** Ce que Cloudflare passe au Worker pour le Rappel (wrangler.jsonc et secrets). */
export type EnvironnementDuRappel = {
  BASE?: BaseD1
  FILE_DU_RAPPEL?: FileDuRappel
  /** Les clés VAPID, en secrets (jamais dans le dépôt) : `wrangler secret put VAPID_CLE_PUBLIQUE`, etc. */
  VAPID_CLE_PUBLIQUE?: string
  VAPID_CLE_PRIVEE?: string
  /** « oui » sur les aperçus seulement (wrangler.jsonc, previews.vars) : ouvre l'adresse d'essai. */
  RAPPEL_ESSAI?: string
}

/** Ce que Cloudflare passe en 3e argument : waitUntil garde le Worker en vie après la réponse (l'essai différé). */
export type Contexte = { waitUntil: (promesse: Promise<unknown>) => void }

/** La façon d'envoyer une requête au service push : fetch, sauf dans les tests. */
export type Transport = (requete: Request) => Promise<Response>

/** Un abonnement tel que la base le garde. */
type Abonne = { adresse: string; cle: string; secret: string }

const json = (statut: number, corps: unknown) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })

const erreur = (statut: number, message: string) => json(statut, { erreur: message })

/** Un abonnement fait environ 400 caractères : au-delà, ce n'est pas le jeu qui écrit. */
const TAILLE_MAX = 2000
const LONGUEUR_MAX_ADRESSE = 1000

/**
 * Les services push des navigateurs : Apple (Safari, iPhone), Google (Chrome, Edge sur Android, Samsung Internet,
 * Opera…), Mozilla (Firefox) et Microsoft (Edge sur ordinateur). Le serveur n'écrit qu'à eux : sans cette liste,
 * n'importe qui pourrait lui faire envoyer une requête chaque matin vers l'adresse de son choix.
 */
const SERVICES_PUSH = [
  /^web\.push\.apple\.com$/,
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
]

/** Vrai si l'adresse est bien celle d'un service push connu, en https. */
export function estUneAdresseDePush(adresse: unknown): adresse is string {
  if (typeof adresse !== 'string' || adresse.length > LONGUEUR_MAX_ADRESSE) return false
  try {
    const url = new URL(adresse)
    return url.protocol === 'https:' && SERVICES_PUSH.some((service) => service.test(url.hostname))
  } catch {
    return false
  }
}

/** La longueur en octets d'une clé en base64url, ou -1 si elle est illisible. */
function octets(texte: unknown): number {
  if (typeof texte !== 'string' || texte.length > 200) return -1
  try {
    return depuisBase64Url(texte).length
  } catch {
    return -1
  }
}

/**
 * L'abonnement envoyé par le jeu (PushSubscription.toJSON()), vérifié : une adresse de service push, une clé
 * publique de 65 octets (un point de la courbe P-256) et un secret de 16 octets. Sinon, null.
 */
export function lireAbonnement(brut: unknown): Abonne | null {
  const a = brut as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null
  if (!a || !estUneAdresseDePush(a.endpoint)) return null
  if (octets(a.keys?.p256dh) !== 65 || octets(a.keys?.auth) !== 16) return null
  return { adresse: a.endpoint, cle: a.keys!.p256dh as string, secret: a.keys!.auth as string }
}

async function lireJson(requete: Request): Promise<Record<string, unknown> | null> {
  const texte = await requete.text()
  if (texte.length > TAILLE_MAX) return null
  try {
    const brut: unknown = JSON.parse(texte)
    return typeof brut === 'object' && brut !== null ? (brut as Record<string, unknown>) : null
  } catch {
    return null
  }
}

// « ON CONFLICT … DO UPDATE » : un abonnement déjà connu garde sa ligne (et son numéro, qui sert aux lots) ; on
// met seulement à jour ses clés (le navigateur peut les changer) et le jour de la dernière ouverture.
const RANGER = `INSERT INTO abonnements (adresse, cle, secret, derniere_ouverture) VALUES (?, ?, ?, ?)
  ON CONFLICT (adresse) DO UPDATE SET cle = excluded.cle, secret = excluded.secret,
    derniere_ouverture = excluded.derniere_ouverture`
const EFFACER = 'DELETE FROM abonnements WHERE adresse = ?'
const OUBLIER = 'DELETE FROM abonnements WHERE derniere_ouverture < ?'
const NUMEROS = 'SELECT rowid AS numero FROM abonnements ORDER BY rowid'
const LIRE_UN_LOT = `SELECT adresse, cle, secret FROM abonnements WHERE rowid BETWEEN ? AND ? ORDER BY rowid LIMIT ${ENVOIS_PAR_LOT}`
const LIRE_UN = 'SELECT adresse, cle, secret FROM abonnements WHERE adresse = ?'

/** Le Rappel du jour, tel que décidé dans l'ADR 0008 (le service worker, public/rappel-sw.js, l'affiche tel quel). */
export function messageDuJour(maintenant: Date): string {
  return JSON.stringify({
    titre: `Duel Carbone n° ${numeroDuJour(jourDeParis(maintenant))}`,
    texte: 'C’est l’heure du Duel Carbone ! ⚔️',
    adresse: '/?ref=notification',
  })
}

const clesDe = (env: EnvironnementDuRappel): ClesVapid | null =>
  env.VAPID_CLE_PUBLIQUE && env.VAPID_CLE_PRIVEE ? { publique: env.VAPID_CLE_PUBLIQUE, privee: env.VAPID_CLE_PRIVEE } : null

/** Ce qu'a donné l'envoi d'un lot : les réponses des services push, et les abonnements à effacer. */
export type BilanDEnvoi = { statuts: number[]; invalides: string[] }

/**
 * Chiffre et envoie le Rappel du jour à quelques abonnés, tous en même temps. Le Rappel expire à minuit (TTL) :
 * un appareil éteint toute la journée ne recevra jamais l'annonce du Duel de la veille.
 */
export async function envoyerAuxAbonnes(
  abonnes: Abonne[],
  cles: ClesVapid,
  maintenant: Date,
  transport: Transport = fetch,
): Promise<BilanDEnvoi> {
  if (abonnes.length === 0) return { statuts: [], invalides: [] }
  const clePrivee = await importerClePrivee(cles)
  const message = messageDuJour(maintenant)
  const ttl = secondesAvantMinuitAParis(maintenant)
  const maintenantS = Math.floor(maintenant.getTime() / 1000)
  // Un seul jeton VAPID signé par service push (Apple, Google…) pour tout le lot.
  const jetons = new Map<string, Promise<string>>()
  const statuts = await Promise.all(
    abonnes.map(async ({ adresse, cle, secret }) => {
      try {
        const requete = await preparerEnvoi(
          { endpoint: adresse, keys: { p256dh: cle, auth: secret } },
          message,
          cles,
          clePrivee,
          // Topic : un Rappel encore en attente chez le service push (téléphone éteint) est remplacé, pas doublé.
          { ttl, urgence: 'normal', sujet: 'rappel-du-matin', jetons },
          maintenantS,
        )
        const reponse = await transport(requete)
        // On ne lit pas la réponse : seul son code compte (et la lire coûterait du calcul).
        await reponse.body?.cancel()
        return reponse.status
      } catch {
        // Un service push injoignable ne doit pas empêcher les autres envois du lot.
        return 0
      }
    }),
  )
  // 404 ou 410 : l'abonnement n'existe plus (Rappel coupé dans les réglages, jeu désinstallé) → on l'efface.
  const invalides = abonnes.filter((_, i) => statuts[i] === 404 || statuts[i] === 410).map((a) => a.adresse)
  return { statuts, invalides }
}

async function effacer(base: BaseD1, adresses: string[]): Promise<void> {
  if (adresses.length === 0) return
  await base.batch(adresses.map((adresse) => base.prepare(EFFACER).bind(adresse)))
}

/** Un résumé lisible des réponses d'un lot, pour les journaux : jamais d'adresse, seulement des nombres. */
const resume = (statuts: number[]) => {
  const parCode = new Map<number, number>()
  for (const s of statuts) parCode.set(s, (parCode.get(s) ?? 0) + 1)
  return [...parCode].map(([code, n]) => `${n} × ${code === 0 ? 'injoignable' : code}`).join(', ')
}

/**
 * La tâche planifiée du matin. Cloudflare compte en heure UTC : elle est lancée à 5 h et à 6 h UTC (wrangler.jsonc),
 * et ne fait quelque chose qu'à celle des deux où il est 7 h à Paris (6 h UTC l'hiver, 5 h UTC l'été).
 * Rend le nombre de lots mis dans la file (null si ce n'était pas l'heure).
 */
export async function planifierLeRappel(env: EnvironnementDuRappel, maintenant = new Date()): Promise<number | null> {
  if (heureAParis(maintenant) !== HEURE_DU_RAPPEL) return null
  const { BASE: base, FILE_DU_RAPPEL: file } = env
  if (!base) {
    console.error('Rappel du matin : aucune base D1 (binding BASE).')
    return 0
  }
  const jour = jourDeParis(maintenant)
  // D'abord, les abonnements oubliés : sans ouverture du jeu depuis plus de 90 jours, on les efface (ADR 0008).
  await base.prepare(OUBLIER).bind(decalerJour(jour, -JOURS_DE_CONSERVATION)).all()
  if (!file || !clesDe(env)) {
    console.error('Rappel du matin : file (FILE_DU_RAPPEL) ou clés VAPID absentes, rien n’est envoyé.')
    return 0
  }
  // Les numéros de ligne seulement (de petits entiers) : chaque lot dit de quel numéro à quel numéro il va, et
  // l'exécution qui l'envoie relit elle-même ses 25 abonnements. Les abonnements ne quittent donc jamais la base
  // (dans l'Union européenne) pour la file.
  const { results } = await base.prepare(NUMEROS).all<{ numero: number }>()
  const lots: { body: Lot }[] = []
  for (let i = 0; i < results.length; i += ENVOIS_PAR_LOT) {
    const fin = Math.min(i + ENVOIS_PAR_LOT, results.length) - 1
    lots.push({ body: { jour, de: results[i].numero, a: results[fin].numero } })
  }
  // Une file accepte au plus 100 messages par envoi groupé.
  for (let i = 0; i < lots.length; i += 100) await file.sendBatch(lots.slice(i, i + 100))
  console.log(`Rappel du matin : ${results.length} abonnements, ${lots.length} lots dans la file.`)
  return lots.length
}

/**
 * Les lots que la file confie à une exécution (un seul à la fois, wrangler.jsonc) : chacun relit ses abonnements,
 * leur envoie le Rappel et efface ceux que le service push déclare invalides. Un lot arrivé après minuit est
 * abandonné : ce n'est plus le bon Duel. Si la base ne répond pas, l'erreur remonte et la file réessaiera.
 */
export async function envoyerLesLots(
  messages: readonly { body: Lot }[],
  env: EnvironnementDuRappel,
  maintenant = new Date(),
  transport: Transport = fetch,
): Promise<void> {
  const { BASE: base } = env
  const cles = clesDe(env)
  if (!base || !cles) {
    console.error('Rappel du matin : base ou clés VAPID absentes, lot abandonné.')
    return
  }
  for (const { body: lot } of messages) {
    if (lot.jour !== jourDeParis(maintenant)) continue
    const { results } = await base.prepare(LIRE_UN_LOT).bind(lot.de, lot.a).all<Abonne>()
    const { statuts, invalides } = await envoyerAuxAbonnes(results, cles, maintenant, transport)
    try {
      await effacer(base, invalides)
    } catch (panne) {
      // Les Rappels sont partis : ne pas faire échouer le lot (la file le renverrait à tout le monde). Les
      // abonnements invalides seront effacés demain, à leur prochaine réponse 404 ou 410.
      console.error('Rappel du matin : effacement impossible.', panne)
    }
    console.log(`Rappel du matin, lot ${lot.de}-${lot.a} : ${resume(statuts)}.`)
  }
}

/** Répond aux adresses /api/rappel/… ; rend null pour toute autre adresse (elle est pour api.ts ou seance-api.ts). */
export async function traiterLeRappel(
  requete: Request,
  env: EnvironnementDuRappel,
  ctx?: Contexte,
  maintenant = new Date(),
  transport: Transport = fetch,
): Promise<Response | null> {
  const { pathname } = new URL(requete.url)
  if (!pathname.startsWith('/api/rappel/')) return null
  const route = `${requete.method} ${pathname}`
  const cles = clesDe(env)
  const essai = env.RAPPEL_ESSAI === 'oui'

  if (route === 'GET /api/rappel/cle') {
    // Sans clés, pas de Rappel : le jeu ne le propose pas, et se joue normalement.
    if (!cles) return erreur(503, 'Rappel indisponible')
    return json(200, essai ? { cle: cles.publique, essai: true } : { cle: cles.publique })
  }

  const ecriture = ['POST /api/rappel/abonnement', 'DELETE /api/rappel/abonnement', 'POST /api/rappel/essai']
  if (!ecriture.includes(route) || (route === 'POST /api/rappel/essai' && !essai)) return erreur(404, 'adresse inconnue')
  // Comme pour le Rang du jour : exiger du JSON empêche un formulaire d'un autre site d'écrire à la place du jeu.
  if (!requete.headers.get('Content-Type')?.startsWith('application/json')) return erreur(415, 'JSON attendu')
  const { BASE: base } = env
  if (!base || !cles) return erreur(503, 'Rappel indisponible')
  const corps = await lireJson(requete)
  if (!corps) return erreur(400, 'JSON illisible ou trop long')

  try {
    if (route === 'DELETE /api/rappel/abonnement') {
      if (!estUneAdresseDePush(corps.endpoint)) return erreur(400, 'adresse d’abonnement illisible')
      await base.prepare(EFFACER).bind(corps.endpoint).all()
      return json(200, { efface: true })
    }

    if (route === 'POST /api/rappel/abonnement') {
      const abonne = lireAbonnement(corps)
      if (!abonne) return erreur(422, 'abonnement illisible, ou service push inconnu')
      await base.prepare(RANGER).bind(abonne.adresse, abonne.cle, abonne.secret, jourDeParis(maintenant)).all()
      return json(200, { abonne: true })
    }

    // L'essai (aperçus seulement) : le Rappel du jour à cet appareil, dans 10 s (le temps de fermer le jeu, pour
    // le voir arriver écran verrouillé). Attendre ne coûte pas de calcul.
    if (!estUneAdresseDePush(corps.endpoint)) return erreur(400, 'adresse d’abonnement illisible')
    const { results } = await base.prepare(LIRE_UN).bind(corps.endpoint).all<Abonne>()
    if (results.length === 0) return erreur(404, 'abonnement inconnu')
    const envoi = async (instant: Date) => {
      const { statuts, invalides } = await envoyerAuxAbonnes(results, cles, instant, transport)
      await effacer(base, invalides)
      console.log(`Rappel du matin, essai : ${resume(statuts)}.`)
    }
    if (ctx) {
      ctx.waitUntil(new Promise((fini) => setTimeout(fini, 10_000)).then(() => envoi(new Date())))
      return json(202, { programme: 'dans 10 s' })
    }
    await envoi(maintenant)
    return json(200, { envoye: true })
  } catch (panne) {
    console.error('Rappel du matin : la base D1 ne répond pas.', panne)
    return erreur(503, 'base indisponible')
  }
}
