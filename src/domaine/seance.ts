/**
 * Les règles d'une Séance du Mode animation (PRD docs/prd-mode-animation.md, section 5 ; ADR 0007).
 *
 * Une Séance avance d'étape en étape, au rythme de l'Animateur, sans chrono :
 *
 *   attente ──▶ duel 1 ──▶ révélation 1 ──▶ classement 1 ──▶ duel 2 ── … ──▶ révélation 10 ──▶ fin
 *
 * Le classement intermédiaire n'existe que si l'Animateur a choisi un Classement, et jamais après le Duel 10 (pour
 * garder la surprise du classement final). Chaque Participant répond une fois par Duel, sans changer d'avis, et
 * les réponses se ferment à la révélation : qui n'a pas répondu ne marque pas de point.
 *
 * Fonctions pures, comme partie.ts : le Durable Object de la Séance (serveur/seance.ts) s'en sert pour faire
 * avancer la Séance et calculer ce que voit chaque écran ; les écrans de l'Animateur et du Participant (lots 2 et
 * 3) s'en serviront pour afficher. Une action refusée renvoie l'état tel quel, sans erreur.
 */
import { estBonChoix } from './duel.ts'
import type { SourceDeHasard } from './hasard.ts'
import { NOMBRE_DE_DUELS, type DuelDePartie } from './partie.ts'
import { enPourcent } from './rang-du-jour.ts'
import { REGLES } from './regles.ts'
import { cleDuDuel } from './taux-d-erreur.ts'

// --- Le code d'entrée ---

/** Les caractères d'un code : ni 0 ni O, ni 1 ni I, qui se confondent de loin sur un écran projeté. */
export const ALPHABET_DU_CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const LONGUEUR_DU_CODE = 6

/** Un code de Séance tiré au hasard : 32⁶, soit un milliard de codes possibles. */
export const tirerUnCode = (hasard: SourceDeHasard): string =>
  Array.from({ length: LONGUEUR_DU_CODE }, () => ALPHABET_DU_CODE[Math.floor(hasard() * ALPHABET_DU_CODE.length)]).join('')

export const estUnCodeDeSeance = (brut: unknown): brut is string =>
  typeof brut === 'string' && brut.length === LONGUEUR_DU_CODE && [...brut].every((c) => ALPHABET_DU_CODE.includes(c))

/** Le code tapé par un Participant, mis au propre : « k7rm 4p » devient « K7RM4P ». null s'il ne peut pas en être un. */
export function normaliserCode(brut: unknown): string | null {
  if (typeof brut !== 'string') return null
  const code = brut.replace(/[\s-]/g, '').toUpperCase()
  return estUnCodeDeSeance(code) ? code : null
}

// --- Les jetons (ADR 0007) ---

/**
 * Un jeton, tiré au hasard : par le téléphone du Participant quand il rejoint la Séance, par le serveur pour
 * l'Animateur. Il ne vaut que pour une Séance et s'efface avec elle. Au moins 128 bits de hasard en base64url.
 */
export const estUnJeton = (brut: unknown): brut is string => typeof brut === 'string' && /^[A-Za-z0-9_-]{22,64}$/.test(brut)

// --- Les étapes ---

export type Etape =
  | { phase: 'attente' }
  /** `index` : la position du Duel (0 à 9), comme dans une Partie. */
  | { phase: 'duel' | 'revelation' | 'classement'; index: number }
  | { phase: 'fin' }

export const memeEtape = (x: Etape, y: Etape): boolean =>
  x.phase === y.phase && ('index' in x ? x.index : -1) === ('index' in y ? y.index : -1)

export type ParticipantDeSeance = {
  /** Numéro d'arrivée (1, 2, 3…), jamais réutilisé : c'est lui, et jamais le jeton, que voient les écrans. */
  numero: number
  /** null sans Classement : on ne demande pas de pseudo. */
  pseudo: string | null
  /** Le premier Duel auquel il a pu répondre : 0 s'il était là au lancement (arrivée en cours). */
  premierDuel: number
}

export type ReponseDeSeance = { numero: number; duel: number; idChoisi: string }

export type EtatSeance = {
  /** L'Animateur a-t-il choisi un Classement à la création ? */
  classement: boolean
  duels: DuelDePartie[]
  etape: Etape
  /** Dans l'ordre d'arrivée. */
  participants: ParticipantDeSeance[]
  /** Le dernier numéro donné : le suivant arrivé aura celui d'après, même si des Participants ont été retirés. */
  dernierNumero: number
  /** Dans l'ordre où elles sont arrivées : l'écran projeté montre les pseudos dans cet ordre. */
  reponses: ReponseDeSeance[]
  /** Le Conseil de fin, choisi par l'ordinateur de l'Animateur au passage à la fin (son identifiant). */
  conseil: string | null
}

export function creerSeance({ classement, duels }: { classement: boolean; duels: DuelDePartie[] }): EtatSeance {
  if (duels.length !== NOMBRE_DE_DUELS) {
    throw new Error(`Une Séance compte ${NOMBRE_DE_DUELS} Duels (reçu : ${duels.length}).`)
  }
  return { classement, duels, etape: { phase: 'attente' }, participants: [], dernierNumero: 0, reponses: [], conseil: null }
}

/** L'étape qui suit, ou null après la fin. C'est le bouton principal de l'Animateur. */
export function etapeSuivante(etat: EtatSeance): Etape | null {
  const { etape } = etat
  switch (etape.phase) {
    case 'attente':
      return { phase: 'duel', index: 0 }
    case 'duel':
      return { phase: 'revelation', index: etape.index }
    case 'revelation':
      if (etape.index === etat.duels.length - 1) return { phase: 'fin' }
      return etat.classement ? { phase: 'classement', index: etape.index } : { phase: 'duel', index: etape.index + 1 }
    case 'classement':
      return { phase: 'duel', index: etape.index + 1 }
    case 'fin':
      return null
  }
}

/**
 * L'Animateur passe à l'étape suivante. `depuis` est l'étape qu'il voyait en appuyant : si la Séance a déjà avancé
 * (double appui, message renvoyé après une coupure), rien ne bouge. `conseil` n'est retenu qu'au passage à la fin.
 */
export function avancerSeance(etat: EtatSeance, depuis: Etape, conseil: string | null = null): EtatSeance {
  const suivante = etapeSuivante(etat)
  if (!suivante || !memeEtape(etat.etape, depuis)) return etat
  return { ...etat, etape: suivante, ...(suivante.phase === 'fin' ? { conseil } : {}) }
}

/** Combien de Duels ont été révélés : ce sont eux, et eux seuls, qui comptent dans les scores. */
export function duelsReveles(etat: EtatSeance): number {
  const { etape } = etat
  switch (etape.phase) {
    case 'attente':
      return 0
    case 'duel':
      return etape.index
    case 'revelation':
    case 'classement':
      return etape.index + 1
    case 'fin':
      return etat.duels.length
  }
}

// --- Les Participants ---

/**
 * Un pseudo mis au propre : sans caractère invisible, espaces resserrés, 1 à 20 caractères. null s'il est vide ou
 * trop long. Pas de filtre automatique : l'Animateur retire d'un clic un pseudo déplacé (PRD).
 */
export function normaliserPseudo(brut: unknown): string | null {
  if (typeof brut !== 'string') return null
  const pseudo = brut
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  const longueur = [...pseudo].length
  return longueur >= 1 && longueur <= REGLES.seance.longueurMaxDuPseudo ? pseudo : null
}

export type RefusDArrivee = 'terminee' | 'pleine' | 'pseudo'

/**
 * Un Participant rejoint la Séance. Possible tant qu'elle n'est pas terminée : arrivé pendant un Duel, il peut
 * encore y répondre ; arrivé pendant une révélation ou un classement, il commence au Duel suivant.
 */
export function ajouterParticipant(
  etat: EtatSeance,
  pseudoBrut: unknown,
): { etat: EtatSeance; participant: ParticipantDeSeance } | { refus: RefusDArrivee } {
  if (etat.etape.phase === 'fin') return { refus: 'terminee' }
  if (etat.participants.length >= REGLES.seance.participantsMax) return { refus: 'pleine' }
  const pseudo = etat.classement ? normaliserPseudo(pseudoBrut) : null
  if (etat.classement && pseudo === null) return { refus: 'pseudo' }
  const numero = etat.dernierNumero + 1
  const premierDuel = etat.etape.phase === 'duel' ? etat.etape.index : duelsReveles(etat)
  const participant = { numero, pseudo, premierDuel }
  return { etat: { ...etat, participants: [...etat.participants, participant], dernierNumero: numero }, participant }
}

/** L'Animateur retire un Participant (un pseudo déplacé) : il quitte la Séance avec ses réponses. */
export function retirerParticipant(etat: EtatSeance, numero: number): EtatSeance {
  if (!etat.participants.some((p) => p.numero === numero)) return etat
  return {
    ...etat,
    participants: etat.participants.filter((p) => p.numero !== numero),
    reponses: etat.reponses.filter((r) => r.numero !== numero),
  }
}

// --- Les réponses ---

/**
 * Un Participant répond au Duel `duel`. Refusé (état inchangé) si ce n'est pas le Duel en cours (révélé, ou pas
 * encore lancé), s'il a déjà répondu, ou si le Geste n'est aucun des deux du Duel.
 */
export function repondre(etat: EtatSeance, numero: number, duel: number, idChoisi: string): EtatSeance {
  const { etape } = etat
  if (etape.phase !== 'duel' || etape.index !== duel) return etat
  const enCours = etat.duels[duel]
  if (idChoisi !== enCours.a.id && idChoisi !== enCours.b.id) return etat
  if (!etat.participants.some((p) => p.numero === numero)) return etat
  if (etat.reponses.some((r) => r.numero === numero && r.duel === duel)) return etat
  return { ...etat, reponses: [...etat.reponses, { numero, duel, idChoisi }] }
}

/** Les réponses à un Duel, dans l'ordre d'arrivée. */
export const reponsesAuDuel = (etat: EtatSeance, duel: number): ReponseDeSeance[] =>
  etat.reponses.filter((r) => r.duel === duel)

// --- Le score et le Classement ---

/** Bonnes réponses sur les Duels révélés, et nombre de Duels joués depuis son arrivée (« 6 sur 8 »). */
export type ScoreDeSeance = { bonnes: number; joues: number }

/** Le score d'un Participant après `reveles` Duels (par défaut, tous ceux déjà révélés). */
export function scoreDuParticipant(etat: EtatSeance, participant: ParticipantDeSeance, reveles = duelsReveles(etat)): ScoreDeSeance {
  const bonnes = etat.reponses.filter(
    (r) => r.numero === participant.numero && r.duel < reveles && estBonChoix(etat.duels[r.duel], r.idChoisi),
  ).length
  return { bonnes, joues: Math.max(0, reveles - participant.premierDuel) }
}

export type Medaille = 'or' | 'argent' | 'bronze'
const MEDAILLES: Medaille[] = ['or', 'argent', 'bronze']

export type LigneDeClassement = {
  numero: number
  pseudo: string | null
  bonnes: number
  joues: number
  /** Le rang par palier de score : les ex aequo partagent le rang, le suivant est le palier suivant (1, 1, 2…). */
  rang: number
  /** Au moins un autre Participant a le même rang. */
  exAequo: boolean
  /** Or pour le 1er palier, argent pour le 2e, bronze pour le 3e. */
  medaille: Medaille | null
  /** Places gagnées (positif, ▲) ou perdues (négatif, ▼) depuis le Duel précédent ; null s'il n'y était pas. */
  evolution: number | null
}

/** Les lignes du Classement après `reveles` Duels, sans l'évolution. */
function lignesApres(etat: EtatSeance, reveles: number): Omit<LigneDeClassement, 'evolution'>[] {
  const presents = etat.participants.filter((p) => p.premierDuel <= reveles)
  const scores = presents.map((p) => ({ numero: p.numero, pseudo: p.pseudo, ...scoreDuParticipant(etat, p, reveles) }))
  // Les meilleurs d'abord ; entre ex aequo, par pseudo (puis par ordre d'arrivée), pour un affichage stable.
  scores.sort((x, y) => y.bonnes - x.bonnes || (x.pseudo ?? '').localeCompare(y.pseudo ?? '', 'fr') || x.numero - y.numero)
  const paliers = [...new Set(scores.map((s) => s.bonnes))]
  const parPalier = new Map(paliers.map((bonnes) => [bonnes, scores.filter((s) => s.bonnes === bonnes).length]))
  return scores.map((s) => {
    const palier = paliers.indexOf(s.bonnes)
    return { ...s, rang: palier + 1, exAequo: (parPalier.get(s.bonnes) ?? 0) > 1, medaille: MEDAILLES[palier] ?? null }
  })
}

/**
 * Le Classement de toute la salle après `reveles` Duels (par défaut, tous ceux déjà révélés). La vitesse ne compte
 * pas. Un Participant arrivé en cours y figure avec les seuls Duels qu'il a joués.
 */
export function classementDeLaSeance(etat: EtatSeance, reveles = duelsReveles(etat)): LigneDeClassement[] {
  const avant = reveles >= 2 ? new Map(lignesApres(etat, reveles - 1).map((l) => [l.numero, l.rang])) : new Map<number, number>()
  return lignesApres(etat, reveles).map((ligne) => {
    const rangAvant = avant.get(ligne.numero)
    return { ...ligne, evolution: rangAvant === undefined ? null : rangAvant - ligne.rang }
  })
}

// --- La salle ---

/** Ce qu'a répondu la salle à un Duel : « 54 % de la salle (13) » sous chaque Geste. */
export type PartDeLaSalle = {
  /** Combien ont répondu. */
  reponses: number
  /** Combien ont trouvé. */
  bonnes: number
  /** Pour chacun des deux Gestes (par identifiant) : combien l'ont choisi, et leur part des réponses en pour cent. */
  parGeste: Record<string, { nombre: number; pourcentage: number }>
}

export function partDeLaSalle(etat: EtatSeance, duel: number): PartDeLaSalle {
  const { a, b } = etat.duels[duel]
  const reponses = reponsesAuDuel(etat, duel)
  const pour = (id: string) => {
    const nombre = reponses.filter((r) => r.idChoisi === id).length
    return { nombre, pourcentage: reponses.length ? enPourcent(nombre / reponses.length) : 0 }
  }
  const bonnes = reponses.filter((r) => estBonChoix(etat.duels[duel], r.idChoisi)).length
  return { reponses: reponses.length, bonnes, parGeste: { [a.id]: pour(a.id), [b.id]: pour(b.id) } }
}

/**
 * Les Duels révélés qui ont le plus trompé la salle (tableau du classement final, choix du Conseil) : du plus raté
 * au moins raté, sans ceux où personne ne s'est trompé. `fausses` : la part de réponses fausses, en pour cent.
 */
export function duelsLesPlusRates(etat: EtatSeance, nombre = REGLES.seance.duelsLesPlusRates): { duel: number; fausses: number }[] {
  return Array.from({ length: duelsReveles(etat) }, (_, duel) => ({ duel, salle: partDeLaSalle(etat, duel) }))
    .filter(({ salle }) => salle.reponses > salle.bonnes)
    .map(({ duel, salle }) => ({ duel, part: (salle.reponses - salle.bonnes) / salle.reponses }))
    .sort((x, y) => y.part - x.part || x.duel - y.duel)
    .slice(0, nombre)
    .map(({ duel, part }) => ({ duel, fausses: enPourcent(part) }))
}

/**
 * Ce que la révélation d'un Duel ajoute au Taux d'erreur de sa paire (ADR 0006) : le nombre de réponses et de
 * réponses fausses de la salle. null si personne n'a répondu.
 */
export function reponsesPourLeTauxDErreur(etat: EtatSeance, duel: number): { cle: string; reponses: number; fausses: number } | null {
  const salle = partDeLaSalle(etat, duel)
  if (salle.reponses === 0) return null
  return { cle: cleDuDuel(etat.duels[duel]), reponses: salle.reponses, fausses: salle.reponses - salle.bonnes }
}

// --- Les limites de temps ---

const HEURE = 3_600_000

/** L'heure (en millisecondes) à laquelle la Séance se ferme : plus personne ne rejoint, plus rien n'avance. */
export const heureDeFermeture = (creeeLe: number): number => creeeLe + REGLES.seance.dureeMaxEnHeures * HEURE

/** L'heure à laquelle tout est effacé (ADR 0007). */
export const heureDEffacement = (creeeLe: number): number => creeeLe + REGLES.seance.effacementEnHeures * HEURE

export const estFermee = (creeeLe: number, maintenant: number): boolean => maintenant >= heureDeFermeture(creeeLe)
