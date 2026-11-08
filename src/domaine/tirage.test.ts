import { describe, expect, it } from 'vitest'
import { GESTES_CALCULES } from '../donnees/index.ts'
import { rapport } from './duel.ts'
import { hasardReproductible, melanger } from './hasard.ts'
import { PLANCHER_DU_RAPPORT, tirerPartieProvisoire } from './tirage.ts'

const cle = (ids: string[]) => [...ids].sort().join(' / ')

describe('Hasard reproductible', () => {
  it('donne toujours la même suite pour la même graine', () => {
    const a = hasardReproductible(42)
    const b = hasardReproductible(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('reste entre 0 et 1', () => {
    const h = hasardReproductible(7)
    for (let i = 0; i < 1000; i++) {
      const x = h()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })

  it('mélange sans perdre ni dupliquer d’élément, et sans modifier l’original', () => {
    const original = [1, 2, 3, 4, 5, 6]
    const melange = melanger(original, hasardReproductible(1))
    expect([...melange].sort()).toEqual(original)
    expect(original).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('Tirage provisoire d’une Partie', () => {
  // On vérifie les règles sur beaucoup de tirages différents, pas sur un seul.
  const tirages = Array.from({ length: 50 }, (_, graine) => tirerPartieProvisoire(GESTES_CALCULES, hasardReproductible(graine)))

  it('tire 10 Duels', () => {
    for (const duels of tirages) expect(duels).toHaveLength(10)
  })

  it(`ne tire jamais un Duel sous ×${PLANCHER_DU_RAPPORT}`, () => {
    for (const duels of tirages) {
      for (const duel of duels) expect(rapport(duel)).toBeGreaterThanOrEqual(PLANCHER_DU_RAPPORT)
    }
  })

  it('ne tire jamais deux fois la même paire dans une Partie', () => {
    for (const duels of tirages) {
      const paires = duels.map((d) => cle([d.a.id, d.b.id]))
      expect(new Set(paires).size).toBe(10)
    }
  })

  it('ne met pas toujours le Geste qui émet le plus du même côté', () => {
    const aGauche = tirages.flat().filter((d) => d.a.empreinte > d.b.empreinte).length
    const total = tirages.flat().length
    expect(aGauche / total).toBeGreaterThan(0.3)
    expect(aGauche / total).toBeLessThan(0.7)
  })

  it('varie d’une Partie à l’autre', () => {
    const premieres = new Set(tirages.map((duels) => cle([duels[0].a.id, duels[0].b.id])))
    expect(premieres.size).toBeGreaterThan(10)
  })

  it('échoue clairement s’il n’y a pas assez de paires possibles', () => {
    expect(() => tirerPartieProvisoire(GESTES_CALCULES.slice(0, 3), hasardReproductible(1))).toThrow(/paires/)
  })
})
