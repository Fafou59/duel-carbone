import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { gesteCalcule } from '../donnees/index.ts'
import { DuelDeTest } from '../test/DuelDeTest.tsx'

// Un vrai Duel, calculé depuis le catalogue et l'Instantané : steak (≈ 3,4 kg) contre avocat (≈ 311 g).
const duel = { a: gesteCalcule('steak-boeuf'), b: gesteCalcule('avocat') }
const carte = (nom: RegExp) => screen.getByRole('button', { name: nom })

describe('Écran Duel', () => {
  it('présente les deux Gestes avec leur quantité, sans révéler les chiffres', () => {
    render(<DuelDeTest duel={duel} />)
    expect(screen.getByRole('heading', { name: 'Lequel émet le plus ?' })).toBeInTheDocument()
    expect(carte(/Manger un steak de bœuf.*120 g/)).toBeEnabled()
    expect(carte(/Manger un avocat.*200 g/)).toBeEnabled()
    expect(screen.queryByText(/CO2e/)).not.toBeInTheDocument()
  })

  it('révèle les empreintes, le Rapport et un verdict positif après un bon choix', () => {
    render(<DuelDeTest duel={duel} />)
    fireEvent.click(carte(/steak/))
    expect(screen.getByText('✓ Bonne réponse !')).toBeInTheDocument()
    expect(screen.getByText('3,4 kg CO2e')).toBeInTheDocument()
    expect(screen.getByText('311 g CO2e')).toBeInTheDocument()
    expect(screen.getByText('×11')).toBeInTheDocument()
    expect(within(carte(/steak/)).getByText(/Ton choix · émet le plus/)).toBeInTheDocument()
  })

  it('fête un bon choix sur la carte choisie, pas un mauvais', () => {
    const { unmount } = render(<DuelDeTest duel={duel} />)
    fireEvent.click(carte(/steak/))
    expect(carte(/steak/)).toHaveClass('carte--bon-choix')
    unmount()

    render(<DuelDeTest duel={duel} />)
    fireEvent.click(carte(/avocat/))
    expect(carte(/steak/)).not.toHaveClass('carte--bon-choix')
  })

  it('signale un mauvais choix par un texte, pas seulement par la couleur', () => {
    render(<DuelDeTest duel={duel} />)
    fireEvent.click(carte(/avocat/))
    expect(screen.getByText('✗ Raté !')).toBeInTheDocument()
    expect(within(carte(/avocat/)).getByText('✗ Ton choix')).toBeInTheDocument()
    expect(within(carte(/steak/)).getByText(/émet le plus/)).toBeInTheDocument()
  })

  it("affiche l'équivalence en toutes lettres", () => {
    render(<DuelDeTest duel={duel} />)
    fireEvent.click(carte(/steak/))
    expect(
      screen.getByText('Manger un steak de bœuf (120 g) émet 10,8 fois plus que manger un avocat (200 g).'),
    ).toBeInTheDocument()
  })

  it('bloque les cartes une fois le choix fait', () => {
    render(<DuelDeTest duel={duel} />)
    fireEvent.click(carte(/avocat/))
    expect(carte(/steak/)).toBeDisabled()
    expect(carte(/avocat/)).toBeDisabled()
  })

  it('se joue au clavier : la touche 1 choisit la première carte', () => {
    render(<DuelDeTest duel={duel} />)
    fireEvent.keyDown(window, { key: '1' })
    expect(screen.getByText('✓ Bonne réponse !')).toBeInTheDocument()
  })

  it('se joue au clavier : la touche 2 choisit la seconde carte', () => {
    render(<DuelDeTest duel={duel} />)
    fireEvent.keyDown(window, { key: '2' })
    expect(screen.getByText('✗ Raté !')).toBeInTheDocument()
  })

  it('permet de rejouer le Duel', () => {
    render(<DuelDeTest duel={duel} />)
    fireEvent.click(carte(/avocat/))
    fireEvent.click(screen.getByRole('button', { name: 'Rejouer ce Duel' }))
    expect(carte(/steak/)).toBeEnabled()
    expect(screen.queryByText(/Raté/)).not.toBeInTheDocument()
  })
})
