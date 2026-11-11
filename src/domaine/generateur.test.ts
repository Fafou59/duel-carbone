import { describe, expect, it } from 'vitest'
import { GESTES_CALCULES } from '../donnees/index.ts'
import { difficulteAttendue } from './difficulte.ts'
import { rapport } from './duel.ts'
import { cleDePaire, genererPartie, tirerPaire, type Candidat } from './generateur.ts'
import type { GesteCalcule, Nature } from './geste.ts'
import { hasardReproductible } from './hasard.ts'
import { REGLES } from './regles.ts'
import { positionDuDuelThematique, type DuelThematique } from './thematiques.ts'

const geste = (id: string, empreinte: number, champs: Partial<GesteCalcule> = {}): GesteCalcule => ({
  id,
  titre: id,
  sousTitre: '',
  justification: '',
  nature: 'objet',
  quantite: 1,
  empreinte,
  etapes: [],
  equivalent: { slug: id, nom: id, unite: 'unité', valeur: empreinte, url: '' },
  ...champs,
})

/**
 * Un catalogue de test « riche » : g0 à g69, chacun 1,1 fois plus émetteur que le précédent.
 * Chaque tranche de la courbe y a des paires : gk/g(k+3) = ×1,33 (Duel 10), gk/g(k+5) = ×1,61 (Duel 9)…
 * jusqu'à gk/g(k+46) = ×80 (Duel 1). Au-delà de 65 crans, le Rapport dépasse le plafond (×500).
 */
const RICHE = Array.from({ length: 70 }, (_, k) => geste(`g${k}`, 1.1 ** k))

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

  it('respecte la tranche de Rapport de chaque Duel, et son étiquette de Difficulté', () => {
    for (const graine of graines) {
      const duels = genererPartie({ gestes: RICHE, hasard: hasardReproductible(graine) })
      // Sans cette ligne, le test passerait sur une liste vide (aucun Duel = aucune erreur).
      expect(duels).toHaveLength(REGLES.nombreDeDuels)
      duels.forEach((duel, i) => {
        const { min, max } = REGLES.tranchesParDuel[i]
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

  it('ne tire jamais une paire au-delà du plafond', () => {
    // Le géant dépasse ×500 face à tous les autres Gestes : il ne doit jamais sortir.
    const avecGeant = [...RICHE, geste('geant', 1e9)]
    for (const graine of graines) {
      const duels = genererPartie({ gestes: avecGeant, hasard: hasardReproductible(graine) })
      expect(duels.every((d) => rapport(d) < REGLES.plafond)).toBe(true)
      expect(duels.some((d) => d.a.id === 'geant' || d.b.id === 'geant')).toBe(false)
    }
  })
})

describe('Générateur de Partie : un Geste d’abord, puis son adversaire', () => {
  const candidat = (a: GesteCalcule, b: GesteCalcule): Candidat => ({
    duel: { a, b },
    cle: cleDePaire(a.id, b.id),
    rapport: rapport({ a, b }),
  })
  const [H, A, B, P, Q] = ['H', 'A', 'B', 'P', 'Q'].map((id) => geste(id, 1))
  const egal = () => 1

  it('donne à chaque Geste la même chance d’être tiré en premier, quel que soit son nombre de paires', () => {
    // Une « étoile » : H a 9 paires, P n'en a qu'une (face à Q). 12 Gestes en tout.
    const feuilles = Array.from({ length: 9 }, (_, k) => geste(`L${k}`, 1))
    const candidats = [...feuilles.map((l) => candidat(H, l)), candidat(P, Q)]
    const hasard = hasardReproductible(7)
    const tirages = 12000
    let pq = 0
    for (let i = 0; i < tirages; i++) if (tirerPaire(candidats, egal, hasard).cle === cleDePaire('P', 'Q')) pq++
    // Tirer une paire au hasard donnerait P–Q 1 fois sur 10 ; tirer un Geste d'abord, 2 fois sur 12 (P ou Q).
    expect(pq / tirages).toBeCloseTo(2 / 12, 1)
  })

  it('tire le premier Geste selon son Coefficient d’équilibrage', () => {
    // Gestes rencontrés : H, A, B, de poids 1, 1 et 8. Le tirage 0,25 tombe dans la part de B.
    const choisi = tirerPaire([candidat(H, A), candidat(H, B)], (id) => (id === 'B' ? 8 : 1), () => 0.25)
    expect(choisi.cle).toBe(cleDePaire('H', 'B'))
  })

  it('tire aussi l’adversaire selon son Coefficient d’équilibrage', () => {
    // 1er tirage (0,05) : H. 2e tirage (0,15) parmi ses adversaires A (poids 1) et B (poids 8) : B.
    const suite = [0.05, 0.15]
    const choisi = tirerPaire([candidat(H, A), candidat(H, B)], (id) => (id === 'B' ? 8 : 1), () => suite.shift()!)
    expect(choisi.cle).toBe(cleDePaire('H', 'B'))
  })

  it('fait sortir plus souvent un Geste dont le coefficient est plus fort', () => {
    const apparitions = (coefficients: Record<string, number>) =>
      graines
        .flatMap((g) => genererPartie({ gestes: RICHE, coefficients, hasard: hasardReproductible(g) }))
        .filter((d) => d.a.id === 'g0' || d.b.id === 'g0').length
    expect(apparitions({ g0: 5 })).toBeGreaterThan(apparitions({}) * 2)
  })
})

describe('Générateur de Partie : les paires récentes et l’assouplissement', () => {
  const { min, max } = REGLES.tranchesParDuel[9]
  const ultimes = pairesEntre(RICHE, min, max)
  const toutes = pairesEntre(RICHE, REGLES.plancher, REGLES.plafond)

  it('évite les paires vues récemment quand il reste des alternatives', () => {
    const libre = cleDePaire('g5', 'g8')
    const recentes = new Set(ultimes.filter((c) => c !== libre))
    for (const graine of graines) {
      const duels = genererPartie({ gestes: RICHE, pairesRecentes: recentes, hasard: hasardReproductible(graine) })
      expect(cle(duels[9])).toBe(libre)
      expect(duels.some((d) => recentes.has(cle(d)))).toBe(false)
    }
  })

  it('assouplissement n°1 : si toute la tranche a déjà été vue, il prend la paire jamais vue au Rapport le plus proche', () => {
    // Juste au-dessus de la tranche ultime (×1,25 à ×1,5) : gk/g(k+5) = ×1,61. En dessous, ×1,21 est sous le plancher.
    for (const graine of graines) {
      const duels = genererPartie({ gestes: RICHE, pairesRecentes: new Set(ultimes), hasard: hasardReproductible(graine) })
      expect(duels[9].niveau).toBe('tranche-voisine')
      expect(rapport(duels[9])).toBeCloseTo(1.1 ** 5, 6)
      expect(ultimes).not.toContain(cle(duels[9]))
    }
  })

  it('assouplissement n°2 : si plus aucune paire n’est jamais vue, il réutilise une paire récente de la tranche', () => {
    const duels = genererPartie({ gestes: RICHE, pairesRecentes: new Set(toutes), hasard: hasardReproductible(1) })
    expect(ultimes).toContain(cle(duels[9]))
    expect(duels[9].niveau).toBe('paire-recente')
  })

  it('si une tranche est vide, il prend la paire la plus proche, jamais sous le plancher', () => {
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

describe('Générateur de Partie : les Duels thématiques', () => {
  const thematique = (a: string, b: string): DuelThematique => ({
    a,
    b,
    titre: `Titre ${a}/${b}`,
    accroche: `Accroche ${a}/${b}`,
    texte: `Texte ${a}/${b}`,
  })
  // g0/g4 = ×1,46 (Duel 10), g0/g20 = ×6,7 (Duel 4), g0/g50 = ×117 (Duel 1).
  const THEMATIQUES = [thematique('g0', 'g4'), thematique('g0', 'g20'), thematique('g0', 'g50')]
  const cles = new Set(THEMATIQUES.map((t) => cleDePaire(t.a, t.b)))
  const parties = (options: Partial<Parameters<typeof genererPartie>[0]> = {}) =>
    Array.from({ length: 400 }, (_, g) =>
      genererPartie({ gestes: RICHE, thematiques: THEMATIQUES, hasard: hasardReproductible(g), ...options }),
    )
  const thematiquesDe = (duels: ReturnType<typeof genererPartie>) => duels.filter((d) => d.thematique)

  it('en place un dans une Partie sur deux environ, par un tirage indépendant à chaque Partie', () => {
    const avec = parties().filter((duels) => thematiquesDe(duels).length > 0).length / 400
    expect(avec).toBeGreaterThan(0.43)
    expect(avec).toBeLessThan(0.57)
  })

  it('jamais plus d’un par Partie', () => {
    for (const duels of parties()) expect(thematiquesDe(duels).length).toBeLessThanOrEqual(1)
  })

  it('le place au Duel dont la tranche contient son Rapport, avec son titre, son accroche et son texte', () => {
    for (const duels of parties({ probabiliteThematique: 1 })) {
      const [duel] = thematiquesDe(duels)
      const position = duels.indexOf(duel)
      expect(position).toBe(positionDuDuelThematique(rapport(duel)))
      const t = THEMATIQUES.find((x) => cleDePaire(x.a, x.b) === cleDePaire(duel.a.id, duel.b.id))!
      expect(duel.thematique).toEqual({ titre: t.titre, accroche: t.accroche, texte: t.texte })
      expect(duel.niveau).toBe('thematique')
      expect(duel.difficulte).toBe(difficulteAttendue(position))
    }
  })

  it('ne tire jamais une paire thématique au hasard : le joueur la découvre toujours avec son texte', () => {
    for (const duels of parties()) {
      for (const d of duels) if (cles.has(cleDePaire(d.a.id, d.b.id))) expect(d.thematique).toBeDefined()
    }
  })

  it('préfère un Duel thématique qui n’a pas été vu récemment', () => {
    const recentes = new Set([cleDePaire('g0', 'g4'), cleDePaire('g0', 'g50')])
    for (const duels of parties({ probabiliteThematique: 1, pairesRecentes: recentes })) {
      const [duel] = thematiquesDe(duels)
      expect(cleDePaire(duel.a.id, duel.b.id)).toBe(cleDePaire('g0', 'g20'))
    }
  })

  it('accepte un Geste réservé dans un Duel thématique, et ouvre la Partie au-delà du plafond', () => {
    const catalogue = [...RICHE, geste('robinet', 0.0002, { seulementEnDuelThematique: true })]
    const duels = genererPartie({
      gestes: catalogue,
      thematiques: [thematique('robinet', 'g3')],
      probabiliteThematique: 1,
      hasard: hasardReproductible(1),
    })
    expect(cleDePaire(duels[0].a.id, duels[0].b.id)).toBe(cleDePaire('robinet', 'g3'))
    expect(duels[0].thematique).toBeDefined()
  })
})

describe('Générateur de Partie : les paires exclues du tirage', () => {
  it('n’oppose jamais deux Natures qui forment une Combinaison interdite (un repas et un aliment)', () => {
    const natures: Nature[] = ['repas', 'aliment', 'objet']
    const melange = RICHE.map((g, k) => ({ ...g, nature: natures[k % 3] }))
    const interdite = (d: { a: GesteCalcule; b: GesteCalcule }) =>
      new Set([d.a.nature, d.b.nature]).size === 2 && [d.a.nature, d.b.nature].every((n) => n === 'repas' || n === 'aliment')
    for (const graine of graines) {
      const duels = genererPartie({ gestes: melange, hasard: hasardReproductible(graine) })
      expect(duels.filter(interdite)).toEqual([])
    }
  })

  it('n’oppose deux trajets que s’ils font le même Parcours', () => {
    const trajets = RICHE.map((g, k) => ({ ...g, nature: 'trajet' as const, parcours: k % 2 ? 'court' : 'long' }))
    for (const graine of graines) {
      const duels = genererPartie({ gestes: trajets, hasard: hasardReproductible(graine) })
      expect(duels.filter((d) => d.a.parcours !== d.b.parcours)).toEqual([])
    }
  })

  it('ne tire jamais au hasard un Geste réservé aux Duels thématiques', () => {
    const avecReserve = RICHE.map((g) => (g.id === 'g5' ? { ...g, seulementEnDuelThematique: true } : g))
    for (const graine of graines) {
      const duels = genererPartie({ gestes: avecReserve, hasard: hasardReproductible(graine) })
      expect(duels.some((d) => d.a.id === 'g5' || d.b.id === 'g5')).toBe(false)
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
