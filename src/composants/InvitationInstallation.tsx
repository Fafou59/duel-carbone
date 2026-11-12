import { useEffect, useRef, useState } from 'react'
import { ecarterInvitation, invitationEcartee, useInstallation, type Situation } from '../navigateur/installation.ts'
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
 * L'invitation à installer le jeu (#68), à la fin du Duel du jour : un bouton quand le navigateur le permet,
 * le geste à faire sur iPhone, ou les favoris ailleurs. « Non merci » la ferme pour de bon.
 */
export function InvitationInstallationVue({ situation, installer, onEcarter, mesurer }: PropsVue) {
  const [fermee, setFermee] = useState(false)
  const visible = situation !== 'installe' && !fermee
  const comptee = useRef(false)

  useEffect(() => {
    if (visible && !comptee.current) {
      comptee.current = true
      mesurer('installation/proposee')
    }
  }, [visible, mesurer])

  if (!visible) return null

  const installerMaintenant = async () => {
    const accepte = (await installer?.()) ?? false
    mesurer(accepte ? 'installation/acceptee' : 'installation/refusee')
    if (accepte) setFermee(true)
  }
  const nonMerci = () => {
    mesurer('installation/refusee')
    onEcarter()
    setFermee(true)
  }

  return (
    <section className="installation" aria-labelledby="installation-titre">
      <h3 id="installation-titre">Reviens demain en un geste</h3>
      {situation === 'bouton' && <p>Installe Duel Carbone sur ton écran d’accueil : le Duel du jour t’y attendra.</p>}
      {situation === 'ios' && (
        <p>
          Pour retrouver le Duel du jour, ajoute Duel Carbone à ton écran d’accueil : touche Partager (le carré avec
          une flèche), puis « Sur l’écran d’accueil ».
        </p>
      )}
      {situation === 'favori' && (
        <p>
          Pour retrouver le Duel du jour, ajoute Duel Carbone à tes favoris ou à ton écran d’accueil, depuis le menu
          de ton navigateur.
        </p>
      )}
      <div className="installation__actions">
        {situation === 'bouton' && (
          <button type="button" className="bouton" onClick={() => void installerMaintenant()}>
            Installer Duel Carbone
          </button>
        )}
        <button type="button" className="bouton bouton--secondaire" onClick={nonMerci}>
          Non merci
        </button>
      </div>
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
