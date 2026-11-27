import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CALIBRAGE, GESTES_CALCULES } from '../../donnees/index.ts'
import { DUELS_THEMATIQUES } from '../../donnees/duels-thematiques.ts'
import { CONSEILS } from '../../donnees/conseils.ts'
import { moinsEmetteur, plusEmetteur } from '../../domaine/duel.ts'
import { genererPartie } from '../../domaine/generateur.ts'
import { hasardReproductible } from '../../domaine/hasard.ts'
import { ajouterParticipant, avancerSeance, creerSeance, repondre, type EtatSeance } from '../../domaine/seance.ts'
import { preparerLesVues, type MessageDuClient, type MessageDuServeur, type VueParticipant } from '../../domaine/seance-messages.ts'
import { PHRASES_DE_PLACE } from '../../domaine/seance-phrases.ts'
import { creerMemoireDeSeance, type MemoireDeSeance } from '../../navigateur/memoire-seance.ts'
import type { Stockage } from '../../navigateur/memoire.ts'
import type { EtatDeConnexion, InformationsDeSeance, ServeurDesSeances } from '../../navigateur/seance.ts'
import { TelephoneParticipant } from './TelephoneParticipant.tsx'

const CODE = 'K7RM4P'
const JETON = 'jeton-de-camille-0123456789abcdefghijkl'
const DUELS = genererPartie({
  gestes: GESTES_CALCULES,
  thematiques: DUELS_THEMATIQUES,
  forcerThematique: true,
  coefficients: CALIBRAGE.coefficients,
  hasard: hasardReproductible(3),
})
const bon = (duel: number) => plusEmetteur(DUELS[duel]).id
const faux = (duel: number) => moinsEmetteur(DUELS[duel]).id

// --- Une vraie Séance, calculée par le domaine : Camille (1), Léo (2), Inès (3) ---

function arrivee(etat: EtatSeance, pseudo: string): EtatSeance {
  const resultat = ajouterParticipant(etat, pseudo)
  if ('refus' in resultat) throw new Error(resultat.refus)
  return resultat.etat
}
const avancer = (etat: EtatSeance, conseil: string | null = null) => avancerSeance(etat, etat.etape, conseil)
const enAttente = (classement = true) =>
  ['Camille', 'Léo', 'Inès'].reduce(arrivee, creerSeance({ classement, duels: DUELS }))
const vueDe = (etat: EtatSeance, numero = 1): VueParticipant => preparerLesVues(etat, { code: CODE, fermee: false }).participant(numero)!

// --- Un faux serveur : le test pousse les vues, et lit ce que le téléphone envoie ---

type Connexion = {
  bonjour: MessageDuClient
  surMessage: (message: MessageDuServeur) => void
  surEtat: (etat: EtatDeConnexion) => void
  ouverte: boolean
  fermee: boolean
}

function serveurDeTest(informations: Omit<InformationsDeSeance, 'code'> | 'inconnue' = { avecClassement: true, ouverte: true }) {
  const envoyes: MessageDuClient[] = []
  const connexions: Connexion[] = []
  const serveur: ServeurDesSeances = {
    creer: async () => null,
    lire: async (code) => (informations === 'inconnue' ? 'inconnue' : { code, ...informations }),
    connecter: ({ bonjour, surMessage, surEtat = () => {} }) => {
      const connexion: Connexion = { bonjour, surMessage, surEtat, ouverte: false, fermee: false }
      connexions.push(connexion)
      surEtat('connexion')
      return {
        envoyer: (message) => {
          if (!connexion.ouverte) return false
          envoyes.push(message)
          return true
        },
        fermer: () => {
          connexion.fermee = true
        },
      }
    },
  }
  const derniere = () => connexions[connexions.length - 1]
  return {
    serveur,
    envoyes,
    connexions,
    derniere,
    /** La connexion s'ouvre, puis le serveur envoie la vue. */
    pousser: (vue: VueParticipant) =>
      act(() => {
        const c = derniere()
        if (!c.ouverte) {
          c.ouverte = true
          c.surEtat('connecte')
        }
        c.surMessage({ type: 'etat', vue })
      }),
    recevoir: (message: MessageDuServeur) => act(() => derniere().surMessage(message)),
    etat: (etat: EtatDeConnexion) =>
      act(() => {
        derniere().ouverte = etat === 'connecte'
        derniere().surEtat(etat)
      }),
  }
}

function stockageDeTest(): Stockage {
  const donnees: Record<string, string> = {}
  return { getItem: (cle) => donnees[cle] ?? null, setItem: (cle, valeur) => void (donnees[cle] = valeur) }
}

function afficher({
  faux: fauxServeur = serveurDeTest(),
  memoire = creerMemoireDeSeance(stockageDeTest()),
}: { faux?: ReturnType<typeof serveurDeTest>; memoire?: MemoireDeSeance } = {}) {
  render(<TelephoneParticipant serveur={fauxServeur.serveur} memoireSeance={memoire} tirerJeton={() => JETON} />)
  return { ...fauxServeur, memoire }
}

/** Le téléphone de Camille, déjà dans la Séance (jeton retenu) : il se connecte sans passer par le formulaire. */
function dejaDansLaSeance(options: { faux?: ReturnType<typeof serveurDeTest> } = {}) {
  const memoire = creerMemoireDeSeance(stockageDeTest())
  memoire.retenirRejointe({ code: CODE, jeton: JETON, pseudo: 'Camille' })
  return afficher({ ...options, memoire })
}

const frise = () => screen.queryByRole('button', { name: 'Mettre en pause le défilement des icônes' })
const carte = (nom: RegExp) => screen.getByRole('button', { name: nom })

beforeEach(() => {
  window.location.hash = `#rejoindre/${CODE}`
})
afterEach(() => {
  window.location.hash = ''
})

describe('rejoindre la Séance', () => {
  it('remplit le code du QR code, demande un pseudo quand la Séance a un Classement, puis se présente au serveur', async () => {
    const { connexions, memoire } = afficher()
    expect(screen.getByRole('heading', { name: 'Rejoindre la Séance' })).toBeInTheDocument()
    expect(screen.getByLabelText('Code de la Séance')).toHaveValue(CODE)
    const pseudo = await screen.findByLabelText('Ton pseudo (affiché au Classement)')
    expect(screen.getByText('Il est effacé à la fin de la Séance.')).toBeInTheDocument()
    expect(frise()).toBeInTheDocument()

    fireEvent.change(pseudo, { target: { value: '  Camille ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }))
    expect(connexions).toHaveLength(1)
    expect(connexions[0].bonjour).toEqual({ type: 'bonjour', role: 'participant', jeton: JETON, pseudo: 'Camille' })
    expect(memoire.rejointe()).toMatchObject({ code: CODE, jeton: JETON, pseudo: 'Camille' })
  })

  it('refuse un pseudo vide, en le disant', async () => {
    const { connexions } = afficher()
    await screen.findByLabelText('Ton pseudo (affiché au Classement)')
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }))
    expect(connexions).toHaveLength(0)
    expect(screen.getByLabelText('Ton pseudo (affiché au Classement)')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/Choisis un pseudo, de 20 caractères au plus/)).toBeInTheDocument()
  })

  it('ne demande pas de pseudo sans Classement', async () => {
    const { connexions } = afficher({ faux: serveurDeTest({ avecClassement: false, ouverte: true }) })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rejoindre' })).toBeEnabled())
    expect(screen.queryByLabelText(/pseudo/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }))
    expect(connexions[0].bonjour).toMatchObject({ pseudo: null })
  })

  it('accepte un code tapé à la main, en minuscules ou avec des espaces', async () => {
    window.location.hash = '#rejoindre'
    afficher()
    const code = screen.getByLabelText('Code de la Séance')
    expect(code).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Rejoindre' })).toBeDisabled()
    fireEvent.change(code, { target: { value: 'k7r m4p' } })
    expect(await screen.findByLabelText('Ton pseudo (affiché au Classement)')).toBeInTheDocument()
  })

  it('dit quand le code ne mène à aucune Séance, ou à une Séance terminée', async () => {
    afficher({ faux: serveurDeTest('inconnue') })
    expect(await screen.findByText(/Aucune Séance avec ce code/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejoindre' })).toBeDisabled()
  })

  it('revient au formulaire, pseudo gardé, quand le serveur refuse le pseudo', async () => {
    const srv = afficher()
    fireEvent.change(await screen.findByLabelText('Ton pseudo (affiché au Classement)'), { target: { value: 'Camille' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }))
    srv.recevoir({ type: 'refus', raison: 'pseudo' })
    expect(screen.getByRole('alert')).toHaveTextContent('Ce pseudo ne convient pas')
    expect(await screen.findByLabelText('Ton pseudo (affiché au Classement)')).toHaveValue('Camille')
    expect(srv.memoire.rejointe()).toBeNull()
  })
})

describe('l’attente', () => {
  it('accueille le Participant par son pseudo, avec la même frise qu’au formulaire', async () => {
    const srv = afficher()
    const friseDuFormulaire = frise()
    fireEvent.change(await screen.findByLabelText('Ton pseudo (affiché au Classement)'), { target: { value: 'Camille' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre' }))
    srv.pousser(vueDe(enAttente()))
    expect(screen.getByRole('heading', { name: 'C’est bon, Camille !' })).toBeInTheDocument()
    expect(screen.getByText('Regarde l’écran : la Séance va bientôt commencer.')).toBeInTheDocument()
    expect(screen.getByText('3 Participants dans la Séance')).toBeInTheDocument()
    // La même frise : elle continue de défiler sans repartir du début.
    expect(frise()).toBe(friseDuFormulaire)
  })
})

describe('un Duel', () => {
  const enDuel = () => avancer(enAttente())

  it('envoie la réponse, marque « Ton choix » et attend la révélation, sans frise', () => {
    const srv = dejaDansLaSeance()
    srv.pousser(vueDe(enDuel()))
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
    expect(frise()).not.toBeInTheDocument()

    fireEvent.click(carte(new RegExp(DUELS[0].a.titre)))
    expect(srv.envoyes).toEqual([{ type: 'repondre', duel: 0, idChoisi: DUELS[0].a.id }])
    expect(screen.getByText('Envoi de ta réponse…')).toBeInTheDocument()

    // Le serveur confirme : Camille et Léo ont répondu.
    srv.pousser(vueDe(repondre(repondre(enDuel(), 1, 0, DUELS[0].a.id), 2, 0, faux(0))))
    const choisie = carte(new RegExp(DUELS[0].a.titre))
    expect(within(choisie).getByText('Ton choix')).toBeInTheDocument()
    expect(choisie).toBeDisabled()
    expect(carte(new RegExp(DUELS[0].b.titre))).toHaveClass('carte--ecartee')
    expect(screen.getByText(/Réponse envoyée/).textContent).toBe('✓ Réponse envoyée · 2/3 ont répondu')
    expect(screen.getByText(/Regarde l’écran : la réponse va être révélée/)).toBeInTheDocument()
    // Pas de « Duel suivant » : c'est l'Animateur qui fait avancer.
    expect(screen.queryByRole('button', { name: /Duel suivant/ })).not.toBeInTheDocument()
  })

  it('se joue au clavier : 2 choisit la seconde carte', () => {
    const srv = dejaDansLaSeance()
    srv.pousser(vueDe(enDuel()))
    fireEvent.keyDown(window, { key: '2' })
    expect(srv.envoyes).toEqual([{ type: 'repondre', duel: 0, idChoisi: DUELS[0].b.id }])
  })

  it('dit quand la réponse n’a pas pu partir, et renvoie une réponse non confirmée au retour de la connexion', () => {
    const srv = dejaDansLaSeance()
    srv.pousser(vueDe(enDuel()))
    srv.etat('reconnexion')
    expect(screen.getByText('Connexion perdue : on te reconnecte…')).toBeInTheDocument()
    fireEvent.click(carte(new RegExp(DUELS[0].a.titre)))
    expect(screen.getByText(/ta réponse n’est pas partie/)).toBeInTheDocument()
    expect(srv.envoyes).toEqual([])

    // La connexion revient ; Camille répond, mais la confirmation se perd dans une nouvelle coupure.
    srv.etat('connecte')
    fireEvent.click(carte(new RegExp(DUELS[0].a.titre)))
    srv.etat('reconnexion')
    srv.etat('connecte')
    expect(srv.envoyes).toEqual([
      { type: 'repondre', duel: 0, idChoisi: DUELS[0].a.id },
      { type: 'repondre', duel: 0, idChoisi: DUELS[0].a.id },
    ])
  })
})

describe('la révélation', () => {
  it('fête la bonne réponse comme dans une Partie, avec la part de la salle comme toi, sans bandeau', () => {
    const srv = dejaDansLaSeance()
    // Camille et Inès ont trouvé, Léo s'est trompé.
    srv.pousser(vueDe(avancer(repondre(repondre(repondre(avancer(enAttente()), 1, 0, bon(0)), 2, 0, faux(0)), 3, 0, bon(0)))))
    expect(screen.getByText('✓ Bonne réponse !')).toBeInTheDocument()
    expect(screen.getByText(/67 % de la salle comme toi/)).toBeInTheDocument()
    expect(document.querySelector('.carte--bon-choix')).not.toBeNull()
    expect(screen.queryByText(/Réponse envoyée/)).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Explication' })).toBeInTheDocument()
    expect(screen.getByText('Score : 1')).toBeInTheDocument()
  })

  it('dit au Participant qui n’a pas répondu que ce Duel ne compte pas', () => {
    const srv = dejaDansLaSeance()
    srv.pousser(vueDe(avancer(repondre(avancer(enAttente()), 2, 0, faux(0)))))
    expect(screen.getByText(/Pas de réponse à temps/)).toBeInTheDocument()
    expect(screen.queryByText(/de la salle comme toi/)).not.toBeInTheDocument()
  })
})

describe('le classement intermédiaire', () => {
  it('montre le score, la place par palier avec ▲▼ et la phrase de ce classement, selon la place', () => {
    const memoire = creerMemoireDeSeance(stockageDeTest())
    memoire.retenirRejointe({ code: CODE, jeton: JETON, pseudo: 'Léo' })
    const srv = afficher({ memoire })
    // Duel 1 : Camille et Inès trouvent, Léo (2) se trompe : 2e palier, sur le podium.
    let etat = avancer(repondre(repondre(repondre(avancer(enAttente()), 1, 0, bon(0)), 2, 0, faux(0)), 3, 0, bon(0)))
    etat = avancer(etat)
    srv.pousser(vueDe(etat, 2))
    expect(screen.getByRole('heading', { name: 'Classement après le Duel 1' })).toBeInTheDocument()
    expect(screen.getByText('2e sur 3')).toBeInTheDocument()
    expect(screen.getByText(/le Duel 2 arrive/)).toBeInTheDocument()
    expect(screen.getByText('Premier Duel, et déjà sur le podium !')).toBeInTheDocument()

    // Duel 2 : Léo seul trouve ; tous à 1 bonne réponse, en tête ex aequo, Léo remonte d'une place.
    etat = avancer(repondre(avancer(etat), 2, 1, bon(1)))
    etat = avancer(etat)
    srv.pousser(vueDe(etat, 2))
    expect(screen.getByText(/1er ex aequo sur 3/)).toBeInTheDocument()
    expect(screen.getByText('1 place gagnée')).toBeInTheDocument()
    expect(screen.getByText(PHRASES_DE_PLACE['en-tete-a-egalite'][1])).toBeInTheDocument()
  })

  it('a une phrase pour son moment : avant le Duel ultime, la dernière de la catégorie', () => {
    const srv = dejaDansLaSeance()
    let etat = avancer(enAttente())
    for (let duel = 0; duel < 9; duel++) {
      etat = avancer(repondre(etat, 1, duel, bon(duel))) // Camille trouve tout, seule en tête
      if (duel < 8) etat = avancer(avancer(etat))
    }
    srv.pousser(vueDe(avancer(etat)))
    expect(screen.getByRole('heading', { name: 'Classement après le Duel 9' })).toBeInTheDocument()
    expect(screen.getByText('Un seul Duel te sépare de la victoire : le Duel ultime !')).toBeInTheDocument()
  })
})

describe('la fin de la Séance', () => {
  function seanceJouee(): EtatSeance {
    let etat = avancer(enAttente())
    for (let duel = 0; duel < 10; duel++) {
      // Camille trouve tout sauf le Duel 3 ; Léo ne trouve rien ; Inès ne répond qu'au premier.
      etat = repondre(etat, 1, duel, duel === 2 ? faux(duel) : bon(duel))
      etat = repondre(etat, 2, duel, faux(duel))
      if (duel === 0) etat = repondre(etat, 3, duel, bon(duel))
      etat = avancer(etat) // révélation
      if (duel < 9) etat = avancer(avancer(etat)) // classement, Duel suivant
    }
    return avancer(etat, CONSEILS[0].id)
  }

  it('montre score, place et médaille, le Duel du jour, le Conseil et le Récapitulatif', () => {
    const srv = dejaDansLaSeance()
    srv.pousser(vueDe(seanceJouee()))
    expect(screen.getByRole('heading', { name: 'Séance terminée !' })).toBeInTheDocument()
    expect(screen.getByText('9', { selector: '.fin__score' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'médaille d’or' })).toBeInTheDocument()
    expect(screen.getByText('Bravo, tu montes sur le podium !')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Jouer le Duel du jour' })).toHaveAttribute('href', '/?ref=seance')
    expect(screen.getByRole('complementary', { name: /Un conseil/ })).toBeInTheDocument()

    const cases = within(screen.getByRole('list', { name: 'Récapitulatif' })).getAllByRole('button')
    expect(cases).toHaveLength(10)
    expect(cases[2]).toHaveAccessibleName(/^Duel 3\s?\(raté\)/)
    fireEvent.click(cases[0])
    expect(screen.getByRole('dialog', { name: 'Détail du Duel 1' })).toBeInTheDocument()
  })

  it('dit « sans réponse » pour les Duels auxquels le Participant n’a pas répondu', () => {
    const srv = dejaDansLaSeance()
    srv.pousser(vueDe(seanceJouee(), 3))
    const cases = within(screen.getByRole('list', { name: 'Récapitulatif' })).getAllByRole('button')
    expect(cases[1]).toHaveAccessibleName(/^Duel 2\s?\(sans réponse\)/)
    fireEvent.click(cases[1])
    expect(screen.getByText('✗ Pas de réponse à ce Duel.')).toBeInTheDocument()
  })
})

describe('la reconnexion', () => {
  it('reprend la Séance avec le jeton retenu, sans repasser par le formulaire', () => {
    const srv = dejaDansLaSeance()
    expect(screen.queryByRole('heading', { name: 'Rejoindre la Séance' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Connexion à la Séance…' })).toBeInTheDocument()
    expect(srv.connexions[0].bonjour).toEqual({ type: 'bonjour', role: 'participant', jeton: JETON, pseudo: 'Camille' })
    srv.pousser(vueDe(avancer(enAttente())))
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
  })

  it('ignore la Séance retenue quand le QR code d’une autre Séance est scanné', () => {
    window.location.hash = '#rejoindre/ABCDEF'
    const srv = dejaDansLaSeance()
    expect(screen.getByRole('heading', { name: 'Rejoindre la Séance' })).toBeInTheDocument()
    expect(screen.getByLabelText('Code de la Séance')).toHaveValue('ABCDEF')
    expect(srv.connexions).toHaveLength(0)
  })

  it('oublie le jeton et revient au formulaire quand l’Animateur retire le Participant', () => {
    const srv = dejaDansLaSeance()
    srv.pousser(vueDe(enAttente()))
    srv.recevoir({ type: 'retire' })
    expect(screen.getByRole('alert')).toHaveTextContent('L’Animateur t’a retiré de la Séance')
    expect(srv.memoire.rejointe()).toBeNull()
  })

  it('propose de réessayer quand la Séance ne répond pas', () => {
    const srv = dejaDansLaSeance()
    srv.etat('arretee')
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(srv.connexions).toHaveLength(2)
    expect(srv.connexions[0].fermee).toBe(true)
  })
})
