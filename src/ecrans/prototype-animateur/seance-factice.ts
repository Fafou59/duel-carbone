/**
 * PROTOTYPE (jetable) : une Séance fictive pour essayer l'écran de l'Animateur.
 * Une vraie Partie tirée au hasard (toujours avec un Duel thématique) et 24 Participants imaginaires
 * dont les réponses sont tirées au hasard, de façon reproductible.
 */
import { CALIBRAGE, GESTES_CALCULES } from '../../donnees/index.ts'
import { DUELS_THEMATIQUES } from '../../donnees/duels-thematiques.ts'
import { plusEmetteur } from '../../domaine/duel.ts'
import { genererPartie, type DuelTire } from '../../domaine/generateur.ts'
import { hasardReproductible } from '../../domaine/hasard.ts'

const PSEUDOS = [
  'Camille', 'Léo', 'Inès', 'Hugo', 'Manon', 'Nathan', 'Chloé', 'Lucas', 'Sarah', 'Jules', 'Emma', 'Adam',
  'Zoé', 'Louis', 'Jade', 'Gabriel', 'Lina', 'Raphaël', 'Alice', 'Tom', 'Rose', 'Noah', 'Léna', 'Équipe compta',
]

export type ParticipantFactice = { pseudo: string; bonnes: boolean[]; ordre: number[] }

export type SeanceFactice = {
  code: string
  duels: DuelTire[]
  participants: ParticipantFactice[]
}

export function creerSeanceFactice(graine = 7): SeanceFactice {
  const hasard = hasardReproductible(graine)
  const duels = genererPartie({
    gestes: GESTES_CALCULES,
    thematiques: DUELS_THEMATIQUES,
    forcerThematique: true,
    coefficients: CALIBRAGE.coefficients,
    hasard,
  }) as DuelTire[]
  // Chacun a son niveau (de 0 à 0,35 de risque en plus) ; plus le Duel est serré, plus la salle se trompe.
  const participants = PSEUDOS.map((pseudo, i) => ({
    pseudo,
    bonnes: duels.map((_, n) => hasard() > 0.08 + n * 0.05 + ((i * 7) % 8) * 0.05),
    // L'ordre d'arrivée des réponses, Duel par Duel.
    ordre: duels.map(() => hasard()),
  }))
  return { code: 'K7RM4P', duels, participants }
}

export type LigneClassement = { pseudo: string; score: number; rang: number; medaille: 'or' | 'argent' | 'bronze' | null }

/** Le classement après les Duels 1 à n : rang avec ex aequo (1, 1, 3…), médaille par palier de score. */
export function classementApres(seance: SeanceFactice, n: number): LigneClassement[] {
  const lignes = seance.participants.map((p) => ({ pseudo: p.pseudo, score: p.bonnes.slice(0, n).filter(Boolean).length }))
  lignes.sort((x, y) => y.score - x.score || x.pseudo.localeCompare(y.pseudo))
  const paliers = [...new Set(lignes.map((l) => l.score))]
  const medailles = ['or', 'argent', 'bronze'] as const
  return lignes.map((l) => ({
    ...l,
    rang: lignes.findIndex((m) => m.score === l.score) + 1,
    medaille: medailles[paliers.indexOf(l.score)] ?? null,
  }))
}

/** Les pseudos de ceux qui ont choisi ce Geste au Duel n. */
export function choixDu(seance: SeanceFactice, n: number, idGeste: string): string[] {
  const plus = plusEmetteur(seance.duels[n]).id
  return seance.participants.filter((p) => (p.bonnes[n] ? plus === idGeste : plus !== idGeste)).map((p) => p.pseudo)
}

/** Les Participants dans l'ordre où ils ont répondu au Duel n. */
export function ordreDesReponses(seance: SeanceFactice, n: number): string[] {
  return [...seance.participants].sort((x, y) => x.ordre[n] - y.ordre[n]).map((p) => p.pseudo)
}

/** La part (0 à 100) de bonnes réponses au Duel n. */
export function partDeBonnes(seance: SeanceFactice, n: number): number {
  return Math.round((seance.participants.filter((p) => p.bonnes[n]).length / seance.participants.length) * 100)
}
