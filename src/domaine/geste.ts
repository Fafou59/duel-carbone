/**
 * Un Geste = un Équivalent ADEME × une Quantité (docs/adr/0001-geste-equivalent-fois-quantite.md).
 * Fonctions pures : elles ne lisent ni réseau ni fichier, on leur donne l'Instantané.
 */
import type { Equivalent, Instantane } from '../donnees/referentiel.ts'

/** Une entrée du catalogue éditorial : ce que le joueur voit et compare. */
export type Geste = {
  /** Identifiant stable, utilisé dans les Duels thématiques et la mémoire locale. */
  id: string
  /** Première ligne du libellé : le geste (« Manger un steak de bœuf »). */
  titre: string
  /** Seconde ligne : la quantité ou la durée d'utilisation (« 120 g », « et l'utiliser 8 ans »). */
  sousTitre: string
  /** Slug de l'Équivalent ADEME dans l'Instantané. */
  equivalent: string
  /** Nombre d'unités de référence de l'Équivalent (0,12 pour 120 g d'un Équivalent « par kg »). */
  quantite: number
  /** Pourquoi cette Quantité : la source de crédibilité du Geste. */
  justification: string
}

/** Une étape de la Répartition d'un Geste, en kg CO2e. */
export type LigneRepartition = { libelle: string; valeur: number }

/** Un Geste dont l'empreinte et la Répartition ont été calculées. */
export type GesteCalcule = Omit<Geste, 'equivalent'> & {
  equivalent: Pick<Equivalent, 'slug' | 'nom' | 'unite' | 'valeur' | 'url'>
  /** Empreinte carbone du Geste, en kg CO2e. */
  empreinte: number
  /** Étapes de l'ADEME (hors usage et fin de vie), à l'échelle du Geste. */
  etapes: LigneRepartition[]
  usage?: { total: number; dureeAns: number }
  finDeVie?: number
}

export function calculerGeste(geste: Geste, instantane: Instantane): GesteCalcule {
  const equivalent = instantane.equivalents.find((e) => e.slug === geste.equivalent)
  if (!equivalent) throw new Error(`${geste.id} : Équivalent « ${geste.equivalent} » inconnu dans l'Instantané.`)
  const q = geste.quantite

  const calcule: GesteCalcule = {
    ...geste,
    equivalent: {
      slug: equivalent.slug,
      nom: equivalent.nom,
      unite: equivalent.unite,
      valeur: equivalent.valeur,
      url: equivalent.url,
    },
    empreinte: equivalent.valeur * q,
    etapes: equivalent.etapes.map((e) => ({ libelle: e.libelle, valeur: e.valeur * q })),
  }
  if (equivalent.usage) calcule.usage = { total: equivalent.usage.total * q, dureeAns: equivalent.usage.dureeAns }
  if (equivalent.finDeVie !== undefined) calcule.finDeVie = equivalent.finDeVie * q
  return calcule
}

/**
 * Les lignes à afficher dans l'explication. Pour un objet utilisé plusieurs années, les étapes
 * de fabrication sont regroupées, pour comparer simplement Fabrication, Usage et Fin de vie.
 * Pour les autres Gestes (aliments, transports…), on garde le détail de l'ADEME.
 */
export function lignesRepartition(geste: GesteCalcule): LigneRepartition[] {
  if (!geste.usage && geste.finDeVie === undefined) return geste.etapes

  const lignes: LigneRepartition[] = []
  if (geste.etapes.length) {
    lignes.push({ libelle: 'Fabrication', valeur: geste.etapes.reduce((total, e) => total + e.valeur, 0) })
  }
  if (geste.usage) lignes.push({ libelle: 'Usage', valeur: geste.usage.total })
  if (geste.finDeVie !== undefined) lignes.push({ libelle: 'Fin de vie', valeur: geste.finDeVie })
  return lignes
}

/**
 * Vérifie le catalogue face à un Instantané. Lève une erreur qui liste tous les problèmes à la fois,
 * pour pouvoir tout corriger d'un coup.
 */
export function validerCatalogue(gestes: Geste[], instantane: Instantane): void {
  const problemes: string[] = []
  const ids = new Set<string>()

  for (const g of gestes) {
    if (ids.has(g.id)) problemes.push(`${g.id} : identifiant présent deux fois.`)
    ids.add(g.id)

    const equivalent = instantane.equivalents.find((e) => e.slug === g.equivalent)
    if (!equivalent) {
      problemes.push(`${g.id} : Équivalent « ${g.equivalent} » inconnu dans l'Instantané du ${instantane.dateImport}.`)
    } else if (equivalent.unite === null) {
      problemes.push(`${g.id} : l'unité de référence de « ${g.equivalent} » est encore à vérifier.`)
    }
    if (!Number.isFinite(g.quantite) || g.quantite <= 0) {
      problemes.push(`${g.id} : Quantité invalide (${g.quantite}), elle doit être un nombre strictement positif.`)
    }
  }

  if (problemes.length) {
    throw new Error(`Catalogue des Gestes invalide :\n${problemes.map((p) => `  - ${p}`).join('\n')}`)
  }
}
