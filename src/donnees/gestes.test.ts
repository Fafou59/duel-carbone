// Ce test vérifie le VRAI catalogue face au VRAI Instantané : si un import ou une modification
// du catalogue casse la cohérence, la CI devient rouge avant que le jeu n'affiche une erreur.
import { describe, expect, it } from 'vitest'
import { calculerGeste, validerCatalogue } from '../domaine/geste.ts'
import { GESTES } from './gestes.ts'
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

  it('a une icône pour chaque Geste (public/icones/<id>.svg, fabriquée par npm run icones)', () => {
    // import.meta.glob (Vite) liste les fichiers du dossier, sans les charger.
    const fichiers = new Set(Object.keys(import.meta.glob('../../public/icones/*.svg')))
    const sansIcone = GESTES.filter((g) => !fichiers.has(`../../public/icones/${g.id}.svg`)).map((g) => g.id)
    expect(sansIcone).toEqual([])
  })

  it('donne une empreinte positive à chaque Geste tiré au hasard (une empreinte nulle est réservée aux Duels thématiques)', () => {
    for (const g of GESTES.filter((x) => !x.seulementEnDuelThematique)) {
      expect(calculerGeste(g, instantane).empreinte, g.id).toBeGreaterThan(0)
    }
  })
})
