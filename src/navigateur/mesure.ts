/**
 * La mesure d'audience, avec GoatCounter : sans cookie, sans donnée personnelle, des chiffres agrégés.
 *
 * - On ne compte que sur l'adresse publique du jeu : ni en local, ni depuis l'aperçu d'une branche
 *   (« <branche>-duel-carbone.fabien-lesage.workers.dev »). Ailleurs, le script n'est même pas chargé.
 * - Le jeu ne dépend jamais de la mesure : si GoatCounter est bloqué, lent ou en panne, rien ne se passe.
 * - GoatCounter compte des événements mais ne calcule pas de moyenne : la durée d'une Partie
 *   est envoyée sous forme de tranche (voir docs/prd-v1-duel.md, « Événements de mesure d'audience »).
 */
import { useEffect, useRef } from 'react'
import { ADRESSE_DU_JEU } from '../domaine/partage.ts'

/** Le compteur du site sur GoatCounter, et son script (toujours en https). */
const COMPTEUR = 'https://fafou59.goatcounter.com/count'
const SCRIPT = 'https://gc.zgo.at/count.js'

/** Les adresses où l'on compte : l'adresse publique du jeu, et duelcarbone.fr (ticket #19). */
const ADRESSES_MESUREES = new Set([new URL(ADRESSE_DU_JEU).hostname, 'duelcarbone.fr', 'www.duelcarbone.fr'])

export type Mode = 'jour' | 'libre'
export type Tranche = 'moins-de-2-min' | '2-a-5-min' | '5-a-10-min' | 'plus-de-10-min'
export type Evenement =
  | `partie_lancee/${Mode}`
  | `partie_terminee/${Mode}`
  | `rejouer/${Mode}`
  | `duree_partie/${Tranche}`
  | 'partage'

/** Le strict nécessaire de GoatCounter : sa fonction count(), qu'il ajoute à la page une fois chargé. */
type GoatCounter = { count: (vars: { path: string; title?: string; event?: boolean }) => void }

declare global {
  interface Window {
    goatcounter?: GoatCounter
  }
}

/** Le navigateur, passé en paramètre (comme dans partager.ts) pour que les tests puissent le simuler. */
export type Environnement = {
  /** Le nom de domaine de la page (location.hostname). */
  hote: string
  /** GoatCounter, s'il a pu se charger. */
  goatcounter?: GoatCounter
}

export function estAdresseMesuree(hote: string): boolean {
  return ADRESSES_MESUREES.has(hote)
}

/** La tranche de durée d'une Partie (en millisecondes) : moins de 2 min, 2 à 5, 5 à 10, plus de 10. */
export function trancheDeDuree(duree: number): Tranche {
  const minutes = duree / 60_000
  if (minutes < 2) return 'moins-de-2-min'
  if (minutes < 5) return '2-a-5-min'
  if (minutes < 10) return '5-a-10-min'
  return 'plus-de-10-min'
}

/** Envoie un événement à GoatCounter, sur l'adresse publique seulement. Ne lève jamais d'erreur. */
export function mesurer(evenement: Evenement, env: Environnement = environnementReel()): void {
  if (!estAdresseMesuree(env.hote)) return
  try {
    env.goatcounter?.count({ path: evenement, title: evenement, event: true })
  } catch {
    // La mesure est secondaire : une panne de GoatCounter ne doit pas gêner le joueur.
  }
}

/**
 * Charge le script de GoatCounter, sur l'adresse publique seulement.
 * Chargé par le code (et non écrit dans index.html) : en local et sur les aperçus, aucune demande ne part.
 * Une fois chargé, GoatCounter compte aussi la visite de la page.
 */
export function chargerMesure(hote: string = window.location.hostname): void {
  if (!estAdresseMesuree(hote)) return
  const script = document.createElement('script')
  script.dataset.goatcounter = COMPTEUR
  script.async = true
  script.src = SCRIPT
  document.head.append(script)
}

function environnementReel(): Environnement {
  return { hote: window.location.hostname, goatcounter: window.goatcounter }
}

/**
 * Les événements d'une Partie : lancée (à l'affichage du premier Duel), terminée (à l'écran de fin), et sa durée.
 *
 * - Une Partie reprise (Partie du jour interrompue) a déjà été comptée au lancement : on ne compte que sa fin,
 *   sans sa durée, qui ne serait que celle de la fin de Partie.
 * - Une Partie déjà terminée qu'on revoit n'envoie rien.
 */
export function useMesureDePartie({ mode, reprise, terminee }: { mode: Mode; reprise: boolean; terminee: boolean }) {
  // Ce qu'on savait au premier affichage : une Partie déjà finie (qu'on revoit) n'envoie rien.
  const dejaTerminee = useRef(terminee)
  const debut = useRef<number | null>(null)
  const comptee = useRef(false)

  useEffect(() => {
    // La référence évite de compter deux fois (React rejoue les effets une fois de plus en développement).
    if (reprise || debut.current !== null) return
    debut.current = Date.now()
    mesurer(`partie_lancee/${mode}`)
  }, [mode, reprise])

  useEffect(() => {
    if (!terminee || dejaTerminee.current || comptee.current) return
    comptee.current = true
    mesurer(`partie_terminee/${mode}`)
    if (debut.current !== null) mesurer(`duree_partie/${trancheDeDuree(Date.now() - debut.current)}`)
  }, [mode, terminee])
}
