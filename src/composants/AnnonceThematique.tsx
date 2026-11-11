import { useEffect, useRef, type MouseEvent, type RefObject } from 'react'
import { Icone } from './Icone.tsx'
import type { Duel } from '../domaine/duel.ts'
import './AnnonceThematique.css'

type Props = {
  duel: Duel
  /** La barre de progression : le voile commence juste en dessous, pour qu'elle reste visible. */
  barre: RefObject<HTMLElement | null>
  /** Appelé quand l'annonce se ferme, quelle que soit la manière (bouton, Échap, clic sur le fond). */
  onFermer: () => void
}

/**
 * L'annonce d'un Duel thématique, que le joueur découvre en arrivant dessus.
 * Elle ne donne pas la réponse : seulement les deux Gestes et l'idée qu'il y a quelque chose à apprendre.
 *
 * Comme le panneau du Récapitulatif, c'est une balise <dialog> ouverte avec showModal() :
 * le navigateur gère la touche Échap et rend le reste de la page inaccessible tant qu'elle est ouverte.
 */
export function AnnonceThematique({ duel, barre, onFermer }: Props) {
  const boite = useRef<HTMLDialogElement>(null)
  const bouton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialogue = boite.current
    if (!dialogue) return
    // Le voile sombre commence sous la barre de progression, où la case du Duel vient de changer de couleur.
    const bas = barre.current?.getBoundingClientRect().bottom ?? 0
    dialogue.style.setProperty('--debut-voile', `${Math.max(0, bas + 6)}px`)
    if (!dialogue.open) dialogue.showModal()
    bouton.current?.focus()
  }, [barre])

  const fermer = () => boite.current?.close()

  // Un clic dont la cible est la balise <dialog> elle-même (et non son contenu) est un clic sur le fond.
  const surClic = (evenement: MouseEvent<HTMLDialogElement>) => {
    if (evenement.target === evenement.currentTarget) fermer()
  }

  return (
    <dialog
      ref={boite}
      className="annonce-thematique"
      aria-labelledby="annonce-thematique-titre"
      onClose={onFermer}
      onClick={surClic}
    >
      <div className="annonce-thematique__contenu">
        <h2 id="annonce-thematique-titre" className="annonce-thematique__titre">
          <span aria-hidden="true">★ </span>Duel thématique
        </h2>
        <p className="annonce-thematique__duo" aria-hidden="true">
          <Icone id={duel.a.id} /> <small>ou</small> <Icone id={duel.b.id} />
        </p>
        <p className="annonce-thematique__texte">Un Duel choisi à la main, parce qu'il en dit long. Ouvre l'œil !</p>
        <button ref={bouton} type="button" className="bouton annonce-thematique__bouton" onClick={fermer}>
          Au Duel !
        </button>
      </div>
    </dialog>
  )
}
