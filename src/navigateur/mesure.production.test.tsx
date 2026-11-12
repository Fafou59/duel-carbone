/**
 * Ce que le jeu envoie à GoatCounter, joué « pour de vrai » : la page de test se fait passer
 * pour l'adresse publique du jeu, et un faux GoatCounter note chaque événement reçu.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GESTES_CALCULES } from '../donnees/index.ts'
import { moinsEmetteur, plusEmetteur } from '../domaine/duel.ts'
import { genererPartie } from '../domaine/generateur.ts'
import { hasardReproductible } from '../domaine/hasard.ts'
import App from '../App.tsx'
import { EcranPartie } from '../ecrans/EcranPartie.tsx'
import { partager } from './partager.ts'

// Le navigateur simulé par Vitest (jsdom), qui permet de changer l'adresse de la page.
declare const jsdom: { reconfigure(options: { url: string }): void }

const DUELS = genererPartie({ gestes: GESTES_CALCULES, hasard: hasardReproductible(3) })
const minutes = (n: number) => n * 60_000

/** Joue un Duel comme un joueur : clique sur une carte, puis sur le bouton de suite. */
const jouerDuel = (index: number) => {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(plusEmetteur(DUELS[index]).titre) }))
  fireEvent.click(screen.getByRole('button', { name: index === 9 ? 'Voir mon score' : 'Duel suivant →' }))
}
const jouerDuels = (de: number, a: number) => {
  for (let i = de; i < a; i++) jouerDuel(i)
}

const count = vi.fn()
/** Les événements reçus par GoatCounter, dans l'ordre. */
const recus = () => count.mock.calls.map(([vars]) => vars.path)

beforeAll(() => jsdom.reconfigure({ url: 'https://duelcarbone.fr/' }))
afterAll(() => jsdom.reconfigure({ url: 'http://localhost:3000/' }))
beforeEach(() => {
  count.mockClear()
  window.goatcounter = { count }
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(0)
})
afterEach(() => {
  delete window.goatcounter
  vi.useRealTimers()
})

describe('La mesure d’audience d’une Partie', () => {
  it('compte une Partie libre lancée dès l’affichage du premier Duel', () => {
    render(<EcranPartie duels={DUELS} onRejouer={() => {}} />)
    expect(recus()).toEqual(['partie_lancee/libre'])
  })

  it('compte la Partie terminée, avec sa durée en tranche, à l’écran de fin', () => {
    render(<EcranPartie duels={DUELS} onRejouer={() => {}} />)
    jouerDuels(0, 9)
    vi.setSystemTime(minutes(3))
    jouerDuel(9)
    expect(recus()).toEqual(['partie_lancee/libre', 'partie_terminee/libre', 'duree_partie/3m00-3m30'])
  })

  it('distingue la Partie du jour de la Partie libre', () => {
    render(<EcranPartie mode="jour" duels={DUELS} onRejouer={() => {}} />)
    vi.setSystemTime(minutes(12))
    jouerDuels(0, 10)
    expect(recus()).toEqual(['partie_lancee/jour', 'partie_terminee/jour', 'duree_partie/10m00-et-plus'])
  })

  it('ne relance pas une Partie du jour reprise, et n’envoie pas sa durée (incomplète)', () => {
    const dejaDonnees = DUELS.slice(0, 4).map((duel) => moinsEmetteur(duel).id)
    render(<EcranPartie mode="jour" duels={DUELS} reponsesInitiales={dejaDonnees} onRejouer={() => {}} />)
    jouerDuels(4, 10)
    expect(recus()).toEqual(['partie_terminee/jour'])
  })

  it('n’envoie rien quand on revoit une Partie du jour déjà terminée', () => {
    const toutes = DUELS.map((duel) => plusEmetteur(duel).id)
    render(<EcranPartie mode="jour" duels={DUELS} reponsesInitiales={toutes} onRejouer={() => {}} />)
    expect(screen.getByRole('heading', { name: /Partie terminée|Duel Carbone du jour/ })).toBeInTheDocument()
    expect(recus()).toEqual([])
  })

  it('compte « Rejouer » depuis l’écran de fin, puis relance la Partie', () => {
    const onRejouer = vi.fn()
    render(<EcranPartie duels={DUELS} onRejouer={onRejouer} />)
    jouerDuels(0, 10)
    count.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Rejouer' }))
    expect(recus()).toEqual(['rejouer/libre'])
    expect(onRejouer).toHaveBeenCalledOnce()
  })
})

describe('La mesure d’audience depuis l’accueil', () => {
  // L'accueil attend le calendrier (chargé à part) : on garde la vraie horloge pour l'attendre.
  beforeEach(() => vi.useRealTimers())

  it('compte une Partie libre lancée depuis l’accueil', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Partie libre' }))
    expect(recus()).toEqual(['partie_lancee/libre'])
  })

  it('compte une Partie du jour lancée depuis l’accueil', async () => {
    render(<App aujourdhui="2026-11-20" />)
    const bouton = await screen.findByRole('button', { name: /Duel du jour n° 7/ })
    await waitFor(() => expect(bouton).toBeEnabled())
    fireEvent.click(bouton)
    expect(recus()).toEqual(['partie_lancee/jour'])
  })
})

describe('La mesure d’audience du partage', () => {
  const TEXTE = "J'ai fait 8/10 à Duel Carbone"

  it('compte un partage par le menu du téléphone', async () => {
    await partager(TEXTE, { tactile: true, share: async () => {} })
    expect(recus()).toEqual(['partage'])
  })

  it('compte un score copié', async () => {
    await partager(TEXTE, { tactile: false, writeText: async () => {} })
    expect(recus()).toEqual(['partage'])
  })

  it('ne compte ni un partage annulé, ni un échec', async () => {
    const annulation = Object.assign(new Error('AbortError'), { name: 'AbortError' })
    await partager(TEXTE, { tactile: true, share: async () => Promise.reject(annulation) })
    await partager(TEXTE, { tactile: false })
    expect(recus()).toEqual([])
  })
})
