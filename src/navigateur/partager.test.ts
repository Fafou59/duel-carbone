import { describe, expect, it, vi } from 'vitest'
import { partager, partagerImage, peutPartagerUnFichier, type Environnement, type EnvironnementImage } from './partager.ts'

const TEXTE = "J'ai fait 8/10 à Duel Carbone"

/** Un faux navigateur : on choisit ce qu'il sait faire et comment il réagit. */
function environnement(options: Partial<Environnement> = {}): Environnement {
  return { tactile: false, share: undefined, writeText: vi.fn(async () => {}), ...options }
}

const erreur = (name: string) => Object.assign(new Error(name), { name })

describe('Partager un score', () => {
  it('sur téléphone, ouvre le menu de partage natif', async () => {
    const share = vi.fn(async () => {})
    const env = environnement({ tactile: true, share })
    expect(await partager(TEXTE, env)).toBe('partage')
    expect(share).toHaveBeenCalledWith({ text: TEXTE })
    expect(env.writeText).not.toHaveBeenCalled()
  })

  it('ne signale aucune erreur si le joueur annule le partage', async () => {
    const env = environnement({ tactile: true, share: vi.fn(async () => Promise.reject(erreur('AbortError'))) })
    expect(await partager(TEXTE, env)).toBe('annule')
    expect(env.writeText).not.toHaveBeenCalled()
  })

  it('copie le texte si le menu de partage échoue pour une autre raison', async () => {
    const env = environnement({ tactile: true, share: vi.fn(async () => Promise.reject(erreur('NotAllowedError'))) })
    expect(await partager(TEXTE, env)).toBe('copie')
    expect(env.writeText).toHaveBeenCalledWith(TEXTE)
  })

  it('sur ordinateur, copie le texte même si le menu de partage existe', async () => {
    const share = vi.fn(async () => {})
    const env = environnement({ tactile: false, share })
    expect(await partager(TEXTE, env)).toBe('copie')
    expect(share).not.toHaveBeenCalled()
    expect(env.writeText).toHaveBeenCalledWith(TEXTE)
  })

  it('sur un téléphone sans menu de partage, copie le texte', async () => {
    const env = environnement({ tactile: true })
    expect(await partager(TEXTE, env)).toBe('copie')
  })

  it('signale un échec si la copie est impossible', async () => {
    const env = environnement({ writeText: vi.fn(async () => Promise.reject(erreur('NotAllowedError'))) })
    expect(await partager(TEXTE, env)).toBe('echec')
  })

  it('signale un échec si le presse-papiers n’existe pas', async () => {
    const env = environnement({ writeText: undefined })
    expect(await partager(TEXTE, env)).toBe('echec')
  })
})

describe('Partager le score en image', () => {
  const IMAGE = new Blob(['png'], { type: 'image/png' })
  const NOM = 'duel-carbone-du-jour-12.png'

  /** Un faux téléphone qui sait partager des fichiers (Chrome sur Android, Safari sur iPhone). */
  function telephone(options: Partial<EnvironnementImage> = {}): EnvironnementImage {
    return {
      tactile: true,
      share: vi.fn(async () => {}),
      canShare: vi.fn((donnees?: ShareData) => (donnees?.files?.length ?? 0) > 0),
      enregistrer: vi.fn(),
      ...options,
    }
  }

  it('sait dire si le menu de partage acceptera un fichier', () => {
    expect(peutPartagerUnFichier(telephone())).toBe(true)
    expect(peutPartagerUnFichier(telephone({ canShare: undefined }))).toBe(false)
    expect(peutPartagerUnFichier(telephone({ canShare: () => false }))).toBe(false)
    expect(peutPartagerUnFichier(telephone({ tactile: false }))).toBe(false)
  })

  it('sur téléphone, ouvre le menu de partage avec l’image seule, sous son nom', async () => {
    const env = telephone()
    expect(await partagerImage(Promise.resolve(IMAGE), NOM, env)).toBe('partage')
    const [donnees] = vi.mocked(env.share!).mock.calls[0]
    // Pas de texte joint : dans une Story il serait perdu, et certaines applications traiteraient le partage comme du texte.
    expect(Object.keys(donnees)).toEqual(['files'])
    expect(donnees.files![0]).toMatchObject({ name: NOM, type: 'image/png' })
    expect(env.enregistrer).not.toHaveBeenCalled()
  })

  it('ne fait rien si le joueur ferme le menu', async () => {
    const env = telephone({ share: vi.fn(async () => Promise.reject(erreur('AbortError'))) })
    expect(await partagerImage(Promise.resolve(IMAGE), NOM, env)).toBe('annule')
    expect(env.enregistrer).not.toHaveBeenCalled()
  })

  it('enregistre l’image si le menu échoue pour une autre raison', async () => {
    const env = telephone({ share: vi.fn(async () => Promise.reject(erreur('NotAllowedError'))) })
    expect(await partagerImage(Promise.resolve(IMAGE), NOM, env)).toBe('enregistre')
    expect(env.enregistrer).toHaveBeenCalledWith(expect.objectContaining({ name: NOM }))
  })

  it('sur ordinateur ou sans partage de fichier, enregistre l’image', async () => {
    for (const env of [telephone({ tactile: false }), telephone({ canShare: undefined })]) {
      expect(await partagerImage(Promise.resolve(IMAGE), NOM, env)).toBe('enregistre')
      expect(env.share).not.toHaveBeenCalled()
      expect(env.enregistrer).toHaveBeenCalledOnce()
    }
  })

  it('signale un échec si l’image n’a pas pu être dessinée', async () => {
    const env = telephone()
    expect(await partagerImage(Promise.reject(new Error('pas de Canvas')), NOM, env)).toBe('echec')
    expect(env.share).not.toHaveBeenCalled()
  })
})
