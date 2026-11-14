import { expect, test } from '@playwright/test'

/**
 * La mise en page de l'accueil, sur ordinateur et sur téléphone : ce que les tests unitaires (sans affichage
 * réel) ne voient pas.
 */
for (const [appareil, viewport] of [
  ['ordinateur', { width: 1034, height: 830 }],
  ['téléphone', { width: 375, height: 812 }],
] as const) {
  test.describe(appareil, () => {
    test.use({ viewport })

    test('la vitrine reste un bloc resserré, centré, avec le « VS » au milieu', async ({ page }) => {
      await page.goto('/')
      const vitrine = page.locator('.vitrine')
      const boite = await vitrine.boundingBox()
      const vs = await page.locator('.vitrine__vs').boundingBox()
      if (!boite || !vs) throw new Error('vitrine introuvable')
      // Deux colonnes de 72 px, le « VS » et leurs espacements : environ 220 px, jamais toute la largeur.
      expect(boite.width).toBeLessThan(260)
      const centre = viewport.width / 2
      expect(Math.abs(boite.x + boite.width / 2 - centre)).toBeLessThan(20)
      expect(Math.abs(vs.x + vs.width / 2 - centre)).toBeLessThan(20)
    })
  })
}

/**
 * « Duel suivant » ne bouge jamais à l'écran (les joueurs rapides le touchent sans regarder) : ni après le
 * défilement automatique vers l'explication, ni en remontant vers les cartes, ni tout en bas de la page.
 * Tout en bas, le pied de page (Comment ça marche ?, En savoir plus) remonte au-dessus du bouton, sans être caché.
 */
test.describe('téléphone : « Duel suivant »', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

  test('reste au même endroit de l’écran, et laisse le pied de page accessible', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Partie libre' }).click()
    const auDuel = page.getByRole('button', { name: 'Au Duel !' })
    if (await auDuel.isVisible()) await auDuel.click()
    await page.locator('.duel__cartes .carte').first().click()
    const suivant = page.getByRole('button', { name: 'Duel suivant →' })
    // Le défilement automatique vers l'explication (1,5 s après le choix) est terminé.
    await expect(page.locator('.duel__resultat')).toBeFocused()
    await page.waitForTimeout(800)
    const position = async () => (await suivant.boundingBox())?.y
    const apresDefilementAuto = await position()

    await page.evaluate(() => window.scrollTo(0, 0))
    expect(await position()).toBe(apresDefilementAuto)

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    expect(await position()).toBe(apresDefilementAuto)

    // Tout en bas : chaque lien du pied de page est au-dessus de la barre, et c'est bien lui qu'on touche.
    const barre = await page.locator('.duel__suite').boundingBox()
    for (const lien of [
      page.getByRole('contentinfo').getByRole('button', { name: 'Comment ça marche ?' }),
      page.getByRole('contentinfo').getByRole('link', { name: 'En savoir plus' }),
    ]) {
      const boite = await lien.boundingBox()
      if (!boite || !barre) throw new Error('pied de page ou barre introuvable')
      expect(boite.y + boite.height).toBeLessThanOrEqual(barre.y)
    }
    await page.getByRole('contentinfo').getByRole('button', { name: 'Comment ça marche ?' }).click({ trial: true })
  })
})
