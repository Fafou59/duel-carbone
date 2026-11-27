import { describe, expect, it, vi } from 'vitest'
import type { MessageDuServeur } from '../domaine/seance-messages.ts'
import { ADRESSE_DES_SEANCES, serveurDesSeances, type EtatDeConnexion, type Outils } from './seance.ts'

const reponse = (corps: unknown, statut = 200) => Promise.resolve(new Response(JSON.stringify(corps), { status: statut }))

/** Une fausse WebSocket : le test l'ouvre, lui fait recevoir des messages et la ferme. */
class FausseWebSocket {
  readyState = 0
  envoyes: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((e: { data: unknown }) => void) | null = null
  onclose: ((e: { code: number }) => void) | null = null
  readonly adresse: string
  constructor(adresse: string) {
    this.adresse = adresse
  }
  send(texte: string) {
    this.envoyes.push(texte)
  }
  close() {
    this.readyState = 3
  }
  ouvrir() {
    this.readyState = 1
    this.onopen?.()
  }
  recevoir(message: unknown) {
    this.onmessage?.({ data: typeof message === 'string' ? message : JSON.stringify(message) })
  }
  couper(code: number) {
    this.readyState = 3
    this.onclose?.({ code })
  }
}

/** Des outils de test : les WebSockets ouvertes, et les attentes à déclencher à la main. */
function outilsDeTest() {
  const sockets: FausseWebSocket[] = []
  const attentes: { fonction: () => void; ms: number }[] = []
  const outils: Partial<Outils> = {
    ouvrir: (adresse) => {
      const ws = new FausseWebSocket(adresse)
      sockets.push(ws)
      return ws as unknown as WebSocket
    },
    adresseDuSite: () => 'https://duelcarbone.fr',
    attendre: (fonction, ms) => {
      const attente = { fonction, ms }
      attentes.push(attente)
      return () => attentes.splice(attentes.indexOf(attente), 1)
    },
    repeter: () => () => {},
  }
  return { outils, sockets, attentes }
}

const BONJOUR = { type: 'bonjour', role: 'animateur', jeton: 'abcdefghijklmnopqrstuvwxyz' } as const

describe('les Séances, vues du navigateur', () => {
  it('créent une Séance et rendent son code et le jeton de l’Animateur', async () => {
    const faireFetch = vi.fn((_adresse: string, _init?: RequestInit) => reponse({ code: 'K7RM4P', jetonAnimateur: 'secret' }, 201))
    const serveur = serveurDesSeances({ faireFetch: faireFetch as unknown as typeof fetch })
    expect(await serveur.creer({ classement: true, duels: ['a>b'] })).toEqual({ code: 'K7RM4P', jetonAnimateur: 'secret' })
    const [adresse, init] = faireFetch.mock.calls[0]
    expect(adresse).toBe(ADRESSE_DES_SEANCES)
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } })
    expect(JSON.parse(init?.body as string)).toEqual({ classement: true, duels: ['a>b'] })
  })

  it('rendent null, sans erreur, quand le serveur refuse ou ne répond pas', async () => {
    const refus = serveurDesSeances({ faireFetch: () => reponse({ erreur: 'Séances indisponibles' }, 503) })
    expect(await refus.creer({ classement: true, duels: [] })).toBeNull()
    expect(await refus.lire('K7RM4P')).toBeNull()
    const horsLigne = serveurDesSeances({ faireFetch: () => Promise.reject(new TypeError('Failed to fetch')) })
    expect(await horsLigne.creer({ classement: true, duels: [] })).toBeNull()
    const abime = serveurDesSeances({ faireFetch: () => reponse({ code: 'pas un code', jetonAnimateur: 'x' }, 201) })
    expect(await abime.creer({ classement: true, duels: [] })).toBeNull()
  })

  it('disent si une Séance existe', async () => {
    const serveur = serveurDesSeances({ faireFetch: () => reponse({ code: 'K7RM4P', avecClassement: false, ouverte: true }) })
    expect(await serveur.lire('K7RM4P')).toEqual({ code: 'K7RM4P', avecClassement: false, ouverte: true })
    expect(await serveurDesSeances({ faireFetch: () => reponse({ erreur: 'Séance inconnue' }, 404) }).lire('K7RM4P')).toBe('inconnue')
    expect(await serveur.lire('K7RM40')).toBe('inconnue')
  })
})

describe('la connexion à une Séance', () => {
  function brancher() {
    const { outils, sockets, attentes } = outilsDeTest()
    const messages: MessageDuServeur[] = []
    const etats: EtatDeConnexion[] = []
    const connexion = serveurDesSeances(outils).connecter({
      code: 'K7RM4P',
      bonjour: BONJOUR,
      surMessage: (m) => messages.push(m),
      surEtat: (e) => etats.push(e),
    })
    return { connexion, sockets, attentes, messages, etats }
  }

  it('se présente avec son jeton à l’ouverture, et transmet les messages du serveur', () => {
    const { sockets, messages, etats } = brancher()
    expect(sockets[0].adresse).toBe('wss://duelcarbone.fr/api/seance/K7RM4P/connexion')
    sockets[0].ouvrir()
    expect(sockets[0].envoyes).toEqual([JSON.stringify(BONJOUR)])
    sockets[0].recevoir({ type: 'refus', raison: 'message' })
    sockets[0].recevoir('pong')
    sockets[0].recevoir('{illisible')
    expect(messages).toEqual([{ type: 'refus', raison: 'message' }])
    expect(etats).toEqual(['connexion', 'connecte'])
  })

  it('se rétablit d’elle-même après une coupure, et se représente', () => {
    const { sockets, attentes, etats } = brancher()
    sockets[0].ouvrir()
    sockets[0].couper(1006)
    expect(etats.at(-1)).toBe('reconnexion')
    expect(attentes.map((a) => a.ms)).toEqual([500])
    attentes.shift()?.fonction()
    // Le second essai échoue aussi : on attend un peu plus longtemps.
    sockets[1].couper(1006)
    expect(attentes.map((a) => a.ms)).toEqual([1000])
    attentes.shift()?.fonction()
    sockets[2].ouvrir()
    expect(sockets[2].envoyes).toEqual([JSON.stringify(BONJOUR)])
    expect(etats.at(-1)).toBe('connecte')
  })

  it('s’arrête pour de bon quand le serveur ferme la Séance, refuse le jeton ou retire le Participant', () => {
    for (const fin of [
      (ws: FausseWebSocket) => ws.couper(1000),
      (ws: FausseWebSocket) => ws.couper(4003),
      (ws: FausseWebSocket) => ws.recevoir({ type: 'refus', raison: 'jeton' }),
      (ws: FausseWebSocket) => ws.recevoir({ type: 'retire' }),
    ]) {
      const { sockets, attentes, etats } = brancher()
      sockets[0].ouvrir()
      fin(sockets[0])
      sockets[0].couper(1000)
      expect(etats.at(-1)).toBe('arretee')
      expect(attentes).toEqual([])
    }
  })

  it('n’envoie une commande que si la connexion est ouverte', () => {
    const { connexion, sockets } = brancher()
    const avancer = { type: 'avancer', depuis: { phase: 'attente' }, conseil: null } as const
    expect(connexion.envoyer(avancer)).toBe(false)
    sockets[0].ouvrir()
    expect(connexion.envoyer(avancer)).toBe(true)
    expect(sockets[0].envoyes.at(-1)).toBe(JSON.stringify(avancer))
  })

  it('se ferme sans chercher à revenir quand on quitte l’écran', () => {
    const { connexion, sockets, attentes, etats } = brancher()
    sockets[0].ouvrir()
    connexion.fermer()
    sockets[0].couper(1000)
    expect(etats.at(-1)).toBe('arretee')
    expect(attentes).toEqual([])
  })
})
