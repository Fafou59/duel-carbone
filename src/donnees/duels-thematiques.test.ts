import { describe, expect, it } from 'vitest'
import { rapport } from '../domaine/duel.ts'
import {
  empreinteDesChiffres,
  positionDuDuelThematique,
  redigerTexte,
  validerDuelsThematiques,
} from '../domaine/thematiques.ts'
import { DUELS_THEMATIQUES } from './duels-thematiques.ts'
import { GESTES_CALCULES, gesteCalcule } from './index.ts'

describe('Catalogue des Duels thématiques', () => {
  it('est valide : Gestes connus, au-dessus du plancher, sans doublon, textes complets', () => {
    expect(() => validerDuelsThematiques(DUELS_THEMATIQUES, GESTES_CALCULES)).not.toThrow()
  })

  it('compte les 35 Duels validés par Fabien (dont les 2 de l’Easter Egg)', () => {
    expect(DUELS_THEMATIQUES).toHaveLength(35)
  })

  it('utilise chaque Geste réservé dans au moins un Duel thématique (sinon il ne sortirait jamais)', () => {
    const utilises = new Set(DUELS_THEMATIQUES.flatMap((t) => [t.a, t.b]))
    const reserves = GESTES_CALCULES.filter((g) => g.seulementEnDuelThematique).map((g) => g.id)
    expect(reserves.filter((id) => !utilises.has(id))).toEqual([])
  })

  it('place les pièges du catalogue sur toute la Partie, du Duel 1 au Duel 10', () => {
    const positions = new Set(
      DUELS_THEMATIQUES.map((t) => positionDuDuelThematique(rapport({ a: gesteCalcule(t.a), b: gesteCalcule(t.b) }))),
    )
    expect(positions.has(0)).toBe(true)
    expect(positions.has(9)).toBe(true)
  })
})

describe('Les chiffres des Duels thématiques restent justes après un import ADEME', () => {
  it('remplace tous les repères : aucun « { » ne reste dans les textes affichés', () => {
    for (const t of DUELS_THEMATIQUES) expect(redigerTexte(t, GESTES_CALCULES), t.titre).not.toMatch(/[{}]/)
  })

  it('a été relu depuis la dernière modification des valeurs ADEME dont dépendent ses chiffres écrits à la main', () => {
    const aRelire = DUELS_THEMATIQUES.filter((t) => t.relu !== empreinteDesChiffres(t, GESTES_CALCULES)).map(
      (t) =>
        `« ${t.titre} » (${t.a} / ${t.b}) : relis son texte et le sous-titre de ses Gestes (années des agrégats), ` +
        `puis écris relu: '${empreinteDesChiffres(t, GESTES_CALCULES)}'`,
    )
    expect(aRelire, 'Des valeurs ADEME ont changé : des chiffres écrits à la main sont peut-être faux.').toEqual([])
  })
})
