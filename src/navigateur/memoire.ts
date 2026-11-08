/**
 * La mémoire du jeu, sur l'appareil du joueur (localStorage) : son meilleur score et les paires
 * de ses dernières Parties. Pas de compte, pas de cookie, aucune donnée personnelle,
 * et rien ne quitte l'appareil.
 *
 * Le stockage peut manquer (navigation privée stricte), refuser d'écrire (mémoire pleine)
 * ou contenir n'importe quoi (version ancienne, modification à la main) :
 * dans tous ces cas, le jeu continue, simplement sans mémoire.
 */
/** Le strict nécessaire d'un stockage : lire et écrire du texte. localStorage convient. */
export type Stockage = Pick<Storage, 'getItem' | 'setItem'>

export const CLE_MEMOIRE = 'duel-carbone/memoire'

/**
 * Taille de la mémoire : combien de Parties on garde. Une limite est nécessaire, sinon le stockage
 * grossirait à chaque Partie. Ce n'est pas une règle du jeu : si une tranche manque de paires,
 * le générateur réutilise une paire récente (assouplissement prévu par le PRD).
 */
export const PARTIES_MEMORISEES = 3

/** Ce qui est enregistré. Le numéro de version permettra de faire évoluer le format sans tout casser. */
type Contenu = { version: 1; meilleurScore: number | null; partiesRecentes: string[][] }

const VIDE: Contenu = { version: 1, meilleurScore: null, partiesRecentes: [] }

export type Memoire = {
  meilleurScore: () => number | null
  pairesRecentes: () => Set<string>
  enregistrerScore: (score: number) => void
  /** Retient les paires (cleDePaire) d'une Partie qui commence. */
  enregistrerPartie: (paires: string[]) => void
}

export function creerMemoire(stockage: Stockage | null = stockageDuNavigateur()): Memoire {
  const lire = (): Contenu => {
    try {
      return valider(JSON.parse(stockage?.getItem(CLE_MEMOIRE) ?? 'null'))
    } catch {
      return VIDE
    }
  }
  const ecrire = (contenu: Contenu) => {
    try {
      stockage?.setItem(CLE_MEMOIRE, JSON.stringify(contenu))
    } catch {
      // Écriture refusée : tant pis, le jeu continue sans mémoire.
    }
  }

  return {
    meilleurScore: () => lire().meilleurScore,
    pairesRecentes: () => new Set(lire().partiesRecentes.flat()),
    enregistrerScore: (score) => {
      const contenu = lire()
      if (contenu.meilleurScore === null || score > contenu.meilleurScore) ecrire({ ...contenu, meilleurScore: score })
    },
    enregistrerPartie: (paires) => {
      const contenu = lire()
      const partiesRecentes = [...contenu.partiesRecentes, paires].slice(-PARTIES_MEMORISEES)
      ecrire({ ...contenu, partiesRecentes })
    },
  }
}

/** On ne fait jamais confiance à ce qu'on relit : tout ce qui n'a pas la forme attendue est ignoré. */
function valider(brut: unknown): Contenu {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return VIDE
  const { meilleurScore, partiesRecentes } = brut as Record<string, unknown>
  const scoreValide = typeof meilleurScore === 'number' && Number.isFinite(meilleurScore)
  const partiesValides =
    Array.isArray(partiesRecentes) &&
    partiesRecentes.every((p) => Array.isArray(p) && p.every((cle) => typeof cle === 'string'))
  return {
    version: 1,
    meilleurScore: scoreValide ? meilleurScore : null,
    partiesRecentes: partiesValides ? (partiesRecentes as string[][]) : [],
  }
}

/** Le simple fait de lire window.localStorage peut lever une erreur (cookies bloqués, par exemple). */
function stockageDuNavigateur(): Stockage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
