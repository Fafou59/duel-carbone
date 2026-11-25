/**
 * « ▬▬▭ 72 % comme toi » : la part des réponses qui vont dans le même sens que celle du joueur (ADR 0006,
 * variante F du prototype du 25/11). Une petite barre de la hauteur du texte, dans la couleur du verdict (vert s'il
 * a trouvé, rouge sinon), puis le pourcentage. Tout tient sur une ligne, à côté du verdict ou dans une case du
 * Récapitulatif (version `petite`).
 */
import { partCommeToi, phraseCommeToi } from '../domaine/taux-d-erreur.ts'
import './CommeToi.css'

export function CommeToi({ bon, taux, petite = false }: { bon: boolean; taux: number; petite?: boolean }) {
  const part = partCommeToi(bon, taux)
  return (
    <span className={petite ? 'comme-toi comme-toi--petite' : 'comme-toi'}>
      {/* La barre ne fait que redire le pourcentage : les lecteurs d'écran ne lisent que le texte. */}
      <span className="comme-toi__barre" aria-hidden="true">
        <span className={`comme-toi__part comme-toi__part--${bon ? 'bon' : 'mauvais'}`} style={{ width: `${part}%` }} />
      </span>
      <span className="visuellement-cache">, </span>
      {phraseCommeToi(part)}
      <span className="visuellement-cache"> (part des réponses identiques à la tienne)</span>
    </span>
  )
}
