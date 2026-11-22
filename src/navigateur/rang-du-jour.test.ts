import { describe, expect, it, vi } from 'vitest'
import { ADRESSE_DU_RANG, serveurDuRang } from './rang-du-jour.ts'

const EFFECTIFS = [0, 1, 0, 2, 0, 5, 3, 1, 0, 0, 1]
const reponse = (corps: unknown, statut = 200) => Promise.resolve(new Response(JSON.stringify(corps), { status: statut }))

describe('le serveur du Rang du jour, vu du navigateur', () => {
  it('envoie le numéro du Duel du jour et les 10 choix, en JSON, et rend les Effectifs', async () => {
    const faireFetch = vi.fn(() => reponse({ numero: 9, effectifs: EFFECTIFS }))
    const choix = Array.from({ length: 10 }, (_, i) => `geste-${i}`)
    expect(await serveurDuRang(faireFetch).envoyer(9, choix)).toEqual(EFFECTIFS)
    expect(faireFetch).toHaveBeenCalledWith(
      ADRESSE_DU_RANG,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: 9, choix }),
      }),
    )
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
  })

  it('n’attend pas un serveur trop lent', async () => {
    // Un serveur qui ne répond jamais, sauf à l'abandon de la requête.
    const faireFetch = (_: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, rejeter) => init?.signal?.addEventListener('abort', () => rejeter(init.signal?.reason)))
    expect(await serveurDuRang(faireFetch, 20).lire(9)).toBeNull()
  })
})
