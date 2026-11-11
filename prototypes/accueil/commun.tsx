// PROTOTYPE JETABLE (refonte de l'accueil, 2e tour) : ce qui est commun aux écrans. Branche jamais fusionnée.
import { useEffect, useRef, useState } from 'react'
import { OFFICIELLES } from '../../scripts/icones/officielles.ts'
import { Icone } from '../../src/composants/Icone.tsx'
import { INSTANTANE } from '../../src/donnees/index.ts'
import { formaterEmpreinte } from '../../src/domaine/format.ts'

/** Les trois situations du joueur à simuler. */
export type Situation = 'jamais' | 'aujourdhui' | 'hier'

export const SITUATIONS: Record<Situation, string> = {
  jamais: 'Jamais joué',
  aujourdhui: 'Déjà joué aujourd’hui',
  hier: 'Joué hier, pas encore aujourd’hui',
}

/** Données simulées : le Duel du jour n° 12, 7/10 aujourd'hui, 8/10 hier, une série de 3 jours avant aujourd'hui. */
export const SIMULATION = {
  numero: 12,
  aujourdhui: { score: 7, reponses: [true, true, true, false, true, true, false, true, false, true] },
  hier: { score: 8 },
  serie: 3,
}

/** Les repères climat, lus dans l'Instantané ADEME (jamais écrits à la main). */
const valeur = (slug: string) => INSTANTANE.equivalents.find((e) => e.slug === slug)?.valeur ?? 0
// Espace insécable entre le nombre et l'unité : « 2 t » ne se coupe jamais en fin de ligne.
const insecable = (texte: string) => texte.replace(' ', ' ')
const FRANCAIS = insecable(formaterEmpreinte(valeur('francais'), { co2e: false }))
const OBJECTIF_2050 = insecable(formaterEmpreinte(valeur('2050'), { co2e: false }))

/**
 * La définition du CO2e, en deux temps : d'abord ce que c'est, puis un exemple concret et ce que couvrent les chiffres.
 * À reprendre telle quelle dans la page Sources et méthode.
 */
export function DefinitionCo2e() {
  return (
    <div className="proto-definition__contenu">
      <section>
        <h3>Le CO2e, c’est quoi&nbsp;?</h3>
        <p>
          L’« équivalent CO2 » : l’unité qui additionne tous les gaz à effet de serre (CO2, méthane, protoxyde d’azote…)
          selon leur effet sur le climat.
        </p>
      </section>
      <section>
        <h3>Par exemple</h3>
        <p>Sur 100 ans, 1 kg de méthane réchauffe autant qu’environ 30 kg de CO2 : il compte pour 30 kg CO2e.</p>
        <p>Dans le jeu, les chiffres couvrent toute la vie d’un geste : fabrication, transport, usage et fin de vie.</p>
      </section>
    </div>
  )
}

/**
 * « CO2e » suivi d'une pastille « ? » qui ouvre la définition. Un vrai bouton : le clavier et les lecteurs d'écran
 * y accèdent, et la fenêtre se ferme avec Échap.
 */
export function Co2e() {
  const fenetre = useRef<HTMLDialogElement>(null)
  return (
    <>
      {/* « CO2e » et sa pastille restent sur la même ligne. */}
      <span className="proto-co2e">
        <abbr title="équivalent CO2">CO2e</abbr>
        <button type="button" className="proto-pastille" aria-label="Qu’est-ce que le CO2e ?" onClick={() => fenetre.current?.showModal()}>
          ?
        </button>
      </span>
      <dialog ref={fenetre} className="proto-dialogue proto-definition" aria-label="Définition du CO2e">
        <DefinitionCo2e />
        <button type="button" className="bouton" onClick={() => fenetre.current?.close()}>
          Compris
        </button>
      </dialog>
    </>
  )
}

/** Le « product statement », sur tous les parcours : le titre, puis l'accroche avec les repères 9,1 t / 2 t. */
export function Presentation() {
  return (
    <>
      <h2 className="proto-titre">Lequel émet le plus&nbsp;?</h2>
      <p className="proto-accroche">
        Un Français émet en moyenne {FRANCAIS} de <Co2e /> par an ; l’objectif pour 2050, c’est {OBJECTIF_2050}. Pour
        s’en rapprocher, il faut d’abord savoir ce qui pèse.{' '}
        <b>10 Duels par jour pour apprendre à connaître l’empreinte des gestes du quotidien.</b>
      </p>
    </>
  )
}

/** Les deux colonnes d'icônes qui défilent en sens inverse autour d'un « VS » fixe. */
export function Vitrine({ taille = 'grande' }: { taille?: 'grande' | 'mini' }) {
  return (
    <div className={`proto-vitrine proto-vitrine--${taille}`} aria-hidden="true">
      <Ruban ids={COLONNE_GAUCHE} sens="bas" />
      <span className="proto-vitrine__vs">VS</span>
      <Ruban ids={COLONNE_DROITE} sens="haut" />
    </div>
  )
}

/** La frise du bas de page, qui défile de droite à gauche. */
export function Frise() {
  return <Ruban ids={[...COLONNE_DROITE, ...COLONNE_GAUCHE]} sens="gauche" className="proto-frise" />
}

/** Le temps qui reste avant minuit, heure de Paris (le prochain Duel du jour), mis à jour chaque seconde. */
export function useCompteARebours(): string {
  const calculer = () => {
    const paris = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
    const minuit = new Date(paris)
    minuit.setHours(24, 0, 0, 0)
    const s = Math.floor((minuit.getTime() - paris.getTime()) / 1000)
    const deux = (n: number) => String(n).padStart(2, '0')
    return `${Math.floor(s / 3600)} h ${deux(Math.floor((s % 3600) / 60))} min ${deux(s % 60)} s`
  }
  const [reste, setReste] = useState(calculer)
  useEffect(() => {
    const minuterie = setInterval(() => setReste(calculer()), 1000)
    return () => clearInterval(minuterie)
  }, [])
  return reste
}

/** Prototype : un clic sur une action affiche ce qu'elle ferait, au lieu de la faire. */
export function useSimulation() {
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    if (!message) return
    const minuterie = setTimeout(() => setMessage(null), 2200)
    return () => clearTimeout(minuterie)
  }, [message])
  const bulle = message ? (
    <p className="proto-toast" role="status">
      {message}
    </p>
  ) : null
  return { simuler: (texte: string) => () => setMessage(`Prototype : ${texte}`), bulle }
}

/** La grille du résultat du jour, comme dans le texte de partage (#45). */
export function GrilleDuJour() {
  return (
    <p className="proto-grille" aria-label={`${SIMULATION.aujourdhui.score} bonnes réponses sur 10`}>
      {SIMULATION.aujourdhui.reponses.map((bonne, i) => (
        <span key={i} className={bonne ? 'bon' : 'mauvais'} />
      ))}
    </p>
  )
}

/** Uniquement des icônes Fluent natives (pas les dessins maison à badge), mélangées une fois pour toutes. */
// Mélange fixe : on prend un Geste sur 7 en tournant, pour alterner aliments, objets et trajets.
const IDS = Object.keys(OFFICIELLES)
const NATIVES = IDS.map((_, i) => IDS[(i * 7) % IDS.length]).filter((id, i, liste) => liste.indexOf(id) === i)
const moitie = Math.ceil(NATIVES.length / 2)
export const COLONNE_GAUCHE = NATIVES.slice(0, moitie)
export const COLONNE_DROITE = NATIVES.slice(moitie)

/**
 * Un ruban d'icônes qui défile en boucle. La liste est écrite deux fois : quand la première moitié est sortie,
 * l'animation repart du début sans à-coup. Arrêté si l'appareil demande moins d'animations.
 */
export function Ruban({ ids, sens, className }: { ids: string[]; sens: 'haut' | 'bas' | 'gauche'; className?: string }) {
  return (
    <div className={`proto-ruban proto-ruban--${sens} ${className ?? ''}`} aria-hidden="true">
      <div className="proto-ruban__piste">
        {[...ids, ...ids].map((id, i) => (
          <Icone key={i} id={id} />
        ))}
      </div>
    </div>
  )
}

/** Le bas de page : Sources et méthode, et (pour un joueur qui revient) le lien vers le tutoriel. */
export function PiedAccueil({ onTutoriel }: { onTutoriel?: () => void }) {
  return (
    <p className="proto-sources">
      {onTutoriel && (
        <>
          <button type="button" className="proto-lien-bouton proto-lien-bouton--discret" onClick={onTutoriel}>
            Comment ça marche&nbsp;?
          </button>
          {' · '}
        </>
      )}
      <a href="./#sources">Sources et méthode</a> · Chiffres de l’ADEME, sans cookie ni compte.
    </p>
  )
}
