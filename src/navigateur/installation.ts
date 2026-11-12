/**
 * L'installation du jeu sur l'écran d'accueil (#68) : le meilleur rappel pour revenir au Duel du jour, sans serveur.
 *
 * Chaque navigateur s'y prend à sa façon :
 * - Chrome, Edge, Samsung Internet… proposent leur fenêtre d'installation (l'événement « beforeinstallprompt ») :
 *   on la met de côté au chargement, pour l'ouvrir d'un bouton au bon moment ;
 * - Safari, sur iPhone et iPad, n'a pas de fenêtre : il faut passer par « Partager », puis « Sur l'écran d'accueil » ;
 * - ailleurs, on suggère les favoris.
 * Le refus du joueur est gardé sur l'appareil, à part de la mémoire du jeu : on ne repropose plus.
 */
import { useEffect, useState } from 'react'
import type { Stockage } from './memoire.ts'

/** Ce que le navigateur permet : rien (déjà installé), un bouton, une explication pour iPhone, ou les favoris. */
export type Situation = 'installe' | 'bouton' | 'ios' | 'favori'

/** L'événement « beforeinstallprompt » (pas dans les types du DOM : il n'est pas standard). */
export type InvitationNative = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Ce qu'on sait de l'appareil, passé en paramètre pour que les tests puissent le simuler. */
export type Appareil = {
  /** Le jeu est ouvert depuis l'écran d'accueil (mode « standalone »). */
  standalone: boolean
  userAgent: string
  /** Le nombre de points de contact de l'écran : un iPad se présente comme un Mac, mais il est tactile. */
  pointsTactiles: number
}

export function situationInstallation(appareil: Appareil, invitation: InvitationNative | null): Situation {
  if (appareil.standalone) return 'installe'
  if (invitation) return 'bouton'
  const ios =
    /iPhone|iPad|iPod/.test(appareil.userAgent) || (/Macintosh/.test(appareil.userAgent) && appareil.pointsTactiles > 1)
  return ios ? 'ios' : 'favori'
}

function appareilReel(): Appareil {
  const standalone =
    (window.matchMedia?.('(display-mode: standalone)').matches ?? false) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return { standalone, userAgent: navigator.userAgent, pointsTactiles: navigator.maxTouchPoints ?? 0 }
}

// La fenêtre d'installation mise de côté, et les écrans à prévenir quand elle arrive ou disparaît.
let invitation: InvitationNative | null = null
const abonnes = new Set<() => void>()
const prevenir = () => abonnes.forEach((abonne) => abonne())

/** La fenêtre d'installation mise de côté (null si le navigateur ne l'a pas proposée, ou si le jeu est installé). */
export const invitationCapturee = (): InvitationNative | null => invitation

/** À lancer au chargement : le navigateur propose sa fenêtre tôt, et une seule fois. */
export function capturerInvitationNative(page: Pick<EventTarget, 'addEventListener'> = window): void {
  page.addEventListener('beforeinstallprompt', (evenement) => {
    evenement.preventDefault()
    invitation = evenement as InvitationNative
    prevenir()
  })
  page.addEventListener('appinstalled', () => {
    invitation = null
    prevenir()
  })
}

/** La situation du moment, et l'installation en un geste (vrai si le joueur a accepté). */
export function useInstallation(): { situation: Situation; installer: () => Promise<boolean> } {
  const [, rafraichir] = useState(0)
  useEffect(() => {
    const abonne = () => rafraichir((n) => n + 1)
    abonnes.add(abonne)
    return () => void abonnes.delete(abonne)
  }, [])
  const installer = async () => {
    const enCours = invitation
    if (!enCours) return false
    await enCours.prompt()
    const { outcome } = await enCours.userChoice
    // Une fenêtre d'installation ne sert qu'une fois : le navigateur en proposera une autre plus tard.
    invitation = null
    prevenir()
    return outcome === 'accepted'
  }
  return { situation: situationInstallation(appareilReel(), invitation), installer }
}

export const CLE_INSTALLATION = 'duel-carbone/installation'

export function invitationEcartee(stockage: Stockage | null): boolean {
  try {
    return stockage?.getItem(CLE_INSTALLATION) === 'ecartee'
  } catch {
    return false
  }
}

export function ecarterInvitation(stockage: Stockage | null): void {
  try {
    stockage?.setItem(CLE_INSTALLATION, 'ecartee')
  } catch {
    // Écriture refusée : tant pis, l'invitation reviendra.
  }
}
