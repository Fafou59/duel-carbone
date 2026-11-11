// PROTOTYPE JETABLE — accueil d'un nouveau joueur : la vitrine qui tient sur un écran de téléphone.
import { Frise, PiedAccueil, Presentation, SIMULATION, Vitrine } from './commun.tsx'

type Props = {
  onJouer: () => void
  onPartieLibre: () => void
  onTutoriel: () => void
}

export function Nouveau({ onJouer, onPartieLibre, onTutoriel }: Props) {
  return (
    <div className="proto-nouveau">
      {/* Le premier écran : tout ce qu'il faut pour se lancer, sans faire défiler. */}
      <section className="proto-nouveau__ecran">
        <Vitrine />
        <Presentation />
        <button type="button" className="bouton proto-gros" onClick={onJouer}>
          Jouer le Duel du jour n° {SIMULATION.numero}
        </button>
        <button type="button" className="proto-lien-bouton" onClick={onTutoriel}>
          Comment ça marche&nbsp;?
        </button>
      </section>

      {/* Sous la ligne de flottaison : la Partie libre, puis la frise du catalogue. */}
      <section className="proto-libre">
        <p>Envie de t’entraîner avant le Duel du jour&nbsp;?</p>
        <button type="button" className="bouton bouton--secondaire" onClick={onPartieLibre}>
          Partie libre
        </button>
      </section>
      <Frise />
      <PiedAccueil onTutoriel={onTutoriel} />
    </div>
  )
}
