/**
 * PROTOTYPE (ticket 144) : le chiffrement Web Push vérifié sur l'exemple officiel de la RFC 8291 (annexe A).
 * Si un octet diffère, aucun téléphone ne saurait lire le Rappel : mieux vaut le savoir avant d'essayer.
 */
import { describe, expect, it } from 'vitest'
import { chiffrer, depuisBase64Url, importerClePrivee, jetonVapid, versBase64Url } from './web-push.ts'

const sansEspaces = (texte: string) => texte.replace(/\s+/g, '')

const AS_PUBLIC = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'
const AS_PRIVATE = 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw'
const UA_PUBLIC = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4'
const SEL = 'DGv6ra1nlYgDCS1FRnbzlw'
const AUTH = 'BTBZMqHH6r4Tts7J_aSIgg'
// La RFC écrit l'en-tête (86 octets) et le message chiffré chacun en base64url : on les recolle en octets.
const ENTETE = sansEspaces(`DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z 9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml
  mlMoZIIgDll6e3vCYLocInmYWAmS6Tlz AC8wEqKK6PBru3jl7A8`)
const CHIFFRE = sansEspaces(`8pfeW0KbunFT06SuDKoJH9Ql87S1QUrd irN6GcG7sFz1y1sqLgVi1VhjVkHsUoEs
  bI_0LpXMuGvnzQ`)

async function paireDeLaRfc(): Promise<CryptoKeyPair> {
  const publique = depuisBase64Url(AS_PUBLIC)
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: versBase64Url(publique.slice(1, 33)),
    y: versBase64Url(publique.slice(33, 65)),
    ext: true,
  }
  return {
    publicKey: await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []),
    privateKey: await crypto.subtle.importKey('jwk', { ...jwk, d: AS_PRIVATE }, { name: 'ECDH', namedCurve: 'P-256' }, true, [
      'deriveBits',
    ]),
  }
}

describe('Web Push en Web Crypto pur (prototype du Rappel)', () => {
  it('chiffre exactement comme l’exemple de la RFC 8291', async () => {
    const corps = await chiffrer(
      { endpoint: 'https://exemple.test/push', keys: { p256dh: UA_PUBLIC, auth: AUTH } },
      'When I grow up, I want to be a watermelon',
      { sel: depuisBase64Url(SEL), clesEphemeres: await paireDeLaRfc() },
    )
    expect([...corps]).toEqual([...depuisBase64Url(ENTETE), ...depuisBase64Url(CHIFFRE)])
  })

  it('signe un jeton VAPID que la clé publique vérifie', async () => {
    const cles = { publique: AS_PUBLIC, privee: AS_PRIVATE }
    const jeton = await jetonVapid(await importerClePrivee(cles), 'https://web.push.apple.com/abc', 1_800_000_000)
    const [entete, corps, signature] = jeton.split('.')
    expect(JSON.parse(new TextDecoder().decode(depuisBase64Url(corps)))).toEqual({
      aud: 'https://web.push.apple.com',
      exp: 1_800_000_000 + 12 * 3600,
      sub: 'https://duelcarbone.fr',
    })
    const verif = await crypto.subtle.importKey('raw', depuisBase64Url(AS_PUBLIC), { name: 'ECDSA', namedCurve: 'P-256' }, false, [
      'verify',
    ])
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      verif,
      depuisBase64Url(signature),
      new TextEncoder().encode(`${entete}.${corps}`),
    )
    expect(ok).toBe(true)
  })
})
