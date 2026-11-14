import { useEffect, useRef, type RefObject } from 'react'
import { mouvementReduit } from './mouvement.ts'

/** Distance (en px) à partir de laquelle un glissement vers le bas ferme la fenêtre au lâcher. */
export const SEUIL_FERMETURE_PX = 90
/** Un geste rapide (« flick ») ferme aussi la fenêtre, même s'il est court : vitesse en px/ms. */
const VITESSE_FERMETURE = 0.6
/** Mouvement en dessous duquel on ne sait pas encore si le doigt part vers le bas ou sur le côté. */
const SEUIL_DIRECTION_PX = 8

/** Le contenu sous le doigt est-il tout en haut (lui et chacun de ses parents jusqu'à la fenêtre) ? */
function toutEnHaut(cible: EventTarget | null, fenetre: HTMLElement): boolean {
  for (let n = cible instanceof Element ? cible : null; n; n = n === fenetre ? null : n.parentElement) {
    if (n.scrollTop > 0) return false
  }
  return true
}

/**
 * Glisser vers le bas pour fermer une fenêtre (<dialog>), comme les feuilles d'iOS et d'Android.
 *
 * Le geste ne démarre que si le contenu de la fenêtre est déjà tout en haut : sinon, le doigt fait simplement
 * remonter le texte. Une fois en haut, continuer à tirer vers le bas fait suivre la fenêtre au doigt ;
 * au lâcher, elle se ferme si elle a été tirée assez loin (ou d'un geste vif), sinon elle reprend sa place.
 * Un glissement sur le côté (un tableau qui défile horizontalement) est ignoré.
 *
 * Le déplacement est donné par la variable CSS --glissement, que les fenêtres appliquent avec la propriété
 * `translate` (src/index.css) : distincte de `transform`, elle se compose avec leurs animations d'entrée
 * (l'annonce d'un Duel thématique se retourne) sans les écraser.
 */
export function useGlisserPourFermer(fenetre: RefObject<HTMLElement | null>, fermer: () => void) {
  // La dernière fonction reçue, sans réinstaller les écouteurs à chaque affichage.
  const rappel = useRef(fermer)
  useEffect(() => {
    rappel.current = fermer
  }, [fermer])

  useEffect(() => {
    const el = fenetre.current
    if (!el) return
    let depart: { x: number; y: number; instant: number } | null = null
    let suivi = false
    let ecart = 0

    const replacer = (anime: boolean) => {
      el.style.transition = anime && !mouvementReduit() ? 'translate 0.2s ease-out' : ''
      el.style.removeProperty('--glissement')
    }

    const debut = (e: TouchEvent) => {
      suivi = false
      ecart = 0
      depart = e.touches.length === 1 && toutEnHaut(e.target, el) ? { x: e.touches[0].clientX, y: e.touches[0].clientY, instant: e.timeStamp } : null
    }

    const mouvement = (e: TouchEvent) => {
      if (!depart) return
      const dx = e.touches[0].clientX - depart.x
      const dy = e.touches[0].clientY - depart.y
      if (!suivi) {
        if (Math.abs(dx) < SEUIL_DIRECTION_PX && Math.abs(dy) < SEUIL_DIRECTION_PX) return
        // Vers le haut ou sur le côté : ce n'est pas notre geste, le défilement normal reprend.
        if (dy <= 0 || Math.abs(dx) > dy) {
          depart = null
          return
        }
        suivi = true
        el.style.transition = 'none'
      }
      ecart = Math.max(0, dy)
      el.style.setProperty('--glissement', `${ecart}px`)
      // Sans cela, Safari ferait rebondir la page en même temps.
      if (e.cancelable) e.preventDefault()
    }

    const fin = (e: TouchEvent) => {
      if (!depart || !suivi) {
        depart = null
        return
      }
      const vitesse = ecart / Math.max(1, e.timeStamp - depart.instant)
      depart = null
      suivi = false
      if (ecart >= SEUIL_FERMETURE_PX || (vitesse >= VITESSE_FERMETURE && ecart > 30)) {
        replacer(false)
        rappel.current()
      } else {
        replacer(true)
      }
    }

    // Un geste interrompu (appel entrant, notification…) : la fenêtre reprend sa place.
    const annuler = () => {
      if (suivi) replacer(true)
      depart = null
      suivi = false
    }

    // Une fenêtre fermée autrement (Échap, bouton) repart toujours de sa place.
    const fermee = () => replacer(false)

    el.addEventListener('touchstart', debut, { passive: true })
    // passive: false, pour pouvoir empêcher le rebond de la page pendant le geste.
    el.addEventListener('touchmove', mouvement, { passive: false })
    el.addEventListener('touchend', fin)
    el.addEventListener('touchcancel', annuler)
    el.addEventListener('close', fermee)
    return () => {
      el.removeEventListener('touchstart', debut)
      el.removeEventListener('touchmove', mouvement)
      el.removeEventListener('touchend', fin)
      el.removeEventListener('touchcancel', annuler)
      el.removeEventListener('close', fermee)
    }
  }, [fenetre])
}
