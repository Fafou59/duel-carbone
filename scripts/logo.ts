/**
 * npm run logo : fabrique le logo de Duel Carbone (public/favicon.svg), aussi utilisé comme icône d'onglet.
 *
 * Choix de Fabien (prototype d'accueil, variante 3) : un carré aux coins arrondis coupé par une diagonale
 * droite, sans trait ; un steak sur fond vert en haut à gauche, un avocat sur fond rouge en bas à droite.
 * Les deux dessins sont les icônes Fluent Emoji du jeu (public/icones/), reprises telles quelles.
 * À relancer seulement si l'une de ces deux icônes change.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fichier = (chemin: string) => fileURLToPath(new URL(`../public/${chemin}`, import.meta.url))
/** Le contenu d'une icône (sans sa balise <svg>), à poser dans le logo. */
const interieur = (id: string) => readFileSync(fichier(`icones/${id}.svg`), 'utf8').match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? ''

const VERT = '#1F6F50'
const ROUGE = '#D93A2B'
const ECHELLE = 0.46
const coin = 30 - 32 * ECHELLE

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<clipPath id="duel-carbone-coins"><rect width="32" height="32" rx="8"/></clipPath>
<g clip-path="url(#duel-carbone-coins)"><rect width="32" height="32" fill="${VERT}"/><path d="M32 0L0 32H32Z" fill="${ROUGE}"/></g>
<g transform="translate(2 2) scale(${ECHELLE})">${interieur('steak-boeuf')}</g>
<g transform="translate(${coin} ${coin}) scale(${ECHELLE})">${interieur('avocat')}</g>
</svg>
`

writeFileSync(fichier('favicon.svg'), svg, 'utf8')
console.log('Logo écrit dans public/favicon.svg (steak sur vert, avocat sur rouge).')
