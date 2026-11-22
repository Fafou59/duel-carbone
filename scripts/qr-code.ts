/**
 * npm run qr-code : fabrique les QR codes du jeu, aux couleurs de Duel Carbone (public/qr-code-*.svg).
 * Le premier (#98) s'affiche sur ordinateur à la fin du Duel du jour, sous « joue sur ton téléphone ».
 *
 * Les adresses ne changent pas : les dessins sont fabriqués une fois pour toutes ici, et versionnés. La bibliothèque
 * qrcode ne sert qu'à ce script (dépendance de développement) : rien n'est ajouté au code que télécharge le joueur.
 * Elle calcule la grille de carrés ; le dessin est fait ici. À relancer si une adresse ou le logo change.
 *
 * Chaque QR code porte sa provenance (« ?ref=… ») : GoatCounter la lit comme un site d'origine et range ces arrivées
 * sous ce nom dans ses provenances (Referrers). Une étiquette par QR code, la même pour tout le monde : elle dit
 * d'où l'on vient, jamais qui l'on est. Le jeu l'efface de la barre d'adresse une fois la visite comptée
 * (src/navigateur/mesure.ts, effacerProvenance) ; la page comptée reste « / », grâce au lien canonique d'index.html.
 *
 * Le dessin :
 * - les trois repères des coins, en vert, aux coins arrondis ; les autres carrés à l'encre du jeu, sur fond blanc
 *   (même en thème sombre : c'est le contraste que tous les lecteurs savent lire) ;
 * - le logo au centre, sur une réserve blanche : la correction d'erreurs « H » permet de lire le code même si
 *   30 % de ses carrés manquent, et le logo n'en cache qu'environ 12 % ;
 * - une marge blanche de 4 carrés tout autour (la « zone calme » prévue par la norme).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import QRCode from 'qrcode'
import { ADRESSE_DU_JEU } from '../src/domaine/partage.ts'

/** Les QR codes du jeu : le fichier fabriqué dans public/, et la provenance que GoatCounter affichera. */
const QR_CODES = [{ fichier: 'qr-code-pc.svg', provenance: 'qr-code-pc' }]

const fichier = (chemin: string) => fileURLToPath(new URL(`../public/${chemin}`, import.meta.url))

const VERT = '#1F6F50'
const ENCRE = '#1d2320'
const MARGE = 4
/** Côté du repère d'un coin, en carrés (fixé par la norme). */
const REPERE = 7

/** Le logo du jeu (public/favicon.svg), sans sa balise <svg>, à poser au centre. */
const logo = readFileSync(fichier('favicon.svg'), 'utf8').match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1]?.trim() ?? ''

/** Le tracé d'un carré aux coins arrondis (côté c, rayon r), pour le combiner avec d'autres dans un même chemin. */
function carreArrondi(x: number, y: number, c: number, r: number): string {
  const d = c - 2 * r
  return (
    `M${x + r} ${y}h${d}a${r} ${r} 0 0 1 ${r} ${r}v${d}a${r} ${r} 0 0 1 -${r} ${r}` +
    `h-${d}a${r} ${r} 0 0 1 -${r} -${r}v-${d}a${r} ${r} 0 0 1 ${r} -${r}z`
  )
}

function dessiner(adresse: string): { svg: string; cote: number } {
  const { modules } = QRCode.create(adresse, { errorCorrectionLevel: 'H' })
  const n = modules.size
  const cote = n + 2 * MARGE

  // La réserve du centre : un carré d'un nombre impair de cases (centré sur la grille), soit environ 35 % du côté.
  // Le logo s'y pose avec une case blanche de chaque côté.
  const reserve = Math.round(n * 0.35) | 1
  const debutReserve = (n - reserve) / 2
  const dansReserve = (i: number) => i >= debutReserve && i < debutReserve + reserve
  const dansRepere = (l: number, c: number) =>
    (l < REPERE && c < REPERE) || (l < REPERE && c >= n - REPERE) || (l >= n - REPERE && c < REPERE)

  let carres = ''
  for (let l = 0; l < n; l++) {
    for (let c = 0; c < n; c++) {
      if (!modules.get(l, c) || dansRepere(l, c) || (dansReserve(l) && dansReserve(c))) continue
      carres += `M${c + MARGE} ${l + MARGE}h1v1h-1z`
    }
  }

  // Un repère : un anneau de 7 cases aux coins arrondis, et un carré plein de 3 cases au milieu.
  const repere = (x: number, y: number) =>
    `<path fill="${VERT}" fill-rule="evenodd" d="${carreArrondi(x, y, REPERE, 2.5)}${carreArrondi(x + 1, y + 1, 5, 1.4)}"/>` +
    `<rect fill="${VERT}" x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9"/>`

  const tailleLogo = reserve - 2
  const positionLogo = MARGE + debutReserve + 1
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cote} ${cote}">
<rect width="${cote}" height="${cote}" fill="#ffffff"/>
<path fill="${ENCRE}" shape-rendering="crispEdges" d="${carres}"/>
${repere(MARGE, MARGE)}
${repere(MARGE + n - REPERE, MARGE)}
${repere(MARGE, MARGE + n - REPERE)}
<svg x="${positionLogo}" y="${positionLogo}" width="${tailleLogo}" height="${tailleLogo}" viewBox="0 0 32 32">
${logo}
</svg>
</svg>
`
  return { svg, cote }
}

for (const { fichier: nom, provenance } of QR_CODES) {
  const adresse = `${ADRESSE_DU_JEU}/?ref=${provenance}`
  const { svg, cote } = dessiner(adresse)
  writeFileSync(fichier(nom), svg, 'utf8')
  console.log(`QR code de ${adresse} enregistré dans public/${nom} (${cote} × ${cote} cases, marge comprise)`)
}
