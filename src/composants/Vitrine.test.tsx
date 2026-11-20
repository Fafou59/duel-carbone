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

/**
 * La durée d'un tour est tirée du nombre d'icônes de chaque ruban (Vitrine.css) : les deux colonnes vont à la
 * même vitesse à l'écran même si elles n'ont pas le même nombre d'icônes.
 */
describe('la vitesse des rubans', () => {
  it('donne à chaque ruban son nombre d’icônes, dont le CSS tire la durée du tour', () => {
    const { container } = render(<Vitrine />)
    const rubans = [...container.querySelectorAll<HTMLElement>('.ruban')]
    expect(rubans).toHaveLength(2)
    for (const ruban of rubans) {
      // La piste écrit la liste deux fois, pour boucler sans à-coup.
      const icones = ruban.querySelectorAll('.icone').length / 2
      expect(ruban.style.getPropertyValue('--icones')).toBe(String(icones))
    }
  })
})
