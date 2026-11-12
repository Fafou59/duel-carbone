import { afterEach, describe, expect, it, vi } from 'vitest'
import { chargerMesure, estAdresseMesuree, mesurer, trancheDeDuree, type Environnement } from './mesure.ts'

const PRODUCTION = 'duelcarbone.fr'
/** L'ancienne adresse publique chez Cloudflare, et la base des aperçus des branches. */
const WORKERS = 'duel-carbone.fabien-lesage.workers.dev'
const minutes = (n: number) => n * 60_000

/** Un faux navigateur : son adresse, et GoatCounter s'il est chargé. */
function environnement(options: Partial<Environnement> = {}): Environnement {
  return { hote: PRODUCTION, goatcounter: { count: vi.fn() }, ...options }
}

describe('Les adresses où l’on mesure l’audience', () => {
  it('compte sur duelcarbone.fr, avec ou sans www', () => {
    expect(estAdresseMesuree(PRODUCTION)).toBe(true)
    expect(estAdresseMesuree('www.duelcarbone.fr')).toBe(true)
  })

  it('compte encore sur l’ancienne adresse, celle des premiers liens partagés et des applications déjà installées', () => {
    expect(estAdresseMesuree(WORKERS)).toBe(true)
  })

  it('ne compte rien sur un autre sous-domaine', () => {
    expect(estAdresseMesuree('test.duelcarbone.fr')).toBe(false)
  })

  it('ne compte rien en local', () => {
    expect(estAdresseMesuree('localhost')).toBe(false)
    expect(estAdresseMesuree('127.0.0.1')).toBe(false)
  })

  it('ne compte rien depuis l’aperçu d’une branche', () => {
    expect(estAdresseMesuree(`feat-17-goatcounter-${WORKERS}`)).toBe(false)
    expect(estAdresseMesuree(`8a3f2c1d-${WORKERS}`)).toBe(false)
  })
})

describe('La durée d’une Partie, en tranches de 30 secondes', () => {
  it.each([
    [0, '0m00-0m30'],
    [minutes(0.5) - 1, '0m00-0m30'],
    [minutes(0.5), '0m30-1m00'],
    [minutes(2.5), '2m30-3m00'],
    [minutes(3) - 1, '2m30-3m00'],
    [minutes(10) - 1, '9m30-10m00'],
    [minutes(10), '10m00-et-plus'],
    [minutes(90), '10m00-et-plus'],
  ])('%i ms → %s', (duree, tranche) => {
    expect(trancheDeDuree(duree)).toBe(tranche)
  })
})

describe('Envoyer un événement', () => {
  it('le transmet à GoatCounter, comme un événement (pas une page vue)', () => {
    const env = environnement()
    mesurer('partie_lancee/libre', env)
    expect(env.goatcounter?.count).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ path: 'partie_lancee/libre', event: true }),
    )
  })

  it('n’envoie rien en dehors de l’adresse publique, même si GoatCounter est là', () => {
    const env = environnement({ hote: 'localhost' })
    mesurer('partage', env)
    expect(env.goatcounter?.count).not.toHaveBeenCalled()
  })

  it('ne fait rien si GoatCounter n’est pas chargé (bloqueur de publicité, réseau lent)', () => {
    expect(() => mesurer('rejouer/libre', environnement({ goatcounter: undefined }))).not.toThrow()
  })

  it('ne casse jamais le jeu, même si GoatCounter plante', () => {
    const env = environnement({
      goatcounter: {
        count: () => {
          throw new Error('panne')
        },
      },
    })
    expect(() => mesurer('partage', env)).not.toThrow()
  })
})

describe('Charger GoatCounter', () => {
  const script = () => document.head.querySelector('script[data-goatcounter]')
  afterEach(() => script()?.remove())

  it('ajoute son script sur l’adresse publique, en https', () => {
    chargerMesure(PRODUCTION)
    expect(script()).toHaveAttribute('data-goatcounter', 'https://fafou59.goatcounter.com/count')
    expect(script()).toHaveAttribute('src', 'https://gc.zgo.at/count.js')
    expect(script()).toHaveProperty('async', true)
  })

  it('ne le charge pas en local, ni sur l’aperçu d’une branche : aucune demande ne part', () => {
    chargerMesure('localhost')
    chargerMesure(`feat-17-goatcounter-${WORKERS}`)
    expect(script()).toBeNull()
  })
})
