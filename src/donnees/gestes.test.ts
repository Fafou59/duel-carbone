// Ce test vérifie le VRAI catalogue face au VRAI Instantané : si un import ou une modification
// du catalogue casse la cohérence, la CI devient rouge avant que le jeu n'affiche une erreur.
import { describe, expect, it } from 'vitest'
import { calculerGeste, validerCatalogue } from '../domaine/geste.ts'
import { GESTES } from './gestes.ts'
import { ICONES } from './icones.ts'
import instantaneJson from './instantane.json'
import type { Instantane } from './referentiel.ts'

const instantane = instantaneJson as Instantane

describe('Catalogue des Gestes face à l’Instantané actuel', () => {
  it('est valide', () => {
    expect(() => validerCatalogue(GESTES, instantane)).not.toThrow()
  })

  it('a un titre, un sous-titre et une justification pour chaque Geste', () => {
    for (const g of GESTES) {
      expect(g.titre.trim(), g.id).not.toBe('')
      expect(g.sousTitre.trim(), g.id).not.toBe('')
      expect(g.justification.trim(), g.id).not.toBe('')
    }
  })

  it('a une icône pour chaque Geste', () => {
    const sansIcone = GESTES.filter((g) => !(g.id in ICONES)).map((g) => g.id)
    expect(sansIcone).toEqual([])
  })

  it('donne une empreinte strictement positive à chaque Geste', () => {
    for (const g of GESTES) {
      expect(calculerGeste(g, instantane).empreinte, g.id).toBeGreaterThan(0)
    }
  })
})
