import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLE_INSTALLATION } from '../navigateur/installation.ts'
import { CLE_RAPPEL, type ServiceDuRappel } from '../navigateur/rappel.ts'
import { InvitationRappel, ReglageRappel } from './InvitationRappel.tsx'

const TITRE = 'Ne rate pas le Duel de demain'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1'

/** Un faux service du Rappel : par défaut, le serveur répond, le navigateur sait faire du push, rien n'est actif. */
function fauxService(reglages: Partial<ServiceDuRappel> & { permission?: NotificationPermission; essai?: boolean } = {}): ServiceDuRappel {
  const { permission = 'granted', essai = false, ...service } = reglages
  return {
    possible: true,
    lireLesInfos: vi.fn(async () => ({ cle: 'cle-publique', essai })),
    estActif: vi.fn(async () => false),
    demanderPermission: vi.fn(async () => permission),
    sAbonner: vi.fn(async () => true),
    arreter: vi.fn(async () => {}),
    renvoyer: vi.fn(async () => {}),
    essayer: vi.fn(async () => true),
    ...service,
  }
}

async function afficher(service: ServiceDuRappel) {
  const mesurer = vi.fn()
  render(<InvitationRappel service={service} mesurer={mesurer} />)
  // Le temps que la clé du serveur arrive.
  await act(async () => {})
  return mesurer
}

const carte = () => screen.queryByRole('region', { name: TITRE })

afterEach(() => vi.restoreAllMocks())

describe('La carte « Ne rate pas le Duel de demain » (Rappel du matin, ADR 0008)', () => {
  it('propose le Rappel, et le compte', async () => {
    const mesurer = await afficher(fauxService())
    expect(carte()).toHaveTextContent('Chaque jour à 7 h, le Rappel du matin t’annonce le nouveau Duel par une notification.')
    expect(screen.getByRole('button', { name: 'Activer le Rappel' })).toBeInTheDocument()
    expect(mesurer).toHaveBeenCalledWith('notifications/proposees')
  })

  it('ouvre la fenêtre d’autorisation dans le toucher même, puis confirme et compte l’activation', async () => {
    const service = fauxService()
    const mesurer = await afficher(service)
    fireEvent.click(screen.getByRole('button', { name: 'Activer le Rappel' }))
    // Sans rien attendre (sur iPhone, la fenêtre ne s'ouvre que dans le geste du joueur).
    expect(service.demanderPermission).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Activation…' })).toHaveAttribute('aria-disabled', 'true')
    await act(async () => {})
    expect(service.sAbonner).toHaveBeenCalledWith('cle-publique')
    expect(within(carte()!).getByRole('status')).toHaveTextContent('C’est noté : le Rappel du matin arrivera demain à 7 h.')
    expect(mesurer).toHaveBeenCalledWith('notifications/acceptees')
    // Pas de bouton d'essai en production.
    expect(screen.queryByRole('button', { name: /Essai/ })).not.toBeInTheDocument()
  })

  it('dit que le Rappel n’est pas activé si le navigateur refuse (même sans rien montrer), et comment l’autoriser', async () => {
    const service = fauxService({ permission: 'denied' })
    const mesurer = await afficher(service)
    fireEvent.click(screen.getByRole('button', { name: 'Activer le Rappel' }))
    await act(async () => {})
    const message = within(carte()!).getByRole('status')
    expect(message).toHaveTextContent('Le Rappel n’est pas activé : ton navigateur bloque les notifications de Duel Carbone.')
    expect(message).toHaveTextContent(/autorise les notifications\. Puis touche « Réessayer »\./)
    expect(mesurer).toHaveBeenCalledWith('notifications/bloquees')
    expect(service.sAbonner).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })

  it('le dit aussi si le joueur ferme la fenêtre sans choisir', async () => {
    await afficher(fauxService({ permission: 'default' }))
    fireEvent.click(screen.getByRole('button', { name: 'Activer le Rappel' }))
    await act(async () => {})
    expect(within(carte()!).getByRole('status')).toHaveTextContent('Le Rappel n’est pas activé : tu n’as pas autorisé les notifications.')
  })

  it('le dit si l’abonnement n’a pas pu être confié au serveur', async () => {
    const mesurer = await afficher(fauxService({ sAbonner: vi.fn(async () => false) }))
    fireEvent.click(screen.getByRole('button', { name: 'Activer le Rappel' }))
    await act(async () => {})
    expect(within(carte()!).getByRole('status')).toHaveTextContent('Le Rappel n’a pas pu être activé')
    expect(mesurer).not.toHaveBeenCalledWith('notifications/acceptees')
  })

  it('permet d’arrêter le Rappel tout de suite après l’avoir activé', async () => {
    const service = fauxService()
    await afficher(service)
    fireEvent.click(screen.getByRole('button', { name: 'Activer le Rappel' }))
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter le Rappel' }))
    await act(async () => {})
    expect(service.arreter).toHaveBeenCalledOnce()
    expect(within(carte()!).getByRole('status')).toHaveTextContent('Le Rappel est arrêté : tu ne recevras plus de notification.')
    expect(screen.getByRole('button', { name: 'Activer le Rappel' })).toBeInTheDocument()
  })

  it('« Non merci » la ferme pour de bon, et le compte', async () => {
    const mesurer = await afficher(fauxService())
    fireEvent.click(screen.getByRole('button', { name: 'Non merci' }))
    expect(carte()).not.toBeInTheDocument()
    expect(mesurer).toHaveBeenCalledWith('notifications/refusees')
    expect(localStorage.getItem(CLE_RAPPEL)).toBe('ecartee')
  })

  it('ne revient pas après « Non merci »', async () => {
    localStorage.setItem(CLE_RAPPEL, 'ecartee')
    const mesurer = await afficher(fauxService())
    expect(carte()).not.toBeInTheDocument()
    expect(mesurer).not.toHaveBeenCalled()
  })

  it('revient une fois pour qui avait refusé l’ancienne invitation à installer', async () => {
    localStorage.setItem(CLE_INSTALLATION, 'ecartee')
    await afficher(fauxService())
    expect(carte()).toBeInTheDocument()
    expect(localStorage.getItem(CLE_RAPPEL)).toBe('revue')
  })

  it('ne s’affiche pas si le Rappel est déjà actif sur cet appareil', async () => {
    const mesurer = await afficher(fauxService({ estActif: vi.fn(async () => true) }))
    expect(carte()).not.toBeInTheDocument()
    expect(mesurer).not.toHaveBeenCalled()
  })

  it('sans serveur, laisse la place à l’invitation à installer (ici, sur ordinateur, la ligne des favoris)', async () => {
    await afficher(fauxService({ lireLesInfos: vi.fn(async () => null) }))
    expect(carte()).not.toBeInTheDocument()
    expect(screen.getByText(/^Pour revenir demain : ajoute Duel Carbone à tes favoris/)).toBeInTheDocument()
  })

  it('sur iPhone, sans le jeu installé, demande d’abord de l’installer', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE)
    const mesurer = await afficher(fauxService({ possible: false }))
    expect(carte()).toHaveTextContent('installe d’abord Duel Carbone sur ton écran d’accueil')
    expect(screen.queryByRole('button', { name: 'Activer le Rappel' })).not.toBeInTheDocument()
    expect(mesurer).toHaveBeenCalledWith('installation/proposee')
    fireEvent.click(screen.getByRole('button', { name: 'Comment l’installer ?' }))
    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('Fais défiler et touche « Sur l’écran d’accueil ».')
    expect(mesurer).toHaveBeenCalledWith('installation/guide')
    fireEvent.click(screen.getByRole('button', { name: 'Non merci' }))
    expect(mesurer).toHaveBeenCalledWith('installation/refusee')
  })

  it('sur un aperçu, propose l’essai une fois le Rappel actif', async () => {
    const service = fauxService({ essai: true })
    await afficher(service)
    fireEvent.click(screen.getByRole('button', { name: 'Activer le Rappel' }))
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Essai : m’envoyer le Rappel dans 10 s' }))
    await act(async () => {})
    expect(service.essayer).toHaveBeenCalledOnce()
    expect(screen.getByText(/ferme le jeu, le Rappel arrive dans 10 s/)).toBeInTheDocument()
  })
})

describe('Le Rappel du matin dans la page En savoir plus', () => {
  const afficherReglage = async (service: ServiceDuRappel) => {
    render(<ReglageRappel service={service} mesurer={vi.fn()} />)
    await act(async () => {})
  }

  it('montre qu’il est actif, et permet de l’arrêter, même après « Non merci »', async () => {
    localStorage.setItem(CLE_RAPPEL, 'ecartee')
    const service = fauxService({ estActif: vi.fn(async () => true) })
    await afficherReglage(service)
    expect(screen.getByRole('status')).toHaveTextContent('Le Rappel du matin est activé sur cet appareil.')
    fireEvent.click(screen.getByRole('button', { name: 'Arrêter le Rappel' }))
    await act(async () => {})
    expect(service.arreter).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Activer le Rappel' })).toBeInTheDocument()
  })

  it.each([
    ['le serveur ne répond pas', { lireLesInfos: vi.fn(async () => null) }, 'Le Rappel est indisponible pour le moment'],
    ['le navigateur ne sait pas', { possible: false }, 'Ce navigateur ne sait pas recevoir de notifications'],
  ])('le dit quand il est impossible (%s)', async (_, reglages, texte) => {
    await afficherReglage(fauxService(reglages))
    expect(screen.getByText(new RegExp(texte))).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
