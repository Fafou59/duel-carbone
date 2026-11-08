import { describe, expect, it } from 'vitest'
import { estBonChoix, moinsEmetteur, plusEmetteur, rapport, type Duel } from './duel.ts'
import type { GesteCalcule } from './geste.ts'

const geste = (id: string, empreinte: number): GesteCalcule => ({
  id,
  titre: id,
  sousTitre: '',
  justification: '',
  quantite: 1,
  empreinte,
  etapes: [],
  equivalent: { slug: id, nom: id, unite: 'unité', valeur: empreinte, url: '' },
})

const steak = geste('steak', 3.361)
const avocat = geste('avocat', 0.3105)

describe('Règles d’un Duel', () => {
  it('désigne le Geste qui émet le plus, quel que soit son côté', () => {
    const duels: Duel[] = [
      { a: steak, b: avocat },
      { a: avocat, b: steak },
    ]
    for (const duel of duels) {
      expect(plusEmetteur(duel)).toBe(steak)
      expect(moinsEmetteur(duel)).toBe(avocat)
    }
  })

  it('calcule le Rapport entre le plus et le moins émetteur', () => {
    expect(rapport({ a: avocat, b: steak })).toBeCloseTo(10.82, 2)
  })

  it('dit si un choix est bon', () => {
    const duel = { a: avocat, b: steak }
    expect(estBonChoix(duel, 'steak')).toBe(true)
    expect(estBonChoix(duel, 'avocat')).toBe(false)
  })
})
