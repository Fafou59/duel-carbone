/**
 * Le service worker (ticket #16) : il garde une copie du jeu sur l'appareil pour qu'il marche hors ligne,
 * et il récupère les nouvelles versions du site.
 *
 * Une nouvelle version se télécharge en arrière-plan, puis attend. Le jeu l'applique en silence (en rechargeant
 * la page) dès que le joueur est sur l'accueil, jamais en pleine Partie (App.tsx). S'il ne repasse pas par
 * l'accueil, elle s'appliquera à la prochaine ouverture du jeu. L'appliquer vite évite surtout qu'un joueur lance
 * le Duel du jour avec l'ancien calendrier pendant que tout le monde joue le nouveau.
 */
import { useSyncExternalStore } from 'react'

/** Ce qui applique la nouvelle version, une fois téléchargée (null : aucune nouvelle version en attente). */
let appliquer: (() => void) | null = null
const abonnes = new Set<() => void>()

/** Prévient le jeu qu'une nouvelle version est prête. Appelé par le service worker (ou par un test). */
export function signalerNouvelleVersion(appliquerLaVersion: () => void): void {
  appliquer = appliquerLaVersion
  for (const prevenir of abonnes) prevenir()
}

/** Applique la nouvelle version en attente, s'il y en a une (la page se recharge). */
export function appliquerNouvelleVersion(): void {
  const maintenant = appliquer
  appliquer = null
  for (const prevenir of abonnes) prevenir()
  maintenant?.()
}

/** Vrai quand une nouvelle version attend d'être appliquée ; tenu à jour pour React. */
export function useNouvelleVersion(): boolean {
  return useSyncExternalStore(
    (prevenir) => {
      abonnes.add(prevenir)
      return () => abonnes.delete(prevenir)
    },
    () => appliquer !== null,
  )
}

/**
 * Installe le service worker, sur le site construit seulement (pas pendant le développement).
 * Le jeu ne doit jamais casser : sans service worker (vieux navigateur, navigation privée), il marche comme un site.
 */
export async function enregistrerServiceWorker(): Promise<void> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  try {
    const { registerSW } = await import('virtual:pwa-register')
    const mettreAJour = registerSW({
      onNeedRefresh: () => signalerNouvelleVersion(() => void mettreAJour(true)),
      onRegisteredSW: (_adresse, inscription) => {
        // Un jeu installé peut rester ouvert des jours en arrière-plan : à chaque retour, on regarde s'il existe
        // une nouvelle version (sans réseau, la vérification échoue en silence).
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') inscription?.update().catch(() => {})
        })
      },
    })
  } catch {
    // Pas de service worker : le jeu reste un site, sans mode hors ligne.
  }
}
