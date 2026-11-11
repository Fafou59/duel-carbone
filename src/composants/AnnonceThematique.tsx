import { useEffect, useRef, type MouseEvent, type RefObject } from 'react'
import { iconeDe } from '../donnees/icones.ts'
import type { DuelDePartie } from '../domaine/partie.ts'
import './AnnonceThematique.css'

type Props = {
  duel: DuelDePartie
  /** La barre de progression : le voile commence juste en dessous, pour qu'elle reste visible. */
  barre: RefObject<HTMLElement | null>
  /** Appelé quand l'annonce se ferme, quelle que soit la manière (bouton, Échap, clic sur le fond). */
  onFermer: () => void
}

/**
 * Durée pendant laquelle un toucher sur le fond ne ferme pas l'annonce : le temps qu'elle apparaisse
 * (0,3 s d'attente puis 0,65 s de retournement). « Au Duel ! » et Échap la ferment à tout moment.
 */
export const PROTECTION_DU_FOND_MS = 1200

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
  const ouverteA = useRef(0)

  useEffect(() => {
    const dialogue = boite.current
    if (!dialogue) return
    // Le voile sombre commence sous la barre de progression, où la case du Duel vient de changer de couleur.
    const bas = barre.current?.getBoundingClientRect().bottom ?? 0
    dialogue.style.setProperty('--debut-voile', `${Math.max(0, bas + 6)}px`)
    if (!dialogue.open) dialogue.showModal()
    ouverteA.current = Date.now()
    bouton.current?.focus()
  }, [barre])

  const fermer = () => boite.current?.close()

  // Un clic dont la cible est la balise <dialog> elle-même (et non son contenu) est un clic sur le fond.
  // Pendant l'apparition de la carte, on l'ignore : sur téléphone, le joueur qui vient de toucher
  // « Duel suivant » touche souvent aussitôt les cartes, et fermerait l'annonce sans l'avoir vue.
  const surClic = (evenement: MouseEvent<HTMLDialogElement>) => {
    if (evenement.target !== evenement.currentTarget) return
    if (Date.now() - ouverteA.current < PROTECTION_DU_FOND_MS) return
    fermer()
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
          {iconeDe(duel.a.id)} <small>ou</small> {iconeDe(duel.b.id)}
        </p>
        {/* Le titre et l'accroche propres à ce Duel : ils piquent la curiosité sans donner la réponse. */}
        {duel.thematique && <p className="annonce-thematique__nom">{duel.thematique.titre}</p>}
        <p className="annonce-thematique__texte">
          {duel.thematique?.accroche ?? "Un Duel choisi à la main, parce qu'il en dit long. Ouvre l'œil !"}
        </p>
        <button ref={bouton} type="button" className="bouton annonce-thematique__bouton" onClick={fermer}>
          Au Duel !
        </button>
      </div>
    </dialog>
  )
}
