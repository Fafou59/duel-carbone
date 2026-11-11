import { useEffect, useState } from 'react'
import { DUELS_THEMATIQUES } from './donnees/duels-thematiques.ts'
import { CALIBRAGE, GESTES_CALCULES } from './donnees/index.ts'
import { cleDePaire, genererPartie } from './domaine/generateur.ts'
import { NOMBRE_DE_DUELS, type DuelDePartie } from './domaine/partie.ts'
import { EcranPartie } from './ecrans/EcranPartie.tsx'
import { EcranSources } from './ecrans/EcranSources.tsx'
import { ADRESSES, usePage } from './navigateur/adresse.ts'
import { creerMemoire, type Memoire } from './navigateur/memoire.ts'

import { DEPOT, IMPACT_CO2 } from './liens.ts'

type Props = {
  /** La mémoire locale (remplaçable dans les tests) : par défaut, le localStorage du navigateur. */
  memoire?: Memoire
}

export default function App({ memoire: memoireFournie }: Props) {
  // useState(() => …) : la mémoire est créée une seule fois, au premier affichage.
  const [memoire] = useState(() => memoireFournie ?? creerMemoire())
  // null : on est sur l'accueil ; sinon, les 10 Duels de la Partie en cours.
  const [duels, setDuels] = useState<DuelDePartie[] | null>(null)
  // Numéro de Partie : change à chaque nouvelle Partie, pour repartir d'un écran neuf.
  const [numero, setNumero] = useState(0)
  // Le record actuel (affiché sur l'accueil), et celui d'avant la Partie en cours (affiché à la fin).
  const [record, setRecord] = useState(() => memoire.meilleurScore())
  const [ancienRecord, setAncienRecord] = useState<number | null>(null)
  // La page demandée par l'adresse : le jeu, ou Sources et méthode (#sources).
  const page = usePage()

  // À chaque changement de page : le titre de l'onglet, et retour en haut de l'écran.
  useEffect(() => {
    document.title = page === 'sources' ? 'Sources et méthode · Duel Carbone' : 'Duel Carbone'
    window.scrollTo(0, 0)
  }, [page])

  const lancerPartie = () => {
    // Une Partie sur deux contient un Duel thématique (REGLES.probabiliteDuelThematique).
    const partie = genererPartie({
      gestes: GESTES_CALCULES,
      thematiques: DUELS_THEMATIQUES,
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
        {page === 'sources' && <EcranSources />}
        {/* Le jeu reste en place (simplement caché) pendant la lecture des sources : la Partie en cours n'est pas perdue. */}
        <div hidden={page === 'sources'}>
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
              <p className="accueil__confiance">
                Sans cookie, sans compte : ton meilleur score reste sur cet appareil. Chiffres de l'ADEME, calcul
                expliqué dans <a href={ADRESSES.sources}>Sources et méthode</a>.
              </p>
            </section>
          )}
        </div>
      </main>
      <footer className="pied">
        <p>
          Données : <a href={IMPACT_CO2}>ADEME, Impact CO2</a> ·{' '}
          <a href={ADRESSES.sources}>Sources et méthode</a> · <a href={DEPOT}>Suivre le projet sur GitHub</a>
        </p>
      </footer>
    </div>
  )
}
