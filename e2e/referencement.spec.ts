import { expect, test } from '@playwright/test'

/**
 * Ce que reçoivent les robots (moteurs de recherche, aperçus de lien), servi par le site construit.
 * Le contenu des balises est vérifié par src/referencement.test.ts ; ici, on vérifie que les fichiers sont bien
 * servis, sans JavaScript, et que le service worker (le mode hors ligne) ne les remplace pas par le jeu.
 */

/** Les dimensions d'une image PNG, lues dans son en-tête (largeur et hauteur aux octets 16 et 20). */
const dimensionsPng = (octets: Buffer) => ({ largeur: octets.readUInt32BE(16), hauteur: octets.readUInt32BE(20) })

test('l’image de partage est un PNG de 1200 × 630', async ({ request }) => {
  const reponse = await request.get('/apercu-partage.png')
  expect(reponse.status()).toBe(200)
  expect(reponse.headers()['content-type']).toBe('image/png')
  expect(dimensionsPng(await reponse.body())).toEqual({ largeur: 1200, hauteur: 630 })
})

test('robots.txt et sitemap.xml sont servis tels quels', async ({ request }) => {
  const robots = await request.get('/robots.txt')
  expect(robots.status()).toBe(200)
  expect(await robots.text()).toContain('Sitemap: https://duelcarbone.fr/sitemap.xml')

  const plan = await request.get('/sitemap.xml')
  expect(plan.status()).toBe(200)
  expect(plan.headers()['content-type']).toMatch(/xml/)
  expect(await plan.text()).toContain('<loc>https://duelcarbone.fr/</loc>')
})

test.describe('sans JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('la page présente le jeu et dit comment jouer', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Duel Carbone' })).toBeVisible()
    await expect(page.getByText(/Lequel émet le plus/).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Impact CO2/ })).toHaveAttribute('href', 'https://impactco2.fr')
    await expect(page.getByText(/active JavaScript/)).toBeVisible()
  })
})

test('avec JavaScript, la présentation laisse la place au jeu', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Partie libre' }).first()).toBeVisible()
  await expect(page.getByText(/active JavaScript/)).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
})

test.describe('avec le service worker (mode hors ligne)', () => {
  // Les autres tests le coupent (playwright.config.ts) ; ici, on veut justement le voir à l'œuvre.
  test.use({ serviceWorkers: 'allow' })

  test('ne remplace ni robots.txt, ni sitemap.xml, ni l’image de partage par le jeu', async ({ page }) => {
    await page.goto('/')
    // On attend que le service worker soit installé et pilote la page (il se met en place à la première visite).
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)

    // L'image de partage ne sert qu'aux réseaux : elle n'est pas gardée en copie sur l'appareil des joueurs.
    const copies = await page.evaluate(async () => {
      const adresses: string[] = []
      for (const nom of await caches.keys()) {
        for (const requete of await (await caches.open(nom)).keys()) adresses.push(requete.url)
      }
      return adresses
    })
    expect(copies.some((adresse) => adresse.includes('apercu-partage'))).toBe(false)

    // Ouvrir ces adresses dans le navigateur ne doit pas afficher le jeu (la page de secours du service worker).
    await page.goto('/robots.txt')
    await expect(page.locator('body')).toContainText('Sitemap: https://duelcarbone.fr/sitemap.xml')
    await page.goto('/sitemap.xml')
    await expect(page.locator('body')).toContainText('https://duelcarbone.fr/')
    await expect(page.locator('#root')).toHaveCount(0)
    const image = await page.goto('/apercu-partage.png')
    expect(image?.headers()['content-type']).toBe('image/png')
  })
})
