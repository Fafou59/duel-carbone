/**
 * La mesure d'audience, avec GoatCounter : sans cookie, sans donnée personnelle, des chiffres agrégés.
 *
 * - On ne compte que sur l'adresse publique du jeu (duelcarbone.fr) : ni en local, ni depuis l'aperçu d'une branche
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

/**
 * Les adresses où l'on compte : l'adresse publique du jeu (avec ou sans www), et son ancienne adresse chez
 * Cloudflare, qui sert toujours le jeu (premiers liens partagés, applications installées avant le #19).
 */
const ADRESSES_MESUREES = new Set([
  new URL(ADRESSE_DU_JEU).hostname,
  'www.duelcarbone.fr',
  'duel-carbone.fabien-lesage.workers.dev',
])

export type Mode = 'jour' | 'libre'
/** Une tranche de durée de 30 secondes : « 2m30-3m00 », ou « 10m00-et-plus » au-delà de 10 minutes. */
export type Tranche = `${number}m${number}-${number}m${number}` | `${number}m${number}-et-plus`
export type Evenement =
  | `partie_lancee/${Mode}`
  | `partie_terminee/${Mode}`
  | `rejouer/${Mode}`
  | `duree_partie/${Tranche}`
  | 'partage'
  | `erreur/${Plantage}`
  | `installation/${'proposee' | 'guide' | 'acceptee' | 'refusee'}`

/** Les plantages comptés : une erreur de script, ou une promesse rejetée que personne n'a rattrapée. */
export type Plantage = 'script' | 'promesse'

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

/** La largeur d'une tranche de durée, et la durée au-delà de laquelle on ne détaille plus (en secondes). */
const PAS = 30
const MAXIMUM = 10 * 60

/** « 150 » secondes → « 2m30 » : des minutes et des secondes, sur deux chiffres pour les secondes. */
const minutesSecondes = (secondes: number) => `${Math.floor(secondes / 60)}m${String(secondes % 60).padStart(2, '0')}`

/**
 * La tranche de durée d'une Partie (en millisecondes), par pas de 30 secondes jusqu'à 10 minutes :
 * « 0m00-0m30 », « 0m30-1m00 »… « 9m30-10m00 », puis « 10m00-et-plus ».
 */
export function trancheDeDuree(duree: number): Tranche {
  const secondes = Math.max(0, Math.floor(duree / 1000))
  if (secondes >= MAXIMUM) return `${minutesSecondes(MAXIMUM)}-et-plus` as Tranche
  const debut = Math.floor(secondes / PAS) * PAS
  return `${minutesSecondes(debut)}-${minutesSecondes(debut + PAS)}` as Tranche
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

/**
 * Compte les plantages du jeu : seulement leur type, jamais leur message ni leur fichier (qui pourraient contenir
 * autre chose), et une seule fois par type et par visite, pour qu'une erreur en boucle ne noie pas les chiffres.
 * Le but : voir qu'un téléphone ou un navigateur pose problème avant qu'un joueur ne prenne la peine d'écrire.
 */
export function ecouterLesPlantages(
  page: Pick<EventTarget, 'addEventListener'> = window,
  env: () => Environnement = environnementReel,
): void {
  const dejaComptes = new Set<Plantage>()
  const compter = (plantage: Plantage) => () => {
    if (dejaComptes.has(plantage)) return
    dejaComptes.add(plantage)
    mesurer(`erreur/${plantage}`, env())
  }
  page.addEventListener('error', compter('script'))
  page.addEventListener('unhandledrejection', compter('promesse'))
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
