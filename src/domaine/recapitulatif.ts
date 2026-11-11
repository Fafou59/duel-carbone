/**
 * Le Récapitulatif d'une Partie terminée : une ligne par Duel, avec ce qu'il faut pour
 * afficher la case « ✓ Duel 3 · 1 🥩 = 10,8 🥑 » et rouvrir son explication.
 */
import { difficulteAttendue, type Difficulte } from './difficulte.ts'
import { moinsEmetteur, plusEmetteur, rapport } from './duel.ts'
import type { GesteCalcule } from './geste.ts'
import type { DuelDePartie, EtatPartie } from './partie.ts'

export type LigneRecapitulatif = {
  /** De 1 à 10, comme le joueur l'a vu (« Duel 3/10 »). */
  numero: number
  /** Avec les textes d'un Duel thématique : le détail les remontre. */
  duel: DuelDePartie
  difficulte: Difficulte
  idChoisi: string
  bonne: boolean
  plus: GesteCalcule
  moins: GesteCalcule
  rapport: number
}

export function recapitulatif(etat: EtatPartie): LigneRecapitulatif[] {
  if (etat.phase !== 'fin') throw new Error('Le Récapitulatif n’existe qu’à la fin de la Partie.')
  return etat.duels.map((duel, i) => ({
    numero: i + 1,
    duel,
    difficulte: difficulteAttendue(i),
    ...etat.reponses[i],
    plus: plusEmetteur(duel),
    moins: moinsEmetteur(duel),
    rapport: rapport(duel),
  }))
}

/**
 * Le message affiché sous le score. Il dépend de la proportion de bonnes réponses,
 * pour rester juste si le nombre de Duels change un jour (regles.ts).
 * Formulations neutres : pas de « expert·e », mal lu par les lecteurs d'écran.
 */
export function messageDeScore(score: number, total: number): string {
  const part = score / total
  if (part >= 0.9) return 'Du grand art ! Tu connais tes ordres de grandeur. 🏆'
  if (part >= 0.7) return 'Très bien joué !'
  if (part >= 0.5) return 'Pas mal ! Quelques pièges ont fait mouche.'
  return 'Les chiffres surprennent souvent : rejoue pour les apprivoiser !'
}
