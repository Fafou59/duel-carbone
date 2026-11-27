import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CALIBRAGE, GESTES_CALCULES } from '../../donnees/index.ts'
import { CONSEILS } from '../../donnees/conseils.ts'
import { DUELS_THEMATIQUES } from '../../donnees/duels-thematiques.ts'
import { moinsEmetteur, plusEmetteur } from '../../domaine/duel.ts'
import { genererPartie } from '../../domaine/generateur.ts'
import { hasardReproductible } from '../../domaine/hasard.ts'
import { ajouterParticipant, avancerSeance, creerSeance, repondre, type EtatSeance } from '../../domaine/seance.ts'
import { preparerLesVues, type MessageDuClient, type MessageDuServeur } from '../../domaine/seance-messages.ts'
import { creerMemoire } from '../../navigateur/memoire.ts'
import { creerMemoireDeSeance } from '../../navigateur/memoire-seance.ts'
import type { EtatDeConnexion, ServeurDesSeances } from '../../navigateur/seance.ts'
import { ModeAnimation } from './ModeAnimation.tsx'

const CODE = 'K7RM4P'
const JETON = 'jeton-de-l-animateur-0123456789abcdef'
const DUELS = genererPartie({
  gestes: GESTES_CALCULES,
  thematiques: DUELS_THEMATIQUES,
  forcerThematique: true,
  coefficients: CALIBRAGE.coefficients,
  hasard: hasardReproductible(5),
})

/** Un faux serveur : il enregistre les créations et les commandes, et le test lui fait envoyer des vues. */
function fauxServeur({ creation = { code: CODE, jetonAnimateur: JETON } as { code: string; jetonAnimateur: string } | null } = {}) {
  const commandes: MessageDuClient[] = []
  let ecouter: ((m: MessageDuServeur) => void) | null = null
  let etat: ((e: EtatDeConnexion) => void) | null = null
  const serveur: ServeurDesSeances = {
    creer: vi.fn(async () => creation),
    lire: vi.fn(async () => ({ code: CODE, avecClassement: true, ouverte: true })),
    connecter: vi.fn(({ bonjour, surMessage, surEtat }) => {
      commandes.push(bonjour)
      ecouter = surMessage
      etat = surEtat ?? null
      etat?.('connecte')
      return { envoyer: (m: MessageDuClient) => (commandes.push(m), true), fermer: () => {} }
    }),
  }
  /** Le serveur envoie la vue de l'Animateur pour cet état de la Séance. */
  const montrer = (seance: EtatSeance, fermee = false) =>
    act(() => ecouter?.({ type: 'etat', vue: preparerLesVues(seance, { code: CODE, fermee }).animateur }))
  return { serveur, commandes, montrer, envoyer: (m: MessageDuServeur) => act(() => ecouter?.(m)) }
}

/** Un stockage en mémoire, comme le localStorage d'un navigateur neuf. */
function stockage() {
  const donnees = new Map<string, string>()
  return { getItem: (cle: string) => donnees.get(cle) ?? null, setItem: (cle: string, valeur: string) => void donnees.set(cle, valeur) }
}
const memoires = () => ({ memoire: creerMemoire(stockage()), memoireSeance: creerMemoireDeSeance(stockage()) })

function salle(classement = true): EtatSeance {
  let etat = creerSeance({ classement, duels: DUELS })
  for (const pseudo of ['Camille', 'Léo', 'Inès']) {
    const arrivee = ajouterParticipant(etat, pseudo)
    if ('etat' in arrivee) etat = arrivee.etat
  }
  return etat
}
const avancer = (etat: EtatSeance, conseil: string | null = null) => avancerSeance(etat, etat.etape, conseil)

describe('la page d’explication du Mode animation', () => {
  it('explique la Séance, puis la crée avec 10 Duels tirés ici, dont un Duel thématique', async () => {
    const { serveur } = fauxServeur()
    const { memoire, memoireSeance } = memoires()
    render(<ModeAnimation serveur={serveur} memoire={memoire} memoireSeance={memoireSeance} hasard={hasardReproductible(1)} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Animer une Séance' })).toBeInTheDocument()
    expect(screen.getByText(/tout est effacé au bout de 24 heures/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /Sans classement/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Créer la Séance' }))

    await waitFor(() => expect(serveur.connecter).toHaveBeenCalled())
    const demande = vi.mocked(serveur.creer).mock.calls[0][0]
    expect(demande.classement).toBe(false)
    expect(demande.duels).toHaveLength(10)
    const thematiques = new Set(DUELS_THEMATIQUES.map((t) => [t.a, t.b].sort().join('|')))
    expect(demande.duels.some((code) => thematiques.has(code.split('>').sort().join('|')))).toBe(true)
    // La Séance est retenue (reprise après fermeture de l'onglet), et ses paires comptent parmi les récentes.
    expect(memoireSeance.animee()).toEqual({ code: CODE, jeton: JETON })
    expect(memoire.pairesRecentes().size).toBe(10)
  })

  it('dit quand la Séance n’a pas pu être créée', async () => {
    const { serveur } = fauxServeur({ creation: null })
    render(<ModeAnimation serveur={serveur} {...memoires()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Créer la Séance' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/n’a pas pu être créée/)
    expect(screen.getByRole('button', { name: 'Créer la Séance' })).toBeEnabled()
  })

  it('reprend la Séance en cours après une fermeture de l’onglet, ou l’oublie si elle n’existe plus', async () => {
    const { serveur, commandes } = fauxServeur()
    const { memoire, memoireSeance } = memoires()
    memoireSeance.retenirAnimee({ code: CODE, jeton: JETON })
    const { unmount } = render(<ModeAnimation serveur={serveur} memoire={memoire} memoireSeance={memoireSeance} />)
    await waitFor(() => expect(serveur.connecter).toHaveBeenCalled())
    expect(commandes[0]).toEqual({ type: 'bonjour', role: 'animateur', jeton: JETON })
    unmount()

    vi.mocked(serveur.lire).mockResolvedValueOnce('inconnue')
    render(<ModeAnimation serveur={serveur} memoire={memoire} memoireSeance={memoireSeance} />)
    expect(await screen.findByRole('button', { name: 'Créer la Séance' })).toBeInTheDocument()
    expect(memoireSeance.animee()).toBeNull()
  })
})

describe('l’écran projeté de la Séance', () => {
  async function lancer() {
    const faux = fauxServeur()
    const { memoire, memoireSeance } = memoires()
    memoireSeance.retenirAnimee({ code: CODE, jeton: JETON })
    render(<ModeAnimation serveur={faux.serveur} memoire={memoire} memoireSeance={memoireSeance} />)
    await waitFor(() => expect(faux.serveur.connecter).toHaveBeenCalled())
    return { ...faux, memoire, memoireSeance }
  }
  const espace = () => fireEvent.keyDown(document.body, { key: ' ' })

  it('montre le QR code, le code et les pseudos qui arrivent ; un pseudo se retire d’un clic', async () => {
    const { montrer, commandes } = await lancer()
    montrer(salle())
    expect(screen.getByRole('img', { name: 'QR code pour rejoindre la Séance' })).toBeInTheDocument()
    expect(screen.getByText(CODE)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retirer Léo' }))
    expect(commandes.at(-1)).toEqual({ type: 'retirer', numero: 2 })
  })

  it('avance avec Espace, en disant au serveur l’étape qu’il voyait', async () => {
    const { montrer, commandes } = await lancer()
    montrer(salle())
    espace()
    expect(commandes.at(-1)).toEqual({ type: 'avancer', depuis: { phase: 'attente' }, conseil: null })
    expect(screen.getByRole('button', { name: /Lancer le premier Duel/ })).toBeInTheDocument()
  })

  it('ne lance pas le premier Duel avant 2 Participants, et dit pourquoi', async () => {
    const { montrer, commandes } = await lancer()
    const seul = ajouterParticipant(creerSeance({ classement: true, duels: DUELS }), 'Camille')
    if (!('etat' in seul)) throw new Error('Camille refusée')
    montrer(seul.etat)
    const bouton = screen.getByRole('button', { name: /Lancer le premier Duel/ })
    expect(bouton).toBeDisabled()
    expect(bouton).toHaveAccessibleDescription('Il faut au moins 2 Participants pour lancer le premier Duel.')
    const avant = commandes.length
    espace()
    expect(commandes).toHaveLength(avant)

    montrer(salle())
    expect(screen.getByRole('button', { name: /Lancer le premier Duel/ })).toBeEnabled()
    expect(screen.queryByText(/Il faut au moins 2 Participants/)).not.toBeInTheDocument()
  })

  it('pendant un Duel, montre qui a répondu sans dire ce qu’ils ont choisi ; à la révélation, la part de la salle', async () => {
    const { montrer } = await lancer()
    let etat = avancer(salle())
    etat = repondre(repondre(etat, 2, 0, moinsEmetteur(DUELS[0]).id), 1, 0, plusEmetteur(DUELS[0]).id)
    montrer(etat)
    expect(screen.getByText('Lequel émet le plus ?')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Ont répondu' })).getAllByRole('listitem').map((li) => li.firstChild?.textContent)).toEqual([
      'Léo',
      'Camille',
    ])
    expect(screen.queryByText(/de la salle/)).not.toBeInTheDocument()

    montrer(avancer(etat))
    expect(screen.getAllByText(/de la salle/)).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Voir le classement/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Voir le détail des émissions' }))
    expect(screen.getByRole('dialog', { name: 'Le détail des émissions' })).toBeVisible()
  })

  it('choisit le Conseil en passant au classement final, puis le montre et le retient', async () => {
    const { montrer, commandes, memoire } = await lancer()
    let etat = salle()
    while (!(etat.etape.phase === 'revelation' && etat.etape.index === 9)) {
      if (etat.etape.phase === 'duel') etat = repondre(etat, 1, etat.etape.index, moinsEmetteur(DUELS[etat.etape.index]).id)
      etat = avancer(etat)
    }
    montrer(etat)
    expect(screen.getByText('Qui monte sur le podium ?')).toBeInTheDocument()
    espace()
    const commande = commandes.at(-1)
    expect(commande).toMatchObject({ type: 'avancer', depuis: { phase: 'revelation', index: 9 } })
    const conseil = commande?.type === 'avancer' ? commande.conseil : null
    expect(CONSEILS.map((c) => c.id)).toContain(conseil)

    montrer(avancer(etat, conseil))
    expect(screen.getByRole('heading', { level: 1, name: 'Classement final' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Un conseil/ })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(memoire.conseilsRecents()).toEqual([conseil])
    expect(screen.getByRole('button', { name: /Rejouer une nouvelle Séance/ })).toBeInTheDocument()
  })

  it('sans Classement, ne montre ni pseudo ni classement', async () => {
    const { montrer } = await lancer()
    let etat = salle(false)
    montrer(etat)
    expect(screen.queryByRole('list', { name: 'Participants' })).not.toBeInTheDocument()
    etat = avancer(avancer(etat))
    montrer(etat)
    expect(screen.getByRole('button', { name: /Duel 2/ })).toBeInTheDocument()
  })

  it('dit quand la Séance est fermée, et propose d’en créer une autre', async () => {
    const { montrer } = await lancer()
    montrer(salle(), true)
    expect(screen.getByText(/est fermée/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nouvelle Séance' })).toBeInTheDocument()
  })

  it('revient à la page d’explication si la Séance n’existe plus', async () => {
    const { envoyer, memoireSeance } = await lancer()
    envoyer({ type: 'refus', raison: 'inconnue' })
    expect(await screen.findByRole('button', { name: 'Créer la Séance' })).toBeInTheDocument()
    expect(memoireSeance.animee()).toBeNull()
  })
})
