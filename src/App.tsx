import { useEffect, useState } from 'react'
import { DUELS_THEMATIQUES } from './donnees/duels-thematiques.ts'
import { CALIBRAGE, chargerCalendrier, GESTES_CALCULES } from './donnees/index.ts'
import { Tutoriel } from './composants/Tutoriel.tsx'
import { Frise } from './composants/Vitrine.tsx'
import { duelsDepuisCodes, partieDuJour, type Calendrier } from './domaine/calendrier.ts'
import { estBonChoix } from './domaine/duel.ts'
import { cleDePaire, genererPartie } from './domaine/generateur.ts'
import { decalerJour, jourDeParis, numeroDuJour, secondesAvantMinuitAParis } from './domaine/jour.ts'
import type { DuelDePartie } from './domaine/partie.ts'
import { doitForcerUnDuelThematique } from './domaine/thematiques.ts'
import { Accueil, type Situation } from './ecrans/Accueil.tsx'
import { EcranPartie } from './ecrans/EcranPartie.tsx'
import { EcranSources } from './ecrans/EcranSources.tsx'
import { ADRESSES, usePage } from './navigateur/adresse.ts'
import { creerMemoire, type Memoire } from './navigateur/memoire.ts'
import { appliquerNouvelleVersion, useNouvelleVersion } from './navigateur/mise-a-jour.ts'

import { DEPOT, IMPACT_CO2 } from './liens.ts'

type Props = {
  /** La mémoire locale (remplaçable dans les tests) : par défaut, le localStorage du navigateur. */
  memoire?: Memoire
  /** Le jour (AAAA-MM-JJ), remplaçable dans les tests : par défaut, celui qu'il est à Paris. */
  aujourdhui?: string
}

/** La Partie en cours : la Partie du jour (avec son jour et ses réponses déjà données) ou une Partie libre. */
type Partie = { mode: 'libre'; duels: DuelDePartie[] } | { mode: 'jour'; jour: string; duels: DuelDePartie[]; reponses: string[] }

export default function App({ memoire: memoireFournie, aujourdhui: jourFourni }: Props) {
  // useState(() => …) : la mémoire est créée une seule fois, au premier affichage.
  const [memoire] = useState(() => memoireFournie ?? creerMemoire())
  // null : on est sur l'accueil ; sinon, la Partie en cours.
  const [partie, setPartie] = useState<Partie | null>(null)
  // Numéro de Partie : change à chaque nouvelle Partie, pour repartir d'un écran neuf.
  const [numero, setNumero] = useState(0)
  // Le numéro de la dernière Partie terminée : son écran de fin est affiché, ses Duels sont joués.
  const [partieTerminee, setPartieTerminee] = useState<number | null>(null)
  // Le record actuel de la Partie libre (affiché sur l'accueil), et celui d'avant la Partie en cours.
  const [record, setRecord] = useState(() => memoire.meilleurScore())
  const [ancienRecord, setAncienRecord] = useState<number | null>(null)
  // Le calendrier des Parties du jour, chargé à part (null tant qu'il arrive).
  const [calendrier, setCalendrier] = useState<Calendrier | null>(null)
  // Relu après chaque Partie du jour terminée.
  const [, setActualisation] = useState(0)
  // La page demandée par l'adresse : le jeu, ou Sources et méthode (#sources).
  const page = usePage()
  // « Comment ça marche ? » : le tutoriel, ouvert par-dessus l'écran en cours.
  const [tutoriel, setTutoriel] = useState(false)

  // Le jour, lu au démarrage, à chaque retour sur l'onglet et à minuit (heure de Paris) : passé minuit,
  // l'accueil propose le nouveau Duel du jour sans avoir à recharger la page.
  const [jourCourant, setJourCourant] = useState(() => jourDeParis(new Date()))
  useEffect(() => {
    const relire = () => document.visibilityState === 'visible' && setJourCourant(jourDeParis(new Date()))
    document.addEventListener('visibilitychange', relire)
    // Une seconde après minuit, par prudence (une minuterie peut partir un peu en avance).
    const aMinuit = setTimeout(() => setJourCourant(jourDeParis(new Date())), (secondesAvantMinuitAParis(new Date()) + 1) * 1000)
    return () => {
      document.removeEventListener('visibilitychange', relire)
      clearTimeout(aMinuit)
    }
  }, [jourCourant])
  const aujourdhui = jourFourni ?? jourCourant
  const numeroDuJourAffiche = numeroDuJour(aujourdhui)
  const duJour = memoire.partieDuJour(aujourdhui)
  const serie = memoire.serie(aujourdhui)
  const situation: Situation =
    duJour?.score != null ? 'aujourdhui' : duJour ? 'enCours' : serie.actuelle > 0 ? 'hier' : 'nouveau'
  const scoreHier = memoire.partieDuJour(decalerJour(aujourdhui, -1))?.score ?? undefined

  // Une nouvelle version du jeu est prête (application installée) : on l'applique en silence dès que le joueur
  // est sur l'accueil, jamais en pleine Partie ni pendant une lecture (tutoriel, Sources et méthode).
  const nouvelleVersion = useNouvelleVersion()
  useEffect(() => {
    if (nouvelleVersion && !partie && !tutoriel && page === 'jeu') appliquerNouvelleVersion()
  }, [nouvelleVersion, partie, tutoriel, page])

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

  /**
   * Les Duels de la Partie du jour : ceux retenus par la mémoire si elle est commencée (une nouvelle version du jeu
   * a pu changer le calendrier entre-temps), sinon ceux du calendrier. null tant que le calendrier n'est pas arrivé.
   */
  const duelsDuJour = (): DuelDePartie[] | null => {
    if (duJour?.duels) {
      try {
        return duelsDepuisCodes(duJour.duels, GESTES_CALCULES, DUELS_THEMATIQUES)
      } catch {
        // Un Geste retiré du catalogue depuis : on se rabat sur le calendrier.
      }
    }
    return calendrier ? partieDuJour(calendrier, aujourdhui, GESTES_CALCULES, DUELS_THEMATIQUES) : null
  }

  // La Partie du jour : la même pour tout le monde, reprise là où le joueur l'a laissée.
  const lancerPartieDuJour = () => {
    const duels = duelsDuJour()
    if (!duels) return
    memoire.commencerPartieDuJour(aujourdhui, duels.map((duel) => `${duel.a.id}>${duel.b.id}`))
    setPartie({ mode: 'jour', jour: aujourdhui, duels, reponses: duJour?.reponses ?? [] })
    setNumero((n) => n + 1)
  }

  // Le résultat du Duel du jour, Duel par Duel (la grille de l'accueil).
  const resultat = (() => {
    if (duJour?.score == null) return undefined
    const duels = duelsDuJour() ?? []
    const complet = duels.length > 0 && duJour.reponses.length === duels.length
    return { score: duJour.score, bonnes: complet ? duels.map((duel, i) => estBonChoix(duel, duJour.reponses[i])) : [] }
  })()

  // Le joueur est en train de jouer un Duel (ni sur l'accueil, ni sur l'écran de fin, ni en train de lire les sources).
  const enPleinDuel = partie !== null && partieTerminee !== numero && page === 'jeu'

  const revenirALAccueil = () => {
    setPartie(null)
    setTutoriel(false)
    window.scrollTo(0, 0)
  }

  const terminerPartieLibre = (score: number) => {
    memoire.enregistrerScore(score)
    setRecord(memoire.meilleurScore())
  }

  return (
    <div className="page">
      <header className="entete">
        {/* Le logo et le nom ramènent à l'accueil, d'où qu'on soit (une Partie du jour se reprendra là où elle en était). */}
        <h1>
          <a className="entete__lien" href={ADRESSES.jeu} onClick={revenirALAccueil}>
            <img className="entete__logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="36" height="36" />
            Duel Carbone
          </a>
        </h1>
      </header>
      <main>
        {page === 'sources' && <EcranSources />}
        {/* Le jeu reste en place (simplement caché) pendant la lecture des sources : la Partie en cours n'est pas perdue. */}
        <div hidden={page === 'sources'}>
          {!partie && (
            <Accueil
              jour={aujourdhui}
              numero={numeroDuJourAffiche}
              situation={situation}
              resultat={resultat}
              scoreHier={scoreHier}
              serie={serie.actuelle}
              record={record}
              calendrierPret={calendrier !== null}
              onJouerDuJour={lancerPartieDuJour}
              onPartieLibre={lancerPartie}
              onRevoir={lancerPartieDuJour}
              onTutoriel={() => setTutoriel(true)}
            />
          )}
          {partie?.mode === 'libre' && (
            <EcranPartie
              key={numero}
              duels={partie.duels}
              ancienRecord={ancienRecord}
              onTerminee={(score) => {
                terminerPartieLibre(score)
                setPartieTerminee(numero)
              }}
              onRejouer={lancerPartie}
              // Le Duel du jour, proposé en premier à la fin s'il reste à jouer (une fois le calendrier arrivé).
              fin={{
                duJour: calendrier
                  ? {
                      numero: numeroDuJourAffiche,
                      situation: duJour?.score != null ? 'joue' : duJour ? 'enCours' : 'aJouer',
                      onJouer: lancerPartieDuJour,
                    }
                  : undefined,
              }}
            />
          )}
          {partie?.mode === 'jour' && (
            <EcranPartie
              key={numero}
              mode="jour"
              duels={partie.duels}
              reponsesInitiales={partie.reponses}
              onReponse={(idChoisi) => memoire.enregistrerReponseDuJour(partie.jour, idChoisi)}
              onTerminee={(score) => {
                memoire.terminerPartieDuJour(partie.jour, score)
                setActualisation((n) => n + 1)
                setPartieTerminee(numero)
              }}
              onRejouer={lancerPartie}
              fin={{ partieDuJour: { numero: numeroDuJour(partie.jour), serie: serie.actuelle } }}
            />
          )}
        </div>
      </main>
      {/* La frise du catalogue, sur tous les écrans sauf pendant les Duels : un ruban qui bouge sans cesse
          à côté des cartes détourne l'attention du joueur. */}
      {!enPleinDuel && <Frise />}
      <footer className="pied">
        <p>
          <button type="button" className="lien-bouton pied__lien-bouton" onClick={() => setTutoriel(true)}>
            Comment ça marche ?
          </button>{' '}
          · <a href={ADRESSES.sources}>Sources et méthode</a> · <a href={IMPACT_CO2}>Chiffres de l’ADEME</a>, sans cookie ni
          compte
        </p>
        <p>
          <a href={DEPOT}>Suivre le projet sur GitHub</a>
        </p>
      </footer>
      <Tutoriel ouvert={tutoriel} onFermer={() => setTutoriel(false)} onJouer={lancerPartieDuJour} />
    </div>
  )
}
