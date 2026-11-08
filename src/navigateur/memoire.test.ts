import { describe, expect, it } from 'vitest'
import { CLE_MEMOIRE, creerMemoire, PARTIES_MEMORISEES, type Stockage } from './memoire.ts'

/** Un faux stockage, en mémoire vive : on peut l'inspecter, le pré-remplir ou le faire tomber en panne. */
function stockage(initial: Record<string, string> = {}): Stockage & { donnees: Map<string, string> } {
  const donnees = new Map(Object.entries(initial))
  return {
    donnees,
    getItem: (cle) => donnees.get(cle) ?? null,
    setItem: (cle, valeur) => void donnees.set(cle, valeur),
  }
}

const enPanne: Stockage = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

const partie = (n: number) => Array.from({ length: 10 }, (_, i) => `p${n}-${i}`)

describe('Mémoire locale : meilleur score', () => {
  it('n’a aucun meilleur score au départ', () => {
    expect(creerMemoire(stockage()).meilleurScore()).toBeNull()
  })

  it('retient le meilleur score, et seulement s’il est battu', () => {
    const s = stockage()
    const memoire = creerMemoire(s)
    memoire.enregistrerScore(6)
    memoire.enregistrerScore(4)
    expect(memoire.meilleurScore()).toBe(6)
    memoire.enregistrerScore(9)
    expect(memoire.meilleurScore()).toBe(9)
  })

  it('persiste : une nouvelle lecture du même stockage retrouve le score (comme après un rechargement)', () => {
    const s = stockage()
    creerMemoire(s).enregistrerScore(7)
    expect(creerMemoire(s).meilleurScore()).toBe(7)
  })
})

describe('Mémoire locale : paires récentes', () => {
  it('ne connaît aucune paire au départ', () => {
    expect(creerMemoire(stockage()).pairesRecentes().size).toBe(0)
  })

  it('retient les paires des dernières Parties, pas au-delà', () => {
    const memoire = creerMemoire(stockage())
    for (let n = 1; n <= PARTIES_MEMORISEES + 1; n++) memoire.enregistrerPartie(partie(n))
    const recentes = memoire.pairesRecentes()
    expect(recentes.size).toBe(PARTIES_MEMORISEES * 10)
    expect(recentes.has('p1-0')).toBe(false)
    expect(recentes.has(`p${PARTIES_MEMORISEES + 1}-9`)).toBe(true)
  })
})

describe('Mémoire locale : robustesse', () => {
  it('fonctionne sans stockage (navigation privée stricte) : rien n’est retenu, rien ne plante', () => {
    const memoire = creerMemoire(null)
    memoire.enregistrerScore(8)
    memoire.enregistrerPartie(partie(1))
    expect(memoire.meilleurScore()).toBeNull()
    expect(memoire.pairesRecentes().size).toBe(0)
  })

  it('ne plante pas si le stockage tombe en panne', () => {
    const memoire = creerMemoire(enPanne)
    expect(() => memoire.enregistrerScore(8)).not.toThrow()
    expect(() => memoire.enregistrerPartie(partie(1))).not.toThrow()
    expect(memoire.meilleurScore()).toBeNull()
  })

  it.each([
    ['du texte illisible', '{oups'],
    ['un format inattendu', JSON.stringify({ meilleurScore: 'dix', partiesRecentes: 'non' })],
    ['un tableau', '[]'],
  ])('repart de zéro si le stockage contient %s', (_, contenu) => {
    const memoire = creerMemoire(stockage({ [CLE_MEMOIRE]: contenu }))
    expect(memoire.meilleurScore()).toBeNull()
    expect(memoire.pairesRecentes().size).toBe(0)
  })

  it('n’enregistre aucune donnée personnelle : seulement le score et des identifiants de paires', () => {
    const s = stockage()
    const memoire = creerMemoire(s)
    memoire.enregistrerScore(5)
    memoire.enregistrerPartie(['a|b'])
    expect(JSON.parse(s.donnees.get(CLE_MEMOIRE)!)).toEqual({
      version: 1,
      meilleurScore: 5,
      partiesRecentes: [['a|b']],
    })
  })
})
