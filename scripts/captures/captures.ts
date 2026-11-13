/**
 * npm run captures : les captures d'écran du README (docs/captures/), au format téléphone, en clair et en sombre.
 *
 * Un robot (Playwright) joue un Duel du jour sur le site construit, et photographie l'accueil, un Duel avant et
 * après la réponse, et l'écran de fin. La date est figée sur un jour de test d'avant le lancement (affiché
 * « n° 1 ») : les captures ne dévoilent aucune Partie du jour publique. Les animations sont coupées : relancer
 * le script redonne les mêmes images, tant que le jeu ne change pas.
 */
import { expect, test } from '@playwright/test'

const DOSSIER = 'docs/captures'
const JOUR_DE_TEST = new Date('2026-11-12T10:00:00+01:00')

// L'agent utilisateur d'un téléphone Android : sans lui, le jeu se croirait sur ordinateur (invitation à installer, #68).
const TELEPHONE = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: TELEPHONE })

for (const theme of ['clair', 'sombre'] as const) {
  test(`captures en thème ${theme}`, async ({ page }) => {
    const photographier = (ecran: string) => page.screenshot({ path: `${DOSSIER}/${ecran}-${theme}.png` })
    await page.emulateMedia({ colorScheme: theme === 'clair' ? 'light' : 'dark', reducedMotion: 'reduce' })
    await page.clock.setFixedTime(JOUR_DE_TEST)

    await page.goto('/')
    const jouer = page.getByRole('button', { name: /^Jouer le Duel du jour/ })
    await expect(jouer).toBeEnabled()
    await photographier('accueil')
    await jouer.click()

    for (let n = 1; n <= 10; n++) {
      await expect(page.getByText(`Duel ${n}/10`, { exact: true })).toBeVisible()
      // Un Duel thématique s'ouvre sur son annonce.
      if ((await page.locator('.partie__entete .difficulte--thematique').count()) > 0) {
        await page.getByRole('button', { name: 'Au Duel !' }).click()
      }
      if (n === 1) await photographier('duel')
      await page.keyboard.press('1')
      await expect(page.locator('.duel__verdict')).toBeVisible()
      if (n === 1) {
        await page.evaluate(() => window.scrollTo(0, 0))
        await photographier('reponse')
      }
      await page.getByRole('button', { name: n === 10 ? 'Voir mon score' : 'Duel suivant →' }).click()
    }

    await expect(page.locator('.fin__score')).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 0))
    await photographier('fin')
  })
}
