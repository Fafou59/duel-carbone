import { useRef, useState } from 'react'
import { CompteARebours } from '../composants/CompteARebours.tsx'
import { PanneauDuel } from '../composants/PanneauDuel.tsx'
import { Icone } from '../composants/Icone.tsx'
import { formaterMultiple, queDevant } from '../domaine/format.ts'
import { texteDePartage, texteDePartageDuJour } from '../domaine/partage.ts'
import { messageDeScore, type LigneRecapitulatif } from '../domaine/recapitulatif.ts'
import { partager, type ResultatPartage } from '../navigateur/partager.ts'
import './EcranFin.css'

export type PropsFin = {
  /** Reçoit le titre, pour que la Partie puisse y placer le focus. */
  refTitre?: (element: HTMLElement | null) => void
  lignes: LigneRecapitulatif[]
  score: number
  total: number
  /** Le record d'avant cette Partie (null : première Partie, ou pas de mémoire locale). */
  ancienRecord?: number | null
  /** « Rejouer » (Partie libre), ou « Partie libre » après le Duel du jour. */
  onRejouer: () => void
  /** La fin du Duel du jour : son numéro et la série. Sans elle, c'est la fin d'une Partie libre. */
  partieDuJour?: { numero: number; serie: number }
  /** À la fin d'une Partie libre : où en est le Duel du jour, pour y inviter s'il n'est pas encore joué. */
  duJour?: { numero: number; situation: 'aJouer' | 'enCours' | 'joue'; onJouer: () => void }
  /** Comment partager (remplaçable dans les tests) : par défaut, avec les outils du navigateur. */
  onPartager?: (texte: string) => Promise<ResultatPartage>
}

const jours = (n: number) => `${n} jour${n > 1 ? 's' : ''}`

/**
 * Fin de Partie : le score, un message, puis ce qu'on fait ensuite, et enfin le Récapitulatif des 10 Duels.
 * - Fin du Duel du jour : on pousse au partage (« Défier mes proches »), puis à la Partie libre pour s'entraîner.
 * - Fin de Partie libre : on pousse au Duel du jour s'il n'est pas encore joué, sinon à « Rejouer ».
 */
export function EcranFin({
  refTitre,
  lignes,
  score,
  total,
  ancienRecord = null,
  onRejouer,
  partieDuJour,
  duJour,
  onPartager = partager,
}: PropsFin) {
  // Le texte partagé : celui du jour (accroche, score, grille) ou celui de la Partie libre.
  const texte = partieDuJour
    ? texteDePartageDuJour({
        numero: partieDuJour.numero,
        score,
        bonnes: lignes.map((ligne) => ligne.bonne),
      })
    : texteDePartage(score, total)
  // Résultat du dernier partage, pour afficher une confirmation (ou le texte, si la copie a échoué).
  const [partage, setPartage] = useState<ResultatPartage | null>(null)
  const partagerLeScore = async () => {
    setPartage(null)
    setPartage(await onPartager(texte))
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

  // Le Duel du jour reste à jouer (ou à finir) : il passe devant « Rejouer ».
  const inviterAuDuJour = !partieDuJour && duJour && duJour.situation !== 'joue' ? duJour : null

  return (
    <section className="fin" aria-labelledby="fin-titre">
      <h2 id="fin-titre" ref={refTitre} tabIndex={-1}>
        {partieDuJour ? `Duel Carbone du jour n° ${partieDuJour.numero}` : 'Partie terminée !'}
      </h2>
      <p className="fin__score">
        {score}
        <span>/{total}</span>
      </p>
      <p className="fin__message">{messageDeScore(score, total)}</p>
      {partieDuJour && (
        <p className="fin__complement">
          {partieDuJour.serie > 0 && <>🔥 Série : {jours(partieDuJour.serie)} d'affilée · </>}
          Prochain Duel du jour dans <CompteARebours />
        </p>
      )}
      {!partieDuJour &&
        ancienRecord !== null &&
        (score > ancienRecord ? (
          <p className="fin__record fin__record--nouveau">
            🏆 Nouveau record ! (ancien : {ancienRecord}/{total})
          </p>
        ) : (
          <p className="fin__record">
            Ton record : {ancienRecord}/{total}
          </p>
        ))}
      {inviterAuDuJour && <p className="fin__invitation">Échauffement terminé : place au Duel du jour !</p>}

      <div className="fin__actions" role="group" aria-label="Et maintenant ?">
        {partieDuJour ? (
          <button type="button" className="bouton fin__gros" onClick={partagerLeScore}>
            Défier mes proches
          </button>
        ) : (
          <>
            {inviterAuDuJour && (
              <button type="button" className="bouton fin__gros" onClick={inviterAuDuJour.onJouer}>
                {inviterAuDuJour.situation === 'enCours' ? 'Reprendre' : 'Jouer'} le Duel du jour n° {inviterAuDuJour.numero}
              </button>
            )}
            <button type="button" className={inviterAuDuJour ? 'bouton bouton--secondaire' : 'bouton'} onClick={onRejouer}>
              Rejouer
            </button>
            <button type="button" className="bouton bouton--secondaire" onClick={partagerLeScore}>
              Partager mon score
            </button>
          </>
        )}
      </div>
      {/* role="status" : un lecteur d'écran annonce la confirmation de copie dès qu'elle apparaît. */}
      <div role="status" className="fin__partage">
        {partage === 'copie' && <p>✓ Score copié ! Colle-le dans un message pour défier tes proches.</p>}
        {partage === 'echec' && (
          <>
            <p>La copie automatique n'a pas fonctionné. Voici le texte à copier :</p>
            <p className="fin__texte-partage">{texte}</p>
          </>
        )}
      </div>
      {!partieDuJour && duJour?.situation === 'joue' && (
        <p className="fin__complement">
          Prochain Duel du jour dans <CompteARebours />
        </p>
      )}
      {partieDuJour && (
        <div className="fin__entrainement">
          <p>Envie de t’entraîner pour le Duel de demain ?</p>
          <button type="button" className="bouton bouton--secondaire" onClick={onRejouer}>
            Partie libre
          </button>
        </div>
      )}

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
              onClick={() => setOuvert(i)}
            >
              {/* Le nom lu par les lecteurs d'écran vient du texte de la case : « Duel 1 (réussi) : … émet … fois
                  plus que … ». Les symboles et les icônes sont remplacés par des mots (texte caché), mais le nom
                  commence par ce qu'on voit (« Duel 1 ») : on peut désigner la case à la voix. */}
              <span className="recap__numero">
                <span aria-hidden="true">{ligne.bonne ? '✓' : '✗'} </span>Duel {ligne.numero}
                <span className="visuellement-cache">
                  {' '}
                  ({ligne.bonne ? 'réussi' : 'raté'}) : {ligne.plus.titre} émet {formaterMultiple(ligne.rapport)} fois
                  plus {queDevant(ligne.moins.titre)}
                </span>
              </span>
              <span className="recap__equivalence" aria-hidden="true">
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
