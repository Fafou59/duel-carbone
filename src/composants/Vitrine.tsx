import { useState, type ReactNode } from 'react'
import { COLONNE_DROITE, COLONNE_GAUCHE } from '../donnees/vitrine.ts'
import { Icone } from './Icone.tsx'
import './Vitrine.css'

/**
 * Un ruban d'icônes qui défile en boucle. La liste est écrite deux fois : quand la première moitié est sortie,
 * l'animation repart du début sans à-coup. Décoratif (aria-hidden), et arrêté si l'appareil demande moins d'animations.
 * Des <span> plutôt que des <div> : le ruban est placé dans un bouton (voir Defilement).
 */
function Ruban({ ids, sens }: { ids: string[]; sens: 'haut' | 'bas' | 'gauche' }) {
  return (
    <span className={`ruban ruban--${sens}`} aria-hidden="true">
      <span className="ruban__piste">
        {[...ids, ...ids].map((id, i) => (
          <Icone key={i} id={id} />
        ))}
      </span>
    </span>
  )
}

/**
 * Ce qui défile s'arrête d'un clic, d'un toucher ou d'Entrée au clavier, et repart de même. Les règles
 * d'accessibilité (WCAG 2.2.2) demandent de pouvoir arrêter un contenu qui bouge plus de 5 secondes.
 * C'est un bouton, pour être atteint au clavier, mais sans en avoir l'air : on touche simplement les icônes.
 */
function Defilement({ className, children }: { className: string; children: ReactNode }) {
  const [enPause, setEnPause] = useState(false)
  return (
    <button
      type="button"
      className={`defilement ${className}${enPause ? ' defilement--pause' : ''}`}
      aria-pressed={enPause}
      onClick={() => setEnPause(!enPause)}
    >
      {/* Le nom du bouton, en texte caché : le reste (icônes, « VS ») est caché aux lecteurs d'écran. */}
      <span className="visuellement-cache">Mettre en pause le défilement des icônes</span>
      {children}
    </button>
  )
}

/** Deux colonnes d'icônes qui défilent en sens inverse autour d'un « VS » fixe : le jeu en une image. */
export function Vitrine({ taille = 'grande' }: { taille?: 'grande' | 'mini' }) {
  return (
    <Defilement className={`vitrine vitrine--${taille}`}>
      <Ruban ids={COLONNE_GAUCHE} sens="bas" />
      <span className="vitrine__vs" aria-hidden="true">
        VS
      </span>
      <Ruban ids={COLONNE_DROITE} sens="haut" />
    </Defilement>
  )
}

/** La frise du bas de page, qui défile de droite à gauche (à la fin d'une Partie et dans les Sources). */
export function Frise() {
  return (
    <Defilement className="frise">
      <Ruban ids={[...COLONNE_DROITE, ...COLONNE_GAUCHE]} sens="gauche" />
    </Defilement>
  )
}
