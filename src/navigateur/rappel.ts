/**
 * Le Rappel du matin, côté navigateur (ADR 0008, serveur/rappel.ts) : s'abonner, s'arrêter, et renvoyer l'abonnement
 * au serveur à chaque ouverture du jeu (c'est ainsi qu'il sait que l'appareil sert encore, et l'efface après
 * 90 jours sans visite).
 *
 * Comment marche un abonnement push, en bref :
 * 1. le joueur touche « Activer le Rappel » : le jeu demande au navigateur l'autorisation d'afficher des
 *    notifications (sa propre fenêtre, que le jeu ne peut pas dessiner) ;
 * 2. s'il accepte, le navigateur s'inscrit auprès de son service push (Apple, Google, Mozilla ou Microsoft) avec la
 *    clé publique du serveur, et reçoit une adresse d'envoi et deux clés : c'est l'« abonnement » ;
 * 3. le jeu le confie au serveur, qui s'en sert chaque matin pour écrire au service push, qui réveille le
 *    service worker du jeu (public/rappel-sw.js), qui affiche la notification.
 *
 * Le jeu ne dépend jamais du serveur : sans lui (hors ligne, en panne, sans clés), le Rappel n'est simplement pas
 * proposé. Et le joueur ne doit jamais croire à un Rappel qui n'existe pas : si l'abonnement n'a pas pu être confié
 * au serveur, il est défait aussitôt, et la carte le dit.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { invitationEcartee } from './installation.ts'
import type { Stockage } from './memoire.ts'
import { mesurer as mesurerPourDeVrai, type Evenement } from './mesure.ts'

export const ADRESSE_DE_LA_CLE = '/api/rappel/cle'
export const ADRESSE_DE_L_ABONNEMENT = '/api/rappel/abonnement'
export const ADRESSE_DE_L_ESSAI = '/api/rappel/essai'

/** Au-delà, on n'attend plus le serveur (comme pour le Rang du jour). */
const DELAI_MS = 5000
/** Le service worker et le service push peuvent être lents à répondre, surtout au premier abonnement. */
const DELAI_DU_NAVIGATEUR_MS = 15_000

/** Un abonnement push, tel que le navigateur le donne (le strict nécessaire de PushSubscription). */
export type AbonnementDuNavigateur = {
  endpoint: string
  toJSON: () => unknown
  unsubscribe: () => Promise<boolean>
}

/** Ce que le jeu demande au navigateur : remplaçable dans les tests (jsdom ne sait pas faire de push). */
export type PushDuNavigateur = {
  permission: () => NotificationPermission
  /** La fenêtre d'autorisation du navigateur. Doit être appelée directement dans le toucher du joueur (iPhone). */
  demanderPermission: () => Promise<NotificationPermission>
  abonnementActuel: () => Promise<AbonnementDuNavigateur | null>
  sAbonner: (cle: Uint8Array<ArrayBuffer>) => Promise<AbonnementDuNavigateur>
}

/** Une promesse qui abandonne au bout de `ms` (le service worker peut ne jamais répondre, par exemple en local). */
function avecDelai<T>(promesse: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promesse, new Promise<T>((_, echec) => setTimeout(() => echec(new Error('délai dépassé')), ms))])
}

/** Le navigateur sait-il recevoir un push ? Non dans Safari sur iPhone tant que le jeu n'est pas installé. */
export function pushPossible(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Le vrai navigateur, ou null s'il ne sait pas recevoir de push. */
export function pushDuNavigateur(): PushDuNavigateur | null {
  if (!pushPossible()) return null
  return {
    permission: () => Notification.permission,
    demanderPermission: () => Notification.requestPermission(),
    abonnementActuel: async () => {
      // getRegistration (et non ready) : sans service worker (en local, ou pas encore installé), il répond tout de
      // suite « aucun » au lieu d'attendre indéfiniment.
      const enregistrement = await avecDelai(navigator.serviceWorker.getRegistration(), DELAI_DU_NAVIGATEUR_MS)
      return (await enregistrement?.pushManager.getSubscription()) ?? null
    },
    sAbonner: async (cle) => {
      const enregistrement = await avecDelai(navigator.serviceWorker.ready, DELAI_DU_NAVIGATEUR_MS)
      // userVisibleOnly : chaque push affiche une notification (Safari et Chrome l'exigent).
      return avecDelai(enregistrement.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cle }), DELAI_DU_NAVIGATEUR_MS)
    },
  }
}

/** La clé publique VAPID (base64url) en octets, comme l'attend pushManager.subscribe. */
export function cleEnOctets(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = base64url.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((base64url.length + 3) % 4)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

/** Ce que répond le serveur à l'ouverture : sa clé publique, et s'il s'agit d'un aperçu (l'essai y est permis). */
export type InfosDuServeur = { cle: string; essai: boolean }

/** Tous les échanges du Rappel, avec le navigateur et avec le serveur. */
export type ServiceDuRappel = {
  /** Faux si le navigateur ne sait pas recevoir de push. */
  possible: boolean
  lireLesInfos: () => Promise<InfosDuServeur | null>
  estActif: () => Promise<boolean>
  demanderPermission: () => Promise<NotificationPermission>
  /** Abonne le navigateur et confie l'abonnement au serveur ; s'il le refuse, défait l'abonnement. */
  sAbonner: (cle: string) => Promise<boolean>
  /** Arrête le Rappel : prévient le serveur, puis désabonne le navigateur (même si le serveur ne répond pas). */
  arreter: () => Promise<void>
  /** À chaque ouverture du jeu : renvoie l'abonnement, s'il existe, pour noter le jour de la visite. */
  renvoyer: () => Promise<void>
  /** Aperçus seulement : demande au serveur d'envoyer le Rappel à cet appareil dans 10 s. */
  essayer: () => Promise<boolean>
}

/** Le service du Rappel. Le navigateur, `faireFetch` et `delai` sont remplaçables dans les tests. */
export function serviceDuRappel(
  push: PushDuNavigateur | null = pushDuNavigateur(),
  faireFetch: typeof fetch = (...args) => fetch(...args),
  delai = DELAI_MS,
): ServiceDuRappel {
  const appeler = async (adresse: string, methode = 'GET', corps?: unknown): Promise<Response | null> => {
    try {
      const reponse = await faireFetch(adresse, {
        method: methode,
        headers: corps === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: corps === undefined ? undefined : JSON.stringify(corps),
        signal: AbortSignal.timeout(delai),
      })
      return reponse.ok ? reponse : null
    } catch {
      return null
    }
  }
  const abonnement = async () => (push ? await push.abonnementActuel().catch(() => null) : null)

  return {
    possible: push !== null,
    lireLesInfos: async () => {
      try {
        const corps = (await (await appeler(ADRESSE_DE_LA_CLE))?.json()) as Partial<InfosDuServeur> | undefined
        return typeof corps?.cle === 'string' && corps.cle.length > 0 ? { cle: corps.cle, essai: corps.essai === true } : null
      } catch {
        // Une réponse qui n'est pas du JSON (le site servi sans le serveur, en local) : pas de Rappel.
        return null
      }
    },
    estActif: async () => push?.permission() === 'granted' && (await abonnement()) !== null,
    demanderPermission: () => push?.demanderPermission() ?? Promise.resolve('denied'),
    sAbonner: async (cle) => {
      if (!push) return false
      let nouvel: AbonnementDuNavigateur
      try {
        nouvel = await push.sAbonner(cleEnOctets(cle))
      } catch {
        return false
      }
      if (await appeler(ADRESSE_DE_L_ABONNEMENT, 'POST', nouvel.toJSON())) return true
      // Le serveur n'a pas l'abonnement : aucun Rappel n'arriverait. On le défait, pour ne rien laisser croire.
      await nouvel.unsubscribe().catch(() => false)
      return false
    },
    arreter: async () => {
      const actuel = await abonnement()
      if (!actuel) return
      await appeler(ADRESSE_DE_L_ABONNEMENT, 'DELETE', { endpoint: actuel.endpoint })
      // Même si le serveur n'a pas répondu : une fois désabonné, le service push lui répondra 410, et il effacera
      // l'abonnement de lui-même au prochain Rappel.
      await actuel.unsubscribe().catch(() => false)
    },
    renvoyer: async () => {
      if (push?.permission() !== 'granted') return
      const actuel = await abonnement()
      if (actuel) await appeler(ADRESSE_DE_L_ABONNEMENT, 'POST', actuel.toJSON())
    },
    essayer: async () => {
      const actuel = await abonnement()
      return actuel !== null && (await appeler(ADRESSE_DE_L_ESSAI, 'POST', { endpoint: actuel.endpoint })) !== null
    },
  }
}

/**
 * Où en est le Rappel sur cet appareil :
 * - `chargement` : on attend le serveur ;
 * - `indisponible` : le serveur ne répond pas (ou n'a pas de clés) : pas de Rappel, le jeu se joue normalement ;
 * - `sans-push` : le navigateur ne sait pas recevoir de notifications ;
 * - `installer-d-abord` : sur iPhone et iPad, il faut d'abord installer le jeu sur l'écran d'accueil ;
 * - `inactif` : le Rappel peut être activé ;
 * - `activation` : la demande est en cours ;
 * - `actif` : le Rappel arrivera demain à 7 h ;
 * - `bloque` : le navigateur a refusé (parfois sans rien montrer : Firefox réglé sur « Bloqué ») ;
 * - `ignore` : le joueur a fermé la fenêtre d'autorisation sans choisir ;
 * - `echec` : l'abonnement n'a pas pu être confié au serveur.
 */
export type EtatDuRappel =
  | 'chargement'
  | 'indisponible'
  | 'sans-push'
  | 'installer-d-abord'
  | 'inactif'
  | 'activation'
  | 'actif'
  | 'bloque'
  | 'ignore'
  | 'echec'

export type Rappel = {
  etat: EtatDuRappel
  /** Le Rappel était déjà actif à l'ouverture (la carte de fin n'a alors rien à proposer). */
  actifDesLOuverture: boolean
  /** Le joueur vient d'arrêter le Rappel (pour le lui confirmer). */
  arrete: boolean
  /** Sur un aperçu : le bouton d'essai est proposé. */
  essai: boolean
  /** À appeler directement dans le toucher : la fenêtre d'autorisation s'ouvre avant toute attente. */
  activer: () => void
  arreter: () => void
  essayer: () => Promise<boolean>
}

/**
 * L'état du Rappel et ses actions, pour la carte de fin du Duel du jour et la page En savoir plus.
 * `surIphoneSansInstallation` : Safari sur iPhone, jeu pas encore installé (situation de l'installation, #68).
 */
export function useRappel({
  surIphoneSansInstallation,
  service: serviceFourni,
  mesurer = mesurerPourDeVrai,
}: {
  surIphoneSansInstallation: boolean
  service?: ServiceDuRappel
  mesurer?: (evenement: Evenement) => void
}): Rappel {
  const [service] = useState(() => serviceFourni ?? serviceDuRappel())
  const [etat, setEtat] = useState<EtatDuRappel>('chargement')
  const [arrete, setArrete] = useState(false)
  const [essai, setEssai] = useState(false)
  const [actifDesLOuverture, setActifDesLOuverture] = useState(false)
  // La clé, lue d'avance : entre le toucher et la fenêtre d'autorisation, rien ne doit attendre le réseau.
  const cle = useRef<string | null>(null)

  useEffect(() => {
    let vivant = true
    void (async () => {
      const infos = await service.lireLesInfos()
      if (!vivant) return
      if (!infos) return setEtat('indisponible')
      cle.current = infos.cle
      setEssai(infos.essai)
      if (!service.possible) return setEtat(surIphoneSansInstallation ? 'installer-d-abord' : 'sans-push')
      const actif = await service.estActif()
      if (!vivant) return
      setActifDesLOuverture(actif)
      setEtat(actif ? 'actif' : 'inactif')
    })()
    return () => {
      vivant = false
    }
  }, [service, surIphoneSansInstallation])

  const activer = useCallback(() => {
    const cleDuServeur = cle.current
    if (!cleDuServeur) return
    // Tout de suite, avant la moindre attente : sur iPhone, la fenêtre ne s'ouvre que dans le geste du joueur.
    const choix = service.demanderPermission()
    setEtat('activation')
    setArrete(false)
    void (async () => {
      const reponse = await choix.catch((): NotificationPermission => 'denied')
      if (reponse === 'denied') {
        mesurer('notifications/bloquees')
        return setEtat('bloque')
      }
      if (reponse !== 'granted') return setEtat('ignore')
      const ok = await service.sAbonner(cleDuServeur)
      if (ok) mesurer('notifications/acceptees')
      setEtat(ok ? 'actif' : 'echec')
    })()
  }, [service, mesurer])

  const arreter = useCallback(() => {
    void service.arreter().then(() => {
      setArrete(true)
      setEtat('inactif')
    })
  }, [service])

  return { etat, actifDesLOuverture, arrete, essai, activer, arreter, essayer: service.essayer }
}

/**
 * Comment autoriser les notifications quand le navigateur les bloque, selon l'appareil (libellés de Firefox sur
 * Android vérifiés par le prototype du ticket 144 : le réglage « Notifications » était sur « Bloqué »).
 */
export function aideAuDeblocage(userAgent: string, pointsTactiles = 0): string {
  // Un iPad se présente comme un Mac, mais il est tactile (comme dans installation.ts).
  if (/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && pointsTactiles > 1)) {
    return 'Ouvre Réglages › Notifications › Duel Carbone, et active « Autoriser les notifications ».'
  }
  if (/Android/.test(userAgent) && /Firefox\//.test(userAgent)) {
    return 'Dans Firefox, touche ⋮ › Paramètres › Permissions des sites › Notifications, et choisis « Demander ».'
  }
  if (/Firefox\//.test(userAgent)) {
    return 'Clique sur l’icône à gauche de l’adresse, retire le blocage des notifications, puis recharge la page.'
  }
  if (/Android/.test(userAgent)) {
    return 'Touche l’icône à gauche de l’adresse, puis Autorisations › Notifications, et autorise-les. Dans le jeu installé : appui long sur son icône › Infos sur l’appli › Notifications.'
  }
  return 'Clique sur l’icône à gauche de l’adresse (le cadenas ou les réglages du site), et autorise les notifications.'
}

// --- « Non merci », gardé sur l'appareil ---

export const CLE_RAPPEL = 'duel-carbone/rappel'

/**
 * La carte « Ne rate pas le Duel de demain » est-elle à proposer ? Non après « Non merci ». Ceux qui avaient refusé
 * l'ancienne invitation à installer (#68) la revoient une fois, une seule : `noterInvitationVue` le retient.
 */
export function invitationAuRappelAProposer(stockage: Stockage | null): boolean {
  try {
    const choix = stockage?.getItem(CLE_RAPPEL)
    if (choix === 'ecartee') return false
    return !(invitationEcartee(stockage) && choix === 'revue')
  } catch {
    return true
  }
}

/** À l'affichage de la carte : pour qui avait refusé l'ancienne invitation, c'était sa seconde chance. */
export function noterInvitationVue(stockage: Stockage | null): void {
  try {
    if (invitationEcartee(stockage) && !stockage?.getItem(CLE_RAPPEL)) stockage?.setItem(CLE_RAPPEL, 'revue')
  } catch {
    // Écriture refusée : tant pis, la carte reviendra.
  }
}

/** « Non merci » : la carte ne revient plus. */
export function ecarterInvitationAuRappel(stockage: Stockage | null): void {
  try {
    stockage?.setItem(CLE_RAPPEL, 'ecartee')
  } catch {
    // Écriture refusée : tant pis, la carte reviendra.
  }
}
