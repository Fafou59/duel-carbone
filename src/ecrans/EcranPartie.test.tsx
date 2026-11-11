import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GESTES_CALCULES } from '../donnees/index.ts'
import { plusEmetteur, moinsEmetteur } from '../domaine/duel.ts'
import { hasardReproductible } from '../domaine/hasard.ts'
import { genererPartie } from '../domaine/generateur.ts'
import { EcranPartie } from './EcranPartie.tsx'

// Une Partie reproductible : toujours les mêmes 10 Duels, tirés avec la graine 3.
const DUELS = genererPartie({ gestes: GESTES_CALCULES, hasard: hasardReproductible(3) })

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

  it('signale la fin de la Partie avec le score, une seule fois', () => {
    const onTerminee = vi.fn()
    render(<EcranPartie duels={DUELS} onRejouer={() => {}} onTerminee={onTerminee} />)
    for (let i = 0; i < 10; i++) jouerDuel(i, i < 6)
    expect(onTerminee).toHaveBeenCalledExactlyOnceWith(6)
  })

  it('propose de rejouer à la fin', () => {
    const onRejouer = vi.fn()
    render(<EcranPartie duels={DUELS} onRejouer={onRejouer} />)
    for (let i = 0; i < 10; i++) jouerDuel(i, true)
    fireEvent.click(screen.getByRole('button', { name: 'Rejouer' }))
    expect(onRejouer).toHaveBeenCalledOnce()
  })

  it('passe au Duel suivant avec la touche Entrée, une fois le choix fait', () => {
    render(<EcranPartie duels={DUELS} onRejouer={() => {}} />)
    fireEvent.keyDown(document.body, { key: 'Enter' })
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(DUELS[0].a.titre) }))
    fireEvent.keyDown(document.body, { key: 'Enter' })
    expect(screen.getByText('Duel 2/10')).toBeInTheDocument()
  })

  it('mène au score avec Entrée après le dernier Duel', () => {
    render(<EcranPartie duels={DUELS} onRejouer={() => {}} />)
    for (let i = 0; i < 9; i++) jouerDuel(i, true)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(DUELS[9].a.titre) }))
    fireEvent.keyDown(document.body, { key: 'Enter' })
    expect(screen.getByRole('heading', { name: 'Partie terminée !' })).toBeInTheDocument()
  })

  it('laisse Entrée à son rôle habituel sur un lien, et ignore une touche maintenue', () => {
    render(<EcranPartie duels={DUELS} onRejouer={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(DUELS[0].a.titre) }))
    fireEvent.keyDown(screen.getAllByRole('link')[0], { key: 'Enter' })
    fireEvent.keyDown(document.body, { key: 'Enter', repeat: true })
    expect(screen.getByText('Duel 1/10')).toBeInTheDocument()
  })

  it('remonte en haut de page et place le focus sur la position à chaque nouveau Duel', () => {
    render(<EcranPartie duels={DUELS} onRejouer={() => {}} />)
    jouerDuel(0, true)
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 })
    expect(screen.getByText('Duel 2/10')).toHaveFocus()
  })
})

describe('Un Duel thématique dans la Partie', () => {
  // La même Partie, où le Duel 3 devient un Duel thématique (il a ses textes rédigés à la main).
  const TEXTES = {
    titre: 'Le match des mangues',
    accroche: 'Même fruit, même poids… mais pas le même voyage.',
    texte: 'Tout se joue pendant le voyage.',
  }
  const AVEC_THEMATIQUE = DUELS.map((duel, i) => (i === 2 ? { ...duel, thematique: TEXTES } : duel))
  const segmentsThematiques = (conteneur: HTMLElement) =>
    conteneur.querySelectorAll('.progression__segment--thematique').length

  it("ne se devine pas avant d'y arriver", () => {
    const { container } = render(<EcranPartie duels={AVEC_THEMATIQUE} onRejouer={() => {}} />)
    jouerDuel(0, true)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(segmentsThematiques(container)).toBe(0)
  })

  it("s'annonce en arrivant dessus, avec son étiquette et sa case dans la barre", () => {
    const { container } = render(<EcranPartie duels={AVEC_THEMATIQUE} onRejouer={() => {}} />)
    jouerDuel(0, true)
    jouerDuel(1, true)
    expect(screen.getByRole('dialog', { name: 'Duel thématique' })).toBeInTheDocument()
    expect(screen.getByText('thématique')).toBeInTheDocument()
    expect(segmentsThematiques(container)).toBe(1)
  })

  it('annonce son titre et son accroche, sans donner la réponse', () => {
    render(<EcranPartie duels={AVEC_THEMATIQUE} onRejouer={() => {}} />)
    jouerDuel(0, true)
    jouerDuel(1, true)
    const annonce = within(screen.getByRole('dialog', { name: 'Duel thématique' }))
    expect(annonce.getByText(TEXTES.titre)).toBeInTheDocument()
    expect(annonce.getByText(TEXTES.accroche)).toBeInTheDocument()
    expect(annonce.queryByText(TEXTES.texte)).not.toBeInTheDocument()
  })

  it('explique le piège après la réponse, avec son texte rédigé à la main', () => {
    render(<EcranPartie duels={AVEC_THEMATIQUE} onRejouer={() => {}} />)
    jouerDuel(0, true)
    jouerDuel(1, true)
    fireEvent.click(screen.getByRole('button', { name: 'Au Duel !' }))
    expect(screen.queryByText(TEXTES.texte)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: new RegExp(plusEmetteur(DUELS[2]).titre) }))
    expect(within(screen.getByRole('region', { name: 'Explication' })).getByText(TEXTES.texte)).toBeInTheDocument()
  })

  it("garde les touches 1 et 2 pour l'annonce tant qu'elle est ouverte", () => {
    render(<EcranPartie duels={AVEC_THEMATIQUE} onRejouer={() => {}} />)
    jouerDuel(0, true)
    jouerDuel(1, true)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Au Duel !' }), { key: '1' })
    expect(screen.queryByRole('button', { name: 'Duel suivant →' })).not.toBeInTheDocument()
  })

  it("se joue une fois l'annonce fermée, et garde sa case bleue ensuite", () => {
    const { container } = render(<EcranPartie duels={AVEC_THEMATIQUE} onRejouer={() => {}} />)
    jouerDuel(0, true)
    jouerDuel(1, true)
    fireEvent.click(screen.getByRole('button', { name: 'Au Duel !' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Duel 3/10')).toHaveFocus()
    jouerDuel(2, true)
    expect(screen.getByText('Duel 4/10')).toBeInTheDocument()
    expect(screen.getByText('moyen')).toBeInTheDocument()
    expect(segmentsThematiques(container)).toBe(1)
  })
})
