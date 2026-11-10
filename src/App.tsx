import { useState } from 'react'
import { CALIBRAGE, GESTES_CALCULES } from './donnees/index.ts'
import type { Duel } from './domaine/duel.ts'
import { cleDePaire, genererPartie } from './domaine/generateur.ts'
import { NOMBRE_DE_DUELS } from './domaine/partie.ts'
import { EcranPartie } from './ecrans/EcranPartie.tsx'
import { creerMemoire, type Memoire } from './navigateur/memoire.ts'

const DEPOT = 'https://github.com/Fafou59/duel-carbone'

type Props = {
  /** La mémoire locale (remplaçable dans les tests) : par défaut, le localStorage du navigateur. */
  memoire?: Memoire
}

export default function App({ memoire: memoireFournie }: Props) {
  // useState(() => …) : la mémoire est créée une seule fois, au premier affichage.
  const [memoire] = useState(() => memoireFournie ?? creerMemoire())
  // null : on est sur l'accueil ; sinon, les 10 Duels de la Partie en cours.
  const [duels, setDuels] = useState<Duel[] | null>(null)
  // Numéro de Partie : change à chaque nouvelle Partie, pour repartir d'un écran neuf.
  const [numero, setNumero] = useState(0)
  // Le record actuel (affiché sur l'accueil), et celui d'avant la Partie en cours (affiché à la fin).
  const [record, setRecord] = useState(() => memoire.meilleurScore())
  const [ancienRecord, setAncienRecord] = useState<number | null>(null)

  const lancerPartie = () => {
    // Duels thématiques : ticket #13.
    const partie = genererPartie({
      gestes: GESTES_CALCULES,
      pairesRecentes: memoire.pairesRecentes(),
      coefficients: CALIBRAGE.coefficients,
    })
    memoire.enregistrerPartie(partie.map((duel) => cleDePaire(duel.a.id, duel.b.id)))
    setAncienRecord(memoire.meilleurScore())
    setDuels(partie)
    setNumero((n) => n + 1)
  }

  const terminer = (score: number) => {
    memoire.enregistrerScore(score)
    setRecord(memoire.meilleurScore())
  }

  return (
    <div className="page">
      <header className="entete">
        <h1>Duel Carbone</h1>
      </header>
      <main>
        {duels ? (
          <EcranPartie
            key={numero}
            duels={duels}
            ancienRecord={ancienRecord}
            onTerminee={terminer}
            onRejouer={lancerPartie}
          />
        ) : (
          <section className="accueil">
            <p className="accueil__accroche">
              Steak ou avocat ? Avion ou train ? 10 Duels pour deviner quel geste du quotidien émet le plus de CO2e.
            </p>
            <button type="button" className="bouton" onClick={lancerPartie}>
              Jouer
            </button>
            {record !== null && (
              <p className="accueil__record">
                Ton record : {record}/{NOMBRE_DE_DUELS}
              </p>
            )}
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
