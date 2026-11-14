import AxeBuilder from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Appuie sur Tab jusqu'à atteindre l'élément dont le nom correspond, comme un joueur sans souris.
 * À chaque arrêt, l'élément atteint doit montrer un indicateur de focus (un contour) : sinon, le joueur
 * ne saurait pas où il se trouve. Renvoie le texte de l'élément atteint.
 */
export async function tabulerJusqua(page: Page, nom: RegExp, maximum = 40): Promise<string> {
  const vus: string[] = []
  for (let i = 0; i < maximum; i++) {
    await page.keyboard.press('Tab')
    const atteint = await page.evaluate(() => {
      const element = document.activeElement
      // Le focus est sorti de la page (après le dernier élément) : rien n'est atteint.
      if (!element || element === document.body) return null
      const style = getComputedStyle(element)
      const contour = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
      return {
        texte: (element.getAttribute('aria-label') ?? element.textContent ?? '').replace(/\s+/g, ' ').trim(),
        visible: contour || style.boxShadow !== 'none',
      }
    })
    if (!atteint) break
    const { texte, visible } = atteint
    expect(visible, `focus sans contour visible sur « ${texte} »`).toBe(true)
    vus.push(texte)
    if (nom.test(texte)) return texte
  }
  throw new Error(`« ${nom} » introuvable au clavier. Éléments atteints : ${vus.join(' | ')}`)
}

/** L'élément qui a le focus, pour vérifier où se trouve le joueur au clavier. */
export const focus = (page: Page): Locator => page.locator(':focus')

/** Attend la fin des animations d'apparition (pas celles qui tournent en boucle, comme la frise). */
export async function attendreLesAnimations(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  )
}

/**
 * Analyse automatique de l'accessibilité de l'écran affiché (axe-core) : contrastes, noms des boutons,
 * structure des tableaux, rôles ARIA… selon les règles WCAG 2.2 niveaux A et AA.
 */
export async function verifierAccessibilite(page: Page, ecran: string): Promise<void> {
  await attendreLesAnimations(page)
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
    .analyze()
  const resume = violations.map((v) => `${v.id} (${v.impact}) : ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`)
  expect(resume, `Défauts d'accessibilité sur l'écran « ${ecran} »`).toEqual([])
}

/**
 * Joue le Duel affiché au clavier : passe l'annonce s'il est thématique, choisit avec la touche donnée,
 * puis renvoie le verdict (vrai : bonne réponse).
 */
export async function jouerUnDuel(page: Page, numero: number, touche: '1' | '2' = '1'): Promise<boolean> {
  await expect(page.getByText(`Duel ${numero}/10`, { exact: true })).toBeVisible()
  // Un Duel thématique s'ouvre sur son annonce : le focus est sur « Au Duel ! », Entrée la ferme.
  // (On teste la présence de l'étiquette, pas sa visibilité : elle apparaît en grandissant depuis une taille nulle.)
  if ((await page.locator('.partie__entete .difficulte--thematique').count()) > 0) {
    const annonce = page.getByRole('dialog', { name: /Duel thématique/ })
    await expect(annonce).toBeVisible()
    await expect(focus(page)).toHaveText('Au Duel !')
    await page.keyboard.press('Enter')
    await expect(annonce).toBeHidden()
    // Le jeu rend le focus à « Duel n/10 » : tant qu'il est encore dans l'annonce, les touches 1 et 2 lui
    // reviennent (et sont ignorées). On attend donc qu'il soit revenu avant de choisir.
    await expect(focus(page)).toHaveText(`Duel ${numero}/10`)
  }
  await page.keyboard.press(touche)
  const verdict = page.locator('.duel__verdict')
  await expect(verdict).toBeVisible()
  return (await verdict.textContent())?.includes('Bonne réponse') ?? false
}
