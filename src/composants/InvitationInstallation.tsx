import { useEffect, useId, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { ADRESSE_DU_JEU } from '../domaine/partage.ts'
import { useGlisserPourFermer } from '../navigateur/glisser.ts'
import {
  ecarterInvitation,
  invitationEcartee,
  useInstallation,
  type Guide,
  type Situation,
} from '../navigateur/installation.ts'
import { stockageDuNavigateur } from '../navigateur/memoire.ts'
import { mesurer as mesurerPourDeVrai, type Evenement } from '../navigateur/mesure.ts'
import './InvitationInstallation.css'

type PropsVue = {
  situation: Situation
  /** Ouvre la fenêtre d'installation du navigateur ; vrai si le joueur a installé. */
  installer?: () => Promise<boolean>
  onEcarter: () => void
  mesurer: (evenement: Evenement) => void
}

/**
 * Les étapes de chaque navigateur mobile, sans capture d'écran (elles vieilliraient à chaque mise à jour).
 * Firefox sur Android : libellés vérifiés sur un vrai téléphone (la dernière fenêtre est celle d'Android, dont
 * le libellé varie : « Ajouter », « Ajouter automatiquement »…). Safari : guide d'Apple pour iOS 26.
 */
const ETAPES: Record<Guide, string[]> = {
  'firefox-android': [
    'Touche ⋮ en bas à droite, puis « Plus ».',
    'Touche « Ajouter l’application à l’écran d’accueil ».',
    'Confirme avec « Ajouter ».',
  ],
  'safari-ios': [
    'Touche ⋯ puis « Partager » (ou directement le bouton Partager).',
    'Fais défiler et touche « Sur l’écran d’accueil ».',
    'Laisse « Ouvrir comme app web » activé et touche « Ajouter ».',
  ],
  'ios-autre': [
    'Touche le bouton Partager de la barre d’adresse.',
    'Touche « Sur l’écran d’accueil ».',
    'Touche « Ajouter ».',
  ],
  'mobile-autre': ['Ouvre le menu de ton navigateur.', 'Cherche « Ajouter à l’écran d’accueil » ou « Installer ».'],
}

/**
 * L'invitation à installer le jeu (#68), à la fin du Duel du jour : un bouton quand le navigateur le permet,
 * les étapes à suivre sur les autres mobiles (repliées sous « Comment l'installer ? »), et sur ordinateur une
 * simple ligne pour les favoris. « Non merci » ferme la carte pour de bon.
 */
export function InvitationInstallationVue({ situation, installer, onEcarter, mesurer }: PropsVue) {
  const [fermee, setFermee] = useState(false)
  const [deplie, setDeplie] = useState(false)
  const [qrOuvert, setQrOuvert] = useState(false)
  const idEtapes = useId()
  const ordinateur = situation === 'ordinateur' || situation === 'mac'
  const visible = situation !== 'installe' && !ordinateur && !fermee
  const comptee = useRef(false)
  const guideCompte = useRef(false)

  useEffect(() => {
    if (visible && !comptee.current) {
      comptee.current = true
      mesurer('installation/proposee')
    }
  }, [visible, mesurer])

  // Sur ordinateur, le jeu installé sert peu : pas de carte, juste un rappel discret (ni compté, ni à refuser),
  // dont « joue sur ton téléphone » ouvre le QR code du jeu (#98).
  if (ordinateur) {
    const ouvrirQr = () => {
      mesurer('installation/qr')
      setQrOuvert(true)
    }
    return (
      <>
        <p className="installation-ligne">
          Pour revenir demain : ajoute Duel Carbone à tes favoris ({situation === 'mac' ? '⌘' : 'Ctrl'} + D), ou{' '}
          <button
            type="button"
            className="lien-bouton installation-ligne__qr"
            aria-label="Joue sur ton téléphone : afficher un QR code"
            aria-haspopup="dialog"
            onClick={ouvrirQr}
          >
            joue sur ton téléphone
          </button>
          .
        </p>
        {/* Hors de la phrase : une <dialog> n'a pas sa place dans un paragraphe. */}
        {qrOuvert && createPortal(<FenetreQrCode onFermer={() => setQrOuvert(false)} />, document.body)}
      </>
    )
  }
  if (!visible) return null

  const etapes = situation === 'bouton' ? null : ETAPES[situation]
  const installerMaintenant = async () => {
    const accepte = (await installer?.()) ?? false
    mesurer(accepte ? 'installation/acceptee' : 'installation/refusee')
    if (accepte) setFermee(true)
  }
  const basculerEtapes = () => {
    if (!deplie && !guideCompte.current) {
      guideCompte.current = true
      mesurer('installation/guide')
    }
    setDeplie(!deplie)
  }
  const nonMerci = () => {
    mesurer('installation/refusee')
    onEcarter()
    setFermee(true)
  }

  return (
    <section className="installation" aria-labelledby="installation-titre">
      <h3 id="installation-titre">Reviens demain en un geste</h3>
      <p>Installe Duel Carbone sur ton écran d’accueil : le Duel du jour t’y attendra, même hors ligne.</p>
      <div className="installation__actions">
        {etapes ? (
          <button
            type="button"
            className="bouton"
            aria-expanded={deplie}
            aria-controls={idEtapes}
            onClick={basculerEtapes}
          >
            Comment l’installer ?
          </button>
        ) : (
          <button type="button" className="bouton" onClick={() => void installerMaintenant()}>
            Installer Duel Carbone
          </button>
        )}
        <button type="button" className="bouton bouton--secondaire" onClick={nonMerci}>
          Non merci
        </button>
      </div>
      {/* Toujours là, mais masquée tant qu'elle est repliée : aria-controls désigne ainsi une liste qui existe. */}
      {etapes && (
        <ol id={idEtapes} className="installation__etapes" hidden={!deplie}>
          {etapes.map((etape) => (
            <li key={etape}>{etape}</li>
          ))}
        </ol>
      )}
    </section>
  )
}

/**
 * Le QR code du jeu, à scanner avec l'appareil photo du téléphone (#98). L'image est fabriquée d'avance par
 * npm run qr-code (public/qr-code.svg) ; l'adresse est écrite en clair dessous, pour qui ne peut pas scanner.
 *
 * Comme le détail d'un Duel du Récapitulatif, c'est une balise <dialog> ouverte avec showModal() : le navigateur
 * fournit le fond sombre et la touche Échap, et rend le reste de la page inaccessible tant qu'elle est ouverte.
 */
function FenetreQrCode({ onFermer }: { onFermer: () => void }) {
  const boite = useRef<HTMLDialogElement>(null)
  const croix = useRef<HTMLButtonElement>(null)
  const idTitre = useId()

  useEffect(() => {
    const dialogue = boite.current
    if (dialogue && !dialogue.open) dialogue.showModal()
    croix.current?.focus()
  }, [])

  const fermer = () => boite.current?.close()
  useGlisserPourFermer(boite, fermer)
  // Le fond sombre fait partie de la balise <dialog> : un clic dont la cible est la balise elle-même est un clic
  // sur le fond.
  const surClic = (evenement: MouseEvent<HTMLDialogElement>) => {
    if (evenement.target === evenement.currentTarget) fermer()
  }

  return (
    // Échap ferme la boîte nativement : l'événement « close » nous prévient dans tous les cas.
    <dialog ref={boite} className="fenetre qr-code" aria-labelledby={idTitre} onClose={onFermer} onClick={surClic}>
      <div className="qr-code__entete">
        <h2 id={idTitre}>Joue sur ton téléphone</h2>
        <button ref={croix} type="button" className="qr-code__fermer" aria-label="Fermer" onClick={fermer}>
          {/* La même croix dessinée que le détail d'un Duel : le caractère « × » n'est pas centré partout. */}
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <p>Scanne ce code avec l’appareil photo de ton téléphone : le jeu s’ouvre, et tu pourras l’installer sur ton écran d’accueil.</p>
      {/* 37 carrés de 6 px : des carrés entiers restent nets. */}
      <img className="qr-code__image" src="/qr-code.svg" alt="QR code vers duelcarbone.fr" width={222} height={222} />
      <p className="qr-code__adresse">
        Ou tape l’adresse : <strong>{new URL(ADRESSE_DU_JEU).hostname}</strong>
      </p>
    </dialog>
  )
}

/** L'invitation branchée sur le vrai navigateur : rien si le joueur l'a déjà écartée. */
export function InvitationInstallation() {
  const { situation, installer } = useInstallation()
  const [stockage] = useState(stockageDuNavigateur)
  const [ecartee] = useState(() => invitationEcartee(stockage))
  if (ecartee) return null
  return (
    <InvitationInstallationVue
      situation={situation}
      installer={installer}
      onEcarter={() => ecarterInvitation(stockage)}
      mesurer={mesurerPourDeVrai}
    />
  )
}

/**
 * Comment installer le jeu, pour la page En savoir plus : toujours disponible, même après « Non merci ».
 * Un bouton quand le navigateur a sa fenêtre d'installation, sinon les étapes du navigateur du joueur.
 */
export function GuideInstallation() {
  const { situation, installer } = useInstallation()
  const [installe, setInstalle] = useState(false)
  if (situation === 'installe' || installe) {
    return <p>C’est déjà fait : tu joues dans le jeu installé. Merci !</p>
  }
  if (situation === 'ordinateur' || situation === 'mac') {
    return (
      <p>
        Sur ordinateur, le plus simple est d’ajouter le jeu à tes favoris ({situation === 'mac' ? '⌘' : 'Ctrl'} + D).
        Pour l’installer sur ton téléphone, ouvre cette page depuis celui-ci : les étapes de ton navigateur
        s’afficheront ici.
      </p>
    )
  }
  if (situation === 'bouton') {
    return (
      <p>
        <button type="button" className="bouton" onClick={() => void installer().then((ok) => ok && setInstalle(true))}>
          Installer Duel Carbone
        </button>
      </p>
    )
  }
  return (
    <ol className="installation__etapes">
      {ETAPES[situation].map((etape) => (
        <li key={etape}>{etape}</li>
      ))}
    </ol>
  )
}
