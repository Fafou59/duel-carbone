import { describe, expect, it } from 'vitest'
import { empreinteDuTirage, frequencesDApparition, indicateursDeDiversite } from '../domaine/equilibrage.ts'
import { PARTIES_MEMORISEES } from '../navigateur/taille-memoire.ts'
import { DUELS_THEMATIQUES } from './duels-thematiques.ts'
import { CALIBRAGE, GESTES_CALCULES } from './index.ts'

describe("Coefficients d'équilibrage du vrai catalogue", () => {
  it('sont à jour : calculés pour ce catalogue, ces valeurs ADEME et ces règles', () => {
    expect(
      CALIBRAGE.empreinte,
      "Le catalogue, l'Instantané ou les règles ont changé depuis le dernier calibrage : lance npm run calibrer.",
    ).toBe(empreinteDuTirage(GESTES_CALCULES, DUELS_THEMATIQUES))
  })

  it('donnent un coefficient positif à chaque Geste tirable', () => {
    const tirables = GESTES_CALCULES.filter((g) => !g.seulementEnDuelThematique).map((g) => g.id)
    expect(Object.keys(CALIBRAGE.coefficients).sort()).toEqual([...tirables].sort())
    for (const c of Object.values(CALIBRAGE.coefficients)) expect(c).toBeGreaterThan(0)
  })

  it(
    'font apparaître le Geste le moins vu dans au moins 80 % des Parties d’un Geste moyen (2 000 Parties simulées)',
    { timeout: 60_000 },
    () => {
      const frequences = frequencesDApparition(GESTES_CALCULES, {
        coefficients: CALIBRAGE.coefficients,
        parties: 2000,
        partiesMemorisees: PARTIES_MEMORISEES,
        thematiques: DUELS_THEMATIQUES,
        graine: 2026,
      })
      const { moinsVu, moyenne } = indicateursDeDiversite(frequences)
      expect(moinsVu.frequence / moyenne, `Geste le moins vu : ${moinsVu.id}`).toBeGreaterThanOrEqual(0.8)
    },
  )
})
