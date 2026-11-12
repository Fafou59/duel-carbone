/**
 * La mémoire du jeu, sur l'appareil du joueur (localStorage) : son meilleur score et les paires
 * de ses dernières Parties libres, sa Partie du jour (pour la reprendre ou revoir son résultat)
 * et sa série. Pas de compte, pas de cookie, aucune donnée personnelle, et rien ne quitte l'appareil.
 *
 * Le stockage peut manquer (navigation privée stricte), refuser d'écrire (mémoire pleine)
 * ou contenir n'importe quoi (version ancienne, modification à la main) :
 * dans tous ces cas, le jeu continue, simplement sans mémoire.
 */
import { decalerJour } from '../domaine/jour.ts'
import { PARTIES_MEMORISEES } from './taille-memoire.ts'

export { PARTIES_MEMORISEES }

/** Le strict nécessaire d'un stockage : lire et écrire du texte. localStorage convient. */
export type Stockage = Pick<Storage, 'getItem' | 'setItem'>

export const CLE_MEMOIRE = 'duel-carbone/memoire'

/**
 * La Partie du jour en cours ou terminée : ses Duels (codes « a>b »), les réponses données (pour la reprise)
 * et le score final. Les Duels sont retenus tels que joués : si une nouvelle version du jeu change le calendrier
 * (#16), la reprise, la grille et le Récapitulatif restent ceux de la Partie réellement jouée.
 * Absents d'une Partie commencée avant cette règle : on se rabat alors sur le calendrier.
 */
type DuJour = { jour: string; duels?: string[]; reponses: string[]; score: number | null }

/** La série : combien de jours de suite la Partie du jour a été terminée, et le dernier de ces jours. */
type Serie = { longueur: number; dernierJour: string }

/**
 * Ce qui est enregistré. Le numéro de version permet de faire évoluer le format sans tout casser :
 * la version 2 (Partie du jour, série) garde le record et les paires récentes de la version 1.
 */
type Contenu = {
  version: 2
  meilleurScore: number | null
  partiesRecentes: string[][]
  duJour: DuJour | null
  serie: Serie | null
  meilleureSerie: number
}

const VIDE: Contenu = { version: 2, meilleurScore: null, partiesRecentes: [], duJour: null, serie: null, meilleureSerie: 0 }

export type Memoire = {
  /** Le record de la Partie libre. */
  meilleurScore: () => number | null
  pairesRecentes: () => Set<string>
  /** Les mêmes paires, Partie par Partie (de la plus ancienne à la plus récente). */
  partiesRecentes: () => string[][]
  enregistrerScore: (score: number) => void
  /** Retient les paires (cleDePaire) d'une Partie libre qui commence. */
  enregistrerPartie: (paires: string[]) => void
  /** La Partie du jour de ce jour-là, en cours ou terminée (null si elle n'a pas commencé). */
  partieDuJour: (jour: string) => { duels?: string[]; reponses: string[]; score: number | null } | null
  /** Retient les Duels de la Partie du jour qui commence (sans remplacer ceux d'une Partie déjà commencée). */
  commencerPartieDuJour: (jour: string, duels: string[]) => void
  /** Retient une réponse de la Partie du jour, dès qu'elle est donnée (une Partie de la veille est oubliée). */
  enregistrerReponseDuJour: (jour: string, idChoisi: string) => void
  /** La Partie du jour est terminée : son score, et la série qui avance d'un jour. */
  terminerPartieDuJour: (jour: string, score: number) => void
  /** La série actuelle (0 après un jour manqué) et la meilleure série. */
  serie: (aujourdhui: string) => { actuelle: number; meilleure: number }
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
    partiesRecentes: () => lire().partiesRecentes,
    enregistrerScore: (score) => {
      const contenu = lire()
      if (contenu.meilleurScore === null || score > contenu.meilleurScore) ecrire({ ...contenu, meilleurScore: score })
    },
    enregistrerPartie: (paires) => {
      const contenu = lire()
      const partiesRecentes = [...contenu.partiesRecentes, paires].slice(-PARTIES_MEMORISEES)
      ecrire({ ...contenu, partiesRecentes })
    },
    partieDuJour: (jour) => {
      const { duJour } = lire()
      if (duJour?.jour !== jour) return null
      return { ...(duJour.duels && { duels: duJour.duels }), reponses: duJour.reponses, score: duJour.score }
    },
    commencerPartieDuJour: (jour, duels) => {
      const contenu = lire()
      if (contenu.duJour?.jour === jour && contenu.duJour.duels) return
      const enCours = contenu.duJour?.jour === jour ? contenu.duJour : { jour, reponses: [], score: null }
      ecrire({ ...contenu, duJour: { ...enCours, duels } })
    },
    enregistrerReponseDuJour: (jour, idChoisi) => {
      const contenu = lire()
      const enCours = contenu.duJour?.jour === jour ? contenu.duJour : { jour, reponses: [], score: null }
      if (enCours.score !== null) return
      ecrire({ ...contenu, duJour: { ...enCours, reponses: [...enCours.reponses, idChoisi] } })
    },
    terminerPartieDuJour: (jour, score) => {
      const contenu = lire()
      const enCours = contenu.duJour?.jour === jour ? contenu.duJour : null
      const reponses = enCours?.reponses ?? []
      const { serie } = contenu
      const longueur =
        serie?.dernierJour === jour ? serie.longueur : serie?.dernierJour === decalerJour(jour, -1) ? serie.longueur + 1 : 1
      ecrire({
        ...contenu,
        duJour: { jour, ...(enCours?.duels && { duels: enCours.duels }), reponses, score },
        serie: { longueur, dernierJour: jour },
        meilleureSerie: Math.max(contenu.meilleureSerie, longueur),
      })
    },
    serie: (aujourdhui) => {
      const { serie, meilleureSerie } = lire()
      const enCours = serie && (serie.dernierJour === aujourdhui || serie.dernierJour === decalerJour(aujourdhui, -1))
      return { actuelle: enCours ? serie.longueur : 0, meilleure: meilleureSerie }
    },
  }
}

/** On ne fait jamais confiance à ce qu'on relit : tout ce qui n'a pas la forme attendue est ignoré. */
function valider(brut: unknown): Contenu {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return VIDE
  const { meilleurScore, partiesRecentes, duJour, serie, meilleureSerie } = brut as Record<string, unknown>
  const nombre = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
  const jour = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)
  const textes = (x: unknown): x is string[] => Array.isArray(x) && x.every((t) => typeof t === 'string')
  const objet = (x: unknown): Record<string, unknown> | null =>
    typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Record<string, unknown>) : null
  const partiesValides = Array.isArray(partiesRecentes) && partiesRecentes.every(textes)
  const j = objet(duJour)
  const s = objet(serie)
  return {
    version: 2,
    meilleurScore: nombre(meilleurScore) ? meilleurScore : null,
    partiesRecentes: partiesValides ? (partiesRecentes as string[][]) : [],
    duJour:
      j && jour(j.jour) && textes(j.reponses) && (j.score === null || nombre(j.score))
        ? { jour: j.jour, ...(textes(j.duels) && { duels: j.duels }), reponses: j.reponses, score: j.score as number | null }
        : null,
    serie: s && nombre(s.longueur) && jour(s.dernierJour) ? { longueur: s.longueur, dernierJour: s.dernierJour } : null,
    meilleureSerie: nombre(meilleureSerie) ? meilleureSerie : 0,
  }
}

/** Le simple fait de lire window.localStorage peut lever une erreur (cookies bloqués, par exemple). */
/** Le localStorage du navigateur, ou rien s'il est inaccessible (navigation privée stricte). */
export function stockageDuNavigateur(): Stockage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
