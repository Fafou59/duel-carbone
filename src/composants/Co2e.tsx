import { useRef } from 'react'
import { createPortal } from 'react-dom'
import './Co2e.css'

/**
 * La définition du CO2e, en deux temps : ce que c'est, puis un exemple concret et ce que couvrent les chiffres.
 * Utilisée dans la fenêtre de l'accueil et dans la page Sources et méthode (où ses titres descendent d'un niveau).
 */
export function DefinitionCo2e({ niveau: Titre = 'h3' }: { niveau?: 'h3' | 'h4' }) {
  return (
    <div className="definition-co2e">
      <section>
        <Titre>Le CO2e, c’est quoi ?</Titre>
        <p>
          L’« équivalent CO2 » : l’unité qui additionne tous les gaz à effet de serre (CO2, méthane, protoxyde d’azote…)
          selon leur effet sur le climat.
        </p>
      </section>
      <section>
        <Titre>Par exemple</Titre>
        <p>Sur 100 ans, 1 kg de méthane réchauffe autant qu’environ 30 kg de CO2 : il compte pour 30 kg CO2e.</p>
        <p>Dans le jeu, les chiffres couvrent toute la vie d’un geste : fabrication, transport, usage et fin de vie.</p>
      </section>
    </div>
  )
}

/**
 * « CO2e » suivi d'une pastille « ? » qui ouvre la définition. Un vrai bouton : le clavier et les lecteurs d'écran
 * y accèdent, et la fenêtre (<dialog>) se ferme avec Échap.
 * La fenêtre est rendue hors de la phrase (createPortal) : sinon, elle hériterait du style du texte qui l'entoure,
 * et une <dialog> n'a pas sa place dans un paragraphe.
 */
export function Co2e() {
  const fenetre = useRef<HTMLDialogElement>(null)
  return (
    <>
      {/* « CO2e » et sa pastille restent sur la même ligne. */}
      <span className="co2e">
        <abbr title="équivalent CO2">CO2e</abbr>
        <button type="button" className="co2e__pastille" aria-label="Qu’est-ce que le CO2e ?" onClick={() => fenetre.current?.showModal()}>
          ?
        </button>
      </span>
      {createPortal(
        <dialog ref={fenetre} className="fenetre co2e__fenetre" aria-label="Définition du CO2e">
          <DefinitionCo2e />
          <button type="button" className="bouton" onClick={() => fenetre.current?.close()}>
            Compris
          </button>
        </dialog>,
        document.body,
      )}
    </>
  )
}
