/**
 * Dessine l'image de partage au format Story (#79) sur l'appareil du joueur, avec un Canvas : rien ne part
 * vers un serveur. La mise en page (ce qui est écrit et où) vient de src/domaine/image-de-partage.ts, testée
 * à part ; ici, on ne fait que suivre ses instructions. jsdom ne sait pas dessiner : ce fichier se vérifie
 * en ouvrant l'image dans un vrai navigateur.
 */
import { iconeDe } from '../donnees/icones.ts'
import {
  COULEURS,
  IMAGE_STORY,
  OPACITE_FILIGRANE,
  miseEnPageDeLImage,
  type DonneesImage,
  type Element,
} from '../domaine/image-de-partage.ts'

/** Les polices du jeu (src/index.css) : celles du téléphone, Roboto sur Android, celle d'Apple sur iPhone. */
const POLICE = `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
const LOGO = `${import.meta.env.BASE_URL}favicon.svg`

type Contexte = CanvasRenderingContext2D

export async function fabriquerImageDePartage(donnees: DonneesImage): Promise<Blob> {
  const toile = document.createElement('canvas')
  toile.width = IMAGE_STORY.largeur
  toile.height = IMAGE_STORY.hauteur
  const ctx = toile.getContext('2d')
  if (!ctx) throw new Error('Ce navigateur ne sait pas dessiner.')

  const elements = miseEnPageDeLImage(donnees)
  const images = await chargerLesImages(elements)
  for (const element of elements) dessiner(ctx, element, images)

  return new Promise((resoudre, rejeter) =>
    toile.toBlob((image) => (image ? resoudre(image) : rejeter(new Error('Image vide.'))), 'image/png'),
  )
}

/** Le logo et les icônes du filigrane, chacun une seule fois. Une icône qui ne se charge pas est simplement omise. */
async function chargerLesImages(elements: Element[]): Promise<Map<string, HTMLImageElement>> {
  const adresses = new Map<string, number>()
  for (const e of elements) {
    if (e.sorte === 'logo') adresses.set(LOGO, e.taille)
    if (e.sorte === 'filigrane') adresses.set(iconeDe(e.id), e.taille)
  }
  const images = new Map<string, HTMLImageElement>()
  await Promise.all(
    [...adresses].map(async ([adresse, taille]) => {
      const image = await chargerSvg(adresse, taille).catch(() => null)
      if (image) images.set(adresse, image)
    }),
  )
  return images
}

/**
 * Charge un SVG à la taille voulue. On réécrit sa largeur et sa hauteur : Firefox refuse de dessiner un SVG
 * qui n'en a pas (c'est le cas du logo), et le dessin est ainsi net à la taille de l'image.
 */
async function chargerSvg(adresse: string, taille: number): Promise<HTMLImageElement> {
  const reponse = await fetch(adresse)
  if (!reponse.ok) throw new Error(`${adresse} : ${reponse.status}`)
  const svg = (await reponse.text()).replace(/<svg\b([^>]*)>/, (_, attributs: string) => {
    const sansTaille = attributs.replace(/\s(width|height)="[^"]*"/g, '')
    return `<svg${sansTaille} width="${taille}" height="${taille}">`
  })
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

function dessiner(ctx: Contexte, e: Element, images: Map<string, HTMLImageElement>): void {
  switch (e.sorte) {
    case 'rectangle':
      rectangleArrondi(ctx, e.x, e.y, e.largeur, e.hauteur, e.rayon)
      ctx.fillStyle = e.couleur
      ctx.fill()
      if (e.bordure) {
        ctx.strokeStyle = e.bordure
        ctx.lineWidth = 3
        ctx.stroke()
      }
      return
    case 'filigrane': {
      const image = images.get(iconeDe(e.id))
      if (!image) return
      ctx.save()
      ctx.globalAlpha = OPACITE_FILIGRANE
      ctx.translate(e.x + e.taille / 2, e.y + e.taille / 2)
      ctx.rotate((e.angle * Math.PI) / 180)
      ctx.drawImage(image, -e.taille / 2, -e.taille / 2, e.taille, e.taille)
      ctx.restore()
      return
    }
    case 'logo': {
      const image = images.get(LOGO)
      if (image) ctx.drawImage(image, e.x, e.y, e.taille, e.taille)
      return
    }
    case 'texte':
      ctx.font = `${e.graisse} ${e.taille}px ${POLICE}`
      ctx.fillStyle = e.couleur
      ctx.textAlign = e.alignement
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(e.texte, e.x, e.y, e.largeurMax)
      return
    case 'case':
      dessinerCase(ctx, e)
      return
  }
}

/** Une case de la grille : un carré arrondi vert (✓) ou rouge (✗), le signe tracé en blanc. */
function dessinerCase(ctx: Contexte, { x, y, cote, bonne }: Extract<Element, { sorte: 'case' }>): void {
  rectangleArrondi(ctx, x, y, cote, cote, cote * 0.21)
  ctx.fillStyle = bonne ? COULEURS.bon : COULEURS.mauvais
  ctx.fill()
  // Le signe, dessiné pour une case de 66 px puis mis à l'échelle.
  const k = cote / 66
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(k, k)
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  if (bonne) {
    ctx.moveTo(18, 34)
    ctx.lineTo(29, 45)
    ctx.lineTo(49, 23)
  } else {
    ctx.moveTo(21, 21)
    ctx.lineTo(45, 45)
    ctx.moveTo(45, 21)
    ctx.lineTo(21, 45)
  }
  ctx.stroke()
  ctx.restore()
}

/** Un rectangle aux coins arrondis (ctx.roundRect n'existe pas sur les navigateurs d'avant 2023). */
function rectangleArrondi(ctx: Contexte, x: number, y: number, largeur: number, hauteur: number, rayon: number): void {
  ctx.beginPath()
  ctx.moveTo(x + rayon, y)
  ctx.arcTo(x + largeur, y, x + largeur, y + hauteur, rayon)
  ctx.arcTo(x + largeur, y + hauteur, x, y + hauteur, rayon)
  ctx.arcTo(x, y + hauteur, x, y, rayon)
  ctx.arcTo(x, y, x + largeur, y, rayon)
  ctx.closePath()
}
