import { describe, expect, it } from 'vitest'
import { GESTE_CREATION_IA } from '../donnees/geste-ia.ts'
import { gesteCalcule } from '../donnees/index.ts'
import { tableauComparatif } from './explication.ts'

// Vrais Gestes, calculés depuis le catalogue et l'Instantané ADEME.
const steak = gesteCalcule('steak-boeuf')
const avocat = gesteCalcule('avocat')
const laveLinge = gesteCalcule('lave-linge')
const microOndes = gesteCalcule('micro-ondes')
const chauffageGaz = gesteCalcule('chauffage-gaz')
const smartphone = gesteCalcule('smartphone')

describe("Tableau comparatif de l'explication", () => {
  it('a une colonne par Geste, dans l’ordre du Duel', () => {
    const t = tableauComparatif({ a: avocat, b: steak })
    expect(t.colonnes.map((g) => g.id)).toEqual(['avocat', 'steak-boeuf'])
  })

  it("réunit les étapes des deux Gestes, sans doublon, dans l'ordre où elles apparaissent", () => {
    const t = tableauComparatif({ a: steak, b: avocat })
    expect(t.lignes.map((l) => l.libelle)).toEqual([
      'Agriculture',
      'Transformation',
      'Emballage',
      'Transport',
      'Supermarché et distribution',
      'Consommation',
    ])
  })

  it("laisse une case vide (null) quand un Geste n'a pas l'étape", () => {
    const t = tableauComparatif({ a: steak, b: avocat })
    const emballage = t.lignes.find((l) => l.libelle === 'Emballage')
    expect(emballage?.valeurs[0]).toBeGreaterThan(0)
    expect(emballage?.valeurs[1]).toBeNull()
  })

  it('donne le total de chaque Geste', () => {
    const t = tableauComparatif({ a: steak, b: avocat })
    expect(t.totaux[0]).toBeCloseTo(3.361, 3)
    expect(t.totaux[1]).toBeCloseTo(0.3105, 4)
  })

  it('place toutes les jauges sur une même échelle : 100 % = le plus gros des deux totaux', () => {
    const t = tableauComparatif({ a: microOndes, b: laveLinge })
    expect(t.echelle).toBe(laveLinge.empreinte)
    expect(t.largeur(laveLinge.empreinte)).toBe(100)
    expect(t.largeur(microOndes.empreinte)).toBeCloseTo(23.6, 1)
  })

  it('garde une jauge minimale visible pour une toute petite valeur', () => {
    const t = tableauComparatif({ a: steak, b: avocat })
    expect(t.largeur(0.0001)).toBe(1.5)
  })

  it('compare les objets en Fabrication, Usage et Fin de vie', () => {
    const t = tableauComparatif({ a: microOndes, b: laveLinge })
    expect(t.lignes.map((l) => l.libelle)).toEqual(['Fabrication', 'Usage', 'Fin de vie'])
  })

  it('signale la ligne où le recyclage fait baisser le total', () => {
    const t = tableauComparatif({ a: microOndes, b: laveLinge })
    expect(t.lignes.find((l) => l.libelle === 'Fin de vie')?.recyclage).toBe(true)
    expect(t.lignes.find((l) => l.libelle === 'Usage')?.recyclage).toBe(false)
    expect(t.recyclage).toBe(true)
  })

  it("liste les Gestes dont l'ADEME ne publie pas le détail", () => {
    const t = tableauComparatif({ a: chauffageGaz, b: smartphone })
    expect(t.sansDetail.map((g) => g.id)).toEqual(['chauffage-gaz'])
    expect(t.lignes.every((l) => l.valeurs[0] === null)).toBe(true)
    expect(t.totaux[0]).toBe(chauffageGaz.empreinte)
  })

  it("met à part un Geste estimé hors ADEME : ce n'est pas que l'ADEME ne publie pas son détail", () => {
    const t = tableauComparatif({ a: GESTE_CREATION_IA, b: steak })
    expect(t.estimations.map((g) => g.id)).toEqual([GESTE_CREATION_IA.id])
    expect(t.sansDetail).toEqual([])
    expect(t.totaux[0]).toBe(GESTE_CREATION_IA.empreinte)
  })
})
