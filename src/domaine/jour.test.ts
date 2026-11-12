import { describe, expect, it } from 'vitest'
import {
  decalerJour,
  formaterDuree,
  joursEntre,
  jourDeParis,
  numeroDuJour,
  PREMIER_JOUR,
  secondesAvantMinuitAParis,
} from './jour.ts'

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
    // Le lancement public (#19) : le samedi 14 novembre 2026 est le Duel Carbone du jour n° 1.
    expect(numeroDuJour('2026-11-14')).toBe(1)
  })

  it('ne descend jamais sous le n° 1 : les jours de test d’avant le lancement s’affichent aussi « n° 1 »', () => {
    expect(numeroDuJour(decalerJour(PREMIER_JOUR, -1))).toBe(1)
    expect(numeroDuJour(decalerJour(PREMIER_JOUR, -3))).toBe(1)
    expect(numeroDuJour(decalerJour(PREMIER_JOUR, 11))).toBe(12)
  })
})

describe('Le compte à rebours jusqu’au prochain Duel du jour (minuit à Paris)', () => {
  it('compte les secondes restantes avant minuit, heure de Paris', () => {
    // 22 h 00 min 00 s à Paris en hiver (UTC + 1) : il reste 2 heures.
    expect(secondesAvantMinuitAParis(new Date('2026-11-20T21:00:00Z'))).toBe(7200)
    // 23 h 59 min 30 s à Paris en été (UTC + 2) : il reste 30 secondes.
    expect(secondesAvantMinuitAParis(new Date('2026-07-01T21:59:30Z'))).toBe(30)
  })

  it('s’affiche en heures, minutes et secondes', () => {
    expect(formaterDuree(7200)).toBe('2 h 00 min 00 s')
    expect(formaterDuree(3 * 3600 + 5 * 60 + 9)).toBe('3 h 05 min 09 s')
  })
})
