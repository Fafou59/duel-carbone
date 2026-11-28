// @vitest-environment node
// (Le serveur ne tourne pas dans un navigateur : pas besoin de jsdom, et node:sqlite n'existe que dans Node.)
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { baseDeTest } from './base-de-test.ts'
import {
  ENVOIS_PAR_LOT,
  envoyerLesLots,
  estUneAdresseDePush,
  planifierLeRappel,
  traiterLeRappel,
  type EnvironnementDuRappel,
  type Lot,
} from './rappel.ts'
import { versBase64Url, type PaireDeCles } from './web-push.ts'

/** Une paire de clés VAPID toute neuve, au format des secrets du Worker (base64url). */
async function clesVapid() {
  const paire = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])) as PaireDeCles
  const publique = new Uint8Array((await crypto.subtle.exportKey('raw', paire.publicKey)) as ArrayBuffer)
  const jwk = (await crypto.subtle.exportKey('jwk', paire.privateKey)) as { d?: string }
  return { VAPID_CLE_PUBLIQUE: versBase64Url(publique), VAPID_CLE_PRIVEE: jwk.d! }
}

/** La clé publique d'un faux navigateur (un vrai point de la courbe, pour que le chiffrement réussisse). */
async function clesDuNavigateur() {
  const paire = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as PaireDeCles
  return {
    p256dh: versBase64Url(new Uint8Array((await crypto.subtle.exportKey('raw', paire.publicKey)) as ArrayBuffer)),
    auth: versBase64Url(crypto.getRandomValues(new Uint8Array(16))),
  }
}

const abonnement = async (n: number, service = 'https://fcm.googleapis.com/fcm/send/') => ({
  endpoint: `${service}appareil-${n}`,
  keys: await clesDuNavigateur(),
})

// Le 1er décembre 2026 (l'hiver : Paris est à UTC+1), le Duel Carbone du jour n° 18.
const HIVER_7H = new Date('2026-12-01T06:00:00Z')
const HIVER_6H = new Date('2026-12-01T05:00:00Z')
// Le 1er juin 2027 (l'été : Paris est à UTC+2).
const ETE_7H = new Date('2027-06-01T05:00:00Z')
const ETE_8H = new Date('2027-06-01T06:00:00Z')

const requete = (methode: string, chemin: string, corps?: unknown, entetes: Record<string, string> = { 'Content-Type': 'application/json' }) =>
  new Request(`https://duelcarbone.fr${chemin}`, {
    method: methode,
    headers: corps === undefined ? {} : entetes,
    body: corps === undefined ? undefined : JSON.stringify(corps),
  })

/** Un faux service push : il note chaque requête reçue, et répond 201 (ou le code prévu pour une adresse). */
function fauxServicePush(codes: Record<string, number> = {}) {
  const recues: Request[] = []
  const transport = vi.fn(async (r: Request) => {
    recues.push(r)
    return new Response(null, { status: codes[r.url] ?? 201 })
  })
  return { recues, transport }
}

describe('Le Rappel du matin, côté serveur (ADR 0008)', () => {
  let base: ReturnType<typeof baseDeTest>
  let env: EnvironnementDuRappel
  let lots: Lot[]

  beforeEach(async () => {
    base = baseDeTest()
    lots = []
    env = {
      BASE: base,
      FILE_DU_RAPPEL: { sendBatch: async (messages) => void lots.push(...messages.map((m) => m.body)) },
      ...(await clesVapid()),
    }
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  const lignes = () =>
    base.sqlite.prepare('SELECT rowid AS numero, adresse, derniere_ouverture FROM abonnements ORDER BY rowid').all() as {
      numero: number
      adresse: string
      derniere_ouverture: string
    }[]

  const sAbonner = async (corps: unknown, maintenant = HIVER_7H) =>
    (await traiterLeRappel(requete('POST', '/api/rappel/abonnement', corps), env, undefined, maintenant))!

  describe('les adresses du jeu', () => {
    it('laisse passer les autres adresses de /api/', async () => {
      expect(await traiterLeRappel(requete('GET', '/api/rang-du-jour'), env)).toBeNull()
    })

    it('donne la clé publique VAPID, et rien sans clés', async () => {
      const reponse = (await traiterLeRappel(requete('GET', '/api/rappel/cle'), env))!
      expect(await reponse.json()).toEqual({ cle: env.VAPID_CLE_PUBLIQUE })
      expect(reponse.headers.get('Cache-Control')).toBe('no-store')
      expect((await traiterLeRappel(requete('GET', '/api/rappel/cle'), { BASE: base }))!.status).toBe(503)
    })

    it('range un abonnement avec le jour de Paris, et le met à jour à chaque ouverture sans changer sa ligne', async () => {
      const a = await abonnement(1)
      expect((await sAbonner(a)).status).toBe(200)
      // 23 h 30 à Paris le 1er décembre, c'est encore le 1er ; 0 h 30 le 3, c'est le 3.
      await sAbonner(await abonnement(2), new Date('2026-12-01T22:30:00Z'))
      expect(lignes()).toEqual([
        { numero: 1, adresse: a.endpoint, derniere_ouverture: '2026-12-01' },
        { numero: 2, adresse: 'https://fcm.googleapis.com/fcm/send/appareil-2', derniere_ouverture: '2026-12-01' },
      ])
      await sAbonner(a, new Date('2026-12-02T23:30:00Z'))
      expect(lignes()[0]).toEqual({ numero: 1, adresse: a.endpoint, derniere_ouverture: '2026-12-03' })
      expect(lignes()).toHaveLength(2)
    })

    it('ne garde que l’adresse, les deux clés et le jour : rien sur les Parties ni sur l’appareil', () => {
      const colonnes = base.sqlite.prepare('PRAGMA table_info(abonnements)').all().map((c) => (c as { name: string }).name)
      expect(colonnes).toEqual(['adresse', 'cle', 'secret', 'derniere_ouverture'])
    })

    it.each([
      ['Apple', 'https://web.push.apple.com/QGuQyavXu', true],
      ['Google', 'https://fcm.googleapis.com/fcm/send/abc', true],
      ['Mozilla', 'https://updates.push.services.mozilla.com/wpush/v2/abc', true],
      ['Microsoft', 'https://wns2-par02p.notify.windows.com/w/?token=abc', true],
      ['un autre site', 'https://exemple.fr/push', false],
      ['un faux Google', 'https://fcm.googleapis.com.exemple.fr/push', false],
      ['sans https', 'http://fcm.googleapis.com/fcm/send/abc', false],
    ])('n’écrit qu’aux services push connus (%s)', (_, adresse, connu) => {
      expect(estUneAdresseDePush(adresse)).toBe(connu)
    })

    it('refuse un abonnement illisible, vers un autre site ou envoyé sans JSON', async () => {
      const bon = await abonnement(1)
      expect((await sAbonner({ ...bon, endpoint: 'https://exemple.fr/push' })).status).toBe(422)
      expect((await sAbonner({ ...bon, keys: { p256dh: 'abc', auth: bon.keys.auth } })).status).toBe(422)
      expect((await sAbonner({ ...bon, keys: { p256dh: bon.keys.p256dh, auth: '!!!' } })).status).toBe(422)
      const sansJson = requete('POST', '/api/rappel/abonnement', bon, { 'Content-Type': 'text/plain' })
      expect((await traiterLeRappel(sansJson, env))!.status).toBe(415)
      expect(lignes()).toEqual([])
    })

    it('efface l’abonnement quand le joueur arrête le Rappel', async () => {
      const a = await abonnement(1)
      await sAbonner(a)
      await sAbonner(await abonnement(2))
      const reponse = (await traiterLeRappel(requete('DELETE', '/api/rappel/abonnement', { endpoint: a.endpoint }), env))!
      expect(reponse.status).toBe(200)
      expect(lignes().map((l) => l.adresse)).toEqual(['https://fcm.googleapis.com/fcm/send/appareil-2'])
    })

    it('répond 503 sans base ni clés : le jeu ne propose alors pas le Rappel', async () => {
      const reponse = await traiterLeRappel(requete('POST', '/api/rappel/abonnement', await abonnement(1)), {})
      expect(reponse!.status).toBe(503)
    })
  })

  describe('la tâche planifiée du matin', () => {
    it('n’agit qu’à 7 h à Paris, été comme hiver', async () => {
      await sAbonner(await abonnement(1))
      expect(await planifierLeRappel(env, HIVER_6H)).toBeNull()
      expect(await planifierLeRappel(env, ETE_8H)).toBeNull()
      expect(lots).toEqual([])
      expect(await planifierLeRappel(env, HIVER_7H)).toBe(1)
      // (L'été suivant, l'abonnement de décembre serait effacé : le joueur rouvre le jeu entre-temps.)
      await sAbonner(await abonnement(1), ETE_8H)
      expect(await planifierLeRappel(env, ETE_7H)).toBe(1)
    })

    it(`découpe les abonnements en lots de ${ENVOIS_PAR_LOT}, par numéro de ligne`, async () => {
      for (let n = 1; n <= 60; n++) await sAbonner(await abonnement(n))
      // Un trou dans les numéros (un joueur a arrêté) : le lot va un peu plus loin, mais n'a jamais plus de 25 lignes.
      await traiterLeRappel(requete('DELETE', '/api/rappel/abonnement', { endpoint: 'https://fcm.googleapis.com/fcm/send/appareil-3' }), env)
      expect(await planifierLeRappel(env, HIVER_7H)).toBe(3)
      expect(lots).toEqual([
        { jour: '2026-12-01', de: 1, a: 26 },
        { jour: '2026-12-01', de: 27, a: 51 },
        { jour: '2026-12-01', de: 52, a: 60 },
      ])
    })

    it('efface les abonnements sans ouverture du jeu depuis plus de 90 jours', async () => {
      await sAbonner(await abonnement(1), new Date('2026-09-01T10:00:00Z'))
      await sAbonner(await abonnement(2), new Date('2026-09-02T10:00:00Z'))
      // Du 2 septembre au 1er décembre : 90 jours tout juste, on garde ; du 1er septembre : 91, on efface.
      await planifierLeRappel(env, HIVER_7H)
      expect(lignes().map((l) => l.derniere_ouverture)).toEqual(['2026-09-02'])
    })

    it('sans clés ni file, efface quand même les abonnements oubliés, mais n’envoie rien', async () => {
      await sAbonner(await abonnement(1), new Date('2026-08-01T10:00:00Z'))
      vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(await planifierLeRappel({ BASE: base }, HIVER_7H)).toBe(0)
      expect(lignes()).toEqual([])
    })
  })

  describe('l’envoi d’un lot', () => {
    it('envoie à chaque abonné du lot un Rappel chiffré, signé, qui expire à minuit', async () => {
      for (let n = 1; n <= 30; n++) await sAbonner(await abonnement(n))
      const { recues, transport } = fauxServicePush()
      await envoyerLesLots([{ body: { jour: '2026-12-01', de: 1, a: 30 } }], env, HIVER_7H, transport)
      // Les 25 premiers abonnés, envoyés tous en même temps (donc dans le désordre).
      const numeros = recues.map((r) => Number(r.url.split('-').pop())).sort((x, y) => x - y)
      expect(numeros).toEqual(Array.from({ length: ENVOIS_PAR_LOT }, (_, i) => i + 1))
      const premiere = recues.find((r) => r.url === 'https://fcm.googleapis.com/fcm/send/appareil-1')!
      expect(premiere.method).toBe('POST')
      // À 7 h, il reste 17 heures avant minuit.
      expect(premiere.headers.get('TTL')).toBe(String(17 * 3600))
      expect(premiere.headers.get('Topic')).toBe('rappel-du-matin')
      expect(premiere.headers.get('Urgency')).toBe('normal')
      expect(premiere.headers.get('Content-Encoding')).toBe('aes128gcm')
      expect(premiere.headers.get('Authorization')).toMatch(new RegExp(`^vapid t=[\\w-]+\\.[\\w-]+\\.[\\w-]+, k=${env.VAPID_CLE_PUBLIQUE}$`))
      // Le message est chiffré : ni le titre ni le texte ne passent en clair chez le service push.
      const corps = new TextDecoder().decode(await premiere.arrayBuffer())
      expect(corps).not.toContain('Duel Carbone')
    })

    it('efface les abonnements que le service push déclare disparus (404, 410), et garde les autres', async () => {
      for (let n = 1; n <= 4; n++) await sAbonner(await abonnement(n))
      const { transport } = fauxServicePush({
        'https://fcm.googleapis.com/fcm/send/appareil-2': 410,
        'https://fcm.googleapis.com/fcm/send/appareil-3': 404,
        'https://fcm.googleapis.com/fcm/send/appareil-4': 500,
      })
      await envoyerLesLots([{ body: { jour: '2026-12-01', de: 1, a: 4 } }], env, HIVER_7H, transport)
      expect(lignes().map((l) => l.numero)).toEqual([1, 4])
    })

    it('continue le lot si un service push est injoignable', async () => {
      for (let n = 1; n <= 3; n++) await sAbonner(await abonnement(n))
      const transport = vi.fn(async (r: Request) => {
        if (r.url.endsWith('-2')) throw new Error('réseau coupé')
        return new Response(null, { status: 201 })
      })
      await envoyerLesLots([{ body: { jour: '2026-12-01', de: 1, a: 3 } }], env, HIVER_7H, transport)
      expect(transport).toHaveBeenCalledTimes(3)
      expect(lignes()).toHaveLength(3)
    })

    it('abandonne un lot arrivé après minuit : ce n’est plus le Duel du jour', async () => {
      await sAbonner(await abonnement(1))
      const { transport } = fauxServicePush()
      await envoyerLesLots([{ body: { jour: '2026-11-30', de: 1, a: 1 } }], env, HIVER_7H, transport)
      expect(transport).not.toHaveBeenCalled()
    })
  })

  describe('l’essai, sur les aperçus seulement', () => {
    it('n’existe pas en production', async () => {
      await sAbonner(await abonnement(1))
      const reponse = await traiterLeRappel(requete('POST', '/api/rappel/essai', { endpoint: 'https://fcm.googleapis.com/fcm/send/appareil-1' }), env)
      expect(reponse!.status).toBe(404)
    })

    it('sur un aperçu, envoie le Rappel à cet appareil, et le dit au jeu', async () => {
      env.RAPPEL_ESSAI = 'oui'
      expect(await (await traiterLeRappel(requete('GET', '/api/rappel/cle'), env))!.json()).toEqual({ cle: env.VAPID_CLE_PUBLIQUE, essai: true })
      await sAbonner(await abonnement(1))
      await sAbonner(await abonnement(2))
      const { recues, transport } = fauxServicePush()
      const corps = { endpoint: 'https://fcm.googleapis.com/fcm/send/appareil-2' }
      const reponse = await traiterLeRappel(requete('POST', '/api/rappel/essai', corps), env, undefined, HIVER_7H, transport)
      expect(reponse!.status).toBe(200)
      expect(recues.map((r) => r.url)).toEqual([corps.endpoint])
      const inconnu = await traiterLeRappel(requete('POST', '/api/rappel/essai', { endpoint: 'https://fcm.googleapis.com/fcm/send/x' }), env)
      expect(inconnu!.status).toBe(404)
    })
  })
})
