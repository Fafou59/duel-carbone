import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GESTES_CALCULES } from '../donnees/index.ts'
import { plusEmetteur, moinsEmetteur } from '../domaine/duel.ts'
import { formaterMultiple, queDevant } from '../domaine/format.ts'
import { genererPartie } from '../domaine/generateur.ts'
import { hasardReproductible } from '../domaine/hasard.ts'
import { avancer, demarrerPartie, score } from '../domaine/partie.ts'
import { texteDePartage, texteDePartageDuJour } from '../domaine/partage.ts'
import { recapitulatif } from '../domaine/recapitulatif.ts'
import type { ResultatPartage, ResultatPartageImage } from '../navigateur/partager.ts'
import { EcranFin, type PartageImage } from './EcranFin.tsx'

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

/** Un faux partage en image : un téléphone qui sait partager un fichier (sauf avis contraire). */
const IMAGE = new Blob(['png'], { type: 'image/png' })
const fauxPartageImage = (resultat: ResultatPartageImage = 'partage', fichierPartageable = true) => ({
  fichierPartageable: () => fichierPartageable,
  fabriquer: vi.fn<PartageImage['fabriquer']>(async () => IMAGE),
  partager: vi.fn<PartageImage['partager']>(async () => resultat),
})

const caseDuel = (numero: number) => screen.getByRole('button', { name: new RegExp(`^Duel ${numero} ?\\(`) })

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
      <EcranFin
        lignes={LIGNES}
        score={7}
        total={10}
        onRejouer={onRejouer}
        duJour={{ numero: 12, situation, onJouer }}
        partageImage={fauxPartageImage()}
      />,
    )
    return { onJouer, onRejouer }
  }
  const boutons = () => within(screen.getByRole('group', { name: 'Et maintenant ?' })).getAllByRole('button')

  it('n’invite pas à installer le jeu : seulement à la fin du Duel du jour', () => {
    finLibre('aJouer')
    expect(screen.queryByRole('region', { name: 'Reviens demain en un geste' })).not.toBeInTheDocument()
  })

  it('propose d’abord le Duel du jour s’il n’est pas encore joué, puis « Rejouer »', () => {
    const { onJouer } = finLibre('aJouer')
    expect(screen.getByText('Échauffement terminé : place au Duel du jour !')).toBeInTheDocument()
    expect(boutons().map((b) => b.textContent)).toEqual([
      'Jouer le Duel du jour n° 12',
      'Rejouer',
      'Partager mon score',
      '📸 Partager en image',
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Jouer le Duel du jour n° 12' }))
    expect(onJouer).toHaveBeenCalledOnce()
  })

  it('propose de reprendre un Duel du jour commencé', () => {
    finLibre('enCours')
    expect(boutons()[0]).toHaveTextContent('Reprendre le Duel du jour n° 12')
  })

  it('garde « Rejouer » en premier si le Duel du jour est déjà joué, et annonce le prochain', () => {
    finLibre('joue')
    expect(boutons().map((b) => b.textContent)).toEqual(['Rejouer', 'Partager mon score', '📸 Partager en image'])
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
      texteDePartageDuJour({ numero: 12, score: 7, bonnes: LIGNES.map((l) => l.bonne) }),
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

  it('invite à revenir demain (#68) : sur ordinateur, comme ici (jsdom), une ligne pour les favoris', () => {
    finDuJour()
    expect(screen.getByText(/^Pour revenir demain : ajoute Duel Carbone à tes favoris/)).toBeInTheDocument()
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

describe('Partage du score en image, pour les Stories', () => {
  const bonnes = LIGNES.map((l) => l.bonne)
  const fin = ({ duJour = true, resultat = 'partage' as ResultatPartageImage, fichierPartageable = true } = {}) => {
    const partageImage = fauxPartageImage(resultat, fichierPartageable)
    render(
      <EcranFin
        lignes={LIGNES}
        score={7}
        total={10}
        onRejouer={() => {}}
        onPartager={async () => 'copie'}
        partieDuJour={duJour ? { numero: 12, serie: 3 } : undefined}
        partageImage={partageImage}
      />,
    )
    return partageImage
  }
  const boutonImage = (nom = 'Partager en image') => screen.getByRole('button', { name: nom })

  it('propose l’image juste après « Défier mes proches », qui reste le premier bouton', () => {
    fin()
    const boutons = within(screen.getByRole('group', { name: 'Et maintenant ?' })).getAllByRole('button')
    expect(boutons.map((b) => b.textContent)).toEqual(['Défier mes proches', '📸 Partager en image'])
  })

  it('prépare l’image dès l’affichage (numéro, score, cases, série), puis la partage au toucher du bouton', async () => {
    const { fabriquer, partager } = fin()
    expect(fabriquer).toHaveBeenCalledWith({ numero: 12, score: 7, bonnes, serie: 3 })
    fireEvent.click(boutonImage())
    await waitFor(() => expect(partager).toHaveBeenCalledOnce())
    expect(await partager.mock.calls[0][0]).toBe(IMAGE)
    expect(partager.mock.calls[0][1]).toBe('duel-carbone-du-jour-12.png')
  })

  it('en Partie libre aussi, sans numéro ni série', async () => {
    const { fabriquer, partager } = fin({ duJour: false })
    expect(fabriquer).toHaveBeenCalledWith({ numero: undefined, score: 7, bonnes, serie: undefined })
    fireEvent.click(boutonImage())
    await waitFor(() => expect(partager).toHaveBeenCalledWith(expect.any(Promise), 'duel-carbone-partie-libre.png'))
  })

  it('devient « Enregistrer l’image » quand le navigateur ne sait pas partager un fichier', () => {
    fin({ fichierPartageable: false })
    expect(boutonImage('Enregistrer l’image')).toBeInTheDocument()
  })

  it('rappelle d’ajouter l’autocollant « Lien » après un partage ou un enregistrement', async () => {
    fin({ resultat: 'enregistre' })
    fireEvent.click(boutonImage())
    expect(await screen.findByRole('status')).toHaveTextContent('Image enregistrée')
    expect(screen.getByRole('status')).toHaveTextContent('autocollant « Lien »')
  })

  it('n’affiche rien si le joueur ferme le menu', async () => {
    fin({ resultat: 'annule' })
    fireEvent.click(boutonImage())
    await act(async () => {})
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('renvoie vers le texte si l’image n’a pas pu être créée', async () => {
    fin({ resultat: 'echec' })
    fireEvent.click(boutonImage())
    expect(await screen.findByRole('status')).toHaveTextContent('L’image n’a pas pu être créée')
  })
})

describe('Récapitulatif', () => {
  it('affiche une case par Duel, réussi ou raté, dans l’ordre', () => {
    afficher()
    const cases = within(screen.getByRole('list', { name: 'Récapitulatif' })).getAllByRole('button')
    expect(cases).toHaveLength(10)
    expect(caseDuel(1)).toHaveAccessibleName(/^Duel 1 ?\(réussi\)/)
    expect(caseDuel(8)).toHaveAccessibleName(/^Duel 8 ?\(raté\)/)
  })

  it('donne à chaque case un nom lisible, sans dépendre des icônes', () => {
    afficher()
    const { plus, moins } = LIGNES[0]
    // L'espace avant la parenthèse dépend du navigateur (Chrome en ajoute une autour d'un texte caché).
    const attendu = `(réussi) : ${plus.titre} émet ${formaterMultiple(LIGNES[0].rapport)} fois plus ${queDevant(moins.titre)}`
    expect(caseDuel(1)).toHaveAccessibleName(new RegExp(`^Duel 1 ?${attendu.replace(/[()]/g, '\\$&')}$`))
  })

  it('tire ce nom du texte de la case, pour qu’on puisse la désigner à la voix (« clique sur Duel 1 »)', () => {
    afficher()
    // Un aria-label remplacerait le texte affiché : le nom lu ne contiendrait plus forcément ce qu'on voit.
    expect(caseDuel(1)).not.toHaveAttribute('aria-label')
    expect(caseDuel(1)).toHaveTextContent(/^✓ Duel 1/)
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

describe('Fin de Partie : le Conseil', () => {
  const CONSEIL = {
    id: 'teletravail',
    texte: 'Un jour de télétravail par semaine… environ 130 kg de trajets en moins par an.',
    lien: { url: 'https://impactco2.fr/doc/questions-frequentes', titre: 'Le télétravail ?' },
  }

  it('n’en montre aucun sans Conseil fourni', () => {
    afficher()
    expect(screen.queryByRole('complementary', { name: 'Un conseil' })).not.toBeInTheDocument()
  })

  it('le choisit une seule fois, d’après les Duels de la Partie, et le note comme vu une seule fois', () => {
    const choisir = vi.fn(() => CONSEIL)
    const onVu = vi.fn()
    const props = { lignes: LIGNES, score: score(etat), total: 10, onRejouer: () => {}, conseil: { choisir, onVu } }
    const { rerender } = render(<EcranFin {...props} />)
    rerender(<EcranFin {...props} conseil={{ choisir, onVu: vi.fn() }} />)
    expect(choisir).toHaveBeenCalledOnce()
    expect(choisir).toHaveBeenCalledWith(LIGNES)
    expect(onVu).toHaveBeenCalledOnce()
    expect(onVu).toHaveBeenCalledWith('teletravail')
    expect(screen.getByRole('complementary', { name: 'Un conseil' })).toHaveTextContent(CONSEIL.texte)
  })

  it('arrive sous les boutons de partage (prototype du 22/11, variante A)', () => {
    render(
      <EcranFin
        lignes={LIGNES}
        score={score(etat)}
        total={10}
        onRejouer={() => {}}
        partieDuJour={{ numero: 7, serie: 1 }}
        conseil={{ choisir: () => CONSEIL, onVu: () => {} }}
      />,
    )
    const partage = screen.getByRole('button', { name: 'Défier mes proches' })
    const conseil = screen.getByRole('complementary', { name: 'Un conseil' })
    expect(partage.compareDocumentPosition(conseil) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
