/**
 * Le Mode animation, côté Animateur (adresse #animer) : la page d'explication et la création d'une Séance, puis
 * l'écran projeté (EcranSeance). Chargé à part du reste du jeu (main.tsx) : un joueur seul ne le télécharge jamais.
 *
 * L'ordinateur de l'Animateur tire les 10 Duels lui-même, comme une Partie libre mais toujours avec un Duel thématique,
 * en écartant ses paires récentes (ADR 0007) ; le serveur ne fait que les vérifier. Le code et le jeton de la Séance
 * sont gardés dans la mémoire du navigateur : en rouvrant la page, l'Animateur reprend la Séance où elle en était.
 */
import { useEffect, useState } from 'react'
import { genererPartie } from '../../domaine/generateur.ts'
import { cleDePaire } from '../../domaine/duel.ts'
import type { SourceDeHasard } from '../../domaine/hasard.ts'
import { REGLES } from '../../domaine/regles.ts'
import { DUELS_THEMATIQUES } from '../../donnees/duels-thematiques.ts'
import { CALIBRAGE, GESTES_CALCULES } from '../../donnees/index.ts'
import { ADRESSES } from '../../navigateur/adresse.ts'
import { creerMemoire, type Memoire } from '../../navigateur/memoire.ts'
import { mesurer as mesurerReel, type Evenement } from '../../navigateur/mesure.ts'
import { creerMemoireDeSeance, type MemoireDeSeance } from '../../navigateur/memoire-seance.ts'
import { serveurDesSeances, type ServeurDesSeances } from '../../navigateur/seance.ts'
import { TITRE_MODE_ANIMATION } from '../../referencement.ts'
import { EcranSeance } from './EcranSeance.tsx'
import './ModeAnimation.css'

type Props = {
  /** Remplaçables dans les tests : la mémoire du jeu, celle de la Séance, le serveur, le hasard du tirage et la mesure. */
  memoire?: Memoire
  memoireSeance?: MemoireDeSeance
  serveur?: ServeurDesSeances
  hasard?: SourceDeHasard
  mesurer?: (evenement: Evenement) => void
}

type Etat =
  /** On regarde si une Séance retenue existe encore. */
  | { ecran: 'verification' }
  | { ecran: 'explication'; enCreation: boolean; erreur: string | null }
  | { ecran: 'seance'; code: string; jeton: string; avecClassement: boolean }

const { participantsPourUnClassement, participantsMax, dureeMaxEnHeures, effacementEnHeures } = REGLES.seance

export function ModeAnimation({
  memoire: memoireFournie,
  memoireSeance: memoireSeanceFournie,
  serveur: serveurFourni,
  hasard = Math.random,
  mesurer = mesurerReel,
}: Props) {
  const [memoire] = useState(() => memoireFournie ?? creerMemoire())
  const [memoireSeance] = useState(() => memoireSeanceFournie ?? creerMemoireDeSeance())
  const [serveur] = useState(() => serveurFourni ?? serveurDesSeances())
  const [etat, setEtat] = useState<Etat>(() => (memoireSeance.animee() ? { ecran: 'verification' } : { ecran: 'explication', enCreation: false, erreur: null }))
  const [avecClassement, setAvecClassement] = useState(true)

  useEffect(() => {
    document.title = TITRE_MODE_ANIMATION
    window.scrollTo(0, 0)
  }, [])

  // Une Séance retenue (onglet fermé par erreur) : on la reprend si elle existe encore.
  useEffect(() => {
    if (etat.ecran !== 'verification') return
    const retenue = memoireSeance.animee()
    if (!retenue) return
    let actif = true
    serveur.lire(retenue.code).then((informations) => {
      if (!actif) return
      if (informations === 'inconnue') {
        memoireSeance.oublierAnimee()
        setEtat({ ecran: 'explication', enCreation: false, erreur: null })
      } else {
        // Serveur injoignable (null) : on tente quand même, la connexion se rétablira d'elle-même.
        setEtat({ ecran: 'seance', code: retenue.code, jeton: retenue.jeton, avecClassement: informations?.avecClassement ?? true })
      }
    })
    return () => {
      actif = false
    }
  }, [etat.ecran, memoireSeance, serveur])

  const creer = async (classement: boolean) => {
    setEtat({ ecran: 'explication', enCreation: true, erreur: null })
    // Les 10 Duels, tirés ici comme une Partie libre, toujours avec un Duel thématique, loin des paires récentes.
    const duels = genererPartie({
      gestes: GESTES_CALCULES,
      thematiques: DUELS_THEMATIQUES,
      pairesRecentes: memoire.pairesRecentes(),
      forcerThematique: true,
      coefficients: CALIBRAGE.coefficients,
      hasard,
    })
    const creee = await serveur.creer({ classement, duels: duels.map((d) => `${d.a.id}>${d.b.id}`) })
    if (!creee) {
      setEtat({
        ecran: 'explication',
        enCreation: false,
        erreur: 'La Séance n’a pas pu être créée. Vérifie la connexion à Internet, puis réessaie.',
      })
      return
    }
    // La mesure d'audience compte les Séances créées (PRD du Mode animation, section 7), sans rien d'autre.
    mesurer('seance/creee')
    // Ces paires comptent désormais parmi les récentes : la prochaine Séance (ou Partie libre) en propose d'autres.
    memoire.enregistrerPartie(duels.map((d) => cleDePaire(d.a.id, d.b.id)))
    memoireSeance.retenirAnimee({ code: creee.code, jeton: creee.jetonAnimateur })
    setEtat({ ecran: 'seance', code: creee.code, jeton: creee.jetonAnimateur, avecClassement: classement })
    window.scrollTo(0, 0)
  }

  const revenirALExplication = () => {
    memoireSeance.oublierAnimee()
    setEtat({ ecran: 'explication', enCreation: false, erreur: null })
  }

  if (etat.ecran === 'verification') {
    return (
      <div className="an">
        <main className="an-message">
          <p role="status">Reprise de la Séance en cours…</p>
        </main>
      </div>
    )
  }

  if (etat.ecran === 'seance') {
    return (
      <EcranSeance
        // Une nouvelle Séance repart d'un écran neuf.
        key={etat.code}
        code={etat.code}
        jeton={etat.jeton}
        serveur={serveur}
        memoire={memoire}
        mesurer={mesurer}
        onNouvelle={() => void creer(etat.avecClassement)}
        onAbandon={revenirALExplication}
        onPerdue={revenirALExplication}
      />
    )
  }

  return (
    <div className="an">
      <main className="an-explication">
        <p className="an-logo">
          <a href={ADRESSES.jeu}>
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="36" height="36" />
            Duel Carbone
          </a>
        </p>
        <h1>Animer une Séance</h1>
        <p className="an-explication__intro">
          Fais jouer toute une salle en direct : tu projettes les Duels, chacun répond sur son téléphone, puis tu révèles la
          réponse à tout le monde. Idéal pour un atelier, une Fresque du Climat ou une réunion d’équipe. Gratuit, sans compte.
        </p>

        <h2>Comment ça se passe</h2>
        <ol>
          <li>Tu crées la Séance et tu projettes cette page.</li>
          <li>
            Les Participants scannent le QR code (ou tapent le code) avec leur téléphone : jusqu’à {participantsMax} personnes.
            Sans téléphone, lance quand même les Duels : la salle en débat à voix haute.
          </li>
          <li>
            Tu lances chaque Duel, sans chrono. La réponse se révèle dès que tout le monde a répondu, ou plus tôt si tu
            le décides : la salle découvre alors ce qu’elle a répondu.
          </li>
          <li>Après 10 Duels : les résultats, les Duels qui ont le plus trompé la salle et un conseil pour agir.</li>
        </ol>
        <p>
          Tout se commande au clavier : <kbd>Espace</kbd> pour passer à l’étape suivante.
        </p>

        <h2>Ce qui est gardé, et ce qui est effacé</h2>
        <p>
          Personne ne crée de compte. Le serveur ne garde que le temps de la Séance les pseudos et les réponses, dans
          l’Union européenne : la Séance se ferme {dureeMaxEnHeures} heures après sa création, et tout est effacé au bout de{' '}
          {effacementEnHeures} heures. Seuls restent des totaux sans nom : les réponses s’ajoutent au pourcentage de réponses
          fausses de chaque Duel.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void creer(avecClassement)
          }}
        >
          <fieldset className="an-choix">
            <legend>Un classement ?</legend>
            <label>
              <input type="radio" name="classement" checked={avecClassement} onChange={() => setAvecClassement(true)} />
              <span>
                Avec un classement
                <small>
                  Chacun choisit un pseudo ; à partir de {participantsPourUnClassement} Participants, le classement s’affiche
                  entre les Duels, avec des médailles à la fin.
                </small>
              </span>
            </label>
            <label>
              <input type="radio" name="classement" checked={!avecClassement} onChange={() => setAvecClassement(false)} />
              <span>
                Sans classement
                <small>Personne ne donne de pseudo ; on ne montre que les réponses de la salle.</small>
              </span>
            </label>
          </fieldset>
          {etat.erreur && (
            <p className="an-erreur" role="alert">
              {etat.erreur}
            </p>
          )}
          <button type="submit" className="bouton" disabled={etat.enCreation}>
            {etat.enCreation ? 'Création de la Séance…' : 'Créer la Séance'}
          </button>
        </form>
      </main>
    </div>
  )
}
