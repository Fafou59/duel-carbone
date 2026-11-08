import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
