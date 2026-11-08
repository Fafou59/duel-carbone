import { describe, expect, it } from 'vitest'
import { hasardReproductible, melanger } from './hasard.ts'

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
