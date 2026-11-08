import { gesteCalcule } from './donnees/index.ts'
import type { Duel } from './domaine/duel.ts'
import { EcranDuel } from './ecrans/EcranDuel.tsx'

const DEPOT = 'https://github.com/Fafou59/duel-carbone'

// Ticket #5 : un Duel fixe, pour valider l'écran. Le tirage des Duels arrive avec la Partie (ticket #7).
const DUEL_DE_DEMONSTRATION: Duel = { a: gesteCalcule('steak-boeuf'), b: gesteCalcule('avocat') }

export default function App() {
  return (
    <div className="page">
      <header className="entete">
        <h1>Duel Carbone</h1>
      </header>
      <main>
        <EcranDuel duel={DUEL_DE_DEMONSTRATION} />
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
