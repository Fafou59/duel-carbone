import { describe, expect, it } from 'vitest'
import { calibrerCoefficients, empreinteDuTirage, frequencesDApparition, indicateursDeDiversite } from './equilibrage.ts'
import type { GesteCalcule } from './geste.ts'

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

/** g0 à g69, chacun 1,1 fois plus émetteur que le précédent : les extrêmes (g0, g69) ont peu d'adversaires. */
const RICHE = Array.from({ length: 70 }, (_, k) => geste(`g${k}`, 1.1 ** k))

describe("Empreinte du tirage : ce dont dépendent les Coefficients d'équilibrage", () => {
  it('est identique pour le même catalogue, même dans un autre ordre', () => {
    expect(empreinteDuTirage(RICHE)).toBe(empreinteDuTirage([...RICHE].reverse()))
  })

  it('change si une empreinte carbone change (nouvelles valeurs ADEME)', () => {
    const modifie = RICHE.map((g) => (g.id === 'g3' ? { ...g, empreinte: 42 } : g))
    expect(empreinteDuTirage(modifie)).not.toBe(empreinteDuTirage(RICHE))
  })

  it('change si un Geste est ajouté, retiré ou réservé aux Duels thématiques', () => {
    const reference = empreinteDuTirage(RICHE)
    expect(empreinteDuTirage([...RICHE, geste('nouveau', 3)])).not.toBe(reference)
    expect(empreinteDuTirage(RICHE.slice(1))).not.toBe(reference)
    expect(empreinteDuTirage(RICHE.map((g) => (g.id === 'g3' ? { ...g, seulementEnDuelThematique: true } : g)))).not.toBe(reference)
  })

  it('change si la Nature ou le Parcours d’un Geste change (paires exclues différentes)', () => {
    const reference = empreinteDuTirage(RICHE)
    expect(empreinteDuTirage(RICHE.map((g) => (g.id === 'g3' ? { ...g, nature: 'repas' as const } : g)))).not.toBe(reference)
    expect(empreinteDuTirage(RICHE.map((g) => (g.id === 'g3' ? { ...g, parcours: 'ailleurs' } : g)))).not.toBe(reference)
  })

  it('ne change pas pour un simple libellé', () => {
    expect(empreinteDuTirage(RICHE.map((g) => ({ ...g, titre: `Nouveau ${g.titre}` })))).toBe(empreinteDuTirage(RICHE))
  })
})

describe("Simulation : à quelle fréquence chaque Geste apparaît-il dans une Partie ?", () => {
  const options = { parties: 300, partiesMemorisees: 3, graine: 5 }

  it('donne une fréquence entre 0 et 1 pour chaque Geste tirable', () => {
    const frequences = frequencesDApparition(RICHE, { ...options, coefficients: {} })
    expect([...frequences.keys()]).toEqual(RICHE.map((g) => g.id))
    for (const f of frequences.values()) {
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThanOrEqual(1)
    }
  })

  it('est reproductible : même graine, mêmes fréquences', () => {
    expect(frequencesDApparition(RICHE, { ...options, coefficients: {} })).toEqual(
      frequencesDApparition(RICHE, { ...options, coefficients: {} }),
    )
  })

  it('résume la diversité : moyenne, écart-type, Geste le moins vu et le plus vu', () => {
    const indicateurs = indicateursDeDiversite(
      new Map([
        ['a', 0.1],
        ['b', 0.2],
        ['c', 0.3],
      ]),
    )
    expect(indicateurs.moyenne).toBeCloseTo(0.2, 9)
    expect(indicateurs.ecartType).toBeCloseTo(Math.sqrt(0.02 / 3), 9)
    expect(indicateurs.moinsVu).toEqual({ id: 'a', frequence: 0.1 })
    expect(indicateurs.plusVu).toEqual({ id: 'c', frequence: 0.3 })
  })
})

describe("Calibrage des Coefficients d'équilibrage", () => {
  const reglage = { partiesMemorisees: 3, iterations: 6, partiesParIteration: 1000, graine: 1 }
  const controle = { parties: 2000, partiesMemorisees: 3, graine: 99 }
  // Comme le thé dans le vrai catalogue : « leger » est si peu émetteur qu'il n'a d'adversaires
  // que dans la tranche du Duel 1 (×100 à ×500 face à g0…g16). Sans coefficient, il sort rarement.
  const DESEQUILIBRE = [...RICHE, geste('leger', 0.01)]

  it('fait sortir bien plus souvent un Geste délaissé, et rapproche tous les Gestes de la moyenne', { timeout: 60_000 }, () => {
    const avant = frequencesDApparition(DESEQUILIBRE, { ...controle, coefficients: {} })
    const coefficients = calibrerCoefficients(DESEQUILIBRE, reglage)
    const apres = frequencesDApparition(DESEQUILIBRE, { ...controle, coefficients })
    const [diversiteAvant, diversiteApres] = [avant, apres].map(indicateursDeDiversite)

    expect(diversiteAvant.moinsVu.id).toBe('leger')
    expect(apres.get('leger')!).toBeGreaterThan(avant.get('leger')! * 2)
    expect(diversiteApres.moinsVu.frequence / diversiteApres.moyenne).toBeGreaterThan(0.8)
    expect(diversiteApres.ecartType).toBeLessThan(diversiteAvant.ecartType)
  })

  it('donne un coefficient à chaque Geste tirable, en moyenne égal à 1, arrondi pour rester lisible', { timeout: 60_000 }, () => {
    const catalogue = [...RICHE, geste('reserve', 0, { seulementEnDuelThematique: true })]
    const coefficients = calibrerCoefficients(catalogue, { ...reglage, iterations: 2 })
    expect(Object.keys(coefficients)).toEqual(RICHE.map((g) => g.id))
    const valeurs = Object.values(coefficients)
    expect(valeurs.reduce((s, c) => s + c, 0) / valeurs.length).toBeCloseTo(1, 2)
    for (const c of valeurs) expect(c).toBe(Math.round(c * 1000) / 1000)
  })
})
