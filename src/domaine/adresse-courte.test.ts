import { describe, expect, it } from 'vitest'
import { ancreDuCheminCourt } from './adresse-courte.ts'

describe('l’adresse courte à taper à la main (duelcarbone.fr/rejoindre)', () => {
  it('mène à la page du téléphone, avec le code s’il est dans l’adresse', () => {
    expect(ancreDuCheminCourt('/rejoindre')).toBe('#rejoindre')
    expect(ancreDuCheminCourt('/rejoindre/')).toBe('#rejoindre')
    expect(ancreDuCheminCourt('/Rejoindre')).toBe('#rejoindre')
    expect(ancreDuCheminCourt('/rejoindre/K7RM4P')).toBe('#rejoindre/K7RM4P')
  })

  it('ne touche à aucune autre adresse', () => {
    for (const chemin of ['/', '/api/seance', '/rejoindre-moi', '/rejoindre/K7RM4P/autre', '/sitemap.xml']) {
      expect(ancreDuCheminCourt(chemin)).toBeNull()
    }
  })
})
