/**
 * PROTOTYPE (jetable) : l'écran projeté de l'Animateur, sur l'adresse #prototype-animateur.
 * Deuxième tour : un seul écran, qui reprend les retours de Fabien sur les variantes A, B et C du premier tour.
 * Les deux variantes ne diffèrent que par l'accès au détail des émissions :
 *   ?variant=1 : un bouton « Voir le détail » ouvre une fenêtre par-dessus ;
 *   ?variant=2 : le détail est sous les Gestes, l'Animateur fait défiler la page (comme sur téléphone).
 * L'étape se choisit par la barre noire, ou par le bouton de l'Animateur (Espace). La salle est fictive.
 */
import { useEffect, useMemo, useState } from 'react'
import { creerSeanceFactice, type SeanceFactice } from './seance-factice.ts'
import { EcranAnimateur } from './EcranAnimateur.tsx'
import './prototype-animateur.css'

export type Phase = 'attente' | 'duel' | 'revelation' | 'classement' | 'fin'
export type Etape = { phase: Phase; n: number }
export type AccesDetail = 'bouton' | 'defilement'

export type PropsEcran = {
  seance: SeanceFactice
  etape: Etape
  /** Combien de Participants ont répondu au Duel en cours (simulé, monte tout seul). */
  repondus: number
  /** Le bouton principal de l'Animateur à cette étape. */
  action: { libelle: string; faire: () => void } | null
  detail: AccesDetail
}

const VARIANTES = [
  { cle: '1', nom: 'Détail par un bouton', detail: 'bouton' as const },
  { cle: '2', nom: 'Détail en faisant défiler', detail: 'defilement' as const },
]

// Après le Duel 10, pas de classement intermédiaire : on garde la surprise pour le classement final.
function suivante(e: Etape): Etape {
  if (e.phase === 'attente') return { phase: 'duel', n: 0 }
  if (e.phase === 'duel') return { phase: 'revelation', n: e.n }
  if (e.phase === 'revelation') return e.n === 9 ? { phase: 'fin', n: 9 } : { phase: 'classement', n: e.n }
  if (e.phase === 'classement') return { phase: 'duel', n: e.n + 1 }
  return e
}

function libelle(e: Etape): string | null {
  if (e.phase === 'attente') return 'Lancer le premier Duel'
  if (e.phase === 'duel') return 'Révéler la réponse'
  if (e.phase === 'revelation') return e.n === 9 ? 'Voir le classement final' : 'Voir le classement'
  if (e.phase === 'classement') return `Duel ${e.n + 2}`
  return null
}

const lireVariante = () => {
  const v = new URLSearchParams(window.location.search).get('variant')
  return VARIANTES.some((x) => x.cle === v) ? v! : '1'
}

export function PrototypeAnimateur() {
  const seance = useMemo(() => creerSeanceFactice(), [])
  const [variante, setVariante] = useState(lireVariante)
  const [etape, setEtape] = useState<Etape>({ phase: 'attente', n: 0 })
  const [repondus, setRepondus] = useState(0)

  // Les réponses arrivent une à une pendant le Duel (simulation) ; à la révélation, tout le monde a répondu.
  useEffect(() => {
    if (etape.phase !== 'duel') return
    let r = 0
    const minuterie = setInterval(() => setRepondus(Math.min(++r, seance.participants.length)), 300)
    return () => {
      clearInterval(minuterie)
      setRepondus(seance.participants.length)
    }
  }, [etape, seance])

  const changerVariante = (pas: number) => {
    const i = VARIANTES.findIndex((v) => v.cle === variante)
    const cle = VARIANTES[(i + pas + VARIANTES.length) % VARIANTES.length].cle
    const adresse = new URL(window.location.href)
    adresse.searchParams.set('variant', cle)
    window.history.replaceState(null, '', adresse)
    setVariante(cle)
  }

  const avancer = () => {
    setRepondus(0)
    setEtape(suivante)
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('dialog, select')) return
      if (e.key === 'ArrowLeft') changerVariante(-1)
      if (e.key === 'ArrowRight') changerVariante(1)
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault()
        avancer()
      }
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  })

  const { nom, detail } = VARIANTES.find((v) => v.cle === variante) ?? VARIANTES[0]
  const texte = libelle(etape)
  const action = texte ? { libelle: texte, faire: avancer } : null

  const aller = (valeur: string) => {
    const [phase, n] = valeur.split(':')
    setRepondus(phase === 'duel' ? 0 : seance.participants.length)
    setEtape({ phase: phase as Phase, n: Number(n) })
    window.scrollTo(0, 0)
  }

  return (
    <div className="pa">
      <EcranAnimateur seance={seance} etape={etape} repondus={repondus} action={action} detail={detail} />
      <div className="pa-barre" role="toolbar" aria-label="Prototype : choix de la variante et de l’étape">
        <button type="button" onClick={() => changerVariante(-1)} aria-label="Variante précédente">
          ←
        </button>
        <span>
          {variante} ({nom})
        </span>
        <button type="button" onClick={() => changerVariante(1)} aria-label="Variante suivante">
          →
        </button>
        <select value={`${etape.phase}:${etape.n}`} onChange={(e) => aller(e.target.value)} aria-label="Étape de la Séance">
          <option value="attente:0">Attente des Participants</option>
          {seance.duels.map((d, n) => (
            <optgroup key={n} label={`Duel ${n + 1}${d.thematique ? ' (thématique)' : ''}`}>
              <option value={`duel:${n}`}>Duel {n + 1} : question</option>
              <option value={`revelation:${n}`}>Duel {n + 1} : révélation</option>
              {n < 9 && <option value={`classement:${n}`}>Duel {n + 1} : classement</option>}
            </optgroup>
          ))}
          <option value="fin:9">Classement final</option>
        </select>
      </div>
    </div>
  )
}
