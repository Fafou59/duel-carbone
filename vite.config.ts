import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // L'application installable et jouable hors ligne (ticket #16) : le manifeste et le service worker.
    VitePWA({
      // « prompt » : une nouvelle version attend qu'on l'applique. C'est le jeu qui décide quand (sur l'accueil,
      // jamais en pleine Partie) : voir src/navigateur/mise-a-jour.ts.
      registerType: 'prompt',
      // Le service worker est enregistré par notre code (mise-a-jour.ts), pas par un script ajouté à la page.
      injectRegister: false,
      manifest: {
        id: '/',
        name: 'Duel Carbone',
        short_name: 'Duel Carbone',
        description: 'Lequel émet le plus ? Un jeu pour deviner quel geste du quotidien émet le plus de CO2e. Chiffres de l’ADEME.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#1F6F50',
        background_color: '#F6F4EE',
        categories: ['games', 'education'],
        icons: [
          { src: '/application/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/application/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/application/icone-masquable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout le jeu est gardé en copie à la première visite (environ 1 Mo) : le code, les styles, le calendrier
        // des Duels du jour et les icônes. Une Partie se joue ensuite sans réseau.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // Les copies d'une ancienne version sont effacées dès que la nouvelle prend la main.
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    // jsdom simule un navigateur dans Node.js, pour tester les composants React sans ouvrir de vraie page.
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Vitest ne lance pas les tests de bout en bout (Playwright, dossier e2e), ni les copies du projet rangées
    // dans .claude/worktrees (les sessions parallèles).
    exclude: [...configDefaults.exclude, 'e2e/**', '.claude/**'],
  },
})
