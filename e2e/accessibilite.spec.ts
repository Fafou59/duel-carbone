import { expect, test, type Page } from '@playwright/test'
import { GESTES } from '../src/donnees/gestes.ts'
import { attendreLesAnimations, jouerUnDuel, verifierAccessibilite } from './outils.ts'

/**
 * L'accessibilité de chaque écran (ticket #18), vérifiée automatiquement :
 * - les règles WCAG 2.2 A et AA testables par un robot (axe-core), en mode clair et en mode sombre ;
 * - le zoom à 200 % : la page se lit sans défiler sur le côté ;
 * - le réglage « réduire les animations » : plus rien ne bouge en continu.
 * Le reste (lecteur d'écran, sens des annonces) se vérifie à la main : voir docs/accessibilite.md.
 */

/** Joue une Partie libre jusqu'à l'écran de fin, au clavier. */
async function jouerJusquALaFin(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Partie libre' }).first().click()
  for (let n = 1; n <= 10; n++) {
    await jouerUnDuel(page, n)
    await page.keyboard.press('Enter')
  }
  await expect(page.getByRole('heading', { level: 2, name: 'Partie terminée !' })).toBeVisible()
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`mode ${theme === 'light' ? 'clair' : 'sombre'}`, () => {
    test.use({ colorScheme: theme })

    test('accueil, tutoriel et En savoir plus', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('button', { name: /Jouer le Duel du jour/ })).toBeEnabled()
      await verifierAccessibilite(page, 'accueil')

      await page.getByRole('button', { name: 'Comment ça marche ?' }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await verifierAccessibilite(page, 'tutoriel')
      await page.keyboard.press('Escape')

      await page.goto('/#en-savoir-plus')
      await expect(page.getByRole('heading', { level: 2, name: 'En savoir plus' })).toBeVisible()
      await verifierAccessibilite(page, 'En savoir plus')
    })

    test('Duel : la question, puis la réponse et son explication', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Partie libre' }).first().click()
      await expect(page.getByText('Duel 1/10', { exact: true })).toBeVisible()
      await verifierAccessibilite(page, 'Duel (question)')

      // Une bonne réponse et une mauvaise : les deux verdicts, en vert et en rouge, doivent rester lisibles.
      await jouerUnDuel(page, 1, '1')
      await verifierAccessibilite(page, 'Duel (réponse)')
      await page.keyboard.press('Enter')
      await jouerUnDuel(page, 2, '2')
      await verifierAccessibilite(page, 'Duel (réponse)')
    })

    test('fin de Partie et détail d’un Duel du Récapitulatif', async ({ page }) => {
      await page.goto('/')
      await jouerJusquALaFin(page)
      await verifierAccessibilite(page, 'fin de Partie')

      await page.locator('.recap__case').first().click()
      await expect(page.getByRole('dialog', { name: 'Détail du Duel 1' })).toBeVisible()
      await verifierAccessibilite(page, 'détail d’un Duel')
    })

    test.describe('sur un téléphone sans fenêtre d’installation (Firefox Android)', () => {
      test.use({
        userAgent: 'Mozilla/5.0 (Android 15; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0',
        viewport: { width: 390, height: 844 },
      })

      test('fin du Duel du jour : l’invitation à installer, étapes dépliées', async ({ page }) => {
        await page.goto('/')
        const jouer = page.getByRole('button', { name: /^Jouer le Duel du jour/ })
        await expect(jouer).toBeEnabled()
        await jouer.click()
        for (let n = 1; n <= 10; n++) {
          await jouerUnDuel(page, n)
          await page.keyboard.press('Enter')
        }
        const invitation = page.getByRole('region', { name: 'Reviens demain en un geste' })
        await invitation.getByRole('button', { name: 'Comment l’installer ?' }).click()
        await expect(invitation.getByRole('listitem')).toHaveCount(3)
        await verifierAccessibilite(page, 'fin du Duel du jour, étapes d’installation')
      })
    })
  })
}

test.describe('zoom à 200 %', () => {
  // Un écran de 640 px de large zoomé à 200 % : la page fait 320 px de large (WCAG 1.4.10, « Redistribution »).
  test.use({ viewport: { width: 320, height: 640 } })

  const sansDefilementHorizontal = async (page: Page, ecran: string) => {
    await attendreLesAnimations(page)
    const { page: largeur, ecran: visible } = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      ecran: document.documentElement.clientWidth,
    }))
    expect(largeur, `l'écran « ${ecran} » déborde sur le côté`).toBeLessThanOrEqual(visible)
  }

  test('chaque écran se lit sans défiler sur le côté', async ({ page }) => {
    await page.goto('/')
    await sansDefilementHorizontal(page, 'accueil')
    await page.getByRole('button', { name: 'Partie libre' }).first().click()
    await jouerUnDuel(page, 1)
    await sansDefilementHorizontal(page, 'Duel (réponse)')
    await page.keyboard.press('Enter')
    for (let n = 2; n <= 10; n++) {
      await jouerUnDuel(page, n)
      await sansDefilementHorizontal(page, `Duel ${n} (réponse)`)
      await page.keyboard.press('Enter')
    }
    await sansDefilementHorizontal(page, 'fin de Partie')
    await page.goto('/#en-savoir-plus')
    await sansDefilementHorizontal(page, 'En savoir plus')
  })

  /*
   * Les Duels de la Partie libre sont tirés au hasard : le test ci-dessus ne croise qu'une dizaine de Gestes.
   * Ici, chaque titre du catalogue passe tour à tour dans l'en-tête du tableau « D'où viennent ces émissions ? »,
   * dont les colonnes de chiffres sont étroites (environ 60 px à 320 px) : un mot long comme « cheeseburger »
   * ne doit pas sortir de sa colonne. On le vérifie dans la dernière colonne, collée au bord de l'écran.
   */
  test('chaque titre de Geste tient dans sa colonne du tableau de répartition', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Partie libre' }).first().click()
    await jouerUnDuel(page, 1)
    await attendreLesAnimations(page)
    const titres = GESTES.map((geste) => geste.titre)
    const debordements = await page.evaluate((titres) => {
      const colonne = [...document.querySelectorAll('.repartition__geste')].at(-1)
      if (!colonne?.parentElement) return ['tableau de répartition introuvable']
      const cellule = colonne.parentElement
      const texte = document.createRange()
      return titres.flatMap((titre) => {
        colonne.textContent = titre
        texte.selectNodeContents(colonne)
        // Le bord droit de la zone de texte de la cellule (sans sa marge intérieure).
        const limite = cellule.getBoundingClientRect().right - parseFloat(getComputedStyle(cellule).paddingRight)
        const depassement = texte.getBoundingClientRect().right - limite
        return depassement > 0.5 ? [`« ${titre} » dépasse de ${depassement.toFixed(1)} px`] : []
      })
    }, titres)
    expect(debordements).toEqual([])
  })
})

test.describe('réglage « réduire les animations »', () => {
  test.use({ reducedMotion: 'reduce' })

  /** Les animations encore en cours un instant après l'affichage (celles qui tournent en boucle, surtout). */
  const animationsEnCours = (page: Page) =>
    page.evaluate(() =>
      document
        .getAnimations()
        .filter((animation) => animation.playState === 'running')
        .map((animation) => (animation.effect as KeyframeEffect | null)?.target?.className ?? '?'),
    )

  test('plus rien ne bouge en continu, ni sur l’accueil ni pendant un Duel', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(500)
    expect(await animationsEnCours(page)).toEqual([])

    await page.getByRole('button', { name: 'Partie libre' }).first().click()
    await jouerUnDuel(page, 1)
    await page.waitForTimeout(500)
    expect(await animationsEnCours(page)).toEqual([])
    // Pas d'éclat de confettis : aucun dessin ajouté par-dessus la page.
    await expect(page.locator('canvas')).toHaveCount(0)
  })
})

test('un toucher arrête les icônes qui défilent, un second les relance (WCAG 2.2.2)', async ({ page }) => {
  await page.goto('/')
  const vitrine = page.getByRole('button', { name: 'Mettre en pause le défilement des icônes' })
  const etats = () =>
    page.evaluate(() => [...new Set(document.getAnimations().filter((a) => a.effect?.getTiming().iterations === Infinity).map((a) => a.playState))])
  await expect.poll(etats).toEqual(['running'])
  await vitrine.click()
  await expect(vitrine).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(etats).toEqual(['paused'])
  // Au clavier aussi : Entrée relance le défilement.
  await vitrine.press('Enter')
  await expect(vitrine).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(etats).toEqual(['running'])
})
