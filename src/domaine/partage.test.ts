import { describe, expect, it } from 'vitest'
import { ADRESSE_DU_JEU, accrocheDuJour, texteDePartage, texteDePartageDuJour } from './partage.ts'

const ACCROCHES = ['Première ⚔️', 'Deuxième 🥊', 'Troisième 🔨']
const BONNES = [true, true, true, true, false, true, true, false, true, true]

describe('Texte de partage de la Partie libre', () => {
  it('donne le score, le défi et le lien du jeu', () => {
    expect(texteDePartage(8, 10)).toBe(`J'ai fait 8/10 à Duel Carbone 🌍 Sauras-tu faire mieux ? ${ADRESSE_DU_JEU}`)
  })

  it('pointe vers le site public, en https', () => {
    expect(ADRESSE_DU_JEU).toMatch(/^https:\/\//)
  })
})

describe('Texte de partage du Duel du jour', () => {
  it('donne l’accroche du jour, le numéro, le score, une case par Duel et le lien du jeu', () => {
    expect(texteDePartageDuJour({ numero: 2, score: 8, bonnes: BONNES, accroches: ACCROCHES })).toBe(
      ['Deuxième 🥊', 'Duel Carbone du jour n° 2 : 8/10', '🟩🟩🟩🟩🟥🟩🟩🟥🟩🟩', ADRESSE_DU_JEU].join('\n'),
    )
  })

  it('omet la grille si les réponses ne sont pas connues', () => {
    expect(texteDePartageDuJour({ numero: 1, score: 7, bonnes: [], accroches: ACCROCHES })).toBe(
      ['Première ⚔️', 'Duel Carbone du jour n° 1 : 7/10', ADRESSE_DU_JEU].join('\n'),
    )
  })
})

describe('Accroche du jour', () => {
  it('suit la liste dans l’ordre, la même pour tout le monde un jour donné, puis reboucle', () => {
    expect([1, 2, 3, 4, 5].map((numero) => accrocheDuJour(numero, ACCROCHES))).toEqual([
      'Première ⚔️',
      'Deuxième 🥊',
      'Troisième 🔨',
      'Première ⚔️',
      'Deuxième 🥊',
    ])
  })

  it('reste définie avant le premier jour (numéro nul ou négatif)', () => {
    expect(accrocheDuJour(0, ACCROCHES)).toBe('Troisième 🔨')
    expect(accrocheDuJour(-1, ACCROCHES)).toBe('Deuxième 🥊')
  })
})
