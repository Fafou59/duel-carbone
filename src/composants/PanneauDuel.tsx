import { useEffect, useRef, type MouseEvent } from 'react'
import type { LigneRecapitulatif } from '../domaine/recapitulatif.ts'
import { ExplicationDuel } from './ExplicationDuel.tsx'
import './PanneauDuel.css'

type Props = {
  ligne: LigneRecapitulatif
  /** Appelé quand le panneau se ferme, quelle que soit la manière (croix, Échap, clic sur le fond). */
  onFermer: () => void
}

/**
 * Le détail d'un Duel du Récapitulatif, dans une boîte de dialogue « modale ».
 *
 * On utilise la balise native <dialog> et sa méthode showModal() : le navigateur fournit
 * gratuitement le fond sombre, la touche Échap, et rend le reste de la page inaccessible
 * (au clic, au clavier et aux lecteurs d'écran) tant que le panneau est ouvert.
 */
export function PanneauDuel({ ligne, onFermer }: Props) {
  const boite = useRef<HTMLDialogElement>(null)
  const croix = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialogue = boite.current
    if (dialogue && !dialogue.open) dialogue.showModal()
    croix.current?.focus()
  }, [])

  const fermer = () => boite.current?.close()

  // Le fond sombre fait partie de la balise <dialog> : un clic dont la cible est la balise
  // elle-même (et non son contenu) est donc un clic sur le fond.
  const surClic = (evenement: MouseEvent<HTMLDialogElement>) => {
    if (evenement.target === evenement.currentTarget) fermer()
  }

  const { numero, difficulte, duel, bonne, idChoisi } = ligne
  const choisi = duel.a.id === idChoisi ? duel.a : duel.b

  return (
    // Échap ferme la boîte nativement : l'événement « close » nous prévient dans tous les cas.
    <dialog ref={boite} className="panneau" aria-label={`Détail du Duel ${numero}`} onClose={onFermer} onClick={surClic}>
      <div className="panneau__contenu">
        <div className="panneau__entete">
          <p className="panneau__titre">
            Duel {numero} <span className={`difficulte difficulte--${difficulte}`}>{difficulte}</span>
          </p>
          <button ref={croix} type="button" className="panneau__fermer" aria-label="Fermer le détail" onClick={fermer}>
            {/* Une croix dessinée plutôt que le caractère « × » : selon la police, le caractère est dessiné
                plus bas que le centre de sa ligne (4,5 px sous Windows). Le dessin, lui, est centré partout. */}
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className={`panneau__verdict panneau__verdict--${bonne ? 'bon' : 'mauvais'}`}>
          {bonne ? '✓ Bonne réponse !' : `✗ Raté ! Tu avais choisi : ${choisi.titre} (${choisi.sousTitre}).`}
        </p>
        <ExplicationDuel duel={duel} />
      </div>
    </dialog>
  )
}
