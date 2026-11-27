import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { tabulerJusqua, verifierAccessibilite } from './outils.ts'

/**
 * Une Séance du Mode animation entière, de bout en bout (PRD du Mode animation, section 8) : un Animateur sur un
 * ordinateur, deux Participants sur leur téléphone, dont un qui se reconnecte en plein Duel (téléphone en veille,
 * onglet fermé puis rouvert). Tout se joue au clavier : Espace pour l'Animateur, 1 et 2 pour les téléphones.
 * Chaque écran passe l'analyse d'accessibilité (axe-core), en mode clair et en mode sombre.
 *
 * Ici, pas de faux serveur : la Séance vit dans son vrai Durable Object, servi en local par `wrangler dev`
 * (le second serveur de playwright.config.ts), avec ses WebSockets.
 */
const SERVEUR_COMPLET = 'http://localhost:8788'

/** Les écrans déjà passés à axe-core : chacun ne l'est qu'une fois par thème (l'analyse prend quelques secondes). */
type Ecrans = Set<string>
async function analyser(page: Page, ecran: string, deja: Ecrans) {
  if (deja.has(ecran)) return
  deja.add(ecran)
  await verifierAccessibilite(page, ecran)
}

/** Le bouton principal de l'écran projeté, dont le texte dit l'étape suivante. */
const boutonPrincipal = (animateur: Page) => animateur.locator('button.an-bouton')

/** L'Animateur appuie sur Espace (le focus est sur la page, pas sur un autre bouton), puis l'écran passe à `suite`. */
async function espace(animateur: Page, suite: RegExp) {
  await expect(boutonPrincipal(animateur)).toBeEnabled()
  await animateur.keyboard.press('Space')
  await expect(boutonPrincipal(animateur)).toHaveText(suite)
}

/** Un Participant scanne le QR code (il arrive sur #rejoindre/<code>), tape son pseudo et rejoint la Séance. */
async function rejoindre(page: Page, code: string, pseudo: string, deja: Ecrans) {
  await page.goto(`/#rejoindre/${code}`)
  await expect(page.getByRole('heading', { name: 'Rejoindre la Séance' })).toBeVisible()
  const champ = page.getByLabel('Ton pseudo (affiché au Classement)')
  await expect(champ).toBeVisible()
  await expect(page.getByLabel('Code de la Séance')).toHaveValue(code)
  await analyser(page, 'téléphone : rejoindre', deja)
  await champ.pressSequentially(pseudo)
  await champ.press('Enter')
  await expect(page.getByRole('heading', { name: `C’est bon, ${pseudo} !` })).toBeVisible()
  await analyser(page, 'téléphone : attente', deja)
}

/** Un Participant répond au Duel affiché avec la touche 1 ou 2, et attend la révélation. */
async function repondre(page: Page, numero: number, touche: '1' | '2') {
  await expect(page.getByText(`Duel ${numero}/10`, { exact: true })).toBeVisible()
  await page.keyboard.press(touche)
  await expect(page.getByText(/Réponse envoyée/)).toBeVisible()
}

async function nouveauContexte(browser: Browser, theme: 'light' | 'dark', largeur: number, hauteur: number): Promise<BrowserContext> {
  return browser.newContext({
    baseURL: SERVEUR_COMPLET,
    colorScheme: theme,
    viewport: { width: largeur, height: hauteur },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    serviceWorkers: 'block',
  })
}

for (const theme of ['light', 'dark'] as const) {
  test(`une Séance entière au clavier, un téléphone qui se reconnecte (mode ${theme === 'light' ? 'clair' : 'sombre'})`, async ({
    browser,
  }) => {
    // 10 Duels, trois écrans à suivre et une dizaine d'analyses d'accessibilité.
    test.setTimeout(240_000)
    const deja: Ecrans = new Set()

    // L'Animateur, sur un ordinateur relié au projecteur (16:9).
    const ordinateur = await nouveauContexte(browser, theme, 1280, 720)
    const animateur = await ordinateur.newPage()
    await animateur.goto('/#animer')
    await expect(animateur.getByRole('heading', { level: 1, name: 'Animer une Séance' })).toBeVisible()
    await analyser(animateur, 'Animateur : explication', deja)
    // « Avec un classement » est déjà choisi : Tab jusqu'au bouton, Entrée.
    await tabulerJusqua(animateur, /^Créer la Séance$/)
    await animateur.keyboard.press('Enter')
    await expect(animateur.getByRole('heading', { name: 'Rejoins la Séance avec ton téléphone' })).toBeVisible()
    const code = (await animateur.locator('.an-rejoindre__code').first().textContent())?.trim() ?? ''
    expect(code).toMatch(/^[A-Z0-9]{6}$/)
    await analyser(animateur, 'Animateur : attente', deja)

    // Deux Participants, chacun sur son téléphone.
    const telephoneDeCamille = await nouveauContexte(browser, theme, 375, 812)
    const telephoneDeLeo = await nouveauContexte(browser, theme, 375, 812)
    const camille = await telephoneDeCamille.newPage()
    let leo = await telephoneDeLeo.newPage()
    await rejoindre(camille, code, 'Camille', deja)
    await rejoindre(leo, code, 'Léo', deja)
    await expect(animateur.getByRole('listitem').filter({ hasText: 'Camille' })).toBeVisible()
    await expect(animateur.getByRole('listitem').filter({ hasText: 'Léo' })).toBeVisible()
    await expect(boutonPrincipal(animateur)).toHaveText(/Lancer le premier Duel/)

    for (let n = 1; n <= 10; n++) {
      // L'Animateur lance le Duel : il s'affiche en même temps sur l'écran projeté et sur les téléphones.
      await espace(animateur, /Révéler la réponse/)
      await expect(animateur.getByText(`Duel ${n}/10`, { exact: true })).toBeVisible()
      await repondre(camille, n, '1')
      if (n === 1) {
        await analyser(animateur, 'Animateur : Duel', deja)
        await analyser(camille, 'téléphone : réponse envoyée', deja)
      }

      if (n === 3) {
        // Le téléphone de Léo se met en veille avant qu'il réponde : l'onglet se ferme, puis se rouvre sur l'adresse
        // du QR code. Le jeton gardé dans le navigateur lui rend sa place, sans repasser par le formulaire.
        await leo.close()
        leo = await telephoneDeLeo.newPage()
        await leo.goto(`/#rejoindre/${code}`)
        await expect(leo.getByText('Duel 3/10', { exact: true })).toBeVisible()
        await expect(leo.getByRole('heading', { name: 'Rejoindre la Séance' })).toHaveCount(0)
      }
      await repondre(leo, n, '2')
      await expect(animateur.getByText(/2\s*\/\s*2 ont répondu/)).toBeVisible()

      // La révélation, partout à la fois.
      await espace(animateur, n < 10 ? /^Voir le classement\b(?! final)/ : /Voir le classement final/)
      for (const telephone of [camille, leo]) {
        await expect(telephone.getByRole('region', { name: 'Explication' })).toBeVisible()
        await expect(telephone.getByText(/de la salle comme toi/)).toBeVisible()
      }
      if (n === 1) {
        await analyser(animateur, 'Animateur : révélation', deja)
        await analyser(camille, 'téléphone : révélation', deja)
      }
      if (n === 10) break

      // Le classement intermédiaire : la place de chacun sur son téléphone.
      await espace(animateur, new RegExp(`Duel ${n + 1}`))
      for (const telephone of [camille, leo]) {
        await expect(telephone.locator('#telephone-classement-titre')).toBeVisible()
      }
      if (n === 1) {
        await analyser(animateur, 'Animateur : classement intermédiaire', deja)
        await analyser(leo, 'téléphone : classement intermédiaire', deja)
      }
    }

    // La fin : le classement final projeté, et sur chaque téléphone le score, la place, le Conseil et le Récapitulatif.
    await espace(animateur, /Rejouer une nouvelle Séance/)
    await expect(animateur.getByRole('heading', { level: 1, name: 'Classement final' })).toBeVisible()
    await analyser(animateur, 'Animateur : classement final', deja)
    for (const telephone of [camille, leo]) {
      await expect(telephone.getByRole('heading', { name: 'Séance terminée !' })).toBeVisible()
      await expect(telephone.getByRole('link', { name: 'Jouer le Duel du jour' })).toHaveAttribute('href', '/?ref=seance')
      await expect(telephone.getByRole('list', { name: 'Récapitulatif' }).getByRole('button')).toHaveCount(10)
    }
    await analyser(leo, 'téléphone : fin de la Séance', deja)

    await Promise.all([ordinateur.close(), telephoneDeCamille.close(), telephoneDeLeo.close()])
  })
}
