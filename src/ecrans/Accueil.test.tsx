import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { REPERES_CLIMAT } from '../donnees/index.ts'
import { formaterEmpreinte } from '../domaine/format.ts'
import { Accueil, type PropsAccueil } from './Accueil.tsx'

const actions = () => ({
  onJouerDuJour: vi.fn(),
  onPartieLibre: vi.fn(),
  onRevoir: vi.fn(),
  onTutoriel: vi.fn(),
  onPartager: vi.fn(async () => 'copie' as const),
})

const afficher = (props: Partial<PropsAccueil> = {}) => {
  const a = actions()
  render(<Accueil jour="2026-11-22" numero={12} situation="nouveau" serie={0} record={null} calendrierPret {...a} {...props} />)
  return a
}

const enTonnes = (kg: number) => formaterEmpreinte(kg, { co2e: false })

describe('Accueil : le nouveau joueur (la vitrine)', () => {
  it('présente le jeu : titre, accroche et repères climat lus dans l’Instantané', () => {
    afficher()
    expect(screen.getByRole('heading', { name: 'Lequel émet le plus ?' })).toBeInTheDocument()
    const accroche = screen.getByText(/Un Français émet en moyenne/)
    expect(accroche).toHaveTextContent(enTonnes(REPERES_CLIMAT.francais))
    expect(accroche).toHaveTextContent(`l’objectif pour 2050, c’est ${enTonnes(REPERES_CLIMAT.objectif2050)}`)
    expect(screen.getByText('10 Duels par jour pour apprendre à connaître l’empreinte des gestes du quotidien.')).toBeInTheDocument()
  })

  it('met en avant le Duel du jour, puis « Comment ça marche ? » et la Partie libre', () => {
    const a = afficher()
    fireEvent.click(screen.getByRole('button', { name: 'Jouer le Duel du jour n° 12' }))
    fireEvent.click(screen.getByRole('button', { name: 'Comment ça marche ?' }))
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    expect(a.onJouerDuJour).toHaveBeenCalled()
    expect(a.onTutoriel).toHaveBeenCalled()
    expect(a.onPartieLibre).toHaveBeenCalled()
    expect(screen.getByText('Envie de t’entraîner avant le Duel du jour ?')).toBeInTheDocument()
  })

  it('propose de reprendre un Duel du jour commencé', () => {
    afficher({ situation: 'enCours' })
    expect(screen.getByRole('button', { name: 'Reprendre le Duel du jour n° 12' })).toBeInTheDocument()
  })

  it('attend le calendrier avant de lancer le Duel du jour', () => {
    afficher({ calendrierPret: false })
    expect(screen.getByRole('button', { name: 'Jouer le Duel du jour n° 12' })).toBeDisabled()
  })

  it('explique le CO2e dans une fenêtre, ouverte par la pastille « ? »', () => {
    afficher()
    fireEvent.click(screen.getByRole('button', { name: 'Qu’est-ce que le CO2e ?' }))
    const fenetre = screen.getByRole('dialog', { name: 'Définition du CO2e' })
    expect(within(fenetre).getByRole('heading', { name: 'Le CO2e, c’est quoi ?' })).toBeInTheDocument()
    expect(within(fenetre).getByRole('heading', { name: 'Par exemple' })).toBeInTheDocument()
  })
})

describe('Accueil : le joueur qui a joué aujourd’hui (le tableau de bord)', () => {
  const resultat = { score: 7, bonnes: [true, true, true, false, true, true, false, true, false, true] }

  it('montre le score du jour, sa grille, la série et le temps avant le prochain Duel', () => {
    afficher({ situation: 'aujourdhui', resultat, serie: 4 })
    expect(screen.getByText('Ton Duel du jour')).toBeInTheDocument()
    expect(screen.getByLabelText('7 bonnes réponses sur 10')).toBeInTheDocument()
    expect(screen.getByText('🔥 4 jours')).toBeInTheDocument()
    expect(screen.getByText('avant le prochain Duel')).toBeInTheDocument()
    expect(screen.getByText(/^dimanche 22 novembre/i)).toBeInTheDocument()
  })

  it('propose de défier ses proches, de revoir son Récapitulatif, puis met en avant la Partie libre', async () => {
    const a = afficher({ situation: 'aujourdhui', resultat, serie: 4 })
    fireEvent.click(screen.getByRole('button', { name: 'Défier mes proches' }))
    expect(a.onPartager).toHaveBeenCalledWith(expect.stringContaining('7/10'))
    expect(await screen.findByText(/Score copié/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Revoir mon Récapitulatif' }))
    expect(a.onRevoir).toHaveBeenCalled()
    expect(screen.getByText('Envie de t’entraîner pour le Duel de demain ?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Partie libre' })).toBeInTheDocument()
  })
})

describe('Accueil : le joueur qui a joué hier, pas encore aujourd’hui', () => {
  it('met la série en avant, avec le score d’hier et le temps qui reste pour jouer', () => {
    const a = afficher({ situation: 'hier', serie: 3, scoreHier: 8 })
    expect(screen.getByText(/Série de 3 jours\./).closest('p')).toHaveTextContent('Ne la casse pas !')
    expect(screen.getByText('8/10')).toBeInTheDocument()
    expect(screen.getByText('pour le jouer')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Jouer le Duel du jour n° 12' }))
    expect(a.onJouerDuJour).toHaveBeenCalled()
    // La Partie libre passe en retrait : un simple lien.
    fireEvent.click(screen.getByRole('button', { name: 'une Partie libre' }))
    expect(a.onPartieLibre).toHaveBeenCalled()
  })
})
