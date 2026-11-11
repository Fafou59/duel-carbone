// PROTOTYPE JETABLE — le logo retenu (steak sur fond vert, avocat sur fond rouge), aussi en icône d'onglet.
// Trois façons de séparer les deux moitiés, pour choisir la plus légère.
import avocat from '../../public/icones/avocat.svg?raw'
import steak from '../../public/icones/steak-boeuf.svg?raw'

export type Logo = 'eclair' | 'zigzag' | 'diagonale'

export const LOGOS: Record<Logo, string> = {
  eclair: '1 · Avec l’éclair jaune',
  zigzag: '2 · Coupure en zigzag, sans trait',
  diagonale: '3 · Diagonale droite, sans trait',
}

/** Le contenu d'une icône Fluent (sans sa balise <svg>), à poser dans le logo. */
const interieur = (svg: string) => svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? ''

const VERT = '#1F6F50'
const ROUGE = '#D93A2B'
/** La moitié rouge, en bas à droite : en zigzag (comme un éclair) ou en diagonale droite. */
const MOITIE: Record<Logo, string> = {
  eclair: 'M32 0L17 14.5L21.5 15.5L0 32H32Z',
  zigzag: 'M32 0L17 14.5L21.5 15.5L0 32H32Z',
  diagonale: 'M32 0L0 32H32Z',
}

const svg = (logo: Logo) => {
  // Sans le trait jaune, les icônes ont un peu plus de place.
  const echelle = logo === 'eclair' ? 0.42 : 0.46
  const trait =
    logo === 'eclair'
      ? '<path d="M30 2L17 14.5L21.5 15.5L2 30" stroke="#FCD53F" stroke-width="2.2" stroke-linejoin="round" fill="none"/>'
      : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<clipPath id="rond"><rect width="32" height="32" rx="8"/></clipPath>
<g clip-path="url(#rond)"><rect width="32" height="32" fill="${VERT}"/><path d="${MOITIE[logo]}" fill="${ROUGE}"/></g>${trait}
<g transform="translate(2 2) scale(${echelle})">${interieur(steak)}</g>
<g transform="translate(${30 - 32 * echelle} ${30 - 32 * echelle}) scale(${echelle})">${interieur(avocat)}</g>
</svg>`
}

export const adresseLogo = (logo: Logo) => `data:image/svg+xml,${encodeURIComponent(svg(logo))}`

/** Le logo à côté du titre « Duel Carbone ». */
export function ImageLogo({ logo }: { logo: Logo }) {
  return <img className="proto-logo" src={adresseLogo(logo)} alt="" width={36} height={36} />
}
