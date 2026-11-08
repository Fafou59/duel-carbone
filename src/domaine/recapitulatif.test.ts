import { describe, expect, it } from 'vitest'
import type { GesteCalcule } from './geste.ts'
import { avancer, demarrerPartie, type EtatPartie } from './partie.ts'
import { messageDeScore, recapitulatif } from './recapitulatif.ts'

const geste = (id: string, empreinte: number): GesteCalcule =>
  ({ id, titre: id, sousTitre: '', empreinte }) as unknown as GesteCalcule

// 10 Duels : à chaque fois, « gros-n » émet n+2 fois plus que « petit-n ».
const DUELS = Array.from({ length: 10 }, (_, n) => ({ a: geste(`petit-${n}`, 1), b: geste(`gros-${n}`, n + 2) }))

/** Joue une Partie entière : bonne réponse aux Duels dont la position est dans `reussis`. */
function jouer(reussis: number[]): EtatPartie {
  let etat = demarrerPartie(DUELS)
  for (let n = 0; n < 10; n++) {
    const idGeste = reussis.includes(n) ? `gros-${n}` : `petit-${n}`
    etat = avancer(avancer(etat, { type: 'choisir', idGeste }), { type: 'suivant' })
  }
  return etat
}

describe('Récapitulatif', () => {
  it('donne une ligne par Duel, numérotée de 1 à 10, dans l’ordre de la Partie', () => {
    const lignes = recapitulatif(jouer([]))
    expect(lignes.map((l) => l.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(lignes[3].duel).toBe(DUELS[3])
  })

  it('indique pour chaque Duel le choix du joueur et s’il était bon', () => {
    const lignes = recapitulatif(jouer([0, 2]))
    expect(lignes[0]).toMatchObject({ idChoisi: 'gros-0', bonne: true })
    expect(lignes[1]).toMatchObject({ idChoisi: 'petit-1', bonne: false })
    expect(lignes[2]).toMatchObject({ idChoisi: 'gros-2', bonne: true })
  })

  it('donne l’équivalence du Duel : le plus émetteur, le moins émetteur et le Rapport', () => {
    const ligne = recapitulatif(jouer([]))[4]
    expect(ligne.plus.id).toBe('gros-4')
    expect(ligne.moins.id).toBe('petit-4')
    expect(ligne.rapport).toBe(6)
  })

  it('donne la Difficulté attendue de chaque Duel', () => {
    const difficultes = recapitulatif(jouer([])).map((l) => l.difficulte)
    expect(difficultes[0]).toBe('facile')
    expect(difficultes[9]).toBe('ultime')
  })

  it('refuse une Partie qui n’est pas terminée', () => {
    expect(() => recapitulatif(demarrerPartie(DUELS))).toThrow()
  })
})

describe('Message de fin de Partie', () => {
  it.each([
    [10, 'Du grand art'],
    [9, 'Du grand art'],
    [8, 'Très bien joué'],
    [7, 'Très bien joué'],
    [6, 'Pas mal'],
    [5, 'Pas mal'],
    [4, 'rejoue'],
    [0, 'rejoue'],
  ])('pour %i/10, contient « %s »', (score, attendu) => {
    expect(messageDeScore(score, 10)).toContain(attendu)
  })

  it('suit la proportion de bonnes réponses, pas un nombre fixe', () => {
    expect(messageDeScore(18, 20)).toBe(messageDeScore(9, 10))
  })
})
