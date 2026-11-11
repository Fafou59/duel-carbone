/**
 * Une Partie est une machine à états : à chaque instant, elle est dans une seule « phase »,
 * et seules certaines actions la font changer de phase. Les autres sont simplement ignorées.
 *
 *   duel ──choisir──▶ revelation ──suivant──▶ duel (Duel suivant)
 *                                   └─suivant (dernier Duel)──▶ fin
 *
 * Fonction pure : avancer(état, action) renvoie le nouvel état, sans rien modifier d'autre.
 */
import { estBonChoix, type Duel } from './duel.ts'
import type { DuelTire } from './generateur.ts'
import { REGLES } from './regles.ts'

export const NOMBRE_DE_DUELS = REGLES.nombreDeDuels

/** Un Duel d'une Partie : deux Gestes, et les textes rédigés à la main si c'est un Duel thématique. */
export type DuelDePartie = Duel & Partial<Pick<DuelTire, 'thematique'>>

/** Un Duel thématique se reconnaît à ses textes rédigés à la main (titre, accroche, explication). */
export const estThematique = (duel: DuelDePartie): boolean => Boolean(duel.thematique)

export type Reponse = { idChoisi: string; bonne: boolean }

export type EtatPartie = {
  phase: 'duel' | 'revelation' | 'fin'
  duels: DuelDePartie[]
  /** Position du Duel en cours (0 à 9). */
  index: number
  /** Une réponse par Duel déjà joué, dans l'ordre. */
  reponses: Reponse[]
}

export type Action = { type: 'choisir'; idGeste: string } | { type: 'suivant' }

export function demarrerPartie(duels: DuelDePartie[]): EtatPartie {
  if (duels.length !== NOMBRE_DE_DUELS) {
    throw new Error(`Une Partie compte ${NOMBRE_DE_DUELS} Duels (reçu : ${duels.length}).`)
  }
  return { phase: 'duel', duels, index: 0, reponses: [] }
}

export function avancer(etat: EtatPartie, action: Action): EtatPartie {
  switch (action.type) {
    case 'choisir': {
      const duel = etat.duels[etat.index]
      const dansLeDuel = action.idGeste === duel?.a.id || action.idGeste === duel?.b.id
      if (etat.phase !== 'duel' || !dansLeDuel) return etat
      const reponse = { idChoisi: action.idGeste, bonne: estBonChoix(duel, action.idGeste) }
      return { ...etat, phase: 'revelation', reponses: [...etat.reponses, reponse] }
    }
    case 'suivant': {
      if (etat.phase !== 'revelation') return etat
      const dernier = etat.index === etat.duels.length - 1
      return dernier ? { ...etat, phase: 'fin' } : { ...etat, phase: 'duel', index: etat.index + 1 }
    }
  }
}

export const score = (etat: EtatPartie): number => etat.reponses.filter((r) => r.bonne).length

/**
 * Reprend une Partie interrompue (la Partie du jour, après une fermeture de l'appli) : on rejoue
 * les réponses déjà données, et le joueur repart du Duel suivant, sans pouvoir changer d'avis.
 * Une réponse qui ne correspond pas au Duel (mémoire abîmée) arrête la reprise à cet endroit.
 */
export function reprendrePartie(duels: DuelDePartie[], idsChoisis: readonly string[]): EtatPartie {
  let etat = demarrerPartie(duels)
  for (const idGeste of idsChoisis) {
    const apresChoix = avancer(etat, { type: 'choisir', idGeste })
    if (apresChoix === etat) break
    etat = avancer(apresChoix, { type: 'suivant' })
  }
  return etat
}
