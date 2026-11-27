/**
 * L'écran projeté de l'Animateur pendant une Séance (PRD docs/prd-mode-animation.md, section 6), validé par prototype.
 *
 * L'écran ne décide de rien : il affiche la vue que lui envoie le serveur (VueAnimateur, src/domaine/seance-messages.ts)
 * et lui transmet les commandes de l'Animateur (avancer, retirer un pseudo). Son seul choix à lui : le Conseil de fin,
 * tiré avec la mémoire de cet ordinateur (ADR 0007). Toutes les commandes marchent au clavier : Espace pour le bouton
 * principal, Tab pour le reste.
 */
import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from 'react'
import { Conseil } from '../../composants/Conseil.tsx'
import { Icone } from '../../composants/Icone.tsx'
import { TableauRepartition } from '../../composants/TableauRepartition.tsx'
import { Frise } from '../../composants/Vitrine.tsx'
import { duelsDepuisCodes } from '../../domaine/calendrier.ts'
import { choisirConseilDeSeance, conseilAffiche, valeursDe } from '../../domaine/conseils.ts'
import { difficulteAttendue } from '../../domaine/difficulte.ts'
import { moinsEmetteur, plusEmetteur, rapport } from '../../domaine/duel.ts'
import { formaterEmpreinte, formaterMultiple, formaterRapport, queDevant } from '../../domaine/format.ts'
import type { GesteCalcule } from '../../domaine/geste.ts'
import type { DuelDePartie } from '../../domaine/partie.ts'
import { enPourcent, pourcent } from '../../domaine/rang-du-jour.ts'
import { duelsRatesDeLaSalle, type Etape, type LigneDeClassement, type PartDeLaSalle } from '../../domaine/seance.ts'
import type { MessageDuServeur, VueAnimateur } from '../../domaine/seance-messages.ts'
import { CONSEILS } from '../../donnees/conseils.ts'
import { DUELS_THEMATIQUES } from '../../donnees/duels-thematiques.ts'
import { GESTES_CALCULES, INSTANTANE } from '../../donnees/index.ts'
import { ADRESSES, adresseDeRejoindre } from '../../navigateur/adresse.ts'
import type { Memoire } from '../../navigateur/memoire.ts'
import type { ConnexionDeSeance, EtatDeConnexion, ServeurDesSeances } from '../../navigateur/seance.ts'
import { QrCode } from './QrCode.tsx'
import '../EcranPartie.css'

const VALEURS = valeursDe(INSTANTANE)
const MEDAILLES = { or: '🥇', argent: '🥈', bronze: '🥉' } as const

type Props = {
  code: string
  jeton: string
  serveur: ServeurDesSeances
  /** La mémoire du jeu de cet ordinateur : ses Conseils récents (le Conseil de fin n'en reprend aucun). */
  memoire: Memoire
  /** « Rejouer une nouvelle Séance » (à la fin, ou une Séance fermée). */
  onNouvelle: () => void
  /** Abandonner cette Séance (avant le premier Duel) pour revenir à la page d'explication. */
  onAbandon: () => void
  /** La Séance n'existe plus (effacée) ou refuse le jeton : retour à la page d'explication. */
  onPerdue: () => void
}

/** Le texte du bouton principal à chaque étape. */
function libelleDuBouton(vue: VueAnimateur): string {
  if (vue.fermee) return 'Nouvelle Séance'
  const { etape } = vue
  switch (etape.phase) {
    case 'attente':
      return 'Lancer le premier Duel'
    case 'duel':
      return 'Révéler la réponse'
    case 'revelation':
      if (etape.index === vue.duels.length - 1) return vue.avecClassement ? 'Voir le classement final' : 'Voir les résultats'
      return vue.avecClassement ? 'Voir le classement' : `Duel ${etape.index + 2}`
    case 'classement':
      return `Duel ${etape.index + 2}`
    case 'fin':
      return 'Rejouer une nouvelle Séance'
  }
}

/** Le Conseil de fin : lié au Duel le plus raté par la salle, puis au suivant, jamais l'un des derniers montrés ici. */
function choisirLeConseil(duels: DuelDePartie[], salle: PartDeLaSalle[], recents: string[]): string {
  const rates = duelsRatesDeLaSalle(salle, duels.length).map((r) => r.duel)
  const ordre = [...rates, ...duels.map((_, i) => i).filter((i) => !rates.includes(i))]
  return choisirConseilDeSeance({
    conseils: CONSEILS,
    gestesDesDuels: ordre.map((i) => [duels[i].a.id, duels[i].b.id]),
    recents,
    hasard: Math.random,
  }).id
}

export function EcranSeance({ code, jeton, serveur, memoire, onNouvelle, onAbandon, onPerdue }: Props) {
  const [vue, setVue] = useState<VueAnimateur | null>(null)
  const [connexion, setConnexion] = useState<EtatDeConnexion>('connexion')
  const envoyer = useRef<ConnexionDeSeance['envoyer']>(() => false)
  // Les messages du serveur (useEffectEvent : la connexion, ouverte une fois, lit toujours les derniers rappels).
  const surMessage = useEffectEvent((message: MessageDuServeur) => {
    if (message.type === 'etat' && message.vue.role === 'animateur') setVue(message.vue)
    if (message.type === 'refus' && (message.raison === 'jeton' || message.raison === 'inconnue')) onPerdue()
  })

  // La connexion à la Séance, ouverte tant que l'écran est affiché ; elle se rétablit d'elle-même si elle se coupe.
  useEffect(() => {
    const ouverte = serveur.connecter({
      code,
      bonjour: { type: 'bonjour', role: 'animateur', jeton },
      surMessage: (message) => surMessage(message),
      surEtat: setConnexion,
    })
    envoyer.current = ouverte.envoyer
    return () => ouverte.fermer()
  }, [code, jeton, serveur])

  // Les 10 Duels, rebâtis à partir de leurs codes avec le catalogue du jeu.
  const codes = vue?.duels.join(',') ?? ''
  const duels = useMemo(() => {
    if (!codes) return null
    try {
      return duelsDepuisCodes(codes.split(','), GESTES_CALCULES, DUELS_THEMATIQUES)
    } catch {
      return null // un Geste retiré du catalogue depuis la création (nouvelle version du jeu)
    }
  }, [codes])

  // Le Conseil de fin, une fois montré, compte parmi les Conseils récents de cet ordinateur.
  const conseilMontre = vue?.etape.phase === 'fin' ? vue.conseil : null
  useEffect(() => {
    if (conseilMontre) memoire.noterConseil(conseilMontre)
  }, [conseilMontre, memoire])

  const pret = vue !== null && duels !== null && connexion === 'connecte'

  const actionPrincipale = () => {
    if (!vue || !duels) return
    if (vue.fermee || vue.etape.phase === 'fin') return onNouvelle()
    if (connexion !== 'connecte') return
    const versLaFin = vue.etape.phase === 'revelation' && vue.etape.index === duels.length - 1
    const conseil = versLaFin ? choisirLeConseil(duels, vue.salle, memoire.conseilsRecents()) : null
    envoyer.current({ type: 'avancer', depuis: vue.etape, conseil })
  }
  const retirer = (numero: number) => envoyer.current({ type: 'retirer', numero })

  // Espace : le bouton principal, sauf dans la fenêtre du détail des émissions ou sur un autre bouton.
  const surEspace = useEffectEvent(() => actionPrincipale())
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat || e.target !== document.body) return
      e.preventDefault()
      surEspace()
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [])

  const etatDeLaConnexion =
    connexion === 'reconnexion' ? (
      <p className="an-connexion" role="status">
        Connexion perdue : on la rétablit…
      </p>
    ) : null

  if (!vue || !duels) {
    return (
      <div className="an">
        <main className="an-message">
          {connexion === 'arretee' ? (
            <>
              <p>La connexion à la Séance {code} s’est arrêtée.</p>
              <p>
                <button type="button" className="an-bouton-secondaire" onClick={onPerdue}>
                  Revenir à l’accueil du Mode animation
                </button>
              </p>
            </>
          ) : vue && !duels ? (
            <p>Cette Séance a été créée avec une ancienne version du jeu et ne peut plus s’afficher.</p>
          ) : (
            <p role="status">Connexion à la Séance {code}…</p>
          )}
        </main>
      </div>
    )
  }

  const bouton = (
    <button
      type="button"
      className="an-bouton"
      onClick={actionPrincipale}
      disabled={!pret && !vue.fermee && vue.etape.phase !== 'fin'}
    >
      {libelleDuBouton(vue)} <kbd>Espace</kbd>
    </button>
  )
  const pseudoDe = (numero: number) => vue.participants.find((p) => p.numero === numero)?.pseudo ?? null
  const commun = { vue, duels, code, bouton, retirer, pseudoDe }

  return (
    <div className="an">
      {etatDeLaConnexion}
      {vue.fermee && (
        <p className="an-connexion" role="status">
          Cette Séance est fermée (3 heures après sa création).
        </p>
      )}
      {vue.etape.phase === 'attente' ? (
        <Attente {...commun} onAbandon={onAbandon} />
      ) : vue.etape.phase === 'fin' ? (
        <Final {...commun} />
      ) : (
        <Plateau {...commun} etape={vue.etape} />
      )}
    </div>
  )
}

type PropsCommunes = {
  vue: VueAnimateur
  duels: DuelDePartie[]
  code: string
  bouton: ReactNode
  retirer: (numero: number) => void
  pseudoDe: (numero: number) => string | null
}

// --- Les morceaux ---

function Logo({ lien = false }: { lien?: boolean }) {
  const contenu = (
    <>
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="40" height="40" />
      Duel Carbone
    </>
  )
  return <p className="an-logo">{lien ? <a href={ADRESSES.jeu}>{contenu}</a> : contenu}</p>
}

/** Le QR code, l'adresse et le code : de quoi rejoindre la Séance. */
function Rejoindre({ code, compact = false }: { code: string; compact?: boolean }) {
  return (
    <div className={`an-rejoindre${compact ? ' an-rejoindre--compact' : ''}`}>
      <QrCode texte={adresseDeRejoindre(window.location.origin, code)} taille={compact ? 96 : 220} />
      <div>
        <p className="an-rejoindre__adresse">{window.location.host}</p>
        <p className="an-rejoindre__code" aria-label={`Code ${code.split('').join(' ')}`}>
          {code}
        </p>
      </div>
    </div>
  )
}

/** Un pseudo, avec sa petite croix pour le retirer. */
function Pseudo({ numero, pseudo, retirer }: { numero: number; pseudo: string; retirer: (numero: number) => void }) {
  return (
    <li>
      {pseudo}
      <button type="button" className="an-retirer" onClick={() => retirer(numero)} aria-label={`Retirer ${pseudo}`}>
        ×
      </button>
    </li>
  )
}

function Medaille({ ligne }: { ligne: LigneDeClassement }) {
  if (!ligne.medaille) return null
  return (
    <span className="an-medaille" role="img" aria-label={`médaille d’${ligne.medaille}`}>
      {MEDAILLES[ligne.medaille]}
    </span>
  )
}

/** Un Geste sur une ligne : icône, titre et sous-titre bien lisibles, Empreinte à droite une fois révélée. */
function LigneGeste({ geste, revele, children }: { geste: GesteCalcule; revele: boolean; children?: ReactNode }) {
  return (
    <div className="an-geste">
      <span className="an-geste__icone">
        <Icone id={geste.id} />
      </span>
      <span className="an-geste__textes">
        <span className="an-geste__titre">{geste.titre}</span>
        <span className="an-geste__sous-titre">{geste.sousTitre}</span>
        {children}
      </span>
      {revele && <span className="an-geste__empreinte">{formaterEmpreinte(geste.empreinte)}</span>}
    </div>
  )
}

/** La part de bonnes réponses de la salle à un Duel, en pour cent ; null si personne n'a répondu. */
const partDeBonnes = (salle: PartDeLaSalle | undefined): number | null =>
  salle && salle.reponses > 0 ? enPourcent(salle.bonnes / salle.reponses) : null

// --- Attente des Participants ---

function Attente({ vue, code, bouton, retirer, onAbandon }: PropsCommunes & { onAbandon: () => void }) {
  const nombre = vue.participants.length
  return (
    <main className="an-attente">
      <Logo lien />
      <div className="an-attente__centre">
        <h1>Rejoins la Séance avec ton téléphone</h1>
        <Rejoindre code={code} />
        <p className="an-attente__compte" aria-live="polite">
          <strong>{nombre}</strong> Participant{nombre > 1 ? 's' : ''}
        </p>
        {vue.avecClassement && (
          <ul className="an-pseudos" aria-label="Participants">
            {vue.participants.map((p) => p.pseudo && <Pseudo key={p.numero} numero={p.numero} pseudo={p.pseudo} retirer={retirer} />)}
          </ul>
        )}
      </div>
      <div className="an-attente__frise">
        <Frise />
      </div>
      <button type="button" className="lien-bouton an-attente__abandon" onClick={onAbandon}>
        Abandonner cette Séance
      </button>
      {bouton}
    </main>
  )
}

// --- Duel, révélation, classement intermédiaire ---

function Plateau({ vue, duels, code, bouton, retirer, pseudoDe, etape }: PropsCommunes & { etape: Etape & { index: number } }) {
  const fenetre = useRef<HTMLDialogElement>(null)
  const n = etape.index
  const duel = duels[n]
  const thematique = duel.thematique
  const difficulte = difficulteAttendue(n)
  const revele = etape.phase === 'revelation'
  const dernier = n === duels.length - 1
  const total = vue.participants.length

  // La barre de suivi, comme dans une Partie : un segment par Duel, coloré selon sa Difficulté.
  const suivi = (
    <div className="an-suivi">
      <div className="partie__entete">
        <p className="partie__position">
          Duel {n + 1}/{duels.length}
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
      </div>
      <ol className="progression" aria-hidden="true">
        {duels.map((d, i) => {
          const classes = ['progression__segment', `difficulte--${difficulteAttendue(i)}`]
          if (i > n) classes.push('progression__segment--a-venir')
          if (i === n) classes.push('progression__segment--courant')
          if (i <= n && d.thematique) classes.push('progression__segment--thematique')
          return <li key={i} className={classes.join(' ')} />
        })}
      </ol>
    </div>
  )

  // La colonne de droite.
  let colonne: ReactNode
  if (etape.phase === 'classement' && vue.classement) {
    colonne = (
      <aside className="an-colonne">
        <h2>
          Top 10 après {n + 1} Duel{n > 0 ? 's' : ''}
        </h2>
        <ol className="an-top">
          {vue.classement.slice(0, 10).map((l) => (
            <li key={l.numero}>
              <span className="an-rang">{l.rang}</span>
              <span className="an-top__nom">{l.pseudo}</span>
              <span className="an-top__mouvement">
                {l.evolution !== null && l.evolution > 0 && (
                  <span className="an-monte" role="img" aria-label="monte">
                    ▲
                  </span>
                )}
                {l.evolution !== null && l.evolution < 0 && (
                  <span className="an-descend" role="img" aria-label="descend">
                    ▼
                  </span>
                )}
              </span>
              <span className="an-score">{l.bonnes}</span>
            </li>
          ))}
        </ol>
      </aside>
    )
  } else if (revele && dernier) {
    // Révélation du Duel 10 : la colonne reste (la mise en page ne bouge pas), mais garde la surprise du classement.
    colonne = (
      <aside className="an-colonne an-colonne--teaser">
        <p className="an-teaser__tambour" aria-hidden="true">
          🥁
        </p>
        <p className="an-teaser__texte">{vue.avecClassement ? 'Qui monte sur le podium ?' : 'Les 10 Duels sont joués !'}</p>
        <p className="an-teaser__sous-texte">Place aux résultats de la salle.</p>
      </aside>
    )
  } else {
    // Pendant le Duel et sa révélation : rejoindre, la jauge, et les pseudos dans l'ordre où ils ont répondu.
    colonne = (
      <aside className="an-colonne">
        <Rejoindre code={code} compact />
        <div className="an-jauge" aria-live="polite">
          <span>
            <strong>{vue.repondus.length}</strong> / {total} ont répondu
          </span>
          <div>
            <i style={{ width: `${total ? (vue.repondus.length / total) * 100 : 0}%` }} />
          </div>
        </div>
        {vue.avecClassement && (
          <ul className="an-repondus" aria-label="Ont répondu">
            {vue.repondus.map((numero) => {
              const pseudo = pseudoDe(numero)
              return pseudo && <Pseudo key={numero} numero={numero} pseudo={pseudo} retirer={retirer} />
            })}
          </ul>
        )}
      </aside>
    )
  }

  let plateau: ReactNode
  if (etape.phase === 'classement') {
    plateau = (
      <>
        <h2 className="an-titre">Les bonnes réponses de la salle, Duel par Duel</h2>
        <ol className="an-frise">
          {duels.map((d, i) => {
            const part = i <= n ? partDeBonnes(vue.salle[i]) : null
            return (
              <li key={i} className={i <= n ? '' : 'an-frise--avenir'}>
                <span className="an-frise__pile">
                  {part !== null && (
                    <i className="an-frise__bonnes" style={{ height: `${part}%` }}>
                      {pourcent(part)}
                    </i>
                  )}
                </span>
                <span className={`an-frise__num difficulte--${d.thematique ? 'thematique' : difficulteAttendue(i)}`}>
                  <span className="visuellement-cache">Duel </span>
                  {i + 1}
                </span>
              </li>
            )
          })}
        </ol>
      </>
    )
  } else {
    const plus = plusEmetteur(duel)
    const salle = vue.salle[n]
    const ligne = (g: GesteCalcule) => {
      const reponses = salle?.parGeste[g.id] ?? { nombre: 0, pourcentage: 0 }
      return (
        <div className={`an-ligne${revele && g === plus ? ' an-ligne--gagnant' : ''}`}>
          <LigneGeste geste={g} revele={revele}>
            {revele && salle && (
              <span className="an-reponses">
                <span className="an-reponses__barre" aria-hidden="true">
                  <i style={{ width: `${Math.max(reponses.pourcentage, 2)}%` }} />
                </span>
                <span className="an-reponses__chiffres">
                  <strong>{pourcent(reponses.pourcentage)}</strong> de la salle ({reponses.nombre})
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
          <p className="an-annonce">
            <strong>★ {thematique.titre}</strong> {thematique.accroche}
          </p>
        )}
        <h2 className="an-titre">Lequel émet le plus ?</h2>
        <div className="an-lignes">
          {ligne(duel.a)}
          <div className="an-entre">
            {revele ? (
              <span className="an-rapport">
                <b>{formaterRapport(rapport(duel))}</b>
                <small>fois plus</small>
              </span>
            ) : (
              <span className="an-vs" aria-hidden="true">
                VS
              </span>
            )}
          </div>
          {ligne(duel.b)}
        </div>
        {revele && thematique && (
          <div className="an-explication-duel">
            <p className="an-explication-duel__titre">★ {thematique.titre}</p>
            <p>{thematique.texte}</p>
          </div>
        )}
        {revele && (
          <>
            <button type="button" className="an-bouton-secondaire" onClick={() => fenetre.current?.showModal()}>
              Voir le détail des émissions
            </button>
            <dialog ref={fenetre} className="an-fenetre" aria-labelledby="an-detail-titre" onClick={(e) => e.target === fenetre.current && fenetre.current?.close()}>
              <h2 id="an-detail-titre">Le détail des émissions</h2>
              <TableauRepartition duel={duel} />
              <button type="button" className="an-bouton-secondaire" onClick={() => fenetre.current?.close()}>
                Fermer
              </button>
            </dialog>
          </>
        )}
      </>
    )
  }

  return (
    <div className="an-scene">
      <main className="an-plateau">
        {suivi}
        {plateau}
        {bouton}
      </main>
      {colonne}
    </div>
  )
}

// --- Classement final ---

function Final({ vue, duels, bouton }: PropsCommunes) {
  const rates = duelsRatesDeLaSalle(vue.salle)
  const conseil = CONSEILS.find((c) => c.id === vue.conseil)
  const reponses = vue.salle.reduce((total, s) => total + s.reponses, 0)
  const bonnes = vue.salle.reduce((total, s) => total + s.bonnes, 0)
  return (
    <main className="an-final">
      <div className="an-final__tete">
        <Logo lien />
        <h1>{vue.classement ? 'Classement final' : 'Les résultats de la salle'}</h1>
      </div>
      {vue.classement ? (
        <ol className="an-final__classement">
          {vue.classement.slice(0, 10).map((l) => (
            <li key={l.numero}>
              <span className="an-rang">{l.rang}</span>
              <span className="an-final__nom">
                {l.pseudo} <Medaille ligne={l} />
              </span>
              <span className="an-score">
                {l.bonnes}/{l.joues}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        reponses > 0 && (
          <p className="an-final__salle">
            <strong>{pourcent(enPourcent(bonnes / reponses))}</strong> de bonnes réponses dans la salle
          </p>
        )
      )}
      <div className="an-final__bas">
        {rates.length > 0 ? (
          <section className="an-final__rates">
            <h2>Les Duels qui ont le plus trompé la salle</h2>
            <table className="an-rates">
              <thead>
                <tr>
                  <th scope="col">Duel</th>
                  <th scope="col">Qui émet le plus</th>
                  <th scope="col">Réponses fausses</th>
                </tr>
              </thead>
              <tbody>
                {rates.map(({ duel: i, fausses }) => {
                  const d = duels[i]
                  const plus = plusEmetteur(d)
                  const moins = moinsEmetteur(d)
                  return (
                    <tr key={i}>
                      <td className="an-rates__numero">{i + 1}</td>
                      <td className="an-rates__equivalence">
                        <span aria-hidden="true">
                          1 <Icone id={plus.id} /> = {formaterMultiple(rapport(d))} <Icone id={moins.id} />
                        </span>
                        <span className="visuellement-cache">
                          {plus.titre} émet {formaterMultiple(rapport(d))} fois plus {queDevant(moins.titre)}
                        </span>
                      </td>
                      <td className="an-rates__part">{pourcent(fausses)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        ) : (
          <section className="an-final__rates">
            <h2>Aucun Duel n’a trompé la salle : bravo !</h2>
          </section>
        )}
        {conseil && <Conseil conseil={conseilAffiche(conseil, VALEURS)} />}
      </div>
      {/* L'invitation à revenir : les téléphones l'affichent aussi, avec le lien. */}
      <div className="an-final__pied">
        <p className="an-final__invitation">
          <span aria-hidden="true">📱 </span>
          <strong>Le Duel du jour</strong> t’attend sur ton téléphone, un nouveau chaque jour sur <strong>duelcarbone.fr</strong>
        </p>
        {bouton}
      </div>
    </main>
  )
}
