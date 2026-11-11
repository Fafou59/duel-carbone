// PROTOTYPE JETABLE — accueil d'un nouveau joueur : la vitrine qui tient sur un écran de téléphone.
import { Frise, NoteCo2e, PiedAccueil, SIMULATION, TexteAccroche, TitreVitrine, Vitrine, type Accroche, type Titre } from './commun.tsx'

type Props = {
  accroche: Accroche
  titre: Titre
  onJouer: () => void
  onPartieLibre: () => void
  onTutoriel: () => void
}

export function Nouveau({ accroche, titre, onJouer, onPartieLibre, onTutoriel }: Props) {
  return (
    <div className="proto-nouveau">
      {/* Le premier écran : tout ce qu'il faut pour se lancer, sans faire défiler. */}
      <section className="proto-nouveau__ecran">
        <Vitrine />
        <TitreVitrine titre={titre} />
        <TexteAccroche accroche={accroche} titre={titre} />
        <button type="button" className="bouton proto-gros" onClick={onJouer}>
          Jouer le Duel du jour n° {SIMULATION.numero}
        </button>
        <button type="button" className="proto-lien-bouton" onClick={onTutoriel}>
          Comment ça marche&nbsp;?
        </button>
        {titre === 'etoile' && <NoteCo2e />}
      </section>

      {/* Sous la ligne de flottaison : la Partie libre, puis la frise du catalogue. */}
      <section className="proto-libre">
        <p>Envie de t’entraîner avant le Duel du jour&nbsp;?</p>
        <button type="button" className="bouton bouton--secondaire" onClick={onPartieLibre}>
          Partie libre
        </button>
      </section>
      <Frise />
      <PiedAccueil />
    </div>
  )
}
