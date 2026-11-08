import { describe, expect, it } from 'vitest'
import { GESTES_CALCULES } from '../donnees/index.ts'
import { difficulteAttendue } from './difficulte.ts'
import { rapport } from './duel.ts'
import { cleDePaire, genererPartie, type DuelThematique } from './generateur.ts'
import type { GesteCalcule } from './geste.ts'
import { hasardReproductible } from './hasard.ts'
import { REGLES } from './regles.ts'

const geste = (id: string, empreinte: number): GesteCalcule => ({
  id,
  titre: id,
  sousTitre: '',
  justification: '',
  quantite: 1,
  empreinte,
  etapes: [],
  equivalent: { slug: id, nom: id, unite: 'unité', valeur: empreinte, url: '' },
})

/**
 * Un catalogue de test « riche » : g0 à g29, chacun 1,2 fois plus émetteur que le précédent.
 * Toutes les tranches y ont beaucoup de paires (ex. g0/g2 = ×1,44, ultime ; g0/g13 = ×10,7, facile).
 */
const RICHE = Array.from({ length: 30 }, (_, k) => geste(`g${k}`, 1.2 ** k))

/** Toutes les paires d'un catalogue dont le Rapport est dans un intervalle [min, max[. */
const pairesEntre = (gestes: GesteCalcule[], min: number, max: number) => {
  const cles: string[] = []
  for (let i = 0; i < gestes.length; i++) {
    for (let j = i + 1; j < gestes.length; j++) {
      const r = rapport({ a: gestes[i], b: gestes[j] })
      if (r >= min && r < max) cles.push(cleDePaire(gestes[i].id, gestes[j].id))
    }
  }
  return cles
}

const cle = (d: { a: GesteCalcule; b: GesteCalcule }) => cleDePaire(d.a.id, d.b.id)
const graines = Array.from({ length: 30 }, (_, i) => i)

describe('Générateur de Partie : les règles de base', () => {
  it(`tire ${REGLES.nombreDeDuels} Duels`, () => {
    expect(genererPartie({ gestes: RICHE, hasard: hasardReproductible(1) })).toHaveLength(REGLES.nombreDeDuels)
  })

  it('respecte la tranche de Difficulté de chaque position : 3 faciles, 3 moyens, 3 difficiles, 1 ultime', () => {
    for (const graine of graines) {
      const duels = genererPartie({ gestes: RICHE, hasard: hasardReproductible(graine) })
      // Sans cette ligne, le test passerait sur une liste vide (aucun Duel = aucune erreur).
      expect(duels).toHaveLength(REGLES.nombreDeDuels)
      duels.forEach((duel, i) => {
        const { min, max } = REGLES.tranches[difficulteAttendue(i)]
        expect(rapport(duel), `graine ${graine}, Duel ${i + 1}`).toBeGreaterThanOrEqual(min)
        expect(rapport(duel), `graine ${graine}, Duel ${i + 1}`).toBeLessThan(max)
        expect(duel.difficulte).toBe(difficulteAttendue(i))
        expect(duel.niveau).toBe('regle')
      })
    }
  })

  it('ne tire jamais deux fois la même paire dans une Partie', () => {
    for (const graine of graines) {
      const duels = genererPartie({ gestes: RICHE, hasard: hasardReproductible(graine) })
      expect(new Set(duels.map(cle)).size).toBe(REGLES.nombreDeDuels)
    }
  })

  it('tire au sort le côté de chaque Geste', () => {
    const duels = graines.flatMap((g) => genererPartie({ gestes: RICHE, hasard: hasardReproductible(g) }))
    const plusEmetteurAGauche = duels.filter((d) => d.a.empreinte > d.b.empreinte).length / duels.length
    expect(plusEmetteurAGauche).toBeGreaterThan(0.3)
    expect(plusEmetteurAGauche).toBeLessThan(0.7)
  })

  it("échoue clairement s'il n'y a pas assez de paires jouables pour une Partie", () => {
    expect(() => genererPartie({ gestes: RICHE.slice(0, 4), hasard: hasardReproductible(1) })).toThrow(/paires/)
  })
})

describe('Générateur de Partie : les Duels thématiques', () => {
  const thematique: DuelThematique = { a: 'g0', b: 'g10', texte: 'Piège !' }

  it('place un Duel thématique au Duel ultime quand il y en a un, avec son texte', () => {
    const duels = genererPartie({ gestes: RICHE, thematiques: [thematique], hasard: hasardReproductible(1) })
    expect(cle(duels[9])).toBe(cleDePaire('g0', 'g10'))
    expect(duels[9].texte).toBe('Piège !')
    expect(duels[9].difficulte).toBe('ultime')
  })

  it('ne réutilise pas la paire du Duel thématique ailleurs dans la Partie', () => {
    for (const graine of graines) {
      const duels = genererPartie({ gestes: RICHE, thematiques: [thematique], hasard: hasardReproductible(graine) })
      expect(duels.filter((d) => cle(d) === cleDePaire('g0', 'g10'))).toHaveLength(1)
    }
  })

  it('ignore un Duel thématique sous le plancher, même rédigé à la main', () => {
    const tropSerre: DuelThematique = { a: 'g0', b: 'g1', texte: '×1,2 : trop serré' }
    const duels = genererPartie({ gestes: RICHE, thematiques: [tropSerre], hasard: hasardReproductible(1) })
    expect(duels.every((d) => rapport(d) >= REGLES.plancher)).toBe(true)
    expect(duels[9].texte).toBeUndefined()
  })

  it("préfère une paire jamais vue à un Duel thématique déjà vu récemment", () => {
    const recentes = new Set([cleDePaire('g0', 'g10')])
    const duels = genererPartie({ gestes: RICHE, thematiques: [thematique], pairesRecentes: recentes, hasard: hasardReproductible(1) })
    expect(cle(duels[9])).not.toBe(cleDePaire('g0', 'g10'))
    expect(duels[9].niveau).toBe('regle')
  })
})

describe('Générateur de Partie : les paires récentes et l’assouplissement', () => {
  const ultimes = pairesEntre(RICHE, REGLES.tranches.ultime.min, REGLES.tranches.ultime.max)

  it('évite les paires vues récemment quand il reste des alternatives', () => {
    const libre = cleDePaire('g5', 'g7')
    const recentes = new Set(ultimes.filter((c) => c !== libre))
    for (const graine of graines) {
      const duels = genererPartie({ gestes: RICHE, pairesRecentes: recentes, hasard: hasardReproductible(graine) })
      expect(cle(duels[9])).toBe(libre)
      expect(duels.some((d) => recentes.has(cle(d)))).toBe(false)
    }
  })

  it("assouplissement n°1 : si toute une tranche a déjà été vue, il réutilise une paire récente de cette tranche", () => {
    const duels = genererPartie({ gestes: RICHE, pairesRecentes: new Set(ultimes), hasard: hasardReproductible(1) })
    expect(ultimes).toContain(cle(duels[9]))
    expect(duels[9].niveau).toBe('paire-recente')
  })

  it("assouplissement n°2 : si une tranche est vide, il prend la paire la plus proche, jamais sous le plancher", () => {
    // Aucun Rapport entre ×1,25 et ×1,5 dans ce catalogue : x/y = ×1,1 (sous le plancher), puis ×1,6, ×1,76, ×2,56…
    const sansUltime = [
      geste('x', 1),
      geste('y', 1.1),
      ...Array.from({ length: 14 }, (_, k) => geste(`h${k}`, 1.1 * 1.6 ** (k + 1))),
    ]
    for (const graine of graines) {
      const duels = genererPartie({ gestes: sansUltime, hasard: hasardReproductible(graine) })
      expect(duels[9].niveau).toBe('tranche-voisine')
      expect(rapport(duels[9])).toBeCloseTo(1.6, 6)
      expect(duels.every((d) => rapport(d) >= REGLES.plancher)).toBe(true)
    }
  })
})

describe('Générateur de Partie : avec le vrai catalogue', () => {
  it('produit toujours des Parties valides', () => {
    for (const graine of Array.from({ length: 100 }, (_, i) => i)) {
      const duels = genererPartie({ gestes: GESTES_CALCULES, hasard: hasardReproductible(graine) })
      expect(duels).toHaveLength(REGLES.nombreDeDuels)
      expect(new Set(duels.map(cle)).size).toBe(REGLES.nombreDeDuels)
      expect(duels.every((d) => rapport(d) >= REGLES.plancher)).toBe(true)
    }
  })
})
