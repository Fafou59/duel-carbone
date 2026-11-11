// PROTOTYPE JETABLE (refonte de l'accueil, 2e tour) : ce qui est commun aux écrans. Branche jamais fusionnée.
import { useEffect, useState } from 'react'
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
const FRANCAIS = formaterEmpreinte(valeur('francais'), { co2e: false })
const OBJECTIF_2050 = formaterEmpreinte(valeur('2050'), { co2e: false })

/** Trois façons d'enchaîner les repères 9,1 t / 2 t vers le principe du jeu (« le jeu d'abord »). */
export type Accroche = 't1' | 't2' | 't3'
export const ACCROCHES: Record<Accroche, string> = {
  t1: '1 · Savoir ce qui pèse',
  t2: '2 · Concrètement ?',
  t3: '3 · Première étape',
}

export function TexteAccroche({ accroche }: { accroche: Accroche }) {
  const jeu = <b>10 Duels par jour pour apprendre à connaître l’empreinte des gestes du quotidien.</b>
  if (accroche === 't1')
    return (
      <p className="proto-accroche">
        Un Français émet en moyenne {FRANCAIS} de CO2e par an ; l’objectif pour 2050, c’est {OBJECTIF_2050}. Pour s’en
        rapprocher, il faut d’abord savoir ce qui pèse. {jeu}
      </p>
    )
  if (accroche === 't2')
    return (
      <p className="proto-accroche">
        {FRANCAIS} de CO2e par an et par Français en moyenne, {OBJECTIF_2050} visées en 2050. Mais concrètement, un
        steak, un jean ou un trajet en train, ça pèse combien ? {jeu}
      </p>
    )
  return (
    <p className="proto-accroche">
      Objectif 2050 : passer de {FRANCAIS} à {OBJECTIF_2050} de CO2e par personne et par an. Première étape : repérer ce
      qui compte vraiment. {jeu}
    </p>
  )
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
