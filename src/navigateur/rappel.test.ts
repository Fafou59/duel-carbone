import { describe, expect, it, vi } from 'vitest'
import { CLE_INSTALLATION } from './installation.ts'
import type { Stockage } from './memoire.ts'
import {
  aideAuDeblocage,
  cleEnOctets,
  CLE_RAPPEL,
  ecarterInvitationAuRappel,
  invitationAuRappelAProposer,
  noterInvitationVue,
  serviceDuRappel,
  type AbonnementDuNavigateur,
  type PushDuNavigateur,
} from './rappel.ts'

const CLE = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'
const JSON_DE_L_ABONNEMENT = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'p', auth: 'a' } }

/** Un faux navigateur : une autorisation, et un abonnement qu'on peut défaire. */
function fauxPush(permission: NotificationPermission = 'granted', abonne = false) {
  let actuel: AbonnementDuNavigateur | null = null
  const nouvel = (): AbonnementDuNavigateur => ({
    endpoint: JSON_DE_L_ABONNEMENT.endpoint,
    toJSON: () => JSON_DE_L_ABONNEMENT,
    unsubscribe: vi.fn(async () => {
      actuel = null
      return true
    }),
  })
  if (abonne) actuel = nouvel()
  const push: PushDuNavigateur = {
    permission: () => permission,
    demanderPermission: vi.fn(async () => permission),
    abonnementActuel: async () => actuel,
    sAbonner: vi.fn(async () => (actuel = nouvel())),
  }
  return { push, actuel: () => actuel }
}

/** Un faux serveur : il note les appels, et répond par le code prévu (200 par défaut). */
function fauxServeur(statut = 200, corps: unknown = { cle: CLE }) {
  const appels: { adresse: string; methode: string; corps: unknown }[] = []
  const faireFetch = vi.fn(async (adresse: string | URL | Request, init?: RequestInit) => {
    appels.push({ adresse: String(adresse), methode: init?.method ?? 'GET', corps: init?.body ? JSON.parse(String(init.body)) : undefined })
    return new Response(JSON.stringify(corps), { status: statut })
  }) as unknown as typeof fetch
  return { appels, faireFetch }
}

describe('Le Rappel du matin, côté navigateur', () => {
  it('lit la clé du serveur, et rien s’il ne répond pas ou pas en JSON (le site servi sans le serveur)', async () => {
    expect(await serviceDuRappel(null, fauxServeur(200, { cle: CLE }).faireFetch).lireLesInfos()).toEqual({ cle: CLE, essai: false })
    expect(await serviceDuRappel(null, fauxServeur(200, { cle: CLE, essai: true }).faireFetch).lireLesInfos()).toEqual({ cle: CLE, essai: true })
    expect(await serviceDuRappel(null, fauxServeur(503).faireFetch).lireLesInfos()).toBeNull()
    const html = vi.fn(async () => new Response('<!doctype html>', { status: 200 })) as unknown as typeof fetch
    expect(await serviceDuRappel(null, html).lireLesInfos()).toBeNull()
  })

  it('confie l’abonnement au serveur, avec la clé en octets', async () => {
    const { push } = fauxPush()
    const { appels, faireFetch } = fauxServeur()
    expect(await serviceDuRappel(push, faireFetch).sAbonner(CLE)).toBe(true)
    expect(push.sAbonner).toHaveBeenCalledWith(cleEnOctets(CLE))
    expect(cleEnOctets(CLE)).toHaveLength(65)
    expect(appels).toEqual([{ adresse: '/api/rappel/abonnement', methode: 'POST', corps: JSON_DE_L_ABONNEMENT }])
  })

  it('défait l’abonnement si le serveur ne l’a pas pris : pas de Rappel imaginaire', async () => {
    const f = fauxPush()
    const service = serviceDuRappel(f.push, fauxServeur(503).faireFetch)
    expect(await service.sAbonner(CLE)).toBe(false)
    expect(f.actuel()).toBeNull()
    expect(await service.estActif()).toBe(false)
  })

  it('arrête le Rappel : prévient le serveur et désabonne, même si le serveur ne répond pas', async () => {
    const f = fauxPush('granted', true)
    const { appels, faireFetch } = fauxServeur(503)
    await serviceDuRappel(f.push, faireFetch).arreter()
    expect(appels).toEqual([{ adresse: '/api/rappel/abonnement', methode: 'DELETE', corps: { endpoint: JSON_DE_L_ABONNEMENT.endpoint } }])
    expect(f.actuel()).toBeNull()
  })

  it('à chaque ouverture, renvoie l’abonnement s’il existe, et rien sinon', async () => {
    const abonne = fauxServeur()
    await serviceDuRappel(fauxPush('granted', true).push, abonne.faireFetch).renvoyer()
    expect(abonne.appels.map((a) => a.methode)).toEqual(['POST'])

    const sansAbonnement = fauxServeur()
    await serviceDuRappel(fauxPush('granted', false).push, sansAbonnement.faireFetch).renvoyer()
    await serviceDuRappel(fauxPush('denied', true).push, sansAbonnement.faireFetch).renvoyer()
    await serviceDuRappel(null, sansAbonnement.faireFetch).renvoyer()
    expect(sansAbonnement.appels).toEqual([])
  })

  it('n’est actif qu’avec l’autorisation et un abonnement', async () => {
    expect(await serviceDuRappel(fauxPush('granted', true).push).estActif()).toBe(true)
    expect(await serviceDuRappel(fauxPush('granted', false).push).estActif()).toBe(false)
    expect(await serviceDuRappel(fauxPush('denied', true).push).estActif()).toBe(false)
    expect(serviceDuRappel(null).possible).toBe(false)
  })

  it.each([
    ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', 0, /Réglages › Notifications › Duel Carbone/],
    ['iPad', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.1 Safari/605.1.15', 5, /Réglages › Notifications/],
    ['Firefox Android', 'Mozilla/5.0 (Android 15; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0', 5, /Permissions des sites › Notifications, et choisis « Demander »/],
    ['Firefox ordinateur', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0', 0, /retire le blocage des notifications/],
    ['Chrome Android', 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/142.0 Mobile Safari/537.36', 5, /Autorisations › Notifications/],
    ['Chrome ordinateur', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142.0 Safari/537.36', 0, /le cadenas ou les réglages du site/],
  ])('dit comment débloquer les notifications (%s)', (_, userAgent, points, attendu) => {
    expect(aideAuDeblocage(userAgent, points)).toMatch(attendu)
  })
})

describe('« Non merci » à la carte du Rappel, gardé sur l’appareil', () => {
  const stockage = (valeurs: Record<string, string> = {}): Stockage => ({
    getItem: (cle) => valeurs[cle] ?? null,
    setItem: (cle, valeur) => void (valeurs[cle] = valeur),
  })

  it('propose la carte jusqu’au « Non merci », puis plus jamais', () => {
    const s = stockage()
    expect(invitationAuRappelAProposer(s)).toBe(true)
    noterInvitationVue(s)
    expect(invitationAuRappelAProposer(s)).toBe(true)
    ecarterInvitationAuRappel(s)
    expect(invitationAuRappelAProposer(s)).toBe(false)
  })

  it('la montre une fois, une seule, à qui avait refusé l’ancienne invitation à installer', () => {
    const s = stockage({ [CLE_INSTALLATION]: 'ecartee' })
    expect(invitationAuRappelAProposer(s)).toBe(true)
    noterInvitationVue(s)
    expect(s.getItem(CLE_RAPPEL)).toBe('revue')
    expect(invitationAuRappelAProposer(s)).toBe(false)
  })

  it('tolère un stockage absent ou qui refuse d’écrire', () => {
    const casse: Stockage = {
      getItem: () => {
        throw new Error('refusé')
      },
      setItem: () => {
        throw new Error('refusé')
      },
    }
    expect(invitationAuRappelAProposer(null)).toBe(true)
    expect(invitationAuRappelAProposer(casse)).toBe(true)
    expect(() => ecarterInvitationAuRappel(casse)).not.toThrow()
    expect(() => noterInvitationVue(casse)).not.toThrow()
  })
})
