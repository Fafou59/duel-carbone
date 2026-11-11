import { describe, expect, it } from 'vitest'
import type { GesteCalcule } from './geste.ts'
import { REGLES } from './regles.ts'
import { positionDuDuelThematique, validerDuelsThematiques, type DuelThematique } from './thematiques.ts'

const geste = (id: string, empreinte: number, champs: Partial<GesteCalcule> = {}): GesteCalcule => ({
  id,
  titre: id,
  sousTitre: '',
  justification: '',
  nature: 'objet',
  quantite: 1,
  empreinte,
  etapes: [],
  equivalent: { slug: id, nom: id, unite: 'unité', valeur: empreinte, url: '' },
  ...champs,
})

const thematique = (a: string, b: string, champs: Partial<DuelThematique> = {}): DuelThematique => ({
  a,
  b,
  titre: 'Un titre',
  accroche: 'Une accroche qui ne donne pas la réponse.',
  texte: 'Un texte chiffré, affiché après la réponse.',
  ...champs,
})

describe('Position d’un Duel thématique dans la Partie', () => {
  it('va au Duel dont la tranche contient son Rapport : sa Difficulté vient de son Rapport', () => {
    REGLES.tranchesParDuel.forEach(({ min, max }, i) => {
      expect(positionDuDuelThematique(min), `Duel ${i + 1}`).toBe(i)
      expect(positionDuDuelThematique((min + max) / 2), `Duel ${i + 1}`).toBe(i)
    })
  })

  it('ouvre la Partie (Duel 1) quand son Rapport dépasse le plafond, comme l’eau du robinet (×2 430)', () => {
    expect(positionDuDuelThematique(2430)).toBe(0)
  })
})

describe('Validation des Duels thématiques', () => {
  const gestes = [geste('a', 10), geste('b', 5), geste('c', 9.5), geste('robinet', 0.0002, { seulementEnDuelThematique: true })]

  it('accepte des Duels corrects, même avec un Geste réservé', () => {
    expect(() => validerDuelsThematiques([thematique('a', 'b'), thematique('b', 'robinet')], gestes)).not.toThrow()
  })

  it('refuse un Geste absent du catalogue, en le nommant', () => {
    expect(() => validerDuelsThematiques([thematique('a', 'licorne')], gestes)).toThrow(/licorne/)
  })

  it('refuse un Duel sous le plancher : même choisi à la main, un quasi-égal laisserait le joueur se sentir volé', () => {
    expect(() => validerDuelsThematiques([thematique('a', 'c')], gestes)).toThrow(/a.*c.*plancher/)
  })

  it('refuse deux Duels thématiques sur la même paire', () => {
    expect(() => validerDuelsThematiques([thematique('a', 'b'), thematique('b', 'a')], gestes)).toThrow(/deux fois/)
  })

  it('refuse un titre, une accroche ou un texte vide', () => {
    for (const champ of ['titre', 'accroche', 'texte'] as const) {
      expect(() => validerDuelsThematiques([thematique('a', 'b', { [champ]: '  ' })], gestes)).toThrow(new RegExp(champ))
    }
  })
})
