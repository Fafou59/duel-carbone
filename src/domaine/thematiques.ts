/**
 * Les Duels thématiques : des Duels choisis et rédigés à la main pour leur intérêt pédagogique
 * (le catalogue est dans src/donnees/duels-thematiques.ts).
 *
 * Ils échappent au plafond, aux tranches et au Coefficient d'équilibrage, mais pas au plancher.
 * Leur place dans la Partie vient de leur Rapport : c'est leur Difficulté.
 */
import { cleDePaire, rapport } from './duel.ts'
import type { GesteCalcule } from './geste.ts'
import { REGLES } from './regles.ts'

export type DuelThematique = {
  /** Identifiants des deux Gestes du catalogue (l'ordre n'a pas d'importance). */
  a: string
  b: string
  /** Titre de l'annonce (« Le match des mangues »). */
  titre: string
  /** Phrase de l'annonce qui pique la curiosité, sans jamais donner la réponse. */
  accroche: string
  /** Explication affichée après la réponse : chiffrée, à partir des données ADEME. */
  texte: string
}

/**
 * La position (0 à 9) d'un Duel thématique : le Duel dont la tranche contient son Rapport.
 * Au-delà du plafond (l'eau du robinet face à la bouteille, ×2 430), il ouvre la Partie.
 */
export function positionDuDuelThematique(r: number): number {
  const position = REGLES.tranchesParDuel.findIndex(({ min, max }) => r >= min && r < max)
  return position === -1 && r >= REGLES.plafond ? 0 : position
}

/**
 * Garantie contre les longues séries : faut-il forcer un Duel thématique dans la prochaine Partie ?
 * Oui si les dernières Parties (REGLES.partiesMaxSansDuelThematique) n'en avaient aucun.
 * Un nouveau joueur, qui n'a pas encore joué autant de Parties, laisse faire le hasard.
 * `partiesRecentes` : les paires (cleDePaire) de chaque Partie récente, de la plus ancienne à la plus récente.
 */
export function doitForcerUnDuelThematique(
  partiesRecentes: readonly (readonly string[])[],
  thematiques: DuelThematique[],
): boolean {
  const n = REGLES.partiesMaxSansDuelThematique
  if (thematiques.length === 0 || partiesRecentes.length < n) return false
  const cles = new Set(thematiques.map((t) => cleDePaire(t.a, t.b)))
  return partiesRecentes.slice(-n).every((paires) => !paires.some((cle) => cles.has(cle)))
}

/** Vérifie les Duels thématiques face au catalogue. Liste tous les problèmes à la fois. */
export function validerDuelsThematiques(thematiques: DuelThematique[], gestes: GesteCalcule[]): void {
  const problemes: string[] = []
  const paires = new Set<string>()

  for (const t of thematiques) {
    const nom = `${t.a} / ${t.b}`
    const a = gestes.find((g) => g.id === t.a)
    const b = gestes.find((g) => g.id === t.b)
    for (const [id, g] of [
      [t.a, a],
      [t.b, b],
    ] as const) {
      if (!g) problemes.push(`${nom} : Geste « ${id} » absent du catalogue.`)
    }
    if (a && b) {
      const r = rapport({ a, b })
      if (!(r >= REGLES.plancher) || !Number.isFinite(r)) {
        problemes.push(`${nom} : Rapport ×${r.toFixed(2)} sous le plancher (×${REGLES.plancher}).`)
      }
    }
    const cle = cleDePaire(t.a, t.b)
    if (paires.has(cle)) problemes.push(`${nom} : paire présente deux fois.`)
    paires.add(cle)
    for (const champ of ['titre', 'accroche', 'texte'] as const) {
      if (!t[champ].trim()) problemes.push(`${nom} : ${champ} vide.`)
    }
  }

  if (problemes.length) {
    throw new Error(`Duels thématiques invalides :\n${problemes.map((p) => `  - ${p}`).join('\n')}`)
  }
}
