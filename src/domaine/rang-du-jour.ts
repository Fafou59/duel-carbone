/**
 * Le Rang du jour : « Tu as fait mieux ou autant que x % des joueurs jusqu'ici » (issue 87, ADR 0005).
 *
 * Le serveur ne connaît personne : il ne garde, pour chaque jour, que les Effectifs (combien de joueurs ont fait
 * 0, combien 1… combien 10 au Duel du jour). Le jeu en déduit lui-même la place du joueur, avec les fonctions
 * pures de ce fichier. Le serveur s'en sert aussi pour recalculer un score à partir des 10 choix (scoreDesChoix).
 */
import { reprendrePartie, score, NOMBRE_DE_DUELS, type DuelDePartie } from './partie.ts'
import { REGLES } from './regles.ts'

/** Les Effectifs d'un jour : 11 nombres, le nombre de joueurs qui ont fait 0, 1… 10 (la case n° s = le score s). */
export type Effectifs = number[]

export type RangDuJour =
  /** Le cas général : la part des autres joueurs qui ont fait moins ou autant. */
  | { type: 'pourcentage'; pourcentage: number }
  /** 10/10 : la part des autres joueurs qui ont aussi fait un sans-faute (0 : le seul, pour l'instant). */
  | { type: 'sansFaute'; pourcentage: number }
  /** 0/10, ou personne d'autre n'a fait moins ou autant : une phrase encourageante, sans chiffre. */
  | { type: 'encouragement' }

/** Ce qui revient du serveur n'est jamais cru sur parole : 11 nombres entiers, positifs ou nuls. */
export const sontDesEffectifs = (brut: unknown): brut is Effectifs =>
  Array.isArray(brut) &&
  brut.length === NOMBRE_DE_DUELS + 1 &&
  brut.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0)

const somme = (nombres: number[]) => nombres.reduce((total, n) => total + n, 0)

/** Une part (entre 0 et 1) en pour cent, sans jamais afficher 0 % ni 100 % à tort. */
function enPourcent(part: number): number {
  const arrondi = Math.round(part * 100)
  // Entre 0 et 1 % : 1 %, pour que seul un vrai zéro déclenche la phrase encourageante (issue 87).
  if (part > 0 && arrondi === 0) return 1
  // Et 100 % seulement si c'est vrai : à 99,7 %, quelqu'un a fait mieux.
  if (part < 1 && arrondi === 100) return 99
  return arrondi
}

/**
 * Le Rang du jour d'un joueur, ou null s'il n'y a rien à afficher (moins de 4 joueurs, données abîmées).
 *
 * - `effectifs` : ce qu'a renvoyé le serveur ;
 * - `score` : le score du joueur au Duel du jour ;
 * - `compte` : le serveur a-t-il bien compté ce joueur ? Si oui, on le retire de sa case pour ne le comparer
 *   qu'aux autres. Si son envoi s'est perdu (hors ligne), tous les joueurs du serveur sont « les autres ».
 */
export function rangDuJour({ effectifs, score, compte }: { effectifs: unknown; score: number; compte: boolean }): RangDuJour | null {
  if (!sontDesEffectifs(effectifs) || !Number.isInteger(score) || score < 0 || score > NOMBRE_DE_DUELS) return null
  const autres = [...effectifs]
  // On ne retire rien d'une case vide (base remise à zéro, par exemple) : on fait comme si l'envoi s'était perdu.
  if (compte && autres[score] > 0) autres[score] -= 1
  const nombreDAutres = somme(autres)
  // Le plancher compte le joueur lui-même : « 4 joueurs ce jour-là ».
  if (nombreDAutres + 1 < REGLES.rangDuJour.joueursMinimum) return null

  if (score === NOMBRE_DE_DUELS) return { type: 'sansFaute', pourcentage: enPourcent(autres[score] / nombreDAutres) }
  const moinsOuAutant = somme(autres.slice(0, score + 1))
  if (score === 0 || moinsOuAutant === 0) return { type: 'encouragement' }
  return { type: 'pourcentage', pourcentage: enPourcent(moinsOuAutant / nombreDAutres) }
}

/** Espace insécable : « 72 % » ne se coupe jamais en fin de ligne. */
const pourcent = (n: number) => `${n}\u00a0%`

/** La phrase que lit le joueur, sous son score. */
export function phraseDuRang(rang: RangDuJour): string {
  switch (rang.type) {
    case 'pourcentage':
      return `Tu as fait mieux ou autant que ${pourcent(rang.pourcentage)} des joueurs jusqu’ici.`
    case 'sansFaute':
      return rang.pourcentage === 0
        ? 'Sans-faute ! Personne d’autre n’y est arrivé aujourd’hui, pour l’instant.'
        : `Sans-faute, comme ${pourcent(rang.pourcentage)} des joueurs jusqu’ici.`
    case 'encouragement':
      return 'Chaque Duel raté t’en apprend un peu plus. Revanche demain !'
  }
}

/**
 * Le score d'une Partie du jour à partir des 10 choix (identifiants des Gestes choisis, dans l'ordre), ou null si
 * les choix ne correspondent pas aux Duels : c'est ainsi que le serveur ne croit jamais un score qu'on lui annonce.
 * La Partie est rejouée par la machine à états du jeu (reprendrePartie) : mêmes règles que sur l'appareil.
 */
export function scoreDesChoix(duels: DuelDePartie[], choix: readonly string[]): number | null {
  if (duels.length !== NOMBRE_DE_DUELS || choix.length !== NOMBRE_DE_DUELS) return null
  const etat = reprendrePartie(duels, choix)
  return etat.phase === 'fin' ? score(etat) : null
}
