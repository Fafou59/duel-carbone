import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GESTES_CALCULES, gesteCalcule, INSTANTANE } from '../donnees/index.ts'
import { formaterDate, formaterEmpreinte } from '../domaine/format.ts'
import { REGLES } from '../domaine/regles.ts'
import { EcranSources } from './EcranSources.tsx'

describe('Page Sources et méthode', () => {
  it("cite l'ADEME avec la date de l'Instantané, lue dans les données (jamais écrite à la main)", () => {
    render(<EcranSources />)
    const date = formaterDate(INSTANTANE.dateImport)
    expect(screen.getByText(new RegExp(`Source : ADEME, Impact CO2, données du ${date}`))).toBeInTheDocument()
  })

  it("renvoie vers Impact CO2 et vers ses conditions de réutilisation", () => {
    render(<EcranSources />)
    expect(screen.getAllByRole('link', { name: /Impact CO2/ })[0]).toHaveAttribute('href', 'https://impactco2.fr')
    expect(screen.getByRole('link', { name: /mentions légales/i })).toHaveAttribute(
      'href',
      'https://impactco2.fr/mentions-legales',
    )
    expect(screen.getByText(/non commerciale et pédagogique/)).toBeInTheDocument()
  })

  it('explique le calcul Geste = Équivalent × Quantité sur un exemple tiré du catalogue', () => {
    render(<EcranSources />)
    const steak = gesteCalcule('steak-boeuf')
    expect(screen.getByText(/Geste = Équivalent × Quantité/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(formaterEmpreinte(steak.empreinte)))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /fiche ADEME du bœuf/i })).toHaveAttribute('href', steak.equivalent.url)
  })

  it("donne un exemple de durée d'utilisation retenue par l'ADEME, lue dans les données", () => {
    render(<EcranSources />)
    const tele = gesteCalcule('television')
    expect(screen.getByText(new RegExp(`${tele.usage?.dureeAns} ans pour une télévision`))).toBeInTheDocument()
  })

  it('explique les Duels ★ : leur fréquence (lue dans les règles) et les gestes qui leur sont réservés', () => {
    render(<EcranSources />)
    expect(screen.getByText(/Une Partie sur deux contient un Duel ★/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`jamais plus de ${REGLES.partiesMaxSansDuelThematique} Parties de suite sans`))).toBeInTheDocument()
    const reserves = GESTES_CALCULES.filter((g) => g.seulementEnDuelThematique).length
    expect(screen.getByText(new RegExp(`dont ${reserves} réservés aux Duels ★`))).toBeInTheDocument()
  })

  it('signale le streaming compté sans la construction de l’écran, et le périmètre des grands secteurs', () => {
    render(<EcranSources />)
    expect(screen.getByText(/streaming est compté sans la construction de l'écran/)).toBeInTheDocument()
    expect(screen.getByText(/ne sont pas tous mesurés de la même façon/)).toBeInTheDocument()
  })

  it('renvoie vers le code source du jeu', () => {
    render(<EcranSources />)
    expect(screen.getByRole('link', { name: /code source/i })).toHaveAttribute(
      'href',
      'https://github.com/Fafou59/duel-carbone',
    )
  })
})
