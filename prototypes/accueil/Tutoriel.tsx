// PROTOTYPE JETABLE — « Comment ça marche ? » : deux formes de tutoriel, sur un même Duel fixe (steak contre TGV).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CarteGeste, type EtatCarte } from '../../src/composants/CarteGeste.tsx'
import { Icone } from '../../src/composants/Icone.tsx'
import { TableauRepartition } from '../../src/composants/TableauRepartition.tsx'
import { gesteCalcule } from '../../src/donnees/index.ts'
import { plusEmetteur, rapport, type Duel } from '../../src/domaine/duel.ts'
import { formaterMultiple, formaterRapport } from '../../src/domaine/format.ts'
import '../../src/composants/TableauRepartition.css'

export type FormeTutoriel = 'diaporama' | 'guide'
export const FORMES: Record<FormeTutoriel, string> = { diaporama: 'Diaporama en 4 étapes', guide: 'Duel guidé' }

// Le Duel du tutoriel : un steak émet plus qu'un Paris–Marseille en TGV (×1,5), de quoi surprendre.
const DUEL: Duel = { a: gesteCalcule('steak-boeuf'), b: gesteCalcule('paris-marseille-tgv') }
const GAGNANT = plusEmetteur(DUEL)

function Cartes({ etat, onChoisir }: { etat: (id: string) => EtatCarte; onChoisir?: (id: string) => void }) {
  const revele = etat(DUEL.a.id) !== 'question'
  return (
    <div className="duel__cartes">
      <CarteGeste geste={DUEL.a} etat={etat(DUEL.a.id)} choisie={false} raccourci="1" onChoisir={() => onChoisir?.(DUEL.a.id)} />
      {revele ? (
        <div className="duel__rapport">
          <b>{formaterRapport(rapport(DUEL))}</b>
          <small>fois plus</small>
        </div>
      ) : (
        <div className="duel__vs" aria-hidden="true">
          VS
        </div>
      )}
      <CarteGeste geste={DUEL.b} etat={etat(DUEL.b.id)} choisie={false} raccourci="2" onChoisir={() => onChoisir?.(DUEL.b.id)} />
    </div>
  )
}

const revelee = (id: string): EtatCarte => (id === GAGNANT.id ? 'plus-emetteur' : 'autre')

const Equivalence = () => (
  <p className="equivalence">
    <span aria-hidden="true">
      1 <Icone id={GAGNANT.id} /> = {formaterMultiple(rapport(DUEL))} <Icone id={DUEL.b.id} />
    </span>
  </p>
)

// ─── Forme 1 : le diaporama ─────────────────────────────────────────────────────────────
const ETAPES: { titre: string; visuel: ReactNode; texte: ReactNode }[] = [
  {
    titre: 'Deux gestes s’affrontent',
    visuel: <Cartes etat={() => 'question'} />,
    texte: 'Touche celui qui émet le plus de CO2e sur tout son cycle de vie. Pas de chrono : prends ton temps.',
  },
  {
    titre: 'La réponse tombe',
    visuel: <Cartes etat={revelee} />,
    texte: (
      <>
        Les empreintes s’affichent, et le badge dit <b>combien de fois plus</b> : ici, le steak émet{' '}
        {formaterMultiple(rapport(DUEL))} fois plus que le TGV. Surprenant&nbsp;?
      </>
    ),
  },
  {
    titre: 'D’où viennent les émissions',
    visuel: <TableauRepartition duel={DUEL} />,
    texte: 'Le tableau détaille chaque étape, pour les deux gestes. Pour le steak, presque tout vient de l’élevage, pas du transport.',
  },
  {
    titre: 'Pour aller plus loin',
    visuel: <Equivalence />,
    texte: (
      <>
        Sous chaque explication, les liens mènent aux fiches de l’ADEME, et <a href="./#sources">Sources et méthode</a> explique nos
        calculs. Une Partie, c’est 10 Duels de plus en plus serrés ; un nouveau Duel du jour t’attend chaque jour à minuit.
      </>
    ),
  },
]

function Diaporama({ onJouer }: { onJouer: () => void }) {
  const [etape, setEtape] = useState(0)
  const { titre, visuel, texte } = ETAPES[etape]
  const derniere = etape === ETAPES.length - 1
  return (
    <div className="proto-diaporama">
      <p className="proto-diaporama__points" aria-label={`Étape ${etape + 1} sur ${ETAPES.length}`}>
        {ETAPES.map((_, i) => (
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

// ─── Forme 2 : le Duel guidé ────────────────────────────────────────────────────────────
function Bulle({ children, onSuivant, libelle = 'Suivant →' }: { children: ReactNode; onSuivant?: () => void; libelle?: string }) {
  const element = useRef<HTMLDivElement>(null)
  // Chaque nouvelle bulle se place sous les yeux du joueur.
  // Accolades obligatoires : scrollIntoView renvoie une promesse dans les navigateurs récents, et React prendrait
  // tout ce que renvoie l'effet pour une fonction de nettoyage.
  useEffect(() => {
    element.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])
  return (
    <div ref={element} className="proto-bulle" role="status">
      <div>{children}</div>
      {onSuivant && (
        <button type="button" className="bouton" onClick={onSuivant}>
          {libelle}
        </button>
      )}
    </div>
  )
}

function DuelGuide({ onJouer }: { onJouer: () => void }) {
  // 0 : à toi de jouer ; 1 : la réponse ; 2 : le tableau ; 3 : les liens.
  const [etape, setEtape] = useState(0)
  const [choix, setChoix] = useState<string | null>(null)
  return (
    <div className="proto-guide" data-etape={etape}>
      {etape === 0 && <Bulle>À toi&nbsp;: lequel émet le plus de CO2e&nbsp;? Touche une carte.</Bulle>}
      <div className={etape <= 1 ? 'proto-guide__zone proto-guide__zone--focus' : 'proto-guide__zone'}>
        <Cartes
          etat={(id) => (etape === 0 ? 'question' : id === GAGNANT.id ? 'plus-emetteur' : id === choix ? 'mauvais-choix' : 'autre')}
          onChoisir={(id) => {
            if (etape > 0) return
            setChoix(id)
            setEtape(1)
          }}
        />
      </div>
      {etape >= 1 && (
        <>
          {etape === 1 && (
            <Bulle onSuivant={() => setEtape(2)}>
              <b>{choix === GAGNANT.id ? 'Bien vu !' : 'Raté, et tu n’es pas le seul !'}</b> La carte verte est celle qui émet le
              plus. Le badge dit combien de fois plus&nbsp;: ici ×{formaterMultiple(rapport(DUEL))}.
            </Bulle>
          )}
          <Equivalence />
          <div className={etape === 2 ? 'proto-guide__zone proto-guide__zone--focus' : 'proto-guide__zone'}>
            <TableauRepartition duel={DUEL} />
          </div>
          {etape === 2 && (
            <Bulle onSuivant={() => setEtape(3)}>
              Le tableau montre <b>d’où viennent les émissions</b>, étape par étape. Pour le steak, presque tout vient de l’élevage.
            </Bulle>
          )}
          {etape === 3 && (
            <Bulle onSuivant={onJouer} libelle="Jouer le Duel du jour">
              Les liens <b>Sources ADEME</b>, juste au-dessus, ouvrent la fiche de chaque geste. Une Partie, c’est 10 Duels de plus en
              plus serrés. À toi&nbsp;!
            </Bulle>
          )}
        </>
      )}
    </div>
  )
}

/** Le tutoriel, dans une fenêtre qui recouvre l'accueil. */
export function Tutoriel({ forme, ouvert, onFermer, onJouer }: { forme: FormeTutoriel; ouvert: boolean; onFermer: () => void; onJouer: () => void }) {
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
      {/* key : rouvrir le tutoriel repart de la première étape. */}
      {ouvert && (forme === 'diaporama' ? <Diaporama key="d" onJouer={jouer} /> : <DuelGuide key="g" onJouer={jouer} />)}
    </dialog>
  )
}
