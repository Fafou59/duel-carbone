/**
 * Les icônes maison des Gestes, dessinées dans le style Fluent Emoji « Flat » (grille de 32 × 32, aplats de couleur).
 * Ticket #14 : quand l'icône officielle n'est pas parlante, on dessine la nôtre.
 *
 * Trois façons de faire, de la plus simple à la plus libre :
 * - recolorer une icône officielle (saumon et cabillaud, trottinette aux roues visibles en mode sombre) ;
 * - assembler des icônes officielles (une mangue avec un badge avion ; un repas sur une assiette ; une pastille France) ;
 * - dessiner à la main, forme par forme (micro-ondes, lave-linge, pulls…).
 * Deux Gestes semblables reçoivent des couleurs différentes, pour les distinguer dans un Duel.
 *
 * `interieur(nom)` donne le contenu d'une icône officielle Fluent (sans sa balise <svg>), fourni par index.ts.
 */

/** Dessine toutes les icônes maison : identifiant du Geste → fichier SVG complet. */
export function dessiner(interieur: (nomFluent: string) => string): Map<string, string> {
  const icones = new Map<string, string>()
  const svg = (contenu: string) =>
    `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">\n${contenu.trim()}\n</svg>\n`
  const ecrire = (id: string, contenu: string) => {
    if (icones.has(id)) throw new Error(`Icône maison « ${id} » dessinée deux fois.`)
    icones.set(id, svg(contenu))
  }
  const recolorer = (contenu: string, couleurs: Record<string, string>) =>
    Object.entries(couleurs).reduce((c, [de, vers]) => c.replaceAll(`"${de}"`, `"${vers}"`), contenu)
  const placer = (contenu: string, x: number, y: number, echelle: number) =>
    `<g transform="translate(${x} ${y}) scale(${echelle})">${contenu}</g>`
  /** Un badge rond blanc, avec une icône officielle à l'intérieur. */
  const badge = (contenu: string, cx: number, cy: number, r: number) => {
    const taille = r * 1.5
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="#D3D3D3"/>${placer(contenu, cx - taille / 2, cy - taille / 2, taille / 32)}`
  }

  // ─── Pièces réutilisées ────────────────────────────────────────────────────────────────
  const assiette = `<ellipse cx="16" cy="21" rx="14.5" ry="7.5" fill="#D3D3D3"/><ellipse cx="16" cy="20.5" rx="11" ry="5.5" fill="#F4F4F4"/>`
  const pull = (principal: string, fonce: string) => `
  <path d="M10 5L6 6.5L2.5 17L6.5 18.5L8.5 13V27C8.5 27.55 8.95 28 9.5 28H22.5C23.05 28 23.5 27.55 23.5 27V13L25.5 18.5L29.5 17L26 6.5L22 5C21 7 19 8.5 16 8.5C13 8.5 11 7 10 5Z" fill="${principal}"/>
  <path d="M10 5C11 7 13 8.5 16 8.5C19 8.5 21 7 22 5" stroke="${fonce}" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="8.5" y="25.5" width="15" height="2.5" rx="1" fill="${fonce}"/>
  <path d="M2.5 17L6.5 18.5L6 20L2 18.5Z" fill="${fonce}"/><path d="M29.5 17L25.5 18.5L26 20L30 18.5Z" fill="${fonce}"/>`
  const drapeauFrance = (cx: number, cy: number, r: number) => `
  <clipPath id="fr"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
  <g clip-path="url(#fr)"><rect x="${cx - r}" y="${cy - r}" width="${(2 * r) / 3}" height="${2 * r}" fill="#0055A4"/><rect x="${cx - r / 3}" y="${cy - r}" width="${(2 * r) / 3}" height="${2 * r}" fill="#FFFFFF"/><rect x="${cx + r / 3}" y="${cy - r}" width="${(2 * r) / 3}" height="${2 * r}" fill="#EF4135"/></g>
  <circle cx="${cx}" cy="${cy}" r="${r}" stroke="#D3D3D3"/>`

  // ─── Alimentation ──────────────────────────────────────────────────────────────────────
  ecrire('tofu', `
  <path d="M16 6L28 11.5L16 17L4 11.5Z" fill="#FFF1C9"/>
  <path d="M4 11.5L16 17V27.5L4 22Z" fill="#F3D58F"/>
  <path d="M28 11.5L16 17V27.5L28 22Z" fill="#E6BE6A"/>
  <circle cx="13" cy="11" r="0.7" fill="#F3D58F"/><circle cx="17.5" cy="9.5" r="0.7" fill="#F3D58F"/><circle cx="19" cy="12.5" r="0.7" fill="#F3D58F"/>`)

  ecrire('pain-au-chocolat', `
  <rect x="3" y="9" width="26" height="15" rx="5" fill="#F3AD61"/>
  <rect x="7" y="10.5" width="11" height="1.4" rx="0.7" fill="#FCD53F"/>
  <path d="M6.5 14H25.5M6 18H26M6.5 21.5H25.5" stroke="#D3883E" stroke-linecap="round"/>
  <rect x="1.5" y="12.5" width="4" height="2.6" rx="1" fill="#6D4534"/><rect x="1.5" y="17.5" width="4" height="2.6" rx="1" fill="#6D4534"/>
  <rect x="26.5" y="12.5" width="4" height="2.6" rx="1" fill="#6D4534"/><rect x="26.5" y="17.5" width="4" height="2.6" rx="1" fill="#6D4534"/>`)

  ecrire('nuggets-vegetaux', `
  <path d="M3 17C3 13.5 6 12 9 12.5C12 13 14 14.5 13.5 18C13 21.5 10 23 7 22.5C4 22 3 20 3 17Z" fill="#F3AD61"/>
  <path d="M12.5 22C13 19 16 17.5 19.5 18.5C23 19.5 24 22 23 25C22 27.5 19 28.5 16 27.5C13 26.5 12 24.5 12.5 22Z" fill="#FFB02E"/>
  <path d="M15 10C16 7 19 6 22 7C25 8 26.5 10.5 25.5 13.5C24.5 16 21.5 17 18.5 16C15.5 15 14.2 12.8 15 10Z" fill="#F3AD61"/>
  <g fill="#D3883E"><circle cx="6" cy="16" r="0.7"/><circle cx="9.5" cy="19" r="0.7"/><circle cx="17" cy="23" r="0.7"/><circle cx="20" cy="25" r="0.7"/><circle cx="19" cy="10" r="0.7"/><circle cx="22" cy="13" r="0.7"/></g>
  ${badge(interieur('Seedling'), 26, 25, 5)}`)

  ecrire('yaourt', `
  <path d="M7.5 9H24.5L22.6 27.6C22.5 28.4 21.8 29 21 29H11C10.2 29 9.5 28.4 9.4 27.6Z" fill="#F4F4F4"/>
  <path d="M8.2 15.5H23.8L23.1 22.5H8.9Z" fill="#00A6ED"/>
  <path d="M14 17.5C14 17.5 16 19.6 16 20.5C16 21.3 15.1 21.8 14.5 21.8C13.9 21.8 13 21.3 13 20.5C13 19.6 14 17.5 14 17.5Z" fill="#FFFFFF"/>
  <rect x="6" y="6" width="20" height="3.5" rx="1.2" fill="#D3D3D3"/>
  <path d="M21 6L25.5 2.5L27 4.5L23.5 6Z" fill="#9B9B9B"/>`)

  ecrire('saumon', recolorer(interieur('Fish'), { '#00A6ED': '#FF8257', '#0074BA': '#F8312F' }))
  ecrire('cabillaud', recolorer(interieur('Fish'), { '#00A6ED': '#9B9B9B', '#0074BA': '#636363' }))

  ecrire('mangue-avion', `${placer(interieur('Mango'), 0, 0, 0.78)}${badge(interieur('Airplane'), 22.5, 22.5, 9)}`)
  ecrire('mangue-bateau', `${placer(interieur('Mango'), 0, 0, 0.78)}${badge(interieur('Anchor'), 22.5, 22.5, 9)}`)

  ecrire('repas-poulet', `${assiette}${placer(interieur('Poultry leg'), 6.5, 5.5, 0.6)}<g fill="#00D26A"><circle cx="23" cy="21.5" r="1.3"/><circle cx="25" cy="20" r="1.3"/><circle cx="24.5" cy="22.8" r="1.3"/></g>`)
  ecrire('repas-boeuf', `${assiette}${placer(interieur('Cut of meat'), 6, 6, 0.58)}<g fill="#FCD53F"><rect x="21" y="17" width="1.6" height="6" rx="0.6" transform="rotate(-15 21 17)"/><rect x="23.5" y="17" width="1.6" height="6" rx="0.6"/><rect x="26" y="17.5" width="1.6" height="5" rx="0.6" transform="rotate(15 26 17)"/></g>`)

  // Repas : tous sur une assiette. Végétarien (salade et fromage), végétalien (brocoli et haricots).
  ecrire('repas-vegetarien', `${assiette}${placer(interieur('Leafy green'), 5, 5.5, 0.55)}${placer(interieur('Cheese wedge'), 15.5, 10, 0.4)}`)
  ecrire('repas-vegetalien', `${assiette}${placer(interieur('Broccoli'), 5, 4.5, 0.58)}${placer(interieur('Beans'), 16, 10.5, 0.4)}`)

  // ─── Boissons ──────────────────────────────────────────────────────────────────────────
  ecrire('eau-bouteille', `
  <rect x="13" y="2.5" width="6" height="3.5" rx="1" fill="#00A6ED"/>
  <path d="M13.5 6H18.5V8C18.5 9 21.5 10 21.5 12.5V27C21.5 28.1 20.6 29 19.5 29H12.5C11.4 29 10.5 28.1 10.5 27V12.5C10.5 10 13.5 9 13.5 8Z" fill="#AEDDFF"/>
  <rect x="10.5" y="15" width="11" height="6" fill="#00A6ED"/>
  <rect x="12.2" y="10.5" width="1.4" height="16" rx="0.7" fill="#FFFFFF" fill-opacity="0.7"/>
  <path d="M10.5 24H21.5" stroke="#83CBFF"/>`)

  ecrire('boisson-soja', `${placer(interieur('Beverage box'), 0, 0, 0.9)}${badge(interieur('Pea pod'), 24.5, 24.5, 6.5)}`)

  // ─── Numérique ─────────────────────────────────────────────────────────────────────────
  ecrire('tablette', `
  <rect x="2" y="6" width="28" height="20" rx="3" fill="#321B41"/>
  <rect x="4.5" y="8" width="21" height="16" rx="1" fill="#83CBFF"/>
  <circle cx="27.8" cy="16" r="1" fill="#636363"/>
  <rect x="7" y="10.5" width="4" height="4" rx="1" fill="#F92F60"/><rect x="13" y="10.5" width="4" height="4" rx="1" fill="#FCD53F"/><rect x="19" y="10.5" width="4" height="4" rx="1" fill="#00D26A"/>
  <rect x="7" y="17" width="4" height="4" rx="1" fill="#00A6ED"/><rect x="13" y="17" width="4" height="4" rx="1" fill="#FF8257"/>`)

  ecrire('ordinateur-fixe', `
  <rect x="9" y="2.5" width="14" height="26" rx="2" fill="#9B9B9B"/>
  <rect x="11" y="4.5" width="10" height="22" rx="1" fill="#636363"/>
  <rect x="12.5" y="7" width="7" height="1.5" rx="0.5" fill="#321B41"/><rect x="12.5" y="10" width="7" height="1.5" rx="0.5" fill="#321B41"/>
  <g fill="#9B9B9B"><rect x="12.5" y="16" width="7" height="0.8" rx="0.4"/><rect x="12.5" y="18" width="7" height="0.8" rx="0.4"/><rect x="12.5" y="20" width="7" height="0.8" rx="0.4"/></g>
  <circle cx="16" cy="24" r="1.2" fill="#00D26A"/>
  <rect x="10" y="28.5" width="3" height="1.5" rx="0.5" fill="#636363"/><rect x="19" y="28.5" width="3" height="1.5" rx="0.5" fill="#636363"/>`)

  ecrire('micro-ondes', `
  <path d="M5 25H8.5L8 28C7.9 28.6 7.4 29 6.8 29C6.1 29 5.6 28.4 5.7 27.7L5 25Z" fill="#636363"/>
  <path d="M27 25H23.5L24 28C24.1 28.6 24.6 29 25.2 29C25.9 29 26.4 28.4 26.3 27.7L27 25Z" fill="#636363"/>
  <path d="M2 9C2 7.34 3.34 6 5 6H27C28.66 6 30 7.34 30 9V23C30 24.66 28.66 26 27 26H5C3.34 26 2 24.66 2 23V9Z" fill="#D3D3D3"/>
  <path d="M4 10C4 8.9 4.9 8 6 8H20C21.1 8 22 8.9 22 10V22C22 23.1 21.1 24 20 24H6C4.9 24 4 23.1 4 22V10Z" fill="#9B9B9B"/>
  <path d="M6 11.5C6 10.67 6.67 10 7.5 10H18.5C19.33 10 20 10.67 20 11.5V20.5C20 21.33 19.33 22 18.5 22H7.5C6.67 22 6 21.33 6 20.5V11.5Z" fill="#FCD53F"/>
  <path d="M18.5 10.5C19.05 10.5 19.5 10.95 19.5 11.5V20.5C19.5 21.05 19.05 21.5 18.5 21.5H7.5C6.95 21.5 6.5 21.05 6.5 20.5V11.5C6.5 10.95 6.95 10.5 7.5 10.5H18.5ZM7.5 9.5C6.4 9.5 5.5 10.4 5.5 11.5V20.5C5.5 21.6 6.4 22.5 7.5 22.5H18.5C19.6 22.5 20.5 21.6 20.5 20.5V11.5C20.5 10.4 19.6 9.5 18.5 9.5H7.5Z" fill="#321B41"/>
  <path d="M9 17H17C17 19.2 15.2 20.5 13 20.5C10.8 20.5 9 19.2 9 17Z" fill="#F92F60"/>
  <ellipse cx="13" cy="20.75" rx="5" ry="0.9" fill="#F4F4F4"/>
  <rect x="23.5" y="9.5" width="5" height="3" rx="0.75" fill="#321B41"/>
  <rect x="24.5" y="10.6" width="3" height="0.8" rx="0.4" fill="#00D26A"/>
  <circle cx="26" cy="16" r="1.5" fill="#636363"/>
  <circle cx="26" cy="20.5" r="1.5" fill="#CA0B4A"/>`)

  // ─── Électroménager ────────────────────────────────────────────────────────────────────
  ecrire('bouilloire', `
  <path d="M22.5 10H25.5C26.6 10 27.5 10.9 27.5 12V20C27.5 21.1 26.6 22 25.5 22H23.5" stroke="#636363" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M9.5 12L3.5 9.5L4.5 12.5L9 15.5Z" fill="#9B9B9B"/>
  <path d="M8 26L10 9C10.1 7.9 11 7 12.2 7H19.8C21 7 21.9 7.9 22 9L24 26Z" fill="#D3D3D3"/>
  <rect x="12" y="5" width="8" height="2.5" rx="1" fill="#9B9B9B"/><rect x="15" y="3.5" width="2" height="2" rx="0.5" fill="#636363"/>
  <rect x="12.5" y="12" width="2" height="11" rx="1" fill="#83CBFF"/>
  <circle cx="18.5" cy="23" r="1" fill="#F92F60"/>
  <rect x="6" y="25.5" width="20" height="3.5" rx="1.5" fill="#636363"/>`)

  ecrire('aspirateur', `
  <path d="M12.5 19C7 19 5 14.5 6 10" stroke="#636363" stroke-width="2" stroke-linecap="round"/>
  <path d="M6 10L4.5 26.5" stroke="#9B9B9B" stroke-width="1.8" stroke-linecap="round"/>
  <rect x="1.5" y="26" width="7" height="2.5" rx="1" fill="#321B41"/>
  <rect x="12" y="13.5" width="17.5" height="11.5" rx="5.75" fill="#F92F60"/>
  <rect x="15" y="15" width="9" height="3" rx="1.5" fill="#CA0B4A"/>
  <circle cx="25" cy="24.5" r="3" fill="#321B41"/><circle cx="25" cy="24.5" r="1.2" fill="#9B9B9B"/>
  <circle cx="14.5" cy="25.5" r="1.6" fill="#321B41"/>`)

  ecrire('cafetiere-dosettes', `
  <path d="M9.5 4H14.5L13.5 1.5H10.5Z" fill="#FFB02E"/>
  <rect x="5" y="4" width="22" height="8" rx="2" fill="#636363"/>
  <rect x="18" y="10" width="9" height="16" rx="1.5" fill="#636363"/>
  <circle cx="22.5" cy="8" r="1.2" fill="#00D26A"/>
  <rect x="10" y="12" width="3" height="2" fill="#321B41"/>
  <path d="M8 17.5H15V22.5C15 23.9 13.9 25 12.5 25H10.5C9.1 25 8 23.9 8 22.5Z" fill="#E6E6E6"/>
  <path d="M15 19H16C16.8 19 17 19.6 17 20.2C17 20.8 16.6 21.5 15.5 21.5H15" stroke="#E6E6E6" stroke-width="1.2"/>
  <ellipse cx="11.5" cy="17.7" rx="3.2" ry="0.8" fill="#6D4534"/>
  <rect x="6" y="25" width="12" height="1.5" rx="0.5" fill="#9B9B9B"/>
  <rect x="5" y="26" width="22" height="3.5" rx="1" fill="#321B41"/>`)

  ecrire('refrigerateur', `
  <rect x="8" y="2" width="16" height="27.5" rx="2.5" fill="#D3D3D3"/>
  <rect x="9" y="3" width="14" height="7.5" rx="1.5" fill="#E6E6E6"/>
  <rect x="9" y="12" width="14" height="16.5" rx="1.5" fill="#E6E6E6"/>
  <rect x="20" y="5" width="1.5" height="4" rx="0.75" fill="#636363"/><rect x="20" y="14" width="1.5" height="6" rx="0.75" fill="#636363"/>
  ${placer(interieur('Snowflake'), 10, 3.7, 0.19)}
  <rect x="9.5" y="29.3" width="2.5" height="1.5" rx="0.5" fill="#636363"/><rect x="20" y="29.3" width="2.5" height="1.5" rx="0.5" fill="#636363"/>`)

  ecrire('lave-vaisselle', `
  <rect x="4" y="4" width="24" height="25" rx="2.5" fill="#D3D3D3"/>
  <path d="M4 6.5C4 5.1 5.1 4 6.5 4H25.5C26.9 4 28 5.1 28 6.5V9H4Z" fill="#636363"/>
  <rect x="7" y="5.5" width="6" height="2" rx="0.5" fill="#321B41"/>
  <circle cx="22" cy="6.5" r="0.9" fill="#00D26A"/><circle cx="25" cy="6.5" r="0.9" fill="#E6E6E6"/>
  <rect x="6" y="11" width="20" height="16" rx="1.5" fill="#E6E6E6"/>
  <rect x="11" y="12.2" width="10" height="1.5" rx="0.75" fill="#9B9B9B"/>
  <g fill="#FFFFFF" stroke="#9B9B9B" stroke-width="0.6"><circle cx="10.5" cy="20.5" r="3.2"/><circle cx="16" cy="20.5" r="3.2"/><circle cx="21.5" cy="20.5" r="3.2"/></g>
  <g fill="#26C9FC"><path d="M13.2 15.8C13.2 15.8 14 16.8 14 17.3C14 17.7 13.6 18 13.2 18C12.8 18 12.4 17.7 12.4 17.3C12.4 16.8 13.2 15.8 13.2 15.8Z"/><path d="M18.8 15.8C18.8 15.8 19.6 16.8 19.6 17.3C19.6 17.7 19.2 18 18.8 18C18.4 18 18 17.7 18 17.3C18 16.8 18.8 15.8 18.8 15.8Z"/></g>`)

  ecrire('lave-linge', `
  <rect x="4" y="3" width="24" height="26" rx="2.5" fill="#E6E6E6"/>
  <path d="M4 5.5C4 4.1 5.1 3 6.5 3H25.5C26.9 3 28 4.1 28 5.5V9H4Z" fill="#D3D3D3"/>
  <rect x="7" y="4.75" width="6" height="2.5" rx="0.5" fill="#9B9B9B"/>
  <circle cx="23.5" cy="6" r="1.8" fill="#9B9B9B"/>
  <circle cx="16" cy="18.5" r="8" fill="#636363"/>
  <circle cx="16" cy="18.5" r="6" fill="#83CBFF"/>
  <path d="M10.2 20C11.5 18.8 12.8 18.8 14.1 20C15.4 21.2 16.6 21.2 17.9 20C19.2 18.8 20.5 18.8 21.8 20A6 6 0 0 1 10.2 20Z" fill="#00A6ED"/>
  <g fill="#FFFFFF"><circle cx="13.5" cy="15.5" r="0.8"/><circle cx="17.5" cy="14.5" r="0.6"/><circle cx="15.5" cy="17" r="0.5"/></g>
  <rect x="6" y="29" width="3" height="1.5" rx="0.5" fill="#636363"/><rect x="23" y="29" width="3" height="1.5" rx="0.5" fill="#636363"/>`)

  // ─── Mobilier ──────────────────────────────────────────────────────────────────────────
  ecrire('table', `
  <rect x="9.5" y="15" width="1.8" height="10" rx="0.9" fill="#6D4534"/><rect x="20.7" y="15" width="1.8" height="10" rx="0.9" fill="#6D4534"/>
  <rect x="5" y="13" width="2.5" height="15" rx="1" fill="#A56953"/><rect x="24.5" y="13" width="2.5" height="15" rx="1" fill="#A56953"/>
  <rect x="5" y="13.5" width="22" height="2" fill="#A56953"/>
  <rect x="2" y="9.5" width="28" height="4.5" rx="1.5" fill="#D3883E"/>
  <rect x="2" y="9.5" width="28" height="1.6" rx="0.8" fill="#F3AD61"/>`)

  ecrire('armoire', `
  <rect x="6" y="3" width="20" height="25" rx="1.5" fill="#A56953"/>
  <rect x="5" y="2" width="22" height="2.5" rx="1" fill="#6D4534"/>
  <rect x="8" y="5.5" width="7.5" height="20.5" rx="0.8" fill="#D3883E"/><rect x="16.5" y="5.5" width="7.5" height="20.5" rx="0.8" fill="#D3883E"/>
  <circle cx="14" cy="16" r="0.8" fill="#FFB02E"/><circle cx="18" cy="16" r="0.8" fill="#FFB02E"/>
  <rect x="7" y="28" width="2.5" height="2.5" fill="#6D4534"/><rect x="22.5" y="28" width="2.5" height="2.5" fill="#6D4534"/>`)

  // ─── Habillement : un même pull, trois couleurs ────────────────────────────────────────
  ecrire('pull-acrylique', pull('#00A6ED', '#0074BA'))
  ecrire('pull-laine', `${pull('#F3AD61', '#D3883E')}
  <path d="M10 16L12 18L14 16L16 18L18 16L20 18L22 16M10 20L12 22L14 20L16 22L18 20L20 22L22 20" stroke="#FFF1C9" stroke-linecap="round" stroke-linejoin="round"/>`)
  ecrire('sweat-coton', `
  <path d="M10.5 5.5C10.5 2 21.5 2 21.5 5.5" fill="#636363"/>
  ${pull('#9B9B9B', '#636363')}
  <path d="M14.5 8.5V13M17.5 8.5V13" stroke="#E6E6E6" stroke-linecap="round"/>
  <rect x="11" y="18.5" width="10" height="5" rx="1.5" fill="#636363" fill-opacity="0.6"/>`)

  // ─── Transport ─────────────────────────────────────────────────────────────────────────
  const voiture = interieur('Automobile')
  ecrire('voiture-electrique-10km', `${recolorer(voiture, { '#F8312F': '#00D26A', '#CA0B4A': '#008463' })}${badge(interieur('High voltage'), 25.5, 6, 5.5)}`)
  const voitureBleue = recolorer(voiture, { '#F8312F': '#00A6ED', '#CA0B4A': '#0074BA' })
  // Covoiturage : voiture bleue et badge « deux silhouettes » (choix de Fabien).
  ecrire('paris-marseille-covoiturage', `${placer(voitureBleue, 0, 4, 0.9)}${badge(interieur('Busts in silhouette'), 24.5, 7.5, 7)}`)
  ecrire('velo-electrique-10km', `${placer(interieur('Bicycle'), 0, 3, 0.9)}${badge(interieur('High voltage'), 25.5, 6, 5.5)}`)

  // Trottinette : roues noires invisibles en mode sombre, on les passe en gris.
  ecrire('trottinette-10km', recolorer(interieur('Kick scooter'), { '#1C1C1C': '#9B9B9B' }))

  // ─── Chauffage ─────────────────────────────────────────────────────────────────────────
  ecrire('chauffage-pac', `
  <rect x="2" y="7" width="27" height="19" rx="2" fill="#E6E6E6"/>
  <rect x="21.5" y="9" width="5.5" height="15" rx="1" fill="#D3D3D3"/>
  <g fill="#9B9B9B"><rect x="22.5" y="11" width="3.5" height="0.8" rx="0.4"/><rect x="22.5" y="13" width="3.5" height="0.8" rx="0.4"/><rect x="22.5" y="15" width="3.5" height="0.8" rx="0.4"/></g>
  <circle cx="11.5" cy="16.5" r="7.8" fill="#636363"/><circle cx="11.5" cy="16.5" r="6.6" fill="#321B41"/>
  <g fill="#9B9B9B"><ellipse cx="11.5" cy="12.8" rx="1.8" ry="3.4"/><ellipse cx="11.5" cy="12.8" rx="1.8" ry="3.4" transform="rotate(120 11.5 16.5)"/><ellipse cx="11.5" cy="12.8" rx="1.8" ry="3.4" transform="rotate(240 11.5 16.5)"/></g>
  <circle cx="11.5" cy="16.5" r="1.2" fill="#D3D3D3"/>
  <rect x="5" y="26" width="4" height="2" rx="0.5" fill="#636363"/><rect x="21" y="26" width="4" height="2" rx="0.5" fill="#636363"/>
  ${badge(interieur('Fire'), 26, 6.5, 5.2)}`)

  // ─── Agrégats nationaux (Gestes réservés du #13) : icône officielle + pastille France ─
  const agregat = (id: string, nom: string) => ecrire(id, `${placer(interieur(nom), 0, 0, 0.84)}${drapeauFrance(25.5, 25.5, 5.5)}`)
  agregat('numerique-france', 'Laptop')
  agregat('aviation-france', 'Airplane')
  agregat('bovins-france', 'Cow')
  agregat('voitures-france', 'Automobile')
  agregat('voitures-france-jour', 'Automobile')
  agregat('chauffage-france', 'House')
  agregat('trains-france', 'Light rail')

  return icones
}
