import type { Ref } from 'react'
import { Conseil } from '../../composants/Conseil.tsx'
import { Recapitulatif } from '../../composants/Recapitulatif.tsx'
import { conseilAffiche, valeursDe } from '../../domaine/conseils.ts'
import type { DuelDePartie } from '../../domaine/partie.ts'
import { pourcent } from '../../domaine/rang-du-jour.ts'
import { lignesDuRecapitulatif, messageDeScore } from '../../domaine/recapitulatif.ts'
import type { Medaille } from '../../domaine/seance.ts'
import type { PlaceDuParticipant, VueParticipant } from '../../domaine/seance-messages.ts'
import { CONSEILS } from '../../donnees/conseils.ts'
import { INSTANTANE } from '../../donnees/index.ts'
import type { Evenement } from '../../navigateur/mesure.ts'

const VALEURS = valeursDe(INSTANTANE)

const MEDAILLES: Record<Medaille, { symbole: string; nom: string }> = {
  or: { symbole: '🥇', nom: 'médaille d’or' },
  argent: { symbole: '🥈', nom: 'médaille d’argent' },
  bronze: { symbole: '🥉', nom: 'médaille de bronze' },
}

/** « 1er », « 2e »… */
const enOrdinal = (rang: number) => (rang === 1 ? '1er' : `${rang}e`)

/** « 2 places gagnées », « 1 place perdue » : ce que disent ▲ et ▼ aux lecteurs d'écran. */
function enPlaces(evolution: number): string {
  const n = Math.abs(evolution)
  const pluriel = n > 1 ? 's' : ''
  return `${n} place${pluriel} ${evolution > 0 ? 'gagnée' : 'perdue'}${pluriel}`
}

/** Le score : « 6/8 », sur les seuls Duels joués (un Participant arrivé en cours en a joué moins de 10). */
function Score({ vue }: { vue: VueParticipant }) {
  const { bonnes, joues } = vue.moi.score
  return (
    <p className="fin__score">
      {bonnes}
      <span>/{joues}</span>
      <span className="visuellement-cache"> bonnes réponses</span>
    </p>
  )
}

/** La place : « 2e ex aequo sur 24 », avec ▲▼ (classement intermédiaire) ou la médaille (fin). */
function Place({ place, participants, fin }: { place: PlaceDuParticipant; participants: number; fin: boolean }) {
  const { rang, exAequo, evolution, medaille } = place
  return (
    <p className="telephone__place">
      {enOrdinal(rang)}
      {exAequo && ' ex aequo'} sur {participants}
      {fin && medaille && (
        <span className="telephone__medaille" role="img" aria-label={MEDAILLES[medaille].nom}>
          {' '}
          {MEDAILLES[medaille].symbole}
        </span>
      )}
      {!fin && evolution !== null && evolution !== 0 && (
        <span className={evolution > 0 ? 'telephone__monte' : 'telephone__descend'}>
          {' '}
          <span aria-hidden="true">{`${evolution > 0 ? '▲' : '▼'} ${Math.abs(evolution)}`}</span>
          <span className="visuellement-cache">{enPlaces(evolution)}</span>
        </span>
      )}
    </p>
  )
}

/** Le classement intermédiaire (après les Duels 1 à 9) : score, place, et une petite phrase selon la place. */
export function ClassementIntermediaire({
  vue,
  index,
  phrase,
  refTitre,
}: {
  vue: VueParticipant
  index: number
  phrase: string | null
  refTitre: Ref<HTMLHeadingElement>
}) {
  const { place } = vue.moi
  return (
    <section className="telephone__resultats telephone__resultats--classement" aria-labelledby="telephone-classement-titre">
      <h2 id="telephone-classement-titre" ref={refTitre} tabIndex={-1}>
        Classement après le Duel {index + 1}
      </h2>
      <Score vue={vue} />
      {place && <Place place={place} participants={vue.participants} fin={false} />}
      {phrase && <p className="fin__message">{phrase}</p>}
      <p className="telephone__regarde">
        <span aria-hidden="true">👀 </span>
        {`Regarde l’écran : le Duel ${index + 2} arrive.`}
      </p>
    </section>
  )
}

/**
 * La fin de la Séance : score, place et médaille, l'invitation au Duel du jour, le Conseil de la Séance (le même que
 * sur l'écran projeté, ici avec son lien) et le Récapitulatif, dont chaque case ouvre le détail de son Duel.
 * Le lien du Conseil est compté (`conseil/lien`), comme en fin de Partie.
 */
export function FinDeSeance({
  vue,
  duels,
  refTitre,
  mesurer,
}: {
  vue: VueParticipant
  duels: DuelDePartie[]
  refTitre: Ref<HTMLHeadingElement>
  mesurer: (evenement: Evenement) => void
}) {
  const { place, score, choix } = vue.moi
  const conseil = CONSEILS.find((c) => c.id === vue.conseil)
  const lignes = lignesDuRecapitulatif(duels, choix)

  let message: string
  if (place?.medaille) message = 'Bravo, tu montes sur le podium !'
  else if (place) message = 'Merci d’avoir joué ! Le podium s’affiche sur l’écran.'
  else message = messageDeScore(score.bonnes, Math.max(1, score.joues))

  return (
    <section className="telephone__resultats" aria-labelledby="telephone-fin-titre">
      <h2 id="telephone-fin-titre" ref={refTitre} tabIndex={-1}>
        Séance terminée !
      </h2>
      <Score vue={vue} />
      {place && <Place place={place} participants={vue.participants} fin />}
      <p className="fin__message">{message}</p>

      {/* ?ref=seance : la mesure d'audience range ces arrivées sous la provenance « seance » (PRD, section 7). */}
      <a className="bouton fin__gros telephone__bouton-large" href={`${import.meta.env.BASE_URL}?ref=seance`}>
        Jouer le Duel du jour
      </a>
      <p className="telephone__discret">Un nouveau Duel chaque jour, sur duelcarbone.fr</p>

      {conseil && <Conseil conseil={conseilAffiche(conseil, VALEURS)} onLien={() => mesurer('conseil/lien')} />}

      <div className="telephone__recap">
        <Recapitulatif
          lignes={lignes}
          complement={(ligne) => {
            // Sans réponse, la case le dit en toutes lettres, à la place de la part de la salle (retour du 28/11).
            // Caché aux lecteurs d'écran : le nom de la case dit déjà « sans réponse ».
            if (ligne.idChoisi === null) {
              return (
                <span className="telephone__salle-recap" aria-hidden="true">
                  Pas de réponse
                </span>
              )
            }
            const salle = vue.salle[ligne.numero - 1]
            if (!salle) return null
            const part = salle.parGeste[ligne.idChoisi]?.pourcentage ?? 0
            return (
              <span className="telephone__salle-recap">
                <span className="visuellement-cache">, </span>
                {pourcent(part)} de la salle comme toi
              </span>
            )
          }}
        />
      </div>
    </section>
  )
}
