import { useRef, useState } from 'react'
import { PanneauDuel } from '../composants/PanneauDuel.tsx'
import { iconeDe } from '../donnees/icones.ts'
import { formaterMultiple, queDevant } from '../domaine/format.ts'
import { messageDeScore, type LigneRecapitulatif } from '../domaine/recapitulatif.ts'
import './EcranFin.css'

type Props = {
  /** Reçoit le titre, pour que la Partie puisse y placer le focus. */
  refTitre?: (element: HTMLElement | null) => void
  lignes: LigneRecapitulatif[]
  score: number
  total: number
  onRejouer: () => void
}

/** Fin de Partie : le score, un message, « Rejouer », puis le Récapitulatif des 10 Duels. */
export function EcranFin({ refTitre, lignes, score, total, onRejouer }: Props) {
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
    <section className="fin" aria-labelledby="fin-titre">
      <h2 id="fin-titre" ref={refTitre} tabIndex={-1}>
        Partie terminée !
      </h2>
      <p className="fin__score">
        {score}
        <span>/{total}</span>
      </p>
      <p className="fin__message">{messageDeScore(score, total)}</p>
      <button type="button" className="bouton" onClick={onRejouer}>
        Rejouer
      </button>

      <h3 id="recap-titre" className="fin__recap-titre">
        Récapitulatif
      </h3>
      <p className="fin__aide">Touche un Duel pour revoir son explication.</p>
      <ul className="recap" aria-labelledby="recap-titre">
        {lignes.map((ligne, i) => (
          <li key={ligne.numero}>
            <button
              ref={(element) => {
                cases.current[i] = element
              }}
              type="button"
              className={`recap__case recap__case--${ligne.bonne ? 'bon' : 'mauvais'}`}
              aria-haspopup="dialog"
              // Le nom lu par les lecteurs d'écran : des mots plutôt que des icônes.
              aria-label={`Duel ${ligne.numero}, ${ligne.bonne ? 'réussi' : 'raté'} : ${ligne.plus.titre} émet ${formaterMultiple(ligne.rapport)} fois plus ${queDevant(ligne.moins.titre)}`}
              onClick={() => setOuvert(i)}
            >
              <span className="recap__numero">
                {ligne.bonne ? '✓' : '✗'} Duel {ligne.numero}
              </span>
              <span className="recap__equivalence">
                1 {iconeDe(ligne.plus.id)} = {formaterMultiple(ligne.rapport)} {iconeDe(ligne.moins.id)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {ouvert !== null && <PanneauDuel key={ouvert} ligne={lignes[ouvert]} onFermer={fermer} />}
    </section>
  )
}
