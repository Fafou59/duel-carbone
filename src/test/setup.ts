// Ajoute à Vitest des vérifications adaptées au HTML, comme toBeInTheDocument() ou toHaveAttribute().
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom simule un navigateur mais ne sait pas faire défiler une page : on fournit une doublure.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}
if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
}

// Après chaque test, on retire la page affichée, pour que chaque test parte d'un écran vide.
afterEach(() => {
  cleanup()
})
