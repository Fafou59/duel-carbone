import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GESTES_CALCULES, gesteCalcule, INSTANTANE } from '../donnees/index.ts'
import { formaterDate, formaterEmpreinte } from '../domaine/format.ts'
import { REGLES } from '../domaine/regles.ts'
import { empreinteDeLaCreation } from '../domaine/empreinte-ia.ts'
import { HYPOTHESES, JETONS } from '../donnees/empreinte-ia.ts'
import { EcranEnSavoirPlus } from './EcranEnSavoirPlus.tsx'

describe('Page En savoir plus', () => {
  it('commence par le projet : pourquoi ce jeu, avant les sources et la méthode', () => {
    render(<EcranEnSavoirPlus />)
    const titres = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titres[0]).toBe('Pourquoi Duel Carbone ?')
    expect(screen.getByText(/On apprend en se trompant/)).toBeInTheDocument()
  })

  it('présente l’ADEME et ses missions, au-delà de la mesure de l’empreinte', () => {
    render(<EcranEnSavoirPlus />)
    const ademe = screen.getByText(/établissement public/)
    expect(ademe).toHaveTextContent(/énergies renouvelables/)
    expect(ademe).toHaveTextContent(/recherche/)
    expect(screen.getByRole('link', { name: /missions de l'ADEME/ })).toHaveAttribute('href', 'https://www.ademe.fr/lagence/')
  })

  it('estime l’empreinte de la création du jeu par IA, avec sa fourchette et sa méthode', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByRole('heading', { name: 'L’empreinte de ce jeu' })).toBeInTheDocument()
    const estimation = screen.getByText(/Estimation au/)
    // Les chiffres sont calculés depuis les données (donnees/empreinte-ia.ts), arrondis au kilo.
    const kg = (h: keyof typeof HYPOTHESES) => Math.round(empreinteDeLaCreation(JETONS, HYPOTHESES[h]).kgCo2e)
    expect(estimation).toHaveTextContent(new RegExp(`environ ${kg('centrale')} kg CO2e`))
    expect(estimation).toHaveTextContent(new RegExp(`entre ${kg('basse')} et ${kg('haute')} kg`))
    expect(estimation).toHaveTextContent(/regarder l'intégrale de Friends en streaming \(236 épisodes de 20 min\)/)
    expect(screen.getByRole('link', { name: /méthode détaillée/ })).toHaveAttribute(
      'href',
      'https://github.com/Fafou59/duel-carbone/blob/main/docs/empreinte-ia.md',
    )
  })

  it('glisse un indice sur l’Easter Egg, sans dire où il se cache', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByText(/caché dans deux Duels ★/)).toBeInTheDocument()
  })

  it('ne compte que les Gestes construits à partir des fiches de l’ADEME', () => {
    render(<EcranEnSavoirPlus />)
    const ademe = GESTES_CALCULES.filter((g) => !g.horsAdeme)
    const reserves = ademe.filter((g) => g.seulementEnDuelThematique).length
    expect(screen.getByText(new RegExp(`${ademe.length} gestes \\(dont ${reserves}`))).toBeInTheDocument()
  })

  it('propose d’écrire, pas seulement GitHub, pour signaler une erreur', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByText(/Une erreur, une idée \?/)).toHaveTextContent(/contact@duelcarbone\.fr/)
  })

  it('invite à suivre le projet sur GitHub', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByRole('link', { name: 'Suivre le projet sur GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/Fafou59/duel-carbone',
    )
  })

  it('garde un bouton « Retour au jeu » toujours visible en bas de l’écran', () => {
    const { container } = render(<EcranEnSavoirPlus />)
    expect(screen.getByRole('link', { name: '← Retour au jeu' })).toHaveAttribute('href', '#')
    expect(container.querySelector('.lecture__suite')).toContainElement(screen.getByRole('link', { name: '← Retour au jeu' }))
  })

  it("cite l'ADEME avec la date de l'Instantané, lue dans les données (jamais écrite à la main)", () => {
    render(<EcranEnSavoirPlus />)
    const date = formaterDate(INSTANTANE.dateImport)
    expect(screen.getByText(new RegExp(`Source : ADEME, Impact CO2, données du ${date}`))).toBeInTheDocument()
  })

  it("renvoie vers Impact CO2 et vers ses conditions de réutilisation", () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getAllByRole('link', { name: /Impact CO2/ })[0]).toHaveAttribute('href', 'https://impactco2.fr')
    expect(screen.getByRole('link', { name: /mentions légales d'Impact CO2/i })).toHaveAttribute(
      'href',
      'https://impactco2.fr/mentions-legales',
    )
    expect(screen.getByText(/non commerciale et pédagogique/)).toBeInTheDocument()
  })

  it("mentionne la galerie des exemples d'Impact CO2, en texte seul et sans parler de partenariat", () => {
    const { container } = render(<EcranEnSavoirPlus />)
    // La vue filtrée sur les associations : la vue par défaut de la galerie ne montre pas Duel Carbone.
    expect(screen.getByRole('link', { name: "galerie des exemples d'Impact CO2" })).toHaveAttribute(
      'href',
      'https://impactco2.fr/doc/exemples?activity=Association&tool=all',
    )
    const mention = screen.getByText(/Duel Carbone figure dans la/)
    expect(mention).toHaveTextContent(/\(ADEME\), catégorie Associations/)
    expect(mention).toHaveTextContent(/Ce n'est pas un partenariat/)
    // Aucun logo de l'ADEME ni d'Impact CO2 : leur reproduction demande un accord écrit.
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('définit le CO2e, comme la fenêtre de l’accueil', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByRole('heading', { name: "L'unité : le CO2e" })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Le CO2e, c’est quoi ?' })).toBeInTheDocument()
    expect(screen.getByText(/1 kg de méthane réchauffe autant qu’environ 30 kg de CO2/)).toBeInTheDocument()
  })

  it('explique le calcul Geste = Équivalent × Quantité sur un exemple tiré du catalogue', () => {
    render(<EcranEnSavoirPlus />)
    const steak = gesteCalcule('steak-boeuf')
    expect(screen.getByRole('heading', { name: /Geste = Équivalent × Quantité/ })).toBeInTheDocument()
    expect(screen.getByText(new RegExp(formaterEmpreinte(steak.empreinte)))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /fiche ADEME du bœuf/i })).toHaveAttribute('href', steak.equivalent.url)
  })

  it("donne un exemple de durée d'utilisation retenue par l'ADEME, lue dans les données", () => {
    render(<EcranEnSavoirPlus />)
    const tele = gesteCalcule('television')
    expect(screen.getByText(new RegExp(`${tele.usage?.dureeAns} ans pour une télévision`))).toBeInTheDocument()
  })

  it('explique les Duels ★ : leur fréquence (lue dans les règles) et les gestes qui leur sont réservés', () => {
    render(<EcranEnSavoirPlus />)
    const paragraphe = screen.getByText(/Le Duel du jour contient un Duel ★ 2 jours sur 3/)
    expect(paragraphe).toHaveTextContent(`jamais plus de ${REGLES.duelDuJour.joursMaxSansDuelThematique} jours de suite sans`)
    expect(paragraphe).toHaveTextContent('chacun revient à son tour')
    expect(paragraphe).toHaveTextContent(
      `En Partie libre, c'est une Partie sur deux, et jamais plus de ${REGLES.partiesMaxSansDuelThematique} Parties de suite sans`,
    )
    // Les exemples de Gestes réservés en sont vraiment.
    expect(paragraphe).toHaveTextContent("comme l'eau du robinet ou les recherches sur le web")
    // Le décompte des Gestes réservés : voir « ne compte que les Gestes construits à partir des fiches de l’ADEME ».
    expect(screen.getByText(/réservés aux Duels ★/)).toBeInTheDocument()
  })

  it('signale le streaming compté sans la construction de l’écran, et le périmètre des grands secteurs', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByText(/streaming est compté sans la construction de l'écran/)).toBeInTheDocument()
    expect(screen.getByText(/ne sont pas tous mesurés de la même façon/)).toBeInTheDocument()
  })

  it('renvoie vers le code source du jeu', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByRole('link', { name: /code source/i })).toHaveAttribute(
      'href',
      'https://github.com/Fafou59/duel-carbone',
    )
  })

  it('explique le Rang du jour et la part des réponses identiques, et leurs seuils lus dans les règles', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByText(/le Rang du jour te dit où tu te situes/)).toHaveTextContent(/à partir de 4 joueurs/)
    expect(screen.getByText(/la part des réponses identiques à la tienne : « 72/)).toHaveTextContent(/à partir de 4 réponses/)
  })

  it('explique le Duel Carbone du jour', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByText(/le Duel Carbone du jour propose la même Partie à tous les joueurs/)).toBeInTheDocument()
  })

  it('crédite le jeu d’icônes, comme le demande sa licence', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByRole('link', { name: /Fluent Emoji/ })).toHaveAttribute(
      'href',
      'https://github.com/microsoft/fluentui-emoji',
    )
    expect(screen.getByText(/Les icônes viennent de/)).toHaveTextContent(/de Microsoft, sous licence MIT/)
  })

  it('ouvre sur un sommaire qui mène à chaque partie, dans l’ordre de la page', () => {
    render(<EcranEnSavoirPlus />)
    const sommaire = screen.getByRole('navigation', { name: 'Sommaire' })
    const liens = within(sommaire).getAllByRole('link')
    const titres = screen.getAllByRole('heading', { level: 3 })
    expect(liens.map((l) => l.textContent)).toEqual(titres.map((t) => t.textContent))
    expect(liens.map((l) => l.getAttribute('href'))).toEqual(titres.map((t) => `#${t.id}`))
  })

  it('descend à la partie choisie sans changer l’adresse (l’ancre y désigne la page affichée)', () => {
    const defiler = vi.fn()
    Element.prototype.scrollIntoView = defiler
    render(<EcranEnSavoirPlus />)
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Sommaire' })).getByRole('link', { name: 'Suivre le projet' }))
    expect(window.location.hash).toBe('')
    expect(defiler).toHaveBeenCalledOnce()
    expect(screen.getByRole('heading', { name: 'Suivre le projet' })).toHaveFocus()
  })

  it('remonte au sommaire d’un bouton, à droite de « Retour au jeu »', () => {
    Element.prototype.scrollIntoView = vi.fn()
    render(<EcranEnSavoirPlus />)
    fireEvent.click(screen.getByRole('button', { name: 'Remonter au sommaire' }))
    expect(screen.getByText('Sommaire')).toHaveFocus()
  })

  it('explique comment installer le jeu et qu’il marche hors ligne, même après « Non merci »', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByRole('heading', { name: 'Jouer hors ligne : installer le jeu' })).toBeInTheDocument()
    expect(screen.getByText(/Il fonctionne aussi hors ligne/)).toBeInTheDocument()
  })

  it('précise que les chiffres valent pour la France (mix électrique français)', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByText(/mix électrique moyen\s+français/)).toBeInTheDocument()
  })

  it('suit l’ordre décidé : le jeu, puis ses chiffres, ce qu’il a coûté et le projet', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Pourquoi Duel Carbone ?',
      'Les règles du jeu',
      'Les Conseils de fin de Partie',
      "D'où viennent les chiffres",
      "L'unité : le CO2e",
      'Le calcul : Geste = Équivalent × Quantité',
      "Les objets : la durée d'utilisation retenue par l'ADEME",
      "Les réglages : ceux de l'ADEME, par défaut",
      'Jouer hors ligne : installer le jeu',
      'L’empreinte de ce jeu',
      'Suivre le projet',
    ])
  })

  it('ne parle plus de vie privée ni de mentions légales, mais renvoie vers leur page', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.queryByRole('heading', { name: 'Ta vie privée' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Éditeur et directeur de la publication/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ce que le jeu garde de toi, et les mentions légales →' })).toHaveAttribute(
      'href',
      '#mentions-legales',
    )
  })
})
