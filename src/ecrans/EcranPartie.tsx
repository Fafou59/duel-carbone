import { useCallback, useEffect, useReducer, useRef } from 'react'
import { difficulteAttendue } from '../domaine/difficulte.ts'
import type { Duel } from '../domaine/duel.ts'
import { avancer, demarrerPartie, NOMBRE_DE_DUELS, score } from '../domaine/partie.ts'
import { EcranDuel } from './EcranDuel.tsx'
import { EcranFin } from './EcranFin.tsx'
import './EcranPartie.css'

type Props = {
  duels: Duel[]
  onRejouer: () => void
}

export function EcranPartie({ duels, onRejouer }: Props) {
  // useReducer branche la machine à états (domaine/partie.ts) sur React :
  // « envoyer » une action calcule le nouvel état, et React redessine l'écran.
  const [etat, envoyer] = useReducer(avancer, duels, demarrerPartie)
  const choisir = useCallback((idGeste: string) => envoyer({ type: 'choisir', idGeste }), [])

  // À chaque nouveau Duel (et à la fin), on remonte en haut de page et on place le focus
  // sur la position (« Duel 3/10 »), pour que clavier et lecteur d'écran repartent du bon endroit.
  const position = useRef<HTMLElement>(null)
  const etape = etat.phase === 'fin' ? 'fin' : etat.index
  const premierAffichage = useRef(true)
  useEffect(() => {
    if (premierAffichage.current) {
      premierAffichage.current = false
      return
    }
    window.scrollTo({ top: 0 })
    position.current?.focus()
  }, [etape])

  // « Référence de rappel » : React nous donne l'élément HTML dès qu'il est affiché.
  const retenir = (element: HTMLElement | null) => {
    position.current = element
  }

  if (etat.phase === 'fin') {
    return <EcranFin refTitre={retenir} score={score(etat)} total={NOMBRE_DE_DUELS} onRejouer={onRejouer} />
  }

  const duel = etat.duels[etat.index]
  const difficulte = difficulteAttendue(etat.index)
  const dernier = etat.index === NOMBRE_DE_DUELS - 1

  return (
    <div className="partie">
      <div className="partie__entete">
        <p ref={retenir} className="partie__position" tabIndex={-1}>
          Duel {etat.index + 1}/{NOMBRE_DE_DUELS}
        </p>
        <span className={`difficulte difficulte--${difficulte}`}>{difficulte}</span>
        <p className="partie__score">Score : {score(etat)}</p>
      </div>

      {/* Barre de progression : un segment par Duel, coloré selon sa Difficulté attendue. */}
      <ol className="progression" aria-hidden="true">
        {etat.duels.map((_, i) => (
          <li
            key={i}
            className={`progression__segment difficulte--${difficulteAttendue(i)}${i > etat.index ? ' progression__segment--a-venir' : ''}`}
          />
        ))}
      </ol>

      {/* key : un nouvel écran Duel pour chaque Duel, qui repart donc d'un état neuf. */}
      <EcranDuel
        key={etat.index}
        duel={duel}
        choix={etat.phase === 'revelation' ? etat.reponses[etat.index].idChoisi : null}
        onChoisir={choisir}
        suite={
          <button type="button" className="bouton" onClick={() => envoyer({ type: 'suivant' })}>
            {dernier ? 'Voir mon score' : 'Duel suivant →'}
          </button>
        }
      />
    </div>
  )
}
