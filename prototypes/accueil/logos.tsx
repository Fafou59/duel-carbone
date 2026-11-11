// PROTOTYPE JETABLE — trois propositions de logo (aussi utilisées comme icône d'onglet), style Fluent « Flat ».

export type Logo = 'aucun' | 'nuages' | 'balance' | 'eclair'

export const LOGOS: Record<Logo, string> = {
  aucun: 'Sans logo (actuel)',
  nuages: 'A · Deux nuages en duel',
  balance: 'B · La balance',
  eclair: 'C · L’éclair du duel',
}

const SVG: Record<Exclude<Logo, 'aucun'>, string> = {
  // A : deux nuages de CO2 face à face, un gros et un petit, et l'éclair du duel entre les deux.
  nuages: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" rx="8" fill="#1F6F50"/>
<g fill="#FFFFFF"><circle cx="7.5" cy="19" r="4"/><circle cx="11.5" cy="15.5" r="5"/><circle cx="14.5" cy="20" r="3.5"/><rect x="3.5" y="19" width="12" height="5" rx="2.5"/></g>
<g fill="#86D9A8"><circle cx="23" cy="21.5" r="2.6"/><circle cx="25.8" cy="19.6" r="3"/><circle cx="27.6" cy="22.4" r="2"/><rect x="20.4" y="21.6" width="8.8" height="3" rx="1.5"/></g>
<path d="M20.5 5L17.5 12H20L18.2 17.5L23.5 10H20.8L22.8 5Z" fill="#FCD53F"/>
</svg>`,
  // B : une balance qui penche du côté du nuage (le plus émetteur), une feuille sur l'autre plateau.
  balance: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" rx="8" fill="#1F6F50"/>
<g stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M16 7V25"/><path d="M11 25H21"/><path d="M6 13L26 9"/><path d="M6 13L3 20M6 13L9 20"/><path d="M26 9L23 16M26 9L29 16"/></g>
<path d="M2.5 20H9.5A3.5 2.2 0 0 1 2.5 20Z" fill="#FFFFFF"/><path d="M22.5 16H29.5A3.5 2.2 0 0 1 22.5 16Z" fill="#FFFFFF"/>
<g fill="#D3D3D3"><circle cx="4.6" cy="18" r="1.6"/><circle cx="6.6" cy="17.2" r="2"/><circle cx="8" cy="18.4" r="1.3"/></g>
<path d="M26 15.3C24.2 15.3 23.6 13.6 24.4 12.2C25.3 10.8 27.4 10.6 28.2 10.3C28.2 11.4 28.4 13.6 27.5 14.6C27.1 15 26.6 15.3 26 15.3Z" fill="#86D9A8"/>
<circle cx="16" cy="7" r="1.6" fill="#FCD53F"/>
</svg>`,
  // C : un badge coupé en deux par un éclair, comme un écran de « versus » : vert d'un côté, carbone de l'autre.
  eclair: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<clipPath id="rond"><rect width="32" height="32" rx="8"/></clipPath>
<g clip-path="url(#rond)"><rect width="32" height="32" fill="#1F6F50"/><path d="M32 0L17 14.5L21.5 15.5L0 32H32Z" fill="#B4501A"/></g>
<path d="M30 2L17 14.5L21.5 15.5L2 30" stroke="#FCD53F" stroke-width="2.2" stroke-linejoin="round" fill="none"/>
<path d="M9.5 13.5C6.5 13.5 5.5 10.8 6.8 8.5C8.2 6.2 11.6 5.9 13 5.4C13 7.2 13.3 10.8 11.8 12.4C11.2 13.1 10.4 13.5 9.5 13.5Z" fill="#86D9A8"/>
<g fill="#FFFFFF"><circle cx="20.5" cy="24" r="2.4"/><circle cx="23.5" cy="22" r="3"/><circle cx="26" cy="24.5" r="2"/><rect x="18.5" y="24" width="9.5" height="2.8" rx="1.4"/></g>
</svg>`,
}

export const adresseLogo = (logo: Exclude<Logo, 'aucun'>) => `data:image/svg+xml,${encodeURIComponent(SVG[logo])}`

/** Le logo à côté du titre « Duel Carbone ». */
export function ImageLogo({ logo }: { logo: Logo }) {
  if (logo === 'aucun') return null
  return <img className="proto-logo" src={adresseLogo(logo)} alt="" width={36} height={36} />
}
