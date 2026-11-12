import { describe, expect, it } from 'vitest'
// « ?raw » : Vite donne le contenu brut du fichier, tel que le serveur l'enverra aux robots.
import html from '../index.html?raw'
import robots from '../public/robots.txt?raw'
import sitemap from '../public/sitemap.xml?raw'
import { ADRESSE_CANONIQUE, IMAGE_PARTAGE, TITRE_ACCUEIL } from './referencement.ts'

/**
 * Ce que lisent les robots sans lancer le JavaScript : moteurs de recherche et aperçus de lien.
 * (Le service des fichiers par le site construit est vérifié de bout en bout : e2e/referencement.spec.ts.)
 */
const page = new DOMParser().parseFromString(html, 'text/html')
/** Le contenu d'une balise <meta>, cherchée par son attribut property (Open Graph) ou name (les autres). */
const meta = (cle: string) =>
  page.querySelector(`meta[property="${cle}"], meta[name="${cle}"]`)?.getAttribute('content') ?? null

describe('index.html : la page lue par les moteurs de recherche', () => {
  it('a le titre de l’accueil, le même que celui que le jeu affiche ensuite', () => {
    expect(page.title).toBe(TITRE_ACCUEIL)
  })

  it('a une description qui dit ce qu’on fait et d’où viennent les chiffres', () => {
    const description = meta('description')
    expect(description).toMatch(/Lequel émet le plus/)
    expect(description).toMatch(/ADEME/)
    // Au-delà d'environ 160 caractères, Google coupe la description dans ses résultats.
    expect(description!.length).toBeLessThanOrEqual(160)
  })

  it('désigne duelcarbone.fr comme adresse officielle (l’ancienne adresse workers.dev sert aussi le jeu)', () => {
    expect(page.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(ADRESSE_CANONIQUE)
  })
})

describe('index.html : l’aperçu d’un lien partagé (Open Graph et carte X)', () => {
  it('décrit le site en français, à son adresse officielle', () => {
    expect(meta('og:type')).toBe('website')
    expect(meta('og:locale')).toBe('fr_FR')
    expect(meta('og:site_name')).toBe('Duel Carbone')
    expect(meta('og:url')).toBe(ADRESSE_CANONIQUE)
    expect(meta('og:title')).toBe(TITRE_ACCUEIL)
    expect(meta('og:description')).toMatch(/ADEME/)
  })

  it('montre l’image de partage, en adresse complète et avec ses dimensions', () => {
    // Une adresse relative (« /apercu-partage.png ») n'est pas comprise par tous les réseaux.
    expect(meta('og:image')).toBe(`${ADRESSE_CANONIQUE}${IMAGE_PARTAGE.fichier}`)
    expect(meta('og:image:type')).toBe('image/png')
    expect(meta('og:image:width')).toBe(String(IMAGE_PARTAGE.largeur))
    expect(meta('og:image:height')).toBe(String(IMAGE_PARTAGE.hauteur))
    expect(meta('og:image:alt')).toMatch(/Duel Carbone/)
  })

  it('demande à X une grande image (les autres réseaux lisent les balises Open Graph)', () => {
    expect(meta('twitter:card')).toBe('summary_large_image')
  })
})

describe('index.html : une présentation lisible sans JavaScript', () => {
  // Le jeu est dessiné par React, dans le navigateur : sans JavaScript, la page serait vide.
  const presentation = page.querySelector('noscript')?.textContent ?? ''

  it('présente le jeu et cite la source des chiffres', () => {
    expect(presentation).toMatch(/Duel Carbone/)
    expect(presentation).toMatch(/Lequel émet le plus/)
    expect(presentation).toMatch(/ADEME/)
    // DOMParser lit le contenu de <noscript> comme du HTML (il ne lance pas de JavaScript) : on y trouve le lien.
    expect(page.querySelector('noscript a')?.getAttribute('href')).toBe('https://impactco2.fr')
  })

  it('dit comment jouer', () => {
    expect(presentation).toMatch(/active JavaScript/)
  })
})

describe('robots.txt et sitemap.xml', () => {
  it('robots.txt laisse tout explorer et indique le plan du site', () => {
    expect(robots).toMatch(/^User-agent: \*$/m)
    expect(robots).not.toMatch(/^Disallow: \/\S*$/m)
    expect(robots).toMatch(/^Sitemap: https:\/\/duelcarbone\.fr\/sitemap\.xml$/m)
  })

  it('robots.txt s’écrit sans accent (Cloudflare le sert sans encodage : « é » s’afficherait « Ã© »)', () => {
    expect(robots).toMatch(/^[\x20-\x7E\n]*$/)
  })

  it('sitemap.xml ne liste que l’accueil (En savoir plus est une ancre, invisible pour les moteurs)', () => {
    const plan = new DOMParser().parseFromString(sitemap, 'application/xml')
    expect(plan.querySelector('parsererror')).toBeNull()
    expect(plan.documentElement.namespaceURI).toBe('http://www.sitemaps.org/schemas/sitemap/0.9')
    expect([...plan.getElementsByTagName('loc')].map((loc) => loc.textContent?.trim())).toEqual([ADRESSE_CANONIQUE])
  })
})
