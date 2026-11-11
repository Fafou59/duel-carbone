// PROTOTYPE JETABLE — accueil d'un nouveau joueur : la vitrine qui tient sur un écran de téléphone.
import { COLONNE_DROITE, COLONNE_GAUCHE, Ruban, SIMULATION, TexteAccroche, PiedAccueil, type Accroche } from './commun.tsx'

type Props = {
  accroche: Accroche
  onJouer: () => void
  onPartieLibre: () => void
  onTutoriel: () => void
}

export function Nouveau({ accroche, onJouer, onPartieLibre, onTutoriel }: Props) {
  return (
    <div className="proto-nouveau">
      {/* Le premier écran : tout ce qu'il faut pour se lancer, sans faire défiler. */}
      <section className="proto-nouveau__ecran">
        <div className="proto-vitrine" aria-hidden="true">
          <Ruban ids={COLONNE_GAUCHE} sens="bas" />
          <span className="proto-vitrine__vs">VS</span>
          <Ruban ids={COLONNE_DROITE} sens="haut" />
        </div>
        <h2 className="proto-nouveau__titre">Lequel émet le plus&nbsp;?</h2>
        <TexteAccroche accroche={accroche} />
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
      <Ruban ids={[...COLONNE_DROITE, ...COLONNE_GAUCHE]} sens="gauche" className="proto-frise" />
      <PiedAccueil />
    </div>
  )
}
