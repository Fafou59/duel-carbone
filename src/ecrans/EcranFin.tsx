import { useEffect, useRef, useState } from 'react'
import { CompteARebours } from '../composants/CompteARebours.tsx'
import { Conseil } from '../composants/Conseil.tsx'
import { InvitationInstallation } from '../composants/InvitationInstallation.tsx'
import { PanneauDuel } from '../composants/PanneauDuel.tsx'
import { RangDuJour } from '../composants/RangDuJour.tsx'
import { Icone } from '../composants/Icone.tsx'
import type { ConseilAffiche } from '../domaine/conseils.ts'
import { formaterMultiple, queDevant } from '../domaine/format.ts'
import { texteDePartage, texteDePartageDuJour } from '../domaine/partage.ts'
import { messageDeScore, type LigneRecapitulatif } from '../domaine/recapitulatif.ts'
import type { DonneesImage } from '../domaine/image-de-partage.ts'
import type { DuelDePartie } from '../domaine/partie.ts'
import type { RangDuJour as Rang } from '../domaine/rang-du-jour.ts'
import { CommeToi } from '../composants/CommeToi.tsx'
import { fabriquerImageDePartage } from '../navigateur/image-de-partage.ts'
import {
  partager,
  partagerImage,
  peutPartagerUnFichier,
  type ResultatPartage,
  type ResultatPartageImage,
} from '../navigateur/partager.ts'
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
  /**
   * La fin du Duel du jour : son numéro, la série et le Rang du jour (null tant que le serveur n'a pas répondu,
   * ou s'il ne répond pas). Sans elle, c'est la fin d'une Partie libre, qui n'a pas de Rang.
   */
  partieDuJour?: { numero: number; serie: number; rang?: Rang | null }
  /** À la fin d'une Partie libre : où en est le Duel du jour, pour y inviter s'il n'est pas encore joué. */
  duJour?: { numero: number; situation: 'aJouer' | 'enCours' | 'joue'; onJouer: () => void }
  /**
   * Le Conseil de fin de Partie (issue 88) : choisi une seule fois, à l'affichage de l'écran, d'après les Duels de la
   * Partie, puis noté comme vu (pour ne pas le remontrer dans les Parties suivantes). Sans lui, pas de Conseil.
   */
  conseil?: { choisir: (lignes: LigneRecapitulatif[]) => ConseilAffiche; onVu: (id: string) => void }
  /** Le Taux d'erreur d'un Duel, en pour cent, ou null (ADR 0006) : sa case du Récapitulatif en tire « 72 % comme toi ». */
  tauxDErreur?: (duel: DuelDePartie) => number | null
  /** Comment partager (remplaçable dans les tests) : par défaut, avec les outils du navigateur. */
  onPartager?: (texte: string) => Promise<ResultatPartage>
  /** Comment partager le score en image (remplaçable dans les tests) : par défaut, avec les outils du navigateur. */
  partageImage?: PartageImage
}

/** Le partage en image, pour les Stories (#79). */
export type PartageImage = {
  /** Le menu de partage acceptera-t-il le fichier ? Sinon, le bouton enregistre l'image. */
  fichierPartageable: () => boolean
  /** Dessine l'image. */
  fabriquer: (donnees: DonneesImage) => Promise<Blob>
  /** Partage l'image, ou l'enregistre. */
  partager: (image: Promise<Blob>, nom: string) => Promise<ResultatPartageImage>
}

const PARTAGE_IMAGE_DU_NAVIGATEUR: PartageImage = {
  fichierPartageable: () => peutPartagerUnFichier(),
  fabriquer: fabriquerImageDePartage,
  partager: (image, nom) => partagerImage(image, nom),
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
  conseil,
  tauxDErreur: tauxDe = () => null,
  onPartager = partager,
  partageImage = PARTAGE_IMAGE_DU_NAVIGATEUR,
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
    setPartageImage(null)
    setPartage(await onPartager(texte))
  }

  // L'image de partage, pour les Stories. Elle est dessinée dès l'affichage de l'écran : Safari n'ouvre le menu
  // de partage que juste après le toucher du bouton, on ne peut pas attendre qu'elle soit prête à ce moment-là.
  const donneesImage: DonneesImage = {
    numero: partieDuJour?.numero,
    score,
    bonnes: lignes.map((ligne) => ligne.bonne),
    serie: partieDuJour?.serie,
  }
  const nomImage = partieDuJour ? `duel-carbone-du-jour-${partieDuJour.numero}.png` : 'duel-carbone-partie-libre.png'
  const cleImage = JSON.stringify(donneesImage)
  const image = useRef<Promise<Blob> | null>(null)
  useEffect(() => {
    const promesse = partageImage.fabriquer(JSON.parse(cleImage) as DonneesImage)
    // Une panne de dessin n'est signalée qu'au toucher du bouton (partagerImage la rattrape).
    promesse.catch(() => {})
    image.current = promesse
  }, [cleImage, partageImage])
  const [fichierPartageable] = useState(partageImage.fichierPartageable)
  const [resultatImage, setPartageImage] = useState<ResultatPartageImage | null>(null)
  const partagerEnImage = async () => {
    setPartage(null)
    setPartageImage(null)
    setPartageImage(await partageImage.partager(image.current ?? partageImage.fabriquer(donneesImage), nomImage))
  }
  const boutonImage = (
    <button type="button" className="bouton bouton--secondaire" onClick={partagerEnImage}>
      <span aria-hidden="true">📸 </span>
      {fichierPartageable ? 'Partager en image' : 'Enregistrer l’image'}
    </button>
  )

  // Le Conseil, choisi au premier affichage seulement : il ne change plus tant que l'écran reste affiché.
  const [conseilAffiche] = useState(() => conseil?.choisir(lignes) ?? null)
  // Noté comme vu une seule fois (la fonction, recréée à chaque affichage, est lue au premier).
  const onConseilVu = useRef(conseil?.onVu)
  useEffect(() => {
    if (conseilAffiche) onConseilVu.current?.(conseilAffiche.id)
  }, [conseilAffiche])

  // Position (0 à 9) du Duel dont le détail est ouvert, ou null si le panneau est fermé.
  const [ouvert, setOuvert] = useState<number | null>(null)
  // Les 10 cases, pour rendre le focus à celle qu'on vient de consulter.
  const cases = useRef<(HTMLButtonElement | null)[]>([])

  const fermer = () => {
    if (ouvert === null) return
    setOuvert(null)
    cases.current[ouvert]?.focus()
  }

  // Le Taux d'erreur de chaque Duel du Récapitulatif (null : rien à afficher).
  const taux = (ligne: LigneRecapitulatif) => tauxDe(ligne.duel)

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
      {partieDuJour && <RangDuJour rang={partieDuJour.rang ?? null} />}
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
          <>
            <button type="button" className="bouton fin__gros" onClick={partagerLeScore}>
              Défier mes proches
            </button>
            {boutonImage}
          </>
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
            {boutonImage}
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
        {(resultatImage === 'partage' || resultatImage === 'enregistre') && (
          <p>
            {resultatImage === 'enregistre' && '✓ Image enregistrée ! Ajoute-la à ta Story depuis ta galerie. '}
            Astuce : dans ta Story, l’autocollant « Lien » rend duelcarbone.fr cliquable.
          </p>
        )}
        {resultatImage === 'echec' && (
          <p>L’image n’a pas pu être créée sur cet appareil : partage plutôt ton score en texte.</p>
        )}
      </div>
      {/* Le Conseil, sous les boutons de partage (prototype du 22/11, variante A : le Rang reste sous le score,
          le partage à portée de pouce). */}
      {conseilAffiche && <Conseil conseil={conseilAffiche} />}
      {!partieDuJour && duJour?.situation === 'joue' && (
        <p className="fin__complement">
          Prochain Duel du jour dans <CompteARebours />
        </p>
      )}
      {partieDuJour && <InvitationInstallation />}
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
              {taux(ligne) !== null && (
                <span className="recap__taux">
                  <CommeToi bon={ligne.bonne} taux={taux(ligne) ?? 0} petite />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {ouvert !== null && <PanneauDuel key={ouvert} ligne={lignes[ouvert]} onFermer={fermer} />}
    </section>
  )
}
