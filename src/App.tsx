const DEPOT = 'https://github.com/Fafou59/duel-carbone'

export default function App() {
  return (
    <main className="accueil">
      <h1>Duel Carbone</h1>
      <p className="accroche">
        Steak ou avocat ? Avion ou train ? Bientôt, un jeu pour deviner quel geste du quotidien
        émet le plus de CO2e.
      </p>
      <p className="statut">🚧 Bientôt en ligne</p>
      <footer>
        <p>
          Données : <a href="https://impactco2.fr">ADEME, Impact CO2</a> ·{' '}
          <a href={DEPOT}>Suivre le projet sur GitHub</a>
        </p>
      </footer>
    </main>
  )
}
