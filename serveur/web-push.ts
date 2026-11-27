/**
 * PROTOTYPE (ticket 144, branche prototype/rappel, jetable) : envoyer un push « Web Push » depuis le Worker, avec
 * la seule Web Crypto du Worker (le paquet web-push de Node ne tourne pas sur un Worker).
 *
 * Deux protocoles publics, les mêmes chez Apple, Google et Mozilla :
 * - VAPID (RFC 8292) : le serveur prouve qui il est au service push par un jeton signé avec sa clé privée.
 *   Le navigateur a reçu la clé publique au moment de l'abonnement : seul ce serveur peut donc lui écrire.
 * - le chiffrement du message (RFC 8291, « aes128gcm ») : le service push (Apple, Google…) transporte le
 *   message sans pouvoir le lire ; seul le téléphone a la clé pour le déchiffrer.
 */

/** Un abonnement push, tel que le navigateur le donne (PushSubscription.toJSON()). */
export type AbonnementPush = { endpoint: string; keys: { p256dh: string; auth: string } }

/** Les clés VAPID du serveur, en base64url : la publique (65 octets, point non compressé), la privée (32 octets). */
export type ClesVapid = { publique: string; privee: string }

// --- base64url (l'alphabet des adresses : « - » et « _ » au lieu de « + » et « / », sans « = » final) ---

export function versBase64Url(octets: Uint8Array): string {
  let binaire = ''
  for (const o of octets) binaire += String.fromCharCode(o)
  return btoa(binaire).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export function depuisBase64Url(texte: string): Uint8Array<ArrayBuffer> {
  const b64 = texte.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((texte.length + 3) % 4)
  const binaire = atob(b64)
  const octets = new Uint8Array(binaire.length)
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i)
  return octets
}

const texteEnOctets = (texte: string) => new Uint8Array(new TextEncoder().encode(texte))

function concatener(...parties: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const resultat = new Uint8Array(parties.reduce((total, p) => total + p.length, 0))
  let position = 0
  for (const p of parties) {
    resultat.set(p, position)
    position += p.length
  }
  return resultat
}

// --- VAPID : le jeton signé (un JWT ES256) ---

/** La clé privée VAPID, importée une fois par exécution (l'import a un coût, on le mesure à part). */
export async function importerClePrivee(cles: ClesVapid): Promise<CryptoKey> {
  const publique = depuisBase64Url(cles.publique)
  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: versBase64Url(publique.slice(1, 33)),
      y: versBase64Url(publique.slice(33, 65)),
      d: cles.privee,
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
}

/**
 * Le jeton VAPID pour un service push (« aud » : l'origine de l'adresse d'abonnement, par exemple
 * https://web.push.apple.com). Valable 12 h (24 h au plus selon la RFC). « sub » : un contact, exigé par Apple.
 */
export async function jetonVapid(clePrivee: CryptoKey, endpoint: string, maintenantS: number): Promise<string> {
  const entete = versBase64Url(texteEnOctets(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const corps = versBase64Url(
    texteEnOctets(
      JSON.stringify({ aud: new URL(endpoint).origin, exp: maintenantS + 12 * 3600, sub: 'https://duelcarbone.fr' }),
    ),
  )
  const aSigner = `${entete}.${corps}`
  // La Web Crypto rend directement la signature au format attendu par un JWT (r et s bout à bout, 64 octets).
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, clePrivee, texteEnOctets(aSigner))
  return `${aSigner}.${versBase64Url(new Uint8Array(signature))}`
}

// --- Le chiffrement du message (RFC 8291) ---

async function hkdf(
  sel: Uint8Array<ArrayBuffer>,
  secret: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
  octets: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const cle = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sel, info }, cle, octets * 8))
}

/** Pour les tests : imposer le sel et la paire de clés éphémère au lieu de les tirer au hasard. */
export type Hasard = { sel?: Uint8Array<ArrayBuffer>; clesEphemeres?: CryptoKeyPair }

/** Chiffre le message pour un abonnement : rend le corps de la requête à envoyer au service push. */
export async function chiffrer(abonnement: AbonnementPush, message: string, hasard: Hasard = {}): Promise<Uint8Array<ArrayBuffer>> {
  const clePubliqueDuTelephone = depuisBase64Url(abonnement.keys.p256dh)
  const secretDAuthentification = depuisBase64Url(abonnement.keys.auth)

  // 1. Une paire de clés jetable, propre à ce seul message, et le secret partagé avec le téléphone (ECDH).
  const ephemeres =
    hasard.clesEphemeres ??
    ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair)
  const publiqueEphemere = new Uint8Array((await crypto.subtle.exportKey('raw', ephemeres.publicKey)) as ArrayBuffer)
  const cleDuTelephone = await crypto.subtle.importKey(
    'raw',
    clePubliqueDuTelephone,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const secretPartage = new Uint8Array(
    await crypto.subtle.deriveBits(// (les types de Cloudflare écrivent « $public » ; le moteur attend bien « public », comme la norme)
      { name: 'ECDH', public: cleDuTelephone } as unknown as Parameters<typeof crypto.subtle.deriveBits>[0], ephemeres.privateKey, 256),
  )

  // 2. Les clés du message, dérivées du secret partagé et du secret d'authentification (HKDF).
  const infoCle = concatener(texteEnOctets('WebPush: info\0'), clePubliqueDuTelephone, publiqueEphemere)
  const ikm = await hkdf(secretDAuthentification, secretPartage, infoCle, 32)
  const sel: Uint8Array<ArrayBuffer> = hasard.sel ?? crypto.getRandomValues(new Uint8Array(16))
  const cleDeContenu = await hkdf(sel, ikm, texteEnOctets('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(sel, ikm, texteEnOctets('Content-Encoding: nonce\0'), 12)

  // 3. Le message chiffré (AES-GCM), en un seul bloc terminé par l'octet 2 (« dernier bloc », sans remplissage).
  const cle = await crypto.subtle.importKey('raw', cleDeContenu, 'AES-GCM', false, ['encrypt'])
  const chiffre = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cle, concatener(texteEnOctets(message), new Uint8Array([2]))),
  )

  // 4. L'en-tête : sel (16 octets), taille de bloc (4096, sur 4 octets), longueur de la clé (65), clé éphémère.
  const entete = new Uint8Array(16 + 4 + 1 + 65)
  entete.set(sel, 0)
  new DataView(entete.buffer).setUint32(16, 4096)
  entete[20] = 65
  entete.set(publiqueEphemere, 21)
  return concatener(entete, chiffre)
}

/** Ce qu'on règle pour un envoi : la durée de vie (en secondes) et l'urgence. */
export type OptionsEnvoi = {
  ttl: number
  urgence?: 'very-low' | 'low' | 'normal' | 'high'
  sujet?: string
  /** Les jetons VAPID déjà signés, par service push (absent : une signature par envoi). */
  jetons?: Map<string, Promise<string>>
}

/** La requête complète à envoyer au service push (rien n'est envoyé ici : on peut mesurer le calcul seul). */
export async function preparerEnvoi(
  abonnement: AbonnementPush,
  message: string,
  cles: ClesVapid,
  clePrivee: CryptoKey,
  options: OptionsEnvoi,
  maintenantS: number,
): Promise<Request> {
  // Le jeton VAPID ne dépend que du service push (Apple, Google…) : un seul par service suffit pour tout un envoi
  // groupé (options.jetons, partagé entre les envois), ce qui évite une signature par abonné.
  const origine = new URL(abonnement.endpoint).origin
  let jeton = options.jetons?.get(origine)
  if (!jeton) {
    jeton = jetonVapid(clePrivee, abonnement.endpoint, maintenantS)
    options.jetons?.set(origine, jeton)
  }
  const [corps, jetonSigne] = await Promise.all([chiffrer(abonnement, message), jeton])
  const entetes: Record<string, string> = {
    Authorization: `vapid t=${jetonSigne}, k=${cles.publique}`,
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    // TTL : combien de temps le service push garde le message pour un téléphone éteint (ici : jusqu'à minuit).
    TTL: String(Math.max(0, Math.round(options.ttl))),
    Urgency: options.urgence ?? 'normal',
  }
  // Topic : un nouveau Rappel remplace l'ancien encore en attente chez le service push (au plus 32 caractères).
  if (options.sujet) entetes.Topic = options.sujet
  return new Request(abonnement.endpoint, { method: 'POST', headers: entetes, body: corps })
}
