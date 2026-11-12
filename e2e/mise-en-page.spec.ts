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
