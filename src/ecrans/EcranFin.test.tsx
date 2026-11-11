import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GESTES_CALCULES } from '../donnees/index.ts'
import { plusEmetteur, moinsEmetteur } from '../domaine/duel.ts'
import { formaterMultiple, queDevant } from '../domaine/format.ts'
import { genererPartie } from '../domaine/generateur.ts'
import { hasardReproductible } from '../domaine/hasard.ts'
import { avancer, demarrerPartie, score } from '../domaine/partie.ts'
import { texteDePartage, texteDePartageDuJour } from '../domaine/partage.ts'
import { ACCROCHES_DU_JOUR } from '../donnees/accroches.ts'
import { recapitulatif } from '../domaine/recapitulatif.ts'
import type { ResultatPartage } from '../navigateur/partager.ts'
import { EcranFin } from './EcranFin.tsx'

// Une Partie reproductible, jouée d'avance : bonne réponse aux Duels 1 à 7, mauvaise aux Duels 8 à 10.
const DUELS = genererPartie({ gestes: GESTES_CALCULES, hasard: hasardReproductible(3) })
let etat = demarrerPartie(DUELS)
DUELS.forEach((duel, i) => {
  const idGeste = (i < 7 ? plusEmetteur(duel) : moinsEmetteur(duel)).id
  etat = avancer(avancer(etat, { type: 'choisir', idGeste }), { type: 'suivant' })
})
const LIGNES = recapitulatif(etat)

const afficher = (
  onRejouer = () => {},
  onPartager: (texte: string) => Promise<ResultatPartage> = async () => 'copie',
) =>
  render(<EcranFin lignes={LIGNES} score={score(etat)} total={10} onRejouer={onRejouer} onPartager={onPartager} />)

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

describe('Fin de Partie libre : cap sur le Duel du jour', () => {
  const finLibre = (situation: 'aJouer' | 'enCours' | 'joue') => {
    const onJouer = vi.fn()
    const onRejouer = vi.fn()
    render(
      <EcranFin lignes={LIGNES} score={7} total={10} onRejouer={onRejouer} duJour={{ numero: 12, situation, onJouer }} />,
    )
    return { onJouer, onRejouer }
  }
  const boutons = () => within(screen.getByRole('group', { name: 'Et maintenant ?' })).getAllByRole('button')

  it('propose d’abord le Duel du jour s’il n’est pas encore joué, puis « Rejouer »', () => {
    const { onJouer } = finLibre('aJouer')
    expect(screen.getByText('Échauffement terminé : place au Duel du jour !')).toBeInTheDocument()
    expect(boutons().map((b) => b.textContent)).toEqual(['Jouer le Duel du jour n° 12', 'Rejouer', 'Partager mon score'])
    fireEvent.click(screen.getByRole('button', { name: 'Jouer le Duel du jour n° 12' }))
    expect(onJouer).toHaveBeenCalledOnce()
  })

  it('propose de reprendre un Duel du jour commencé', () => {
    finLibre('enCours')
    expect(boutons()[0]).toHaveTextContent('Reprendre le Duel du jour n° 12')
  })

  it('garde « Rejouer » en premier si le Duel du jour est déjà joué, et annonce le prochain', () => {
    finLibre('joue')
    expect(boutons().map((b) => b.textContent)).toEqual(['Rejouer', 'Partager mon score'])
    expect(screen.getByText(/Prochain Duel du jour dans/)).toBeInTheDocument()
  })
})

describe('Fin du Duel du jour : cap sur le partage', () => {
  const finDuJour = (serie = 3) => {
    const onRejouer = vi.fn()
    const onPartager = vi.fn<(texte: string) => Promise<ResultatPartage>>(async () => 'copie')
    render(
      <EcranFin
        lignes={LIGNES}
        score={7}
        total={10}
        onRejouer={onRejouer}
        onPartager={onPartager}
        partieDuJour={{ numero: 12, serie }}
      />,
    )
    return { onRejouer, onPartager }
  }

  it('titre sur le numéro du jour, avec la série et le temps avant le prochain', () => {
    finDuJour()
    expect(screen.getByRole('heading', { level: 2, name: 'Duel Carbone du jour n° 12' })).toBeInTheDocument()
    expect(screen.getByText(/Série : 3 jours d'affilée/)).toBeInTheDocument()
    expect(screen.getByText(/Prochain Duel du jour dans/)).toBeInTheDocument()
  })

  it('met « Défier mes proches » en premier, avec le texte du jour : accroche, score et grille', () => {
    const { onPartager } = finDuJour()
    fireEvent.click(screen.getByRole('button', { name: 'Défier mes proches' }))
    expect(onPartager).toHaveBeenCalledWith(
      texteDePartageDuJour({ numero: 12, score: 7, bonnes: LIGNES.map((l) => l.bonne), accroches: ACCROCHES_DU_JOUR }),
    )
    expect(onPartager.mock.calls[0][0]).toContain('🟩🟩🟩🟩🟩🟩🟩🟥🟥🟥')
  })

  it('propose ensuite la Partie libre, pour s’entraîner', () => {
    const { onRejouer } = finDuJour()
    expect(screen.getByText('Envie de t’entraîner pour le Duel de demain ?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    expect(onRejouer).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Rejouer' })).not.toBeInTheDocument()
  })
})

describe('Record', () => {
  const avecRecord = (ancienRecord: number | null) =>
    render(<EcranFin lignes={LIGNES} score={7} total={10} ancienRecord={ancienRecord} onRejouer={() => {}} />)

  it('fête un nouveau record', () => {
    avecRecord(5)
    expect(screen.getByText(/Nouveau record/)).toHaveTextContent('ancien : 5/10')
  })

  it('rappelle le record à battre s’il n’est pas battu', () => {
    avecRecord(9)
    expect(screen.getByText('Ton record : 9/10')).toBeInTheDocument()
    expect(screen.queryByText(/Nouveau record/)).not.toBeInTheDocument()
  })

  it('ne dit rien du record à la toute première Partie', () => {
    avecRecord(null)
    expect(screen.queryByText(/record/i)).not.toBeInTheDocument()
  })
})

describe('Partage du score', () => {
  const partagerAvec = (resultat: ResultatPartage) => {
    const onPartager = vi.fn(async () => resultat)
    afficher(undefined, onPartager)
    fireEvent.click(screen.getByRole('button', { name: 'Partager mon score' }))
    return onPartager
  }

  it('partage le texte du score', async () => {
    const onPartager = partagerAvec('partage')
    expect(onPartager).toHaveBeenCalledWith(texteDePartage(7, 10))
  })

  it('confirme la copie', async () => {
    partagerAvec('copie')
    expect(await screen.findByRole('status')).toHaveTextContent('Score copié')
  })

  it('n’affiche rien si le joueur annule', async () => {
    partagerAvec('annule')
    await act(async () => {})
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('montre le texte à copier à la main si la copie échoue', async () => {
    partagerAvec('echec')
    expect(await screen.findByText(texteDePartage(7, 10))).toBeInTheDocument()
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
