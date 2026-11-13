import { render } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { SEUIL_FERMETURE_PX, useGlisserPourFermer } from './glisser.ts'

function Fenetre({ onFermer }: { onFermer: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useGlisserPourFermer(ref, onFermer)
  return (
    <div ref={ref} data-testid="fenetre">
      <p data-testid="texte">Contenu</p>
    </div>
  )
}

/** Un toucher simulé : jsdom ne fournit pas de vrais objets Touch, seules les coordonnées servent ici. */
function toucher(cible: Element, type: string, x: number, y: number, instant: number) {
  const evenement = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(evenement, {
    touches: { value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }] },
    timeStamp: { value: instant },
  })
  cible.dispatchEvent(evenement)
}

/** Un glissement lent de `dy` px en 10 étapes, sur une seconde. */
function glisser(cible: Element, dx: number, dy: number) {
  toucher(cible, 'touchstart', 100, 100, 0)
  for (let i = 1; i <= 10; i++) toucher(cible, 'touchmove', 100 + (dx * i) / 10, 100 + (dy * i) / 10, i * 100)
  toucher(cible, 'touchend', 0, 0, 1000)
}

describe('Glisser vers le bas pour fermer une fenêtre', () => {
  it('ferme la fenêtre tirée assez loin vers le bas', () => {
    const onFermer = vi.fn()
    const { getByTestId } = render(<Fenetre onFermer={onFermer} />)
    glisser(getByTestId('texte'), 0, SEUIL_FERMETURE_PX + 10)
    expect(onFermer).toHaveBeenCalledOnce()
  })

  it('la fait suivre le doigt pendant le geste, puis la remet en place si on lâche trop tôt', () => {
    const onFermer = vi.fn()
    const { getByTestId } = render(<Fenetre onFermer={onFermer} />)
    const fenetre = getByTestId('fenetre')
    toucher(fenetre, 'touchstart', 100, 100, 0)
    toucher(fenetre, 'touchmove', 100, 140, 500)
    expect(fenetre.style.getPropertyValue('--glissement')).toBe('40px')
    toucher(fenetre, 'touchend', 0, 0, 1000)
    expect(onFermer).not.toHaveBeenCalled()
    expect(fenetre.style.getPropertyValue('--glissement')).toBe('')
  })

  it('ne fait rien si le contenu n’est pas tout en haut : le doigt fait remonter le texte', () => {
    const onFermer = vi.fn()
    const { getByTestId } = render(<Fenetre onFermer={onFermer} />)
    getByTestId('fenetre').scrollTop = 50
    glisser(getByTestId('texte'), 0, 200)
    expect(onFermer).not.toHaveBeenCalled()
  })

  it('ignore un glissement vers le haut ou sur le côté', () => {
    const onFermer = vi.fn()
    const { getByTestId } = render(<Fenetre onFermer={onFermer} />)
    glisser(getByTestId('texte'), 0, -200)
    glisser(getByTestId('texte'), 200, 120)
    expect(onFermer).not.toHaveBeenCalled()
  })
})
