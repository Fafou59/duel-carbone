import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
    expect(estimation).toHaveTextContent(/regarder l'intégrale de Friends \(en streaming\)/)
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
    expect(container.querySelector('.savoir__suite')).toContainElement(screen.getByRole('link', { name: '← Retour au jeu' }))
  })

  it("cite l'ADEME avec la date de l'Instantané, lue dans les données (jamais écrite à la main)", () => {
    render(<EcranEnSavoirPlus />)
    const date = formaterDate(INSTANTANE.dateImport)
    expect(screen.getByText(new RegExp(`Source : ADEME, Impact CO2, données du ${date}`))).toBeInTheDocument()
  })

  it("renvoie vers Impact CO2 et vers ses conditions de réutilisation", () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getAllByRole('link', { name: /Impact CO2/ })[0]).toHaveAttribute('href', 'https://impactco2.fr')
    expect(screen.getByRole('link', { name: /mentions légales/i })).toHaveAttribute(
      'href',
      'https://impactco2.fr/mentions-legales',
    )
    expect(screen.getByText(/non commerciale et pédagogique/)).toBeInTheDocument()
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
    expect(screen.getByText(/Geste = Équivalent × Quantité/)).toBeInTheDocument()
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
    expect(screen.getByText(/Une Partie sur deux contient un Duel ★/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`jamais plus de ${REGLES.partiesMaxSansDuelThematique} Parties de suite sans`))).toBeInTheDocument()
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

  it('explique le Duel Carbone du jour et ce qui en reste sur l’appareil', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByText(/le Duel Carbone du jour propose la même Partie à tous les joueurs/)).toBeInTheDocument()
    expect(screen.getByText(/ta Partie du jour \(pour la reprendre ou revoir ton résultat\), ta série/)).toBeInTheDocument()
  })

  it('dit ce que contient le texte partagé, et ce qu’il ne contient pas', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByText(/jamais le nom des gestes/)).toBeInTheDocument()
  })

  it('dit que le jeu garde une copie de ses fichiers pour marcher sans réseau', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByText(/marche sans réseau/)).toBeInTheDocument()
  })

  it('nomme l’hébergeur, qui reçoit les demandes du navigateur comme tout hébergeur', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByText(/Le jeu est hébergé par Cloudflare/)).toHaveTextContent(/adresse IP/)
  })

  it('explique la mesure d’audience : GoatCounter, sans cookie, des chiffres agrégés', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByRole('link', { name: 'GoatCounter' })).toHaveAttribute('href', 'https://www.goatcounter.com')
    const paragraphe = screen.getByText(/Pour savoir si le jeu plaît/)
    expect(paragraphe).toHaveTextContent(/sans cookie/)
    expect(paragraphe).toHaveTextContent(/chiffres agrégés/)
    expect(paragraphe).toHaveTextContent(/ni ton score ni tes réponses/)
  })

  it('crédite le jeu d’icônes, comme le demande sa licence', () => {
    render(<EcranEnSavoirPlus />)
    expect(screen.getByRole('link', { name: /Fluent Emoji/ })).toHaveAttribute(
      'href',
      'https://github.com/microsoft/fluentui-emoji',
    )
    expect(screen.getByText(/Les icônes viennent de/)).toHaveTextContent(/de Microsoft, sous licence MIT/)
  })
})
