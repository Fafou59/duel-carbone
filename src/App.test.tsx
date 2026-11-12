import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { creerMemoire, type Stockage } from './navigateur/memoire.ts'
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

  it('ouvre « Comment ça marche ? » depuis le pied de page, sur tous les écrans', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    fireEvent.click(screen.getByRole('button', { name: 'Comment ça marche ?' }))
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
  // Un jour fixe, couvert par le calendrier : le 10e jour depuis le premier (n° 10).
  const JOUR = '2026-11-20'
  // Le bouton reste désactivé tant que le calendrier (chargé à part) n'est pas arrivé.
  const boutonDuJour = async () => {
    const bouton = await screen.findByRole('button', { name: /Duel du jour n° 10|Revoir mon Récapitulatif/ })
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
    expect(await boutonDuJour()).toHaveTextContent('Jouer le Duel du jour n° 10')
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
    expect(bouton).toHaveTextContent('Reprendre le Duel du jour n° 10')
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
    expect(screen.getByRole('heading', { name: 'Duel Carbone du jour n° 10' })).toBeInTheDocument()
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
    expect(await screen.findByRole('button', { name: 'Jouer le Duel du jour n° 11' })).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: 'Jouer le Duel du jour n° 10' }))
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
