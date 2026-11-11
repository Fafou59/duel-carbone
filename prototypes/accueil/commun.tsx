// PROTOTYPE JETABLE (refonte de l'accueil) : ce qui est commun aux trois variantes. Branche jamais fusionnée.
import { useEffect, useState } from 'react'
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

/** Données simulées : le Duel du jour n° 12, un score de 7/10 aujourd'hui, 8/10 hier, une série de 3 jours. */
export const SIMULATION = {
  numero: 12,
  aujourdhui: { score: 7, reponses: [true, true, true, false, true, true, false, true, false, true] },
  hier: { score: 8 },
  serie: 3,
  meilleureSerie: 5,
  recordLibre: 9,
}

/** Les deux repères climat, lus dans l'Instantané ADEME (jamais écrits à la main). */
const valeur = (slug: string) => INSTANTANE.equivalents.find((e) => e.slug === slug)?.valeur ?? 0
export const FRANCAIS = formaterEmpreinte(valeur('francais'), { co2e: false })
export const OBJECTIF_2050 = formaterEmpreinte(valeur('2050'), { co2e: false })
export const PART_OBJECTIF = valeur('2050') / valeur('francais')

/** Le temps qui reste avant minuit, heure de Paris (le prochain Duel du jour), mis à jour chaque seconde. */
export function useCompteARebours(): string {
  const calculer = () => {
    const maintenant = new Date()
    const paris = new Date(maintenant.toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
    const minuit = new Date(paris)
    minuit.setHours(24, 0, 0, 0)
    const s = Math.floor((minuit.getTime() - paris.getTime()) / 1000)
    const deux = (n: number) => String(n).padStart(2, '0')
    return `${deux(Math.floor(s / 3600))} h ${deux(Math.floor((s % 3600) / 60))} min ${deux(s % 60)} s`
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

/** « No Shame, Just Game » : toujours à la fin, près du bouton Jouer. */
export function Slogan() {
  return <p className="proto-slogan">No Shame, Just Game.</p>
}

/** Les repères climat : la phrase validée par Fabien, avec une jauge 9,1 t → 2 t. */
export function ReperesClimat({ jauge = true }: { jauge?: boolean }) {
  return (
    <div className="proto-climat">
      <p>
        Un Français émet <em>en moyenne</em> <b>{FRANCAIS}</b> de CO2e par an. Objectif 2050 : <b>{OBJECTIF_2050}</b>.
      </p>
      {jauge && (
        <div className="proto-jauge" aria-hidden="true">
          <span className="proto-jauge__aujourdhui">
            <span>Aujourd’hui · {FRANCAIS}</span>
          </span>
          <span className="proto-jauge__objectif" style={{ width: `${PART_OBJECTIF * 100}%` }}>
            <span>2050 · {OBJECTIF_2050}</span>
          </span>
        </div>
      )}
      <p className="proto-climat__chute">Spoiler : ce ne sont pas tes e‑mails. Devine ce qui pèse vraiment.</p>
    </div>
  )
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

/** Une rangée d'icônes de Gestes, pour illustrer. */
export function Frise({ ids }: { ids: string[] }) {
  return (
    <p className="proto-frise" aria-hidden="true">
      {ids.map((id) => (
        <Icone key={id} id={id} />
      ))}
    </p>
  )
}

export function LienSources() {
  return (
    <p className="proto-sources">
      Chiffres de l’ADEME (Impact CO2), calcul expliqué dans <a href="./#sources">Sources et méthode</a>. Sans cookie,
      sans compte.
    </p>
  )
}
