/**
 * PROTOTYPE (ticket 144, branche prototype/rappel, jetable) : le Rappel du matin de l'ADR 0008, envoyé à la main.
 *
 * - GET    /api/rappel/cle                  : la clé publique VAPID (le navigateur en a besoin pour s'abonner) ;
 * - POST   /api/rappel/abonnement           : range l'abonnement en D1 (base des aperçus) ;
 * - DELETE /api/rappel/abonnement           : l'efface ;
 * - POST   /api/rappel/envoyer              : envoie le Rappel à cet abonnement (ou à tous), tout de suite ou dans
 *                                            15 s (le temps de fermer le jeu), jusqu'à minuit ou avec un TTL court ;
 * - GET    /api/rappel/charge?n=50          : prépare n envois (chiffrement + signature) SANS les envoyer, pour
 *                                            voir si le calcul de 50 envois tient dans les 10 ms du plan gratuit.
 *
 * La table est créée à la volée (pas de migration : la base des aperçus est partagée et ce code sera jeté).
 * À effacer à la fin : npx wrangler d1 execute duel-carbone --remote --preview --command "DROP TABLE prototype_rappel"
 */
import { jourDeParis, numeroDuJour, secondesAvantMinuitAParis } from '../src/domaine/jour.ts'
import { importerClePrivee, preparerEnvoi, versBase64Url, type AbonnementPush, type ClesVapid } from './web-push.ts'

type Requete = { bind: (...v: (string | number)[]) => Requete; all: <T>() => Promise<{ results: T[] }>; run: () => Promise<unknown> }
type Base = { prepare: (sql: string) => Requete }

export type EnvironnementDuRappel = {
  BASE?: Base
  VAPID_CLE_PUBLIQUE?: string
  VAPID_CLE_PRIVEE?: string
}

/** Ce que Cloudflare passe en 3e argument : waitUntil garde le Worker en vie après la réponse (envoi différé). */
export type Contexte = { waitUntil: (promesse: Promise<unknown>) => void }

const json = (statut: number, corps: unknown) =>
  new Response(JSON.stringify(corps, null, 2), {
    status: statut,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })

const CREER = `CREATE TABLE IF NOT EXISTS prototype_rappel (
  endpoint TEXT PRIMARY KEY, p256dh TEXT NOT NULL, auth TEXT NOT NULL, cree_le TEXT NOT NULL
)`

type Ligne = { endpoint: string; p256dh: string; auth: string }

function lireAbonnement(brut: unknown): AbonnementPush | null {
  const a = brut as Partial<AbonnementPush> | null
  if (!a || typeof a.endpoint !== 'string' || !a.endpoint.startsWith('https://')) return null
  if (typeof a.keys?.p256dh !== 'string' || typeof a.keys?.auth !== 'string') return null
  return { endpoint: a.endpoint, keys: { p256dh: a.keys.p256dh, auth: a.keys.auth } }
}

/** Le service push d'un abonnement, lisible : web.push.apple.com, fcm.googleapis.com, updates.push.services.mozilla.com… */
const service = (endpoint: string) => new URL(endpoint).host

/** Le Rappel du jour, tel que décidé dans l'ADR 0008 (le service worker l'affiche tel quel). */
function messageDuJour(maintenant: Date) {
  return JSON.stringify({
    titre: `Duel Carbone n° ${numeroDuJour(jourDeParis(maintenant))}`,
    texte: 'C’est l’heure du Duel Carbone ! ⚔️',
    adresse: '/?ref=notification',
  })
}

async function envoyer(abonnements: AbonnementPush[], cles: ClesVapid, ttl: number, base: Base) {
  const maintenant = new Date()
  const clePrivee = await importerClePrivee(cles)
  const message = messageDuJour(maintenant)
  const jetons = new Map<string, Promise<string>>()
  return Promise.all(
    abonnements.map(async (abonnement) => {
      const requete = await preparerEnvoi(
        abonnement,
        message,
        cles,
        clePrivee,
        { ttl, urgence: 'normal', sujet: 'rappel-du-matin', jetons },
        Math.floor(maintenant.getTime() / 1000),
      )
      let reponse: Response
      try {
        reponse = await fetch(requete)
      } catch (e) {
        // Un service push injoignable ne doit pas empêcher les autres envois.
        return { service: service(abonnement.endpoint), statut: 0, reponse: String(e) }
      }
      const corps = await reponse.text()
      // 404 ou 410 : l'abonnement n'existe plus (notifications coupées, jeu désinstallé) → on l'efface (ADR 0008).
      if (reponse.status === 404 || reponse.status === 410) {
        await base.prepare('DELETE FROM prototype_rappel WHERE endpoint = ?').bind(abonnement.endpoint).run()
      }
      return { service: service(abonnement.endpoint), statut: reponse.status, reponse: corps.slice(0, 300) }
    }),
  )
}

export async function traiterLeRappel(requete: Request, env: EnvironnementDuRappel, ctx?: Contexte): Promise<Response | null> {
  const adresse = new URL(requete.url)
  if (!adresse.pathname.startsWith('/api/rappel/')) return null
  const route = `${requete.method} ${adresse.pathname}`
  const { BASE: base, VAPID_CLE_PUBLIQUE: publique, VAPID_CLE_PRIVEE: privee } = env
  if (!base || !publique || !privee) {
    return json(503, { erreur: 'base D1 ou clés VAPID absentes (wrangler preview secret put VAPID_CLE_…)' })
  }
  const cles = { publique, privee }
  await base.prepare(CREER).run()

  if (route === 'GET /api/rappel/cle') return json(200, { cle: publique })

  if (route === 'POST /api/rappel/abonnement' || route === 'DELETE /api/rappel/abonnement') {
    const abonnement = lireAbonnement(await requete.json().catch(() => null))
    if (!abonnement) return json(400, { erreur: 'abonnement illisible' })
    if (requete.method === 'DELETE') {
      await base.prepare('DELETE FROM prototype_rappel WHERE endpoint = ?').bind(abonnement.endpoint).run()
      return json(200, { efface: true })
    }
    await base
      .prepare('INSERT OR REPLACE INTO prototype_rappel (endpoint, p256dh, auth, cree_le) VALUES (?, ?, ?, ?)')
      .bind(abonnement.endpoint, abonnement.keys.p256dh, abonnement.keys.auth, new Date().toISOString())
      .run()
    return json(200, { range: true, service: service(abonnement.endpoint) })
  }

  if (route === 'POST /api/rappel/envoyer') {
    const corps = (await requete.json().catch(() => ({}))) as { endpoint?: string; ttl?: number; delai?: number }
    const { results } = corps.endpoint
      ? await base.prepare('SELECT endpoint, p256dh, auth FROM prototype_rappel WHERE endpoint = ?').bind(corps.endpoint).all<Ligne>()
      : await base.prepare('SELECT endpoint, p256dh, auth FROM prototype_rappel').all<Ligne>()
    const abonnements = results.map((l) => ({ endpoint: l.endpoint, keys: { p256dh: l.p256dh, auth: l.auth } }))
    if (abonnements.length === 0) return json(404, { erreur: 'aucun abonnement rangé' })
    // Par défaut, le Rappel expire à minuit (heure de Paris), comme décidé.
    const ttl = typeof corps.ttl === 'number' ? corps.ttl : secondesAvantMinuitAParis(new Date())
    const delai = Math.min(Math.max(Number(corps.delai) || 0, 0), 20)
    if (delai > 0 && ctx) {
      // Le temps de fermer le jeu : le Worker répond tout de suite et envoie 15 s plus tard (attendre ne coûte
      // pas de calcul). On voit ainsi la notification arriver sur un téléphone verrouillé, jeu fermé.
      ctx.waitUntil(
        new Promise((r) => setTimeout(r, delai * 1000)).then(() => envoyer(abonnements, cles, ttl, base)),
      )
      return json(202, { programme: `dans ${delai} s`, abonnements: abonnements.length, ttl })
    }
    const debut = Date.now()
    const resultats = await envoyer(abonnements, cles, ttl, base)
    // Dans un Worker, l'horloge n'avance pas pendant le calcul (protection contre les attaques par mesure du
    // temps) : cette durée ne compte que l'attente du réseau. Le temps de calcul se lit dans les journaux.
    return json(200, { ttl, dureeMurale: `${Date.now() - debut} ms (attente réseau)`, resultats })
  }

  if (route === 'GET /api/rappel/charge') {
    const n = Math.min(Math.max(Number(adresse.searchParams.get('n')) || 50, 1), 1000)
    // Un faux téléphone (une clé publique ECDH et un secret), généré une fois : on ne mesure que le calcul.
    const faux = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
    const p256dh = new Uint8Array((await crypto.subtle.exportKey('raw', faux.publicKey)) as ArrayBuffer)
    const abonnement = {
      endpoint: 'https://web.push.apple.com/prototype',
      keys: { p256dh: versBase64Url(p256dh), auth: versBase64Url(crypto.getRandomValues(new Uint8Array(16))) },
    }
    const clePrivee = await importerClePrivee(cles)
    const message = messageDuJour(new Date())
    // ?jeton=chaque : une signature VAPID par envoi ; sinon, une seule pour tout le lot (même service push).
    const unJetonParEnvoi = adresse.searchParams.get('jeton') === 'chaque'
    const jetons = unJetonParEnvoi ? undefined : new Map<string, Promise<string>>()
    let octets = 0
    for (let i = 0; i < n; i++) {
      const envoi = await preparerEnvoi(abonnement, message, cles, clePrivee, { ttl: 3600, jetons }, Math.floor(Date.now() / 1000))
      octets += (await envoi.arrayBuffer()).byteLength
    }
    // Si le calcul dépasse la limite du plan, Cloudflare coupe l'exécution (erreur 1102) : on n'arrive jamais ici.
    return json(200, { prepares: n, jeton: unJetonParEnvoi ? 'un par envoi' : 'un pour le lot', octets, conclusion: `${n} envois préparés sans dépasser la limite de calcul` })
  }

  return json(404, { erreur: `inconnu : ${route}` })
}
