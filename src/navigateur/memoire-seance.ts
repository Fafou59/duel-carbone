/**
 * La mémoire de la Séance en cours, sur l'appareil (ADR 0007) : son code et le jeton qui permet d'y revenir. Pour
 * l'Animateur, c'est ce qui lui permet de reprendre la Séance s'il ferme son onglet par erreur.
 *
 * Elle est rangée à part de la mémoire du jeu (memoire.ts) : un jeton n'a rien à faire avec le record ou la série,
 * et il est oublié dès que la Séance est finie, effacée, ou qu'une nouvelle commence. Comme la mémoire du jeu, elle
 * ne lève jamais d'erreur : sans stockage, la Séance se joue, simplement sans reprise possible.
 */
import { estUnCodeDeSeance, estUnJeton } from '../domaine/seance.ts'
import { stockageDuNavigateur, type Stockage } from './memoire.ts'

export const CLE_MEMOIRE_SEANCE = 'duel-carbone/seance'

export type SeanceRetenue = { code: string; jeton: string }

export type MemoireDeSeance = {
  /** La Séance que cet appareil anime, ou null. */
  animee: () => SeanceRetenue | null
  retenirAnimee: (seance: SeanceRetenue) => void
  oublierAnimee: () => void
}

type Contenu = { animee?: SeanceRetenue }

const estUneSeanceRetenue = (brut: unknown): brut is SeanceRetenue =>
  typeof brut === 'object' && brut !== null && estUnCodeDeSeance((brut as SeanceRetenue).code) && estUnJeton((brut as SeanceRetenue).jeton)

export function creerMemoireDeSeance(stockage: Stockage | null = stockageDuNavigateur()): MemoireDeSeance {
  const lire = (): Contenu => {
    try {
      const brut: unknown = JSON.parse(stockage?.getItem(CLE_MEMOIRE_SEANCE) ?? 'null')
      const animee = typeof brut === 'object' && brut !== null ? (brut as Contenu).animee : undefined
      return estUneSeanceRetenue(animee) ? { animee: { code: animee.code, jeton: animee.jeton } } : {}
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
  }
}
