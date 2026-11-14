import { expect, test } from '@playwright/test'
import { focus, jouerUnDuel, tabulerJusqua, verifierAccessibilite } from './outils.ts'

/**
 * Le parcours principal, sans souris (PRD, histoire 29) : le Duel du jour joué en entier au clavier,
 * avec Tab pour se déplacer, 1 et 2 pour choisir, Entrée pour passer au Duel suivant.
 */
test('le Duel du jour se joue en entier au clavier', async ({ page }) => {
  await page.goto('/')
  // Le bouton s'active une fois le calendrier des Duels du jour arrivé.
  await expect(page.getByRole('button', { name: /^Jouer le Duel du jour/ })).toBeEnabled()

  // L'accueil : Tab jusqu'au bouton du Duel du jour (le focus doit rester visible à chaque étape).
  const jouer = await tabulerJusqua(page, /^Jouer le Duel du jour n° \d+$/)
  const numero = jouer.match(/\d+/)?.[0]
  await page.keyboard.press('Enter')

  let bonnes = 0
  for (let n = 1; n <= 10; n++) {
    if (await jouerUnDuel(page, n, n % 2 ? '1' : '2')) bonnes++

    // Après le premier choix : le focus descend sur le verdict et l'explication, pour qu'un lecteur d'écran
    // les lise dans l'ordre.
    if (n === 1) await expect(focus(page)).toHaveClass(/duel__resultat/)

    // Le bouton de la suite annonce son raccourci, et Entrée l'actionne.
    await expect(page.getByRole('button', { name: n === 10 ? 'Voir mon score' : 'Duel suivant →' })).toHaveAttribute(
      'aria-keyshortcuts',
      'Enter',
    )
    await page.keyboard.press('Enter')
  }

  // La fin : le focus est sur le titre, et le score est celui des réponses données.
  const titre = page.getByRole('heading', { level: 2, name: `Duel Carbone du jour n° ${numero}` })
  await expect(titre).toBeFocused()
  await expect(page.locator('.fin__score')).toHaveText(`${bonnes}/10`)
  // Sur ordinateur, pas de carte d'installation (#68) : une simple ligne pour les favoris, qui passe l'analyse.
  await expect(page.getByText(/^Pour revenir demain : ajoute Duel Carbone à tes favoris \(Ctrl \+ D\)/)).toBeVisible()
  await expect(page.getByRole('region', { name: 'Reviens demain en un geste' })).toHaveCount(0)
  await verifierAccessibilite(page, 'fin du Duel du jour, sur ordinateur')

  // Le Récapitulatif : le détail d'un Duel s'ouvre au clavier, Échap le ferme, et le focus revient sur sa case.
  await tabulerJusqua(page, /Duel 1 \((réussi|raté)\)/)
  const caseDuel1 = page.getByRole('button', { name: /^Duel 1 ?\((réussi|raté)\)/ })
  await expect(caseDuel1).toBeFocused()
  await page.keyboard.press('Enter')
  const detail = page.getByRole('dialog', { name: 'Détail du Duel 1' })
  await expect(detail).toBeVisible()
  await expect(focus(page)).toHaveAccessibleName('Fermer le détail')
  await page.keyboard.press('Escape')
  await expect(detail).toBeHidden()
  await expect(caseDuel1).toBeFocused()

  // Retour à l'accueil par le logo : le tableau de bord du jour (score, grille ✓/✗, série) passe l'analyse.
  await page.getByRole('link', { name: 'Duel Carbone' }).press('Enter')
  await expect(page.getByLabel(`${bonnes} bonnes réponses sur 10`)).toBeVisible()
  await verifierAccessibilite(page, 'accueil, Duel du jour joué')
})

test('une Partie libre se lance et se joue au clavier', async ({ page }) => {
  await page.goto('/')
  // Le jeu a remplacé la présentation sans JavaScript : sinon, le premier Tab pourrait tomber sur une page
  // qui disparaît aussitôt, et le focus retomberait sur le document.
  await expect(page.getByRole('button', { name: /^Partie libre$/ })).toBeVisible()
  await tabulerJusqua(page, /^Partie libre$/)
  await page.keyboard.press('Enter')
  for (let n = 1; n <= 10; n++) {
    await jouerUnDuel(page, n)
    await page.keyboard.press('Enter')
  }
  await expect(page.getByRole('heading', { level: 2, name: 'Partie terminée !' })).toBeFocused()
  // Rejouer, toujours au clavier : une nouvelle Partie commence au Duel 1.
  await tabulerJusqua(page, /^Rejouer$/)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Duel 1/10', { exact: true })).toBeVisible()
})
