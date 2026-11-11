// PROTOTYPE JETABLE — le logo retenu (variante C : un badge coupé en deux par un éclair), aussi en icône d'onglet.
import avocat from '../../public/icones/avocat.svg?raw'
import steak from '../../public/icones/steak-boeuf.svg?raw'

export type Logo = 'steak-avocat' | 'eclair'

export const LOGOS: Record<Logo, string> = {
  'steak-avocat': 'C · Steak et avocat',
  eclair: 'C · Feuille et nuage (avant)',
}

/** Le contenu d'une icône Fluent (sans sa balise <svg>), à poser dans le logo. */
const interieur = (svg: string) => svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? ''

// Le fond commun : vert en haut à gauche, rouge en bas à droite, séparés par un éclair jaune.
const fond = (bas: string) => `
<clipPath id="rond"><rect width="32" height="32" rx="8"/></clipPath>
<g clip-path="url(#rond)"><rect width="32" height="32" fill="#1F6F50"/><path d="M32 0L17 14.5L21.5 15.5L0 32H32Z" fill="${bas}"/></g>
<path d="M30 2L17 14.5L21.5 15.5L2 30" stroke="#FCD53F" stroke-width="2.2" stroke-linejoin="round" fill="none"/>`

const SVG: Record<Logo, string> = {
  // Comme un yin et un yang : le steak (gros émetteur) sur le vert, l'avocat sur le rouge.
  'steak-avocat': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${fond('#D93A2B')}
<g transform="translate(2.5 2.5) scale(0.42)">${interieur(steak)}</g>
<g transform="translate(16.5 16.5) scale(0.42)">${interieur(avocat)}</g>
</svg>`,
  eclair: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${fond('#B4501A')}
<path d="M9.5 13.5C6.5 13.5 5.5 10.8 6.8 8.5C8.2 6.2 11.6 5.9 13 5.4C13 7.2 13.3 10.8 11.8 12.4C11.2 13.1 10.4 13.5 9.5 13.5Z" fill="#86D9A8"/>
<g fill="#FFFFFF"><circle cx="20.5" cy="24" r="2.4"/><circle cx="23.5" cy="22" r="3"/><circle cx="26" cy="24.5" r="2"/><rect x="18.5" y="24" width="9.5" height="2.8" rx="1.4"/></g>
</svg>`,
}

export const adresseLogo = (logo: Logo) => `data:image/svg+xml,${encodeURIComponent(SVG[logo])}`

/** Le logo à côté du titre « Duel Carbone ». */
export function ImageLogo({ logo }: { logo: Logo }) {
  return <img className="proto-logo" src={adresseLogo(logo)} alt="" width={36} height={36} />
}
