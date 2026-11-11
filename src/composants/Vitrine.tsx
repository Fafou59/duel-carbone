import { COLONNE_DROITE, COLONNE_GAUCHE } from '../donnees/vitrine.ts'
import { Icone } from './Icone.tsx'
import './Vitrine.css'

/**
 * Un ruban d'icônes qui défile en boucle. La liste est écrite deux fois : quand la première moitié est sortie,
 * l'animation repart du début sans à-coup. Décoratif (aria-hidden), et arrêté si l'appareil demande moins d'animations.
 */
function Ruban({ ids, sens, className = '' }: { ids: string[]; sens: 'haut' | 'bas' | 'gauche'; className?: string }) {
  return (
    <div className={`ruban ruban--${sens} ${className}`} aria-hidden="true">
      <div className="ruban__piste">
        {[...ids, ...ids].map((id, i) => (
          <Icone key={i} id={id} />
        ))}
      </div>
    </div>
  )
}

/** Deux colonnes d'icônes qui défilent en sens inverse autour d'un « VS » fixe : le jeu en une image. */
export function Vitrine({ taille = 'grande' }: { taille?: 'grande' | 'mini' }) {
  return (
    <div className={`vitrine vitrine--${taille}`} aria-hidden="true">
      <Ruban ids={COLONNE_GAUCHE} sens="bas" />
      <span className="vitrine__vs">VS</span>
      <Ruban ids={COLONNE_DROITE} sens="haut" />
    </div>
  )
}

/** La frise du bas de page, qui défile de droite à gauche, sur tous les écrans. */
export function Frise() {
  return <Ruban ids={[...COLONNE_DROITE, ...COLONNE_GAUCHE]} sens="gauche" className="frise" />
}
