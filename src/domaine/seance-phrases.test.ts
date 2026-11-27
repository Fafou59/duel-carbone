import { describe, expect, it } from 'vitest'
import { hasardReproductible } from './hasard.ts'
import { categorieDePlace, PHRASES_DE_PLACE, tirerUnePhrase, type CategorieDePlace } from './seance-phrases.ts'

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
  it('compte 10 phrases différentes par catégorie', () => {
    const toutes = Object.values(PHRASES_DE_PLACE).flat()
    for (const phrases of Object.values(PHRASES_DE_PLACE)) expect(phrases).toHaveLength(10)
    expect(new Set(toutes).size).toBe(toutes.length)
  })

  it('n’accorde rien au masculin ni au féminin (on ne sait rien du Participant)', () => {
    for (const phrase of Object.values(PHRASES_DE_PLACE).flat()) {
      expect(phrase).not.toMatch(/\b(seule?|placée?|prête?|arrivée?|concentrée?|premiers? ex aequo|dernière? place)\b/i)
    }
  })

  it('ne répète jamais une phrase au fil de 9 classements, même dans une seule catégorie', () => {
    const hasard = hasardReproductible(7)
    for (const categorie of Object.keys(PHRASES_DE_PLACE) as CategorieDePlace[]) {
      const lues: string[] = []
      for (let i = 0; i < 9; i++) lues.push(tirerUnePhrase(categorie, lues, hasard))
      expect(new Set(lues).size).toBe(9)
      for (const phrase of lues) expect(PHRASES_DE_PLACE[categorie]).toContain(phrase)
    }
  })

  it('reprend parmi toutes quand toutes ont été lues', () => {
    const toutes = [...PHRASES_DE_PLACE.milieu]
    expect(toutes).toContain(tirerUnePhrase('milieu', toutes, () => 0.999))
  })
})
