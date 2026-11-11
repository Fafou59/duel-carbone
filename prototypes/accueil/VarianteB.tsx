// PROTOTYPE JETABLE — Variante B « La vitrine » : une accroche illustrée, l'explication derrière un bouton.
import { useRef } from 'react'
import { Icone } from '../../src/composants/Icone.tsx'
import {
  Frise,
  GrilleDuJour,
  LienSources,
  ReperesClimat,
  SIMULATION,
  Slogan,
  type Situation,
  useCompteARebours,
  useSimulation,
} from './commun.tsx'

export function VarianteB({ situation }: { situation: Situation }) {
  const { simuler, bulle } = useSimulation()
  const reste = useCompteARebours()
  const tutoriel = useRef<HTMLDialogElement>(null)

  return (
    <div className="proto-b">
      <section className="proto-b__vitrine">
        <p className="proto-b__duo" aria-hidden="true">
          <Icone id="steak-boeuf" />
          <span>VS</span>
          <Icone id="paris-marseille-tgv" />
        </p>
        <h2 className="proto-b__titre">Lequel émet le plus ?</h2>
        <p className="proto-b__accroche">Steak ou TGV, jean ou smartphone : 10 Duels pour démasquer les poids lourds du quotidien.</p>
        {situation === 'jamais' && (
          <button type="button" className="proto-lien-bouton" onClick={() => tutoriel.current?.showModal()}>
            Comment ça marche ?
          </button>
        )}
      </section>

      <section className="proto-carte proto-carte--jour">
        <p className="proto-etiquette">Le Duel Carbone du jour · n° {SIMULATION.numero}</p>
        {situation === 'aujourdhui' ? (
          <>
            <p className="proto-score">
              {SIMULATION.aujourdhui.score}
              <span>/10</span>
            </p>
            <GrilleDuJour />
            <button type="button" className="bouton" onClick={simuler('ouvrirait le partage')}>
              Défier mes proches
            </button>
            <p className="proto-discret">Prochain Duel dans {reste}</p>
          </>
        ) : (
          <>
            <p>Les mêmes 10 Duels pour tout le monde, jusqu’à minuit.</p>
            {situation === 'hier' && (
              <p className="proto-b__hier">
                Hier : <b>{SIMULATION.hier.score}/10</b> · série de {SIMULATION.serie} jours 🔥
              </p>
            )}
            <button type="button" className="bouton proto-gros" onClick={simuler('lancerait le Duel du jour')}>
              Jouer le Duel du jour
            </button>
            <Slogan />
          </>
        )}
      </section>

      <section className="proto-libre">
        <p>Envie de t’entraîner pour le Duel de demain ?</p>
        <button type="button" className="bouton bouton--secondaire" onClick={simuler('lancerait une Partie libre')}>
          Partie libre
        </button>
      </section>

      {situation === 'aujourdhui' && <Slogan />}
      <ReperesClimat />
      <Frise ids={['jean', 'smartphone', 'avocat', 'paris-new-york', 'lave-linge', 'cafe']} />
      <LienSources />

      <dialog ref={tutoriel} className="proto-tutoriel" aria-labelledby="proto-tutoriel-titre">
        <h2 id="proto-tutoriel-titre">Comment ça marche ?</h2>
        <ol>
          <li>
            <b>Deux gestes s’affrontent.</b> Touche celui qui émet le plus de CO2e.
          </li>
          <li>
            <b>La réponse s’explique.</b> D’où viennent les émissions, et de combien l’un dépasse l’autre.
          </li>
          <li>
            <b>10 Duels, de plus en plus serrés.</b> Un nouveau Duel du jour chaque matin, à comparer avec tes proches.
          </li>
        </ol>
        <button type="button" className="bouton" onClick={() => tutoriel.current?.close()}>
          C’est parti !
        </button>
      </dialog>
      {bulle}
    </div>
  )
}
