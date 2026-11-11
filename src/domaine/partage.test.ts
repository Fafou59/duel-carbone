import { describe, expect, it } from 'vitest'
import { ADRESSE_DU_JEU, texteDePartage, texteDePartageDuJour } from './partage.ts'

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
  it('donne l’accroche, le numéro, le score, une case par Duel et le lien du jeu', () => {
    expect(texteDePartageDuJour({ numero: 12, score: 8, bonnes: BONNES })).toBe(
      [
        "C'est l'heure du Duel Carbone ! ⚔️",
        'Duel Carbone du jour n° 12 : 8/10',
        '🟩🟩🟩🟩🟥🟩🟩🟥🟩🟩',
        ADRESSE_DU_JEU,
      ].join('\n'),
    )
  })

  it('omet la grille si les réponses ne sont pas connues', () => {
    expect(texteDePartageDuJour({ numero: 1, score: 7, bonnes: [] })).toBe(
      ["C'est l'heure du Duel Carbone ! ⚔️", 'Duel Carbone du jour n° 1 : 7/10', ADRESSE_DU_JEU].join('\n'),
    )
  })
})
