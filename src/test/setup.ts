// Ajoute à Vitest des vérifications adaptées au HTML, comme toBeInTheDocument() ou toHaveAttribute().
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// findBy… et waitFor attendent qu'un élément apparaisse : 1 s par défaut, 3 s ici. Les tests tournent en parallèle
// dans un seul processus (pool vmThreads, vite.config.ts) : sur une machine chargée, un écran met parfois plus d'une
// seconde à s'afficher sans que rien ne soit cassé. Un élément qui ne vient jamais fait toujours échouer le test.
configure({ asyncUtilTimeout: 3000 })

// jsdom simule un navigateur mais ne sait pas faire défiler une page : on fournit une doublure.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
}

// jsdom ne sait pas dessiner : sans contexte de dessin, l'éclat de confettis ne se lance pas (et jsdom ne s'en plaint plus).
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
}

// jsdom connaît la balise <dialog> mais ne sait ni l'ouvrir ni la fermer : on imite le minimum.
// (Un vrai navigateur ajoute le fond sombre, bloque le reste de la page et gère la touche Échap.)
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

// Après chaque test, on retire la page affichée, pour que chaque test parte d'un écran vide.
afterEach(() => {
  cleanup()
  // Et on vide la mémoire locale, pour qu'un record d'un test ne s'invite pas dans le suivant.
  if (typeof localStorage !== 'undefined') localStorage.clear()
})
