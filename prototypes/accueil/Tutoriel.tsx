// PROTOTYPE JETABLE — « Comment ça marche ? » : le diaporama en 5 étapes, sur un Duel fixe (jean contre TGV). Figé.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CarteGeste, type EtatCarte } from '../../src/composants/CarteGeste.tsx'
import { Icone } from '../../src/composants/Icone.tsx'
import { TableauRepartition } from '../../src/composants/TableauRepartition.tsx'
import { gesteCalcule } from '../../src/donnees/index.ts'
import { moinsEmetteur, plusEmetteur, rapport, type Duel } from '../../src/domaine/duel.ts'
import { formaterMultiple, formaterRapport } from '../../src/domaine/format.ts'

// Le Duel du tutoriel : un jean émet 11 fois plus qu'un Paris–Marseille en TGV. Surprenant, et la Répartition
// reste simple (fabrication, usage, fin de vie ; construction et carburant). Des choux et des carottes, exprès.
const DUEL: Duel = { a: gesteCalcule('jean'), b: gesteCalcule('paris-marseille-tgv') }
const GAGNANT = plusEmetteur(DUEL)
const PERDANT = moinsEmetteur(DUEL)
const FOIS = formaterMultiple(rapport(DUEL))

/** Les deux cartes ; tant que rien n'est révélé, toucher une carte appelle onChoisir. */
function Cartes({ choix, onChoisir }: { choix: string | null; onChoisir?: (id: string) => void }) {
  const etat = (id: string): EtatCarte => (!choix ? 'question' : id === GAGNANT.id ? 'plus-emetteur' : id === choix ? 'mauvais-choix' : 'autre')
  const carte = (geste: typeof DUEL.a, raccourci: string) => (
    <CarteGeste geste={geste} etat={etat(geste.id)} choisie={choix === geste.id} raccourci={raccourci} onChoisir={() => onChoisir?.(geste.id)} />
  )
  return (
    <div className="duel__cartes">
      {carte(DUEL.a, '1')}
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
      {carte(DUEL.b, '2')}
    </div>
  )
}

const Equivalence = () => (
  <p className="equivalence">
    <span aria-hidden="true">
      1 <Icone id={GAGNANT.id} /> = {FOIS} <Icone id={PERDANT.id} />
    </span>
  </p>
)

const verdict = (choix: string | null) =>
  !choix ? null : choix === GAGNANT.id ? <b>Bien vu&nbsp;! </b> : <b>Raté, et tu n’es pas le seul&nbsp;! </b>

// ─── Forme 1 : le diaporama ─────────────────────────────────────────────────────────────
function Diaporama({ onJouer }: { onJouer: () => void }) {
  const [etape, setEtape] = useState(0)
  // Le joueur a envie de toucher une carte dès la première étape : on le laisse faire, et on passe à la réponse.
  const [choix, setChoix] = useState<string | null>(null)
  const choisir = (id: string) => {
    setChoix(id)
    setEtape(1)
  }
  const revele = choix ?? GAGNANT.id

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
      visuel: <Cartes choix={revele} />,
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
          Sous chaque explication, des liens mènent aux fiches de l’ADEME, et <a href="./#sources">Sources et méthode</a>{' '}
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
    <div className="proto-diaporama">
      <p className="proto-diaporama__points" aria-label={`Étape ${etape + 1} sur ${etapes.length}`}>
        {etapes.map((_, i) => (
          <span key={i} className={i === etape ? 'actif' : ''} />
        ))}
      </p>
      <h3>
        {etape + 1}. {titre}
      </h3>
      <p className="proto-diaporama__texte">{texte}</p>
      <div className="proto-diaporama__visuel">{visuel}</div>
      <div className="proto-diaporama__navigation">
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

/** Le tutoriel, dans une fenêtre qui recouvre l'accueil. */
export function Tutoriel({ ouvert, onFermer, onJouer }: { ouvert: boolean; onFermer: () => void; onJouer: () => void }) {
  const fenetre = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (ouvert && !fenetre.current?.open) fenetre.current?.showModal()
    if (!ouvert && fenetre.current?.open) fenetre.current.close()
  }, [ouvert])
  const jouer = () => {
    onFermer()
    onJouer()
  }
  return (
    <dialog ref={fenetre} className="proto-dialogue proto-tutoriel" aria-labelledby="proto-tutoriel-titre" onClose={onFermer}>
      <div className="proto-tutoriel__entete">
        <h2 id="proto-tutoriel-titre">Comment ça marche&nbsp;?</h2>
        <button type="button" className="proto-fermer" aria-label="Fermer" onClick={onFermer}>
          ✕
        </button>
      </div>
      {/* Rouvrir le tutoriel repart de la première étape. */}
      {ouvert && <Diaporama onJouer={jouer} />}
    </dialog>
  )
}
