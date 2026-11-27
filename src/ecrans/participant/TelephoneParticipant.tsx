/**
 * Le Mode animation sur le téléphone d'un Participant (adresse #rejoindre/<code>, celle du QR code ; PRD
 * docs/prd-mode-animation.md, section 6 ; ADR 0007). Chargé à part du reste du jeu (Racine.tsx).
 *
 * Le téléphone ne décide de rien : il affiche la vue que lui envoie le serveur de la Séance (VueParticipant,
 * src/domaine/seance-messages.ts), étape par étape, au rythme de l'Animateur, et lui transmet ses réponses. Ses
 * seuls choix à lui : le jeton tiré en rejoignant la Séance, et la petite phrase du classement intermédiaire
 * (domaine/seance-phrases.ts).
 *
 * Le code, le jeton et le pseudo sont gardés dans la mémoire du navigateur (memoire-seance.ts) : si le téléphone se
 * met en veille ou recharge la page, il retrouve la Séance où elle en est.
 */
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { Frise } from '../../composants/Vitrine.tsx'
import { duelsDepuisCodes } from '../../domaine/calendrier.ts'
import { normaliserCode } from '../../domaine/seance.ts'
import type { MessageDuServeur, VueParticipant } from '../../domaine/seance-messages.ts'
import { categorieDePlace, phraseDePlace } from '../../domaine/seance-phrases.ts'
import { DUELS_THEMATIQUES } from '../../donnees/duels-thematiques.ts'
import { GESTES_CALCULES } from '../../donnees/index.ts'
import { codeDeLAdresse } from '../../navigateur/adresse.ts'
import { creerMemoireDeSeance, tirerUnJeton, type MemoireDeSeance, type SeanceRejointe } from '../../navigateur/memoire-seance.ts'
import { serveurDesSeances, type ConnexionDeSeance, type EtatDeConnexion, type ServeurDesSeances } from '../../navigateur/seance.ts'
import { TITRE_SEANCE_PARTICIPANT } from '../../referencement.ts'
import { DuelDeSeance } from './DuelDeSeance.tsx'
import { Rejoindre } from './Rejoindre.tsx'
import { ClassementIntermediaire, FinDeSeance } from './Resultats.tsx'
import '../EcranPartie.css'
import '../EcranFin.css'
import '../../composants/CommeToi.css'
import './TelephoneParticipant.css'

type Props = {
  /** Remplaçables dans les tests : la mémoire de la Séance, le serveur et le jeton. */
  memoireSeance?: MemoireDeSeance
  serveur?: ServeurDesSeances
  tirerJeton?: () => string
}

/** Ce que le formulaire doit remontrer quand on y revient (Séance terminée, pseudo refusé, retrait…). */
type Retour = { message: string | null; code: string; pseudo: string }

/** Pourquoi le serveur refuse ce téléphone, en clair. null : un refus qui n'arrête rien (on l'ignore). */
function messageDuRefus(raison: string, dejaDansLaSeance: boolean): string | null {
  switch (raison) {
    case 'inconnue':
      return 'Cette Séance n’existe plus : elle a été effacée.'
    case 'terminee':
    case 'fermee':
      // Déjà dans la Séance, on garde l'écran de fin sous les yeux.
      return dejaDansLaSeance ? null : 'Cette Séance est terminée : on ne peut plus la rejoindre.'
    case 'pleine':
      return 'La Séance est complète : elle accueille 100 Participants au plus.'
    case 'pseudo':
      return 'Ce pseudo ne convient pas : choisis-en un autre, de 20 caractères au plus.'
    default:
      return null
  }
}

export function TelephoneParticipant({
  memoireSeance: memoireFournie,
  serveur: serveurFourni,
  tirerJeton = tirerUnJeton,
}: Props) {
  const [memoireSeance] = useState(() => memoireFournie ?? creerMemoireDeSeance())
  const [serveur] = useState(() => serveurFourni ?? serveurDesSeances())
  // La Séance rejointe : celle de la mémoire, si l'adresse ne désigne pas une autre Séance (nouveau QR code scanné).
  const [seance, setSeance] = useState<SeanceRejointe | null>(() => {
    const retenue = memoireSeance.rejointe()
    const code = normaliserCode(codeDeLAdresse())
    return retenue && (!code || code === retenue.code) ? retenue : null
  })
  const [retour, setRetour] = useState<Retour>(() => ({ message: null, code: codeDeLAdresse(), pseudo: '' }))
  const [vue, setVue] = useState<VueParticipant | null>(null)
  const [connexion, setConnexion] = useState<EtatDeConnexion>('connexion')
  // Chaque « Réessayer » rouvre une connexion neuve.
  const [tentative, setTentative] = useState(0)
  const envoyer = useRef<ConnexionDeSeance['envoyer']>(() => false)
  // La réponse en cours d'envoi (le serveur ne l'a pas encore confirmée), et l'échec d'un envoi.
  const [envoi, setEnvoi] = useState<{ duel: number; idChoisi: string } | null>(null)
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null)

  useEffect(() => {
    document.title = TITRE_SEANCE_PARTICIPANT
  }, [])

  /** On quitte la Séance (refus, retrait, Séance effacée) : le jeton est oublié, retour au formulaire. */
  const quitter = (message: string | null) => {
    memoireSeance.oublierRejointe()
    setRetour({ message, code: seance?.code ?? '', pseudo: seance?.pseudo ?? '' })
    setSeance(null)
    setVue(null)
    setEnvoi(null)
    setErreurEnvoi(null)
  }

  // Les messages du serveur (useEffectEvent : la connexion, ouverte une fois, lit toujours l'état le plus récent).
  const surMessage = useEffectEvent((message: MessageDuServeur) => {
    if (message.type === 'etat' && message.vue.role === 'participant') {
      setVue(message.vue)
      return
    }
    if (message.type === 'retire') {
      quitter('L’Animateur t’a retiré de la Séance. Tu peux la rejoindre à nouveau, sous un autre pseudo.')
      return
    }
    if (message.type === 'refus') {
      const texte = messageDuRefus(message.raison, vue !== null)
      if (texte) quitter(texte)
    }
  })

  // La connexion à la Séance, ouverte tant qu'on y est ; elle se rétablit d'elle-même si elle se coupe, et le jeton
  // (renvoyé à chaque fois) redonne au téléphone sa place, ses réponses et son score.
  const code = seance?.code
  const jeton = seance?.jeton
  const pseudo = seance?.pseudo ?? null
  useEffect(() => {
    if (!code || !jeton) return
    const ouverte = serveur.connecter({
      code,
      bonjour: { type: 'bonjour', role: 'participant', jeton, pseudo },
      surMessage: (message) => surMessage(message),
      surEtat: setConnexion,
    })
    envoyer.current = ouverte.envoyer
    return () => {
      envoyer.current = () => false
      ouverte.fermer()
    }
  }, [code, jeton, pseudo, serveur, tentative])

  // Les 10 Duels, rebâtis à partir de leurs codes avec le catalogue du jeu.
  const codes = vue?.duels.join(',') ?? ''
  const duels = useMemo(() => {
    if (!codes) return null
    try {
      return duelsDepuisCodes(codes.split(','), GESTES_CALCULES, DUELS_THEMATIQUES)
    } catch {
      return null // un Geste inconnu de cette version du jeu
    }
  }, [codes])

  const etape = vue?.etape ?? null
  const indexEnCours = etape && 'index' in etape ? etape.index : null

  // La réponse en attente de confirmation : seulement pendant son Duel, tant que le serveur ne l'a pas reçue.
  const enAttente =
    envoi && etape?.phase === 'duel' && etape.index === envoi.duel && vue?.moi.choix[envoi.duel] === null ? envoi : null

  // La connexion revient alors qu'une réponse n'a pas été confirmée : on la renvoie (le serveur ignore un doublon).
  const renvoyer = useEffectEvent(() => {
    if (enAttente) envoyer.current({ type: 'repondre', duel: enAttente.duel, idChoisi: enAttente.idChoisi })
  })
  useEffect(() => {
    if (connexion === 'connecte') renvoyer()
  }, [connexion])

  const choisir = (idChoisi: string) => {
    if (!vue || vue.etape.phase !== 'duel' || vue.fermee) return
    const duel = vue.etape.index
    if (vue.moi.choix[duel] !== null || enAttente) return
    if (envoyer.current({ type: 'repondre', duel, idChoisi })) {
      setEnvoi({ duel, idChoisi })
      setErreurEnvoi(null)
    } else {
      setErreurEnvoi('Pas de connexion : ta réponse n’est pas partie. Réessaie dans un instant.')
    }
  }

  // À chaque nouvelle étape, on remonte en haut de l'écran et le focus va au titre : clavier et lecteur d'écran
  // repartent du bon endroit (comme à chaque Duel d'une Partie).
  const titre = useRef<HTMLElement | null>(null)
  const retenirTitre = (element: HTMLElement | null) => {
    titre.current = element
  }
  const cleDEtape = !seance ? 'rejoindre' : etape ? `${etape.phase}-${indexEnCours ?? ''}` : 'connexion'
  const premierAffichage = useRef(true)
  useEffect(() => {
    if (premierAffichage.current) {
      premierAffichage.current = false
      return
    }
    window.scrollTo({ top: 0 })
    titre.current?.focus()
  }, [cleDEtape])

  const rejoindre = ({ code: choisi, pseudo: donne }: { code: string; pseudo: string | null }) => {
    const nouvelle: SeanceRejointe = { code: choisi, jeton: tirerJeton(), pseudo: donne }
    memoireSeance.retenirRejointe(nouvelle)
    setConnexion('connexion')
    setSeance(nouvelle)
  }

  let contenu
  if (!seance) {
    contenu = (
      <Rejoindre
        codeInitial={retour.code}
        pseudoInitial={retour.pseudo}
        message={retour.message}
        serveur={serveur}
        onRejoindre={rejoindre}
        refTitre={retenirTitre}
      />
    )
  } else if (!vue) {
    contenu =
      connexion === 'arretee' ? (
        <section className="telephone__centre">
          <h2 ref={retenirTitre} tabIndex={-1}>
            La Séance ne répond pas
          </h2>
          <p>Vérifie ta connexion, puis réessaie.</p>
          <button type="button" className="bouton telephone__bouton-large" onClick={() => setTentative((n) => n + 1)}>
            Réessayer
          </button>
          <button type="button" className="lien-bouton" onClick={() => quitter(null)}>
            Rejoindre une autre Séance
          </button>
        </section>
      ) : (
        <section className="telephone__centre" aria-busy="true">
          <h2 ref={retenirTitre} tabIndex={-1}>
            Connexion à la Séance…
          </h2>
        </section>
      )
  } else if (!duels) {
    contenu = (
      <section className="telephone__centre">
        <h2 ref={retenirTitre} tabIndex={-1}>
          Cette Séance ne s’affiche pas
        </h2>
        <p>Elle utilise une autre version du jeu : recharge la page pour la mettre à jour.</p>
      </section>
    )
  } else if (vue.etape.phase === 'attente') {
    contenu = (
      <section className="telephone__centre">
        <h2 ref={retenirTitre} tabIndex={-1} className="telephone__grand">
          C’est bon{vue.moi.pseudo ? `, ${vue.moi.pseudo}` : ''} !
        </h2>
        <p>Regarde l’écran : la Séance va bientôt commencer.</p>
        <p className="telephone__discret">
          {vue.participants} Participant{vue.participants > 1 ? 's' : ''} dans la Séance
        </p>
      </section>
    )
  } else if (vue.etape.phase === 'duel' || vue.etape.phase === 'revelation') {
    const index = vue.etape.index
    const revele = vue.etape.phase === 'revelation'
    const confirme = vue.moi.choix[index]
    contenu = (
      <DuelDeSeance
        key={index}
        duels={duels}
        index={index}
        revele={revele}
        choix={confirme ?? (envoi?.duel === index ? envoi.idChoisi : null)}
        confirme={confirme !== null}
        arriveApres={vue.moi.premierDuel > index}
        score={vue.moi.score.bonnes}
        repondus={vue.repondus}
        participants={vue.participants}
        salle={revele ? (vue.salle[index] ?? null) : null}
        erreur={revele ? null : erreurEnvoi}
        onChoisir={choisir}
        refTitre={retenirTitre}
      />
    )
  } else if (vue.etape.phase === 'classement') {
    const index = vue.etape.index
    // La phrase de ce classement-là, selon la place : une par classement, jamais deux fois la même.
    const phrase = vue.moi.place ? phraseDePlace(categorieDePlace({ ...vue.moi.place, participants: vue.participants }), index) : null
    contenu = <ClassementIntermediaire vue={vue} index={index} phrase={phrase} refTitre={retenirTitre} />
  } else {
    contenu = <FinDeSeance vue={vue} duels={duels} refTitre={retenirTitre} />
  }

  // Ce que l'on dit de la connexion, au-dessus de l'écran, une fois dans la Séance.
  const fermee = vue?.fermee && vue.etape.phase !== 'fin'
  const coupee = seance && vue && !vue.fermee && connexion !== 'connecte'

  // La frise d'icônes, fixée en bas de Rejoindre et de l'attente : la même, qui continue de défiler de l'une à l'autre.
  const frise = !seance || !vue || vue.etape.phase === 'attente'

  return (
    <>
      <div className="page telephone">
        <header className="entete">
          {/* Le logo ne mène nulle part : un toucher par mégarde ne doit pas faire quitter la Séance. */}
          <h1>
            <span className="entete__lien">
              <img className="entete__logo" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="36" height="36" />
              Duel Carbone
            </span>
          </h1>
        </header>
        <main>
          <div role="status" className="telephone__connexion">
            {coupee && <p>Connexion perdue : on te reconnecte…</p>}
            {fermee && <p>Cette Séance est fermée : elle ne dure que 3 heures.</p>}
          </div>
          {contenu}
        </main>
      </div>
      {frise && (
        <div className="telephone__frise">
          <Frise />
        </div>
      )}
    </>
  )
}
