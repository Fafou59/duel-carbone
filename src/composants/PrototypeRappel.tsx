/**
 * PROTOTYPE (ticket 144, branche prototype/rappel, jetable) : un panneau d'essai du Rappel du matin, en bas de
 * l'accueil. Il s'abonne au push, range l'abonnement sur le serveur (base D1 des aperçus) et demande un envoi.
 * Rien ici n'est le futur écran : la vraie proposition sera la carte « Ne rate pas le Duel de demain » (ADR 0008).
 */
import { useEffect, useState } from 'react'

const estInstalle = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

const pushPossible = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

/** La clé publique VAPID (base64url) en octets, comme l'attend pushManager.subscribe. */
function enOctets(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = base64url.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((base64url.length + 3) % 4)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function appeler(methode: string, adresse: string, corps?: unknown) {
  const reponse = await fetch(adresse, {
    method: methode,
    headers: corps ? { 'Content-Type': 'application/json' } : undefined,
    body: corps ? JSON.stringify(corps) : undefined,
  })
  const texte = await reponse.text()
  return `${reponse.status} ${texte}`
}

export function PrototypeRappel() {
  const [journal, setJournal] = useState<string[]>([])
  const [abonnement, setAbonnement] = useState<PushSubscription | null>(null)
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'absente'))
  const noter = (ligne: string) =>
    setJournal((j) => [`${new Date().toLocaleTimeString('fr-FR')} · ${ligne}`, ...j].slice(0, 30))

  useEffect(() => {
    if (!pushPossible()) return
    void navigator.serviceWorker.ready.then((sw) => sw.pushManager.getSubscription()).then(setAbonnement)
  }, [])

  const essayer = (action: () => Promise<void>) => () => {
    action().catch((e: unknown) => noter(`ERREUR ${e instanceof Error ? `${e.name} : ${e.message}` : String(e)}`))
  }

  const sAbonner = essayer(async () => {
    // Sur iPhone, la fenêtre d'autorisation doit s'ouvrir directement dans le geste (aucune attente avant).
    const choix = await Notification.requestPermission()
    setPermission(choix)
    noter(`autorisation : ${choix}`)
    if (choix !== 'granted') return
    const { cle } = (await (await fetch('/api/rappel/cle')).json()) as { cle: string }
    const sw = await navigator.serviceWorker.ready
    const nouvel = await sw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: enOctets(cle) })
    setAbonnement(nouvel)
    noter(`abonné chez ${new URL(nouvel.endpoint).host}`)
    noter(await appeler('POST', '/api/rappel/abonnement', nouvel.toJSON()))
  })

  const envoyer = (options: { delai?: number; ttl?: number }) =>
    essayer(async () => {
      if (!abonnement) return noter('pas d’abonnement sur cet appareil')
      noter('envoi demandé…')
      noter(await appeler('POST', '/api/rappel/envoyer', { endpoint: abonnement.endpoint, ...options }))
    })

  const charge = (n: number) =>
    essayer(async () => {
      noter(`préparation de ${n} envois…`)
      const debut = performance.now()
      const resultat = await appeler('GET', `/api/rappel/charge?n=${n}`)
      noter(`${resultat.slice(0, 200)} (${Math.round(performance.now() - debut)} ms aller-retour)`)
    })

  const arreter = essayer(async () => {
    if (!abonnement) return
    noter(await appeler('DELETE', '/api/rappel/abonnement', abonnement.toJSON()))
    await abonnement.unsubscribe()
    setAbonnement(null)
    noter('désabonné')
  })

  return (
    <section style={{ margin: '2rem 1rem', padding: '1rem', border: '3px dashed #c05', borderRadius: 12, textAlign: 'left' }}>
      <h2 style={{ marginTop: 0 }}>Prototype : Rappel du matin</h2>
      <ul style={{ fontSize: '0.9rem', paddingLeft: '1.2rem' }}>
        <li>Push possible : {pushPossible() ? 'oui' : 'non'}</li>
        <li>Jeu installé (écran d’accueil) : {estInstalle() ? 'oui' : 'non'}</li>
        <li>Autorisation : {permission}</li>
        <li>Abonnement : {abonnement ? new URL(abonnement.endpoint).host : 'aucun'}</li>
      </ul>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button type="button" className="bouton" onClick={sAbonner}>
          Recevoir le Rappel
        </button>
        <button type="button" className="bouton bouton--secondaire" onClick={envoyer({})}>
          M’envoyer le Rappel maintenant
        </button>
        <button type="button" className="bouton bouton--secondaire" onClick={envoyer({ delai: 15 })}>
          Dans 15 s (le temps de fermer le jeu)
        </button>
        <button type="button" className="bouton bouton--secondaire" onClick={envoyer({ delai: 15, ttl: 30 })}>
          Dans 15 s, expire après 30 s (test du TTL)
        </button>
        <button type="button" className="bouton bouton--secondaire" onClick={charge(50)}>
          Calcul de 50 envois (sans envoyer)
        </button>
        <button type="button" className="bouton bouton--secondaire" onClick={charge(200)}>
          Calcul de 200 envois
        </button>
        <button type="button" className="bouton bouton--secondaire" onClick={charge(1000)}>
          Calcul de 1000 envois
        </button>
        <button type="button" className="lien-bouton" onClick={arreter}>
          Arrêter le Rappel
        </button>
      </div>
      <pre style={{ fontSize: '0.7rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '1rem' }}>
        {journal.join('\n') || 'Journal vide.'}
      </pre>
    </section>
  )
}
