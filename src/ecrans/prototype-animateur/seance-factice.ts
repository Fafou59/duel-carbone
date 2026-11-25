/**
 * PROTOTYPE (jetable) : une Séance fictive pour essayer les écrans de l'Animateur.
 * Une vraie Partie tirée au hasard (toujours avec un Duel thématique) et 24 Participants imaginaires
 * dont les réponses sont tirées au hasard, de façon reproductible.
 */
import { CALIBRAGE, GESTES_CALCULES } from '../../donnees/index.ts'
import { DUELS_THEMATIQUES } from '../../donnees/duels-thematiques.ts'
import { plusEmetteur, rapport } from '../../domaine/duel.ts'
import { genererPartie, type DuelTire } from '../../domaine/generateur.ts'
import { hasardReproductible } from '../../domaine/hasard.ts'

const PSEUDOS = [
  'Camille', 'Léo', 'Inès', 'Hugo', 'Manon', 'Nathan', 'Chloé', 'Lucas', 'Sarah', 'Jules', 'Emma', 'Adam',
  'Zoé', 'Louis', 'Jade', 'Gabriel', 'Lina', 'Raphaël', 'Alice', 'Tom', 'Rose', 'Noah', 'Léna', 'Équipe compta',
]

export type ParticipantFactice = { pseudo: string; bonnes: boolean[] }

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
  // Plus le Duel est serré, plus la salle se trompe : de 12 à 87 % selon le Duel et le Participant.
  const participants = PSEUDOS.map((pseudo, i) => ({
    pseudo,
    bonnes: duels.map((_, n) => hasard() > 0.12 + n * 0.05 + (i % 6) * 0.05),
  }))
  return { code: 'K7RM4P', duels, participants }
}

/** Le nombre de bonnes réponses de chacun, après les Duels 1 à n. */
export function classementApres(seance: SeanceFactice, n: number) {
  const lignes = seance.participants.map((p) => ({ pseudo: p.pseudo, score: p.bonnes.slice(0, n).filter(Boolean).length }))
  lignes.sort((x, y) => y.score - x.score || x.pseudo.localeCompare(y.pseudo))
  // Rang avec ex aequo : 1, 2, 2, 4…
  return lignes.map((l, i) => ({ ...l, rang: lignes.findIndex((m) => m.score === l.score) + 1, ancienIndex: i }))
}

/** La part (0 à 100) de la salle qui s'est trompée au Duel n (0 à 9). */
export function partSeTrompant(seance: SeanceFactice, n: number): number {
  const fausses = seance.participants.filter((p) => !p.bonnes[n]).length
  return Math.round((fausses / seance.participants.length) * 100)
}

export const gagnant = (duel: DuelTire) => plusEmetteur(duel)
export const rapportDu = (duel: DuelTire) => rapport(duel)
