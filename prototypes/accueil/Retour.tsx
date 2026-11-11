// PROTOTYPE JETABLE — accueil d'un joueur qui revient : le tableau de bord du jour, sur un seul écran.
import { useRef } from 'react'
import { Icone } from '../../src/composants/Icone.tsx'
import { GESTES_CALCULES } from '../../src/donnees/index.ts'
import { moinsEmetteur, plusEmetteur, rapport } from '../../src/domaine/duel.ts'
import { formaterMultiple } from '../../src/domaine/format.ts'
import { genererPartie } from '../../src/domaine/generateur.ts'
import { hasardReproductible } from '../../src/domaine/hasard.ts'
import { Frise, GrilleDuJour, PiedAccueil, Presentation, SIMULATION, useCompteARebours, Vitrine } from './commun.tsx'

// Une Partie du jour simulée (toujours la même), pour le bouton « Revoir mon Récapitulatif ».
const DUELS_DU_JOUR = genererPartie({ gestes: GESTES_CALCULES, hasard: hasardReproductible(12) })

const AUJOURDHUI = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(
  new Date(),
)

type Props = {
  situation: 'aujourdhui' | 'hier'
  onJouer: () => void
  onPartieLibre: () => void
  onPartager: () => void
  onTutoriel: () => void
}

export function Retour({ situation, onJouer, onPartieLibre, onPartager, onTutoriel }: Props) {
  const reste = useCompteARebours()
  const recap = useRef<HTMLDialogElement>(null)
  const dejaJoue = situation === 'aujourdhui'
  const serie = dejaJoue ? SIMULATION.serie + 1 : SIMULATION.serie

  return (
    <div className="proto-retour">
      {/* La vitrine en petit, à côté de la date : le jeu garde son identité sans prendre de place. */}
      <div className="proto-retour__entete">
        <p className="proto-retour__date">
          {AUJOURDHUI}
          <br />
          Duel n° {SIMULATION.numero}
        </p>
        <Vitrine taille="mini" />
      </div>

      {dejaJoue ? (
        <>
          <section className="proto-carte proto-carte--jour">
            <p className="proto-etiquette">Ton Duel du jour</p>
            <div className="proto-retour__score">
              <p className="proto-score">
                {SIMULATION.aujourdhui.score}
                <span>/10</span>
              </p>
              <GrilleDuJour />
            </div>
            <div className="proto-retour__actions">
              <button type="button" className="bouton" onClick={onPartager}>
                Défier mes proches
              </button>
              <button type="button" className="bouton bouton--secondaire" onClick={() => recap.current?.showModal()}>
                Revoir mon Récapitulatif
              </button>
            </div>
            {/* La série et le compte à rebours, sur une seule ligne. */}
            <p className="proto-retour__ligne">
              <span>
                <b>🔥 {serie} jours</b>
                <small>de série</small>
              </span>
              <span>
                <b>{reste}</b>
                <small>avant le prochain Duel</small>
              </span>
            </p>
          </section>
          {/* Le Duel du jour est joué : la Partie libre passe au premier plan. */}
          <section className="proto-carte proto-retour__libre">
            <p className="proto-retour__libre-titre">Envie de t’entraîner pour le Duel de demain&nbsp;?</p>
            <button type="button" className="bouton proto-gros" onClick={onPartieLibre}>
              Partie libre
            </button>
          </section>
        </>
      ) : (
        <>
          {/* Hier joué, aujourd'hui pas encore : la série est en jeu, on la met en avant. */}
          <section className="proto-retour__serie">
            <p className="proto-retour__flamme" aria-hidden="true">
              🔥
            </p>
            <p>
              <b>Série de {serie} jours.</b> Ne la casse pas&nbsp;!
            </p>
          </section>
          <section className="proto-carte proto-carte--jour">
            <p className="proto-etiquette">Le Duel Carbone du jour</p>
            <button type="button" className="bouton proto-gros" onClick={onJouer}>
              Jouer le Duel du jour
            </button>
            <p className="proto-retour__ligne">
              <span>
                <b>{SIMULATION.hier.score}/10</b>
                <small>hier</small>
              </span>
              <span>
                <b>{reste}</b>
                <small>pour le jouer</small>
              </span>
            </p>
          </section>
          {/* La Partie libre, en retrait : on préfère que le joueur fasse son Duel du jour. */}
          <p className="proto-retour__libre-discret">
            ou{' '}
            <button type="button" className="proto-lien-bouton" onClick={onPartieLibre}>
              une Partie libre
            </button>{' '}
            pour t’entraîner
          </p>
        </>
      )}

      {/* Après la Partie libre : le principe du jeu, comme pour un nouveau joueur. */}
      <section className="proto-retour__presentation">
        <Presentation />
      </section>
      <Frise />
      <PiedAccueil onTutoriel={onTutoriel} />

      <dialog ref={recap} className="proto-dialogue" aria-labelledby="proto-recap-titre">
        <h2 id="proto-recap-titre">Ton Récapitulatif du jour</h2>
        <p className="proto-discret">Dans le jeu, chaque case rouvre l’explication du Duel.</p>
        <ol className="proto-recap">
          {DUELS_DU_JOUR.map((duel, i) => (
            <li key={i} className={SIMULATION.aujourdhui.reponses[i] ? 'bon' : 'mauvais'}>
              <span>
                {SIMULATION.aujourdhui.reponses[i] ? '✓' : '✗'} Duel {i + 1}
              </span>
              <b>
                1 <Icone id={plusEmetteur(duel).id} /> = {formaterMultiple(rapport(duel))} <Icone id={moinsEmetteur(duel).id} />
              </b>
            </li>
          ))}
        </ol>
        <button type="button" className="bouton" onClick={() => recap.current?.close()}>
          Fermer
        </button>
      </dialog>
    </div>
  )
}
