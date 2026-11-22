import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InvitationInstallationVue } from './InvitationInstallation.tsx'

const afficher = (props: Partial<Parameters<typeof InvitationInstallationVue>[0]> = {}) => {
  const p = { situation: 'bouton' as const, installer: vi.fn(async () => true), onEcarter: vi.fn(), mesurer: vi.fn(), ...props }
  render(<InvitationInstallationVue {...p} />)
  return p
}

describe('L’invitation à installer le jeu, à la fin du Duel du jour', () => {
  it('propose d’installer en un bouton quand le navigateur le permet, et le compte', async () => {
    const p = afficher()
    expect(screen.getByRole('region', { name: 'Reviens demain en un geste' })).toBeInTheDocument()
    expect(p.mesurer).toHaveBeenCalledWith('installation/proposee')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Installer Duel Carbone' })))
    expect(p.installer).toHaveBeenCalled()
    expect(p.mesurer).toHaveBeenCalledWith('installation/acceptee')
    expect(screen.queryByRole('region', { name: 'Reviens demain en un geste' })).not.toBeInTheDocument()
  })

  it('reste là si le joueur ferme la fenêtre d’installation sans installer', async () => {
    const p = afficher({ installer: vi.fn(async () => false) })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Installer Duel Carbone' })))
    expect(p.mesurer).toHaveBeenCalledWith('installation/refusee')
    expect(screen.getByRole('region', { name: 'Reviens demain en un geste' })).toBeInTheDocument()
  })

  it.each([
    ['firefox-android', ['Touche ⋮ en bas à droite, puis « Plus ».', 'Touche « Ajouter l’application à l’écran d’accueil ».', 'Confirme avec « Ajouter ».']],
    ['safari-ios', ['Touche ⋯ puis « Partager » (ou directement le bouton Partager).', 'Fais défiler et touche « Sur l’écran d’accueil ».', 'Laisse « Ouvrir comme app web » activé et touche « Ajouter ».']],
    ['ios-autre', ['Touche le bouton Partager de la barre d’adresse.', 'Touche « Sur l’écran d’accueil ».', 'Touche « Ajouter ».']],
    ['mobile-autre', ['Ouvre le menu de ton navigateur.', 'Cherche « Ajouter à l’écran d’accueil » ou « Installer ».']],
  ] as const)('déplie les étapes du navigateur (%s), sans bouton d’installation', (situation, etapes) => {
    const p = afficher({ situation, installer: undefined })
    expect(screen.getByRole('region', { name: 'Reviens demain en un geste' })).toBeInTheDocument()
    expect(p.mesurer).toHaveBeenCalledWith('installation/proposee')
    expect(screen.queryByRole('button', { name: 'Installer Duel Carbone' })).not.toBeInTheDocument()

    const comment = screen.getByRole('button', { name: 'Comment l’installer ?' })
    expect(comment).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()

    fireEvent.click(comment)
    expect(comment).toHaveAttribute('aria-expanded', 'true')
    const liste = screen.getByRole('list')
    expect(comment).toHaveAttribute('aria-controls', liste.id)
    expect(liste.tagName).toBe('OL')
    expect(screen.getAllByRole('listitem').map((etape) => etape.textContent)).toEqual(etapes)
    expect(p.mesurer).toHaveBeenCalledWith('installation/guide')
  })

  it('compte l’ouverture des étapes une seule fois, et les replie', () => {
    const p = afficher({ situation: 'firefox-android', installer: undefined })
    const comment = screen.getByRole('button', { name: 'Comment l’installer ?' })
    fireEvent.click(comment)
    fireEvent.click(comment)
    expect(comment).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    fireEvent.click(comment)
    expect(vi.mocked(p.mesurer).mock.calls.filter(([evenement]) => evenement === 'installation/guide')).toHaveLength(1)
  })

  it.each([
    ['ordinateur', 'Ctrl + D'],
    ['mac', '⌘ + D'],
  ] as const)('sur ordinateur (%s), une simple ligne : les favoris ou le téléphone', (situation, raccourci) => {
    const p = afficher({ situation, installer: undefined })
    expect(screen.getByText(/Pour revenir demain/)).toHaveTextContent(
      `Pour revenir demain : ajoute Duel Carbone à tes favoris (${raccourci}), ou joue sur ton téléphone.`,
    )
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    // « joue sur ton téléphone » est un bouton, qui dit ce qu'il ouvre ; la fenêtre reste fermée.
    expect(screen.getByRole('button', { name: 'Joue sur ton téléphone : afficher un QR code' })).toHaveTextContent(
      'joue sur ton téléphone',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(p.mesurer).not.toHaveBeenCalled()
  })

  it('sur ordinateur, « joue sur ton téléphone » ouvre le QR code du jeu, avec son adresse en clair, et le compte', () => {
    const p = afficher({ situation: 'ordinateur', installer: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Joue sur ton téléphone : afficher un QR code' }))

    const fenetre = screen.getByRole('dialog', { name: 'Joue sur ton téléphone' })
    const qr = within(fenetre).getByRole('img', { name: 'QR code vers duelcarbone.fr' })
    expect(qr).toHaveAttribute('src', '/qr-code-pc.svg')
    expect(fenetre).toHaveTextContent('duelcarbone.fr')
    expect(within(fenetre).getByRole('button', { name: 'Fermer' })).toHaveFocus()
    expect(p.mesurer).toHaveBeenCalledWith('installation/qr')
  })

  it('la fenêtre du QR code se ferme par la croix, Échap ou un clic sur le fond, et se compte à chaque ouverture', () => {
    const p = afficher({ situation: 'mac', installer: undefined })
    const ouvrir = () => fireEvent.click(screen.getByRole('button', { name: 'Joue sur ton téléphone : afficher un QR code' }))

    ouvrir()
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Dans un vrai navigateur, Échap ferme le <dialog> et déclenche l'événement « close ».
    ouvrir()
    const fenetre = screen.getByRole('dialog', { name: 'Joue sur ton téléphone' }) as HTMLDialogElement
    act(() => fenetre.close())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Le fond sombre fait partie de la balise <dialog> elle-même ; un clic sur son contenu ne la ferme pas.
    ouvrir()
    const fenetre2 = screen.getByRole('dialog', { name: 'Joue sur ton téléphone' })
    fireEvent.click(within(fenetre2).getByRole('img'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(fenetre2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(vi.mocked(p.mesurer).mock.calls.filter(([evenement]) => evenement === 'installation/qr')).toHaveLength(3)
  })

  it('« Non merci » la ferme pour de bon', () => {
    const p = afficher()
    fireEvent.click(screen.getByRole('button', { name: 'Non merci' }))
    expect(p.onEcarter).toHaveBeenCalled()
    expect(p.mesurer).toHaveBeenCalledWith('installation/refusee')
    expect(screen.queryByRole('region', { name: 'Reviens demain en un geste' })).not.toBeInTheDocument()
  })

  it('ne s’affiche pas si le jeu est déjà installé', () => {
    const p = afficher({ situation: 'installe', installer: undefined })
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(p.mesurer).not.toHaveBeenCalled()
  })
})
