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
const FIREFOX_ANDROID = 'Mozilla/5.0 (Android 15; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0'
const KAIOS = 'Mozilla/5.0 (Mobile; LYF/F300B/LYF-F300B-001-01-15-130718-i;Android; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5'
const KAIOS_SANS_ANDROID = 'Mozilla/5.0 (Mobile; rv:48.0) Gecko/48.0 Firefox/48.0 KAIOS/2.5'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 Version/26.1 Mobile/15E148 Safari/604.1'
const CHROME_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 CriOS/142.0.7444.77 Mobile/15E148 Safari/604.1'
const FIREFOX_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 FxiOS/145.0 Mobile/15E148 Safari/605.1.15'
const EDGE_IPAD = 'Mozilla/5.0 (iPad; CPU OS 26_1 like Mac OS X) AppleWebKit/605.1.15 EdgiOS/142.0.3595.65 Mobile/15E148 Safari/605.1.15'
// Un iPad, comme un Mac, se présente en « Macintosh » : seul son écran tactile le distingue.
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.1 Safari/605.1.15'
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0'
const LINUX_FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0'
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
    expect(situationInstallation(appareil(WINDOWS, { standalone: true }), invitation())).toBe('installe')
  })

  it('un bouton, sur Android, si le navigateur propose sa fenêtre d’installation (Chrome, Edge, Samsung Internet…)', () => {
    expect(situationInstallation(appareil(ANDROID), invitation())).toBe('bouton')
  })

  it('les étapes de Firefox sur Android, qui n’a pas de fenêtre d’installation', () => {
    expect(situationInstallation(appareil(FIREFOX_ANDROID), null)).toBe('firefox-android')
  })

  it('les étapes de Safari sur iPhone et iPad, même quand l’iPad se présente comme un Mac', () => {
    expect(situationInstallation(appareil(IPHONE), null)).toBe('safari-ios')
    expect(situationInstallation(appareil(MAC, { pointsTactiles: 5 }), null)).toBe('safari-ios')
  })

  it('les étapes de Chrome, Firefox et Edge sur iPhone et iPad, qui passent par leur bouton Partager', () => {
    expect(situationInstallation(appareil(CHROME_IPHONE), null)).toBe('ios-autre')
    expect(situationInstallation(appareil(FIREFOX_IPHONE), null)).toBe('ios-autre')
    expect(situationInstallation(appareil(EDGE_IPAD), null)).toBe('ios-autre')
  })

  it('des étapes générales, sur un autre mobile (ou quand la fenêtre d’installation n’est pas encore proposée)', () => {
    expect(situationInstallation(appareil(ANDROID), null)).toBe('mobile-autre')
    expect(situationInstallation(appareil(KAIOS), null)).toBe('mobile-autre')
    expect(situationInstallation(appareil(KAIOS_SANS_ANDROID), null)).toBe('mobile-autre')
  })

  it('les favoris sur ordinateur, même si le navigateur propose sa fenêtre d’installation', () => {
    expect(situationInstallation(appareil(WINDOWS), invitation())).toBe('ordinateur')
    expect(situationInstallation(appareil(LINUX_FIREFOX), null)).toBe('ordinateur')
    // Sur Mac, le raccourci des favoris est ⌘ + D.
    expect(situationInstallation(appareil(MAC), null)).toBe('mac')
    expect(situationInstallation(appareil(MAC, { pointsTactiles: 1 }), invitation())).toBe('mac')
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
