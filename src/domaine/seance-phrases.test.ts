import { describe, expect, it } from 'vitest'
import {
  categorieDePlace,
  CLASSEMENTS_INTERMEDIAIRES,
  PARTICIPANTS_MIN_POUR_LE_PODIUM,
  PHRASES_DE_PLACE,
  phraseDePlace,
  type CategorieDePlace,
} from './seance-phrases.ts'

describe('la catégorie de place', () => {
  it('distingue la tête, seul ou à égalité', () => {
    expect(categorieDePlace({ rang: 1, exAequo: false, derriere: 23, participants: 24 })).toBe('seul-en-tete')
    expect(categorieDePlace({ rang: 1, exAequo: true, derriere: 20, participants: 24 })).toBe('en-tete-a-egalite')
    // Toute la salle à égalité : tout le monde est en tête.
    expect(categorieDePlace({ rang: 1, exAequo: true, derriere: 0, participants: 24 })).toBe('en-tete-a-egalite')
  })

  it('met le dernier palier avant le podium, ex aequo compris', () => {
    expect(categorieDePlace({ rang: 6, exAequo: true, derriere: 0, participants: 24 })).toBe('dernier')
    expect(categorieDePlace({ rang: 3, exAequo: true, derriere: 0, participants: 24 })).toBe('dernier')
    // À 2 : le second est le dernier.
    expect(categorieDePlace({ rang: 2, exAequo: false, derriere: 0, participants: 2 })).toBe('dernier')
  })

  it('à 3 Participants, le 3e a les phrases du dernier et le 2e celles du milieu', () => {
    expect(categorieDePlace({ rang: 3, exAequo: false, derriere: 0, participants: 3 })).toBe('dernier')
    expect(categorieDePlace({ rang: 2, exAequo: false, derriere: 1, participants: 3 })).toBe('milieu')
  })

  it('garde le podium aux 2e et 3e paliers, à partir de 4 Participants', () => {
    expect(PARTICIPANTS_MIN_POUR_LE_PODIUM).toBe(4)
    expect(categorieDePlace({ rang: 2, exAequo: false, derriere: 2, participants: 4 })).toBe('podium')
    expect(categorieDePlace({ rang: 3, exAequo: true, derriere: 10, participants: 24 })).toBe('podium')
  })

  it('range tous les autres au milieu (pas de top 10)', () => {
    expect(categorieDePlace({ rang: 4, exAequo: false, derriere: 5, participants: 24 })).toBe('milieu')
    expect(categorieDePlace({ rang: 12, exAequo: true, derriere: 1, participants: 24 })).toBe('milieu')
  })
})

describe('les phrases', () => {
  it('compte une phrase par classement intermédiaire (9) dans chaque catégorie', () => {
    expect(CLASSEMENTS_INTERMEDIAIRES).toBe(9)
    for (const phrases of Object.values(PHRASES_DE_PLACE)) expect(phrases).toHaveLength(CLASSEMENTS_INTERMEDIAIRES)
  })

  it('ne donne jamais la même phrase à deux classements différents, quelle que soit la place', () => {
    // Deux catégories peuvent partager une phrase au même classement (chacun n'en lit qu'une à ce moment-là).
    const parPhrase = new Map<string, Set<number>>()
    for (const phrases of Object.values(PHRASES_DE_PLACE)) {
      phrases.forEach((phrase, index) => parPhrase.set(phrase, (parPhrase.get(phrase) ?? new Set()).add(index)))
    }
    for (const [phrase, classements] of parPhrase) expect(classements.size, phrase).toBe(1)
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
