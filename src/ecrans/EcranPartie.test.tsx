import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GESTES_CALCULES } from '../donnees/index.ts'
import { plusEmetteur, moinsEmetteur } from '../domaine/duel.ts'
import { hasardReproductible } from '../domaine/hasard.ts'
import { tirerPartieProvisoire } from '../domaine/tirage.ts'
import { EcranPartie } from './EcranPartie.tsx'

// Une Partie reproductible : toujours les mêmes 10 Duels, tirés avec la graine 3.
const DUELS = tirerPartieProvisoire(GESTES_CALCULES, hasardReproductible(3))

/** Joue un Duel comme un joueur : clique sur une carte, puis sur le bouton de suite. */
const jouerDuel = (index: number, bien: boolean) => {
  const duel = DUELS[index]
  const cible = bien ? plusEmetteur(duel) : moinsEmetteur(duel)
  fireEvent.click(screen.getByRole('button', { name: new RegExp(cible.titre) }))
  fireEvent.click(screen.getByRole('button', { name: index === 9 ? 'Voir mon score' : 'Duel suivant →' }))
}

describe('Une Partie de 10 Duels', () => {
  it('commence au Duel 1/10, en difficulté facile', () => {
    render(<EcranPartie duels={DUELS} onRejouer={() => {}} />)
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
    expect(screen.getByText('facile')).toBeInTheDocument()
    expect(screen.getByText('Score : 0')).toBeInTheDocument()
  })

  it('propose « Duel suivant » seulement après le choix', () => {
    render(<EcranPartie duels={DUELS} onRejouer={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Duel suivant →' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(DUELS[0].a.titre) }))
    expect(screen.getByRole('button', { name: 'Duel suivant →' })).toBeInTheDocument()
  })

  it('avance au Duel suivant et met à jour le score', () => {
    render(<EcranPartie duels={DUELS} onRejouer={() => {}} />)
    jouerDuel(0, true)
    expect(screen.getByText('Duel 2/10')).toBeInTheDocument()
    expect(screen.getByText('Score : 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: new RegExp(DUELS[1].a.titre) })).toBeEnabled()
  })

  it('suit la difficulté attendue : moyen au Duel 4, ultime au Duel 10', () => {
    render(<EcranPartie duels={DUELS} onRejouer={() => {}} />)
    for (let i = 0; i < 3; i++) jouerDuel(i, true)
    expect(screen.getByText('moyen')).toBeInTheDocument()
    for (let i = 3; i < 9; i++) jouerDuel(i, true)
    expect(screen.getByText('Duel 10/10')).toBeInTheDocument()
    expect(screen.getByText('ultime')).toBeInTheDocument()
  })

  it('se termine sur le score après 10 Duels', () => {
    render(<EcranPartie duels={DUELS} onRejouer={() => {}} />)
    for (let i = 0; i < 10; i++) jouerDuel(i, i < 7)
    expect(screen.getByRole('heading', { name: 'Partie terminée !' })).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.queryByText(/Duel \d+\/10/)).not.toBeInTheDocument()
  })

  it('propose de rejouer à la fin', () => {
    const onRejouer = vi.fn()
    render(<EcranPartie duels={DUELS} onRejouer={onRejouer} />)
    for (let i = 0; i < 10; i++) jouerDuel(i, true)
    fireEvent.click(screen.getByRole('button', { name: 'Rejouer' }))
    expect(onRejouer).toHaveBeenCalledOnce()
  })

  it('remonte en haut de page et place le focus sur la position à chaque nouveau Duel', () => {
    render(<EcranPartie duels={DUELS} onRejouer={() => {}} />)
    jouerDuel(0, true)
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 })
    expect(screen.getByText('Duel 2/10')).toHaveFocus()
  })
})
