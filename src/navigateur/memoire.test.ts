import { describe, expect, it } from 'vitest'
import { REGLES } from '../domaine/regles.ts'
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

  it('rend aussi les paires Partie par Partie, de la plus ancienne à la plus récente', () => {
    const memoire = creerMemoire(stockage())
    for (let n = 1; n <= PARTIES_MEMORISEES + 1; n++) memoire.enregistrerPartie(partie(n))
    expect(memoire.partiesRecentes()).toEqual(Array.from({ length: PARTIES_MEMORISEES }, (_, i) => partie(i + 2)))
  })

  it('garde assez de Parties pour la garantie des Duels thématiques', () => {
    expect(PARTIES_MEMORISEES).toBeGreaterThanOrEqual(REGLES.partiesMaxSansDuelThematique)
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
    memoire.enregistrerReponseDuJour('2026-11-20', 'steak-boeuf')
    expect(JSON.parse(s.donnees.get(CLE_MEMOIRE)!)).toEqual({
      version: 2,
      meilleurScore: 5,
      partiesRecentes: [['a|b']],
      duJour: { jour: '2026-11-20', reponses: ['steak-boeuf'], score: null },
      serie: null,
      meilleureSerie: 0,
    })
  })

  it('garde le record et les paires récentes d’un joueur de l’ancienne version (format 1)', () => {
    const ancien = JSON.stringify({ version: 1, meilleurScore: 7, partiesRecentes: [['a|b']] })
    const memoire = creerMemoire(stockage({ [CLE_MEMOIRE]: ancien }))
    expect(memoire.meilleurScore()).toBe(7)
    expect([...memoire.pairesRecentes()]).toEqual(['a|b'])
    expect(memoire.partieDuJour('2026-11-20')).toBeNull()
  })
})

describe('Mémoire locale : la Partie du jour', () => {
  const JOUR = '2026-11-20'

  it('retient les réponses de la Partie du jour au fil du jeu, pour pouvoir la reprendre', () => {
    const memoire = creerMemoire(stockage())
    expect(memoire.partieDuJour(JOUR)).toBeNull()
    memoire.enregistrerReponseDuJour(JOUR, 'steak-boeuf')
    memoire.enregistrerReponseDuJour(JOUR, 'tgv-100km')
    expect(memoire.partieDuJour(JOUR)).toEqual({ reponses: ['steak-boeuf', 'tgv-100km'], score: null })
  })

  it('oublie une Partie du jour d’hier restée inachevée : elle est perdue à minuit', () => {
    const memoire = creerMemoire(stockage())
    memoire.enregistrerReponseDuJour('2026-11-19', 'steak-boeuf')
    expect(memoire.partieDuJour(JOUR)).toBeNull()
    memoire.enregistrerReponseDuJour(JOUR, 'tgv-100km')
    expect(memoire.partieDuJour(JOUR)?.reponses).toEqual(['tgv-100km'])
  })

  it('retient le score de la Partie du jour terminée, sans toucher au record de la Partie libre', () => {
    const memoire = creerMemoire(stockage())
    memoire.terminerPartieDuJour(JOUR, 8)
    expect(memoire.partieDuJour(JOUR)?.score).toBe(8)
    expect(memoire.meilleurScore()).toBeNull()
  })

  it('compte la série : un jour de plus chaque jour terminé, retour à zéro après un jour manqué', () => {
    const memoire = creerMemoire(stockage())
    memoire.terminerPartieDuJour('2026-11-18', 6)
    memoire.terminerPartieDuJour('2026-11-19', 7)
    memoire.terminerPartieDuJour('2026-11-20', 9)
    expect(memoire.serie('2026-11-20')).toEqual({ actuelle: 3, meilleure: 3 })
    // Le lendemain, avant de jouer : la série tient toujours.
    expect(memoire.serie('2026-11-21').actuelle).toBe(3)
    // Un jour manqué : elle retombe à zéro, la meilleure série reste.
    expect(memoire.serie('2026-11-22')).toEqual({ actuelle: 0, meilleure: 3 })
    memoire.terminerPartieDuJour('2026-11-22', 5)
    expect(memoire.serie('2026-11-22')).toEqual({ actuelle: 1, meilleure: 3 })
  })

  it('ne compte pas deux fois le même jour', () => {
    const memoire = creerMemoire(stockage())
    memoire.terminerPartieDuJour(JOUR, 6)
    memoire.terminerPartieDuJour(JOUR, 6)
    expect(memoire.serie(JOUR).actuelle).toBe(1)
  })

  it('reste jouable sans stockage : rien n’est retenu, rien ne plante', () => {
    const memoire = creerMemoire(null)
    memoire.enregistrerReponseDuJour(JOUR, 'steak-boeuf')
    memoire.terminerPartieDuJour(JOUR, 8)
    expect(memoire.partieDuJour(JOUR)).toBeNull()
    expect(memoire.serie(JOUR)).toEqual({ actuelle: 0, meilleure: 0 })
  })
})
