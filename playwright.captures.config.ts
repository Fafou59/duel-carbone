import { defineConfig } from '@playwright/test'
import base from './playwright.config.ts'

/** npm run captures : la même configuration que les tests de bout en bout, pour le script des captures du README. */
export default defineConfig({
  ...base,
  testDir: './scripts/captures',
  testMatch: 'captures.ts',
  retries: 0,
  reporter: 'list',
})
