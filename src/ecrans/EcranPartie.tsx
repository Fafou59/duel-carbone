import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { AnnonceThematique } from '../composants/AnnonceThematique.tsx'
import { difficulteAttendue } from '../domaine/difficulte.ts'
import { avancer, demarrerPartie, estThematique, NOMBRE_DE_DUELS, score, type DuelDePartie } from '../domaine/partie.ts'
import { recapitulatif } from '../domaine/recapitulatif.ts'
import { EcranDuel } from './EcranDuel.tsx'
import { EcranFin } from './EcranFin.tsx'
import './EcranPartie.css'

type Props = {
  duels: DuelDePartie[]
  onRejouer: () => void
  /** Le record d'avant cette Partie, affiché à la fin. */
  ancienRecord?: number | null
  /** Appelé une fois, à la fin de la Partie, avec le score (pour l'enregistrer). */
  onTerminee?: (score: number) => void
}

export function EcranPartie({ duels, onRejouer, ancienRecord = null, onTerminee }: Props) {
  // useReducer branche la machine à états (domaine/partie.ts) sur React :
  // « envoyer » une action calcule le nouvel état, et React redessine l'écran.
  const [etat, envoyer] = useReducer(avancer, duels, demarrerPartie)
  const choisir = useCallback((idGeste: string) => envoyer({ type: 'choisir', idGeste }), [])

  // Fin de Partie : on prévient l'application (qui enregistre le score), une seule fois.
  // La référence évite de prévenir à nouveau si l'application nous redonne une autre fonction.
  const prevenue = useRef(false)
  useEffect(() => {
    if (etat.phase !== 'fin' || prevenue.current) return
    prevenue.current = true
    onTerminee?.(score(etat))
  }, [etat, onTerminee])

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

  // Raccourci clavier : une fois le choix fait, Entrée passe au Duel suivant (ou au score).
  useEffect(() => {
    if (etat.phase !== 'revelation') return
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.key !== 'Enter' || evenement.repeat || evenement.defaultPrevented) return
      if (evenement.altKey || evenement.ctrlKey || evenement.metaKey || evenement.shiftKey) return
      // Sur un lien ou un bouton, Entrée garde son rôle habituel (ouvrir le lien, cliquer le bouton).
      const cible = evenement.target
      if (cible instanceof Element && cible.closest('a, button, input, select, textarea, [contenteditable]')) return
      envoyer({ type: 'suivant' })
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [etat.phase])

  // L'annonce d'un Duel thématique s'ouvre en arrivant dessus ; on retient le Duel dont elle a été fermée.
  const barre = useRef<HTMLOListElement>(null)
  const [annonceFermee, setAnnonceFermee] = useState<number | null>(null)

  // « Référence de rappel » : React nous donne l'élément HTML dès qu'il est affiché.
  const retenir = (element: HTMLElement | null) => {
    position.current = element
  }

  if (etat.phase === 'fin') {
    return (
      <EcranFin
        refTitre={retenir}
        lignes={recapitulatif(etat)}
        score={score(etat)}
        total={NOMBRE_DE_DUELS}
        ancienRecord={ancienRecord}
        onRejouer={onRejouer}
      />
    )
  }

  const duel = etat.duels[etat.index]
  const difficulte = difficulteAttendue(etat.index)
  const dernier = etat.index === NOMBRE_DE_DUELS - 1
  const thematique = estThematique(duel)
  const etiquette = thematique ? 'thematique' : difficulte
  // Premier Duel d'une nouvelle Difficulté : toute la tranche de la barre s'illumine.
  const nouvelleDifficulte = etat.index === 0 || difficulteAttendue(etat.index - 1) !== difficulte
  const debutDeTranche = etat.duels.findIndex((_, i) => difficulteAttendue(i) === difficulte)

  const segment = (d: DuelDePartie, i: number) => {
    const classes = ['progression__segment', `difficulte--${difficulteAttendue(i)}`]
    if (i > etat.index) classes.push('progression__segment--a-venir')
    if (i === etat.index) classes.push('progression__segment--courant')
    // Un Duel thématique ne se révèle qu'en arrivant dessus, et garde sa couleur ensuite.
    if (i <= etat.index && estThematique(d)) classes.push('progression__segment--thematique')
    const dansLaTranche = nouvelleDifficulte && difficulteAttendue(i) === difficulte
    const allume = dansLaTranche || (i === etat.index && thematique)
    if (allume) classes.push('progression__segment--allume')
    else if (i === etat.index) classes.push('progression__segment--remplit')
    // Les segments de la tranche s'illuminent l'un après l'autre.
    const style = dansLaTranche ? { animationDelay: `${(i - debutDeTranche) * 90}ms` } : undefined
    return <li key={i} className={classes.join(' ')} style={style} />
  }

  return (
    <div className="partie">
      <div className="partie__entete">
        <p ref={retenir} className="partie__position" tabIndex={-1}>
          Duel {etat.index + 1}/{NOMBRE_DE_DUELS}
        </p>
        {/* key : quand l'étiquette change, React en crée une nouvelle, dont l'animation d'entrée se joue. */}
        <span key={etiquette} className={`difficulte difficulte--${etiquette} difficulte--entree`}>
          {thematique ? (
            <>
              <span aria-hidden="true">★ </span>thématique
            </>
          ) : (
            difficulte
          )}
        </span>
        <p className="partie__score">Score : {score(etat)}</p>
      </div>

      {/* Barre de progression : un segment par Duel, coloré selon sa Difficulté attendue.
          key : une barre neuve à chaque Duel, pour rejouer ses animations
          (préfixée : deux éléments voisins ne doivent pas partager la même clé, l'écran Duel utilise déjà le numéro). */}
      <ol key={`barre-${etat.index}`} ref={barre} className="progression" aria-hidden="true">
        {etat.duels.map(segment)}
      </ol>

      {thematique && etat.phase === 'duel' && annonceFermee !== etat.index && (
        <AnnonceThematique
          duel={duel}
          barre={barre}
          onFermer={() => {
            setAnnonceFermee(etat.index)
            position.current?.focus()
          }}
        />
      )}

      {/* key : un nouvel écran Duel pour chaque Duel, qui repart donc d'un état neuf. */}
      <EcranDuel
        key={etat.index}
        duel={duel}
        choix={etat.phase === 'revelation' ? etat.reponses[etat.index].idChoisi : null}
        onChoisir={choisir}
        suite={
          <button
            type="button"
            className="bouton"
            aria-keyshortcuts="Enter"
            onClick={() => envoyer({ type: 'suivant' })}
          >
            {dernier ? 'Voir mon score' : 'Duel suivant →'}
          </button>
        }
      />
    </div>
  )
}
