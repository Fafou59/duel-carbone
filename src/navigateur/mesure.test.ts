import { afterEach, describe, expect, it, vi } from 'vitest'
import { chargerMesure, compterLaVisite, ecouterLesPlantages, effacerProvenance, estAdresseMesuree, mesurer, serieMesuree, trancheDeDuree, type Environnement } from './mesure.ts'

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

describe('La série en cours, telle qu’envoyée', () => {
  it.each([
    [1, '1'],
    [2, '2'],
    [7, '7'],
    [29, '29'],
    [30, '30+'],
    [100, '30+'],
  ])('%i jour(s) d’affilée → %s', (jours, valeur) => {
    expect(serieMesuree(jours)).toBe(valeur)
  })

  it('compte au moins le Duel du jour qu’on lance', () => {
    expect(serieMesuree(0)).toBe('1')
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

describe('Compter les plantages', () => {
  const evenement = (nom: string) => ({ path: nom, title: nom, event: true })

  it('compte une erreur de script et une promesse rejetée, une seule fois chacune par visite', () => {
    const page = new EventTarget()
    const env = environnement()
    ecouterLesPlantages(page, () => env)
    page.dispatchEvent(new Event('error'))
    page.dispatchEvent(new Event('error'))
    page.dispatchEvent(new Event('unhandledrejection'))
    expect(env.goatcounter?.count).toHaveBeenCalledTimes(2)
    expect(env.goatcounter?.count).toHaveBeenNthCalledWith(1, evenement('erreur/script'))
    expect(env.goatcounter?.count).toHaveBeenNthCalledWith(2, evenement('erreur/promesse'))
  })

  it('n’envoie que le type de plantage, jamais son message (qui pourrait contenir autre chose)', () => {
    const page = new EventTarget()
    const env = environnement()
    ecouterLesPlantages(page, () => env)
    page.dispatchEvent(new ErrorEvent('error', { message: 'secret', filename: 'https://exemple/app.js' }))
    expect(JSON.stringify(vi.mocked(env.goatcounter!.count).mock.calls)).not.toMatch(/secret|exemple/)
  })

  it('ne compte rien en dehors de l’adresse publique', () => {
    const page = new EventTarget()
    const env = environnement({ hote: 'localhost' })
    ecouterLesPlantages(page, () => env)
    page.dispatchEvent(new Event('error'))
    expect(env.goatcounter?.count).not.toHaveBeenCalled()
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

  it('lui demande de ne pas compter la visite tout seul : c’est le jeu qui la compte, puis nettoie l’adresse', () => {
    chargerMesure(PRODUCTION)
    expect(JSON.parse(script()?.getAttribute('data-goatcounter-settings') ?? '{}')).toEqual({ no_onload: true })
  })
})

describe('L’arrivée par le QR code (?ref=qr-code), comptée une fois puis effacée de l’adresse', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
    delete window.goatcounter
    document.head.querySelector('script[data-goatcounter]')?.remove()
  })

  /** Une fausse page, visible ou non, qui retient qui attend qu'elle devienne visible. */
  function page(visibilityState: DocumentVisibilityState) {
    const ecouteurs = new Set<() => void>()
    return {
      visibilityState,
      addEventListener: (_: string, f: () => void) => ecouteurs.add(f),
      removeEventListener: (_: string, f: () => void) => ecouteurs.delete(f),
      devenirVisible() {
        this.visibilityState = 'visible'
        for (const f of [...ecouteurs]) f()
      },
      ecouteurs,
    }
  }

  it('GoatCounter compte la visite avec sa provenance, puis l’adresse redevient propre (sans recharger)', () => {
    window.history.replaceState(null, '', '/?ref=qr-code')
    const adresseLueParGoatCounter: string[] = []
    const env = environnement({ goatcounter: { count: vi.fn(() => adresseLueParGoatCounter.push(window.location.search)) } })

    compterLaVisite(page('visible'), () => env)

    expect(env.goatcounter?.count).toHaveBeenCalledTimes(1)
    expect(adresseLueParGoatCounter).toEqual(['?ref=qr-code'])
    expect(window.location.pathname + window.location.search).toBe('/')
  })

  it('attend que la page soit visible pour compter (une page préparée en arrière-plan n’est pas une visite)', () => {
    window.history.replaceState(null, '', '/?ref=qr-code')
    const env = environnement()
    const cachee = page('hidden')

    compterLaVisite(cachee, () => env)
    expect(env.goatcounter?.count).not.toHaveBeenCalled()
    expect(window.location.search).toBe('?ref=qr-code')

    cachee.devenirVisible()
    expect(env.goatcounter?.count).toHaveBeenCalledTimes(1)
    expect(window.location.search).toBe('')
    expect(cachee.ecouteurs.size).toBe(0)
  })

  it('nettoie l’adresse même si GoatCounter plante', () => {
    window.history.replaceState(null, '', '/?ref=qr-code')
    const env = environnement({ goatcounter: { count: vi.fn(() => { throw new Error('panne') }) } })
    compterLaVisite(page('visible'), () => env)
    expect(window.location.search).toBe('')
  })

  it('le script chargé, compte la visite ; bloqué, nettoie quand même l’adresse', () => {
    window.history.replaceState(null, '', '/?ref=qr-code')
    const count = vi.fn()
    window.goatcounter = { count }
    chargerMesure(PRODUCTION)
    document.head.querySelector('script[data-goatcounter]')?.dispatchEvent(new Event('load'))
    // jsdom fait comme si la page était visible ou non selon sa version : seule l'adresse finale compte ici.
    if (document.visibilityState === 'visible') expect(count).toHaveBeenCalledTimes(1)

    document.head.querySelector('script[data-goatcounter]')?.remove()
    window.history.replaceState(null, '', '/?ref=qr-code')
    chargerMesure(PRODUCTION)
    document.head.querySelector('script[data-goatcounter]')?.dispatchEvent(new Event('error'))
    expect(window.location.search).toBe('')
  })

  it('en local ou sur un aperçu, rien n’est compté : l’adresse est nettoyée tout de suite', () => {
    window.history.replaceState(null, '', '/?ref=qr-code')
    chargerMesure('localhost')
    expect(window.location.search).toBe('')
  })

  it('garde le reste de l’adresse : la page demandée et ses autres réglages', () => {
    window.history.replaceState(null, '', '/?ref=qr-code&autre=1#en-savoir-plus')
    effacerProvenance()
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/?autre=1#en-savoir-plus')
  })

  it('ne touche pas une adresse sans provenance', () => {
    window.history.replaceState({ garde: true }, '', '/#en-savoir-plus')
    const remplacer = vi.spyOn(window.history, 'replaceState')
    effacerProvenance()
    expect(remplacer).not.toHaveBeenCalled()
    remplacer.mockRestore()
  })
})
