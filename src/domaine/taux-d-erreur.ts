/**
 * Le Taux d'erreur d'un Duel : « 72 % de réponses fausses sur ce Duel » (issue 107, ADR 0006).
 *
 * Le serveur compte, pour chaque paire de Gestes (sans ordre : jean contre pull = pull contre jean), combien de
 * réponses il a reçues et combien étaient fausses, tous jours et toutes Parties confondus. Il ne sait rien des
 * joueurs : un même joueur peut retomber sur une paire, d'où « réponses » et non « joueurs ». Le jeu en tire le
 * pourcentage affiché, avec les fonctions pures de ce fichier ; le serveur s'en sert pour savoir quoi compter.
 */
import { duelsDepuisCodes } from './calendrier.ts'
import { cleDePaire, estBonChoix, rapport, type Duel } from './duel.ts'
import { estPaireExclue } from './generateur.ts'
import type { GesteCalcule } from './geste.ts'
import type { DuelThematique } from './thematiques.ts'
import { NOMBRE_DE_DUELS, type DuelDePartie } from './partie.ts'
import { enPourcent, pourcent } from './rang-du-jour.ts'
import { REGLES } from './regles.ts'

/** Ce que le serveur sait d'une paire de Gestes : le nombre de réponses, et combien étaient fausses. */
export type CompteDePaire = { reponses: number; fausses: number }

/** Les comptes de plusieurs paires, rangés par clé de paire (cleDePaire). Une paire jamais jouée n'y figure pas. */
export type ComptesDesPaires = Record<string, CompteDePaire>

/** La clé sous laquelle le serveur range un Duel : ses deux Gestes, dans l'ordre alphabétique. */
export const cleDuDuel = (duel: Duel): string => cleDePaire(duel.a.id, duel.b.id)

/** Une clé de paire bien formée : deux identifiants de Gestes (minuscules, chiffres, tirets) séparés par « | ». */
export const estUneCleDePaire = (brut: unknown): brut is string =>
  typeof brut === 'string' && brut.length <= 200 && /^[a-z0-9-]+\|[a-z0-9-]+$/.test(brut)

const estUnCompte = (brut: unknown): brut is CompteDePaire => {
  if (typeof brut !== 'object' || brut === null) return false
  const { reponses, fausses } = brut as Record<string, unknown>
  const entier = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0
  return entier(reponses) && entier(fausses) && fausses <= reponses
}

/** Ce qui revient du serveur n'est jamais cru sur parole : des clés de paire bien formées et des comptes cohérents. */
export const sontDesComptes = (brut: unknown): brut is ComptesDesPaires =>
  typeof brut === 'object' &&
  brut !== null &&
  !Array.isArray(brut) &&
  Object.entries(brut).every(([cle, compte]) => estUneCleDePaire(cle) && estUnCompte(compte))

/** Le Taux d'erreur d'un Duel, en pour cent, ou null s'il y a trop peu de réponses (ou aucune) pour l'afficher. */
export function tauxDErreur(compte: CompteDePaire | undefined): number | null {
  if (!compte || compte.reponses < REGLES.tauxDErreur.reponsesMinimum) return null
  return enPourcent(compte.fausses / compte.reponses)
}

/**
 * Ce que voit le joueur : la part des réponses qui vont dans le même sens que la sienne (prototype du 25/11,
 * variante F). S'il a trouvé, la part des bonnes réponses ; s'il s'est trompé, la part des réponses fausses.
 * `taux` est le Taux d'erreur déjà arrondi : 100 − taux reste juste (0 % et 100 % seulement s'ils sont vrais).
 */
export const partCommeToi = (bon: boolean, taux: number): number => (bon ? 100 - taux : taux)

/** « 72 % comme toi » : une ligne, à côté du verdict et dans le Récapitulatif, avec une petite barre. */
export const phraseCommeToi = (part: number): string => `${pourcent(part)} comme toi`

/**
 * Une paire qu'une Partie libre peut proposer : un Duel thématique, ou une paire que le tirage au hasard peut sortir
 * (ni Geste réservé, ni Combinaison interdite, ni trajets de Parcours différents, Rapport entre plancher et plafond).
 * Le serveur s'en sert pour ne compter que des Duels qui ont pu être joués.
 */
export function estUnePaireJouable(duel: DuelDePartie): boolean {
  if (duel.thematique) return true
  if (duel.a.seulementEnDuelThematique || duel.b.seulementEnDuelThematique || estPaireExclue(duel)) return false
  const r = rapport(duel)
  return Number.isFinite(r) && r >= REGLES.plancher && r <= REGLES.plafond
}

/** Un Duel tel que le jeu l'envoie : « idA>idB », les deux Gestes dans l'ordre de l'écran. */
const estUnCodeDeDuel = (brut: unknown): brut is string =>
  typeof brut === 'string' && brut.length <= 200 && /^[a-z0-9-]+>[a-z0-9-]+$/.test(brut)

/**
 * Les 10 Duels d'une Partie libre envoyés par le jeu (« idA>idB », dans l'ordre), ou null s'ils ne peuvent pas venir
 * d'un vrai tirage : pas 10 Duels, Geste inconnu, paire injouable, ou la même paire deux fois. Sert à la fin d'une
 * Partie libre et à la création d'une Séance, dont l'ordinateur de l'Animateur tire les Duels (ADR 0007).
 */
export function duelsDUnePartieLibre(codes: unknown, gestes: GesteCalcule[], thematiques: DuelThematique[]): DuelDePartie[] | null {
  if (!Array.isArray(codes) || codes.length !== NOMBRE_DE_DUELS || !codes.every(estUnCodeDeDuel)) return null
  let duels: DuelDePartie[]
  try {
    duels = duelsDepuisCodes(codes, gestes, thematiques)
  } catch {
    return null // un Geste absent du catalogue
  }
  if (!duels.every(estUnePaireJouable) || new Set(duels.map(cleDuDuel)).size !== duels.length) return null
  return duels
}

/**
 * Ce que le serveur compte à la fin d'une Partie libre (issue 122, étape 2) : les 10 Duels joués (« idA>idB ») et
 * les 10 Gestes choisis. null si l'envoi ne peut pas venir d'une vraie Partie : Duels refusés par
 * duelsDUnePartieLibre, ou un choix qui n'est aucun des deux Gestes.
 */
export function reponsesDUnePartieLibre(
  codes: unknown,
  choix: unknown,
  gestes: GesteCalcule[],
  thematiques: DuelThematique[],
): { cle: string; fausse: boolean }[] | null {
  if (!Array.isArray(choix) || !choix.every((c) => typeof c === 'string')) return null
  const duels = duelsDUnePartieLibre(codes, gestes, thematiques)
  return duels && reponsesDeLaPartie(duels, choix)
}

/**
 * Ce que le serveur compte à la fin d'une Partie : pour chaque Duel, sa clé et si la réponse était fausse.
 * null si les choix ne correspondent pas aux Duels (un Geste choisi qui n'est ni l'un ni l'autre, par exemple).
 */
export function reponsesDeLaPartie(duels: DuelDePartie[], choix: readonly string[]): { cle: string; fausse: boolean }[] | null {
  if (duels.length !== NOMBRE_DE_DUELS || choix.length !== NOMBRE_DE_DUELS) return null
  const reponses = duels.map((duel, i) => ({ duel, choisi: choix[i] }))
  if (reponses.some(({ duel, choisi }) => choisi !== duel.a.id && choisi !== duel.b.id)) return null
  return reponses.map(({ duel, choisi }) => ({ cle: cleDuDuel(duel), fausse: !estBonChoix(duel, choisi) }))
}
