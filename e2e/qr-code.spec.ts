import { expect, test } from '@playwright/test'

/**
 * Le QR code du jeu (#98) : l'image est servie telle quelle, et l'arrivée par le QR code (?ref=qr-code) ouvre le
 * jeu avec une adresse propre. Sur le site public, GoatCounter compte d'abord la visite avec sa provenance ; ici
 * (en local), rien n'est compté et l'adresse est nettoyée tout de suite (src/navigateur/mesure.ts).
 */

test('l’image du QR code est servie en SVG', async ({ request }) => {
  const reponse = await request.get('/qr-code.svg')
  expect(reponse.status()).toBe(200)
  expect(reponse.headers()['content-type']).toContain('image/svg+xml')
})

test('l’arrivée par le QR code ouvre le jeu, et « ?ref=qr-code » disparaît de l’adresse', async ({ page }) => {
  await page.goto('/?ref=qr-code')
  await expect(page.getByRole('button', { name: /^Jouer le Duel du jour/ })).toBeVisible()
  await expect(page).toHaveURL(/^http:\/\/[^/]+\/$/)
  // Sans étape de plus dans l'historique : le retour en arrière ramène à la page d'avant (la page vide d'où part
  // Playwright), et non à l'adresse avec sa provenance.
  await page.goBack()
  expect(page.url()).toBe('about:blank')
})
