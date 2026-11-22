import { siteDuLien, type ConseilAffiche } from '../domaine/conseils.ts'
import { mesurer } from '../navigateur/mesure.ts'
import './Conseil.css'

/**
 * Le Conseil de fin de Partie (issue 88) : une action chiffrée, liée à un Geste de la Partie, et un lien vers la page
 * de l'ADEME qui en dit plus. Le lien s'ouvre dans un nouvel onglet, comme les fiches Impact CO2 des explications :
 * le joueur garde son écran de fin.
 *
 * Le clic sur le lien est compté (`conseil/lien`) : c'est ce qui dit si les Conseils intéressent.
 * `onLien` remplace la mesure dans les tests.
 */
export function Conseil({ conseil, onLien = () => mesurer('conseil/lien') }: { conseil: ConseilAffiche; onLien?: () => void }) {
  const site = siteDuLien(conseil.lien.url)
  return (
    <aside className="conseil" aria-labelledby="conseil-titre">
      <h3 id="conseil-titre">
        <span aria-hidden="true">💡 </span>Un conseil
      </h3>
      <p>{conseil.texte}</p>
      <p className="conseil__lien">
        {/* Le nom du lien dit où il mène : « En savoir plus sur Nos Gestes Climat », distinct du lien du pied de page. */}
        <a href={conseil.lien.url} target="_blank" rel="noopener noreferrer" onClick={onLien}>
          En savoir plus sur {site}
        </a>
        <span className="conseil__page"> : « {conseil.lien.titre} » (ADEME)</span>
      </p>
    </aside>
  )
}
