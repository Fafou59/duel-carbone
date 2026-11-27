/**
 * Les messages d'une Séance, entre les écrans et son Durable Object (serveur/seance.ts), par WebSocket.
 *
 * - À chaque connexion, l'écran se présente (« bonjour ») avec son jeton : l'Animateur avec celui reçu à la
 *   création, le Participant avec celui que son téléphone a tiré (et son pseudo, la première fois).
 * - Le serveur répond par l'état complet de la Séance, vu de cet écran (VueAnimateur ou VueParticipant), puis
 *   renvoie cette vue à chaque changement : un écran qui a raté un message est à jour au suivant.
 * - Chaque écran ne reçoit que ce qu'il doit voir : un Participant ne voit ni les réponses des autres, ni le score
 *   d'un Duel avant sa révélation, ni le Classement avant l'étape du classement.
 *
 * Fonctions pures : le serveur ne croit jamais un message sans l'avoir relu (lireMessageDuClient).
 */
import type { DuelDePartie } from './partie.ts'
import {
  classementDeLaSeance,
  duelsReveles,
  estUnJeton,
  partDeLaSalle,
  scoreDuParticipant,
  type EtatSeance,
  type Etape,
  type LigneDeClassement,
  type PartDeLaSalle,
  type RefusDArrivee,
  type ScoreDeSeance,
} from './seance.ts'

// --- Des écrans vers le serveur ---

export type MessageDuClient =
  | { type: 'bonjour'; role: 'animateur'; jeton: string }
  | { type: 'bonjour'; role: 'participant'; jeton: string; pseudo: string | null }
  /** Le Participant répond au Duel `duel` (sa position, 0 à 9) en choisissant un Geste. */
  | { type: 'repondre'; duel: number; idChoisi: string }
  /** L'Animateur passe à l'étape suivante ; `depuis` : l'étape qu'il voyait ; `conseil` : au passage à la fin. */
  | { type: 'avancer'; depuis: Etape; conseil: string | null }
  /** L'Animateur retire un Participant (un pseudo déplacé). */
  | { type: 'retirer'; numero: number }

/** Un message fait quelques dizaines d'octets : au-delà, ce n'est pas le jeu qui écrit. */
export const TAILLE_MAX_D_UN_MESSAGE = 1000

const entier = (n: unknown, min: number, max: number): n is number => Number.isInteger(n) && (n as number) >= min && (n as number) <= max

function lireEtape(brut: unknown): Etape | null {
  if (typeof brut !== 'object' || brut === null) return null
  const { phase, index } = brut as Record<string, unknown>
  if (phase === 'attente' || phase === 'fin') return { phase }
  if ((phase === 'duel' || phase === 'revelation' || phase === 'classement') && entier(index, 0, 99)) return { phase, index }
  return null
}

const estUnIdentifiant = (brut: unknown): brut is string => typeof brut === 'string' && /^[a-z0-9-]{1,100}$/.test(brut)

/** Le message d'un écran, relu et vérifié ; null s'il est illisible, mal formé ou trop long. */
export function lireMessageDuClient(texte: unknown): MessageDuClient | null {
  if (typeof texte !== 'string' || texte.length > TAILLE_MAX_D_UN_MESSAGE) return null
  let brut: unknown
  try {
    brut = JSON.parse(texte)
  } catch {
    return null
  }
  if (typeof brut !== 'object' || brut === null) return null
  const m = brut as Record<string, unknown>
  switch (m.type) {
    case 'bonjour':
      if (!estUnJeton(m.jeton)) return null
      if (m.role === 'animateur') return { type: 'bonjour', role: 'animateur', jeton: m.jeton }
      if (m.role === 'participant') {
        return { type: 'bonjour', role: 'participant', jeton: m.jeton, pseudo: typeof m.pseudo === 'string' ? m.pseudo : null }
      }
      return null
    case 'repondre':
      return entier(m.duel, 0, 99) && estUnIdentifiant(m.idChoisi) ? { type: 'repondre', duel: m.duel, idChoisi: m.idChoisi } : null
    case 'avancer': {
      const depuis = lireEtape(m.depuis)
      if (!depuis) return null
      if (m.conseil !== undefined && m.conseil !== null && !estUnIdentifiant(m.conseil)) return null
      return { type: 'avancer', depuis, conseil: (m.conseil as string | null | undefined) ?? null }
    }
    case 'retirer':
      return entier(m.numero, 1, 1_000_000) ? { type: 'retirer', numero: m.numero } : null
    default:
      return null
  }
}

// --- Du serveur vers les écrans ---

/** Ce que voient tous les écrans. */
type VueCommune = {
  code: string
  /** L'Animateur a-t-il choisi un Classement ? */
  avecClassement: boolean
  /** La Séance est fermée (3 h après sa création) : plus personne ne rejoint, plus rien n'avance. */
  fermee: boolean
  /** Les 10 Duels, en codes « idA>idB » (les Gestes sont dans le jeu : duelsDepuisCodes). */
  duels: string[]
  etape: Etape
  /** Ce qu'a répondu la salle à chaque Duel déjà révélé (le Duel n° i à la case i). */
  salle: PartDeLaSalle[]
  /** L'identifiant du Conseil de fin, une fois la Séance terminée. */
  conseil: string | null
}

export type VueAnimateur = VueCommune & {
  role: 'animateur'
  /** Tous les Participants, dans l'ordre d'arrivée (écran d'attente, retrait d'un pseudo). */
  participants: { numero: number; pseudo: string | null }[]
  /** Au Duel en cours (ou dernier lancé) : les numéros de ceux qui ont répondu, dans l'ordre des réponses. */
  repondus: number[]
  /** Le Classement de toute la salle, seulement aux étapes classement et fin, et si l'Animateur l'a choisi. */
  classement: LigneDeClassement[] | null
}

export type VueParticipant = VueCommune & {
  role: 'participant'
  moi: {
    numero: number
    pseudo: string | null
    premierDuel: number
    /** Son choix à chaque Duel (null s'il n'a pas répondu) : « Ton choix », le verdict, le Récapitulatif. */
    choix: (string | null)[]
    score: ScoreDeSeance
    /**
     * Sa ligne du Classement, seulement aux étapes classement et fin, et si l'Animateur l'a choisi ; avec le nombre
     * de Participants qui ont un meilleur score (`devant`) et un moins bon (`derriere`), pour la phrase du téléphone
     * (« dernier », « top 10 » : domaine/seance-phrases.ts), sans rien dévoiler des autres.
     */
    place: PlaceDuParticipant | null
  }
  /** Combien de Participants dans la Séance (« 2e ex aequo sur 24 »). */
  participants: number
  /** Au Duel en cours : combien ont répondu (« 6/24 ont répondu »). */
  repondus: number
}

export type PlaceDuParticipant = LigneDeClassement & { devant: number; derriere: number }

export type RefusDuServeur =
  | RefusDArrivee
  /** Séance inconnue (jamais créée, ou déjà effacée). */
  | 'inconnue'
  /** Séance fermée : plus personne ne la rejoint. */
  | 'fermee'
  /** Jeton d'Animateur faux, ou commande réservée à l'Animateur. */
  | 'jeton'
  /** Message illisible, ou envoyé avant de s'être présenté. */
  | 'message'

export type MessageDuServeur =
  | { type: 'etat'; vue: VueAnimateur | VueParticipant }
  | { type: 'refus'; raison: RefusDuServeur }
  /** L'Animateur a retiré ce Participant : son téléphone oublie le jeton. */
  | { type: 'retire' }

/** Le Duel dont on montre les réponses : celui en cours, ou le dernier lancé ; null avant le premier. */
function duelCourant(etape: Etape): number | null {
  return 'index' in etape ? etape.index : null
}

const enCode = (duel: DuelDePartie) => `${duel.a.id}>${duel.b.id}`

/** Les étapes où le Classement se montre : jamais pendant un Duel ni à sa révélation (surprise du Duel 10). */
const classementVisible = (etat: EtatSeance) => etat.classement && (etat.etape.phase === 'classement' || etat.etape.phase === 'fin')

/** La ligne d'un Participant dans le Classement, avec combien sont devant et derrière lui ; null s'il n'y figure pas. */
function placeDans(classement: LigneDeClassement[] | null, numero: number): PlaceDuParticipant | null {
  const ligne = classement?.find((l) => l.numero === numero)
  if (!classement || !ligne) return null
  return {
    ...ligne,
    devant: classement.filter((l) => l.rang < ligne.rang).length,
    derriere: classement.filter((l) => l.rang > ligne.rang).length,
  }
}

/**
 * Les vues de tous les écrans d'une Séance, préparées ensemble : ce qui est commun (la salle, le Classement) n'est
 * calculé qu'une fois, même pour 100 téléphones.
 */
export function preparerLesVues(
  etat: EtatSeance,
  { code, fermee }: { code: string; fermee: boolean },
): { animateur: VueAnimateur; participant: (numero: number) => VueParticipant | null } {
  const commune: VueCommune = {
    code,
    avecClassement: etat.classement,
    fermee,
    duels: etat.duels.map(enCode),
    etape: etat.etape,
    salle: Array.from({ length: duelsReveles(etat) }, (_, duel) => partDeLaSalle(etat, duel)),
    conseil: etat.conseil,
  }
  const classement = classementVisible(etat) ? classementDeLaSeance(etat) : null
  const duel = duelCourant(etat.etape)
  const repondus = duel === null ? [] : etat.reponses.filter((r) => r.duel === duel).map((r) => r.numero)

  const animateur: VueAnimateur = {
    ...commune,
    role: 'animateur',
    participants: etat.participants.map(({ numero, pseudo }) => ({ numero, pseudo })),
    repondus,
    classement,
  }

  const participant = (numero: number): VueParticipant | null => {
    const p = etat.participants.find((x) => x.numero === numero)
    if (!p) return null
    const siens = etat.reponses.filter((r) => r.numero === numero)
    return {
      ...commune,
      role: 'participant',
      moi: {
        numero,
        pseudo: p.pseudo,
        premierDuel: p.premierDuel,
        choix: etat.duels.map((_, i) => siens.find((r) => r.duel === i)?.idChoisi ?? null),
        score: scoreDuParticipant(etat, p),
        place: placeDans(classement, numero),
      },
      participants: etat.participants.length,
      repondus: repondus.length,
    }
  }

  return { animateur, participant }
}
