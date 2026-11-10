/**
 * L'éclat de confettis d'un bon choix : une trentaine de particules jaillissent du centre d'une carte
 * et retombent en une seconde (variante A du prototype `prototype/animations`).
 *
 * Dessiné sur un <canvas> posé par-dessus la page, puis retiré : aucune dépendance.
 * Rien ne se passe si le joueur a demandé à réduire les animations.
 */
import { mouvementReduit } from '../navigateur/mouvement.ts'

const NOMBRE = 28
const DUREE_S = 1
const GRAVITE = 420 // px/s²
const FROTTEMENT = 2.2 // freinage par seconde
const VITESSE = [140, 340] // px/s
const TAILLE = [4, 8] // px

type Particule = { x: number; y: number; vx: number; vy: number; rot: number; vrot: number; taille: number; couleur: string; rond: boolean }

const entre = (min: number, max: number) => min + Math.random() * (max - min)

/** Lance l'éclat depuis le centre de `origine` (coordonnées de l'écran). Renvoie de quoi l'arrêter. */
export function lancerEclat(origine: DOMRect): () => void {
  if (mouvementReduit()) return () => {}
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  // Par-dessus toute la page, sans jamais intercepter un clic.
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:10'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.append(canvas)
  // Écran haute densité : on dessine plus de pixels, sans dépasser ×2 (inutile et coûteux).
  const densite = Math.min(window.devicePixelRatio || 1, 2)
  const largeur = window.innerWidth
  const hauteur = window.innerHeight
  canvas.width = largeur * densite
  canvas.height = hauteur * densite
  ctx.setTransform(densite, 0, 0, densite, 0, 0)

  const style = getComputedStyle(document.documentElement)
  const couleurs = [style.getPropertyValue('--bon'), style.getPropertyValue('--marque'), '#e3b341', '#8fd3a8']
  const x = origine.left + origine.width / 2
  const y = origine.top + origine.height / 2
  const particules: Particule[] = Array.from({ length: NOMBRE }, () => {
    const angle = Math.random() * 2 * Math.PI
    const vitesse = entre(VITESSE[0], VITESSE[1])
    return {
      x,
      y,
      vx: Math.cos(angle) * vitesse,
      vy: Math.sin(angle) * vitesse,
      rot: Math.random() * 2 * Math.PI,
      vrot: entre(-7, 7),
      taille: entre(TAILLE[0], TAILLE[1]),
      couleur: couleurs[Math.floor(Math.random() * couleurs.length)].trim(),
      rond: Math.random() < 0.5,
    }
  })

  let debut: number | null = null
  let precedent = 0
  let image = 0
  const arreter = () => {
    cancelAnimationFrame(image)
    canvas.remove()
  }

  const dessiner = (instant: number) => {
    if (debut === null) debut = precedent = instant
    const ecoule = (instant - debut) / 1000
    const dt = Math.min(0.033, (instant - precedent) / 1000)
    precedent = instant
    if (ecoule > DUREE_S) return arreter()

    ctx.clearRect(0, 0, largeur, hauteur)
    // Les particules s'effacent pendant le dernier tiers.
    ctx.globalAlpha = Math.min(1, (DUREE_S - ecoule) / (DUREE_S * 0.3))
    const frein = Math.exp(-FROTTEMENT * dt)
    for (const p of particules) {
      p.vy += GRAVITE * dt
      p.vx *= frein
      p.vy *= frein
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vrot * dt
      ctx.save()
      ctx.fillStyle = p.couleur
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      if (p.rond) {
        ctx.beginPath()
        ctx.arc(0, 0, p.taille / 2, 0, 2 * Math.PI)
        ctx.fill()
      } else {
        ctx.fillRect(-p.taille / 2, -p.taille * 0.3, p.taille, p.taille * 0.6)
      }
      ctx.restore()
    }
    image = requestAnimationFrame(dessiner)
  }
  image = requestAnimationFrame(dessiner)
  return arreter
}
