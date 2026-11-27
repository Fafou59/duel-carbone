import { useEffect, useRef, type Ref } from 'react'
import { CarteGeste, type EtatCarte } from '../../composants/CarteGeste.tsx'
import { lancerEclat } from '../../composants/eclat.ts'
import { ExplicationDuel } from '../../composants/ExplicationDuel.tsx'
import { difficulteAttendue } from '../../domaine/difficulte.ts'
import { estBonChoix, plusEmetteur, rapport } from '../../domaine/duel.ts'
import { formaterRapport } from '../../domaine/format.ts'
import type { GesteCalcule } from '../../domaine/geste.ts'
import { estThematique, type DuelDePartie } from '../../domaine/partie.ts'
import { pourcent } from '../../domaine/rang-du-jour.ts'
import type { PartDeLaSalle } from '../../domaine/seance.ts'
import { mouvementReduit } from '../../navigateur/mouvement.ts'
import { DELAI_DEFILEMENT_MS } from '../EcranDuel.tsx'
import '../../composants/CommeToi.css'

type Props = {
  duels: DuelDePartie[]
  /** La position du Duel (0 à 9). */
  index: number
  /** La réponse est-elle révélée (l'Animateur a appuyé sur « Révéler ») ? */
  revele: boolean
  /** Le Geste choisi (confirmé par le serveur, ou en cours d'envoi), ou null. */
  choix: string | null
  /** La réponse est partie et le serveur l'a reçue (sinon : en cours d'envoi). */
  confirme: boolean
  /** Le Participant est arrivé après ce Duel : il ne pouvait pas y répondre. */
  arriveApres: boolean
  /** Son score (bonnes réponses sur les Duels révélés). */
  score: number
  /** Combien ont répondu, et combien sont dans la Séance (« 6/24 ont répondu »). */
  repondus: number
  participants: number
  /** Ce qu'a répondu la salle, une fois le Duel révélé. */
  salle: PartDeLaSalle | null
  /** Un message quand l'envoi a échoué (pas de connexion). */
  erreur: string | null
  onChoisir: (idGeste: string) => void
  /** Reçoit le titre, pour y placer le focus à chaque nouvelle étape. */
  refTitre: Ref<HTMLParagraphElement>
}

/**
 * Le Duel sur le téléphone d'un Participant : l'écran de jeu d'une Partie, avec ce que change le rythme de
 * l'Animateur (PRD, section 6). Après le choix, la carte reste marquée « Ton choix », l'autre s'estompe, et un
 * bandeau remplace « Duel suivant » : c'est l'Animateur qui révèle. À la révélation, les cartes, le verdict et les
 * animations d'une bonne réponse, comme dans une Partie, avec la part de la salle qui a répondu comme soi.
 */
export function DuelDeSeance({
  duels,
  index,
  revele,
  choix,
  confirme,
  arriveApres,
  score,
  repondus,
  participants,
  salle,
  erreur,
  onChoisir,
  refTitre,
}: Props) {
  const duel = duels[index]
  const thematique = estThematique(duel)
  const difficulte = difficulteAttendue(index)
  const envoye = !revele && choix !== null
  const bonChoix = revele && choix !== null && estBonChoix(duel, choix)
  const cartes = useRef<HTMLDivElement>(null)
  const explication = useRef<HTMLDivElement>(null)

  // Bon choix : l'éclat de confettis part de la carte gagnante, comme dans une Partie (rien si les animations sont
  // réduites).
  useEffect(() => {
    if (!bonChoix) return
    const gagnante = cartes.current?.querySelector('.carte--plus-emetteur')
    if (!gagnante) return
    return lancerEclat(gagnante.getBoundingClientRect())
  }, [bonChoix])

  // À la révélation : le temps de voir les chiffres sur les cartes, puis on descend vers l'explication.
  useEffect(() => {
    if (!revele) return
    const minuteur = window.setTimeout(() => {
      explication.current?.focus({ preventScroll: true })
      explication.current?.scrollIntoView({ behavior: mouvementReduit() ? 'auto' : 'smooth', block: 'start' })
    }, DELAI_DEFILEMENT_MS)
    return () => window.clearTimeout(minuteur)
  }, [revele, index])

  // Raccourcis clavier, comme dans une Partie : 1 choisit la première carte, 2 la seconde, tant que rien n'est choisi.
  useEffect(() => {
    if (revele || choix !== null) return
    const surTouche = (evenement: KeyboardEvent) => {
      if (evenement.altKey || evenement.ctrlKey || evenement.metaKey) return
      if (evenement.target instanceof Element && evenement.target.closest('input, textarea, dialog')) return
      if (evenement.key === '1') onChoisir(duel.a.id)
      if (evenement.key === '2') onChoisir(duel.b.id)
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [revele, choix, duel, onChoisir])

  const etatDe = (geste: GesteCalcule): EtatCarte => {
    if (!revele) return 'question'
    if (geste.id === plusEmetteur(duel).id) return 'plus-emetteur'
    return geste.id === choix ? 'mauvais-choix' : 'autre'
  }

  const carte = (geste: GesteCalcule, raccourci: string) => (
    <CarteGeste
      geste={geste}
      etat={etatDe(geste)}
      choisie={geste.id === choix}
      raccourci={revele || envoye ? undefined : raccourci}
      envoyee={envoye}
      onChoisir={() => onChoisir(geste.id)}
    />
  )

  // « 54 % de la salle comme toi » : la part de ceux qui ont répondu comme le Participant.
  const commeMoi = salle && choix !== null ? (salle.parGeste[choix]?.pourcentage ?? 0) : null

  let verdict = null
  if (revele) {
    if (choix !== null) {
      verdict = (
        <p className={`duel__verdict duel__verdict--${bonChoix ? 'bon' : 'mauvais'}`}>
          <span className="duel__verdict-texte">{bonChoix ? '✓ Bonne réponse !' : '✗ Raté !'}</span>
          {commeMoi !== null && (
            <span className="comme-toi">
              <span className="comme-toi__barre" aria-hidden="true">
                <span className={`comme-toi__part comme-toi__part--${bonChoix ? 'bon' : 'mauvais'}`} style={{ width: `${commeMoi}%` }} />
              </span>
              <span className="visuellement-cache">, </span>
              {pourcent(commeMoi)} de la salle comme toi
            </span>
          )}
        </p>
      )
    } else {
      verdict = (
        <p className="duel__verdict telephone__sans-reponse">
          {arriveApres ? 'Tu joues dès le prochain Duel !' : '⏱ Pas de réponse à temps : ce Duel ne compte pas pour toi.'}
        </p>
      )
    }
  }

  return (
    <div className="partie">
      <div className="partie__entete">
        <p ref={refTitre} className="partie__position" tabIndex={-1}>
          Duel {index + 1}/{duels.length}
        </p>
        <span className={`difficulte difficulte--${thematique ? 'thematique' : difficulte}`}>
          {thematique ? (
            <>
              <span aria-hidden="true">★ </span>thématique
            </>
          ) : (
            difficulte
          )}
        </span>
        <p className="partie__score">Score : {score}</p>
      </div>
      <ol className="progression" aria-hidden="true">
        {duels.map((d, i) => {
          const classes = ['progression__segment', `difficulte--${difficulteAttendue(i)}`]
          if (i > index) classes.push('progression__segment--a-venir')
          if (i === index) classes.push('progression__segment--courant')
          if (i <= index && estThematique(d)) classes.push('progression__segment--thematique')
          return <li key={i} className={classes.join(' ')} />
        })}
      </ol>

      {/* Le Duel thématique s'annonce en haut de l'écran, sans fenêtre à fermer : l'écran projeté l'annonce aussi. */}
      {thematique && !revele && duel.thematique && (
        <p className="telephone__annonce">
          <strong>
            <span aria-hidden="true">★ </span>Duel thématique : {duel.thematique.titre}
          </strong>{' '}
          {duel.thematique.accroche}
        </p>
      )}

      <section className="duel" aria-labelledby={`duel-question-${index}`}>
        <h2 id={`duel-question-${index}`} className="duel__question">
          Lequel émet le plus ?
        </h2>
        <div ref={cartes} className="duel__cartes">
          {carte(duel.a, '1')}
          {revele ? (
            <div className="duel__rapport">
              <b>{formaterRapport(rapport(duel))}</b>
              <small>fois plus</small>
            </div>
          ) : (
            <div className="duel__vs" aria-hidden="true">
              VS
            </div>
          )}
          {carte(duel.b, '2')}
        </div>

        <div ref={explication} className="duel__resultat" tabIndex={-1}>
          {/* aria-live : un lecteur d'écran annonce le verdict dès que l'Animateur révèle. */}
          <div aria-live="polite">{verdict}</div>
          {revele && (
            <section className="duel__explication" aria-label="Explication">
              <ExplicationDuel duel={duel} />
            </section>
          )}
        </div>
      </section>

      {/* Le bandeau, à la place de « Duel suivant » : la réponse est partie, la suite se passe sur l'écran. */}
      {!revele && (envoye || erreur) && (
        <div className="telephone__bandeau" role="status">
          {erreur ? (
            <p className="telephone__bandeau-erreur">{erreur}</p>
          ) : confirme ? (
            <>
              <p>
                <span aria-hidden="true">✓ </span>Réponse envoyée · <strong>{repondus}</strong>/{participants} ont répondu
              </p>
              <p className="telephone__bandeau-discret">
                <span aria-hidden="true">👀 </span>Regarde l’écran : la réponse va être révélée.
              </p>
            </>
          ) : (
            <p>Envoi de ta réponse…</p>
          )}
        </div>
      )}
    </div>
  )
}
