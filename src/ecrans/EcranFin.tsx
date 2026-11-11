import { useRef, useState } from 'react'
import { PanneauDuel } from '../composants/PanneauDuel.tsx'
import { Icone } from '../composants/Icone.tsx'
import { formaterMultiple, queDevant } from '../domaine/format.ts'
import { texteDePartage } from '../domaine/partage.ts'
import { messageDeScore, type LigneRecapitulatif } from '../domaine/recapitulatif.ts'
import { partager, type ResultatPartage } from '../navigateur/partager.ts'
import './EcranFin.css'

type Props = {
  /** Reçoit le titre, pour que la Partie puisse y placer le focus. */
  refTitre?: (element: HTMLElement | null) => void
  lignes: LigneRecapitulatif[]
  score: number
  total: number
  /** Le record d'avant cette Partie (null : première Partie, ou pas de mémoire locale). */
  ancienRecord?: number | null
  onRejouer: () => void
  /** Comment partager (remplaçable dans les tests) : par défaut, avec les outils du navigateur. */
  onPartager?: (texte: string) => Promise<ResultatPartage>
}

/** Fin de Partie : le score, un message, le partage, « Rejouer », puis le Récapitulatif des 10 Duels. */
export function EcranFin({
  refTitre,
  lignes,
  score,
  total,
  ancienRecord = null,
  onRejouer,
  onPartager = partager,
}: Props) {
  // Résultat du dernier partage, pour afficher une confirmation (ou le texte, si la copie a échoué).
  const [partage, setPartage] = useState<ResultatPartage | null>(null)
  const partagerLeScore = async () => {
    setPartage(null)
    setPartage(await onPartager(texteDePartage(score, total)))
  }

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
      {ancienRecord !== null &&
        (score > ancienRecord ? (
          <p className="fin__record fin__record--nouveau">
            🏆 Nouveau record ! (ancien : {ancienRecord}/{total})
          </p>
        ) : (
          <p className="fin__record">
            Ton record : {ancienRecord}/{total}
          </p>
        ))}
      <div className="fin__actions">
        <button type="button" className="bouton" onClick={partagerLeScore}>
          Partager mon score
        </button>
        <button type="button" className="bouton bouton--secondaire" onClick={onRejouer}>
          Rejouer
        </button>
      </div>
      {/* role="status" : un lecteur d'écran annonce la confirmation de copie dès qu'elle apparaît. */}
      <div role="status" className="fin__partage">
        {partage === 'copie' && <p>✓ Score copié ! Colle-le dans un message pour défier tes proches.</p>}
        {partage === 'echec' && (
          <>
            <p>La copie automatique n'a pas fonctionné. Voici le texte à copier :</p>
            <p className="fin__texte-partage">{texteDePartage(score, total)}</p>
          </>
        )}
      </div>

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
                1 <Icone id={ligne.plus.id} /> = {formaterMultiple(ligne.rapport)} <Icone id={ligne.moins.id} />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {ouvert !== null && <PanneauDuel key={ouvert} ligne={lignes[ouvert]} onFermer={fermer} />}
    </section>
  )
}
