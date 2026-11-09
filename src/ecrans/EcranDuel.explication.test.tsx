import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gesteCalcule } from '../donnees/index.ts'
import { DuelDeTest } from '../test/DuelDeTest.tsx'
import { DELAI_DEFILEMENT_MS } from './EcranDuel.tsx'

const duel = (a: string, b: string) => ({ a: gesteCalcule(a), b: gesteCalcule(b) })
const choisir = (nom: RegExp) => fireEvent.click(screen.getByRole('button', { name: nom }))
const tableau = () => screen.getByRole('table', { name: /D'où viennent ces émissions/ })

describe("Explication après un Duel : le tableau comparatif", () => {
  it("n'apparaît qu'après le choix", () => {
    render(<DuelDeTest duel={duel('steak-boeuf', 'avocat')} />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    choisir(/steak/)
    expect(tableau()).toBeInTheDocument()
  })

  it('a une colonne par Geste et une ligne par étape, lisibles par un lecteur d’écran', () => {
    render(<DuelDeTest duel={duel('steak-boeuf', 'avocat')} />)
    choisir(/steak/)
    expect(within(tableau()).getByRole('columnheader', { name: /Manger un steak de bœuf/ })).toBeInTheDocument()
    expect(within(tableau()).getByRole('columnheader', { name: /Manger un avocat/ })).toBeInTheDocument()
    const agriculture = within(tableau()).getByRole('row', { name: /Agriculture/ })
    expect(within(agriculture).getByText('3,3 kg')).toBeInTheDocument()
    expect(within(agriculture).getByText('176 g')).toBeInTheDocument()
  })

  it('termine par une ligne Total', () => {
    render(<DuelDeTest duel={duel('steak-boeuf', 'avocat')} />)
    choisir(/steak/)
    const total = within(tableau()).getByRole('row', { name: /Total/ })
    expect(within(total).getByText('3,4 kg')).toBeInTheDocument()
    expect(within(total).getByText('311 g')).toBeInTheDocument()
  })

  it("signale le recyclage d'un objet : ligne précisée et note sous le tableau", () => {
    render(<DuelDeTest duel={duel('micro-ondes', 'lave-linge')} />)
    choisir(/lave-linge/)
    const finDeVie = within(tableau()).getByRole('row', { name: /Fin de vie/ })
    expect(within(finDeVie).getByText('dont recyclage')).toBeInTheDocument()
    expect(within(finDeVie).getByText('−44,6 kg')).toBeInTheDocument()
    expect(screen.getByText(/émissions évitées par le recyclage sont déjà déduites du total/)).toBeInTheDocument()
  })

  it("dit clairement quand l'ADEME ne publie pas le détail d'un Geste", () => {
    render(<DuelDeTest duel={duel('chauffage-gaz', 'smartphone')} />)
    choisir(/gaz/)
    expect(screen.getByText(/ne publie pas le détail pour : se chauffer 1 an au gaz/i)).toBeInTheDocument()
    expect(within(within(tableau()).getByRole('row', { name: /Total/ })).getByText('713 kg')).toBeInTheDocument()
  })

  it('renvoie vers les fiches ADEME des deux Gestes, dans un nouvel onglet', () => {
    render(<DuelDeTest duel={duel('steak-boeuf', 'avocat')} />)
    choisir(/steak/)
    const lien = screen.getByRole('link', { name: /Manger un steak de bœuf.*nouvel onglet/ })
    expect(lien).toHaveAttribute('href', 'https://impactco2.fr/outils/alimentation/boeuf')
    expect(lien).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: /Manger un avocat/ })).toHaveAttribute(
      'href',
      'https://impactco2.fr/outils/fruitsetlegumes/avocat',
    )
  })
})

describe("Explication après un Duel : le défilement automatique", () => {
  let defiler: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    defiler = vi.fn()
    Element.prototype.scrollIntoView = defiler as unknown as Element['scrollIntoView']
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it(`attend ${DELAI_DEFILEMENT_MS} ms puis descend en douceur vers l'explication`, () => {
    render(<DuelDeTest duel={duel('steak-boeuf', 'avocat')} />)
    choisir(/steak/)
    act(() => vi.advanceTimersByTime(DELAI_DEFILEMENT_MS - 1))
    expect(defiler).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(defiler).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('descend sans animation si le joueur a demandé à réduire les animations', () => {
    vi.stubGlobal('matchMedia', (requete: string) => ({ matches: requete.includes('reduce') }))
    render(<DuelDeTest duel={duel('steak-boeuf', 'avocat')} />)
    choisir(/steak/)
    act(() => vi.advanceTimersByTime(DELAI_DEFILEMENT_MS))
    expect(defiler).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('annule le défilement si le joueur rejoue avant la fin du délai', () => {
    render(<DuelDeTest duel={duel('steak-boeuf', 'avocat')} />)
    choisir(/steak/)
    fireEvent.click(screen.getByRole('button', { name: 'Rejouer ce Duel' }))
    act(() => vi.advanceTimersByTime(DELAI_DEFILEMENT_MS))
    expect(defiler).not.toHaveBeenCalled()
  })
})
