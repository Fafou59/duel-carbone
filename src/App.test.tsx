import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { creerMemoire, type Stockage } from './navigateur/memoire.ts'

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

  it("cite l'ADEME comme source des données", () => {
    render(<App />)
    expect(screen.getByRole('link', { name: /ADEME/ })).toHaveAttribute('href', 'https://impactco2.fr')
  })

  it('lance une Partie depuis l’accueil, en un clic', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Jouer' }))
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lequel émet le plus ?' })).toBeInTheDocument()
  })
})

describe('Application : mémoire locale', () => {
  it('retient les 10 paires de la Partie lancée, pour les éviter ensuite', () => {
    const memoire = creerMemoire(stockage())
    render(<App memoire={memoire} />)
    fireEvent.click(screen.getByRole('button', { name: 'Jouer' }))
    expect(memoire.pairesRecentes().size).toBe(10)
  })

  it('affiche le record sur l’accueil, même après un rechargement', () => {
    const s = stockage()
    creerMemoire(s).enregistrerScore(8)
    render(<App memoire={creerMemoire(s)} />)
    expect(screen.getByText('Ton record : 8/10')).toBeInTheDocument()
  })

  it('reste jouable sans stockage', () => {
    render(<App memoire={creerMemoire(null)} />)
    expect(screen.queryByText(/record/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Jouer' }))
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
  })
})

describe('Application : accueil', () => {
  it('rassure : sans cookie, sans compte', () => {
    render(<App />)
    expect(screen.getByText(/sans cookie, sans compte/i)).toBeInTheDocument()
  })

  it('mène à la page Sources et méthode', () => {
    render(<App />)
    expect(screen.getAllByRole('link', { name: 'Sources et méthode' })[0]).toHaveAttribute('href', '#sources')
  })
})

describe('Application : page Sources et méthode', () => {
  // Chaque test repart de l'accueil : on efface l'ancre laissée par le précédent.
  afterEach(() => {
    window.location.hash = ''
  })

  it("s'ouvre directement depuis son adresse (#sources)", () => {
    window.location.hash = '#sources'
    render(<App />)
    expect(screen.getByRole('heading', { level: 2, name: 'Sources et méthode' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Jouer' })).not.toBeInTheDocument()
    expect(document.title).toBe('Sources et méthode · Duel Carbone')
  })

  it("s'ouvre d'un clic, puis ramène à l'accueil", async () => {
    render(<App />)
    fireEvent.click(screen.getAllByRole('link', { name: 'Sources et méthode' })[0])
    expect(await screen.findByRole('heading', { level: 2, name: 'Sources et méthode' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /Retour au jeu/ }))
    expect(await screen.findByRole('button', { name: 'Jouer' })).toBeInTheDocument()
    expect(document.title).toBe('Duel Carbone')
  })

  it('garde la Partie en cours pendant la lecture des sources', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Jouer' }))
    // Le joueur répond au Duel 1 : la révélation s'affiche.
    fireEvent.click(within(screen.getByRole('region', { name: 'Lequel émet le plus ?' })).getAllByRole('button')[0])
    const suivant = screen.getByRole('button', { name: 'Duel suivant →' })
    fireEvent.click(screen.getByRole('link', { name: 'Sources et méthode' }))
    await screen.findByRole('heading', { level: 2, name: 'Sources et méthode' })
    expect(suivant).not.toBeVisible()
    fireEvent.click(screen.getByRole('link', { name: /Retour au jeu/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Duel suivant →' })).toBeVisible())
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
  })
})
