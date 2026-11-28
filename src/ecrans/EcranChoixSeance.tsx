import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { ADRESSES } from '../navigateur/adresse.ts'
import './EcranChoixSeance.css'

/**
 * « Animer ou rejoindre une Séance » (#seance), ouverte par le lien du pied de page : deux chemins vers le Mode
 * animation (décidé par Fabien le 28/11). Le Participant qui a un code le tape ici ; l'Animateur va créer sa Séance.
 *
 * Le code n'est pas vérifié ici : la page du téléphone (#rejoindre/<code>) le met au propre, demande au serveur si la
 * Séance existe et le dit. Cette page reste ainsi légère : elle fait partie du jeu, que tout le monde télécharge,
 * alors que le code des Séances n'est chargé qu'en rejoignant ou en animant.
 */
export function EcranChoixSeance() {
  const titre = useRef<HTMLHeadingElement>(null)
  const [code, setCode] = useState('')
  const id = useId()

  // À l'ouverture de la page, le lecteur d'écran (et le clavier) partent de son titre.
  useEffect(() => titre.current?.focus(), [])

  const rejoindre = (evenement: FormEvent) => {
    evenement.preventDefault()
    const propre = code.replace(/[\s-]/g, '')
    window.location.hash = propre ? `${ADRESSES.rejoindre}/${encodeURIComponent(propre)}` : ADRESSES.rejoindre
  }

  return (
    <article className="choix-seance" aria-labelledby={`${id}-titre`}>
      <h2 id={`${id}-titre`} ref={titre} tabIndex={-1}>
        Animer ou rejoindre une Séance
      </h2>
      <p className="choix-seance__chapo">
        Une Séance fait jouer toute une salle en direct : l’Animateur projette les Duels, chacun répond sur son téléphone.
      </p>

      <section className="choix-seance__carte" aria-labelledby={`${id}-code`}>
        <h3 id={`${id}-code`}>
          <span aria-hidden="true">📱 </span>J’ai un code
        </h3>
        <form onSubmit={rejoindre}>
          <label htmlFor={`${id}-saisie`}>Le code affiché sur l’écran de la Séance</label>
          <div className="choix-seance__ligne">
            <input
              id={`${id}-saisie`}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={10}
              placeholder="K7RM4P"
            />
            <button type="submit" className="bouton">
              Rejoindre
            </button>
          </div>
        </form>
      </section>

      <section className="choix-seance__carte" aria-labelledby={`${id}-animer`}>
        <h3 id={`${id}-animer`}>
          <span aria-hidden="true">🖥️ </span>J’anime
        </h3>
        <p>
          Pour un atelier, une Fresque du Climat ou une réunion d’équipe : crée une Séance sur ton ordinateur et
          projette-la. Gratuit, sans compte.
        </p>
        <a className="bouton bouton--secondaire" href={ADRESSES.animer}>
          Créer une Séance
        </a>
      </section>

      <p>
        <a href={ADRESSES.jeu}>← Retour au jeu</a>
      </p>
    </article>
  )
}
