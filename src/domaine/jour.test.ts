import { describe, expect, it } from 'vitest'
import { decalerJour, joursEntre, jourDeParis, numeroDuJour, PREMIER_JOUR } from './jour.ts'

describe('Le jour du Duel : minuit, heure de Paris, quel que soit le fuseau du joueur', () => {
  it('change de jour à minuit à Paris en hiver (UTC + 1)', () => {
    expect(jourDeParis(new Date('2026-11-11T22:59:59Z'))).toBe('2026-11-11')
    expect(jourDeParis(new Date('2026-11-11T23:00:00Z'))).toBe('2026-11-12')
  })

  it('change de jour à minuit à Paris en été (UTC + 2)', () => {
    expect(jourDeParis(new Date('2026-07-01T21:59:59Z'))).toBe('2026-07-01')
    expect(jourDeParis(new Date('2026-07-01T22:00:00Z'))).toBe('2026-07-02')
  })

  it('compte les jours, y compris d’un mois et d’une année à l’autre', () => {
    expect(decalerJour('2026-12-31', 1)).toBe('2027-01-01')
    expect(decalerJour('2027-03-01', -1)).toBe('2027-02-28')
    expect(joursEntre('2026-11-12', '2027-11-12')).toBe(365)
  })

  it('numérote les Duels du jour à partir du premier jour (n° 1)', () => {
    expect(numeroDuJour(PREMIER_JOUR)).toBe(1)
    expect(numeroDuJour(decalerJour(PREMIER_JOUR, 11))).toBe(12)
  })
})
