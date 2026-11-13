/**
 * L'installation du jeu sur l'écran d'accueil (#68) : le meilleur rappel pour revenir au Duel du jour, sans serveur.
 *
 * Chaque navigateur s'y prend à sa façon :
 * - sur Android, Chrome, Edge, Samsung Internet… proposent leur fenêtre d'installation (l'événement
 *   « beforeinstallprompt ») : on la met de côté au chargement, pour l'ouvrir d'un bouton au bon moment ;
 * - Firefox sur Android, et tous les navigateurs d'iPhone et d'iPad, n'ont pas de fenêtre : on explique les
 *   étapes, propres à chaque navigateur (on le reconnaît à son « agent utilisateur ») ;
 * - sur ordinateur, le jeu installé sert peu : on suggère les favoris, ou de jouer sur son téléphone.
 * Le refus du joueur est gardé sur l'appareil, à part de la mémoire du jeu : on ne repropose plus.
 */
import { useEffect, useState } from 'react'
import type { Stockage } from './memoire.ts'

/** Les mobiles sans fenêtre d'installation : on explique les étapes de leur navigateur. */
export type Guide = 'firefox-android' | 'safari-ios' | 'ios-autre' | 'mobile-autre'

/**
 * Ce que le navigateur permet : rien (déjà installé), un bouton, les étapes d'un navigateur mobile, ou les favoris
 * sur ordinateur (« mac » : le raccourci y est ⌘ + D, et non Ctrl + D).
 */
export type Situation = 'installe' | 'bouton' | Guide | 'ordinateur' | 'mac'

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
  const { standalone, userAgent, pointsTactiles } = appareil
  if (standalone) return 'installe'
  const mac = /Macintosh/.test(userAgent)
  // Un iPad se présente comme un Mac, mais il est tactile.
  if (/iPhone|iPad|iPod/.test(userAgent) || (mac && pointsTactiles > 1)) {
    // Chrome, Firefox et Edge sur iPhone gardent leur nom dans l'agent utilisateur ; les autres passent pour Safari.
    return /CriOS|FxiOS|EdgiOS/.test(userAgent) ? 'ios-autre' : 'safari-ios'
  }
  if (/Android|Mobi/.test(userAgent)) {
    if (invitation) return 'bouton'
    return /Android/.test(userAgent) && /Firefox\//.test(userAgent) && !/KAIOS/.test(userAgent)
      ? 'firefox-android'
      : 'mobile-autre'
  }
  // Sur ordinateur, même si le navigateur propose sa fenêtre d'installation : le jeu se joue surtout sur téléphone.
  return mac ? 'mac' : 'ordinateur'
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
