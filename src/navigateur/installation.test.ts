import { describe, expect, it, vi } from 'vitest'
import {
  capturerInvitationNative,
  ecarterInvitation,
  invitationCapturee,
  invitationEcartee,
  situationInstallation,
  type InvitationNative,
} from './installation.ts'

const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/142.0 Mobile Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 Version/26.1 Mobile/15E148 Safari/604.1'
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.1 Safari/605.1.15'
const appareil = (userAgent: string, options: { standalone?: boolean; pointsTactiles?: number } = {}) => ({
  userAgent,
  standalone: options.standalone ?? false,
  pointsTactiles: options.pointsTactiles ?? 0,
})
const invitation = () => Object.assign(new Event('beforeinstallprompt'), {
  prompt: vi.fn(async () => undefined),
  userChoice: Promise.resolve({ outcome: 'accepted' as const }),
}) as InvitationNative

describe('Ce que le navigateur permet pour installer le jeu', () => {
  it('rien, si le jeu est déjà installé (ouvert depuis l’écran d’accueil)', () => {
    expect(situationInstallation(appareil(ANDROID, { standalone: true }), invitation())).toBe('installe')
    expect(situationInstallation(appareil(IPHONE, { standalone: true }), null)).toBe('installe')
  })

  it('un bouton, si le navigateur propose sa fenêtre d’installation (Chrome, Edge, Samsung Internet…)', () => {
    expect(situationInstallation(appareil(ANDROID), invitation())).toBe('bouton')
  })

  it('une explication sur iPhone et iPad, où Safari n’a pas de fenêtre d’installation', () => {
    expect(situationInstallation(appareil(IPHONE), null)).toBe('ios')
    // Un iPad se présente comme un Mac, mais il est tactile.
    expect(situationInstallation(appareil(IPAD, { pointsTactiles: 5 }), null)).toBe('ios')
  })

  it('les favoris, ailleurs (navigateur sans installation, ou fenêtre pas encore proposée)', () => {
    expect(situationInstallation(appareil(ANDROID), null)).toBe('favori')
    expect(situationInstallation(appareil(IPAD), null)).toBe('favori')
  })
})

describe('La fenêtre d’installation du navigateur', () => {
  it('est mise de côté quand le navigateur la propose, pour l’ouvrir au bon moment', () => {
    const page = new EventTarget()
    capturerInvitationNative(page)
    const evenement = invitation()
    const empecher = vi.spyOn(evenement, 'preventDefault')
    page.dispatchEvent(evenement)
    expect(empecher).toHaveBeenCalled()
    expect(invitationCapturee()).toBe(evenement)
  })

  it('est oubliée une fois le jeu installé', () => {
    const page = new EventTarget()
    capturerInvitationNative(page)
    page.dispatchEvent(invitation())
    page.dispatchEvent(new Event('appinstalled'))
    expect(invitationCapturee()).toBeNull()
  })
})

describe('Le refus de l’invitation, gardé sur l’appareil', () => {
  const stockage = () => {
    const donnees = new Map<string, string>()
    return { getItem: (cle: string) => donnees.get(cle) ?? null, setItem: (cle: string, valeur: string) => void donnees.set(cle, valeur) }
  }

  it('est retenu : on ne repropose plus', () => {
    const s = stockage()
    expect(invitationEcartee(s)).toBe(false)
    ecarterInvitation(s)
    expect(invitationEcartee(s)).toBe(true)
  })

  it('ne casse rien sans stockage, ou avec un stockage qui refuse', () => {
    expect(invitationEcartee(null)).toBe(false)
    const casse = { getItem: () => { throw new Error('non') }, setItem: () => { throw new Error('non') } }
    expect(() => ecarterInvitation(casse)).not.toThrow()
    expect(invitationEcartee(casse)).toBe(false)
  })
})
