import { useRef, useState, type ReactNode } from 'react'
import { formaterMultiple, queDevant } from '../domaine/format.ts'
import type { LigneRecapitulatif } from '../domaine/recapitulatif.ts'
import { Icone } from './Icone.tsx'
import { PanneauDuel } from './PanneauDuel.tsx'
import './Recapitulatif.css'

type Props = {
  lignes: LigneRecapitulatif[]
  /** Ce qu'une case ajoute sous l'équivalence (« 72 % comme toi »), ou rien. */
  complement?: (ligne: LigneRecapitulatif) => ReactNode
}

/**
 * Le Récapitulatif des 10 Duels, à la fin d'une Partie (EcranFin) ou d'une Séance (le téléphone du Participant) :
 * une case par Duel, réussi ou raté, et chaque case ouvre le détail de son Duel (PanneauDuel).
 */
export function Recapitulatif({ lignes, complement = () => null }: Props) {
  // Position (0 à 9) du Duel dont le détail est ouvert, ou null si le panneau est fermé.
  const [ouvert, setOuvert] = useState<number | null>(null)
  // Les 10 cases, pour rendre le focus à celle qu'on vient de consulter.
  const cases = useRef<(HTMLButtonElement | null)[]>([])

  const fermer = () => {
    if (ouvert === null) return
    setOuvert(null)
    cases.current[ouvert]?.focus()
  }

  return (
    <>
      <h3 id="recap-titre" className="recap__titre">
        Récapitulatif
      </h3>
      <p className="recap__aide">Touche un Duel pour revoir son explication.</p>
      <ul className="recap" aria-labelledby="recap-titre">
        {lignes.map((ligne, i) => {
          const plus = complement(ligne)
          // Un Duel d'une Séance auquel le Participant n'a pas répondu compte comme raté.
          const etat = ligne.bonne ? 'réussi' : ligne.idChoisi === null ? 'sans réponse' : 'raté'
          return (
            <li key={ligne.numero}>
              <button
                ref={(element) => {
                  cases.current[i] = element
                }}
                type="button"
                className={`recap__case recap__case--${ligne.bonne ? 'bon' : 'mauvais'}`}
                aria-haspopup="dialog"
                onClick={() => setOuvert(i)}
              >
                {/* Le nom lu par les lecteurs d'écran vient du texte de la case : « Duel 1 (réussi) : … émet … fois
                    plus que … ». Les symboles et les icônes sont remplacés par des mots (texte caché), mais le nom
                    commence par ce qu'on voit (« Duel 1 ») : on peut désigner la case à la voix. */}
                <span className="recap__numero">
                  <span aria-hidden="true">{ligne.bonne ? '✓' : '✗'} </span>Duel {ligne.numero}
                  <span className="visuellement-cache">
                    {' '}
                    ({etat}) : {ligne.plus.titre} émet {formaterMultiple(ligne.rapport)} fois plus {queDevant(ligne.moins.titre)}
                  </span>
                </span>
                <span className="recap__equivalence" aria-hidden="true">
                  1 <Icone id={ligne.plus.id} /> = {formaterMultiple(ligne.rapport)} <Icone id={ligne.moins.id} />
                </span>
                {plus && <span className="recap__taux">{plus}</span>}
              </button>
            </li>
          )
        })}
      </ul>

      {ouvert !== null && <PanneauDuel key={ouvert} ligne={lignes[ouvert]} onFermer={fermer} />}
    </>
  )
}
