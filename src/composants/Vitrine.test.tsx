import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Frise, Vitrine } from './Vitrine.tsx'

/**
 * Les rubans d'icônes défilent sans fin : un clic, un toucher ou Entrée les arrête, un second les relance.
 * Les règles d'accessibilité (WCAG 2.2.2) demandent de pouvoir arrêter un contenu qui bouge plus de 5 secondes.
 */
describe.each([
  ['la vitrine', () => <Vitrine />],
  ['la frise', () => <Frise />],
])('%s', (_, afficher) => {
  it('s’arrête d’un clic (ou d’un toucher), et repart d’un second', () => {
    const { container } = render(afficher())
    const commande = screen.getByRole('button', { name: 'Mettre en pause le défilement des icônes' })
    expect(commande).toHaveAttribute('aria-pressed', 'false')
    expect(container.querySelector('.defilement--pause')).not.toBeInTheDocument()

    fireEvent.click(commande)
    expect(commande).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('.defilement--pause')).toBeInTheDocument()

    fireEvent.click(commande)
    expect(commande).toHaveAttribute('aria-pressed', 'false')
  })
})
