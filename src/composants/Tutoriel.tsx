import { useEffect, useRef, useState, type ReactNode } from 'react'
import { gesteCalcule } from '../donnees/index.ts'
import { moinsEmetteur, plusEmetteur, rapport, type Duel } from '../domaine/duel.ts'
import { formaterMultiple, formaterRapport } from '../domaine/format.ts'
import type { GesteCalcule } from '../domaine/geste.ts'
import { ADRESSES } from '../navigateur/adresse.ts'
import { CarteGeste, type EtatCarte } from './CarteGeste.tsx'
import { Icone } from './Icone.tsx'
import { TableauRepartition } from './TableauRepartition.tsx'
import '../ecrans/EcranDuel.css'
import './ExplicationDuel.css'
import './Tutoriel.css'

// Le Duel du tutoriel, toujours le même : un jean émet bien plus qu'un Paris–Marseille en TGV. Surprenant, et la
// Répartition reste simple (fabrication, usage, fin de vie ; construction et carburant). Des choux et des carottes, exprès.
const DUEL: Duel = { a: gesteCalcule('jean'), b: gesteCalcule('paris-marseille-tgv') }
const GAGNANT = plusEmetteur(DUEL)
const PERDANT = moinsEmetteur(DUEL)
const FOIS = formaterMultiple(rapport(DUEL))

/** Les deux cartes ; tant que rien n'est révélé, toucher une carte appelle onChoisir. */
function Cartes({ choix, onChoisir }: { choix: string | null; onChoisir?: (id: string) => void }) {
  const etat = (id: string): EtatCarte =>
    !choix ? 'question' : id === GAGNANT.id ? 'plus-emetteur' : id === choix ? 'mauvais-choix' : 'autre'
  const carte = (geste: GesteCalcule) => (
    <CarteGeste geste={geste} etat={etat(geste.id)} choisie={choix === geste.id} onChoisir={() => onChoisir?.(geste.id)} />
  )
  return (
    <div className="duel__cartes">
      {carte(DUEL.a)}
      {choix ? (
        <div className="duel__rapport">
          <b>{formaterRapport(rapport(DUEL))}</b>
          <small>fois plus</small>
        </div>
      ) : (
        <div className="duel__vs" aria-hidden="true">
          VS
        </div>
      )}
      {carte(DUEL.b)}
    </div>
  )
}

const Equivalence = () => (
  <p className="equivalence">
    <span aria-hidden="true">
      1 <Icone id={GAGNANT.id} /> = {FOIS} <Icone id={PERDANT.id} />
    </span>
    <span className="visuellement-cache">
      {GAGNANT.titre} émet autant que {FOIS} fois {PERDANT.titre}
    </span>
  </p>
)

const verdict = (choix: string | null) =>
  !choix ? null : choix === GAGNANT.id ? <b>Bien vu ! </b> : <b>Raté, et tu n’es pas le seul ! </b>

/** Les 5 étapes, une à la fois, avec « ← Précédent » et « Suivant → » toujours visibles en bas de la fenêtre. */
function Diaporama({ onJouer, onSources }: { onJouer: () => void; onSources: () => void }) {
  const [etape, setEtape] = useState(0)
  // Le joueur a envie de toucher une carte dès la première étape : on le laisse faire, et on passe à la réponse.
  const [choix, setChoix] = useState<string | null>(null)
  const choisir = (id: string) => {
    setChoix(id)
    setEtape(1)
  }

  const etapes: { titre: string; texte: ReactNode; visuel: ReactNode }[] = [
    {
      titre: 'Deux gestes s’affrontent',
      texte: (
        <>
          Touche celui qui émet le plus de CO2e sur toute sa vie : fabrication, transport, usage, fin de vie. Pas de chrono.
          <br />
          Lis bien <b>la précision sous chaque geste</b> (un poids, une durée d’utilisation, un nombre de passagers) : elle
          peut tout changer. Ici, un jean porté 5 ans, et un aller simple pour un passager.
        </>
      ),
      visuel: <Cartes choix={null} onChoisir={choisir} />,
    },
    {
      titre: 'La réponse tombe',
      texte: (
        <>
          {verdict(choix)}Les empreintes s’affichent, et le badge dit <b>combien de fois plus</b> : le jean émet {FOIS} fois
          plus que le Paris–Marseille en TGV.
        </>
      ),
      visuel: <Cartes choix={choix ?? GAGNANT.id} />,
    },
    {
      titre: 'D’où viennent les émissions',
      texte: 'Le tableau détaille chaque étape, pour les deux gestes. Pour le jean, presque tout vient de sa fabrication.',
      visuel: <TableauRepartition duel={DUEL} />,
    },
    {
      titre: 'Des choux et des carottes ?',
      texte: (
        <>
          Un jean contre un train : oui, on compare parfois des choux et des carottes, et c’est voulu. Le but n’est pas de
          choisir entre deux alternatives, mais de te forger des <b>ordres de grandeur</b> : savoir ce qui pèse lourd, et ce
          qui ne pèse presque rien.
        </>
      ),
      visuel: <Equivalence />,
    },
    {
      titre: 'Pour aller plus loin',
      texte: (
        <>
          Sous chaque explication, des liens mènent aux fiches de l’ADEME, et{' '}
          <a href={ADRESSES.sources} onClick={onSources}>
            Sources et méthode
          </a>{' '}
          détaille nos calculs. Une Partie, c’est 10 Duels de plus en plus serrés ; un nouveau Duel du jour t’attend chaque
          jour à minuit.
        </>
      ),
      visuel: <Equivalence />,
    },
  ]

  const { titre, texte, visuel } = etapes[etape]
  const derniere = etape === etapes.length - 1
  return (
    <div className="diaporama">
      <p className="diaporama__points" aria-label={`Étape ${etape + 1} sur ${etapes.length}`}>
        {etapes.map((_, i) => (
          <span key={i} className={i === etape ? 'actif' : ''} />
        ))}
      </p>
      <h3>
        {etape + 1}. {titre}
      </h3>
      <p className="diaporama__texte">{texte}</p>
      <div className="diaporama__visuel">{visuel}</div>
      <div className="diaporama__navigation">
        {etape > 0 && (
          <button type="button" className="bouton bouton--secondaire" onClick={() => setEtape(etape - 1)}>
            ← Précédent
          </button>
        )}
        {derniere ? (
          <button type="button" className="bouton" onClick={onJouer}>
            Jouer le Duel du jour
          </button>
        ) : (
          <button type="button" className="bouton" onClick={() => setEtape(etape + 1)}>
            Suivant →
          </button>
        )}
      </div>
    </div>
  )
}

type Props = {
  ouvert: boolean
  onFermer: () => void
  onJouer: () => void
}

/** « Comment ça marche ? » : le diaporama en 5 étapes, dans une fenêtre qui recouvre l'accueil. */
export function Tutoriel({ ouvert, onFermer, onJouer }: Props) {
  const fenetre = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialogue = fenetre.current
    if (!dialogue) return
    if (ouvert && !dialogue.open) dialogue.showModal()
    if (!ouvert && dialogue.open) dialogue.close()
  }, [ouvert])
  const jouer = () => {
    onFermer()
    onJouer()
  }
  return (
    // onClose : la fenêtre a été fermée par la touche Échap.
    <dialog ref={fenetre} className="fenetre tutoriel" aria-labelledby="tutoriel-titre" onClose={onFermer}>
      <div className="tutoriel__entete">
        <h2 id="tutoriel-titre">Comment ça marche ?</h2>
        <button type="button" className="tutoriel__fermer" aria-label="Fermer" onClick={onFermer}>
          ✕
        </button>
      </div>
      {/* Rouvrir le tutoriel repart de la première étape. */}
      {ouvert && <Diaporama onJouer={jouer} onSources={onFermer} />}
    </dialog>
  )
}
