/**
 * PROTOTYPE (jetable) : trois variantes de l'écran projeté de l'Animateur, sur l'adresse #prototype-animateur.
 * Question : « À quoi doit ressembler l'écran que l'Animateur projette pendant une Séance ? »
 * La variante se choisit par ?variant=A|B|C (barre flottante, ou flèches ← →) ; l'étape de la Séance par la même barre,
 * ou par le bouton de l'Animateur (Espace). Aucune donnée n'est envoyée : la salle est fictive.
 */
import { useEffect, useMemo, useState } from 'react'
import { creerSeanceFactice, type SeanceFactice } from './seance-factice.ts'
import { VarianteScene } from './VarianteScene.tsx'
import { VariantePlateau } from './VariantePlateau.tsx'
import { VarianteSalle } from './VarianteSalle.tsx'
import './prototype-animateur.css'

export type Phase = 'attente' | 'duel' | 'revelation' | 'classement' | 'fin'
export type Etape = { phase: Phase; n: number }

export type PropsVariante = {
  seance: SeanceFactice
  etape: Etape
  /** Combien de Participants ont répondu au Duel en cours (simulé, monte tout seul). */
  repondus: number
  /** Le libellé du bouton principal de l'Animateur à cette étape, et son action. */
  action: { libelle: string; faire: () => void } | null
}

const VARIANTES = [
  { cle: 'A', nom: 'Scène', Composant: VarianteScene },
  { cle: 'B', nom: 'Plateau et colonne', Composant: VariantePlateau },
  { cle: 'C', nom: 'La salle d’abord', Composant: VarianteSalle },
]

function suivante(e: Etape): Etape {
  if (e.phase === 'attente') return { phase: 'duel', n: 0 }
  if (e.phase === 'duel') return { phase: 'revelation', n: e.n }
  if (e.phase === 'revelation') return { phase: 'classement', n: e.n }
  if (e.phase === 'classement') return e.n === 9 ? { phase: 'fin', n: 9 } : { phase: 'duel', n: e.n + 1 }
  return e
}

function libelle(e: Etape): string | null {
  if (e.phase === 'attente') return 'Lancer le premier Duel'
  if (e.phase === 'duel') return 'Révéler la réponse'
  if (e.phase === 'revelation') return 'Voir le classement'
  if (e.phase === 'classement') return e.n === 9 ? 'Résultats de la Séance' : `Duel ${e.n + 2}`
  return null
}

const lireVariante = () => new URLSearchParams(window.location.search).get('variant') ?? 'A'

export function PrototypeAnimateur() {
  const seance = useMemo(() => creerSeanceFactice(), [])
  const [variante, setVariante] = useState(lireVariante)
  const [etape, setEtape] = useState<Etape>({ phase: 'attente', n: 0 })
  const [repondus, setRepondus] = useState(0)

  // Les réponses arrivent une à une pendant le Duel (simulation).
  useEffect(() => {
    if (etape.phase !== 'duel') return
    setRepondus(0)
    const minuterie = setInterval(() => setRepondus((r) => Math.min(r + 1, seance.participants.length - 2)), 350)
    return () => clearInterval(minuterie)
  }, [etape, seance])

  const changerVariante = (pas: number) => {
    const i = VARIANTES.findIndex((v) => v.cle === variante)
    const cle = VARIANTES[(i + pas + VARIANTES.length) % VARIANTES.length].cle
    const adresse = new URL(window.location.href)
    adresse.searchParams.set('variant', cle)
    window.history.replaceState(null, '', adresse)
    setVariante(cle)
  }

  const avancer = () => setEtape(suivante)

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
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

  const { Composant, nom } = VARIANTES.find((v) => v.cle === variante) ?? VARIANTES[0]
  const texte = libelle(etape)
  const action = texte ? { libelle: texte, faire: avancer } : null

  const aller = (valeur: string) => {
    const [phase, n] = valeur.split(':')
    setEtape({ phase: phase as Phase, n: Number(n) })
  }

  return (
    <div className="pa">
      <Composant seance={seance} etape={etape} repondus={repondus} action={action} />
      <div className="pa-barre" role="toolbar" aria-label="Prototype : choix de la variante et de l’étape">
        <button type="button" onClick={() => changerVariante(-1)} aria-label="Variante précédente">←</button>
        <span>
          {variante} ({nom})
        </span>
        <button type="button" onClick={() => changerVariante(1)} aria-label="Variante suivante">→</button>
        <select value={`${etape.phase}:${etape.n}`} onChange={(e) => aller(e.target.value)} aria-label="Étape de la Séance">
          <option value="attente:0">Attente des Participants</option>
          {seance.duels.map((d, n) => (
            <optgroup key={n} label={`Duel ${n + 1}${d.thematique ? ' (thématique)' : ''}`}>
              <option value={`duel:${n}`}>Duel {n + 1} : question</option>
              <option value={`revelation:${n}`}>Duel {n + 1} : révélation</option>
              <option value={`classement:${n}`}>Duel {n + 1} : classement</option>
            </optgroup>
          ))}
          <option value="fin:9">Fin de la Séance</option>
        </select>
      </div>
    </div>
  )
}
