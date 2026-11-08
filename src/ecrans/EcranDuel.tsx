import { useEffect, useRef, useState } from 'react'
import { CarteGeste, type EtatCarte } from '../composants/CarteGeste.tsx'
import { TableauRepartition } from '../composants/TableauRepartition.tsx'
import { iconeDe } from '../donnees/icones.ts'
import { estBonChoix, moinsEmetteur, plusEmetteur, rapport, type Duel } from '../domaine/duel.ts'
import { formaterMultiple, formaterRapport, queDevant } from '../domaine/format.ts'
import type { GesteCalcule } from '../domaine/geste.ts'
import './EcranDuel.css'

type Props = { duel: Duel }

/** Délai pendant lequel le joueur voit les chiffres sur les cartes avant de descendre vers l'explication. */
export const DELAI_DEFILEMENT_MS = 1500

export function EcranDuel({ duel }: Props) {
  // L'état du composant : l'identifiant du Geste choisi, ou null tant que le joueur n'a pas choisi.
  const [choix, setChoix] = useState<string | null>(null)
  const revele = choix !== null
  // Une « référence » vers l'élément HTML de l'explication, pour pouvoir y faire défiler la page.
  const explication = useRef<HTMLDivElement>(null)

  // Après le choix : 1,5 s pour voir les chiffres, puis on descend vers l'explication.
  // Sans animation si le joueur a demandé à son appareil de réduire les animations.
  useEffect(() => {
    if (!revele) return
    const minuteur = window.setTimeout(() => {
      const calme = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      // D'abord le focus (sans défiler), ensuite le défilement : dans l'autre ordre,
      // le focus interrompt l'animation de défilement dans Chrome.
      explication.current?.focus({ preventScroll: true })
      explication.current?.scrollIntoView({ behavior: calme ? 'auto' : 'smooth', block: 'start' })
    }, DELAI_DEFILEMENT_MS)
    // Si le joueur rejoue avant la fin du délai, on annule le défilement prévu.
    return () => window.clearTimeout(minuteur)
  }, [revele])

  // Raccourcis clavier : 1 choisit la première carte, 2 la seconde (tant que rien n'est choisi).
  useEffect(() => {
    if (revele) return
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.altKey || evenement.ctrlKey || evenement.metaKey) return
      if (evenement.key === '1') setChoix(duel.a.id)
      if (evenement.key === '2') setChoix(duel.b.id)
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [revele, duel])

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
      onChoisir={() => setChoix(geste.id)}
    />
  )

  const plus = plusEmetteur(duel)
  const moins = moinsEmetteur(duel)
  const r = rapport(duel)
  const bonChoix = choix !== null && estBonChoix(duel, choix)

  return (
    <section className="duel" aria-labelledby="duel-question">
      <h2 id="duel-question" className="duel__question">
        Lequel émet le plus ?
      </h2>

      <div className="duel__cartes">
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
            <p className="duel__equivalence">
              <span aria-hidden="true">
                1 {iconeDe(plus.id)} = {formaterMultiple(r)} {iconeDe(moins.id)}
              </span>
              <small>
                {plus.titre} ({plus.sousTitre}) émet {formaterMultiple(r)} fois plus {queDevant(moins.titre)} (
                {moins.sousTitre}).
              </small>
            </p>
            <TableauRepartition duel={duel} />
            <button type="button" className="bouton bouton--secondaire" onClick={() => setChoix(null)}>
              Rejouer ce Duel
            </button>
          </section>
        )}
      </div>
    </section>
  )
}
