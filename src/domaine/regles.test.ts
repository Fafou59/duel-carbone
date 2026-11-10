import { describe, expect, it } from 'vitest'
import { REGLES } from './regles.ts'

describe('Règles du jeu : la courbe de difficulté', () => {
  const tranches = REGLES.tranchesParDuel

  it('donne une tranche de Rapport à chaque Duel de la Partie', () => {
    expect(tranches).toHaveLength(REGLES.nombreDeDuels)
  })

  it('part du plafond au Duel 1 et descend jusqu’au plancher au dernier Duel', () => {
    expect(tranches[0].max).toBe(REGLES.plafond)
    expect(tranches.at(-1)!.min).toBe(REGLES.plancher)
  })

  it('enchaîne les tranches en descendant, sans trou ni chevauchement', () => {
    tranches.forEach((tranche, i) => {
      expect(tranche.min, `Duel ${i + 1}`).toBeLessThan(tranche.max)
      if (i > 0) expect(tranche.max, `Duel ${i + 1}`).toBe(tranches[i - 1].min)
    })
  })
})
