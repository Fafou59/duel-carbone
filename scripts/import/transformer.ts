/**
 * Transforme les réponses brutes de l'API Impact CO2 en Instantané.
 * Fonction pure : aucune requête réseau, aucun fichier. C'est ce qui la rend facile à tester.
 */
import {
  API_IMPACT_CO2,
  ETAPES,
  UNITES_A_VERIFIER,
  UNITES_PARTICULIERES,
  type Equivalent,
  type Instantane,
  type Thematique,
} from '../../src/donnees/referentiel.ts'

/** Un Équivalent tel que le renvoie GET /thematiques/ecv/{id}?detail=1. */
export type ReponseEcv = {
  name: string
  slug: string
  ecv: number
  footprint: number
  footprintDetail?: { id: number; value: number }[]
  usage?: { peryear: number; defaultyears: number }
  endOfLife?: number
}

export type ReponseThematique = { thematique: Thematique; donnees: ReponseEcv[] }

/** Écart relatif toléré entre le total publié et la somme des étapes (arrondis de l'ADEME). */
const TOLERANCE = 0.01

export function construireInstantane(
  reponses: ReponseThematique[],
  dateImport: string,
): { instantane: Instantane; avertissements: string[] } {
  const avertissements: string[] = []
  const vus = new Set<string>()
  const equivalents: Equivalent[] = []

  // Ordre stable (Thématique, puis slug) : d'un import à l'autre, Git ne montre que les vraies différences.
  const ordonnees = [...reponses].sort((a, b) => a.thematique.id - b.thematique.id)
  for (const { thematique, donnees } of ordonnees) {
    const triees = [...donnees].sort((a, b) => a.slug.localeCompare(b.slug))
    for (const brut of triees) {
      if (vus.has(brut.slug)) {
        avertissements.push(`${brut.slug} : présent deux fois (aussi dans « ${thematique.slug} »), seule la première occurrence est gardée.`)
        continue
      }
      vus.add(brut.slug)
      const equivalent = convertir(brut, thematique)
      equivalents.push(equivalent)

      if (equivalent.unite === null) {
        avertissements.push(`${brut.slug} : unité de référence à vérifier avant de l'utiliser dans un Geste.`)
      }
      const ecart = verifierCoherence(equivalent)
      if (ecart) avertissements.push(ecart)
    }
  }

  return {
    instantane: { source: 'ADEME — Impact CO2', api: API_IMPACT_CO2, dateImport, equivalents },
    avertissements,
  }
}

function convertir(brut: ReponseEcv, thematique: Thematique): Equivalent {
  const etapes = (brut.footprintDetail ?? []).map(({ id, value }) => {
    const libelle = ETAPES[id]
    if (!libelle) {
      throw new Error(`${brut.slug} : étape inconnue (id ${id}). Ajoutez son libellé dans ETAPES (src/donnees/referentiel.ts).`)
    }
    return { id, libelle, valeur: value }
  })

  const equivalent: Equivalent = {
    slug: brut.slug,
    nom: brut.name.trim(),
    thematique: thematique.slug,
    unite: UNITES_A_VERIFIER.has(brut.slug) ? null : (UNITES_PARTICULIERES[brut.slug] ?? thematique.unite),
    valeur: brut.ecv,
    etapes,
    url: `https://impactco2.fr/outils/${thematique.slug}/${brut.slug}`,
  }
  if (brut.usage) {
    const { peryear, defaultyears } = brut.usage
    equivalent.usage = { parAn: peryear, dureeAns: defaultyears, total: peryear * defaultyears }
  }
  if (brut.endOfLife !== undefined) equivalent.finDeVie = brut.endOfLife
  return equivalent
}

/** Vérifie que valeur ≈ étapes + usage + fin de vie. Renvoie un avertissement si ce n'est pas le cas. */
function verifierCoherence(e: Equivalent): string | null {
  if (e.etapes.length === 0) return null
  const somme = e.etapes.reduce((total, etape) => total + etape.valeur, 0) + (e.usage?.total ?? 0) + (e.finDeVie ?? 0)
  const ecart = Math.abs(somme - e.valeur) / Math.abs(e.valeur)
  if (ecart <= TOLERANCE) return null
  return `${e.slug} : total publié ${arrondi(e.valeur)} ≠ somme du détail ${arrondi(somme)} (écart ${Math.round(ecart * 100)} %).`
}

const arrondi = (n: number) => Math.round(n * 1000) / 1000
