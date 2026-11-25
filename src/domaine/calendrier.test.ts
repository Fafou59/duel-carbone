import { describe, expect, it } from 'vitest'
import { CALIBRAGE, GESTES_CALCULES } from '../donnees/index.ts'
import { DUELS_THEMATIQUES } from '../donnees/duels-thematiques.ts'
import {
  duelsDepuisCodes,
  joursRestants,
  MEMOIRE_DU_CALENDRIER,
  pairesDesDerniersJours,
  partieDuJour,
  prolongerCalendrier,
  type Calendrier,
} from './calendrier.ts'
import { cleDePaire } from './duel.ts'
import { decalerJour } from './jour.ts'
import { REGLES } from './regles.ts'

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

  it(`ne reprend aucun Duel des ${MEMOIRE_DU_CALENDRIER} jours précédents (issue 127)`, () => {
    expect(MEMOIRE_DU_CALENDRIER).toBe(10)
    for (let i = 1; i < cal.jours.length; i++) {
      const recents = new Set(cal.jours.slice(Math.max(0, i - MEMOIRE_DU_CALENDRIER), i).flatMap(cles))
      expect(cles(cal.jours[i]).filter((c) => recents.has(c)), `jour ${i}`).toEqual([])
    }
  })

  it('donne les paires des Duels du jour des derniers jours, aujourd’hui compris, pour que la Partie libre les écarte', () => {
    const dans12Jours = decalerJour(AUJOURDHUI, 12)
    expect(pairesDesDerniersJours(cal, dans12Jours)).toEqual(cal.jours.slice(3, 13).flatMap(cles))
    // Au début du calendrier, seulement les jours qu'il contient ; avant son début, aucun.
    expect(pairesDesDerniersJours(cal, AUJOURDHUI)).toEqual(cles(cal.jours[0]))
    expect(pairesDesDerniersJours(cal, decalerJour(AUJOURDHUI, -1))).toEqual([])
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

  it('reconstruit une Partie depuis ses codes « a>b », comme celle du calendrier', () => {
    expect(duelsDepuisCodes(cal.jours[0], GESTES_CALCULES, DUELS_THEMATIQUES)).toEqual(
      partieDuJour(cal, AUJOURDHUI, GESTES_CALCULES, DUELS_THEMATIQUES),
    )
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

describe('Les Duels thématiques de la Partie du jour', () => {
  // Un an de calendrier : assez pour que chaque Duel thématique passe plusieurs fois.
  const annee = prolongerCalendrier(null, '2027-01-01', { ...sources, horizon: 364 })
  const parCle = new Map(DUELS_THEMATIQUES.map((t) => [cleDePaire(t.a, t.b), t]))
  const thematiqueDuJour = annee.jours.map((jour) => cles(jour).find((c) => parCle.has(c)))
  const passages = thematiqueDuJour.filter((c): c is string => c !== undefined)

  it(`en place un environ 2 jours sur 3 (${Math.round(REGLES.duelDuJour.probabiliteDuelThematique * 100)} % de chances, 9/13 ≈ 69 % avec la garantie)`, () => {
    const part = passages.length / annee.jours.length
    expect(part).toBeGreaterThan(0.63)
    expect(part).toBeLessThan(0.76)
  })

  it(`ne laisse jamais passer plus de ${REGLES.duelDuJour.joursMaxSansDuelThematique} jours de suite sans`, () => {
    let sans = 0
    for (const c of thematiqueDuJour) {
      sans = c ? 0 : sans + 1
      expect(sans).toBeLessThanOrEqual(REGLES.duelDuJour.joursMaxSansDuelThematique)
    }
  })

  it('fait passer chaque Duel thématique une fois avant qu’un autre ne revienne', () => {
    const n = DUELS_THEMATIQUES.length
    expect(passages.length).toBeGreaterThan(2 * n)
    for (let debut = 0; debut + n <= passages.length; debut += n) {
      expect(new Set(passages.slice(debut, debut + n)).size, `cycle n° ${debut / n + 1}`).toBe(n)
    }
  })

  it('dans un ordre tiré au hasard, différent d’un cycle à l’autre', () => {
    const n = DUELS_THEMATIQUES.length
    expect(passages.slice(n, 2 * n)).not.toEqual(passages.slice(0, n))
  })
})
