import { act, fireEvent, render, screen } from '@testing-library/react'
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

  it('explique le geste sur iPhone, sans bouton d’installation', () => {
    afficher({ situation: 'ios', installer: undefined })
    expect(screen.getByText(/touche Partager/)).toHaveTextContent(/Sur l’écran d’accueil/)
    expect(screen.queryByRole('button', { name: 'Installer Duel Carbone' })).not.toBeInTheDocument()
  })

  it('suggère les favoris ailleurs', () => {
    afficher({ situation: 'favori', installer: undefined })
    expect(screen.getByText(/favoris/)).toBeInTheDocument()
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
