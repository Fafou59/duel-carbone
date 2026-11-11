// PROTOTYPE JETABLE — Variante C « Le rendez-vous quotidien » : un tableau de bord du jour, l'explication en bulle.
import { useState } from 'react'
import {
  GrilleDuJour,
  LienSources,
  ReperesClimat,
  SIMULATION,
  Slogan,
  type Situation,
  useCompteARebours,
  useSimulation,
} from './commun.tsx'

const AUJOURDHUI = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(
  new Date(),
)

export function VarianteC({ situation }: { situation: Situation }) {
  const { simuler, bulle } = useSimulation()
  const reste = useCompteARebours()
  // La bulle d'explication ne s'affiche qu'à la première visite ; on peut la fermer.
  const [bulleFermee, setBulleFermee] = useState(false)
  const serie = situation === 'aujourdhui' ? SIMULATION.serie + 1 : situation === 'hier' ? SIMULATION.serie : 0

  return (
    <div className="proto-c">
      <p className="proto-c__date">
        {AUJOURDHUI} · Duel n° {SIMULATION.numero}
      </p>

      {situation === 'jamais' && !bulleFermee && (
        <aside className="proto-c__bulle" aria-label="Le principe du jeu">
          <p>
            <b>Bienvenue !</b> Chaque jour, 10 Duels entre deux gestes du quotidien : à toi de deviner lequel émet le plus de CO2e.
            Les mêmes pour tout le monde, pour te comparer à tes proches.
          </p>
          <button type="button" className="proto-lien-bouton" onClick={() => setBulleFermee(true)}>
            Compris !
          </button>
        </aside>
      )}

      <section className="proto-carte proto-carte--jour proto-c__jour">
        {situation === 'aujourdhui' ? (
          <>
            <p className="proto-etiquette">Ton Duel du jour</p>
            <p className="proto-score">
              {SIMULATION.aujourdhui.score}
              <span>/10</span>
            </p>
            <GrilleDuJour />
            <button type="button" className="bouton" onClick={simuler('ouvrirait le partage')}>
              Défier mes proches
            </button>
          </>
        ) : (
          <>
            <p className="proto-etiquette">Ton Duel du jour t’attend</p>
            <p className="proto-c__grand">10 Duels · environ 3 minutes</p>
            <button type="button" className="bouton proto-gros" onClick={simuler('lancerait le Duel du jour')}>
              Jouer le Duel du jour
            </button>
            <Slogan />
          </>
        )}
        <p className="proto-c__rebours">
          {situation === 'aujourdhui' ? 'Prochain Duel dans' : 'Il reste'} <b>{reste}</b>
          {situation === 'aujourdhui' ? '' : ' pour le jouer'}
        </p>
      </section>

      <ul className="proto-c__stats" aria-label="Tes statistiques">
        <li>
          <b>{serie} 🔥</b>
          <span>série en cours</span>
        </li>
        <li>
          <b>{situation === 'jamais' ? '–' : `${SIMULATION.hier.score}/10`}</b>
          <span>hier</span>
        </li>
        <li>
          <b>{situation === 'jamais' ? '–' : SIMULATION.meilleureSerie}</b>
          <span>meilleure série</span>
        </li>
      </ul>

      <section className="proto-libre">
        <p>Envie de t’entraîner pour le Duel de demain ?</p>
        <button type="button" className="bouton bouton--secondaire" onClick={simuler('lancerait une Partie libre')}>
          Partie libre
        </button>
        {situation !== 'jamais' && <p className="proto-discret">Ton record en Partie libre : {SIMULATION.recordLibre}/10</p>}
      </section>

      {situation === 'aujourdhui' && <Slogan />}
      <ReperesClimat jauge={situation === 'jamais'} />
      <LienSources />
      {bulle}
    </div>
  )
}
