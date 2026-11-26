/**
 * PROTOTYPE (jetable) : le téléphone du Participant pendant une Séance, sur l'adresse #prototype-participant.
 * Question : « Quels ajustements à l'écran de jeu actuel pour jouer au rythme de l'Animateur ? »
 * Même Séance fictive que l'écran de l'Animateur ; le Participant est « Camille ».
 * Deux variantes de l'attente après avoir répondu :
 *   ?variant=1 : on reste sur le Duel, la carte choisie est marquée, un bandeau dit d'attendre ;
 *   ?variant=2 : un écran d'attente à part, qui rappelle le choix et montre la salle qui répond.
 * L'étape (ce que fait l'Animateur) se choisit dans la barre noire, en haut. On peut répondre en touchant une carte.
 */
import { useEffect, useMemo, useState } from 'react'
import { CarteGeste, type EtatCarte } from '../../composants/CarteGeste.tsx'
import { Conseil } from '../../composants/Conseil.tsx'
import { ExplicationDuel } from '../../composants/ExplicationDuel.tsx'
import { Icone } from '../../composants/Icone.tsx'
import { Frise } from '../../composants/Vitrine.tsx'
import { CONSEILS } from '../../donnees/conseils.ts'
import { INSTANTANE } from '../../donnees/index.ts'
import { conseilAffiche, valeursDe } from '../../domaine/conseils.ts'
import { plusEmetteur, rapport } from '../../domaine/duel.ts'
import { formaterRapport } from '../../domaine/format.ts'
import type { GesteCalcule } from '../../domaine/geste.ts'
import { choixDu, classementApres, creerSeanceFactice, partDeBonnes } from './seance-factice.ts'
import '../EcranDuel.css'
import '../EcranPartie.css'
import '../EcranFin.css'
import '../../composants/CommeToi.css'
import './prototype-participant.css'

type Phase = 'rejoindre' | 'attente' | 'duel' | 'revelation' | 'classement' | 'fin'
type Etape = { phase: Phase; n: number }

const MOI = 'Camille'
const MEDAILLES = { or: '🥇', argent: '🥈', bronze: '🥉' }

/** La petite phrase selon la place au Classement (à écrire pour de bon dans la spécification). */
function phraseDuRang(rang: number, exAequo: number, total: number, reste: number): string {
  if (rang === 1 && exAequo === 1) return 'Tu mènes la Séance ! Garde la tête froide.'
  if (rang === 1) return `En tête, à égalité avec ${exAequo - 1} autre${exAequo > 2 ? 's' : ''}. Tout se joue maintenant !`
  if (rang <= 3) return 'Sur le podium. Ne lâche rien !'
  if (rang <= 10) return 'Dans le top 10 : le podium n’est pas loin.'
  if (rang === total) return `Encore ${reste} Duel${reste > 1 ? 's' : ''} pour remonter : les plus serrés arrivent.`
  return `Encore ${reste} Duel${reste > 1 ? 's' : ''} pour grimper au classement.`
}

export function PrototypeParticipant() {
  const seance = useMemo(() => creerSeanceFactice(), [])
  const variante = new URLSearchParams(window.location.search).get('variant') === '2' ? '2' : '1'
  const [etape, setEtape] = useState<Etape>({ phase: 'rejoindre', n: 0 })
  const [pseudo, setPseudo] = useState(MOI)
  // Mes réponses, Duel par Duel (sinon, celles de Camille dans la Séance fictive).
  const [mesChoix, setMesChoix] = useState<Record<number, string>>({})
  const [repondus, setRepondus] = useState(0)
  const total = seance.participants.length
  const moi = seance.participants.find((p) => p.pseudo === MOI)!

  useEffect(() => {
    if (etape.phase !== 'duel') return
    let r = 0
    const minuterie = setInterval(() => setRepondus(Math.min(++r, total - 3)), 400)
    return () => clearInterval(minuterie)
  }, [etape, total])

  const aller = (valeur: string) => {
    const [phase, n] = valeur.split(':')
    setRepondus(0)
    setEtape({ phase: phase as Phase, n: Number(n) })
    window.scrollTo(0, 0)
  }

  const duel = seance.duels[etape.n]
  const plus = plusEmetteur(duel)
  const choixParDefaut = moi.bonnes[etape.n] ? plus.id : (plus === duel.a ? duel.b : duel.a).id
  const monChoix = mesChoix[etape.n] ?? (etape.phase === 'duel' ? null : choixParDefaut)
  const bon = monChoix === plus.id
  // Mon score : mes réponses quand j'ai répondu, celles de Camille sinon.
  const monScore = (jusqua: number) =>
    seance.duels.slice(0, jusqua).filter((d, n) => (mesChoix[n] ? mesChoix[n] === plusEmetteur(d).id : moi.bonnes[n])).length

  const barre = (
    <div className="pp-barre" role="toolbar" aria-label="Prototype : ce que fait l’Animateur">
      <span>Proto {variante}</span>
      <select value={`${etape.phase}:${etape.n}`} onChange={(e) => aller(e.target.value)} aria-label="Étape de la Séance">
        <option value="rejoindre:0">Rejoindre</option>
        <option value="attente:0">Attente du lancement</option>
        {seance.duels.map((d, n) => (
          <optgroup key={n} label={`Duel ${n + 1}${d.thematique ? ' (thématique)' : ''}`}>
            <option value={`duel:${n}`}>Duel {n + 1} : question</option>
            <option value={`revelation:${n}`}>Duel {n + 1} : révélation</option>
            {n < 9 && <option value={`classement:${n}`}>Duel {n + 1} : classement</option>}
          </optgroup>
        ))}
        <option value="fin:9">Fin de la Séance</option>
      </select>
      <a href={`?variant=${variante === '1' ? '2' : '1'}#prototype-participant`} onClick={() => setTimeout(() => location.reload())}>
        ⇄ variante
      </a>
    </div>
  )

  const entete = (
    <header className="entete">
      <h1>
        <span className="entete__lien">
          <img className="entete__logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="36" height="36" />
          Duel Carbone
        </span>
      </h1>
    </header>
  )

  let contenu
  if (etape.phase === 'rejoindre') {
    contenu = (
      <section className="pp-rejoindre">
        <h2>Rejoindre la Séance</h2>
        <label>
          Code de la Séance
          <input value={seance.code} readOnly className="pp-code" />
        </label>
        <p className="pp-aide">Rempli tout seul quand tu scannes le QR code.</p>
        <label>
          Ton pseudo (affiché au classement)
          <input value={pseudo} maxLength={20} onChange={(e) => setPseudo(e.target.value)} />
        </label>
        <p className="pp-aide">Il est effacé à la fin de la Séance.</p>
        <button type="button" className="bouton" onClick={() => aller('attente:0')}>
          Rejoindre
        </button>
      </section>
    )
  } else if (etape.phase === 'attente') {
    contenu = (
      <section className="pp-centre">
        <p className="pp-grand">C’est bon, {pseudo} !</p>
        <p>Regarde l’écran : la Séance va bientôt commencer.</p>
        <p className="pp-discret">{total} personnes dans la salle</p>
        <div className="pp-frise">
          <Frise />
        </div>
      </section>
    )
  } else if (etape.phase === 'classement' || etape.phase === 'fin') {
    const joues = etape.n + 1
    const lignes = classementApres(seance, joues)
    const moiLigne = lignes.find((l) => l.pseudo === MOI)!
    const exAequo = lignes.filter((l) => l.score === moiLigne.score).length
    const avant = classementApres(seance, joues - 1).find((l) => l.pseudo === MOI)!
    const fin = etape.phase === 'fin'
    // Le même Conseil que sur l'écran de l'Animateur, ici avec un lien qu'on peut toucher.
    const conseil = conseilAffiche(CONSEILS.find((c) => c.id === 'legumineuses') ?? CONSEILS[0], valeursDe(INSTANTANE))
    contenu = (
      <section className="pp-classement">
        <h2>{fin ? 'Séance terminée !' : `Classement après le Duel ${joues}`}</h2>
        <p className="fin__score">
          {monScore(joues)}
          <span>/{joues}</span>
        </p>
        <p className="pp-rang">
          {moiLigne.rang === 1 ? '1er' : `${moiLigne.rang}e`} sur {total}
          {fin && moiLigne.medaille && <span className="pp-medaille"> {MEDAILLES[moiLigne.medaille]}</span>}
          {!fin && avant.rang > moiLigne.rang && <span className="pp-monte"> ▲ {avant.rang - moiLigne.rang}</span>}
          {!fin && avant.rang < moiLigne.rang && <span className="pp-descend"> ▼ {moiLigne.rang - avant.rang}</span>}
        </p>
        <p className="fin__message">
          {fin
            ? moiLigne.medaille
              ? 'Bravo, tu es sur le podium !'
              : 'Merci d’avoir joué ! Regarde l’écran pour le podium.'
            : phraseDuRang(moiLigne.rang, exAequo, total, 10 - joues)}
        </p>
        {fin ? (
          <>
            <a className="bouton fin__gros pp-bouton-large" href="/?ref=seance">
              Jouer le Duel du jour
            </a>
            <p className="pp-discret">Un nouveau Duel chaque jour, sur duelcarbone.fr</p>
            <Conseil conseil={conseil} onLien={() => {}} />
          </>
        ) : (
          <p className="pp-attente-ecran">👀 Regarde l’écran : le Duel {joues + 1} arrive.</p>
        )}
      </section>
    )
  } else {
    // Le Duel, sa réponse envoyée, puis sa révélation.
    const revele = etape.phase === 'revelation'
    const envoye = !revele && monChoix !== null
    const etatDe = (g: GesteCalcule): EtatCarte => {
      if (!revele) return 'question'
      if (g.id === plus.id) return 'plus-emetteur'
      return g.id === monChoix ? 'mauvais-choix' : 'autre'
    }
    const carte = (g: GesteCalcule) => (
      <div className={`pp-carte${envoye ? (g.id === monChoix ? ' pp-carte--choisie' : ' pp-carte--ecartee') : ''}`}>
        {envoye && g.id === monChoix && <span className="pp-carte__badge">Ton choix</span>}
        <CarteGeste
          geste={g}
          etat={etatDe(g)}
          choisie={g.id === monChoix}
          onChoisir={() => !envoye && !revele && setMesChoix((c) => ({ ...c, [etape.n]: g.id }))}
        />
      </div>
    )
    const thematique = Boolean(duel.thematique)
    const commeMoi = monChoix ? choixDu(seance, etape.n, monChoix).length : 0
    const partCommeMoi = Math.round((commeMoi / total) * 100)
    const suivi = (
      <>
        <div className="partie__entete">
          <p className="partie__position">Duel {etape.n + 1}/10</p>
          <span className={`difficulte difficulte--${thematique ? 'thematique' : duel.difficulte}`}>
            {thematique ? '★ thématique' : duel.difficulte}
          </span>
          <p className="partie__score">Score : {monScore(etape.n + (revele ? 1 : 0))}</p>
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
      </>
    )

    if (variante === '2' && envoye) {
      // Variante 2 : un écran d'attente à part.
      const choisi = monChoix === duel.a.id ? duel.a : duel.b
      contenu = (
        <>
          {suivi}
          <section className="pp-centre pp-envoye">
            <p className="pp-grand">✓ Réponse envoyée</p>
            <p className="pp-choix">
              <span className="pp-choix__icone">
                <Icone id={choisi.id} />
              </span>
              <span>
                Tu as choisi <strong>{choisi.titre}</strong>
                <br />
                <small>{choisi.sousTitre}</small>
              </span>
            </p>
            <p>
              <strong>{repondus + 1}</strong> / {total} ont répondu
            </p>
            <span className="pp-jauge">
              <i style={{ width: `${((repondus + 1) / total) * 100}%` }} />
            </span>
            <p className="pp-attente-ecran">👀 Regarde l’écran : l’animateur va révéler la réponse.</p>
          </section>
        </>
      )
    } else {
      contenu = (
        <>
          {suivi}
          {thematique && !revele && (
            <p className="pp-annonce">
              <strong>★ {duel.thematique!.titre}</strong> {duel.thematique!.accroche}
            </p>
          )}
          <section className="duel">
            <h2 className="duel__question">Lequel émet le plus ?</h2>
            <div className="duel__cartes">
              {carte(duel.a)}
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
              {carte(duel.b)}
            </div>
            {revele && (
              <div className="duel__resultat">
                <p className={`duel__verdict duel__verdict--${bon ? 'bon' : 'mauvais'}`}>
                  <span className="duel__verdict-texte">{bon ? '✓ Bonne réponse !' : '✗ Raté !'}</span>
                  {/* Comme « 72 % comme toi », mais pour la salle. */}
                  <span className="comme-toi">
                    <span className="comme-toi__barre" aria-hidden="true">
                      <span className={`comme-toi__part comme-toi__part--${bon ? 'bon' : 'mauvais'}`} style={{ width: `${partCommeMoi}%` }} />
                    </span>
                    {partCommeMoi} % de la salle comme toi
                  </span>
                </p>
                <section className="duel__explication" aria-label="Explication">
                  <ExplicationDuel duel={duel} />
                </section>
              </div>
            )}
          </section>
          {envoye && (
            <div className="pp-bandeau">
              ✓ Réponse envoyée · <strong>{repondus + 1}</strong>/{total} ont répondu
              <br />
              <small>👀 Regarde l’écran : l’animateur va révéler la réponse.</small>
            </div>
          )}
          {revele && (
            <div className="pp-bandeau">
              {etape.n === 9 ? '🥁 Le classement final arrive sur l’écran…' : '👀 Regarde l’écran : le classement arrive.'}
              <br />
              <small>{partDeBonnes(seance, etape.n)} % de bonnes réponses dans la salle</small>
            </div>
          )}
        </>
      )
    }
  }

  return (
    <div className="pp">
      {barre}
      <div className="page">
        {entete}
        <main>{contenu}</main>
      </div>
    </div>
  )
}
