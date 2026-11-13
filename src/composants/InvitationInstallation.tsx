import { useEffect, useId, useRef, useState } from 'react'
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

  // Sur ordinateur, le jeu installé sert peu : pas de carte, juste un rappel discret (ni compté, ni à refuser).
  if (ordinateur) {
    return (
      <p className="installation-ligne">
        Pour revenir demain : ajoute Duel Carbone à tes favoris ({situation === 'mac' ? '⌘' : 'Ctrl'} + D), ou joue
        sur ton téléphone.
      </p>
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
