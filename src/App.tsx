import { useState } from 'react'
import { GESTES_CALCULES } from './donnees/index.ts'
import type { Duel } from './domaine/duel.ts'
import { tirerPartieProvisoire } from './domaine/tirage.ts'
import { EcranPartie } from './ecrans/EcranPartie.tsx'

const DEPOT = 'https://github.com/Fafou59/duel-carbone'

export default function App() {
  // null : on est sur l'accueil ; sinon, les 10 Duels de la Partie en cours.
  const [duels, setDuels] = useState<Duel[] | null>(null)
  // Numéro de Partie : change à chaque nouvelle Partie, pour repartir d'un écran neuf.
  const [numero, setNumero] = useState(0)

  const lancerPartie = () => {
    setDuels(tirerPartieProvisoire(GESTES_CALCULES))
    setNumero((n) => n + 1)
  }

  return (
    <div className="page">
      <header className="entete">
        <h1>Duel Carbone</h1>
      </header>
      <main>
        {duels ? (
          <EcranPartie key={numero} duels={duels} onRejouer={lancerPartie} />
        ) : (
          <section className="accueil">
            <p className="accueil__accroche">
              Steak ou avocat ? Avion ou train ? 10 Duels pour deviner quel geste du quotidien émet le plus de CO2e.
            </p>
            <button type="button" className="bouton" onClick={lancerPartie}>
              Jouer
            </button>
          </section>
        )}
      </main>
      <footer className="pied">
        <p>
          Données : <a href="https://impactco2.fr">ADEME, Impact CO2</a> ·{' '}
          <a href={DEPOT}>Suivre le projet sur GitHub</a>
        </p>
      </footer>
    </div>
  )
}
