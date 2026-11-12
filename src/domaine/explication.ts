/**
 * Le tableau comparatif de l'explication, validé par le prototype (docs/prototypes/verdict-duel-ui.md) :
 * une ligne par étape, une colonne par Geste, une ligne Total, des jauges sur une même échelle.
 */
import type { Duel } from './duel.ts'
import { lignesRepartition, type GesteCalcule } from './geste.ts'

export type LigneTableau = {
  libelle: string
  /** Valeur pour chaque colonne, en kg CO2e ; null quand le Geste n'a pas cette étape. */
  valeurs: (number | null)[]
  /** Une des valeurs est négative : le recyclage évite des émissions. */
  recyclage: boolean
}

export type TableauComparatif = {
  colonnes: GesteCalcule[]
  lignes: LigneTableau[]
  totaux: number[]
  /** Valeur qui correspond à une jauge pleine : le plus gros des deux totaux. */
  echelle: number
  /** Largeur de jauge, en %, d'une valeur sur l'échelle commune (jamais invisible). */
  largeur: (valeur: number) => number
  /** Au moins une ligne contient un crédit de recyclage. */
  recyclage: boolean
  /** Gestes pour lesquels l'ADEME ne publie pas de Répartition. */
  sansDetail: GesteCalcule[]
  /** Gestes estimés hors ADEME (l'Easter Egg) : pas de Répartition, et une méthode à la place de la fiche. */
  estimations: GesteCalcule[]
}

/** Largeur minimale d'une jauge, pour qu'une toute petite valeur reste visible. */
const JAUGE_MINIMALE = 1.5

export function tableauComparatif(duel: Duel): TableauComparatif {
  const colonnes = [duel.a, duel.b]
  const repartitions = colonnes.map(lignesRepartition)

  // Les étapes des deux Gestes, sans doublon, dans l'ordre où elles apparaissent.
  const libelles = [...new Set(repartitions.flat().map((l) => l.libelle))]
  const lignes = libelles.map((libelle) => {
    const valeurs = repartitions.map((r) => r.find((l) => l.libelle === libelle)?.valeur ?? null)
    return { libelle, valeurs, recyclage: valeurs.some((v) => v !== null && v < 0) }
  })

  const totaux = colonnes.map((g) => g.empreinte)
  const echelle = Math.max(...totaux)

  return {
    colonnes,
    lignes,
    totaux,
    echelle,
    largeur: (valeur) => Math.min(100, Math.max(JAUGE_MINIMALE, (Math.abs(valeur) / echelle) * 100)),
    recyclage: lignes.some((l) => l.recyclage),
    sansDetail: colonnes.filter((g, i) => repartitions[i].length === 0 && !g.horsAdeme),
    estimations: colonnes.filter((g) => g.horsAdeme),
  }
}
