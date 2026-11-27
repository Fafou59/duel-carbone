import { describe, expect, it } from 'vitest'
import { CLE_MEMOIRE_SEANCE, creerMemoireDeSeance } from './memoire-seance.ts'
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
