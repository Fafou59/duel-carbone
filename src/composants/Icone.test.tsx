import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icone } from './Icone.tsx'

describe("Icône d'un Geste", () => {
  it("affiche le fichier SVG du Geste, servi à part (public/icones)", () => {
    const { container } = render(<Icone id="steak-boeuf" />)
    expect(container.querySelector('img')).toHaveAttribute('src', '/icones/steak-boeuf.svg')
  })

  it("est décorative : les lecteurs d'écran lisent le nom du Geste, pas l'image", () => {
    const { container } = render(<Icone id="steak-boeuf" />)
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })
})
