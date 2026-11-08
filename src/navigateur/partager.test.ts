import { describe, expect, it, vi } from 'vitest'
import { partager, type Environnement } from './partager.ts'

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
