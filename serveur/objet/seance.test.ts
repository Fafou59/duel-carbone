/**
 * Le Durable Object de la Séance, testé dans le vrai moteur des Workers (vitest.objet.config.ts) : on crée des
 * Séances par l'adresse /api/seance comme le ferait l'ordinateur de l'Animateur, et on s'y branche par de vraies
 * WebSockets, comme les écrans.
 */
import { evictDurableObject, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'
import { env, exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { moinsEmetteur, plusEmetteur } from '../../src/domaine/duel.ts'
import { genererPartie } from '../../src/domaine/generateur.ts'
import { hasardReproductible } from '../../src/domaine/hasard.ts'
import { REGLES } from '../../src/domaine/regles.ts'
import type { MessageDuServeur, VueAnimateur, VueParticipant } from '../../src/domaine/seance-messages.ts'
import { cleDuDuel } from '../../src/domaine/taux-d-erreur.ts'
import { CALIBRAGE, GESTES_CALCULES } from '../../src/donnees/index.ts'
import { DUELS_THEMATIQUES } from '../../src/donnees/duels-thematiques.ts'

const DUELS = genererPartie({
  gestes: GESTES_CALCULES,
  thematiques: DUELS_THEMATIQUES,
  forcerThematique: true,
  coefficients: CALIBRAGE.coefficients,
  hasard: hasardReproductible(11),
})
const CODES = DUELS.map((d) => `${d.a.id}>${d.b.id}`)
const bon = (duel: number) => plusEmetteur(DUELS[duel]).id
const faux = (duel: number) => moinsEmetteur(DUELS[duel]).id

const ORIGINE = 'https://duelcarbone.fr'

/** Un jeton de Participant, comme en tirerait le téléphone. */
let compteur = 0
const nouveauJeton = () => `jeton-de-test-${String(++compteur).padStart(10, '0')}`

function appeler(chemin: string, init?: RequestInit): Promise<Response> {
  return exports.default.fetch(new Request(`${ORIGINE}${chemin}`, init))
}

async function creerUneSeance(classement = true): Promise<{ code: string; jetonAnimateur: string }> {
  const reponse = await appeler('/api/seance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classement, duels: CODES }),
  })
  expect(reponse.status).toBe(201)
  return reponse.json()
}

/** L'objet d'une Séance (sans juridiction : le moteur local ne les connaît pas, voir seance-api.ts). */
const objet = (code: string) => env.SEANCE.getByName(code)

/** Un écran branché sur la Séance : il envoie des messages et attend les suivants, un par un. */
type Ecran = {
  ws: WebSocket
  envoyer: (message: unknown) => void
  prochain: () => Promise<MessageDuServeur>
  /** Le prochain état (en sautant les autres messages). */
  etat: <V = VueAnimateur | VueParticipant>() => Promise<V>
  /** La fermeture de la connexion, avec son code. */
  fermeture: Promise<number>
}

async function brancher(code: string): Promise<Ecran> {
  const reponse = await appeler(`/api/seance/${code}/connexion`, { headers: { Upgrade: 'websocket' } })
  expect(reponse.status).toBe(101)
  const ws = reponse.webSocket
  if (!ws) throw new Error('pas de WebSocket')
  ws.accept()
  const recus: MessageDuServeur[] = []
  const attentes: ((m: MessageDuServeur) => void)[] = []
  ws.addEventListener('message', (evenement) => {
    const message = JSON.parse(evenement.data as string) as MessageDuServeur
    const attente = attentes.shift()
    if (attente) attente(message)
    else recus.push(message)
  })
  const fermeture = new Promise<number>((resoudre) => ws.addEventListener('close', (e) => resoudre(e.code)))
  const prochain = () => {
    const deja = recus.shift()
    if (deja) return Promise.resolve(deja)
    return new Promise<MessageDuServeur>((resoudre, rejeter) => {
      const delai = setTimeout(() => rejeter(new Error('aucun message reçu')), 2000)
      attentes.push((m) => {
        clearTimeout(delai)
        resoudre(m)
      })
    })
  }
  const etat = async <V,>() => {
    for (;;) {
      const message = await prochain()
      if (message.type === 'etat') return message.vue as V
    }
  }
  return { ws, envoyer: (m) => ws.send(JSON.stringify(m)), prochain, etat, fermeture }
}

async function animateur(code: string, jetonAnimateur: string): Promise<Ecran> {
  const ecran = await brancher(code)
  ecran.envoyer({ type: 'bonjour', role: 'animateur', jeton: jetonAnimateur })
  return ecran
}

async function participant(code: string, pseudo: string | null, jeton = nouveauJeton()): Promise<Ecran & { jeton: string }> {
  const ecran = await brancher(code)
  ecran.envoyer({ type: 'bonjour', role: 'participant', jeton, pseudo })
  return { ...ecran, jeton }
}

/** Le dernier état reçu par un écran, une fois les messages en attente lus (après une commande). */
async function dernierEtat<V>(ecran: Ecran, condition: (v: V) => boolean): Promise<V> {
  for (;;) {
    const vue = await ecran.etat<V>()
    if (condition(vue)) return vue
  }
}

describe('la création d’une Séance', () => {
  it('donne un code de 6 caractères et un jeton d’Animateur', async () => {
    const { code, jetonAnimateur } = await creerUneSeance()
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    expect(jetonAnimateur.length).toBeGreaterThanOrEqual(43)
    const informations = await appeler(`/api/seance/${code}`)
    expect(await informations.json()).toEqual({ code, avecClassement: true, ouverte: true })
  })

  it('refuse des Duels qui ne viennent pas d’un tirage (paire injouable, doublon, Geste inconnu)', async () => {
    const creer = (duels: unknown, type = 'application/json') =>
      appeler('/api/seance', { method: 'POST', headers: { 'Content-Type': type }, body: JSON.stringify({ classement: false, duels }) })
    expect((await creer(CODES.slice(0, 9))).status).toBe(400)
    expect((await creer([...CODES.slice(0, 9), CODES[0]])).status).toBe(400)
    expect((await creer([...CODES.slice(0, 9), 'inconnu>autre-inconnu'])).status).toBe(400)
    // Le même Geste des deux côtés : un Rapport de 1, sous le plancher.
    expect((await creer([...CODES.slice(0, 9), `${DUELS[0].a.id}>${DUELS[0].a.id}`])).status).toBe(400)
    // Un formulaire d'un autre site n'envoie que du texte.
    expect((await creer(CODES, 'text/plain')).status).toBe(415)
  })

  it('répond 404 à un code inconnu ou mal formé, sans créer d’objet à effacer', async () => {
    expect((await appeler('/api/seance/ZZZZZZ')).status).toBe(404)
    expect((await appeler('/api/seance/ZZZZZZ/connexion', { headers: { Upgrade: 'websocket' } })).status).toBe(404)
    expect((await appeler('/api/seance/K7RM40')).status).toBe(404)
    expect((await appeler('/api/seance/ZZZZZZ/autre')).status).toBe(404)
    const vide = await runInDurableObject(objet('ZZZZZZ'), (_instance, state) =>
      state.storage.sql.exec("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'").one(),
    )
    expect(vide.n).toBe(0)
  })
})

describe('les connexions', () => {
  it('donnent à l’Animateur l’état complet, puis chaque arrivée', async () => {
    const { code, jetonAnimateur } = await creerUneSeance()
    const ecran = await animateur(code, jetonAnimateur)
    const vue = await ecran.etat<VueAnimateur>()
    expect(vue).toMatchObject({ role: 'animateur', code, avecClassement: true, etape: { phase: 'attente' }, participants: [] })
    expect(vue.duels).toEqual(CODES)

    const camille = await participant(code, '  Camille ')
    expect(await camille.etat<VueParticipant>()).toMatchObject({ role: 'participant', moi: { numero: 1, pseudo: 'Camille' } })
    expect((await ecran.etat<VueAnimateur>()).participants).toEqual([{ numero: 1, pseudo: 'Camille' }])
  })

  it('refusent un faux jeton d’Animateur, et un pseudo manquant quand il y a un Classement', async () => {
    const { code } = await creerUneSeance()
    const intrus = await animateur(code, 'un-faux-jeton-d-animateur-tres-long')
    expect(await intrus.prochain()).toEqual({ type: 'refus', raison: 'jeton' })
    expect(await intrus.fermeture).toBe(4003)

    const anonyme = await participant(code, null)
    expect(await anonyme.prochain()).toEqual({ type: 'refus', raison: 'pseudo' })
  })

  it('refusent toute commande avant de s’être présenté', async () => {
    const { code } = await creerUneSeance()
    const ecran = await brancher(code)
    ecran.envoyer({ type: 'avancer', depuis: { phase: 'attente' } })
    expect(await ecran.prochain()).toEqual({ type: 'refus', raison: 'message' })
  })

  it('laissent un Participant reprendre sa place avec son jeton, après une coupure ou la mise en veille de l’objet', async () => {
    const { code, jetonAnimateur } = await creerUneSeance()
    const ecran = await animateur(code, jetonAnimateur)
    await ecran.etat()
    const camille = await participant(code, 'Camille')
    await camille.etat()
    ecran.envoyer({ type: 'avancer', depuis: { phase: 'attente' } })
    await dernierEtat<VueParticipant>(camille, (v) => v.etape.phase === 'duel')
    camille.envoyer({ type: 'repondre', duel: 0, idChoisi: bon(0) })
    await dernierEtat<VueParticipant>(camille, (v) => v.moi.choix[0] !== null)
    camille.ws.close(1000)

    // L'objet s'endort : sa mémoire est perdue, sa base reste.
    await evictDurableObject(objet(code))

    const deRetour = await participant(code, null, camille.jeton)
    const vue = await deRetour.etat<VueParticipant>()
    expect(vue.moi).toMatchObject({ numero: 1, pseudo: 'Camille', choix: [bon(0), null, null, null, null, null, null, null, null, null] })
    expect(vue.etape).toEqual({ phase: 'duel', index: 0 })
  })
})

describe('le déroulé', () => {
  it('réserve les commandes au jeton d’Animateur', async () => {
    const { code } = await creerUneSeance()
    const camille = await participant(code, 'Camille')
    await camille.etat()
    camille.envoyer({ type: 'avancer', depuis: { phase: 'attente' } })
    expect(await camille.prochain()).toEqual({ type: 'refus', raison: 'jeton' })
    camille.envoyer({ type: 'retirer', numero: 1 })
    expect(await camille.prochain()).toEqual({ type: 'refus', raison: 'jeton' })
  })

  it('ferme les réponses à la révélation, et ajoute celles de la salle au Taux d’erreur', async () => {
    const { code, jetonAnimateur } = await creerUneSeance()
    const ecran = await animateur(code, jetonAnimateur)
    await ecran.etat()
    const camille = await participant(code, 'Camille')
    const leo = await participant(code, 'Léo')
    const ines = await participant(code, 'Inès')
    ecran.envoyer({ type: 'avancer', depuis: { phase: 'attente' } })
    camille.envoyer({ type: 'repondre', duel: 0, idChoisi: bon(0) })
    leo.envoyer({ type: 'repondre', duel: 0, idChoisi: faux(0) })
    const pendant = await dernierEtat<VueAnimateur>(ecran, (v) => v.repondus.length === 2)
    expect(pendant.repondus).toEqual([1, 2])

    const avant = await env.BASE.prepare('SELECT reponses, fausses FROM reponses WHERE paire = ?').bind(cleDuDuel(DUELS[0])).first()
    ecran.envoyer({ type: 'avancer', depuis: { phase: 'duel', index: 0 } })
    const revele = await dernierEtat<VueAnimateur>(ecran, (v) => v.etape.phase === 'revelation')
    expect(revele.salle[0]).toMatchObject({ reponses: 2, bonnes: 1 })

    // Trop tard pour Inès : sa réponse n'est pas prise.
    ines.envoyer({ type: 'repondre', duel: 0, idChoisi: bon(0) })
    const vueInes = await dernierEtat<VueParticipant>(ines, (v) => v.etape.phase === 'revelation')
    expect(vueInes.moi.choix[0]).toBeNull()

    const apres = await env.BASE.prepare('SELECT reponses, fausses FROM reponses WHERE paire = ?')
      .bind(cleDuDuel(DUELS[0]))
      .first<{ reponses: number; fausses: number }>()
    expect(apres).toEqual({ reponses: ((avant?.reponses as number) ?? 0) + 2, fausses: ((avant?.fausses as number) ?? 0) + 1 })
  })

  it('ne bouge pas quand l’Animateur appuie deux fois depuis la même étape', async () => {
    const { code, jetonAnimateur } = await creerUneSeance(false)
    const ecran = await animateur(code, jetonAnimateur)
    await ecran.etat()
    ecran.envoyer({ type: 'avancer', depuis: { phase: 'attente' } })
    ecran.envoyer({ type: 'avancer', depuis: { phase: 'attente' } })
    await dernierEtat<VueAnimateur>(ecran, (v) => v.etape.phase === 'duel')
    const deuxieme = await ecran.etat<VueAnimateur>()
    expect(deuxieme.etape).toEqual({ phase: 'duel', index: 0 })
  })

  it('va jusqu’au Classement final et au Conseil choisi par l’Animateur', async () => {
    const { code, jetonAnimateur } = await creerUneSeance()
    const ecran = await animateur(code, jetonAnimateur)
    let vue = await ecran.etat<VueAnimateur>()
    const camille = await participant(code, 'Camille')
    await camille.etat()
    while (vue.etape.phase !== 'fin') {
      const depuis = vue.etape
      if (depuis.phase === 'duel') camille.envoyer({ type: 'repondre', duel: depuis.index, idChoisi: bon(depuis.index) })
      ecran.envoyer({ type: 'avancer', depuis, conseil: 'conseil-inconnu' })
      vue = await dernierEtat<VueAnimateur>(ecran, (v) => JSON.stringify(v.etape) !== JSON.stringify(depuis))
    }
    expect(vue.classement).toEqual([
      expect.objectContaining({ numero: 1, pseudo: 'Camille', bonnes: 10, joues: 10, rang: 1, medaille: 'or' }),
    ])
    // Un Conseil inconnu n'est pas retenu.
    expect(vue.conseil).toBeNull()
    expect((await (await appeler(`/api/seance/${code}`)).json()) as { ouverte: boolean }).toMatchObject({ ouverte: false })
    const retard = await participant(code, 'Retard')
    expect(await retard.prochain()).toEqual({ type: 'refus', raison: 'terminee' })
  })

  it('retire un Participant : il est prévenu, son téléphone déconnecté, son jeton oublié', async () => {
    const { code, jetonAnimateur } = await creerUneSeance()
    const ecran = await animateur(code, jetonAnimateur)
    await ecran.etat()
    const intrus = await participant(code, 'Pseudo déplacé')
    await intrus.etat()
    ecran.envoyer({ type: 'retirer', numero: 1 })
    expect(await dernierEtat<VueAnimateur>(ecran, (v) => v.participants.length === 0)).toBeTruthy()
    expect(await intrus.prochain()).toEqual({ type: 'retire' })
    expect(await intrus.fermeture).toBe(4001)
    // Revenu avec le même jeton, sans pseudo : il n'est plus dans la Séance.
    const deRetour = await participant(code, null, intrus.jeton)
    expect(await deRetour.prochain()).toEqual({ type: 'refus', raison: 'pseudo' })
  })
})

describe('les limites', () => {
  it('ne laisse pas entrer plus de 100 Participants', async () => {
    const { code } = await creerUneSeance(false)
    const max = REGLES.seance.participantsMax
    for (let i = 0; i < max; i++) {
      const p = await participant(code, null)
      await p.etat()
      p.ws.close(1000)
    }
    const deTrop = await participant(code, null)
    expect(await deTrop.prochain()).toEqual({ type: 'refus', raison: 'pleine' })
  })

  it('ferme la Séance à 3 h (alarme), puis efface tout à 24 h', async () => {
    const { code, jetonAnimateur } = await creerUneSeance()
    const camille = await participant(code, 'Camille')
    await camille.etat()

    // L'alarme de fermeture, programmée à la création (+3 h), déclenchée tout de suite.
    const alarme = await runInDurableObject(objet(code), (_instance, state) => state.storage.getAlarm())
    expect(alarme).not.toBeNull()
    expect(await runDurableObjectAlarm(objet(code))).toBe(true)
    expect(await dernierEtat<VueParticipant>(camille, (v) => v.fermee)).toBeTruthy()
    expect(await camille.fermeture).toBe(1000)

    expect(await (await appeler(`/api/seance/${code}`)).json()).toMatchObject({ ouverte: false })
    const retard = await participant(code, 'Retard')
    expect(await retard.prochain()).toEqual({ type: 'refus', raison: 'fermee' })
    const ecran = await animateur(code, jetonAnimateur)
    await ecran.etat()
    ecran.envoyer({ type: 'avancer', depuis: { phase: 'attente' } })
    expect(await ecran.prochain()).toEqual({ type: 'refus', raison: 'fermee' })

    // Camille revient : elle retrouve la fin de la Séance, puis la connexion se ferme.
    const deRetour = await participant(code, null, camille.jeton)
    expect((await deRetour.etat<VueParticipant>()).fermee).toBe(true)

    // L'alarme d'effacement (+24 h) : plus rien ne reste.
    const effacement = await runInDurableObject(objet(code), (_instance, state) => state.storage.getAlarm())
    expect(effacement).toBeGreaterThan(alarme ?? 0)
    expect(await runDurableObjectAlarm(objet(code))).toBe(true)
    expect((await appeler(`/api/seance/${code}`)).status).toBe(404)
    const tables = await runInDurableObject(objet(code), (_instance, state) =>
      state.storage.sql.exec("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_%' ESCAPE '\\'").one(),
    )
    expect(tables.n).toBe(0)
  })
})
