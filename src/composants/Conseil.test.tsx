import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Conseil } from './Conseil.tsx'

const conseil = {
  id: 'covoiturage-quotidien',
  texte: 'Covoiturer à 2 pour aller au travail (10 km) divise ta part par deux : environ 310 kg de moins par an.',
  lien: {
    url: 'https://nosgestesclimat.fr/actions/transport/covoiturage-quotidien',
    titre: 'Covoiturer au quotidien : comment s’y prendre ?',
  },
}

describe('Conseil de fin de Partie', () => {
  it('affiche le texte, et un lien vers la page de l’ADEME qui s’ouvre dans un nouvel onglet', () => {
    render(<Conseil conseil={conseil} onLien={() => {}} />)
    expect(screen.getByRole('complementary', { name: 'Un conseil' })).toHaveTextContent(conseil.texte)
    const lien = screen.getByRole('link', { name: 'En savoir plus sur Nos Gestes Climat' })
    expect(lien).toHaveAttribute('href', conseil.lien.url)
    expect(lien).toHaveAttribute('target', '_blank')
    expect(screen.getByText(/Covoiturer au quotidien : comment s’y prendre/)).toBeInTheDocument()
  })

  it('compte le clic sur « En savoir plus »', () => {
    const onLien = vi.fn()
    render(<Conseil conseil={conseil} onLien={onLien} />)
    const lien = screen.getByRole('link', { name: /En savoir plus/ })
    // jsdom ne sait pas ouvrir un onglet : on empêche la navigation, seul le clic compte ici.
    lien.addEventListener('click', (e) => e.preventDefault())
    fireEvent.click(lien)
    expect(onLien).toHaveBeenCalledOnce()
  })
})
