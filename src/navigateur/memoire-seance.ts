/**
 * La mémoire de la Séance en cours, sur l'appareil (ADR 0007) : son code et le jeton qui permet d'y revenir. Pour
 * l'Animateur, c'est ce qui lui permet de reprendre la Séance s'il ferme son onglet par erreur ; pour le Participant,
 * de la retrouver où elle en est quand son téléphone se met en veille ou recharge la page.
 *
 * Elle est rangée à part de la mémoire du jeu (memoire.ts) : un jeton n'a rien à faire avec le record ou la série,
 * et il est oublié dès que la Séance est finie, effacée, ou qu'une nouvelle commence. Comme la mémoire du jeu, elle
 * ne lève jamais d'erreur : sans stockage, la Séance se joue, simplement sans reprise possible.
 */
import { estUnCodeDeSeance, estUnJeton, normaliserPseudo } from '../domaine/seance.ts'
import { stockageDuNavigateur, type Stockage } from './memoire.ts'

export const CLE_MEMOIRE_SEANCE = 'duel-carbone/seance'

export type SeanceRetenue = { code: string; jeton: string }

/**
 * La Séance que ce téléphone a rejointe : son code, le jeton tiré en la rejoignant, le pseudo donné (renvoyé tant
 * que le serveur ne l'a pas reçu) et les phrases du classement déjà lues, par Duel (« 3 » : après le Duel 4), pour
 * ne jamais en relire une, même après un rechargement de la page.
 */
export type SeanceRejointe = SeanceRetenue & { pseudo: string | null; phrases: Record<string, string> }

export type MemoireDeSeance = {
  /** La Séance que cet appareil anime, ou null. */
  animee: () => SeanceRetenue | null
  retenirAnimee: (seance: SeanceRetenue) => void
  oublierAnimee: () => void
  /** La Séance que ce téléphone a rejointe, ou null. */
  rejointe: () => SeanceRejointe | null
  retenirRejointe: (seance: SeanceRejointe) => void
  oublierRejointe: () => void
}

type Contenu = { animee?: SeanceRetenue; rejointe?: SeanceRejointe }

const estUneSeanceRetenue = (brut: unknown): brut is SeanceRetenue =>
  typeof brut === 'object' && brut !== null && estUnCodeDeSeance((brut as SeanceRetenue).code) && estUnJeton((brut as SeanceRetenue).jeton)

const sontDesPhrases = (brut: unknown): brut is Record<string, string> =>
  typeof brut === 'object' && brut !== null && !Array.isArray(brut) && Object.values(brut).every((p) => typeof p === 'string')

function lireRejointe(brut: unknown): SeanceRejointe | undefined {
  if (!estUneSeanceRetenue(brut)) return undefined
  const { pseudo, phrases } = brut as Partial<SeanceRejointe>
  return {
    code: brut.code,
    jeton: brut.jeton,
    pseudo: normaliserPseudo(pseudo),
    phrases: sontDesPhrases(phrases) ? { ...phrases } : {},
  }
}

/**
 * Un jeton de Participant : 32 octets de vrai hasard (et non Math.random) en base64url, 43 caractères. Tiré par le
 * téléphone en rejoignant la Séance, il ne vaut que pour elle (ADR 0007).
 */
export function tirerUnJeton(): string {
  const octets = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...octets))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function creerMemoireDeSeance(stockage: Stockage | null = stockageDuNavigateur()): MemoireDeSeance {
  const lire = (): Contenu => {
    try {
      const brut: unknown = JSON.parse(stockage?.getItem(CLE_MEMOIRE_SEANCE) ?? 'null')
      if (typeof brut !== 'object' || brut === null) return {}
      const { animee, rejointe } = brut as Contenu
      const contenu: Contenu = {}
      if (estUneSeanceRetenue(animee)) contenu.animee = { code: animee.code, jeton: animee.jeton }
      const participant = lireRejointe(rejointe)
      if (participant) contenu.rejointe = participant
      return contenu
    } catch {
      return {}
    }
  }
  const ecrire = (contenu: Contenu) => {
    try {
      stockage?.setItem(CLE_MEMOIRE_SEANCE, JSON.stringify(contenu))
    } catch {
      // Écriture refusée : la Séance continue, sans reprise possible.
    }
  }
  return {
    animee: () => lire().animee ?? null,
    retenirAnimee: (seance) => ecrire({ ...lire(), animee: seance }),
    oublierAnimee: () => {
      const { animee: _oubliee, ...reste } = lire()
      ecrire(reste)
    },
    rejointe: () => lire().rejointe ?? null,
    retenirRejointe: (seance) => ecrire({ ...lire(), rejointe: seance }),
    oublierRejointe: () => {
      const { rejointe: _oubliee, ...reste } = lire()
      ecrire(reste)
    },
  }
}
