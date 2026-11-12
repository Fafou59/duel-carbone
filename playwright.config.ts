import { defineConfig, devices } from '@playwright/test'

/**
 * Les tests de bout en bout (ticket #18) : un robot pilote un vrai navigateur (Chromium), comme un joueur.
 * Ils jouent sur le site construit (npm run build), servi en local par `vite preview`.
 * Lancement : npm run e2e (le site est construit et servi automatiquement).
 */
const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  // Dans l'intégration continue : un test qui échoue est relancé une fois, et un test.only oublié fait échouer.
  retries: process.env.CI ? 1 : 0,
  // Une Partie complète, plus l'analyse de chaque écran : 30 s ne suffisent pas toujours sur une machine chargée.
  timeout: 90_000,
  // Chaque vérification attend jusqu'à 15 s (5 s par défaut) : sous charge, le calendrier peut tarder à arriver.
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    // Le service worker (mode hors ligne) garderait des copies d'une version à l'autre : on le coupe pendant les tests.
    serviceWorkers: 'block',
    // En cas d'échec : une trace (captures, réseau, console) à rejouer avec `npx playwright show-trace`.
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
