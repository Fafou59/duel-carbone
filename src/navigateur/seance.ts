/**
 * Les Séances du Mode animation, côté navigateur (serveur/seance-api.ts, ADR 0007) : créer une Séance, savoir si
 * elle existe, et s'y brancher par WebSocket (une connexion qui reste ouverte, où le serveur parle le premier).
 *
 * Comme pour le Rang du jour, rien ne lève d'erreur : sans réseau ou sans serveur, ces fonctions rendent null, et
 * l'écran dit simplement que la Séance est injoignable. La connexion, elle, se rétablit d'elle-même : un téléphone
 * qui se met en veille, un ordinateur qui change de Wi-Fi ou une mise à jour des serveurs de Cloudflare la coupent
 * forcément de temps en temps. À chaque retour, l'écran se représente avec son jeton et reçoit l'état complet.
 */
import { estUnCodeDeSeance } from '../domaine/seance.ts'
import type { MessageDuClient, MessageDuServeur, RefusDuServeur } from '../domaine/seance-messages.ts'

export const ADRESSE_DES_SEANCES = '/api/seance'

/** Au-delà, on n'attend plus la réponse d'une création ou d'une lecture. */
const DELAI_MS = 8000

/** Un « ping » de maintien en vie toutes les 25 s : certains réseaux coupent une connexion trop silencieuse. */
const PING_MS = 25_000

/** OUVERTE : la connexion est ouverte. */
const OUVERTE = 1

/** Les délais avant de retenter une connexion coupée : vite d'abord, puis toutes les 15 s au plus. */
const ATTENTES_MS = [500, 1000, 2000, 4000, 8000, 15_000]

// Les fermetures décidées par le serveur (serveur/seance.ts) : il ne sert à rien de se reconnecter.
const FERMETURES_DEFINITIVES = new Set([
  1000, // Séance fermée (3 h) ou effacée
  4001, // Participant retiré par l'Animateur
  4003, // refus : faux jeton, Séance pleine, terminée…
])

/** Les refus qui mettent fin à la connexion (les autres, comme un message mal compris, n'arrêtent rien). */
const REFUS_DEFINITIFS: RefusDuServeur[] = ['inconnue', 'fermee', 'jeton', 'pleine', 'pseudo', 'terminee']

export type InformationsDeSeance = { code: string; avecClassement: boolean; ouverte: boolean }

/** Ce qu'en voit l'écran : branché, en train de se rebrancher, ou arrêté pour de bon. */
export type EtatDeConnexion = 'connexion' | 'connecte' | 'reconnexion' | 'arretee'

export type ConnexionDeSeance = {
  /** Envoie une commande ; false si la connexion est coupée (l'écran le montre, l'utilisateur réessaiera). */
  envoyer: (message: MessageDuClient) => boolean
  /** Ferme la connexion pour de bon (on quitte l'écran). */
  fermer: () => void
}

export type ServeurDesSeances = {
  /** Crée une Séance avec les 10 Duels tirés par l'Animateur ; rend son code et le jeton de l'Animateur. */
  creer: (demande: { classement: boolean; duels: string[] }) => Promise<{ code: string; jetonAnimateur: string } | null>
  /** Les informations d'une Séance ; 'inconnue' si elle n'existe pas (ou plus), null si le serveur ne répond pas. */
  lire: (code: string) => Promise<InformationsDeSeance | 'inconnue' | null>
  /**
   * Se branche sur la Séance : `bonjour` (avec le jeton) est renvoyé à chaque connexion, les messages du serveur
   * arrivent dans `surMessage`, et `surEtat` suit la connexion.
   */
  connecter: (options: {
    code: string
    bonjour: MessageDuClient
    surMessage: (message: MessageDuServeur) => void
    surEtat?: (etat: EtatDeConnexion) => void
  }) => ConnexionDeSeance
}

/** Ce qui sert de WebSocket et de minuteries (remplaçables dans les tests). */
export type Outils = {
  faireFetch: typeof fetch
  ouvrir: (adresse: string) => WebSocket
  adresseDuSite: () => string
  attendre: (fonction: () => void, ms: number) => () => void
  repeter: (fonction: () => void, ms: number) => () => void
}

const OUTILS_DU_NAVIGATEUR: Outils = {
  faireFetch: (...args) => fetch(...args),
  ouvrir: (adresse) => new WebSocket(adresse),
  adresseDuSite: () => window.location.origin,
  attendre: (fonction, ms) => {
    const id = setTimeout(fonction, ms)
    return () => clearTimeout(id)
  },
  repeter: (fonction, ms) => {
    const id = setInterval(fonction, ms)
    return () => clearInterval(id)
  },
}

/** Un message du serveur, relu : du JSON avec un type connu, sinon null (on l'ignore). */
function lireMessageDuServeur(texte: unknown): MessageDuServeur | null {
  if (typeof texte !== 'string') return null
  try {
    const brut: unknown = JSON.parse(texte)
    if (typeof brut !== 'object' || brut === null) return null
    const { type } = brut as { type?: unknown }
    return type === 'etat' || type === 'refus' || type === 'retire' ? (brut as MessageDuServeur) : null
  } catch {
    return null
  }
}

export function serveurDesSeances(outils: Partial<Outils> = {}, delai = DELAI_MS): ServeurDesSeances {
  const { faireFetch, ouvrir, adresseDuSite, attendre, repeter } = { ...OUTILS_DU_NAVIGATEUR, ...outils }

  const appeler = async (adresse: string, init: RequestInit = {}): Promise<{ statut: number; corps: Record<string, unknown> | null } | null> => {
    try {
      const reponse = await faireFetch(adresse, { ...init, signal: AbortSignal.timeout(delai) })
      const corps: unknown = await reponse.json().catch(() => null)
      return { statut: reponse.status, corps: typeof corps === 'object' && corps !== null ? (corps as Record<string, unknown>) : null }
    } catch {
      return null
    }
  }

  return {
    creer: async (demande) => {
      const reponse = await appeler(ADRESSE_DES_SEANCES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demande),
      })
      const corps = reponse?.statut === 201 ? reponse.corps : null
      if (!corps || !estUnCodeDeSeance(corps.code) || typeof corps.jetonAnimateur !== 'string') return null
      return { code: corps.code, jetonAnimateur: corps.jetonAnimateur }
    },

    lire: async (code) => {
      if (!estUnCodeDeSeance(code)) return 'inconnue'
      const reponse = await appeler(`${ADRESSE_DES_SEANCES}/${code}`, { cache: 'no-store' })
      if (reponse?.statut === 404) return 'inconnue'
      const corps = reponse?.statut === 200 ? reponse.corps : null
      if (!corps || typeof corps.avecClassement !== 'boolean' || typeof corps.ouverte !== 'boolean') return null
      return { code, avecClassement: corps.avecClassement, ouverte: corps.ouverte }
    },

    connecter: ({ code, bonjour, surMessage, surEtat = () => {} }) => {
      const adresse = `${adresseDuSite().replace(/^http/, 'ws')}${ADRESSE_DES_SEANCES}/${code}/connexion`
      let ws: WebSocket | null = null
      let essais = 0
      let arretee = false
      let arreterPing = () => {}
      let annulerAttente = () => {}

      const arreter = () => {
        if (arretee) return
        arretee = true
        arreterPing()
        annulerAttente()
        window.removeEventListener('online', reessayerTout)
        surEtat('arretee')
      }

      const brancher = () => {
        if (arretee) return
        surEtat(essais === 0 ? 'connexion' : 'reconnexion')
        let courante: WebSocket
        try {
          courante = ouvrir(adresse)
        } catch {
          return reessayer()
        }
        ws = courante
        courante.onopen = () => {
          essais = 0
          courante.send(JSON.stringify(bonjour))
          arreterPing = repeter(() => courante.readyState === OUVERTE && courante.send('ping'), PING_MS)
          surEtat('connecte')
        }
        courante.onmessage = (evenement) => {
          const message = lireMessageDuServeur(evenement.data)
          if (!message) return // « pong », ou message illisible
          if (message.type === 'retire' || (message.type === 'refus' && REFUS_DEFINITIFS.includes(message.raison))) arreter()
          surMessage(message)
        }
        courante.onclose = (evenement) => {
          arreterPing()
          if (ws !== courante) return
          ws = null
          if (FERMETURES_DEFINITIVES.has(evenement.code)) arreter()
          else reessayer()
        }
      }

      const reessayer = () => {
        if (arretee) return
        surEtat('reconnexion')
        annulerAttente = attendre(brancher, ATTENTES_MS[Math.min(essais, ATTENTES_MS.length - 1)])
        essais += 1
      }

      // Le réseau revient (Wi-Fi retrouvé, sortie de veille) : on n'attend pas la fin du délai.
      const reessayerTout = () => {
        if (arretee || ws) return
        annulerAttente()
        brancher()
      }
      window.addEventListener('online', reessayerTout)

      brancher()
      return {
        envoyer: (message) => {
          if (!ws || ws.readyState !== OUVERTE) return false
          ws.send(JSON.stringify(message))
          return true
        },
        fermer: () => {
          const courante = ws
          ws = null
          arreter()
          courante?.close(1000)
        },
      }
    },
  }
}
