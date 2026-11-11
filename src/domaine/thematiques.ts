/**
 * Les Duels thématiques : des Duels choisis et rédigés à la main pour leur intérêt pédagogique
 * (le catalogue est dans src/donnees/duels-thematiques.ts).
 *
 * Ils échappent au plafond, aux tranches et au Coefficient d'équilibrage, mais pas au plancher.
 * Leur place dans la Partie vient de leur Rapport : c'est leur Difficulté.
 */
import { cleDePaire, rapport } from './duel.ts'
import { formaterEmpreinte, formaterMultiple } from './format.ts'
import type { GesteCalcule } from './geste.ts'
import { fnv1a } from './hachage.ts'
import { REGLES } from './regles.ts'

export type DuelThematique = {
  /** Identifiants des deux Gestes du catalogue (l'ordre n'a pas d'importance). */
  a: string
  b: string
  /** Titre de l'annonce (« Le match des mangues »). */
  titre: string
  /** Phrase de l'annonce qui pique la curiosité, sans jamais donner la réponse. */
  accroche: string
  /**
   * Explication affichée après la réponse : chiffrée, à partir des données ADEME.
   * Repères calculés à l'affichage (toujours à jour) : {a} et {b}, l'empreinte des deux Gestes ;
   * {rapport}, combien de fois l'un émet plus que l'autre. Les autres chiffres sont écrits à la main.
   */
  texte: string
  /** Les autres Gestes dont le texte cite un chiffre (« un repas avec du poulet, 1,46 kg »). */
  cites?: string[]
  /**
   * L'empreinte des chiffres au moment de la dernière relecture (empreinteDesChiffres).
   * Si une valeur ADEME change à l'import, un test le signale : on relit le texte, puis on met à jour.
   */
  relu?: string
}

const REPERES = ['a', 'b', 'rapport'] as const

/** Le texte d'un Duel thématique, avec ses repères {a}, {b} et {rapport} remplacés par les valeurs du moment. */
export function redigerTexte(t: DuelThematique, gestes: GesteCalcule[]): string {
  const a = gesteDuCatalogue(t.a, gestes)
  const b = gesteDuCatalogue(t.b, gestes)
  const valeurs: Record<(typeof REPERES)[number], string> = {
    a: formaterEmpreinte(a.empreinte),
    b: formaterEmpreinte(b.empreinte),
    rapport: formaterMultiple(rapport({ a, b })),
  }
  return t.texte.replace(/\{(\w+)\}/g, (repere, nom: string) => valeurs[nom as keyof typeof valeurs] ?? repere)
}

/**
 * L'empreinte de tous les chiffres ADEME dont dépend le texte d'un Duel thématique : empreinte, étapes,
 * usage et fin de vie des deux Gestes et des Gestes cités. Elle change dès qu'un import modifie l'un d'eux.
 */
export function empreinteDesChiffres(t: DuelThematique, gestes: GesteCalcule[]): string {
  const donnees = [t.a, t.b, ...(t.cites ?? [])].map((id) => {
    const g = gesteDuCatalogue(id, gestes)
    return [id, g.empreinte, g.etapes.map((e) => e.valeur), g.usage?.total ?? null, g.finDeVie ?? null]
  })
  return fnv1a(JSON.stringify(donnees))
}

function gesteDuCatalogue(id: string, gestes: GesteCalcule[]): GesteCalcule {
  const g = gestes.find((x) => x.id === id)
  if (!g) throw new Error(`Duel thématique : Geste « ${id} » absent du catalogue.`)
  return g
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
    for (const [, repere] of t.texte.matchAll(/\{(\w+)\}/g)) {
      if (!(REPERES as readonly string[]).includes(repere)) problemes.push(`${nom} : repère {${repere}} inconnu (permis : {a}, {b}, {rapport}).`)
    }
    for (const id of t.cites ?? []) {
      if (!gestes.some((g) => g.id === id)) problemes.push(`${nom} : Geste cité « ${id} » absent du catalogue.`)
    }
  }

  if (problemes.length) {
    throw new Error(`Duels thématiques invalides :\n${problemes.map((p) => `  - ${p}`).join('\n')}`)
  }
}
