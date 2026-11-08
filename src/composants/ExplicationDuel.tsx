import { iconeDe } from '../donnees/icones.ts'
import { moinsEmetteur, plusEmetteur, rapport, type Duel } from '../domaine/duel.ts'
import { formaterMultiple, queDevant } from '../domaine/format.ts'
import { TableauRepartition } from './TableauRepartition.tsx'
import './ExplicationDuel.css'

/**
 * Le cœur pédagogique d'un Duel : l'équivalence « 1 🥩 = 10,8 🥑 », puis le tableau comparatif.
 * Utilisé après chaque Duel (EcranDuel) et dans le détail du Récapitulatif (PanneauDuel).
 */
export function ExplicationDuel({ duel }: { duel: Duel }) {
  const plus = plusEmetteur(duel)
  const moins = moinsEmetteur(duel)
  const r = rapport(duel)
  return (
    <>
      <p className="equivalence">
        <span aria-hidden="true">
          1 {iconeDe(plus.id)} = {formaterMultiple(r)} {iconeDe(moins.id)}
        </span>
        <small>
          {plus.titre} ({plus.sousTitre}) émet {formaterMultiple(r)} fois plus {queDevant(moins.titre)} (
          {moins.sousTitre}).
        </small>
      </p>
      <TableauRepartition duel={duel} />
    </>
  )
}
