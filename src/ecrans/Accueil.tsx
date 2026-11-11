import { useEffect, useState } from 'react'
import { Co2e } from '../composants/Co2e.tsx'
import { Vitrine } from '../composants/Vitrine.tsx'
import { REPERES_CLIMAT } from '../donnees/index.ts'
import { formaterEmpreinte } from '../domaine/format.ts'
import { formaterDuree, secondesAvantMinuitAParis } from '../domaine/jour.ts'
import { texteDePartage } from '../domaine/partage.ts'
import { NOMBRE_DE_DUELS } from '../domaine/partie.ts'
import { partager, type ResultatPartage } from '../navigateur/partager.ts'
import './Accueil.css'

/**
 * Où en est le joueur avec le Duel du jour :
 * - « nouveau » : pas de Duel du jour en cours ni de série (premier passage, ou série cassée) ;
 * - « enCours » : le Duel du jour est commencé, pas terminé ;
 * - « aujourdhui » : le Duel du jour est joué ;
 * - « hier » : joué hier, pas encore aujourd'hui (la série est en jeu).
 */
export type Situation = 'nouveau' | 'enCours' | 'aujourdhui' | 'hier'

export type PropsAccueil = {
  /** Le jour (AAAA-MM-JJ, heure de Paris) et le numéro de son Duel du jour. */
  jour: string
  numero: number
  situation: Situation
  /** Le résultat du Duel du jour, une fois joué : le score, et pour chaque Duel, bonne réponse ou non. */
  resultat?: { score: number; bonnes: boolean[] }
  /** Le score du Duel d'hier, s'il est connu. */
  scoreHier?: number
  /** La série en cours (en jours d'affilée). */
  serie: number
  /** Le record en Partie libre (null : aucune Partie libre terminée). */
  record: number | null
  /** Faux tant que le calendrier des Duels du jour n'est pas chargé. */
  calendrierPret: boolean
  onJouerDuJour: () => void
  onPartieLibre: () => void
  onRevoir: () => void
  onTutoriel: () => void
  /** Comment partager (remplaçable dans les tests) : par défaut, avec les outils du navigateur. */
  onPartager?: (texte: string) => Promise<ResultatPartage>
}

// Espace insécable entre le nombre et l'unité : « 2 t » ne se coupe jamais en fin de ligne.
const enTonnes = (kg: number) => formaterEmpreinte(kg, { co2e: false }).replace(' ', ' ')
const jours = (n: number) => `${n} jour${n > 1 ? 's' : ''}`

/** « dimanche 22 novembre » */
const formaterJour = (jour: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${jour}T00:00:00Z`),
  )

/** Le temps qui reste avant minuit à Paris (l'arrivée du prochain Duel du jour), mis à jour chaque seconde. */
function useCompteARebours(): string {
  const [secondes, setSecondes] = useState(() => secondesAvantMinuitAParis(new Date()))
  useEffect(() => {
    const minuterie = setInterval(() => setSecondes(secondesAvantMinuitAParis(new Date())), 1000)
    return () => clearInterval(minuterie)
  }, [])
  return formaterDuree(secondes)
}

/** Le « pourquoi » du jeu, sur tous les accueils : le titre, puis l'accroche avec les repères 9,1 t et 2 t (ADEME). */
function Presentation() {
  return (
    <>
      <h2 className="accueil__titre">Lequel émet le plus ?</h2>
      <p className="accueil__accroche">
        Un Français émet en moyenne {enTonnes(REPERES_CLIMAT.francais)} de <Co2e /> par an ; l’objectif pour 2050, c’est{' '}
        {enTonnes(REPERES_CLIMAT.objectif2050)}. Pour s’en rapprocher, il faut d’abord savoir ce qui pèse.{' '}
        <b>10 Duels par jour pour apprendre à connaître l’empreinte des gestes du quotidien.</b>
      </p>
    </>
  )
}

/** Le record en Partie libre, sous son bouton. */
const Record = ({ record }: { record: number | null }) =>
  record === null ? null : (
    <p className="accueil__discret">
      Ton record en Partie libre : {record}/{NOMBRE_DE_DUELS}
    </p>
  )

/** La grille du résultat du jour : une case verte par bonne réponse, rouge sinon. */
function Grille({ score, bonnes }: { score: number; bonnes: boolean[] }) {
  return (
    <p className="accueil__grille" aria-label={`${score} bonnes réponses sur ${NOMBRE_DE_DUELS}`} role="img">
      {bonnes.map((bonne, i) => (
        <span key={i} className={bonne ? 'bon' : 'mauvais'} />
      ))}
    </p>
  )
}

/** L'accueil d'un nouveau joueur : la vitrine, qui tient sur un écran de téléphone. */
function AccueilNouveau(props: PropsAccueil) {
  const { numero, situation, calendrierPret, record, onJouerDuJour, onPartieLibre, onTutoriel } = props
  return (
    <div className="accueil accueil--nouveau">
      {/* Le premier écran : tout ce qu'il faut pour se lancer, sans faire défiler. */}
      <section className="accueil__ecran">
        <Vitrine />
        <Presentation />
        <button type="button" className="bouton accueil__gros" onClick={onJouerDuJour} disabled={!calendrierPret}>
          {situation === 'enCours' ? 'Reprendre' : 'Jouer'} le Duel du jour n° {numero}
        </button>
        <button type="button" className="lien-bouton" onClick={onTutoriel}>
          Comment ça marche ?
        </button>
      </section>

      {/* Sous la ligne de flottaison : la Partie libre. */}
      <section className="accueil__libre">
        <p>Envie de t’entraîner avant le Duel du jour ?</p>
        <button type="button" className="bouton bouton--secondaire" onClick={onPartieLibre}>
          Partie libre
        </button>
        <Record record={record} />
      </section>
    </div>
  )
}

/** L'accueil d'un joueur qui revient : le tableau de bord du jour, sur un seul écran. */
function TableauDeBord(props: PropsAccueil) {
  const { jour, numero, situation, resultat, scoreHier, serie, record, calendrierPret } = props
  const { onJouerDuJour, onPartieLibre, onRevoir, onPartager = partager } = props
  const reste = useCompteARebours()
  // Résultat du dernier partage, pour afficher une confirmation (ou le texte, si la copie a échoué).
  const [partage, setPartage] = useState<ResultatPartage | null>(null)
  const texte = resultat ? texteDePartage(resultat.score, NOMBRE_DE_DUELS) : ''
  const defier = async () => {
    setPartage(null)
    setPartage(await onPartager(texte))
  }

  return (
    <div className="accueil accueil--retour">
      {/* La vitrine en petit, à côté de la date : le jeu garde son visage sans prendre de place. */}
      <div className="accueil__entete">
        <p className="accueil__date">
          {formaterJour(jour)}
          <br />
          Duel du jour n° {numero}
        </p>
        <Vitrine taille="mini" />
      </div>

      {situation === 'aujourdhui' && resultat ? (
        <>
          <section className="accueil__carte accueil__carte--jour">
            <p className="accueil__etiquette">Ton Duel du jour</p>
            <div className="accueil__score">
              <p className="accueil__points">
                {resultat.score}
                <span>/{NOMBRE_DE_DUELS}</span>
              </p>
              <Grille {...resultat} />
            </div>
            <div className="accueil__actions">
              <button type="button" className="bouton" onClick={defier}>
                Défier mes proches
              </button>
              <button type="button" className="bouton bouton--secondaire" onClick={onRevoir}>
                Revoir mon Récapitulatif
              </button>
            </div>
            {/* role="status" : un lecteur d'écran annonce la confirmation de copie dès qu'elle apparaît. */}
            <div role="status" className="accueil__partage">
              {partage === 'copie' && <p>✓ Score copié ! Colle-le dans un message pour défier tes proches.</p>}
              {partage === 'echec' && (
                <>
                  <p>La copie automatique n’a pas fonctionné. Voici le texte à copier :</p>
                  <p className="accueil__texte-partage">{texte}</p>
                </>
              )}
            </div>
            {/* La série et le compte à rebours, sur une seule ligne. */}
            <p className="accueil__ligne">
              <span>
                <b>🔥 {jours(serie)}</b>
                <small>de série</small>
              </span>
              <span>
                <b>{reste}</b>
                <small>avant le prochain Duel</small>
              </span>
            </p>
          </section>
          {/* Le Duel du jour est joué : la Partie libre passe au premier plan. */}
          <section className="accueil__carte accueil__libre">
            <p>Envie de t’entraîner pour le Duel de demain ?</p>
            <button type="button" className="bouton accueil__gros" onClick={onPartieLibre}>
              Partie libre
            </button>
            <Record record={record} />
          </section>
        </>
      ) : (
        <>
          {/* Hier joué, aujourd'hui pas encore : la série est en jeu, on la met en avant. */}
          <section className="accueil__serie">
            <p className="accueil__flamme" aria-hidden="true">
              🔥
            </p>
            <p>
              <b>Série de {jours(serie)}.</b> Ne la casse pas !
            </p>
          </section>
          <section className="accueil__carte accueil__carte--jour">
            <p className="accueil__etiquette">Le Duel Carbone du jour</p>
            <button type="button" className="bouton accueil__gros" onClick={onJouerDuJour} disabled={!calendrierPret}>
              {situation === 'enCours' ? 'Reprendre' : 'Jouer'} le Duel du jour n° {numero}
            </button>
            <p className="accueil__ligne">
              {scoreHier !== undefined ? (
                <span>
                  <b>
                    {scoreHier}/{NOMBRE_DE_DUELS}
                  </b>
                  <small>hier</small>
                </span>
              ) : (
                <span />
              )}
              <span>
                <b>{reste}</b>
                <small>pour le jouer</small>
              </span>
            </p>
          </section>
          {/* La Partie libre, en retrait : on préfère que le joueur fasse d'abord son Duel du jour. */}
          <p className="accueil__libre-discret">
            ou{' '}
            <button type="button" className="lien-bouton" onClick={onPartieLibre}>
              une Partie libre
            </button>{' '}
            pour t’entraîner
          </p>
        </>
      )}

      {/* Après la Partie libre : le principe du jeu, comme pour un nouveau joueur. */}
      <section className="accueil__presentation">
        <Presentation />
      </section>
    </div>
  )
}

/**
 * L'accueil : la vitrine pour un nouveau joueur, le tableau de bord du jour pour un joueur qui revient
 * (Duel du jour joué aujourd'hui, ou série en jeu).
 */
export function Accueil(props: PropsAccueil) {
  const revient = props.situation === 'aujourdhui' || props.situation === 'hier' || (props.situation === 'enCours' && props.serie > 0)
  return revient ? <TableauDeBord {...props} /> : <AccueilNouveau {...props} />
}
