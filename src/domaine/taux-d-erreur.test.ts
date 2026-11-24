import { describe, expect, it } from 'vitest'
import { GESTES_CALCULES } from '../donnees/index.ts'
import { plusEmetteur, moinsEmetteur, type Duel } from './duel.ts'
import { REGLES } from './regles.ts'
import { cleDuDuel, phraseDuTaux, reponsesDeLaPartie, sontDesComptes, tauxDErreur } from './taux-d-erreur.ts'

const geste = (id: string) => {
  const trouve = GESTES_CALCULES.find((g) => g.id === id)
  if (!trouve) throw new Error(`Geste inconnu : ${id}`)
  return trouve
}

describe('le Taux d’erreur', () => {
  it('ne s’affiche qu’à partir du nombre minimum de réponses', () => {
    const minimum = REGLES.tauxDErreur.reponsesMinimum
    expect(tauxDErreur(undefined)).toBeNull()
    expect(tauxDErreur({ reponses: minimum - 1, fausses: 1 })).toBeNull()
    expect(tauxDErreur({ reponses: minimum, fausses: 1 })).toBe(Math.round((1 / minimum) * 100))
  })

  it('n’affiche 0 % ou 100 % que si c’est vrai', () => {
    expect(tauxDErreur({ reponses: 1000, fausses: 0 })).toBe(0)
    expect(tauxDErreur({ reponses: 1000, fausses: 1 })).toBe(1)
    expect(tauxDErreur({ reponses: 1000, fausses: 999 })).toBe(99)
    expect(tauxDErreur({ reponses: 1000, fausses: 1000 })).toBe(100)
  })

  it('se dit toujours en réponses fausses, avec deux phrases pour les extrêmes', () => {
    expect(phraseDuTaux(72)).toBe('72 % de réponses fausses sur ce Duel')
    expect(phraseDuTaux(72, { courte: true })).toBe('72 % de réponses fausses')
    expect(phraseDuTaux(0)).toBe('Aucune réponse fausse sur ce Duel')
    expect(phraseDuTaux(100, { courte: true })).toBe('Que des réponses fausses')
  })
})

describe('la paire d’un Duel', () => {
  it('a la même clé quel que soit l’ordre des deux Gestes', () => {
    const [premier, second] = [geste(GESTES_CALCULES[0].id), geste(GESTES_CALCULES[1].id)]
    expect(cleDuDuel({ a: premier, b: second })).toBe(cleDuDuel({ a: second, b: premier }))
  })
})

describe('les comptes renvoyés par le serveur', () => {
  it.each([
    ['des comptes bien formés', { 'avion|steak': { reponses: 5, fausses: 2 } }, true],
    ['aucun compte', {}, true],
    ['plus de fausses que de réponses', { 'avion|steak': { reponses: 2, fausses: 3 } }, false],
    ['une clé mal formée', { avion: { reponses: 2, fausses: 1 } }, false],
    ['un nombre à virgule', { 'avion|steak': { reponses: 2.5, fausses: 1 } }, false],
    ['un tableau', [], false],
    ['rien', null, false],
  ])('%s', (_, brut, attendu) => {
    expect(sontDesComptes(brut)).toBe(attendu)
  })
})

describe('les réponses d’une Partie, telles que le serveur les compte', () => {
  const duels: Duel[] = Array.from({ length: 10 }, (_, i) => ({ a: GESTES_CALCULES[2 * i], b: GESTES_CALCULES[2 * i + 1] }))

  it('donnent la clé de chaque paire et si la réponse était fausse', () => {
    const choix = duels.map((d, i) => (i < 6 ? plusEmetteur(d).id : moinsEmetteur(d).id))
    const reponses = reponsesDeLaPartie(duels, choix)
    expect(reponses).toHaveLength(10)
    expect(reponses?.map((r) => r.fausse)).toEqual([false, false, false, false, false, false, true, true, true, true])
    expect(reponses?.[0].cle).toBe(cleDuDuel(duels[0]))
  })

  it('sont refusées si un choix n’est aucun des deux Gestes du Duel', () => {
    const choix = duels.map((d) => plusEmetteur(d).id)
    choix[4] = 'geste-inconnu'
    expect(reponsesDeLaPartie(duels, choix)).toBeNull()
    expect(reponsesDeLaPartie(duels, choix.slice(0, 9))).toBeNull()
  })
})
