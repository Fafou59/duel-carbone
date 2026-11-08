import { describe, expect, it } from 'vitest'
import { ADRESSE_DU_JEU, texteDePartage } from './partage.ts'

describe('Texte de partage', () => {
  it('donne le score, le défi et le lien du jeu', () => {
    expect(texteDePartage(8, 10)).toBe(`J'ai fait 8/10 à Duel Carbone 🌍 Sauras-tu faire mieux ? ${ADRESSE_DU_JEU}`)
  })

  it('pointe vers le site public, en https', () => {
    expect(ADRESSE_DU_JEU).toMatch(/^https:\/\//)
  })
})
