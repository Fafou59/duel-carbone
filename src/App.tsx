import { useEffect, useState } from 'react'
import { DUELS_THEMATIQUES } from './donnees/duels-thematiques.ts'
import { CALIBRAGE, chargerCalendrier, GESTES_CALCULES } from './donnees/index.ts'
import { partieDuJour, type Calendrier } from './domaine/calendrier.ts'
import { cleDePaire, genererPartie } from './domaine/generateur.ts'
import { jourDeParis, numeroDuJour } from './domaine/jour.ts'
import { NOMBRE_DE_DUELS, type DuelDePartie } from './domaine/partie.ts'
import { doitForcerUnDuelThematique } from './domaine/thematiques.ts'
import { EcranPartie } from './ecrans/EcranPartie.tsx'
import { EcranSources } from './ecrans/EcranSources.tsx'
import { ADRESSES, usePage } from './navigateur/adresse.ts'
import { creerMemoire, type Memoire } from './navigateur/memoire.ts'

import { DEPOT, IMPACT_CO2 } from './liens.ts'

type Props = {
  /** La mémoire locale (remplaçable dans les tests) : par défaut, le localStorage du navigateur. */
  memoire?: Memoire
  /** Le jour (AAAA-MM-JJ), remplaçable dans les tests : par défaut, celui qu'il est à Paris. */
  aujourdhui?: string
}

/** La Partie en cours : la Partie du jour (avec son jour et ses réponses déjà données) ou une Partie libre. */
type Partie = { mode: 'libre'; duels: DuelDePartie[] } | { mode: 'jour'; jour: string; duels: DuelDePartie[]; reponses: string[] }

const jours = (n: number) => `${n} jour${n > 1 ? 's' : ''}`

export default function App({ memoire: memoireFournie, aujourdhui: jourFourni }: Props) {
  // useState(() => …) : la mémoire est créée une seule fois, au premier affichage.
  const [memoire] = useState(() => memoireFournie ?? creerMemoire())
  // null : on est sur l'accueil ; sinon, la Partie en cours.
  const [partie, setPartie] = useState<Partie | null>(null)
  // Numéro de Partie : change à chaque nouvelle Partie, pour repartir d'un écran neuf.
  const [numero, setNumero] = useState(0)
  // Le record actuel de la Partie libre (affiché sur l'accueil), et celui d'avant la Partie en cours.
  const [record, setRecord] = useState(() => memoire.meilleurScore())
  const [ancienRecord, setAncienRecord] = useState<number | null>(null)
  // Le calendrier des Parties du jour, chargé à part (null tant qu'il arrive).
  const [calendrier, setCalendrier] = useState<Calendrier | null>(null)
  // Relu après chaque Partie du jour terminée.
  const [, setActualisation] = useState(0)
  // La page demandée par l'adresse : le jeu, ou Sources et méthode (#sources).
  const page = usePage()

  // Le jour, lu une fois au démarrage, puis à chaque retour sur l'onglet : passé minuit, l'accueil
  // propose le nouveau Duel du jour sans avoir à recharger la page.
  const [jourCourant, setJourCourant] = useState(() => jourDeParis(new Date()))
  useEffect(() => {
    const relire = () => document.visibilityState === 'visible' && setJourCourant(jourDeParis(new Date()))
    document.addEventListener('visibilitychange', relire)
    return () => document.removeEventListener('visibilitychange', relire)
  }, [])
  const aujourdhui = jourFourni ?? jourCourant
  const numeroDuJourAffiche = numeroDuJour(aujourdhui)
  const duJour = memoire.partieDuJour(aujourdhui)
  const serie = memoire.serie(aujourdhui)

  useEffect(() => {
    let actif = true
    chargerCalendrier().then((c) => actif && setCalendrier(c))
    return () => {
      actif = false
    }
  }, [])

  // À chaque changement de page : le titre de l'onglet, et retour en haut de l'écran.
  useEffect(() => {
    document.title = page === 'sources' ? 'Sources et méthode · Duel Carbone' : 'Duel Carbone'
    window.scrollTo(0, 0)
  }, [page])

  const lancerPartie = () => {
    // Une Partie sur deux contient un Duel thématique (REGLES.probabiliteDuelThematique),
    // et jamais plus de 3 Parties de suite sans (la garantie, lue dans la mémoire des Parties récentes).
    const duels = genererPartie({
      gestes: GESTES_CALCULES,
      thematiques: DUELS_THEMATIQUES,
      pairesRecentes: memoire.pairesRecentes(),
      forcerThematique: doitForcerUnDuelThematique(memoire.partiesRecentes(), DUELS_THEMATIQUES),
      coefficients: CALIBRAGE.coefficients,
    })
    memoire.enregistrerPartie(duels.map((duel) => cleDePaire(duel.a.id, duel.b.id)))
    setAncienRecord(memoire.meilleurScore())
    setPartie({ mode: 'libre', duels })
    setNumero((n) => n + 1)
  }

  // La Partie du jour : la même pour tout le monde, reprise là où le joueur l'a laissée.
  const lancerPartieDuJour = () => {
    if (!calendrier) return
    const duels = partieDuJour(calendrier, aujourdhui, GESTES_CALCULES, DUELS_THEMATIQUES)
    setPartie({ mode: 'jour', jour: aujourdhui, duels, reponses: duJour?.reponses ?? [] })
    setNumero((n) => n + 1)
  }

  const terminerPartieLibre = (score: number) => {
    memoire.enregistrerScore(score)
    setRecord(memoire.meilleurScore())
  }

  const accueil = (
    <section className="accueil">
      <p className="accueil__accroche">
        Steak ou avocat ? Avion ou train ? 10 Duels pour deviner quel geste du quotidien émet le plus de CO2e.
      </p>
      <button type="button" className="bouton" onClick={lancerPartieDuJour} disabled={!calendrier}>
        {duJour?.score != null
          ? 'Revoir mon Duel du jour'
          : `${duJour ? 'Reprendre' : 'Jouer'} le Duel Carbone du jour n° ${numeroDuJourAffiche}`}
      </button>
      {duJour?.score != null && (
        <p className="accueil__record">
          Duel Carbone du jour n° {numeroDuJourAffiche} : {duJour.score}/{NOMBRE_DE_DUELS}
        </p>
      )}
      {serie.actuelle > 0 && <p className="accueil__record">Série : {jours(serie.actuelle)} d'affilée</p>}
      <p className="accueil__libre">Envie de t'entraîner ?</p>
      <button type="button" className="bouton bouton--secondaire" onClick={lancerPartie}>
        Partie libre
      </button>
      {record !== null && (
        <p className="accueil__record">
          Ton record en Partie libre : {record}/{NOMBRE_DE_DUELS}
        </p>
      )}
      <p className="accueil__confiance">
        Sans cookie, sans compte : ton meilleur score et ta série restent sur cet appareil. Chiffres de l'ADEME, calcul
        expliqué dans <a href={ADRESSES.sources}>Sources et méthode</a>.
      </p>
    </section>
  )

  return (
    <div className="page">
      <header className="entete">
        <h1>Duel Carbone</h1>
      </header>
      <main>
        {page === 'sources' && <EcranSources />}
        {/* Le jeu reste en place (simplement caché) pendant la lecture des sources : la Partie en cours n'est pas perdue. */}
        <div hidden={page === 'sources'}>
          {!partie && accueil}
          {partie?.mode === 'libre' && (
            <EcranPartie
              key={numero}
              duels={partie.duels}
              ancienRecord={ancienRecord}
              onTerminee={terminerPartieLibre}
              onRejouer={lancerPartie}
            />
          )}
          {partie?.mode === 'jour' && (
            <EcranPartie
              key={numero}
              duels={partie.duels}
              reponsesInitiales={partie.reponses}
              onReponse={(idChoisi) => memoire.enregistrerReponseDuJour(partie.jour, idChoisi)}
              onTerminee={(score) => {
                memoire.terminerPartieDuJour(partie.jour, score)
                setActualisation((n) => n + 1)
              }}
              onRejouer={lancerPartie}
              fin={{
                titre: `Duel Carbone du jour n° ${numeroDuJour(partie.jour)}`,
                complement:
                  serie.actuelle > 0
                    ? `Série : ${jours(serie.actuelle)} d'affilée · Prochain Duel du jour à minuit.`
                    : 'Prochain Duel du jour à minuit.',
                libelleRejouer: 'Partie libre',
              }}
            />
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
