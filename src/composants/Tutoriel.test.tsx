import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Tutoriel } from './Tutoriel.tsx'

const ouvrir = () => {
  const onFermer = vi.fn()
  const onJouer = vi.fn()
  render(<Tutoriel ouvert onFermer={onFermer} onJouer={onJouer} />)
  return { onFermer, onJouer, fenetre: screen.getByRole('dialog', { name: 'Comment ça marche ?' }) }
}

describe('« Comment ça marche ? » : le diaporama en 5 étapes', () => {
  it('commence par deux gestes qui s’affrontent, un jean et un Paris–Marseille en TGV', () => {
    const { fenetre } = ouvrir()
    expect(within(fenetre).getByRole('heading', { name: '1. Deux gestes s’affrontent' })).toBeInTheDocument()
    expect(within(fenetre).getByText(/la précision sous chaque geste/)).toBeInTheDocument()
    expect(within(fenetre).getByRole('button', { name: /jean/i })).toBeInTheDocument()
  })

  it('passe d’étape en étape, et revient en arrière', () => {
    const { fenetre } = ouvrir()
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Suivant →' }))
    expect(within(fenetre).getByRole('heading', { name: '2. La réponse tombe' })).toBeInTheDocument()
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Suivant →' }))
    expect(within(fenetre).getByRole('heading', { name: '3. D’où viennent les émissions' })).toBeInTheDocument()
    fireEvent.click(within(fenetre).getByRole('button', { name: '← Précédent' }))
    expect(within(fenetre).getByRole('heading', { name: '2. La réponse tombe' })).toBeInTheDocument()
  })

  it('passe directement à la réponse si le joueur touche une carte dès la première étape', () => {
    const { fenetre } = ouvrir()
    fireEvent.click(within(fenetre).getByRole('button', { name: /TGV/ }))
    expect(within(fenetre).getByRole('heading', { name: '2. La réponse tombe' })).toBeInTheDocument()
    expect(within(fenetre).getByText('Raté !')).toBeInTheDocument()
  })

  it('termine sur « Jouer le Duel du jour »', () => {
    const { fenetre, onJouer, onFermer } = ouvrir()
    for (let i = 0; i < 4; i++) fireEvent.click(within(fenetre).getByRole('button', { name: 'Suivant →' }))
    expect(within(fenetre).getByRole('heading', { name: '5. Pour aller plus loin' })).toBeInTheDocument()
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Jouer le Duel du jour' }))
    expect(onFermer).toHaveBeenCalled()
    expect(onJouer).toHaveBeenCalled()
  })
})
