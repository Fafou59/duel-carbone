import { describe, expect, it } from 'vitest'
import { categorieDePlace, CLASSEMENTS_INTERMEDIAIRES, PHRASES_DE_PLACE, phraseDePlace, type CategorieDePlace } from './seance-phrases.ts'

describe('la catégorie de place', () => {
  it('distingue la tête, seul ou à égalité', () => {
    expect(categorieDePlace({ rang: 1, exAequo: false, devant: 0, derriere: 23 })).toBe('seul-en-tete')
    expect(categorieDePlace({ rang: 1, exAequo: true, devant: 0, derriere: 20 })).toBe('en-tete-a-egalite')
    // Toute la salle à égalité : tout le monde est en tête.
    expect(categorieDePlace({ rang: 1, exAequo: true, devant: 0, derriere: 0 })).toBe('en-tete-a-egalite')
  })

  it('garde le podium aux trois premiers paliers, même quand le deuxième est le dernier', () => {
    expect(categorieDePlace({ rang: 3, exAequo: true, devant: 5, derriere: 10 })).toBe('podium')
    expect(categorieDePlace({ rang: 2, exAequo: false, devant: 1, derriere: 0 })).toBe('podium')
  })

  it('compte le top 10 en Participants devant soi, comme les 10 lignes de l’écran projeté', () => {
    expect(categorieDePlace({ rang: 4, exAequo: false, devant: 9, derriere: 5 })).toBe('top-10')
    expect(categorieDePlace({ rang: 4, exAequo: false, devant: 10, derriere: 5 })).toBe('milieu')
  })

  it('reconnaît le dernier palier, après le podium', () => {
    expect(categorieDePlace({ rang: 6, exAequo: true, devant: 20, derriere: 0 })).toBe('dernier')
    expect(categorieDePlace({ rang: 5, exAequo: false, devant: 4, derriere: 0 })).toBe('dernier')
  })
})

describe('les phrases', () => {
  it('compte une phrase par classement intermédiaire (9) dans chaque catégorie, toutes différentes', () => {
    const toutes = Object.values(PHRASES_DE_PLACE).flat()
    expect(CLASSEMENTS_INTERMEDIAIRES).toBe(9)
    for (const phrases of Object.values(PHRASES_DE_PLACE)) expect(phrases).toHaveLength(CLASSEMENTS_INTERMEDIAIRES)
    expect(new Set(toutes).size).toBe(toutes.length)
  })

  // « Un seul Duel » parle du Duel, pas du Participant : il est permis.
  it('n’accorde rien au masculin ni au féminin (on ne sait rien du Participant)', () => {
    for (const phrase of Object.values(PHRASES_DE_PLACE).flat()) {
      expect(phrase).not.toMatch(/\b(seule?(?! Duel)|placée?|prête?|arrivée?|concentrée?|premiers? ex aequo|dernière? place)\b/i)
    }
  })

  it('suit le moment de la Séance : chaque classement a la sienne, jamais deux fois la même', () => {
    for (const categorie of Object.keys(PHRASES_DE_PLACE) as CategorieDePlace[]) {
      const lues = Array.from({ length: CLASSEMENTS_INTERMEDIAIRES }, (_, index) => phraseDePlace(categorie, index))
      expect(new Set(lues).size).toBe(CLASSEMENTS_INTERMEDIAIRES)
    }
    expect(phraseDePlace('seul-en-tete', 0)).toBe('Premier Duel, première place : joli départ !')
    expect(phraseDePlace('podium', 8)).toBe('Sur le podium avant le Duel ultime : tiens bon !')
  })

  it('se rabat sur la plus proche hors des bornes', () => {
    expect(phraseDePlace('milieu', 12)).toBe(PHRASES_DE_PLACE.milieu[8])
    expect(phraseDePlace('milieu', -1)).toBe(PHRASES_DE_PLACE.milieu[0])
  })
})
