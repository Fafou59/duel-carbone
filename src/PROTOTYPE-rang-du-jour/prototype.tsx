/**
 * PROTOTYPE JETABLE (branche prototype/rang-du-jour, jamais mergée) : à quoi doit ressembler le Rang du jour ?
 * Trois variantes, sur le vrai écran de fin du Duel du jour et le vrai accueil, choisies par ?variant=A|B|C :
 *   A · La phrase seule
 *   B · La phrase + un graphique en 11 barres (combien de joueurs ont fait 0, 1… 10)
 *   C · La phrase + 10 silhouettes (« sur 10 joueurs, tu fais mieux ou autant que 7 »)
 * Un faux serveur répond toujours (environ 200 joueurs du jour) ; la barre du bas change de variante et simule
 * un Duel du jour déjà joué avec le score de son choix (pour voir toutes les phrases sur l'accueil).
 */
import { useEffect, useState } from 'react'
import { jourDeParis } from '../domaine/jour.ts'
import { phraseDuRang, type Effectifs, type RangDuJour } from '../domaine/rang-du-jour.ts'
import { CLE_MEMOIRE, creerMemoire } from '../navigateur/memoire.ts'
import type { ServeurDuRang } from '../navigateur/rang-du-jour.ts'
import './prototype.css'

/** Les derniers Effectifs et le score, notés par App (raccourci de prototype). */
export const DERNIERS: { effectifs?: Effectifs; score?: number } = {}

/** Les joueurs du jour, sans le joueur (environ 200, la plupart entre 5 et 7). */
const AUTRES: Effectifs = [1, 3, 7, 15, 26, 38, 44, 37, 24, 12, 5]

/** Le faux serveur : il ajoute le joueur dans la case de son score (lu dans la mémoire, ou recalculé à la fin). */
export const FAUX_SERVEUR: ServeurDuRang = {
  envoyer: async (_numero, choix) => {
    await new Promise((r) => setTimeout(r, 400))
    // Le vrai serveur recalcule le score ; ici, on le relit dans la mémoire, qui vient de l'enregistrer.
    const score = creerMemoire().partieDuJour(jourDeParis(new Date()))?.score ?? choix.length % 11
    return avecLeJoueur(score)
  },
  lire: async () => {
    await new Promise((r) => setTimeout(r, 400))
    const score = creerMemoire().partieDuJour(jourDeParis(new Date()))?.score
    return score == null ? AUTRES : avecLeJoueur(score)
  },
}
const avecLeJoueur = (score: number) => AUTRES.map((n, s) => (s === score ? n + 1 : n))

export const VARIANTES = { A: 'La phrase seule', B: '11 barres', C: '10 silhouettes' } as const
type Variante = keyof typeof VARIANTES
const lireVariante = (): Variante => {
  const v = new URLSearchParams(window.location.search).get('variant')
  return v === 'B' || v === 'C' ? v : 'A'
}

/** Le Rang du jour, dans la variante choisie. */
export function RangPrototype({ rang, effectifs, score }: { rang: RangDuJour | null; effectifs?: Effectifs; score?: number }) {
  const variante = lireVariante()
  if (!rang) return <div className="rang-du-jour" aria-live="polite" />
  const phrase = <p className="rang-du-jour__phrase">{phraseDuRang(rang)}</p>
  return (
    <div className="rang-du-jour" aria-live="polite">
      {phrase}
      {variante === 'B' && effectifs && score !== undefined && <Barres effectifs={effectifs} score={score} />}
      {variante === 'C' && <Silhouettes rang={rang} />}
    </div>
  )
}

function Barres({ effectifs, score }: { effectifs: Effectifs; score: number }) {
  const max = Math.max(...effectifs, 1)
  const total = effectifs.reduce((a, b) => a + b, 0)
  const description = effectifs.map((n, s) => `${n} à ${s}/10`).join(', ')
  return (
    <figure className="proto-barres">
      <div className="proto-barres__graphique" role="img" aria-label={`Scores des ${total} joueurs du jour : ${description}`}>
        {effectifs.map((n, s) => (
          <div key={s} className={`proto-barres__colonne${s === score ? ' proto-barres__colonne--toi' : ''}`}>
            {s === score && <span className="proto-barres__toi">toi</span>}
            <span className="proto-barres__barre" style={{ height: `${Math.max(2, (n / max) * 100)}%` }} />
            <span className="proto-barres__score">{s}</span>
          </div>
        ))}
      </div>
      <figcaption>
        {total} joueurs aujourd’hui, par score sur 10
      </figcaption>
    </figure>
  )
}

function Silhouettes({ rang }: { rang: RangDuJour }) {
  const pleines = rang.type === 'encouragement' ? 0 : Math.round(rang.pourcentage / 10)
  const legende =
    rang.type === 'sansFaute'
      ? `Sur 10 joueurs, ${pleines} ont aussi fait un sans-faute`
      : `Sur 10 joueurs, tu fais mieux ou autant que ${pleines}`
  return (
    <figure className="proto-silhouettes">
      <p className="proto-silhouettes__rangee" role="img" aria-label={legende}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={i < pleines ? 'proto-silhouettes__pleine' : 'proto-silhouettes__vide'} aria-hidden="true">
            ●
          </span>
        ))}
      </p>
      <figcaption>{legende}</figcaption>
    </figure>
  )
}

/** La barre flottante du prototype : variante (← →) et score simulé du Duel du jour. */
export function BasculePrototype() {
  const [variante, setVariante] = useState(lireVariante)
  const cles = Object.keys(VARIANTES) as Variante[]
  const aller = (pas: number) => {
    const suivante = cles[(cles.indexOf(variante) + pas + cles.length) % cles.length]
    const url = new URL(window.location.href)
    url.searchParams.set('variant', suivante)
    window.history.replaceState(null, '', url)
    setVariante(suivante)
    window.dispatchEvent(new Event('prototype-variante'))
  }
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]')) return
      if (e.key === 'ArrowLeft') aller(-1)
      if (e.key === 'ArrowRight') aller(1)
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  })
  const simuler = (score: number | null) => {
    const jour = jourDeParis(new Date())
    if (score === null) localStorage.removeItem(CLE_MEMOIRE)
    else {
      const memoire = creerMemoire()
      memoire.terminerPartieDuJour(jour, score)
      memoire.noterScoreCompte(jour)
    }
    window.location.hash = ''
    window.location.reload()
  }
  return (
    <div className="proto-bascule" role="toolbar" aria-label="Prototype">
      <button type="button" onClick={() => aller(-1)} aria-label="Variante précédente">
        ←
      </button>
      <span>
        {variante} · {VARIANTES[variante]}
      </span>
      <button type="button" onClick={() => aller(1)} aria-label="Variante suivante">
        →
      </button>
      <select
        aria-label="Simuler un Duel du jour joué"
        value=""
        onChange={(e) => simuler(e.target.value === 'effacer' ? null : Number(e.target.value))}
      >
        <option value="">Simuler…</option>
        {Array.from({ length: 11 }, (_, s) => (
          <option key={s} value={s}>
            Accueil, joué {s}/10
          </option>
        ))}
        <option value="effacer">Effacer (rejouer le Duel du jour)</option>
      </select>
    </div>
  )
}

/** Redessine l'application quand la variante change. */
export function useVarianteDuPrototype() {
  const [, setN] = useState(0)
  useEffect(() => {
    const redessiner = () => setN((n) => n + 1)
    window.addEventListener('prototype-variante', redessiner)
    return () => window.removeEventListener('prototype-variante', redessiner)
  }, [])
}
