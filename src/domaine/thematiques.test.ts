import { describe, expect, it } from 'vitest'
import type { GesteCalcule } from './geste.ts'
import { REGLES } from './regles.ts'
import {
  doitForcerUnDuelThematique,
  empreinteDesChiffres,
  positionDuDuelThematique,
  redigerTexte,
  validerDuelsThematiques,
  type DuelThematique,
} from './thematiques.ts'

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

describe('Garantie : jamais plus de quelques Parties de suite sans Duel thématique', () => {
  const THEMATIQUES = [thematique('a', 'b')]
  const n = REGLES.partiesMaxSansDuelThematique
  const sans = ['x|y', 'y|z']
  const avec = ['a|b', 'y|z']

  it('force un Duel thématique quand les dernières Parties n’en avaient aucun', () => {
    expect(doitForcerUnDuelThematique(Array(n).fill(sans), THEMATIQUES)).toBe(true)
  })

  it('laisse faire le hasard si l’une d’elles en avait un', () => {
    const parties = [...Array(n - 1).fill(sans), avec]
    expect(doitForcerUnDuelThematique(parties, THEMATIQUES)).toBe(false)
  })

  it('laisse faire le hasard pour un nouveau joueur, qui n’a pas encore joué assez de Parties', () => {
    expect(doitForcerUnDuelThematique([], THEMATIQUES)).toBe(false)
    expect(doitForcerUnDuelThematique(Array(n - 1).fill(sans), THEMATIQUES)).toBe(false)
  })

  it('ne regarde que les dernières Parties', () => {
    expect(doitForcerUnDuelThematique([avec, ...Array(n).fill(sans)], THEMATIQUES)).toBe(true)
  })

  it('ne force rien sans Duel thématique au catalogue', () => {
    expect(doitForcerUnDuelThematique(Array(n).fill(sans), [])).toBe(false)
  })
})

describe('Les chiffres des textes : calculés quand c’est possible, surveillés sinon', () => {
  const gestes = [geste('a', 10), geste('b', 4), geste('c', 2)]

  it('remplace {a}, {b} et {rapport} par les valeurs du moment, comme sur les cartes', () => {
    const t = thematique('a', 'b', { texte: '{a} contre {b} : {rapport} fois plus.' })
    expect(redigerTexte(t, gestes)).toBe('10 kg CO2e contre 4 kg CO2e : 2,5 fois plus.')
  })

  it('refuse un repère inconnu ou un Geste cité absent du catalogue', () => {
    expect(() => validerDuelsThematiques([thematique('a', 'b', { texte: 'Voir {c}.' })], gestes)).toThrow(/\{c\}/)
    expect(() => validerDuelsThematiques([thematique('a', 'b', { cites: ['licorne'] })], gestes)).toThrow(/licorne/)
  })

  it('change d’empreinte quand une valeur ADEME change, pour l’un des deux Gestes ou un Geste cité', () => {
    const t = thematique('a', 'b', { cites: ['c'] })
    const reference = empreinteDesChiffres(t, gestes)
    expect(empreinteDesChiffres(t, [geste('a', 11), geste('b', 4), geste('c', 2)])).not.toBe(reference)
    expect(empreinteDesChiffres(t, [geste('a', 10), geste('b', 4), geste('c', 3)])).not.toBe(reference)
  })

  it('garde la même empreinte si seuls les textes changent', () => {
    const t = thematique('a', 'b', { cites: ['c'] })
    expect(empreinteDesChiffres({ ...t, texte: 'Autre texte.', titre: 'Autre titre' }, gestes)).toBe(
      empreinteDesChiffres(t, gestes),
    )
  })
})
