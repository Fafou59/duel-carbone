import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

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
