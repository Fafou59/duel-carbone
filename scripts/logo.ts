/**
 * npm run logo : fabrique le logo de Duel Carbone, en SVG pour l'onglet (public/favicon.svg) et en PNG
 * pour l'application installée (public/application/, ticket #16).
 *
 * Choix de Fabien (prototype d'accueil, variante 3) : un carré aux coins arrondis coupé par une diagonale
 * droite, sans trait ; un steak sur fond vert en haut à gauche, un avocat sur fond rouge en bas à droite.
 * Les deux dessins sont les icônes Fluent Emoji du jeu (public/icones/), reprises telles quelles.
 * À relancer seulement si l'une de ces deux icônes change.
 *
 * Les PNG existent en trois variantes, parce que chaque système découpe l'icône à sa façon :
 * - « arrondie » (192 et 512 px) : le logo tel quel, coins transparents ;
 * - « masquable » (512 px, Android) : le fond va jusqu'aux bords, et les dessins sont resserrés au centre,
 *   car Android peut découper l'icône en cercle ou en goutte ;
 * - « apple-touch-icon » (180 px, iPhone) : sans transparence (l'iPhone la remplirait de noir), et
 *   l'iPhone arrondit les coins lui-même.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const fichier = (chemin: string) => fileURLToPath(new URL(`../public/${chemin}`, import.meta.url))
/** Le contenu d'une icône (sans sa balise <svg>), à poser dans le logo. */
const interieur = (id: string) => readFileSync(fichier(`icones/${id}.svg`), 'utf8').match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? ''

const VERT = '#1F6F50'
const ROUGE = '#D93A2B'
const ECHELLE = 0.46
const coin = 30 - 32 * ECHELLE

/**
 * Le logo en SVG. arrondi : coins arrondis (sinon, le fond remplit tout le carré).
 * resserrement : la taille des dessins autour du centre (1 : tels quels ; 0,72 : dans la zone sûre d'Android).
 */
function logo({ arrondi = true, resserrement = 1 } = {}): string {
  const fond = `<rect width="32" height="32" fill="${VERT}"/><path d="M32 0L0 32H32Z" fill="${ROUGE}"/>`
  const dessins = `<g transform="translate(2 2) scale(${ECHELLE})">${interieur('steak-boeuf')}</g>
<g transform="translate(${coin} ${coin}) scale(${ECHELLE})">${interieur('avocat')}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
${arrondi ? `<clipPath id="duel-carbone-coins"><rect width="32" height="32" rx="8"/></clipPath>\n<g clip-path="url(#duel-carbone-coins)">${fond}</g>` : fond}
${resserrement === 1 ? dessins : `<g transform="translate(16 16) scale(${resserrement}) translate(-16 -16)">
${dessins}
</g>`}
</svg>
`
}

writeFileSync(fichier('favicon.svg'), logo(), 'utf8')

// Les PNG de l'application installée : dessinés depuis le SVG, à la taille voulue (density : assez de
// points pour que le dessin reste net à 512 px).
mkdirSync(fichier('application'), { recursive: true })
const png = (svg: string, taille: number, nom: string) =>
  sharp(Buffer.from(svg), { density: (72 * taille) / 32 })
    .resize(taille, taille)
    .png()
    .toFile(fichier(`application/${nom}`))

await Promise.all([
  png(logo(), 192, 'icone-192.png'),
  png(logo(), 512, 'icone-512.png'),
  png(logo({ arrondi: false, resserrement: 0.72 }), 512, 'icone-masquable-512.png'),
  png(logo({ arrondi: false, resserrement: 0.86 }), 180, 'apple-touch-icon.png'),
])
console.log('Logo écrit dans public/favicon.svg et public/application/ (steak sur vert, avocat sur rouge).')
