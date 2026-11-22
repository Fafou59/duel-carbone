import type { RangDuJour as Rang } from '../domaine/rang-du-jour.ts'
import { DERNIERS, RangPrototype } from '../PROTOTYPE-rang-du-jour/prototype.tsx'
import './RangDuJour.css'

/** PROTOTYPE : le Rang du jour dans la variante choisie (?variant=A|B|C). */
export function RangDuJour({ rang }: { rang: Rang | null }) {
  return <RangPrototype rang={rang} effectifs={DERNIERS.effectifs} score={DERNIERS.score} />
}
