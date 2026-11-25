/**
 * PROTOTYPE JETABLE (issue 122, à retirer avant la fusion) : le Taux d'erreur tourné vers « comme toi ».
 * Deuxième série (25/11), après les variantes A à D (commits 6756cb0 et fe39481) : Fabien préfère dire combien de
 * réponses vont dans le même sens que celle du joueur, sur une seule ligne, avec la répartition (barre ou camembert).
 * Trois variantes par ?variant=E, F ou G (hors de l'adresse publique). En mode prototype, les chiffres sont simulés
 * (dont 0 % et 100 %), en Partie libre aussi, pour pouvoir rejouer autant qu'on veut.
 */
import type { CSSProperties } from 'react'
import { cleDuDuel } from './domaine/taux-d-erreur.ts'
import type { DuelDePartie } from './domaine/partie.ts'
import { variantePrototype } from './composants/PrototypeSwitcher.tsx'

export const VARIANTES_TAUX = {
  E: 'Verdict + camembert + « 72 % comme toi »',
  F: 'Verdict + barre + « 72 % comme toi »',
  G: 'Une phrase « Raté, comme 72 % des réponses » + camembert',
} as const

export type VarianteTaux = keyof typeof VARIANTES_TAUX

/** La variante demandée par l'adresse, ou null hors prototype. */
export function varianteTaux(): VarianteTaux | null {
  const v = variantePrototype()
  return v && v in VARIANTES_TAUX ? (v as VarianteTaux) : null
}

/** Un faux Taux d'erreur, toujours le même pour une paire : quelques 0 % et 100 % pour voir les cas extrêmes. */
export function tauxSimule(duel: DuelDePartie): number {
  let h = 0
  for (const c of cleDuDuel(duel)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  if (h % 9 === 0) return 0
  if (h % 9 === 1) return 100
  return 8 + (h % 88)
}

/** La part des réponses qui vont dans le même sens que celle du joueur. */
export const partCommeToi = (bon: boolean, tauxDErreur: number) => (bon ? 100 - tauxDErreur : tauxDErreur)

const pct = (n: number) => `${n} %`

/** Un camembert de la hauteur du texte : la part « comme toi » dans la couleur du verdict, le reste en gris. */
function Camembert({ part, bon }: { part: number; bon: boolean }) {
  // Un cercle de circonférence 100 : le tiret mesure exactement la part en pour cent.
  const r = 100 / (2 * Math.PI)
  return (
    <svg viewBox="0 0 36 36" width="1em" height="1em" aria-hidden="true" style={{ verticalAlign: '-0.15em', flex: 'none' }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--ligne)" strokeWidth={2 * r} />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke={bon ? 'var(--bon)' : 'var(--mauvais)'}
        strokeWidth={2 * r}
        strokeDasharray={`${part} ${100 - part}`}
        transform="rotate(-90 18 18)"
      />
    </svg>
  )
}

/** Une barre fine de la hauteur du texte : la part « comme toi » dans la couleur du verdict. */
function Barre({ part, bon, largeur = 56 }: { part: number; bon: boolean; largeur?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ display: 'inline-flex', width: largeur, height: '0.5em', borderRadius: 99, overflow: 'hidden', background: 'var(--ligne)', flex: 'none' }}
    >
      <span style={{ width: `${part}%`, background: bon ? 'var(--bon)' : 'var(--mauvais)' }} />
    </span>
  )
}

/** La phrase de la variante G : verdict et comparaison en une seule phrase. */
function phraseG(bon: boolean, part: number): string {
  if (bon) {
    if (part === 0) return '✓ Bien vu : personne n’avait trouvé jusqu’ici !'
    if (part === 100) return '✓ Bien vu, comme toutes les réponses jusqu’ici'
    return `✓ Bien vu, comme ${pct(part)} des réponses`
  }
  if (part === 0) return '✗ Raté : jusqu’ici, toutes les réponses étaient bonnes'
  if (part === 100) return '✗ Raté, comme toutes les réponses jusqu’ici'
  return `✗ Raté, comme ${pct(part)} des réponses`
}

const ligne: CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.5em', flexWrap: 'nowrap', whiteSpace: 'nowrap' }
const complement: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.35em', fontSize: 15, fontWeight: 700, color: 'var(--encre)' }

/** Le verdict sur une ligne, selon la variante (à la place de « ✓ Bonne réponse ! » seul). */
export function VerdictCommeToi({ variante, bon, tauxDErreur }: { variante: VarianteTaux; bon: boolean; tauxDErreur: number }) {
  const part = partCommeToi(bon, tauxDErreur)
  const classe = `duel__verdict duel__verdict--${bon ? 'bon' : 'mauvais'}`
  const verdict = bon ? '✓ Bonne réponse !' : '✗ Raté !'
  if (variante === 'G') {
    return (
      <p className={classe} style={{ ...ligne, fontSize: 19 }}>
        {phraseG(bon, part)}
        <Camembert part={part} bon={bon} />
      </p>
    )
  }
  return (
    <p className={classe} style={ligne}>
      {verdict}
      <span style={complement}>
        {variante === 'E' ? <Camembert part={part} bon={bon} /> : <Barre part={part} bon={bon} />}
        {pct(part)} comme toi
      </span>
    </p>
  )
}

/** La même information dans une case du Récapitulatif : une ligne, petite. */
export function CaseCommeToi({ variante, bon, tauxDErreur }: { variante: VarianteTaux; bon: boolean; tauxDErreur: number }) {
  const part = partCommeToi(bon, tauxDErreur)
  return (
    <span className="recap__taux" style={{ ...ligne, gap: '0.35em' }}>
      {variante === 'F' ? <Barre part={part} bon={bon} largeur={36} /> : <Camembert part={part} bon={bon} />}
      {variante === 'G' ? `comme ${pct(part)} des réponses` : `${pct(part)} comme toi`}
    </span>
  )
}
