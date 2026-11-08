/**
 * Générateur de Partie : choisit les 10 Duels en respectant les règles du jeu (regles.ts).
 * Fonction pure : avec la même source de hasard, il donne toujours la même Partie.
 *
 * Pour chaque position, il cherche un Duel de la bonne Difficulté, en trois niveaux :
 *   1. « regle »           : un Duel de la tranche, jamais vu récemment
 *                            (pour le Duel ultime, un Duel thématique d'abord) ;
 *   2. « paire-recente »   : si la tranche n'a plus que des paires vues récemment, on en réutilise une ;
 *   3. « tranche-voisine » : si la tranche est vide, on prend la paire dont le Rapport est le plus proche.
 * Dans tous les cas : jamais sous le plancher, jamais deux fois la même paire dans une Partie.
 */
import { difficulteAttendue, type Difficulte } from './difficulte.ts'
import { rapport, type Duel } from './duel.ts'
import type { GesteCalcule } from './geste.ts'
import type { SourceDeHasard } from './hasard.ts'
import { REGLES, type Tranche } from './regles.ts'

/** Un Duel rédigé à la main (identifiants de deux Gestes du catalogue et son texte explicatif). */
export type DuelThematique = { a: string; b: string; texte: string }

export type NiveauDeTirage = 'regle' | 'paire-recente' | 'tranche-voisine'

/** Un Duel tiré pour une Partie, avec sa Difficulté attendue et la façon dont il a été choisi. */
export type DuelTire = Duel & {
  difficulte: Difficulte
  niveau: NiveauDeTirage
  /** Texte d'un Duel thématique. */
  texte?: string
}

/** Identifiant d'une paire, indépendant de l'ordre des deux Gestes. */
export const cleDePaire = (idA: string, idB: string): string => [idA, idB].sort().join('|')

type Candidat = { duel: Duel; cle: string; rapport: number; texte?: string }

export function genererPartie({
  gestes,
  thematiques = [],
  pairesRecentes = new Set<string>(),
  hasard = Math.random,
}: {
  gestes: GesteCalcule[]
  thematiques?: DuelThematique[]
  pairesRecentes?: ReadonlySet<string>
  hasard?: SourceDeHasard
}): DuelTire[] {
  const paires = pairesJouables(gestes)
  if (paires.length < REGLES.nombreDeDuels) {
    throw new Error(`Pas assez de paires jouables pour une Partie : ${paires.length} pour ${REGLES.nombreDeDuels} Duels.`)
  }
  const duelsThematiques = candidatsThematiques(thematiques, gestes)

  const dejaTirees = new Set<string>()
  const libre = (c: Candidat) => !dejaTirees.has(c.cle)
  const jamaisVue = (c: Candidat) => !pairesRecentes.has(c.cle)
  const auHasard = (candidats: Candidat[]) => candidats[Math.floor(hasard() * candidats.length)]

  const partie: DuelTire[] = []
  for (let position = 0; position < REGLES.nombreDeDuels; position++) {
    const difficulte = difficulteAttendue(position)
    const tranche = REGLES.tranches[difficulte]
    const dansLaTranche = paires.filter((c) => libre(c) && dansTranche(c.rapport, tranche))
    const thematiquesLibres = difficulte === 'ultime' ? duelsThematiques.filter(libre) : []

    // Les trois niveaux, du plus strict au plus souple. Le premier qui propose un candidat l'emporte.
    const niveaux: [NiveauDeTirage, Candidat[]][] = [
      ['regle', premierNonVide(thematiquesLibres.filter(jamaisVue), dansLaTranche.filter(jamaisVue))],
      ['paire-recente', premierNonVide(thematiquesLibres, dansLaTranche)],
      ['tranche-voisine', lesPlusProches(paires.filter(libre), tranche)],
    ]
    const [niveau, candidats] = niveaux.find(([, c]) => c.length > 0) ?? []
    if (!niveau || !candidats) throw new Error(`Aucune paire disponible pour le Duel ${position + 1}.`)

    const choisi = auHasard(candidats)
    dejaTirees.add(choisi.cle)
    // Le Geste qui émet le plus n'est pas toujours du même côté.
    const duel = hasard() < 0.5 ? choisi.duel : { a: choisi.duel.b, b: choisi.duel.a }
    partie.push({ ...duel, difficulte, niveau, ...(choisi.texte ? { texte: choisi.texte } : {}) })
  }
  return partie
}

/** Toutes les paires de Gestes au-dessus du plancher, chacune une seule fois. */
function pairesJouables(gestes: GesteCalcule[]): Candidat[] {
  const paires: Candidat[] = []
  for (let i = 0; i < gestes.length; i++) {
    for (let j = i + 1; j < gestes.length; j++) {
      const duel = { a: gestes[i], b: gestes[j] }
      const r = rapport(duel)
      if (r >= REGLES.plancher) paires.push({ duel, cle: cleDePaire(duel.a.id, duel.b.id), rapport: r })
    }
  }
  return paires
}

/** Les Duels thématiques dont les deux Gestes existent et qui respectent le plancher. */
function candidatsThematiques(thematiques: DuelThematique[], gestes: GesteCalcule[]): Candidat[] {
  return thematiques.flatMap((t) => {
    const a = gestes.find((g) => g.id === t.a)
    const b = gestes.find((g) => g.id === t.b)
    if (!a || !b) return []
    const duel = { a, b }
    const r = rapport(duel)
    return r >= REGLES.plancher ? [{ duel, cle: cleDePaire(a.id, b.id), rapport: r, texte: t.texte }] : []
  })
}

const dansTranche = (r: number, { min, max }: Tranche) => r >= min && r < max

/** Écart « multiplicatif » entre un Rapport et une tranche (0 s'il est dedans). */
function distance(r: number, { min, max }: Tranche): number {
  if (r < min) return Math.log(min / r)
  if (r >= max) return Math.log(r / max)
  return 0
}

/** Les candidats dont le Rapport est le plus proche de la tranche (à égalité près). */
function lesPlusProches(candidats: Candidat[], tranche: Tranche): Candidat[] {
  if (candidats.length === 0) return []
  const meilleure = Math.min(...candidats.map((c) => distance(c.rapport, tranche)))
  return candidats.filter((c) => distance(c.rapport, tranche) - meilleure < 1e-9)
}

const premierNonVide = <T,>(...listes: T[][]): T[] => listes.find((l) => l.length > 0) ?? []
