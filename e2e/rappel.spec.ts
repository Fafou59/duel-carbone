import { expect, test, type Page } from '@playwright/test'
import { jouerUnDuel, tabulerJusqua, verifierAccessibilite } from './outils.ts'

/**
 * La carte « Ne rate pas le Duel de demain » (Rappel du matin, ADR 0008), dans un vrai navigateur, au clavier.
 * Le site est servi par Vite, sans le serveur : un faux serveur donne la clé VAPID (page.route). Le service worker
 * est bloqué (playwright.config.ts). Le navigateur répond « denied » sans rien montrer, comme Firefox réglé sur
 * « Notifications : Bloqué » (constaté par le prototype du ticket 144) : c'est justement le cas où la carte doit dire
 * que le Rappel n'est pas activé.
 * L'abonnement et l'envoi se testent à part (src/navigateur/rappel.test.ts, serveur/rappel.test.ts), et sur un
 * vrai téléphone depuis l'aperçu de la branche.
 */

const CLE = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'

async function jouerLeDuelDuJour(page: Page): Promise<void> {
  // Le refus silencieux de Firefox (Chromium sans écran, lui, répond « default », comme une fenêtre fermée).
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { get: () => 'denied' })
    Notification.requestPermission = async () => 'denied'
  })
  await page.route('**/api/rappel/cle', (route) => route.fulfill({ json: { cle: CLE } }))
  await page.goto('/')
  const jouer = page.getByRole('button', { name: /^Jouer le Duel du jour n° \d+$/ })
  await expect(jouer).toBeEnabled()
  await jouer.click()
  for (let n = 1; n <= 10; n++) {
    await jouerUnDuel(page, n)
    await page.keyboard.press('Enter')
  }
}

for (const theme of ['light', 'dark'] as const) {
  test(`le Rappel refusé par le navigateur : la carte le dit, au clavier (mode ${theme === 'light' ? 'clair' : 'sombre'})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme })
    await jouerLeDuelDuJour(page)
    const carte = page.getByRole('region', { name: 'Ne rate pas le Duel de demain' })
    await expect(carte).toContainText('Chaque jour à 7 h, le Rappel du matin t’annonce le nouveau Duel')
    // Elle remplace l'invitation à installer : plus de ligne pour les favoris.
    await expect(page.getByText(/^Pour revenir demain/)).toHaveCount(0)
    await verifierAccessibilite(page, 'fin du Duel du jour, Rappel proposé')

    await tabulerJusqua(page, /^Activer le Rappel$/)
    await page.keyboard.press('Enter')
    await expect(carte.getByRole('status')).toContainText('Le Rappel n’est pas activé : ton navigateur bloque les notifications de Duel Carbone.')
    await expect(carte.getByRole('button', { name: 'Réessayer' })).toBeFocused()
    await verifierAccessibilite(page, 'fin du Duel du jour, Rappel bloqué')

    await tabulerJusqua(page, /^Non merci$/)
    await page.keyboard.press('Enter')
    await expect(carte).toHaveCount(0)
  })
}

test.describe('sur Firefox Android réglé sur « Notifications : Bloqué »', () => {
  test.use({
    userAgent: 'Mozilla/5.0 (Android 15; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0',
    viewport: { width: 390, height: 844 },
  })

  test('la carte dit où changer le réglage', async ({ page }) => {
    await jouerLeDuelDuJour(page)
    const carte = page.getByRole('region', { name: 'Ne rate pas le Duel de demain' })
    await carte.getByRole('button', { name: 'Activer le Rappel' }).click()
    await expect(carte.getByRole('status')).toContainText('⋮ › Paramètres › Permissions des sites › Notifications, et choisis « Demander »')
    await verifierAccessibilite(page, 'fin du Duel du jour, Rappel bloqué sur Firefox Android')
  })
})
