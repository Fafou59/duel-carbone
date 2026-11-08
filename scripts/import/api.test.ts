// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { THEMATIQUES } from '../../src/donnees/referentiel.ts'
import { chargerThematique } from './api.ts'
import { NUMERIQUE } from './fixtures.ts'

const numerique = THEMATIQUES[0]

// On remplace le vrai fetch par une doublure : le test ne dépend ni d'Internet ni de l'ADEME.
const simulerReseau = (reponse: () => Promise<Response>) => {
  const doublure = vi.fn<typeof fetch>(reponse)
  vi.stubGlobal('fetch', doublure)
  return doublure
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Appel de l'API Impact CO2", () => {
  it('renvoie les Équivalents de la Thématique demandée, avec le détail', async () => {
    const fetch = simulerReseau(async () => Response.json({ data: NUMERIQUE }))
    await expect(chargerThematique(numerique)).resolves.toEqual(NUMERIQUE)
    expect(fetch.mock.calls[0][0]).toBe('https://impactco2.fr/api/v1/thematiques/ecv/1?detail=1&language=fr')
  })

  it("envoie la clé d'API quand elle existe, et seulement dans ce cas", async () => {
    const fetch = simulerReseau(async () => Response.json({ data: NUMERIQUE }))
    await chargerThematique(numerique, 'ma-cle')
    await chargerThematique(numerique)
    expect(fetch.mock.calls[0][1]?.headers).toEqual({ Authorization: 'Bearer ma-cle' })
    expect(fetch.mock.calls[1][1]?.headers).toEqual({})
  })

  it("échoue avec un message clair si l'API répond en erreur", async () => {
    simulerReseau(async () => new Response('Erreur', { status: 503 }))
    await expect(chargerThematique(numerique)).rejects.toThrow(/503.*Numérique/)
  })

  it("échoue avec un message clair si le réseau est coupé", async () => {
    simulerReseau(async () => {
      throw new TypeError('fetch failed')
    })
    await expect(chargerThematique(numerique)).rejects.toThrow(/Impossible de joindre l'API.*Numérique.*fetch failed/)
  })

  it('échoue si la réponse ne contient aucun Équivalent', async () => {
    simulerReseau(async () => Response.json({ data: [] }))
    await expect(chargerThematique(numerique)).rejects.toThrow(/vide ou inattendue/)
  })
})
