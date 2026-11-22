import { expect, test } from '@playwright/test'
import { jouerUnDuel, tabulerJusqua, verifierAccessibilite } from './outils.ts'

/**
 * Le Conseil de fin de Partie (issue 88), dans un vrai navigateur : il arrive sous les boutons de partage, son lien
 * « En savoir plus » s'atteint au clavier et mène à une page de l'ADEME, et l'écran reste accessible.
 */
for (const theme of ['light', 'dark'] as const) {
  test.describe(`mode ${theme === 'light' ? 'clair' : 'sombre'}`, () => {
    test.use({ colorScheme: theme })

    test('un Conseil sous le partage, et son lien vers l’ADEME au clavier', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Partie libre' }).first().click()
      for (let n = 1; n <= 10; n++) {
        await jouerUnDuel(page, n)
        await page.keyboard.press('Enter')
      }
      await expect(page.getByRole('heading', { level: 2, name: 'Partie terminée !' })).toBeVisible()

      const conseil = page.getByRole('complementary', { name: 'Un conseil' })
      await expect(conseil).toBeVisible()
      // Sous les boutons de partage.
      const partage = await page.getByRole('button', { name: 'Partager mon score' }).boundingBox()
      const carte = await conseil.boundingBox()
      expect(carte!.y).toBeGreaterThan(partage!.y)

      // Le lien s'atteint au clavier, avec un focus visible, et s'ouvre dans un nouvel onglet sur une page de l'ADEME.
      await page.getByRole('heading', { level: 2, name: 'Partie terminée !' }).focus()
      await tabulerJusqua(page, /^En savoir plus sur (Nos Gestes Climat|Impact CO2)$/)
      const lien = conseil.getByRole('link')
      await expect(lien).toHaveAttribute('href', /^https:\/\/(nosgestesclimat\.fr\/actions\/|impactco2\.fr\/)/)
      await expect(lien).toHaveAttribute('target', '_blank')

      await verifierAccessibilite(page, 'fin de Partie, avec le Conseil')
    })
  })
}
