/**
 * Coefficients d'équilibrage : faire apparaître tous les Gestes aussi souvent.
 *
 * Même en tirant un Geste d'abord, certains Gestes sortent moins que d'autres : un Geste extrême (le thé,
 * le chauffage au fioul) n'a d'adversaires que dans quelques tranches de la courbe de difficulté.
 * Le Coefficient d'équilibrage corrige cela : un Geste trop rare est tiré plus souvent, un Geste trop
 * fréquent un peu moins. Il ne change jamais la difficulté : chaque Duel reste dans sa tranche.
 *
 * Les coefficients se calculent par simulation (npm run calibrer), puis sont enregistrés dans
 * src/donnees/coefficients.json avec l'empreinte du tirage : un test vérifie qu'ils sont toujours à jour.
 */
import { cleDePaire, genererPartie, type Coefficients } from './generateur.ts'
import type { GesteCalcule } from './geste.ts'
import { hasardReproductible } from './hasard.ts'
import { REGLES } from './regles.ts'

/** Ce qu'enregistre npm run calibrer. */
export type Calibrage = { empreinte: string; coefficients: Record<string, number> }

const tirables = (gestes: GesteCalcule[]) => gestes.filter((g) => !g.seulementEnDuelThematique)

/**
 * Empreinte du tirage : un court résumé de tout ce dont dépendent les coefficients
 * (Gestes tirables, leurs empreintes carbone, Natures et Parcours, et les règles du jeu).
 * Si l'un de ces éléments change, l'empreinte change, et les coefficients doivent être recalculés.
 */
export function empreinteDuTirage(gestes: GesteCalcule[]): string {
  const donnees = tirables(gestes)
    .map((g) => [g.id, g.empreinte, g.nature, g.parcours ?? null] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return fnv1a(JSON.stringify({ regles: REGLES, gestes: donnees }))
}

/**
 * Simule les Parties d'un joueur régulier (qui garde en mémoire ses dernières Parties, comme dans le jeu)
 * et renvoie, pour chaque Geste tirable, la part des Parties où il apparaît au moins une fois (de 0 à 1).
 */
export function frequencesDApparition(
  gestes: GesteCalcule[],
  options: { coefficients: Coefficients; parties: number; partiesMemorisees: number; graine: number },
): Map<string, number> {
  const hasard = hasardReproductible(options.graine)
  const historique: string[][] = []
  const apparitions = new Map(tirables(gestes).map((g) => [g.id, 0]))
  for (let p = 0; p < options.parties; p++) {
    const pairesRecentes = new Set(historique.slice(-options.partiesMemorisees).flat())
    const duels = genererPartie({ gestes, pairesRecentes, coefficients: options.coefficients, hasard })
    historique.push(duels.map((d) => cleDePaire(d.a.id, d.b.id)))
    for (const id of new Set(duels.flatMap((d) => [d.a.id, d.b.id]))) apparitions.set(id, (apparitions.get(id) ?? 0) + 1)
  }
  return new Map([...apparitions].map(([id, n]) => [id, n / options.parties]))
}

export type IndicateursDeDiversite = {
  moyenne: number
  ecartType: number
  moinsVu: { id: string; frequence: number }
  plusVu: { id: string; frequence: number }
}

/** Résume des fréquences d'apparition : moyenne, écart-type (plus il est petit, plus c'est égal), extrêmes. */
export function indicateursDeDiversite(frequences: Map<string, number>): IndicateursDeDiversite {
  const liste = [...frequences].map(([id, frequence]) => ({ id, frequence }))
  const moyenne = liste.reduce((s, x) => s + x.frequence, 0) / liste.length
  const ecartType = Math.sqrt(liste.reduce((s, x) => s + (x.frequence - moyenne) ** 2, 0) / liste.length)
  const moinsVu = liste.reduce((min, x) => (x.frequence < min.frequence ? x : min))
  const plusVu = liste.reduce((max, x) => (x.frequence > max.frequence ? x : max))
  return { moyenne, ecartType, moinsVu, plusVu }
}

/**
 * Calcule les Coefficients d'équilibrage par essais successifs :
 * on simule des Parties, on mesure la fréquence de chaque Geste, puis on remonte le coefficient
 * des Gestes trop rares et on baisse celui des Gestes trop fréquents. Et on recommence.
 * Le résultat est reproductible (graine fixe), ramené à une moyenne de 1 et arrondi au millième.
 */
export function calibrerCoefficients(
  gestes: GesteCalcule[],
  reglage: { partiesMemorisees: number; iterations: number; partiesParIteration: number; graine: number },
): Record<string, number> {
  let coefficients: Record<string, number> = Object.fromEntries(tirables(gestes).map((g) => [g.id, 1]))
  for (let iteration = 0; iteration < reglage.iterations; iteration++) {
    const frequences = frequencesDApparition(gestes, {
      coefficients,
      parties: reglage.partiesParIteration,
      partiesMemorisees: reglage.partiesMemorisees,
      graine: reglage.graine + iteration,
    })
    const { moyenne } = indicateursDeDiversite(frequences)
    // La racine carrée amortit la correction : on avance par petits pas, sans faire osciller les coefficients.
    coefficients = Object.fromEntries(
      Object.entries(coefficients).map(([id, c]) => {
        const correction = Math.sqrt(moyenne / Math.max(frequences.get(id) ?? 0, 0.001))
        return [id, Math.min(20, Math.max(0.05, c * correction))]
      }),
    )
  }
  const valeurs = Object.values(coefficients)
  const moyenne = valeurs.reduce((s, c) => s + c, 0) / valeurs.length
  return Object.fromEntries(Object.entries(coefficients).map(([id, c]) => [id, Math.round((c / moyenne) * 1000) / 1000]))
}

/** Hachage FNV-1a (32 bits) : transforme un texte en 8 caractères qui changent dès que le texte change. */
function fnv1a(texte: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < texte.length; i++) {
    hash ^= texte.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
