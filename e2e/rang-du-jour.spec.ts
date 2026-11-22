import { expect, test, type Page } from '@playwright/test'
import { jouerUnDuel, verifierAccessibilite } from './outils.ts'

/**
 * Le Rang du jour (issue 87), dans un vrai navigateur. Le site est servi par Vite, sans le serveur du Worker :
 * on remplace donc /api/rang-du-jour par un faux serveur (page.route), qui répond comme le vrai.
 * Le serveur lui-même est testé à part (serveur/api.test.ts), avec une vraie base SQLite.
 */

/** 213 joueurs du jour, au moins un par score : le Rang s'affiche quel que soit le score du joueur. */
const EFFECTIFS = [1, 3, 7, 15, 26, 38, 44, 37, 24, 12, 6]

const PHRASE_DU_RANG = /des joueurs du jour jusqu’ici|Sans-faute|Revanche demain/

/** Branche le faux serveur ; renvoie les envois reçus. `enPanne` : il répond 503, comme une base injoignable. */
async function fauxServeur(page: Page, numeroDuJour: () => number, { enPanne = false } = {}) {
  const envois: { numero: number; choix: string[] }[] = []
  await page.route('**/api/rang-du-jour', (route) => {
    const requete = route.request()
    const envoi = requete.method() === 'POST' ? (requete.postDataJSON() as { numero: number; choix: string[] }) : null
    if (envoi) envois.push(envoi)
    if (enPanne) return route.fulfill({ status: 503, json: { erreur: 'base indisponible' } })
    // Comme le vrai serveur, il répond avec le numéro du Duel du jour.
    return route.fulfill({ json: { numero: envoi?.numero ?? numeroDuJour(), effectifs: EFFECTIFS } })
  })
  return envois
}

/** Joue le Duel du jour jusqu'à l'écran de fin, au clavier ; rend son numéro. */
async function jouerLeDuelDuJour(page: Page): Promise<number> {
  const jouer = page.getByRole('button', { name: /^Jouer le Duel du jour n° \d+$/ })
  await expect(jouer).toBeEnabled()
  const numero = Number((await jouer.textContent())?.match(/\d+/)?.[0])
  await jouer.click()
  for (let n = 1; n <= 10; n++) {
    await jouerUnDuel(page, n, n % 2 ? '1' : '2')
    await page.keyboard.press('Enter')
  }
  await expect(page.getByRole('heading', { level: 2, name: `Duel Carbone du jour n° ${numero}` })).toBeVisible()
  return numero
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`mode ${theme === 'light' ? 'clair' : 'sombre'}`, () => {
    test.use({ colorScheme: theme })

    test('le Rang du jour s’affiche sous le score, puis sur l’accueil', async ({ page }) => {
      let numero = 0
      const envois = await fauxServeur(page, () => numero)
      await page.goto('/')
      numero = await jouerLeDuelDuJour(page)

      // Un seul envoi : le numéro du Duel du jour et les 10 Gestes choisis, rien d'autre.
      await expect(page.locator('.fin .rang-du-jour')).toHaveText(PHRASE_DU_RANG)
      expect(envois).toHaveLength(1)
      expect(Object.keys(envois[0]).sort()).toEqual(['choix', 'numero'])
      expect(envois[0].numero).toBe(numero)
      expect(envois[0].choix).toHaveLength(10)
      await verifierAccessibilite(page, 'fin du Duel du jour, avec le Rang du jour')

      // Sur l'accueil, le Rang se relit (sans nouvel envoi).
      await page.getByRole('link', { name: 'Duel Carbone' }).click()
      await expect(page.locator('.accueil .rang-du-jour')).toHaveText(PHRASE_DU_RANG)
      await verifierAccessibilite(page, 'accueil, avec le Rang du jour')

      // Et quand on revoit son Récapitulatif.
      await page.getByRole('button', { name: 'Revoir mon Récapitulatif' }).click()
      await expect(page.locator('.fin .rang-du-jour')).toHaveText(PHRASE_DU_RANG)
      expect(envois).toHaveLength(1)
    })
  })
}

test('serveur en panne : le Duel du jour se joue normalement, sans Rang', async ({ page }) => {
  const envois = await fauxServeur(page, () => 0, { enPanne: true })
  await page.goto('/')
  await jouerLeDuelDuJour(page)
  await expect.poll(() => envois.length).toBe(1)
  await expect(page.locator('.fin__score')).toBeVisible()
  await expect(page.getByText(PHRASE_DU_RANG)).toHaveCount(0)
})

test('la Partie libre n’appelle jamais le serveur', async ({ page }) => {
  let appels = 0
  await page.route('**/api/**', (route) => {
    appels++
    return route.fulfill({ status: 503 })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Partie libre' }).first().click()
  for (let n = 1; n <= 10; n++) {
    await jouerUnDuel(page, n)
    await page.keyboard.press('Enter')
  }
  await expect(page.getByRole('heading', { level: 2, name: 'Partie terminée !' })).toBeVisible()
  expect(appels).toBe(0)
})
