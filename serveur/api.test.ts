// @vitest-environment node
// (Le serveur ne tourne pas dans un navigateur : pas besoin de jsdom, et node:sqlite n'existe que dans Node.)
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import calendrierJson from '../src/donnees/calendrier.json'
import { GESTES_CALCULES } from '../src/donnees/index.ts'
import { partieDuJour, type Calendrier } from '../src/domaine/calendrier.ts'
import { plusEmetteur, type Duel } from '../src/domaine/duel.ts'
import { numeroDuJour } from '../src/domaine/jour.ts'
import { traiterRequete } from './api.ts'
import type { BaseD1, RequeteD1 } from './base.ts'

/**
 * Une base D1 de test : une vraie base SQLite en mémoire (node:sqlite), avec la même table que la vraie
 * (le fichier de migration est appliqué tel quel), derrière les quelques fonctions de D1 qu'utilise le serveur.
 */
function baseDeTest(): BaseD1 & { sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(new URL('../migrations/0001_effectifs.sql', import.meta.url), 'utf8'))
  const requete = (sql: string, valeurs: (string | number)[] = []): RequeteD1 => ({
    bind: (...v) => requete(sql, v),
    all: async <T,>() => ({ results: sqlite.prepare(sql).all(...valeurs) as T[] }),
  })
  return {
    sqlite,
    prepare: (sql) => requete(sql),
    // D1 enchaîne les requêtes d'un lot dans une transaction : toutes passent, ou aucune.
    batch: async (requetes) => {
      sqlite.exec('BEGIN')
      try {
        const resultats = []
        for (const r of requetes) resultats.push(await r.all())
        sqlite.exec('COMMIT')
        return resultats as never
      } catch (erreur) {
        sqlite.exec('ROLLBACK')
        throw erreur
      }
    },
  }
}

// Le 22 novembre 2026 à 15 h, heure de Paris : le Duel du jour n° 9.
const JOUR = '2026-11-22'
const MAINTENANT = new Date('2026-11-22T14:00:00Z')
const NUMERO = numeroDuJour(JOUR)
const DUELS = partieDuJour(calendrierJson as Calendrier, JOUR, GESTES_CALCULES, [])

/** Les 10 choix d'un joueur qui a trouvé les `bonnes` premières réponses, puis s'est trompé. */
const choixPour = (bonnes: number) =>
  DUELS.map((duel: Duel, i) => {
    const bon = plusEmetteur(duel).id
    return i < bonnes ? bon : bon === duel.a.id ? duel.b.id : duel.a.id
  })

const URL_API = 'https://duelcarbone.fr/api/rang-du-jour'
const envoyer = (corps: unknown, base: BaseD1, entetes: Record<string, string> = { 'Content-Type': 'application/json' }) =>
  traiterRequete(
    new Request(URL_API, { method: 'POST', headers: entetes, body: typeof corps === 'string' ? corps : JSON.stringify(corps) }),
    { BASE: base },
    MAINTENANT,
  )
const lire = (base: BaseD1, maintenant = MAINTENANT) => traiterRequete(new Request(URL_API), { BASE: base }, maintenant)

describe('le serveur du Rang du jour', () => {
  let base: ReturnType<typeof baseDeTest>
  beforeEach(() => {
    base = baseDeTest()
  })

  it('compte un joueur dans la case de son score, recalculé à partir de ses choix', async () => {
    const reponse = await envoyer({ numero: NUMERO, choix: choixPour(7) }, base)
    expect(reponse.status).toBe(200)
    const effectifs = [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
    expect(await reponse.json()).toEqual({ numero: NUMERO, effectifs })
  })

  it('renvoie les 11 effectifs du jour, même vides', async () => {
    await envoyer({ numero: NUMERO, choix: choixPour(7) }, base)
    await envoyer({ numero: NUMERO, choix: choixPour(7) }, base)
    await envoyer({ numero: NUMERO, choix: choixPour(10) }, base)
    const reponse = await lire(base)
    expect(reponse.status).toBe(200)
    expect(reponse.headers.get('Cache-Control')).toBe('no-store')
    expect(await reponse.json()).toEqual({ numero: NUMERO, effectifs: [0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1] })
  })

  it('ne garde rien d’autre que le jour, le score et le nombre de joueurs', async () => {
    await envoyer({ numero: NUMERO, choix: choixPour(4), pseudo: 'Camille' }, base, {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.7',
    })
    expect(base.sqlite.prepare('SELECT * FROM effectifs').all()).toEqual([{ jour: JOUR, score: 4, joueurs: 1 }])
  })

  it('ne compte que le Duel du jour d’aujourd’hui, heure de Paris', async () => {
    // Hier, ou demain : refusé.
    expect((await envoyer({ numero: NUMERO - 1, choix: choixPour(5) }, base)).status).toBe(409)
    expect((await envoyer({ numero: NUMERO + 1, choix: choixPour(5) }, base)).status).toBe(409)
    // À 0 h 30 à Paris, le 23 (23 h 30 en temps universel, le 22), le Duel n° 9 est celui d'hier.
    const apresMinuit = new Request(URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: NUMERO, choix: choixPour(5) }),
    })
    expect((await traiterRequete(apresMinuit, { BASE: base }, new Date('2026-11-22T23:30:00Z'))).status).toBe(409)
    expect(base.sqlite.prepare('SELECT * FROM effectifs').all()).toEqual([])
  })

  it('refuse des choix qui ne correspondent pas aux Duels du jour', async () => {
    const choix = choixPour(10)
    choix[3] = 'steak-de-boeuf-qui-n-existe-pas'
    expect((await envoyer({ numero: NUMERO, choix }, base)).status).toBe(422)
    expect((await envoyer({ numero: NUMERO, choix: choix.slice(0, 9) }, base)).status).toBe(400)
    expect(base.sqlite.prepare('SELECT * FROM effectifs').all()).toEqual([])
  })

  it.each([
    ['du texte qui n’est pas du JSON', 'bonjour'],
    ['un numéro qui n’est pas un nombre', { numero: '9', choix: choixPour(5) }],
    ['des choix qui ne sont pas du texte', { numero: 9, choix: Array(10).fill(1) }],
    ['un envoi trop long', { numero: 9, choix: choixPour(5), bourrage: 'x'.repeat(5000) }],
  ])('refuse %s', async (_, corps) => {
    expect((await envoyer(corps, base)).status).toBe(400)
  })

  it('n’accepte que du JSON (un autre site ne peut pas envoyer de score à la place d’un joueur)', async () => {
    const reponse = await envoyer(JSON.stringify({ numero: NUMERO, choix: choixPour(5) }), base, { 'Content-Type': 'text/plain' })
    expect(reponse.status).toBe(415)
  })

  it('répond 404 aux autres adresses et 405 aux autres méthodes', async () => {
    expect((await traiterRequete(new Request('https://duelcarbone.fr/api/autre'), { BASE: base }, MAINTENANT)).status).toBe(404)
    const supprimer = new Request(URL_API, { method: 'DELETE' })
    expect((await traiterRequete(supprimer, { BASE: base }, MAINTENANT)).status).toBe(405)
  })

  it('répond 503 si la base ne répond pas (quota du jour épuisé, panne) : le jeu n’affiche alors rien', async () => {
    const enPanne: BaseD1 = {
      prepare: () => {
        throw new Error('D1_ERROR: quota journalier atteint')
      },
      batch: async () => {
        throw new Error('D1_ERROR')
      },
    }
    const erreurs: unknown[] = []
    const original = console.error
    console.error = (...args: unknown[]) => erreurs.push(args)
    try {
      expect((await lire(enPanne)).status).toBe(503)
      expect((await envoyer({ numero: NUMERO, choix: choixPour(5) }, enPanne)).status).toBe(503)
    } finally {
      console.error = original
    }
    expect(erreurs).toHaveLength(2)
  })

  it('fonctionne aussi sans base déclarée (un aperçu mal réglé) : 503, sans planter', async () => {
    expect((await traiterRequete(new Request(URL_API), {}, MAINTENANT)).status).toBe(503)
  })
})
