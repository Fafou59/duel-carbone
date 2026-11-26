/**
 * Les tests du Durable Object de la Séance (serveur/objet/), à part des autres : ils tournent dans le vrai moteur
 * des Workers (workerd, en local), avec la configuration de wrangler.jsonc, grâce à @cloudflare/vitest-plugin.
 * On peut ainsi ouvrir de vraies WebSockets vers l'objet, déclencher son alarme tout de suite et simuler sa mise
 * en veille. Les autres tests (vite.config.ts) tournent dans jsdom ou dans Node.
 *
 * Lancement : npm run test:objet (npm test lance les deux).
 */
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: './wrangler.jsonc' },
      // Les migrations de la base D1 (le Taux d'erreur), appliquées par serveur/objet/preparer.ts avant les tests.
      miniflare: {
        bindings: {
          MIGRATIONS: await readD1Migrations('./migrations'),
          // Le moteur local ne connaît pas les juridictions : en test seulement, les Séances s'en passent.
          SEANCE_SANS_JURIDICTION: 'oui',
        },
      },
    })),
  ],
  test: {
    include: ['serveur/objet/**/*.test.ts'],
    setupFiles: ['./serveur/objet/preparer.ts'],
    // Limite connue de l'outil : les WebSockets d'un Durable Object demandent un seul fil d'exécution, sans
    // isolement entre fichiers de test (docs/recherches/durable-objects-seance.md, section 7).
    maxWorkers: 1,
    isolate: false,
  },
})
