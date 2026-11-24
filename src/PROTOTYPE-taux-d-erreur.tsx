/**
 * PROTOTYPE JETABLE (issue 122, à retirer avant la fusion) : où placer le Taux d'erreur ?
 * Quatre variantes, sur le vrai écran du Duel et le vrai Récapitulatif, par ?variant=A, B, C ou D (hors de
 * l'adresse publique). En mode prototype, les chiffres sont simulés (dont 0 % et 100 %), en Partie libre aussi,
 * pour pouvoir rejouer autant qu'on veut.
 */
import { cleDuDuel } from './domaine/taux-d-erreur.ts'
import type { DuelDePartie } from './domaine/partie.ts'
import { variantePrototype } from './composants/PrototypeSwitcher.tsx'

export const VARIANTES_TAUX = {
  A: 'Sous le verdict',
  B: 'Dans le badge entre les cartes',
  C: 'Une jauge sous le verdict',
  D: 'Dans la phrase du verdict',
} as const

export type VarianteTaux = keyof typeof VARIANTES_TAUX

/** La variante demandée par l'adresse, ou null hors prototype. */
export function varianteTaux(): VarianteTaux | null {
  const v = variantePrototype()
  return v && v in VARIANTES_TAUX ? (v as VarianteTaux) : null
}

/** Un faux Taux d'erreur, toujours le même pour une paire : quelques 0 % et 100 % pour voir les phrases extrêmes. */
export function tauxSimule(duel: DuelDePartie): number {
  let h = 0
  for (const c of cleDuDuel(duel)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  if (h % 9 === 0) return 0
  if (h % 9 === 1) return 100
  return 8 + (h % 88)
}

/** La jauge de la variante C : la part rouge des réponses fausses, la part verte des bonnes. */
export function Jauge({ taux, compacte = false }: { taux: number; compacte?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'flex',
        height: compacte ? 6 : 10,
        marginTop: compacte ? 6 : 8,
        borderRadius: 99,
        overflow: 'hidden',
        background: 'var(--bon)',
      }}
    >
      <span style={{ width: `${taux}%`, background: 'var(--mauvais)' }} />
    </span>
  )
}

/** La phrase de la variante D, qui fond le chiffre dans le verdict, selon la réponse. */
export function phraseDuVerdict(bon: boolean, taux: number): string {
  if (bon) {
    if (taux === 0) return 'Comme tout le monde jusqu’ici : aucune réponse fausse sur ce Duel.'
    if (taux >= 50) return `Bien vu : ${taux} % des réponses à ce Duel sont fausses.`
    return `${taux} % des réponses à ce Duel sont fausses.`
  }
  if (taux === 0) return 'Piégé : jusqu’ici, aucune autre réponse fausse sur ce Duel.'
  if (taux === 100) return 'Pas de panique : toutes les réponses à ce Duel sont fausses.'
  if (taux >= 50) return `Pas de panique : ${taux} % des réponses à ce Duel sont fausses.`
  return `Piégé : seulement ${taux} % des réponses à ce Duel sont fausses.`
}
