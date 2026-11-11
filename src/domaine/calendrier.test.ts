import { describe, expect, it } from 'vitest'
import { CALIBRAGE, GESTES_CALCULES } from '../donnees/index.ts'
import { DUELS_THEMATIQUES } from '../donnees/duels-thematiques.ts'
import { joursRestants, partieDuJour, prolongerCalendrier, type Calendrier } from './calendrier.ts'
import { cleDePaire } from './duel.ts'
import { decalerJour } from './jour.ts'

const sources = { gestes: GESTES_CALCULES, thematiques: DUELS_THEMATIQUES, coefficients: CALIBRAGE.coefficients, empreinte: 'test' }
const AUJOURDHUI = '2026-11-12'
const cal = prolongerCalendrier(null, AUJOURDHUI, { ...sources, horizon: 20 })
const cles = (jour: string[]) => jour.map((d) => cleDePaire(...(d.split('>') as [string, string])))

describe('Le calendrier des Parties du jour', () => {
  it('prépare une Partie de 10 Duels pour aujourd’hui et chacun des jours à venir', () => {
    expect(cal.debut).toBe(AUJOURDHUI)
    expect(cal.jours).toHaveLength(21)
    for (const jour of cal.jours) expect(jour).toHaveLength(10)
    expect(joursRestants(cal, AUJOURDHUI)).toBe(20)
  })

  it('donne la même Partie à tous : relancé ailleurs, il tire exactement les mêmes Duels', () => {
    expect(prolongerCalendrier(null, AUJOURDHUI, { ...sources, horizon: 20 })).toEqual(cal)
  })

  it('ne change jamais le jour en cours ni les jours passés, même relancé avec un autre catalogue', () => {
    const demain = decalerJour(AUJOURDHUI, 1)
    const autreCatalogue = { ...sources, coefficients: {}, empreinte: 'autre' }
    const relance = prolongerCalendrier(cal, demain, { ...autreCatalogue, horizon: 20 })
    expect(relance.jours.slice(0, 2)).toEqual(cal.jours.slice(0, 2))
    expect(relance.jours.slice(2)).not.toEqual(cal.jours.slice(2, relance.jours.length))
    expect(relance.empreinte).toBe('autre')
    expect(joursRestants(relance, demain)).toBe(20)
  })

  it('évite de reprendre le même Duel deux jours de suite', () => {
    for (let i = 1; i < cal.jours.length; i++) {
      const hier = new Set(cles(cal.jours[i - 1]))
      expect(cles(cal.jours[i]).filter((c) => hier.has(c))).toEqual([])
    }
  })

  it('retrouve la Partie d’un jour, avec les textes de ses Duels thématiques', () => {
    const duels = partieDuJour(cal, AUJOURDHUI, GESTES_CALCULES, DUELS_THEMATIQUES)
    expect(duels.map((d) => `${d.a.id}>${d.b.id}`)).toEqual(cal.jours[0])
    const thematiques = cal.jours.flatMap((_, i) =>
      partieDuJour(cal, decalerJour(AUJOURDHUI, i), GESTES_CALCULES, DUELS_THEMATIQUES).filter((d) => d.thematique),
    )
    expect(thematiques.length).toBeGreaterThan(0)
    for (const d of thematiques) expect(d.thematique?.texte).not.toMatch(/[{}]/)
  })

  it('reboucle sur le premier jour si le calendrier est épuisé', () => {
    const apres = decalerJour(AUJOURDHUI, cal.jours.length)
    expect(partieDuJour(cal, apres, GESTES_CALCULES, DUELS_THEMATIQUES)).toEqual(
      partieDuJour(cal, AUJOURDHUI, GESTES_CALCULES, DUELS_THEMATIQUES),
    )
  })

  it('refuse un calendrier qui cite un Geste absent du catalogue', () => {
    const casse: Calendrier = { ...cal, jours: [['licorne>steak-boeuf', ...cal.jours[0].slice(1)]] }
    expect(() => partieDuJour(casse, AUJOURDHUI, GESTES_CALCULES, DUELS_THEMATIQUES)).toThrow(/licorne/)
  })
})
