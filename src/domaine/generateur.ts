/**
 * Générateur de Partie : choisit les 10 Duels en respectant les règles du jeu (regles.ts).
 * Fonction pure : avec la même source de hasard, il donne toujours la même Partie.
 *
 * Chaque Duel a sa tranche de Rapport (REGLES.tranchesParDuel). Pour chaque Duel :
 *   1. il réunit les candidats, du plus strict au plus souple :
 *      « regle »           : les paires jamais vues récemment, dans la tranche ;
 *      « tranche-voisine » : sinon, la paire jamais vue au Rapport le plus proche de la tranche ;
 *      « paire-recente »   : sinon (tout a été vu récemment), la paire récente la plus proche ;
 *   2. parmi ces candidats, il tire d'abord un Geste, puis son adversaire (tirerPaire),
 *      en tenant compte du Coefficient d'équilibrage de chaque Geste (calculé par npm run calibrer).
 * Dans tous les cas : jamais sous le plancher, jamais au-delà du plafond, jamais deux fois la même paire
 * dans une Partie. Le tirage écarte aussi les paires exclues (Combinaisons interdites, trajets de Parcours
 * différents) et les Gestes réservés aux Duels thématiques.
 */
import { difficulteAttendue, type Difficulte } from './difficulte.ts'
import { rapport, type Duel } from './duel.ts'
import type { GesteCalcule } from './geste.ts'
import type { SourceDeHasard } from './hasard.ts'
import { REGLES, type Tranche } from './regles.ts'

export type NiveauDeTirage = 'regle' | 'tranche-voisine' | 'paire-recente'

/** Un Duel tiré pour une Partie, avec sa Difficulté attendue et la façon dont il a été choisi. */
export type DuelTire = Duel & {
  difficulte: Difficulte
  niveau: NiveauDeTirage
  /** Texte d'un Duel thématique (leur placement dans la Partie sera décidé au ticket #13). */
  texte?: string
}

/** Identifiant d'une paire, indépendant de l'ordre des deux Gestes. */
export const cleDePaire = (idA: string, idB: string): string => [idA, idB].sort().join('|')

export type Candidat = { duel: Duel; cle: string; rapport: number }

/** Coefficient d'équilibrage de chaque Geste, par identifiant. Un Geste absent vaut 1. */
export type Coefficients = Readonly<Record<string, number>>

/** Le Coefficient d'équilibrage d'un Geste, sous forme de fonction (plus simple à remplacer dans les tests). */
export type CoefficientDe = (idGeste: string) => number

export function genererPartie({
  gestes,
  pairesRecentes = new Set<string>(),
  coefficients = {},
  hasard = Math.random,
}: {
  gestes: GesteCalcule[]
  pairesRecentes?: ReadonlySet<string>
  coefficients?: Coefficients
  hasard?: SourceDeHasard
}): DuelTire[] {
  const { paires, parDuel } = pairesTirables(gestes)
  if (paires.length < REGLES.nombreDeDuels) {
    throw new Error(`Pas assez de paires jouables pour une Partie : ${paires.length} pour ${REGLES.nombreDeDuels} Duels.`)
  }
  const coefficientDe: CoefficientDe = (id) => coefficients[id] ?? 1

  const dejaTirees = new Set<string>()
  const libre = (c: Candidat) => !dejaTirees.has(c.cle)
  const jamaisVue = (c: Candidat) => !pairesRecentes.has(c.cle)
  const partie: DuelTire[] = []
  for (let position = 0; position < REGLES.nombreDeDuels; position++) {
    const tranche = REGLES.tranchesParDuel[position]

    // 1. Une paire jamais vue de la tranche (le cas courant : on ne parcourt que la tranche).
    let candidats = parDuel[position].filter((c) => libre(c) && jamaisVue(c))
    let niveau: NiveauDeTirage = 'regle'
    // 2. Sinon, la paire jamais vue au Rapport le plus proche de la tranche.
    if (candidats.length === 0) {
      candidats = lesPlusProches(paires.filter((c) => libre(c) && jamaisVue(c)), tranche)
      niveau = 'tranche-voisine'
    }
    // 3. Sinon (tout a été vu récemment), la paire récente la plus proche : de la tranche, s'il en reste.
    if (candidats.length === 0) {
      candidats = lesPlusProches(paires.filter(libre), tranche)
      niveau = 'paire-recente'
    }
    if (candidats.length === 0) throw new Error(`Aucune paire disponible pour le Duel ${position + 1}.`)

    const choisi = tirerPaire(candidats, coefficientDe, hasard)
    dejaTirees.add(choisi.cle)
    // Le Geste qui émet le plus n'est pas toujours du même côté.
    const duel = hasard() < 0.5 ? choisi.duel : { a: choisi.duel.b, b: choisi.duel.a }
    partie.push({ ...duel, difficulte: difficulteAttendue(position), niveau })
  }
  return partie
}

/**
 * Tire une paire parmi des candidats : d'abord un Geste, puis son adversaire.
 * Tirer un Geste d'abord donne leur chance aux Gestes qui ont peu de paires (les extrêmes) :
 * en tirant une paire au hasard, les Gestes « du milieu », présents dans beaucoup de paires, sortiraient bien plus souvent.
 * Les deux tirages sont pondérés par le Coefficient d'équilibrage des Gestes.
 */
export function tirerPaire(candidats: Candidat[], coefficientDe: CoefficientDe, hasard: SourceDeHasard): Candidat {
  const gestes = [...new Set(candidats.flatMap((c) => [c.duel.a.id, c.duel.b.id]))]
  const premier = tirerPondere(gestes, coefficientDe, hasard)
  const siens = candidats.filter((c) => c.duel.a.id === premier || c.duel.b.id === premier)
  const adversaire = (c: Candidat) => (c.duel.a.id === premier ? c.duel.b.id : c.duel.a.id)
  return tirerPondere(siens, (c) => coefficientDe(adversaire(c)), hasard)
}

/** Tire un élément au hasard, chacun ayant une chance proportionnelle à son poids. */
function tirerPondere<T>(elements: T[], poids: (element: T) => number, hasard: SourceDeHasard): T {
  const lesPoids = elements.map(poids)
  let reste = hasard() * lesPoids.reduce((total, p) => total + p, 0)
  for (let i = 0; i < elements.length - 1; i++) {
    if (reste < lesPoids[i]) return elements[i]
    reste -= lesPoids[i]
  }
  return elements[elements.length - 1]
}

/** Les paires qu'on peut tirer au hasard (jouables, pas au-delà du plafond), et leur répartition par tranche. */
type PairesTirables = { paires: Candidat[]; parDuel: Candidat[][] }

/** Calculées une seule fois par catalogue : le calibrage simule des milliers de Parties avec le même catalogue. */
const pairesParCatalogue = new WeakMap<GesteCalcule[], PairesTirables>()
function pairesTirables(gestes: GesteCalcule[]): PairesTirables {
  let resultat = pairesParCatalogue.get(gestes)
  if (!resultat) {
    const paires = pairesJouables(gestes).filter((c) => c.rapport < REGLES.plafond)
    const parDuel = REGLES.tranchesParDuel.map((tranche) => paires.filter((c) => dansTranche(c.rapport, tranche)))
    resultat = { paires, parDuel }
    pairesParCatalogue.set(gestes, resultat)
  }
  return resultat
}

/** Toutes les paires jouables (au moins au plancher), chacune une seule fois. */
export function pairesJouables(gestes: GesteCalcule[]): Candidat[] {
  const tirables = gestes.filter((g) => !g.seulementEnDuelThematique)
  const paires: Candidat[] = []
  for (let i = 0; i < tirables.length; i++) {
    for (let j = i + 1; j < tirables.length; j++) {
      const duel = { a: tirables[i], b: tirables[j] }
      if (estPaireExclue(duel)) continue
      const r = rapport(duel)
      // Number.isFinite écarte aussi un Rapport infini (un Geste à 0 oublié par le catalogue).
      if (r >= REGLES.plancher && Number.isFinite(r)) paires.push({ duel, cle: cleDePaire(duel.a.id, duel.b.id), rapport: r })
    }
  }
  return paires
}

/** Une paire que le tirage au hasard n'oppose jamais. */
export const estPaireExclue = (duel: Duel): boolean => estCombinaisonInterdite(duel) || sontDeParcoursDifferents(duel)

/** Deux trajets qui ne font pas le même chemin : on comparerait des distances, pas des modes de transport. */
export const sontDeParcoursDifferents = ({ a, b }: Duel): boolean =>
  a.nature === 'trajet' && b.nature === 'trajet' && a.parcours !== b.parcours

/** Les deux Natures du Duel forment-elles une Combinaison interdite (dans un sens ou dans l'autre) ? */
export const estCombinaisonInterdite = ({ a, b }: Duel): boolean =>
  REGLES.combinaisonsInterdites.some(([x, y]) => (a.nature === x && b.nature === y) || (a.nature === y && b.nature === x))

const dansTranche = (r: number, { min, max }: Tranche) => r >= min && r < max

/** Écart « multiplicatif » entre un Rapport et une tranche (0 s'il est dedans). */
function distance(r: number, { min, max }: Tranche): number {
  if (r < min) return Math.log(min / r)
  if (r >= max) return Math.log(r / max)
  return 0
}

/** Les candidats dont le Rapport est le plus proche de la tranche (à égalité près) : toute la tranche si elle en a. */
function lesPlusProches(candidats: Candidat[], tranche: Tranche): Candidat[] {
  let meilleure = Number.POSITIVE_INFINITY
  for (const c of candidats) meilleure = Math.min(meilleure, distance(c.rapport, tranche))
  return candidats.filter((c) => distance(c.rapport, tranche) - meilleure < 1e-9)
}
