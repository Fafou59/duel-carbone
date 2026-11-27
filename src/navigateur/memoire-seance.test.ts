import { describe, expect, it } from 'vitest'
import { estUnJeton } from '../domaine/seance.ts'
import { CLE_MEMOIRE_SEANCE, creerMemoireDeSeance, tirerUnJeton } from './memoire-seance.ts'
import type { Stockage } from './memoire.ts'

function stockageDeTest(initial: Record<string, string> = {}): Stockage & { donnees: Record<string, string> } {
  const donnees = { ...initial }
  return { donnees, getItem: (cle) => donnees[cle] ?? null, setItem: (cle, valeur) => void (donnees[cle] = valeur) }
}

const SEANCE = { code: 'K7RM4P', jeton: 'abcdefghijklmnopqrstuvwxyz0123456789-_ABCDE' }

describe('la mémoire de la Séance animée', () => {
  it('retient le code et le jeton, puis les oublie', () => {
    const stockage = stockageDeTest()
    const memoire = creerMemoireDeSeance(stockage)
    expect(memoire.animee()).toBeNull()
    memoire.retenirAnimee(SEANCE)
    expect(creerMemoireDeSeance(stockage).animee()).toEqual(SEANCE)
    memoire.oublierAnimee()
    expect(memoire.animee()).toBeNull()
  })

  it('ignore ce qui n’a pas la forme attendue', () => {
    for (const brut of ['{illisible', 'null', '[]', JSON.stringify({ animee: { code: 'K7RM40', jeton: SEANCE.jeton } }), JSON.stringify({ animee: { code: 'K7RM4P', jeton: 'court' } })]) {
      expect(creerMemoireDeSeance(stockageDeTest({ [CLE_MEMOIRE_SEANCE]: brut })).animee()).toBeNull()
    }
  })

  it('fonctionne sans stockage, ou quand l’écriture est refusée', () => {
    expect(() => creerMemoireDeSeance(null).retenirAnimee(SEANCE)).not.toThrow()
    const plein: Stockage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(() => creerMemoireDeSeance(plein).retenirAnimee(SEANCE)).not.toThrow()
  })
})

describe('la mémoire de la Séance rejointe (téléphone du Participant)', () => {
  const REJOINTE = { ...SEANCE, pseudo: 'Camille', phrases: { '0': 'Le podium te va bien.' } }

  it('retient le code, le jeton, le pseudo et les phrases lues, à côté de la Séance animée', () => {
    const stockage = stockageDeTest()
    const memoire = creerMemoireDeSeance(stockage)
    memoire.retenirAnimee(SEANCE)
    memoire.retenirRejointe(REJOINTE)
    expect(creerMemoireDeSeance(stockage).rejointe()).toEqual(REJOINTE)
    expect(creerMemoireDeSeance(stockage).animee()).toEqual(SEANCE)
    memoire.oublierRejointe()
    expect(memoire.rejointe()).toBeNull()
    expect(memoire.animee()).toEqual(SEANCE)
  })

  it('remet au propre un pseudo ou des phrases abîmés, et ignore un jeton invalide', () => {
    const abime = { ...SEANCE, pseudo: 42, phrases: ['pas', 'un', 'objet'] }
    expect(creerMemoireDeSeance(stockageDeTest({ [CLE_MEMOIRE_SEANCE]: JSON.stringify({ rejointe: abime }) })).rejointe()).toEqual({
      ...SEANCE,
      pseudo: null,
      phrases: {},
    })
    const sansJeton = { ...REJOINTE, jeton: 'court' }
    expect(creerMemoireDeSeance(stockageDeTest({ [CLE_MEMOIRE_SEANCE]: JSON.stringify({ rejointe: sansJeton }) })).rejointe()).toBeNull()
  })

  it('tire des jetons valides et tous différents', () => {
    const jetons = new Set(Array.from({ length: 50 }, tirerUnJeton))
    expect(jetons.size).toBe(50)
    for (const jeton of jetons) expect(estUnJeton(jeton)).toBe(true)
  })
})
