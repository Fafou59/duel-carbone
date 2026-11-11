/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // PROTOTYPE (branche prototype/accueil, jamais fusionnée) : une deuxième page, construite avec le jeu.
  build: {
    rollupOptions: {
      input: { jeu: 'index.html', prototype: 'prototype-accueil.html' },
    },
  },
  test: {
    // jsdom simule un navigateur dans Node.js, pour tester les composants React sans ouvrir de vraie page.
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
