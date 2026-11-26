/**
 * PROTOTYPE (jetable), deuxième tour : l'écran projeté de l'Animateur.
 * - Attente : la page d'accueil de la Séance (variante A du premier tour), habillée : logo, frise d'icônes.
 * - Duel : le plateau de la variante B, Gestes l'un sous l'autre sur toute la largeur, « VS » puis « ×N fois plus »
 *   entre les deux comme sur téléphone ; à droite, le QR code, la jauge et les pseudos de ceux qui ont répondu.
 * - Révélation : sous chaque Geste, une petite jauge des réponses de la salle ; à droite, les Empreintes et,
 *   à cheval sur les deux Gestes, « ×N fois plus » ; l'explication du Duel thématique ; le détail par un bouton.
 * - Classement intermédiaire : la part de bonnes réponses Duel par Duel, le top 10 dans la colonne (variante B).
 * - Classement final : la diapositive de la variante A, avec des médailles, les Duels les plus ratés et un Conseil
 *   lié au Duel le plus raté. Pas de classement après le Duel 10.
 */
import { useRef } from 'react'
import { Conseil } from '../../composants/Conseil.tsx'
import { Frise } from '../../composants/Vitrine.tsx'
import { CONSEILS } from '../../donnees/conseils.ts'
import { INSTANTANE } from '../../donnees/index.ts'
import { conseilAffiche, valeursDe } from '../../domaine/conseils.ts'
import { TableauRepartition } from '../../composants/TableauRepartition.tsx'
import { plusEmetteur, rapport } from '../../domaine/duel.ts'
import { formaterRapport } from '../../domaine/format.ts'
import type { PropsEcran } from './PrototypeAnimateur.tsx'
import { LigneGeste, Logo, Rejoindre } from './commun.tsx'
import { choixDu, classementApres, ordreDesReponses, partDeBonnes, type LigneClassement } from './seance-factice.ts'
import '../EcranPartie.css'

const MEDAILLES = { or: '🥇', argent: '🥈', bronze: '🥉' }

function Medaille({ ligne }: { ligne: LigneClassement }) {
  if (!ligne.medaille) return null
  return (
    <span className="pa-medaille" role="img" aria-label={`médaille d’${ligne.medaille}`}>
      {MEDAILLES[ligne.medaille]}
    </span>
  )
}

export function EcranAnimateur({ seance, etape, repondus, action }: PropsEcran) {
  const total = seance.participants.length
  const fenetre = useRef<HTMLDialogElement>(null)
  const bouton = action && (
    <button type="button" className="pa-bouton" onClick={action.faire}>
      {action.libelle} <kbd>Espace</kbd>
    </button>
  )

  // Attente des Participants.
  if (etape.phase === 'attente')
    return (
      <main className="pa-attente">
        <Logo />
        <div className="pa-attente__centre">
          <h1>Rejoins la Séance avec ton téléphone</h1>
          <Rejoindre code={seance.code} />
          <p className="pa-attente__compte">
            <strong>{total}</strong> Participants
          </p>
          <ul className="pa-pseudos">
            {seance.participants.map((p) => (
              <li key={p.pseudo}>{p.pseudo}</li>
            ))}
          </ul>
        </div>
        <div className="pa-attente__frise">
          <Frise />
        </div>
        {bouton}
      </main>
    )

  // Classement final.
  if (etape.phase === 'fin') {
    const lignes = classementApres(seance, 10).slice(0, 10)
    const classes = seance.duels
      .map((d, n) => ({ d, n, bonnes: partDeBonnes(seance, n) }))
      .sort((x, y) => x.bonnes - y.bonnes)
    const rates = classes.slice(0, 3)
    // Le Conseil : le premier dont un Geste déclencheur est dans le Duel le plus raté, sinon le suivant, etc.
    const lie = classes
      .map(({ d }) => CONSEILS.find((c) => c.declencheurs.some((id) => id === d.a.id || id === d.b.id)))
      .find(Boolean)
    const conseil = lie ? conseilAffiche(lie, valeursDe(INSTANTANE)) : null
    const enPhrase = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
    return (
      <main className="pa-final">
        <Logo />
        <h1>Classement final</h1>
        <ol className="pa-final__classement">
          {lignes.map((l) => (
            <li key={l.pseudo} className={l.medaille ? `pa-final--${l.medaille}` : ''}>
              <span className="pa-rang">{l.rang}</span>
              <span className="pa-final__nom">
                {l.pseudo} <Medaille ligne={l} />
              </span>
              <span className="pa-score">{l.score}/10</span>
            </li>
          ))}
        </ol>
        <div className="pa-final__bas">
          <section className="pa-final__rates">
            <h2>Les Duels qui ont le plus trompé la salle</h2>
            <ul>
              {rates.map(({ d, n, bonnes }) => (
                <li key={n}>
                  <strong>{100 - bonnes} %</strong> de réponses fausses : {d.a.titre} ou {enPhrase(d.b.titre)} ?
                </li>
              ))}
            </ul>
          </section>
          {conseil && <Conseil conseil={conseil} onLien={() => {}} />}
        </div>
        {/* L'invitation à revenir : les téléphones l'affichent aussi, avec le lien ?ref=seance. */}
        <div className="pa-final__pied">
          <p className="pa-final__invitation">
            <span aria-hidden="true">📱 </span>Et demain ? <strong>Le Duel du jour</strong> t’attend sur ton téléphone,
            un nouveau chaque jour sur <strong>duelcarbone.fr</strong>
          </p>
          {bouton}
        </div>
      </main>
    )
  }

  const duel = seance.duels[etape.n]
  const thematique = Boolean(duel.thematique)
  const etiquette = thematique ? 'thematique' : duel.difficulte
  const revele = etape.phase === 'revelation'
  const dernierDuelRevele = revele && etape.n === 9

  // La barre de suivi, comme dans une Partie : un segment par Duel, coloré selon sa Difficulté.
  const suivi = (
    <div className="pa-suivi">
      <div className="partie__entete">
        <p className="partie__position">Duel {etape.n + 1}/10</p>
        <span className={`difficulte difficulte--${etiquette}`}>
          {thematique ? (
            <>
              <span aria-hidden="true">★ </span>thématique
            </>
          ) : (
            duel.difficulte
          )}
        </span>
      </div>
      <ol className="progression" aria-hidden="true">
        {seance.duels.map((d, i) => {
          const classes = ['progression__segment', `difficulte--${d.difficulte}`]
          if (i > etape.n) classes.push('progression__segment--a-venir')
          if (i === etape.n) classes.push('progression__segment--courant')
          if (i <= etape.n && d.thematique) classes.push('progression__segment--thematique')
          return <li key={i} className={classes.join(' ')} />
        })}
      </ol>
    </div>
  )

  // La colonne de droite.
  let colonne = null
  if (etape.phase === 'classement') {
    const top = classementApres(seance, etape.n + 1).slice(0, 10)
    const avant = classementApres(seance, etape.n)
    const mouvement = (l: LigneClassement) => {
      const ancien = avant.find((a) => a.pseudo === l.pseudo)?.rang ?? l.rang
      return ancien > l.rang ? <span className="pa-monte">▲</span> : ancien < l.rang ? <span className="pa-descend">▼</span> : null
    }
    colonne = (
      <aside className="pa-colonne pa-colonne--classement">
        <h2>Top 10 après {etape.n + 1} Duel{etape.n > 0 ? 's' : ''}</h2>
        <ol className="pa-top">
          {top.map((l) => (
            <li key={l.pseudo}>
              <span className="pa-rang">{l.rang}</span>
              <span className="pa-top__nom">{l.pseudo}</span>
              <span className="pa-top__mouvement">{mouvement(l)}</span>
              <span className="pa-score">{l.score}</span>
            </li>
          ))}
        </ol>
      </aside>
    )
  } else if (dernierDuelRevele) {
    // Révélation du Duel 10 : la colonne reste (la mise en page ne bouge pas), mais garde la surprise du classement.
    colonne = (
      <aside className="pa-colonne pa-colonne--teaser">
        <p className="pa-teaser__tambour" aria-hidden="true">
          🥁
        </p>
        <p className="pa-teaser__texte">Qui monte sur le podium ?</p>
        <p className="pa-teaser__sous-texte">Les 10 Duels sont joués : place au classement final.</p>
      </aside>
    )
  } else {
    // Pendant le Duel et sa révélation : rejoindre, la jauge, et les pseudos dans l'ordre où ils ont répondu.
    const arrives = ordreDesReponses(seance, etape.n).slice(0, repondus)
    colonne = (
      <aside className="pa-colonne">
        <Rejoindre code={seance.code} compact />
        <div className="pa-jauge">
          <span>
            <strong>{repondus}</strong> / {total} ont répondu
          </span>
          <div>
            <i style={{ width: `${(repondus / total) * 100}%` }} />
          </div>
        </div>
        <ul className="pa-repondus" aria-label="Ont répondu">
          {arrives.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </aside>
    )
  }

  let plateau
  if (etape.phase === 'classement') {
    plateau = (
      <>
        <h2 className="pa-titre">Les bonnes réponses de la salle, Duel par Duel</h2>
        <ol className="pa-frise">
          {seance.duels.map((d, n) => {
            const joue = n <= etape.n
            const bonnes = partDeBonnes(seance, n)
            return (
              <li key={n} className={joue ? '' : 'pa-frise--avenir'}>
                <span className="pa-frise__pile">
                  {joue && (
                    <i className="pa-frise__bonnes" style={{ height: `${bonnes}%` }}>
                      {bonnes} %
                    </i>
                  )}
                </span>
                <span className={`pa-frise__num difficulte--${d.thematique ? 'thematique' : d.difficulte}`}>{n + 1}</span>
              </li>
            )
          })}
        </ol>
              </>
    )
  } else {
    const plus = plusEmetteur(duel)
    const ligne = (g: typeof duel.a) => {
      const nombre = choixDu(seance, etape.n, g.id).length
      const part = Math.round((nombre / total) * 100)
      return (
        <div className={`pa-ligne${revele ? (g === plus ? ' pa-ligne--gagnant' : ' pa-ligne--perdant') : ''}`}>
          <LigneGeste geste={g} montrerEmpreinte={revele}>
            {revele && (
              <span className="pa-reponses" aria-label={`Réponses de la salle : ${part} %, ${nombre} réponses`}>
                <span className="pa-reponses__barre">
                  <i style={{ width: `${Math.max(part, 2)}%` }} />
                </span>
                <span className="pa-reponses__chiffres">
                  <strong>{part} %</strong> de la salle ({nombre})
                </span>
              </span>
            )}
          </LigneGeste>
        </div>
      )
    }
    plateau = (
      <>
        {thematique && !revele && (
          <p className="pa-annonce">
            <strong>★ {duel.thematique!.titre}</strong> {duel.thematique!.accroche}
          </p>
        )}
        <h2 className="pa-titre">Lequel émet le plus ?</h2>
        <div className="pa-lignes">
          {ligne(duel.a)}
          {revele ? (
            <div className="pa-entre">
              <span className="pa-rapport">
                <b>{formaterRapport(rapport(duel))}</b>
                <small>fois plus</small>
              </span>
            </div>
          ) : (
            <div className="pa-entre" aria-hidden="true">
              <span className="pa-vs">VS</span>
            </div>
          )}
          {ligne(duel.b)}
        </div>
        {revele && thematique && (
          <div className="pa-explication">
            <p className="pa-explication__titre">★ {duel.thematique!.titre}</p>
            <p>{duel.thematique!.texte}</p>
          </div>
        )}
        {revele && (
          <>
            <button type="button" className="pa-bouton-secondaire" onClick={() => fenetre.current?.showModal()}>
              Voir le détail des émissions
            </button>
            <dialog ref={fenetre} className="pa-fenetre" onClick={(e) => e.target === fenetre.current && fenetre.current?.close()}>
              <h2>Le détail des émissions</h2>
              <TableauRepartition duel={duel} />
              <button type="button" className="pa-bouton-secondaire" onClick={() => fenetre.current?.close()}>
                Fermer
              </button>
            </dialog>
          </>
        )}
      </>
    )
  }

  return (
    <div className={`pa-scene${colonne ? '' : ' pa-scene--sans-colonne'}`}>
      <main className="pa-plateau">
        {suivi}
        {plateau}
        {bouton}
      </main>
      {colonne}
    </div>
  )
}
