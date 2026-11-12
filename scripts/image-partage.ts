/**
 * npm run image-partage : fabrique l'image des aperçus de lien (public/apercu-partage.png, 1200 × 630 px).
 *
 * C'est l'image que montrent WhatsApp, LinkedIn, Messenger ou X sous un lien vers duelcarbone.fr (balise
 * og:image de index.html). Elle reprend le logo (public/favicon.svg, fabriqué par npm run logo), le nom du jeu,
 * sa question et la source des chiffres, avec les couleurs de l'application en mode clair (src/index.css).
 *
 * Tout est centré : certaines applications (WhatsApp, par exemple) découpent l'image en carré autour du centre,
 * et le logo comme le nom restent alors visibles.
 * À relancer si le logo ou l'accroche changent. Les réseaux gardent l'ancienne image en mémoire plusieurs jours :
 * pour la remplacer vite, changer aussi le nom du fichier (src/referencement.ts et index.html).
 *
 * Le texte est dessiné avec les polices de l'ordinateur qui lance le script (Segoe UI sous Windows) : le PNG
 * est versionné, on ne le refabrique pas à chaque construction.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { IMAGE_PARTAGE } from '../src/referencement.ts'

const fichier = (chemin: string) => fileURLToPath(new URL(`../public/${chemin}`, import.meta.url))

// Les couleurs du mode clair (src/index.css) et celles du logo (scripts/logo.ts).
const FOND = '#F6F4EE'
const ENCRE = '#1D2320'
const DISCRET = '#5D665F'
const MARQUE = '#1F6F50'
const ROUGE = '#D93A2B'

const { largeur: L, hauteur: H } = IMAGE_PARTAGE
const centre = L / 2
const TAILLE_LOGO = 210

/** Le logo, sans sa balise <svg> d'origine : on le repose à la taille voulue dans un <svg> imbriqué. */
const logo = readFileSync(fichier('favicon.svg'), 'utf8').match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? ''

const POLICE = `'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
/** Une ligne de texte centrée. */
const ligne = (y: number, taille: number, couleur: string, texte: string, graisse = 400) =>
  `<text x="${centre}" y="${y}" font-family="${POLICE}" font-size="${taille}" font-weight="${graisse}" fill="${couleur}" text-anchor="middle">${texte}</text>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}" viewBox="0 0 ${L} ${H}">
<rect width="${L}" height="${H}" fill="${FOND}"/>
<svg x="${centre - TAILLE_LOGO / 2}" y="56" width="${TAILLE_LOGO}" height="${TAILLE_LOGO}" viewBox="0 0 32 32">${logo}</svg>
${ligne(366, 84, ENCRE, 'Duel Carbone', 700)}
${ligne(436, 50, MARQUE, 'Lequel émet le plus ?', 700)}
${ligne(500, 32, ENCRE, 'Deux gestes du quotidien s’affrontent sur leur empreinte carbone.')}
${ligne(556, 28, DISCRET, '10 Duels par jour · Chiffres de l’ADEME · duelcarbone.fr')}
<path d="M0 ${H - 14}H${centre + 14}L${centre} ${H}H0Z" fill="${MARQUE}"/>
<path d="M${centre + 14} ${H - 14}H${L}V${H}H${centre}Z" fill="${ROUGE}"/>
</svg>
`

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(fichier(IMAGE_PARTAGE.fichier))
console.log(`Image de partage écrite dans public/${IMAGE_PARTAGE.fichier} (${L} × ${H} px).`)
