/**
 * La mesure d'audience, avec GoatCounter : sans cookie, sans donnée personnelle, des chiffres agrégés.
 *
 * - On ne compte que sur l'adresse publique du jeu (duelcarbone.fr) : ni en local, ni depuis l'aperçu d'une branche
 *   (« <branche>-duel-carbone.fabien-lesage.workers.dev »). Ailleurs, le script n'est même pas chargé.
 * - Le jeu ne dépend jamais de la mesure : si GoatCounter est bloqué, lent ou en panne, rien ne se passe.
 * - GoatCounter compte des événements mais ne calcule pas de moyenne : la durée d'une Partie
 *   est envoyée sous forme de tranche (voir docs/prd-v1-duel.md, « Événements de mesure d'audience »).
 * - L'arrivée par le QR code (?ref=qr-code-pc, #98) est comptée avec la visite, puis effacée de l'adresse.
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
/** La série envoyée : le nombre de jours d'affilée en comptant le Duel du jour qu'on lance, ou « 30+ » au-delà. */
export type SerieMesuree = `${number}` | '30+'
export type Evenement =
  | `partie_lancee/${Mode}`
  | `partie_terminee/${Mode}`
  | `rejouer/${Mode}`
  | `duree_partie/${Tranche}`
  | `serie/${SerieMesuree}`
  | 'partage'
  | 'partage/image'
  | `erreur/${Plantage}`
  | `installation/${'proposee' | 'guide' | 'acceptee' | 'refusee' | 'qr'}`

/** Les plantages comptés : une erreur de script, ou une promesse rejetée que personne n'a rattrapée. */
export type Plantage = 'script' | 'promesse'

/** Le strict nécessaire de GoatCounter : sa fonction count(), qu'il ajoute à la page une fois chargé. */
type GoatCounter = { count: (vars?: { path: string; title?: string; event?: boolean }) => void }

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

/** Au-delà de cette série, on ne détaille plus : l'horizon du point J+30, et une liste qui ne s'allonge pas sans fin. */
const SERIE_MAXIMUM = 30

/**
 * La série au lancement du Duel du jour, en comptant ce Duel-là : « 1 » pour un premier jour (ou un retour après un
 * jour manqué), « 2 » pour un retour le lendemain… jusqu'à « 30+ ». Envoyée exacte, pour pouvoir la regrouper
 * comme on veut au moment de l'analyse. C'est le taux de retour.
 */
export function serieMesuree(jours: number): SerieMesuree {
  if (jours >= SERIE_MAXIMUM) return `${SERIE_MAXIMUM}+`
  return `${Math.max(1, Math.floor(jours))}`
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
 *
 * GoatCounter ne compte pas la visite tout seul (no_onload) : le jeu la compte une fois le script chargé, puis
 * efface la provenance de l'adresse (compterLaVisite). Si le script est bloqué, l'adresse est nettoyée quand même.
 */
export function chargerMesure(hote: string = window.location.hostname): void {
  if (!estAdresseMesuree(hote)) {
    effacerProvenance()
    return
  }
  const script = document.createElement('script')
  script.dataset.goatcounter = COMPTEUR
  script.dataset.goatcounterSettings = JSON.stringify({ no_onload: true })
  script.async = true
  script.src = SCRIPT
  script.addEventListener('load', () => compterLaVisite())
  script.addEventListener('error', () => effacerProvenance())
  document.head.append(script)
}

/**
 * Le paramètre de provenance de l'adresse : le QR code mène à « https://duelcarbone.fr/?ref=qr-code-pc » (#98).
 * GoatCounter le lit au moment de compter la visite et range ces arrivées sous la provenance « qr-code-pc ».
 */
const PROVENANCE = 'ref'

/** La page, pour savoir si elle est visible (passée en paramètre pour que les tests puissent la simuler). */
type Page = {
  visibilityState: DocumentVisibilityState
  addEventListener: (type: 'visibilitychange', ecouteur: () => void) => void
  removeEventListener: (type: 'visibilitychange', ecouteur: () => void) => void
}

/**
 * Compte la visite de la page, puis efface sa provenance de l'adresse. Comme GoatCounter le ferait tout seul,
 * on attend que la page soit visible : un navigateur peut préparer une page en arrière-plan sans qu'on l'ouvre.
 */
export function compterLaVisite(page: Page = document, env: () => Environnement = environnementReel): void {
  const compter = () => {
    try {
      env().goatcounter?.count()
    } catch {
      // La mesure est secondaire : une panne de GoatCounter ne doit pas gêner le joueur.
    }
    effacerProvenance()
  }
  if (page.visibilityState === 'visible') return compter()
  const quandVisible = () => {
    if (page.visibilityState !== 'visible') return
    page.removeEventListener('visibilitychange', quandVisible)
    compter()
  }
  page.addEventListener('visibilitychange', quandVisible)
}

/**
 * Efface « ?ref=… » de la barre d'adresse, sans recharger la page ni ajouter d'étape à l'historique : un favori,
 * un copier-coller ou l'écran d'accueil reprennent l'adresse propre, et le retour suivant ne compte plus comme
 * une arrivée par le QR code. Le reste de l'adresse (la page demandée, après #) ne bouge pas.
 */
export function effacerProvenance(): void {
  const adresse = new URL(window.location.href)
  if (!adresse.searchParams.has(PROVENANCE)) return
  adresse.searchParams.delete(PROVENANCE)
  window.history.replaceState(window.history.state, '', `${adresse.pathname}${adresse.search}${adresse.hash}`)
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
 * Au lancement du Duel du jour, aussi la série en cours (`serie` : les jours d'affilée en comptant
 * celui-ci), pour mesurer le retour des joueurs.
 *
 * - Une Partie reprise (Partie du jour interrompue) a déjà été comptée au lancement : on ne compte que sa fin,
 *   sans sa durée, qui ne serait que celle de la fin de Partie. Sa série non plus n'est pas recomptée.
 * - Une Partie déjà terminée qu'on revoit n'envoie rien.
 */
export function useMesureDePartie({
  mode,
  reprise,
  terminee,
  serie = 1,
}: {
  mode: Mode
  reprise: boolean
  terminee: boolean
  serie?: number
}) {
  // Ce qu'on savait au premier affichage : une Partie déjà finie (qu'on revoit) n'envoie rien.
  const dejaTerminee = useRef(terminee)
  const debut = useRef<number | null>(null)
  const comptee = useRef(false)

  useEffect(() => {
    // La référence évite de compter deux fois (React rejoue les effets une fois de plus en développement).
    if (reprise || debut.current !== null) return
    debut.current = Date.now()
    mesurer(`partie_lancee/${mode}`)
    if (mode === 'jour') mesurer(`serie/${serieMesuree(serie)}`)
  }, [mode, reprise, serie])

  useEffect(() => {
    if (!terminee || dejaTerminee.current || comptee.current) return
    comptee.current = true
    mesurer(`partie_terminee/${mode}`)
    if (debut.current !== null) mesurer(`duree_partie/${trancheDeDuree(Date.now() - debut.current)}`)
  }, [mode, terminee])
}
