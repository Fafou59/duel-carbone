// Ce test vérifie le VRAI catalogue face au VRAI Instantané : si un import ou une modification
// du catalogue casse la cohérence, la CI devient rouge avant que le jeu n'affiche une erreur.
import { describe, expect, it } from 'vitest'
import { calculerGeste, validerCatalogue } from '../domaine/geste.ts'
import { FOURCHETTES_DE_QUANTITE, GESTES, HORS_FOURCHETTE } from './gestes.ts'
import instantaneJson from './instantane.json'
import type { Instantane } from './referentiel.ts'

const instantane = instantaneJson as Instantane

describe('Catalogue des Gestes face à l’Instantané actuel', () => {
  it('est valide', () => {
    expect(() => validerCatalogue(GESTES, instantane)).not.toThrow()
  })

  it('compte 119 Gestes tirés au hasard : les 81 du lancement et les 38 de l’issue 93', () => {
    expect(GESTES.filter((g) => !g.seulementEnDuelThematique)).toHaveLength(119)
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

  it('garde des Quantités comparables au sein d’une même Nature (un repas est un plat complet, un aliment une portion)', () => {
    const horsFourchette = GESTES.flatMap((g) => {
      const fourchettes = FOURCHETTES_DE_QUANTITE[g.nature]
      if (!fourchettes) return []
      const unite = instantane.equivalents.find((e) => e.slug === g.equivalent)?.unite ?? '?'
      const fourchette = fourchettes[unite]
      if (!fourchette) return [`${g.id} : unité « ${unite} » sans fourchette pour un ${g.nature}`]
      const [min, max] = fourchette
      return g.quantite >= min && g.quantite <= max ? [] : [`${g.id} : ${g.quantite} ${unite}, hors de ${min} à ${max}`]
    })
    const aTrancher = horsFourchette.filter((p) => !Object.hasOwn(HORS_FOURCHETTE, p.split(' : ')[0]))
    expect(aTrancher, 'Quantité hors de la fourchette de sa Nature : corrige-la, ou fais-la valider dans HORS_FOURCHETTE').toEqual([])
    // La liste des exceptions reste juste : un Geste revenu dans sa fourchette en sort.
    expect(Object.keys(HORS_FOURCHETTE).filter((id) => !horsFourchette.some((p) => p.startsWith(`${id} : `)))).toEqual([])
  })

  it('donne une empreinte positive à chaque Geste tiré au hasard (une empreinte nulle est réservée aux Duels thématiques)', () => {
    for (const g of GESTES.filter((x) => !x.seulementEnDuelThematique)) {
      expect(calculerGeste(g, instantane).empreinte, g.id).toBeGreaterThan(0)
    }
  })
})
