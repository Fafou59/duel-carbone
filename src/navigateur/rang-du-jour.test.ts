import { describe, expect, it, vi } from 'vitest'
import { ADRESSE_DU_RANG, ADRESSE_DU_TAUX, serveurDuRang } from './rang-du-jour.ts'

const EFFECTIFS = [0, 1, 0, 2, 0, 5, 3, 1, 0, 0, 1]
const reponse = (corps: unknown, statut = 200) => Promise.resolve(new Response(JSON.stringify(corps), { status: statut }))

describe('le serveur du Rang du jour, vu du navigateur', () => {
  it('envoie le numéro du Duel du jour et les 10 choix, en JSON, et rend les Effectifs et les comptes des paires', async () => {
    const paires = { 'avion|steak': { reponses: 5, fausses: 2 } }
    const faireFetch = vi.fn(() => reponse({ numero: 9, effectifs: EFFECTIFS, paires }))
    const choix = Array.from({ length: 10 }, (_, i) => `geste-${i}`)
    expect(await serveurDuRang(faireFetch).envoyer(9, choix)).toEqual({ effectifs: EFFECTIFS, paires })
    expect(faireFetch).toHaveBeenCalledWith(
      ADRESSE_DU_RANG,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: 9, choix }),
      }),
    )
  })

  it('rend les Effectifs même si les comptes des paires manquent ou sont abîmés (ancien serveur)', async () => {
    const faireFetch = () => reponse({ numero: 9, effectifs: EFFECTIFS, paires: { avion: 3 } })
    expect(await serveurDuRang(faireFetch).envoyer(9, [])).toEqual({ effectifs: EFFECTIFS, paires: null })
  })

  it('lit les comptes des paires d’une Partie, à l’adresse du Taux d’erreur', async () => {
    const paires = { 'avion|steak': { reponses: 5, fausses: 2 } }
    const faireFetch = vi.fn((_adresse: string) => reponse({ paires }))
    expect(await serveurDuRang(faireFetch as unknown as typeof fetch).lireTaux(['avion|steak', 'jean|pull'])).toEqual(paires)
    expect(faireFetch.mock.calls[0][0]).toBe(`${ADRESSE_DU_TAUX}?paires=avion%7Csteak%2Cjean%7Cpull`)
  })

  it('envoie les 10 Duels et les choix d’une Partie libre à l’adresse du Taux d’erreur, et rend les comptes', async () => {
    const paires = { 'avion|steak': { reponses: 5, fausses: 2 } }
    const faireFetch = vi.fn((_adresse: string, _init?: RequestInit) => reponse({ paires }))
    const duels = ['avion>steak', 'jean>pull']
    expect(await serveurDuRang(faireFetch as unknown as typeof fetch).envoyerReponses(duels, ['avion', 'pull'])).toEqual(paires)
    const [adresse, init] = faireFetch.mock.calls[0]
    expect(adresse).toBe(ADRESSE_DU_TAUX)
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ duels, choix: ['avion', 'pull'] }) })
  })

  it('lit les Effectifs du jour', async () => {
    const faireFetch = vi.fn(() => reponse({ numero: 9, effectifs: EFFECTIFS }))
    expect(await serveurDuRang(faireFetch).lire(9)).toEqual(EFFECTIFS)
  })

  it('ignore les Effectifs d’un autre Duel du jour (juste après minuit)', async () => {
    const faireFetch = () => reponse({ numero: 10, effectifs: EFFECTIFS })
    expect(await serveurDuRang(faireFetch).lire(9)).toBeNull()
  })

  it.each([
    ['hors ligne', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['serveur en panne', () => reponse({ erreur: 'base indisponible' }, 503)],
    ['réponse illisible', () => Promise.resolve(new Response('<html>'))],
    ['Effectifs abîmés', () => reponse({ numero: 9, effectifs: [1, 2] })],
  ])('rend null, sans erreur : %s', async (_, faireFetch) => {
    expect(await serveurDuRang(faireFetch as typeof fetch).lire(9)).toBeNull()
    expect(await serveurDuRang(faireFetch as typeof fetch).envoyer(9, [])).toBeNull()
    expect(await serveurDuRang(faireFetch as typeof fetch).lireTaux(['avion|steak'])).toBeNull()
  })

  it('n’attend pas un serveur trop lent', async () => {
    // Un serveur qui ne répond jamais, sauf à l'abandon de la requête.
    const faireFetch = (_: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, rejeter) => init?.signal?.addEventListener('abort', () => rejeter(init.signal?.reason)))
    expect(await serveurDuRang(faireFetch, 20).lire(9)).toBeNull()
  })
})
