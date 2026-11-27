/**
 * PROTOTYPE (issue 111, jamais fusionné ; reprise du prototype de l'issue 122) : la barre flottante qui passe d'une
 * variante à l'autre, par l'adresse (?variant=A, B ou C) ou les flèches ← →. En local et sur l'aperçu de la branche seulement :
 * sur l'adresse publique du jeu, variantePrototype() rend toujours null.
 */
import { useEffect } from 'react'
import { estAdresseMesuree } from '../navigateur/mesure.ts'

export function variantePrototype(): string | null {
  if (typeof window === 'undefined' || estAdresseMesuree(window.location.hostname)) return null
  return new URLSearchParams(window.location.search).get('variant')
}

export function PrototypeSwitcher({
  variantes,
  courante,
  onChange,
}: {
  variantes: Record<string, string>
  courante: string
  onChange: (variante: string) => void
}) {
  const cles = Object.keys(variantes)
  // Sans recharger la page : l'écran de fin (et sa Partie) reste affiché.
  const aller = (pas: number) => {
    const suivante = cles[(cles.indexOf(courante) + pas + cles.length) % cles.length]
    const adresse = new URL(window.location.href)
    adresse.searchParams.set('variant', suivante)
    window.history.replaceState(window.history.state, '', adresse)
    onChange(suivante)
  }
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]')) return
      if (e.key === 'ArrowLeft') aller(-1)
      if (e.key === 'ArrowRight') aller(1)
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  })
  return (
    <div
      style={{
        position: 'fixed',
        // Au-dessus des boutons collés en bas (« Retour au jeu », « Duel suivant »).
        bottom: 96,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '8px 14px',
        borderRadius: 999,
        background: '#111',
        color: '#fff',
        boxShadow: '0 4px 16px rgba(0,0,0,.35)',
        zIndex: 1000,
        fontSize: 14,
        whiteSpace: 'nowrap',
      }}
    >
      <button type="button" onClick={() => aller(-1)} aria-label="Variante précédente">
        ←
      </button>
      <strong>
        {courante} ({variantes[courante]})
      </strong>
      <button type="button" onClick={() => aller(1)} aria-label="Variante suivante">
        →
      </button>
    </div>
  )
}
