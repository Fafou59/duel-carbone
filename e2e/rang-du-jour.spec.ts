import { expect, test, type Page } from '@playwright/test'
import { jouerUnDuel, verifierAccessibilite } from './outils.ts'

/**
 * Le Rang du jour (issue 87), dans un vrai navigateur. Le site est servi par Vite, sans le serveur du Worker :
 * on remplace donc /api/rang-du-jour par un faux serveur (page.route), qui répond comme le vrai.
 * Le serveur lui-même est testé à part (serveur/api.test.ts), avec une vraie base SQLite.
 */

/** 213 joueurs du jour, au moins un par score : le Rang s'affiche quel que soit le score du joueur. */
const EFFECTIFS = [1, 3, 7, 15, 26, 38, 44, 37, 24, 12, 6]

const PHRASE_DU_RANG = /des joueurs jusqu’ici|Sans-faute|Revanche demain/

/** Les comptes des paires demandées : 10 réponses chacune, dont 7 fausses (70 %). */
const comptesDe = (cles: string[]) => Object.fromEntries(cles.map((cle) => [cle, { reponses: 10, fausses: 7 }]))

/** Branche le faux serveur ; renvoie les envois reçus. `enPanne` : il répond 503, comme une base injoignable. */
async function fauxServeur(page: Page, numeroDuJour: () => number, { enPanne = false } = {}) {
  const envois: { numero: number; choix: string[] }[] = []
  // Le Taux d'erreur (ADR 0006) : au lancement, le jeu demande les comptes des 10 paires de la Partie.
  await page.route('**/api/taux-d-erreur?*', (route) => {
    if (enPanne) return route.fulfill({ status: 503, json: { erreur: 'base indisponible' } })
    const cles = (new URL(route.request().url()).searchParams.get('paires') ?? '').split(',')
    return route.fulfill({ json: { paires: comptesDe(cles) } })
  })
  await page.route('**/api/rang-du-jour', (route) => {
    const requete = route.request()
    const envoi = requete.method() === 'POST' ? (requete.postDataJSON() as { numero: number; choix: string[] }) : null
    if (envoi) envois.push(envoi)
    if (enPanne) return route.fulfill({ status: 503, json: { erreur: 'base indisponible' } })
    // Comme le vrai serveur, il répond avec le numéro du Duel du jour (et, après un envoi, les comptes à jour).
    return route.fulfill({ json: { numero: envoi?.numero ?? numeroDuJour(), effectifs: EFFECTIFS, paires: {} } })
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

    test('le Taux d’erreur s’affiche à la révélation de chaque Duel, puis dans le Récapitulatif', async ({ page }) => {
      let numero = 0
      await fauxServeur(page, () => numero)
      await page.goto('/')
      const jouer = page.getByRole('button', { name: /^Jouer le Duel du jour n° \d+$/ })
      await expect(jouer).toBeEnabled()
      numero = Number((await jouer.textContent())?.match(/\d+/)?.[0])
      await jouer.click()
      // Rien avant le choix : le chiffre ne souffle pas la réponse.
      await expect(page.getByText('Duel 1/10', { exact: true })).toBeVisible()
      await expect(page.locator('.comme-toi')).toHaveCount(0)
      const bon = await jouerUnDuel(page, 1)
      // 70 % de réponses fausses : « 30 % comme toi » si le joueur a trouvé, « 70 % comme toi » sinon, sur la ligne du verdict.
      await expect(page.locator('.duel__verdict .comme-toi')).toContainText(new RegExp(`^, ${bon ? 30 : 70}\\s% comme toi`))
      await verifierAccessibilite(page, 'révélation d’un Duel, avec le Taux d’erreur')
      await page.keyboard.press('Enter')
      for (let n = 2; n <= 10; n++) {
        await jouerUnDuel(page, n)
        await page.keyboard.press('Enter')
      }
      await expect(page.locator('.recap__taux')).toHaveCount(10)
      await expect(page.locator('.recap__taux').first()).toContainText(/(30|70)\s% comme toi/)
      await verifierAccessibilite(page, 'fin du Duel du jour, avec les Taux d’erreur')
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
