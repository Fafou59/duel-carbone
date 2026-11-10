import { useEffect, useRef, type ReactNode } from 'react'
import { CarteGeste, type EtatCarte } from '../composants/CarteGeste.tsx'
import { lancerEclat } from '../composants/eclat.ts'
import { ExplicationDuel } from '../composants/ExplicationDuel.tsx'
import { estBonChoix, plusEmetteur, rapport, type Duel } from '../domaine/duel.ts'
import { formaterRapport } from '../domaine/format.ts'
import type { GesteCalcule } from '../domaine/geste.ts'
import { mouvementReduit } from '../navigateur/mouvement.ts'
import './EcranDuel.css'

/**
 * L'écran Duel est « contrôlé » : il ne décide de rien, il affiche ce qu'on lui donne.
 * C'est la Partie qui garde le choix du joueur et qui décide de la suite.
 */
type Props = {
  duel: Duel
  /** Identifiant du Geste choisi, ou null tant que le joueur n'a pas choisi. */
  choix: string | null
  onChoisir: (idGeste: string) => void
  /** Ce qui s'affiche à la fin de l'explication (ex. le bouton « Duel suivant »). */
  suite?: ReactNode
}

/** Délai pendant lequel le joueur voit les chiffres sur les cartes avant de descendre vers l'explication. */
export const DELAI_DEFILEMENT_MS = 1500

export function EcranDuel({ duel, choix, onChoisir, suite }: Props) {
  const revele = choix !== null
  // Une « référence » vers l'élément HTML de l'explication, pour pouvoir y faire défiler la page.
  const explication = useRef<HTMLDivElement>(null)
  const cartes = useRef<HTMLDivElement>(null)
  const bonChoix = choix !== null && estBonChoix(duel, choix)

  // Bon choix : un éclat de confettis part de la carte gagnante (rien si les animations sont réduites).
  useEffect(() => {
    if (!bonChoix) return
    const gagnante = cartes.current?.querySelector('.carte--plus-emetteur')
    if (!gagnante) return
    // En quittant le Duel, on arrête l'éclat s'il est encore en cours.
    return lancerEclat(gagnante.getBoundingClientRect())
  }, [bonChoix])

  // Après le choix : 1,5 s pour voir les chiffres, puis on descend vers l'explication.
  // Sans animation si le joueur a demandé à son appareil de réduire les animations.
  useEffect(() => {
    if (!revele) return
    const minuteur = window.setTimeout(() => {
      // D'abord le focus (sans défiler), ensuite le défilement : dans l'autre ordre,
      // le focus interrompt l'animation de défilement dans Chrome.
      explication.current?.focus({ preventScroll: true })
      explication.current?.scrollIntoView({ behavior: mouvementReduit() ? 'auto' : 'smooth', block: 'start' })
    }, DELAI_DEFILEMENT_MS)
    // Si le joueur passe au Duel suivant avant la fin du délai, on annule le défilement prévu.
    return () => window.clearTimeout(minuteur)
  }, [revele, duel])

  // Raccourcis clavier : 1 choisit la première carte, 2 la seconde (tant que rien n'est choisi).
  useEffect(() => {
    if (revele) return
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.altKey || evenement.ctrlKey || evenement.metaKey) return
      // Pendant une boîte de dialogue (ex. l'annonce d'un Duel thématique), les touches lui reviennent.
      if (evenement.target instanceof Element && evenement.target.closest('dialog')) return
      if (evenement.key === '1') onChoisir(duel.a.id)
      if (evenement.key === '2') onChoisir(duel.b.id)
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [revele, duel, onChoisir])

  const etatDe = (geste: GesteCalcule): EtatCarte => {
    if (!revele) return 'question'
    if (geste.id === plusEmetteur(duel).id) return 'plus-emetteur'
    return geste.id === choix ? 'mauvais-choix' : 'autre'
  }

  const carte = (geste: GesteCalcule, raccourci: string) => (
    <CarteGeste
      geste={geste}
      etat={etatDe(geste)}
      choisie={geste.id === choix}
      raccourci={raccourci}
      onChoisir={() => onChoisir(geste.id)}
    />
  )

  const r = rapport(duel)

  return (
    <section className="duel" aria-labelledby="duel-question">
      <h2 id="duel-question" className="duel__question">
        Lequel émet le plus ?
      </h2>

      <div ref={cartes} className="duel__cartes">
        {carte(duel.a, '1')}
        {revele ? (
          <div className="duel__rapport">
            <b>{formaterRapport(r)}</b>
            <small>fois plus</small>
          </div>
        ) : (
          <div className="duel__vs" aria-hidden="true">
            VS
          </div>
        )}
        {carte(duel.b, '2')}
      </div>

      {/* Le bloc vers lequel la page défile : le verdict, puis l'explication. */}
      <div ref={explication} className="duel__resultat" tabIndex={-1}>
        {/* aria-live : un lecteur d'écran annonce le verdict dès qu'il apparaît. */}
        <div aria-live="polite">
          {revele && (
            <p className={`duel__verdict duel__verdict--${bonChoix ? 'bon' : 'mauvais'}`}>
              {bonChoix ? '✓ Bonne réponse !' : '✗ Raté !'}
            </p>
          )}
        </div>

        {revele && (
          <section className="duel__explication" aria-label="Explication">
            <ExplicationDuel duel={duel} />
          </section>
        )}
      </div>

      {/* La suite reste collée en bas de l'écran une fois le choix fait, que le joueur lise
          l'explication ou remonte vers les cartes. Elle est placée directement dans l'écran Duel
          (et non dans la carte d'explication) : un élément « sticky » ne peut pas sortir de son parent.
          Elle vient après l'explication dans le code : l'ordre de lecture ne change pas. */}
      {revele && suite && (
        <div className="duel__suite">
          <div className="duel__suite-barre">{suite}</div>
        </div>
      )}
    </section>
  )
}
