import { Icone } from './Icone.tsx'
import { moinsEmetteur, plusEmetteur, rapport } from '../domaine/duel.ts'
import { formaterMultiple, queDevant } from '../domaine/format.ts'
import type { DuelDePartie } from '../domaine/partie.ts'
import { TableauRepartition } from './TableauRepartition.tsx'
import './ExplicationDuel.css'

/**
 * Le cœur pédagogique d'un Duel : l'équivalence « 1 🥩 = 10,8 🥑 », le texte d'un Duel thématique
 * s'il y en a un, puis le tableau comparatif (ordre du PRD).
 * Utilisé après chaque Duel (EcranDuel) et dans le détail du Récapitulatif (PanneauDuel).
 */
export function ExplicationDuel({ duel }: { duel: DuelDePartie }) {
  const plus = plusEmetteur(duel)
  const moins = moinsEmetteur(duel)
  const r = rapport(duel)
  return (
    <>
      <p className="equivalence">
        <span aria-hidden="true">
          1 <Icone id={plus.id} /> = {formaterMultiple(r)} <Icone id={moins.id} />
        </span>
        <small>
          {plus.titre} ({plus.sousTitre}) émet {formaterMultiple(r)} fois plus {queDevant(moins.titre)} (
          {moins.sousTitre}).
        </small>
      </p>
      {duel.thematique && (
        <div className="explication-thematique">
          <p className="explication-thematique__titre">
            <span aria-hidden="true">★ </span>
            {duel.thematique.titre}
          </p>
          <p className="explication-thematique__texte">{duel.thematique.texte}</p>
        </div>
      )}
      <TableauRepartition duel={duel} />
    </>
  )
}
