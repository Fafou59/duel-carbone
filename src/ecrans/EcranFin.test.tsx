import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GESTES_CALCULES } from '../donnees/index.ts'
import { plusEmetteur, moinsEmetteur } from '../domaine/duel.ts'
import { formaterMultiple, queDevant } from '../domaine/format.ts'
import { genererPartie } from '../domaine/generateur.ts'
import { hasardReproductible } from '../domaine/hasard.ts'
import { avancer, demarrerPartie, score } from '../domaine/partie.ts'
import { recapitulatif } from '../domaine/recapitulatif.ts'
import { EcranFin } from './EcranFin.tsx'

// Une Partie reproductible, jouée d'avance : bonne réponse aux Duels 1 à 7, mauvaise aux Duels 8 à 10.
const DUELS = genererPartie({ gestes: GESTES_CALCULES, hasard: hasardReproductible(3) })
let etat = demarrerPartie(DUELS)
DUELS.forEach((duel, i) => {
  const idGeste = (i < 7 ? plusEmetteur(duel) : moinsEmetteur(duel)).id
  etat = avancer(avancer(etat, { type: 'choisir', idGeste }), { type: 'suivant' })
})
const LIGNES = recapitulatif(etat)

const afficher = (onRejouer = () => {}) =>
  render(<EcranFin lignes={LIGNES} score={score(etat)} total={10} onRejouer={onRejouer} />)

const caseDuel = (numero: number) => screen.getByRole('button', { name: new RegExp(`^Duel ${numero},`) })

describe('Écran de fin de Partie', () => {
  it('affiche le score sur 10 et un message adapté', () => {
    afficher()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Très bien joué !')).toBeInTheDocument()
  })

  it('« Rejouer » lance une nouvelle Partie', () => {
    const onRejouer = vi.fn()
    afficher(onRejouer)
    fireEvent.click(screen.getByRole('button', { name: 'Rejouer' }))
    expect(onRejouer).toHaveBeenCalledOnce()
  })
})

describe('Récapitulatif', () => {
  it('affiche une case par Duel, réussi ou raté, dans l’ordre', () => {
    afficher()
    const cases = within(screen.getByRole('list', { name: 'Récapitulatif' })).getAllByRole('button')
    expect(cases).toHaveLength(10)
    expect(caseDuel(1)).toHaveAccessibleName(/^Duel 1, réussi/)
    expect(caseDuel(8)).toHaveAccessibleName(/^Duel 8, raté/)
  })

  it('donne à chaque case un nom lisible, sans dépendre des icônes', () => {
    afficher()
    const { plus, moins } = LIGNES[0]
    expect(caseDuel(1)).toHaveAccessibleName(
      `Duel 1, réussi : ${plus.titre} émet ${formaterMultiple(LIGNES[0].rapport)} fois plus ${queDevant(moins.titre)}`,
    )
  })

  it('ouvre le détail du Duel dans un panneau, avec le focus sur la croix', () => {
    afficher()
    fireEvent.click(caseDuel(3))
    const panneau = screen.getByRole('dialog', { name: 'Détail du Duel 3' })
    expect(within(panneau).getByRole('table')).toBeInTheDocument()
    expect(within(panneau).getByRole('button', { name: 'Fermer le détail' })).toHaveFocus()
  })

  it('rappelle dans le détail si le joueur avait vu juste', () => {
    afficher()
    fireEvent.click(caseDuel(1))
    expect(within(screen.getByRole('dialog')).getByText('✓ Bonne réponse !')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Fermer le détail' }))
    fireEvent.click(caseDuel(9))
    expect(within(screen.getByRole('dialog')).getByText(/✗ Raté/)).toBeInTheDocument()
  })

  it('se ferme avec la croix et rend le focus à la case consultée', () => {
    afficher()
    fireEvent.click(caseDuel(4))
    fireEvent.click(screen.getByRole('button', { name: 'Fermer le détail' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(caseDuel(4)).toHaveFocus()
  })

  it('se ferme avec la touche Échap (le navigateur ferme alors la boîte de dialogue)', () => {
    afficher()
    fireEvent.click(caseDuel(5))
    // Dans un vrai navigateur, Échap ferme le <dialog> et déclenche l'événement « close ».
    fireEvent(screen.getByRole('dialog'), new Event('close'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(caseDuel(5)).toHaveFocus()
  })

  it('se ferme d’un clic sur le fond, mais pas d’un clic dans le panneau', () => {
    afficher()
    fireEvent.click(caseDuel(2))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('table'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // Le fond sombre fait partie de la balise <dialog> elle-même.
    fireEvent.click(screen.getByRole('dialog'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(caseDuel(2)).toHaveFocus()
  })
})
