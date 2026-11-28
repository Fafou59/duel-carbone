import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useInstallation, type Situation } from '../navigateur/installation.ts'
import { stockageDuNavigateur } from '../navigateur/memoire.ts'
import { mesurer as mesurerPourDeVrai, type Evenement } from '../navigateur/mesure.ts'
import {
  aideAuDeblocage,
  ecarterInvitationAuRappel,
  invitationAuRappelAProposer,
  noterInvitationVue,
  useRappel,
  type Rappel,
  type ServiceDuRappel,
} from '../navigateur/rappel.ts'
import { ETAPES } from './etapes-installation.ts'
import { InvitationInstallation } from './InvitationInstallation.tsx'
import './InvitationInstallation.css'
import './InvitationRappel.css'

const surIphone = (situation: Situation) => situation === 'safari-ios' || situation === 'ios-autre'

/** L'aide au déblocage pour le vrai navigateur. */
const aideIci = () => aideAuDeblocage(navigator.userAgent, navigator.maxTouchPoints ?? 0)

/**
 * Ce que disent la carte et le réglage, selon l'état du Rappel (le même texte aux deux endroits). Le message est
 * dans une zone role="status" : un lecteur d'écran annonce le résultat de la demande dès qu'il change.
 */
function Message({ rappel, aide }: { rappel: Rappel; aide: string }) {
  switch (rappel.etat) {
    case 'actif':
      return <p>✓ C’est noté : le Rappel du matin arrivera demain à 7 h. Tu peux l’arrêter quand tu veux.</p>
    case 'bloque':
      return (
        <>
          <p>
            <strong>Le Rappel n’est pas activé :</strong> ton navigateur bloque les notifications de Duel Carbone.
          </p>
          <p>{aide} Puis touche « Réessayer ».</p>
        </>
      )
    case 'ignore':
      return (
        <p>
          <strong>Le Rappel n’est pas activé :</strong> tu n’as pas autorisé les notifications. Touche à nouveau le
          bouton pour réessayer.
        </p>
      )
    case 'echec':
      return (
        <p>
          <strong>Le Rappel n’a pas pu être activé</strong> (le serveur ne répond pas). Réessaie un peu plus tard.
        </p>
      )
    default:
      return rappel.arrete ? <p>Le Rappel est arrêté : tu ne recevras plus de notification.</p> : null
  }
}

/** Les boutons du Rappel : activer (ou réessayer), arrêter, et sur les aperçus, l'essai. */
function Boutons({ rappel, children }: { rappel: Rappel; children?: ReactNode }) {
  const [essai, setEssai] = useState<'envoye' | 'echec' | null>(null)
  if (rappel.etat === 'actif') {
    return (
      <>
        <div className="installation__actions">
          <button type="button" className="bouton bouton--secondaire" onClick={rappel.arreter}>
            Arrêter le Rappel
          </button>
          {rappel.essai && (
            // Sur les aperçus seulement (le serveur le dit) : la tâche de 7 h n'y tourne pas.
            <button type="button" className="bouton bouton--secondaire" onClick={() => void rappel.essayer().then((ok) => setEssai(ok ? 'envoye' : 'echec'))}>
              Essai : m’envoyer le Rappel dans 10 s
            </button>
          )}
        </div>
        {essai && <p>{essai === 'envoye' ? 'Envoi demandé : ferme le jeu, le Rappel arrive dans 10 s.' : 'L’essai n’a pas pu être demandé.'}</p>}
      </>
    )
  }
  const enCours = rappel.etat === 'activation'
  const reessayer = rappel.etat === 'bloque' || rappel.etat === 'echec'
  return (
    <div className="installation__actions">
      {/* aria-disabled plutôt que disabled : le bouton garde le focus du clavier pendant la demande. */}
      <button type="button" className="bouton" aria-disabled={enCours || undefined} onClick={enCours ? undefined : rappel.activer}>
        {enCours ? 'Activation…' : reessayer ? 'Réessayer' : 'Activer le Rappel'}
      </button>
      {children}
    </div>
  )
}

type PropsCarte = {
  rappel: Rappel
  situation: Situation
  onEcarter: () => void
  mesurer: (evenement: Evenement) => void
  aide?: string
}

/**
 * La carte « Ne rate pas le Duel de demain », à la fin du Duel du jour (ADR 0008) : elle remplace l'invitation à
 * installer (#68). Partout où le navigateur sait recevoir un push, ordinateur compris, elle propose le Rappel du
 * matin ; sur iPhone et iPad, il faut d'abord installer le jeu. « Non merci » la ferme pour de bon.
 */
export function InvitationRappelVue({ rappel, situation, onEcarter, mesurer, aide = aideIci() }: PropsCarte) {
  const [fermee, setFermee] = useState(false)
  const [deplie, setDeplie] = useState(false)
  const idEtapes = useId()
  const installerDAbord = rappel.etat === 'installer-d-abord'
  // Proposée : la carte s'affiche avec son bouton (une seule fois par carte).
  const proposee = !fermee && (rappel.etat === 'inactif' || installerDAbord)
  const comptee = useRef(false)
  const guideCompte = useRef(false)

  useEffect(() => {
    if (!proposee || comptee.current) return
    comptee.current = true
    // Sur iPhone sans installation, c'est d'abord une invitation à installer : comptée comme telle.
    mesurer(installerDAbord ? 'installation/proposee' : 'notifications/proposees')
  }, [proposee, installerDAbord, mesurer])

  if (fermee) return null
  const nonMerci = () => {
    mesurer(installerDAbord ? 'installation/refusee' : 'notifications/refusees')
    onEcarter()
    setFermee(true)
  }
  const boutonNonMerci = (
    <button type="button" className="bouton bouton--secondaire" onClick={nonMerci}>
      Non merci
    </button>
  )

  if (installerDAbord) {
    const etapes = ETAPES[surIphone(situation) ? situation : 'safari-ios']
    const basculer = () => {
      if (!deplie && !guideCompte.current) {
        guideCompte.current = true
        mesurer('installation/guide')
      }
      setDeplie(!deplie)
    }
    return (
      <section className="installation" aria-labelledby="rappel-titre">
        <h3 id="rappel-titre">Ne rate pas le Duel de demain</h3>
        <p>
          Pour recevoir le Rappel du matin, chaque jour à 7 h, installe d’abord Duel Carbone sur ton écran d’accueil, puis
          ouvre-le depuis là : le jeu te le proposera.
        </p>
        <div className="installation__actions">
          <button type="button" className="bouton" aria-expanded={deplie} aria-controls={idEtapes} onClick={basculer}>
            Comment l’installer ?
          </button>
          {boutonNonMerci}
        </div>
        <ol id={idEtapes} className="installation__etapes" hidden={!deplie}>
          {etapes.map((etape) => (
            <li key={etape}>{etape}</li>
          ))}
        </ol>
      </section>
    )
  }

  return (
    <section className="installation" aria-labelledby="rappel-titre">
      <h3 id="rappel-titre">Ne rate pas le Duel de demain</h3>
      {rappel.etat !== 'actif' && (
        <p>Chaque jour à 7 h, le Rappel du matin t’annonce le nouveau Duel par une notification. Rien d’autre, et tu l’arrêtes quand tu veux.</p>
      )}
      <div role="status" className="rappel__message">
        <Message rappel={rappel} aide={aide} />
      </div>
      <Boutons rappel={rappel}>{boutonNonMerci}</Boutons>
    </section>
  )
}

/**
 * La carte branchée sur le vrai navigateur, à la fin du Duel du jour. Rien tant que le serveur n'a pas répondu, ni
 * si le Rappel est déjà actif ; l'ancienne invitation à installer si le serveur ne répond pas (pas de Rappel
 * possible, mais le jeu installé reste le meilleur moyen de revenir).
 */
type PropsBranchees = { service?: ServiceDuRappel; mesurer?: (evenement: Evenement) => void }

export function InvitationRappel({ service, mesurer = mesurerPourDeVrai }: PropsBranchees = {}) {
  const { situation } = useInstallation()
  const [stockage] = useState(stockageDuNavigateur)
  const [aProposer] = useState(() => invitationAuRappelAProposer(stockage))
  const rappel = useRappel({ surIphoneSansInstallation: surIphone(situation), service, mesurer })
  // Un Rappel déjà actif à l'ouverture n'a rien à proposer.
  const visible = aProposer && rappel.etat !== 'chargement' && !rappel.actifDesLOuverture
  const sansRappel = rappel.etat === 'indisponible' || rappel.etat === 'sans-push'

  useEffect(() => {
    if (visible && !sansRappel) noterInvitationVue(stockage)
  }, [visible, sansRappel, stockage])

  if (rappel.etat === 'chargement') return null
  if (sansRappel) return <InvitationInstallation />
  if (!visible) return null
  return (
    <InvitationRappelVue
      rappel={rappel}
      situation={situation}
      onEcarter={() => ecarterInvitationAuRappel(stockage)}
      mesurer={mesurer}
    />
  )
}

/**
 * Le Rappel du matin dans la page En savoir plus : toujours là, même après « Non merci », pour l'activer ou
 * l'arrêter.
 */
export function ReglageRappel({ service, mesurer = mesurerPourDeVrai }: PropsBranchees = {}) {
  const { situation } = useInstallation()
  const rappel = useRappel({ surIphoneSansInstallation: surIphone(situation), service, mesurer })
  switch (rappel.etat) {
    case 'chargement':
      return null
    case 'indisponible':
      return <p>Le Rappel est indisponible pour le moment (le serveur ne répond pas). Réessaie plus tard.</p>
    case 'sans-push':
      return <p>Ce navigateur ne sait pas recevoir de notifications : pas de Rappel sur cet appareil.</p>
    case 'installer-d-abord':
      return (
        <p>
          Sur iPhone et iPad, installe d’abord Duel Carbone sur ton écran d’accueil (voir « Installer le jeu »), puis
          ouvre-le depuis là pour activer le Rappel.
        </p>
      )
    default:
      return (
        <div className="rappel-reglage">
          <div role="status" className="rappel__message">
            {rappel.etat === 'actif' ? <p>✓ Le Rappel du matin est activé sur cet appareil.</p> : <Message rappel={rappel} aide={aideIci()} />}
          </div>
          <Boutons rappel={rappel} />
        </div>
      )
  }
}
