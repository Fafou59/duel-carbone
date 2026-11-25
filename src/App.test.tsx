import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { redigerConseil, valeursDe } from './domaine/conseils.ts'
import { CONSEILS } from './donnees/conseils.ts'
import { INSTANTANE } from './donnees/index.ts'
import type { ComptesDesPaires } from './domaine/taux-d-erreur.ts'
import { creerMemoire, type Stockage } from './navigateur/memoire.ts'
import type { ReponseDeFin } from './navigateur/rang-du-jour.ts'
import { signalerNouvelleVersion } from './navigateur/mise-a-jour.ts'
import { TITRE_ACCUEIL, TITRE_EN_SAVOIR_PLUS } from './referencement.ts'

/** Un faux localStorage, partagé entre deux affichages de l'application (comme avant et après un rechargement). */
function stockage(): Stockage {
  const donnees = new Map<string, string>()
  return { getItem: (cle) => donnees.get(cle) ?? null, setItem: (cle, valeur) => void donnees.set(cle, valeur) }
}

describe('Application', () => {
  it('affiche le nom du jeu comme titre principal', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Duel Carbone' })).toBeInTheDocument()
  })

  it("garde dans l'onglet le titre descriptif de index.html (Google lit la page une fois le jeu affiché)", () => {
    document.title = ''
    render(<App />)
    expect(document.title).toBe(TITRE_ACCUEIL)
  })

  it("cite l'ADEME comme source des données", () => {
    render(<App />)
    expect(screen.getByRole('link', { name: /ADEME/ })).toHaveAttribute('href', 'https://impactco2.fr/doc')
  })

  it('lance une Partie libre depuis l’accueil, en un clic', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lequel émet le plus ?' })).toBeInTheDocument()
  })
})

describe('Application : mémoire locale', () => {
  it('retient les 10 paires de la Partie lancée, pour les éviter ensuite', () => {
    const memoire = creerMemoire(stockage())
    render(<App memoire={memoire} />)
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    expect(memoire.pairesRecentes().size).toBe(10)
  })

  it('affiche le record sur l’accueil, même après un rechargement', () => {
    const s = stockage()
    creerMemoire(s).enregistrerScore(8)
    render(<App memoire={creerMemoire(s)} />)
    expect(screen.getByText('Ton record en Partie libre : 8/10')).toBeInTheDocument()
  })

  it('reste jouable sans stockage', () => {
    render(<App memoire={creerMemoire(null)} />)
    expect(screen.queryByText(/record/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
  })
})

describe('Application : accueil', () => {
  it('rassure : sans cookie ni compte', () => {
    render(<App />)
    expect(screen.getByText(/sans cookie ni compte/i)).toBeInTheDocument()
  })

  it('montre le logo du jeu à côté de son nom', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.entete img')).toHaveAttribute('src', expect.stringMatching(/favicon\.svg$/))
  })

  it('ramène à l’accueil d’un clic sur le logo, même en pleine Partie', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Duel Carbone' }))
    expect(screen.queryByText('Duel 1/10')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Duel du jour n° / })).toBeInTheDocument()
  })

  it('ouvre « Comment ça marche ? » depuis le pied de page, sur tous les écrans, même en pleine Partie', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    fireEvent.click(within(screen.getByRole('region', { name: 'Lequel émet le plus ?' })).getAllByRole('button')[0])
    expect(screen.getByRole('button', { name: 'Duel suivant →' })).toBeInTheDocument()
    fireEvent.click(within(screen.getByRole('contentinfo')).getByRole('button', { name: 'Comment ça marche ?' }))
    const fenetre = screen.getByRole('dialog', { name: 'Comment ça marche ?' })
    expect(within(fenetre).getByRole('heading', { name: '1. Deux gestes s’affrontent' })).toBeInTheDocument()
  })

  it('mène à la page En savoir plus', () => {
    render(<App />)
    expect(screen.getAllByRole('link', { name: 'En savoir plus' })[0]).toHaveAttribute('href', '#en-savoir-plus')
  })

  it('renvoie « Chiffres de l’ADEME » vers la documentation d’Impact CO2, et garde GitHub pour En savoir plus', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'Chiffres de l’ADEME' })).toHaveAttribute('href', 'https://impactco2.fr/doc')
    expect(screen.queryByRole('link', { name: /GitHub/ })).not.toBeInTheDocument()
  })
})

describe('Application : page En savoir plus', () => {
  // Chaque test repart de l'accueil : on efface l'ancre laissée par le précédent.
  afterEach(() => {
    window.location.hash = ''
  })

  it("s'ouvre directement depuis son adresse (#en-savoir-plus)", () => {
    window.location.hash = '#en-savoir-plus'
    render(<App />)
    expect(screen.getByRole('heading', { level: 2, name: 'En savoir plus' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Partie libre' })).not.toBeInTheDocument()
    expect(document.title).toBe(TITRE_EN_SAVOIR_PLUS)
    // La frise d'icônes accompagne la lecture.
    expect(document.querySelector('.frise')).toBeInTheDocument()
  })

  it("s'ouvre aussi depuis son ancienne adresse (#sources), pour les liens déjà partagés", () => {
    window.location.hash = '#sources'
    render(<App />)
    expect(screen.getByRole('heading', { level: 2, name: 'En savoir plus' })).toBeInTheDocument()
  })

  it("s'ouvre d'un clic, puis ramène à l'accueil", async () => {
    render(<App />)
    fireEvent.click(screen.getAllByRole('link', { name: 'En savoir plus' })[0])
    expect(await screen.findByRole('heading', { level: 2, name: 'En savoir plus' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /Retour au jeu/ }))
    expect(await screen.findByRole('button', { name: 'Partie libre' })).toBeInTheDocument()
    expect(document.title).toBe(TITRE_ACCUEIL)
  })

  it('garde la Partie en cours pendant la lecture des sources', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    // Le joueur répond au Duel 1 : la révélation s'affiche.
    fireEvent.click(within(screen.getByRole('region', { name: 'Lequel émet le plus ?' })).getAllByRole('button')[0])
    const suivant = screen.getByRole('button', { name: 'Duel suivant →' })
    fireEvent.click(screen.getByRole('link', { name: 'En savoir plus' }))
    await screen.findByRole('heading', { level: 2, name: 'En savoir plus' })
    expect(suivant).not.toBeVisible()
    fireEvent.click(screen.getByRole('link', { name: /Retour au jeu/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Duel suivant →' })).toBeVisible())
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
  })
})

describe('Application : le Duel Carbone du jour', () => {
  // Un jour fixe, couvert par le calendrier : le 7e jour depuis le lancement du 14/11 (n° 7).
  const JOUR = '2026-11-20'
  // Le bouton reste désactivé tant que le calendrier (chargé à part) n'est pas arrivé.
  const boutonDuJour = async () => {
    const bouton = await screen.findByRole('button', { name: /Duel du jour n° 7|Revoir mon Récapitulatif/ })
    await waitFor(() => expect(bouton).toBeEnabled())
    return bouton
  }
  // Un Duel thématique s'annonce d'abord : on ferme l'annonce pour accéder aux cartes.
  const fermerAnnonce = () => {
    const auDuel = screen.queryByRole('button', { name: 'Au Duel !' })
    if (auDuel) fireEvent.click(auDuel)
  }
  const titresDesCartes = () =>
    within(screen.getByRole('region', { name: 'Lequel émet le plus ?' }))
      .getAllByRole('button')
      .map((b) => b.textContent)

  it('propose le Duel Carbone du jour, numéroté, et la Partie libre', async () => {
    render(<App memoire={creerMemoire(stockage())} aujourdhui={JOUR} />)
    expect(await boutonDuJour()).toHaveTextContent('Jouer le Duel du jour n° 7')
    expect(screen.getByRole('button', { name: 'Partie libre' })).toBeInTheDocument()
  })

  it('donne les mêmes Duels sur deux appareils différents, le même jour', async () => {
    const premier = render(<App memoire={creerMemoire(stockage())} aujourdhui={JOUR} />)
    fireEvent.click(await boutonDuJour())
    fermerAnnonce()
    const surLePremier = titresDesCartes()
    premier.unmount()
    render(<App memoire={creerMemoire(stockage())} aujourdhui={JOUR} />)
    fireEvent.click(await boutonDuJour())
    fermerAnnonce()
    expect(titresDesCartes()).toEqual(surLePremier)
  })

  it('reprend une Partie du jour interrompue au même Duel, avec les réponses déjà données', async () => {
    const s = stockage()
    const avant = render(<App memoire={creerMemoire(s)} aujourdhui={JOUR} />)
    fireEvent.click(await boutonDuJour())
    for (let i = 0; i < 2; i++) {
      fermerAnnonce()
      fireEvent.click(within(screen.getByRole('region', { name: 'Lequel émet le plus ?' })).getAllByRole('button')[0])
      fireEvent.click(screen.getByRole('button', { name: 'Duel suivant →' }))
    }
    avant.unmount()
    render(<App memoire={creerMemoire(s)} aujourdhui={JOUR} />)
    const bouton = await boutonDuJour()
    expect(bouton).toHaveTextContent('Reprendre le Duel du jour n° 7')
    fireEvent.click(bouton)
    expect(screen.getByText('Duel 3/10')).toBeInTheDocument()
  })

  it('ne se rejoue pas : une fois terminé, l’accueil propose de revoir le résultat, et la Partie libre reste là', async () => {
    const s = stockage()
    render(<App memoire={creerMemoire(s)} aujourdhui={JOUR} />)
    fireEvent.click(await boutonDuJour())
    for (let i = 0; i < 10; i++) {
      fermerAnnonce()
      fireEvent.click(within(screen.getByRole('region', { name: 'Lequel émet le plus ?' })).getAllByRole('button')[0])
      fireEvent.click(screen.getByRole('button', { name: i === 9 ? 'Voir mon score' : 'Duel suivant →' }))
    }
    expect(screen.getByRole('heading', { name: 'Duel Carbone du jour n° 7' })).toBeInTheDocument()
    expect(screen.getByText(/Série : 1 jour d'affilée/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Partie libre' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rejouer' })).not.toBeInTheDocument()
  })

  it('affiche le résultat et la série sur l’accueil le jour même, et la série encore le lendemain', async () => {
    const s = stockage()
    const memoire = creerMemoire(s)
    memoire.terminerPartieDuJour('2026-11-19', 7)
    memoire.terminerPartieDuJour(JOUR, 8)
    const jourMeme = render(<App memoire={creerMemoire(s)} aujourdhui={JOUR} />)
    expect(await boutonDuJour()).toHaveTextContent('Revoir mon Récapitulatif')
    expect(screen.getByLabelText('8 bonnes réponses sur 10')).toBeInTheDocument()
    expect(screen.getByText('🔥 2 jours')).toBeInTheDocument()
    jourMeme.unmount()
    render(<App memoire={creerMemoire(s)} aujourdhui="2026-11-21" />)
    expect(await screen.findByRole('button', { name: 'Jouer le Duel du jour n° 8' })).toBeInTheDocument()
    expect(screen.getByText(/Série de 2 jours\./)).toBeInTheDocument()
    // Le score de la veille, à battre.
    expect(screen.getByText('8/10')).toBeInTheDocument()
  })

  it('montre la grille du Duel du jour joué, une case par réponse', async () => {
    const s = stockage()
    const partie = render(<App memoire={creerMemoire(s)} aujourdhui={JOUR} />)
    fireEvent.click(await boutonDuJour())
    for (let i = 0; i < 10; i++) {
      fermerAnnonce()
      fireEvent.click(within(screen.getByRole('region', { name: 'Lequel émet le plus ?' })).getAllByRole('button')[0])
      fireEvent.click(screen.getByRole('button', { name: i === 9 ? 'Voir mon score' : 'Duel suivant →' }))
    }
    const score = Number(screen.getByText('/10').parentElement?.firstChild?.textContent)
    partie.unmount()
    // Retour sur l'accueil (comme après un rechargement) : le score, et sa grille de 10 cases.
    render(<App memoire={creerMemoire(s)} aujourdhui={JOUR} />)
    const grille = await screen.findByLabelText(`${score} bonnes réponses sur 10`)
    await waitFor(() => expect(grille.querySelectorAll('.bon')).toHaveLength(score))
    expect(grille.querySelectorAll('.mauvais')).toHaveLength(10 - score)
  })

  it('à la fin d’une Partie libre, propose d’abord le Duel du jour, qui se lance d’un clic', async () => {
    render(<App memoire={creerMemoire(stockage())} aujourdhui={JOUR} />)
    await boutonDuJour()
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    for (let i = 0; i < 10; i++) {
      fermerAnnonce()
      fireEvent.click(within(screen.getByRole('region', { name: 'Lequel émet le plus ?' })).getAllByRole('button')[0])
      fireEvent.click(screen.getByRole('button', { name: i === 9 ? 'Voir mon score' : 'Duel suivant →' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Jouer le Duel du jour n° 7' }))
    fermerAnnonce()
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
  })

  it('ne montre la frise qui défile qu’à l’écran de fin : ni sur l’accueil (la vitrine y défile déjà), ni pendant les Duels', async () => {
    const { container } = render(<App memoire={creerMemoire(stockage())} aujourdhui={JOUR} />)
    await boutonDuJour()
    expect(container.querySelector('.frise')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    for (let i = 0; i < 10; i++) {
      fermerAnnonce()
      expect(container.querySelector('.frise')).not.toBeInTheDocument()
      fireEvent.click(within(screen.getByRole('region', { name: 'Lequel émet le plus ?' })).getAllByRole('button')[0])
      fireEvent.click(screen.getByRole('button', { name: i === 9 ? 'Voir mon score' : 'Duel suivant →' }))
    }
    expect(screen.getByRole('heading', { name: 'Partie terminée !' })).toBeInTheDocument()
    expect(container.querySelector('.frise')).toBeInTheDocument()
  })

  it('retient les Duels du jour au lancement, et reprend ceux-là même si le calendrier a changé entre-temps', async () => {
    const s = stockage()
    const avant = render(<App memoire={creerMemoire(s)} aujourdhui={JOUR} />)
    fireEvent.click(await boutonDuJour())
    expect(creerMemoire(s).partieDuJour(JOUR)?.duels).toHaveLength(10)
    avant.unmount()
    // Une Partie du jour commencée avec d'autres Duels (une ancienne version du jeu, un autre calendrier).
    const autre = creerMemoire(stockage())
    const duels = ['jean>paris-marseille-tgv', ...Array(9).fill('steak-boeuf>avocat')]
    autre.commencerPartieDuJour(JOUR, duels)
    render(<App memoire={autre} aujourdhui={JOUR} />)
    fireEvent.click(await boutonDuJour())
    fermerAnnonce()
    expect(titresDesCartes().join(' ')).toMatch(/jean.*Paris–Marseille en TGV/)
  })

  it('reste jouable sans stockage', async () => {
    render(<App memoire={creerMemoire(null)} aujourdhui={JOUR} />)
    fireEvent.click(await boutonDuJour())
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
  })
})

describe('Application : le Rang du jour', () => {
  const JOUR = '2026-11-20'
  const NUMERO = 7
  /** Un faux serveur du Rang du jour : il répond les Effectifs donnés, ou rien (null : hors ligne, en panne). */
  const fauxServeur = (effectifs: number[] | null, paires: ComptesDesPaires | null = null) => ({
    envoyer: vi.fn(async (_numero: number, _choix: string[]): Promise<ReponseDeFin | null> => (effectifs ? { effectifs, paires } : null)),
    lire: vi.fn(async (_numero: number) => effectifs),
    lireTaux: vi.fn(async (_cles: string[]) => paires),
    envoyerReponses: vi.fn(async (_duels: string[], _choix: string[]) => paires),
  })
  const lancerLeDuelDuJour = async () => {
    const bouton = await screen.findByRole('button', { name: /Jouer le Duel du jour/ })
    await waitFor(() => expect(bouton).toBeEnabled())
    fireEvent.click(bouton)
  }
  /** Joue les 10 Duels de la Partie en cours en touchant toujours la première carte ; rend le score. */
  const jouerDixDuels = () => {
    for (let i = 0; i < 10; i++) {
      const auDuel = screen.queryByRole('button', { name: 'Au Duel !' })
      if (auDuel) fireEvent.click(auDuel)
      fireEvent.click(within(screen.getByRole('region', { name: 'Lequel émet le plus ?' })).getAllByRole('button')[0])
      fireEvent.click(screen.getByRole('button', { name: i === 9 ? 'Voir mon score' : 'Duel suivant →' }))
    }
    return Number(screen.getByText('/10').parentElement?.firstChild?.textContent)
  }
  /** Des Effectifs qui comptent le joueur (case `score`), 3 joueurs en dessous et 1 au-dessus. */
  const effectifsAutourDe = (score: number) => {
    const effectifs = Array<number>(11).fill(0)
    effectifs[score] += 1
    effectifs[Math.max(0, score - 1)] += 3
    effectifs[Math.min(10, score + 1)] += 1
    return effectifs
  }

  it('envoie le score une seule fois, à la première fin, et affiche le Rang sous le score', async () => {
    const memoire = creerMemoire(stockage())
    const serveur = fauxServeur(null)
    // Le serveur répond les Effectifs qui suivent l'ajout du joueur, quel que soit son score.
    serveur.envoyer.mockImplementation(async () => ({ effectifs: effectifsAutourDe(memoire.partieDuJour(JOUR)?.score ?? 0), paires: null }))
    render(<App memoire={memoire} aujourdhui={JOUR} serveur={serveur} />)
    await lancerLeDuelDuJour()
    const score = jouerDixDuels()
    expect(serveur.envoyer).toHaveBeenCalledTimes(1)
    expect(serveur.envoyer).toHaveBeenCalledWith(NUMERO, memoire.partieDuJour(JOUR)?.reponses)
    // Pas de lecture à la première fin : c'est l'envoi qui rapporte les Effectifs.
    expect(serveur.lire).not.toHaveBeenCalled()
    const attendu =
      score === 0 ? /Revanche demain/ : score === 10 ? /Sans-faute/ : /mieux ou autant que 75 % des joueurs jusqu’ici/
    expect(await screen.findByText(attendu)).toBeInTheDocument()
    expect(memoire.partieDuJour(JOUR)?.compte).toBe(true)
  })

  it('ne renvoie rien quand on revoit le Récapitulatif : il relit les Effectifs', async () => {
    const s = stockage()
    const premier = render(<App memoire={creerMemoire(s)} aujourdhui={JOUR} serveur={fauxServeur(null)} />)
    await lancerLeDuelDuJour()
    const score = jouerDixDuels()
    premier.unmount()
    const ensuite = fauxServeur(effectifsAutourDe(score))
    render(<App memoire={creerMemoire(s)} aujourdhui={JOUR} serveur={ensuite} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Revoir mon Récapitulatif' }))
    expect(await screen.findByRole('heading', { name: 'Duel Carbone du jour n° 7' })).toBeInTheDocument()
    await waitFor(() => expect(ensuite.lire).toHaveBeenCalledTimes(2))
    expect(ensuite.lire).toHaveBeenCalledWith(NUMERO)
    expect(ensuite.envoyer).not.toHaveBeenCalled()
  })

  it('affiche le Rang sur l’accueil une fois le Duel du jour joué, sans compter deux fois le joueur', async () => {
    const memoire = creerMemoire(stockage())
    memoire.terminerPartieDuJour(JOUR, 6)
    memoire.noterScoreCompte(JOUR)
    // Avec le joueur : 2 × 3, 1 × 5, 2 × 6, 1 × 9. Les 5 autres : 4 ont fait moins ou autant que 6.
    const serveur = fauxServeur([0, 0, 0, 2, 0, 1, 2, 0, 0, 1, 0])
    render(<App memoire={memoire} aujourdhui={JOUR} serveur={serveur} />)
    // (Testing Library lit l'espace insécable comme une espace ordinaire.)
    expect(await screen.findByText('Tu as fait mieux ou autant que 80 % des joueurs jusqu’ici.')).toBeInTheDocument()
    expect(serveur.lire).toHaveBeenCalledWith(NUMERO)
  })

  it('n’affiche rien sous 4 joueurs', async () => {
    const memoire = creerMemoire(stockage())
    memoire.terminerPartieDuJour(JOUR, 6)
    memoire.noterScoreCompte(JOUR)
    // 3 joueurs, le joueur compris : 3, 6 et 9.
    const serveur = fauxServeur([0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0])
    render(<App memoire={memoire} aujourdhui={JOUR} serveur={serveur} />)
    await waitFor(() => expect(serveur.lire).toHaveBeenCalled())
    expect(screen.queryByText(/des joueurs jusqu’ici/)).not.toBeInTheDocument()
  })

  it('se joue normalement sans serveur (hors ligne, en panne) : le Rang ne s’affiche pas, c’est tout', async () => {
    const serveur = fauxServeur(null)
    render(<App memoire={creerMemoire(stockage())} aujourdhui={JOUR} serveur={serveur} />)
    await lancerLeDuelDuJour()
    jouerDixDuels()
    expect(screen.getByRole('heading', { name: 'Duel Carbone du jour n° 7' })).toBeInTheDocument()
    await waitFor(() => expect(serveur.envoyer).toHaveBeenCalled())
    expect(screen.queryByText(/des joueurs jusqu’ici|Sans-faute|Revanche demain/)).not.toBeInTheDocument()
  })

  it('ne touche pas au Rang du jour pendant une Partie libre', async () => {
    const serveur = fauxServeur(effectifsAutourDe(5))
    render(<App memoire={creerMemoire(stockage())} aujourdhui={JOUR} serveur={serveur} />)
    await screen.findByRole('button', { name: /Jouer le Duel du jour/ })
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    jouerDixDuels()
    expect(screen.getByRole('heading', { name: 'Partie terminée !' })).toBeInTheDocument()
    expect(serveur.envoyer).not.toHaveBeenCalled()
    expect(serveur.lire).not.toHaveBeenCalled()
  })

  it('montre le Taux d’erreur reçu au lancement à chaque révélation, puis celui à jour dans le Récapitulatif', async () => {
    const serveur = fauxServeur(null)
    // Au lancement : 10 réponses par paire, dont 7 fausses. À la fin, le joueur compté : 11 réponses, dont 8 fausses.
    const comptes = (cles: string[], reponses: number, fausses: number) =>
      Object.fromEntries(cles.map((cle) => [cle, { reponses, fausses }]))
    let clesDeLaPartie: string[] = []
    serveur.lireTaux.mockImplementation(async (cles) => {
      clesDeLaPartie = cles
      return comptes(cles, 10, 7)
    })
    serveur.envoyer.mockImplementation(async () => ({ effectifs: effectifsAutourDe(5), paires: comptes(clesDeLaPartie, 11, 8) }))
    render(<App memoire={creerMemoire(stockage())} aujourdhui={JOUR} serveur={serveur} />)
    await lancerLeDuelDuJour()
    await waitFor(() => expect(serveur.lireTaux).toHaveBeenCalledTimes(1))
    expect(clesDeLaPartie).toHaveLength(10)

    const auDuel = screen.queryByRole('button', { name: 'Au Duel !' })
    if (auDuel) fireEvent.click(auDuel)
    // Avant le choix, rien : le chiffre ne doit pas souffler la réponse.
    expect(document.querySelector('.comme-toi')).toBeNull()
    fireEvent.click(within(screen.getByRole('region', { name: 'Lequel émet le plus ?' })).getAllByRole('button')[0])
    // 70 % de réponses fausses : 70 % comme toi si la première carte était fausse, 30 % sinon.
    await waitFor(() => expect(document.querySelector('.duel__verdict .comme-toi')?.textContent).toMatch(/^, (30|70)\s% comme toi \(part des réponses identiques à la tienne\)$/))

    // On finit la Partie (le premier Duel est déjà choisi).
    fireEvent.click(screen.getByRole('button', { name: 'Duel suivant →' }))
    for (let i = 1; i < 10; i++) {
      const annonce = screen.queryByRole('button', { name: 'Au Duel !' })
      if (annonce) fireEvent.click(annonce)
      fireEvent.click(within(screen.getByRole('region', { name: 'Lequel émet le plus ?' })).getAllByRole('button')[0])
      fireEvent.click(screen.getByRole('button', { name: i === 9 ? 'Voir mon score' : 'Duel suivant →' }))
    }
    // À la fin, le joueur compté : 11 réponses dont 8 fausses, soit 73 % ou 27 % comme toi selon la case.
    await waitFor(() => expect(document.querySelectorAll('.recap__taux .comme-toi')).toHaveLength(10))
    for (const caseDuRecap of document.querySelectorAll('.recap__taux .comme-toi')) expect(caseDuRecap.textContent).toMatch(/(27|73)\s% comme toi/)
  })

  it('ne montre aucun Taux d’erreur sous le minimum de réponses, ni sans serveur', async () => {
    const serveur = fauxServeur(null)
    serveur.lireTaux.mockImplementation(async (cles) => Object.fromEntries(cles.map((cle) => [cle, { reponses: 3, fausses: 2 }])))
    render(<App memoire={creerMemoire(stockage())} aujourdhui={JOUR} serveur={serveur} />)
    await lancerLeDuelDuJour()
    await waitFor(() => expect(serveur.lireTaux).toHaveBeenCalled())
    jouerDixDuels()
    expect(document.querySelector('.comme-toi')).toBeNull()
  })

  it('en Partie libre aussi : le Taux d’erreur lu au lancement, puis les 10 Duels et les choix envoyés une fois à la fin', async () => {
    const serveur = fauxServeur(null)
    const comptes = (cles: string[], reponses: number, fausses: number) =>
      Object.fromEntries(cles.map((cle) => [cle, { reponses, fausses }]))
    let clesDeLaPartie: string[] = []
    serveur.lireTaux.mockImplementation(async (cles) => {
      clesDeLaPartie = cles
      return comptes(cles, 10, 7)
    })
    serveur.envoyerReponses.mockImplementation(async () => comptes(clesDeLaPartie, 11, 8))
    render(<App memoire={creerMemoire(stockage())} aujourdhui={JOUR} serveur={serveur} />)
    await screen.findByRole('button', { name: /Jouer le Duel du jour/ })
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    await waitFor(() => expect(serveur.lireTaux).toHaveBeenCalledTimes(1))
    jouerDixDuels()
    expect(screen.getByRole('heading', { name: 'Partie terminée !' })).toBeInTheDocument()
    await waitFor(() => expect(serveur.envoyerReponses).toHaveBeenCalledTimes(1))
    const [duels, choix] = serveur.envoyerReponses.mock.calls[0]
    expect(duels).toHaveLength(10)
    expect(duels.every((code) => /^[a-z0-9-]+>[a-z0-9-]+$/.test(code))).toBe(true)
    expect(choix).toHaveLength(10)
    // Les comptes à jour (11 réponses, dont 8 fausses) s'affichent dans le Récapitulatif.
    await waitFor(() => expect(document.querySelectorAll('.recap__taux .comme-toi')).toHaveLength(10))
    for (const caseDuRecap of document.querySelectorAll('.recap__taux .comme-toi')) expect(caseDuRecap.textContent).toMatch(/(27|73)\s% comme toi/)
  })

  it('n’envoie pas une Partie du jour finie après minuit : ce n’est plus le Duel du jour', async () => {
    const serveur = fauxServeur(null)
    const memoire = creerMemoire(stockage())
    const { rerender } = render(<App memoire={memoire} aujourdhui={JOUR} serveur={serveur} />)
    await lancerLeDuelDuJour()
    // Minuit passe pendant la Partie.
    rerender(<App memoire={memoire} aujourdhui="2026-11-21" serveur={serveur} />)
    jouerDixDuels()
    expect(serveur.envoyer).not.toHaveBeenCalled()
  })
})

describe('Application : mise à jour silencieuse (application installée)', () => {
  it('applique une nouvelle version dès qu’elle est prête, si le joueur est sur l’accueil', () => {
    render(<App />)
    const appliquer = vi.fn()
    act(() => signalerNouvelleVersion(appliquer))
    expect(appliquer).toHaveBeenCalledOnce()
  })

  it('n’interrompt jamais une Partie : la nouvelle version attend le retour à l’accueil', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    const appliquer = vi.fn()
    act(() => signalerNouvelleVersion(appliquer))
    expect(appliquer).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('link', { name: 'Duel Carbone' }))
    expect(appliquer).toHaveBeenCalledOnce()
  })
})

describe('Application : le Conseil de fin de Partie', () => {
  const JOUR = '2026-11-20'
  const jouerDixDuels = () => {
    for (let i = 0; i < 10; i++) {
      const auDuel = screen.queryByRole('button', { name: 'Au Duel !' })
      if (auDuel) fireEvent.click(auDuel)
      fireEvent.click(within(screen.getByRole('region', { name: 'Lequel émet le plus ?' })).getAllByRole('button')[0])
      fireEvent.click(screen.getByRole('button', { name: i === 9 ? 'Voir mon score' : 'Duel suivant →' }))
    }
  }
  // Comme toHaveTextContent, les espaces (dont l'espace fine des milliers, « 1 350 ») deviennent de simples espaces.
  const texteDu = (id: string) =>
    redigerConseil(CONSEILS.find((c) => c.id === id)!, valeursDe(INSTANTANE)).replace(/\s+/g, ' ')
  const conseilAffiche = () => screen.getByRole('complementary', { name: 'Un conseil' })

  it('en montre un à la fin du Duel du jour, et le même quand on revoit son Récapitulatif', async () => {
    const s = stockage()
    const premier = render(<App memoire={creerMemoire(s)} aujourdhui={JOUR} />)
    const bouton = await screen.findByRole('button', { name: /Jouer le Duel du jour/ })
    await waitFor(() => expect(bouton).toBeEnabled())
    fireEvent.click(bouton)
    jouerDixDuels()
    const memoire = creerMemoire(s)
    const id = memoire.partieDuJour(JOUR)?.conseil
    expect(id).toBeDefined()
    expect(memoire.conseilsRecents()).toEqual([id])
    expect(conseilAffiche()).toHaveTextContent(texteDu(id!))
    premier.unmount()

    render(<App memoire={creerMemoire(s)} aujourdhui={JOUR} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Revoir mon Récapitulatif' }))
    expect(conseilAffiche()).toHaveTextContent(texteDu(id!))
    // Revu, il n'est pas compté une seconde fois.
    expect(creerMemoire(s).conseilsRecents()).toEqual([id])
  })

  it('en montre un à la fin d’une Partie libre, jamais l’un des 5 derniers vus', async () => {
    const s = stockage()
    const memoire = creerMemoire(s)
    const dejaVus = CONSEILS.slice(0, 5).map((c) => c.id)
    for (const id of dejaVus) memoire.noterConseil(id)
    render(<App memoire={creerMemoire(s)} aujourdhui={JOUR} />)
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    jouerDixDuels()
    const nouveau = creerMemoire(s).conseilsRecents().at(-1)!
    expect(dejaVus).not.toContain(nouveau)
    expect(conseilAffiche()).toHaveTextContent(texteDu(nouveau))
  })
})
