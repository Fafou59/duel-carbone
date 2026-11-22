import { useEffect, useState } from 'react'
import { DUELS_THEMATIQUES } from './donnees/duels-thematiques.ts'
import { CALIBRAGE, chargerCalendrier, GESTES_CALCULES } from './donnees/index.ts'
import { Tutoriel } from './composants/Tutoriel.tsx'
import { Frise } from './composants/Vitrine.tsx'
import { duelsDepuisCodes, partieDuJour, type Calendrier } from './domaine/calendrier.ts'
import { estBonChoix } from './domaine/duel.ts'
import { cleDePaire, genererPartie } from './domaine/generateur.ts'
import { decalerJour, jourDeParis, numeroDuJour, secondesAvantMinuitAParis } from './domaine/jour.ts'
import { NOMBRE_DE_DUELS, type DuelDePartie } from './domaine/partie.ts'
import { rangDuJour, type Effectifs } from './domaine/rang-du-jour.ts'
import { doitForcerUnDuelThematique } from './domaine/thematiques.ts'
import { Accueil, type Situation } from './ecrans/Accueil.tsx'
import { EcranPartie } from './ecrans/EcranPartie.tsx'
import { EcranEnSavoirPlus } from './ecrans/EcranEnSavoirPlus.tsx'
import { ADRESSES, usePage } from './navigateur/adresse.ts'
import { creerMemoire, type Memoire } from './navigateur/memoire.ts'
import { appliquerNouvelleVersion, useNouvelleVersion } from './navigateur/mise-a-jour.ts'
import { type ServeurDuRang } from './navigateur/rang-du-jour.ts'
import { DERNIERS, FAUX_SERVEUR, useVarianteDuPrototype } from './PROTOTYPE-rang-du-jour/prototype.tsx'

import { IMPACT_CO2_DOC } from './liens.ts'
import { TITRE_ACCUEIL, TITRE_EN_SAVOIR_PLUS } from './referencement.ts'

type Props = {
  /** La mémoire locale (remplaçable dans les tests) : par défaut, le localStorage du navigateur. */
  memoire?: Memoire
  /** Le jour (AAAA-MM-JJ), remplaçable dans les tests : par défaut, celui qu'il est à Paris. */
  aujourdhui?: string
  /** Le serveur du Rang du jour (remplaçable dans les tests) : par défaut, /api/rang-du-jour. */
  serveur?: ServeurDuRang
}

/** La Partie en cours : la Partie du jour (avec son jour et ses réponses déjà données) ou une Partie libre. */
/** La Partie affichée. Pour celle du jour, `serie` est la série en la comptant, figée au lancement (mesure d'audience). */
type Partie =
  | { mode: 'libre'; duels: DuelDePartie[] }
  | { mode: 'jour'; jour: string; duels: DuelDePartie[]; reponses: string[]; serie: number }

export default function App({ memoire: memoireFournie, aujourdhui: jourFourni, serveur: serveurFourni }: Props) {
  // useState(() => …) : la mémoire est créée une seule fois, au premier affichage.
  const [memoire] = useState(() => memoireFournie ?? creerMemoire())
  const [serveur] = useState(() => serveurFourni ?? FAUX_SERVEUR)
  useVarianteDuPrototype()
  // Les derniers Effectifs reçus du serveur du Rang du jour, et le jour auquel ils se rapportent.
  // `score` : présent quand ils répondent à l'envoi du score (le joueur y est donc compté, même sans mémoire locale).
  const [effectifs, setEffectifs] = useState<{ jour: string; effectifs: Effectifs; score?: number } | null>(null)
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
  // La page demandée par l'adresse : le jeu, ou En savoir plus (#en-savoir-plus).
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

  /**
   * Le Rang du jour du joueur pour ce jour-là, ou null (rien reçu du serveur, moins de 5 joueurs…).
   * Les Effectifs reçus à l'envoi du score le comptent déjà ; ceux qu'on relit aussi, si la mémoire dit que
   * l'envoi a réussi. Dans ces deux cas, on le retire de sa case pour ne le comparer qu'aux autres.
   */
  const rangDu = (jour: string) => {
    if (effectifs?.jour !== jour) return null
    const memorise = memoire.partieDuJour(jour)
    const score = effectifs.score ?? memorise?.score
    if (score == null) return null
    DERNIERS.effectifs = effectifs.effectifs
    DERNIERS.score = score
    return rangDuJour({ effectifs: effectifs.effectifs, score, compte: effectifs.score !== undefined || memorise?.compte === true })
  }

  // Le Rang du jour se relit à chaque affichage (le chiffre bouge au fil de la journée) : sur l'accueil une fois le
  // Duel du jour joué, et quand le joueur revoit son Récapitulatif. Pas à la première fin : c'est l'envoi du score
  // qui rapporte alors les Effectifs (une lecture en même temps pourrait arriver avant que le joueur soit compté).
  const revoitLeDuelDuJour = partie?.mode === 'jour' && partie.reponses.length === NOMBRE_DE_DUELS
  const relireLeRang = (!partie && situation === 'aujourdhui') || revoitLeDuelDuJour
  useEffect(() => {
    if (!relireLeRang) return
    let actif = true
    serveur.lire(numeroDuJour(aujourdhui)).then((recus) => {
      if (actif && recus) setEffectifs({ jour: aujourdhui, effectifs: recus })
    })
    return () => {
      actif = false
    }
  }, [relireLeRang, numero, aujourdhui, serveur])

  // Une nouvelle version du jeu est prête (application installée) : on l'applique en silence dès que le joueur
  // est sur l'accueil, jamais en pleine Partie ni pendant une lecture (tutoriel, En savoir plus).
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
  // Sur l'accueil, celui de index.html, que Google lit aussi une fois le jeu affiché (src/referencement.ts).
  useEffect(() => {
    document.title = page === 'enSavoirPlus' ? TITRE_EN_SAVOIR_PLUS : TITRE_ACCUEIL
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
    setPartie({ mode: 'jour', jour: aujourdhui, duels, reponses: duJour?.reponses ?? [], serie: serie.actuelle + 1 })
    setNumero((n) => n + 1)
  }

  // Le résultat du Duel du jour, Duel par Duel (la grille de l'accueil).
  const resultat = (() => {
    if (duJour?.score == null) return undefined
    const duels = duelsDuJour() ?? []
    const complet = duels.length > 0 && duJour.reponses.length === duels.length
    return { score: duJour.score, bonnes: complet ? duels.map((duel, i) => estBonChoix(duel, duJour.reponses[i])) : [] }
  })()

  // La frise d'icônes qui défile : seulement sur l'écran de fin et dans En savoir plus.
  // Ni sur l'accueil (la vitrine y défile déjà : les deux ensemble, c'était chargé), ni pendant les Duels
  // (elle détournait l'attention des cartes).
  const afficherFrise = page === 'enSavoirPlus' || (partie !== null && partieTerminee === numero)

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
        {page === 'enSavoirPlus' && <EcranEnSavoirPlus />}
        {/* Le jeu reste en place (simplement caché) pendant la lecture des sources : la Partie en cours n'est pas perdue. */}
        <div hidden={page === 'enSavoirPlus'}>
          {!partie && (
            <Accueil
              jour={aujourdhui}
              numero={numeroDuJourAffiche}
              situation={situation}
              resultat={resultat}
              rang={rangDu(aujourdhui)}
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
              serie={partie.serie}
              duels={partie.duels}
              reponsesInitiales={partie.reponses}
              onReponse={(idChoisi) => memoire.enregistrerReponseDuJour(partie.jour, idChoisi)}
              onTerminee={(score, choix) => {
                // La première fin de la Partie du jour (pas quand on la revoit), et le jour même : le score part au
                // serveur du Rang du jour, une seule fois, sans nouvel essai. S'il ne répond pas, rien ne s'affiche.
                const premiereFin = memoire.partieDuJour(partie.jour)?.score == null
                memoire.terminerPartieDuJour(partie.jour, score)
                setActualisation((n) => n + 1)
                setPartieTerminee(numero)
                if (!premiereFin || partie.jour !== aujourdhui) return
                serveur.envoyer(numeroDuJour(partie.jour), choix).then((recus) => {
                  if (!recus) return
                  memoire.noterScoreCompte(partie.jour)
                  setEffectifs({ jour: partie.jour, effectifs: recus, score })
                })
              }}
              onRejouer={lancerPartie}
              fin={{ partieDuJour: { numero: numeroDuJour(partie.jour), serie: serie.actuelle, rang: rangDu(partie.jour) } }}
            />
          )}
        </div>
      </main>
      {afficherFrise && <Frise />}
      <footer className="pied">
        <p>
          <button type="button" className="lien-bouton pied__lien-bouton" onClick={() => setTutoriel(true)}>
            Comment ça marche ?
          </button>{' '}
          · <a href={ADRESSES.enSavoirPlus}>En savoir plus</a> · <a href={IMPACT_CO2_DOC}>Chiffres de l’ADEME</a>, sans cookie
          ni compte
        </p>
      </footer>
      <Tutoriel ouvert={tutoriel} onFermer={() => setTutoriel(false)} onJouer={lancerPartieDuJour} />
    </div>
  )
}
