/**
 * npm run calibrer : calcule les Coefficients d'équilibrage des Gestes et les écrit dans
 * src/donnees/coefficients.json, avec l'empreinte du tirage (voir src/domaine/equilibrage.ts).
 *
 * À relancer après toute modification du catalogue (gestes.ts), des valeurs ADEME (npm run import le fait tout seul)
 * ou des règles (regles.ts). Si on l'oublie, un test le signale et la CI refuse la modification.
 * Le calcul est reproductible : mêmes données, mêmes coefficients.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  calibrerCoefficients,
  empreinteDuTirage,
  frequencesDApparition,
  indicateursDeDiversite,
  type Calibrage,
} from '../src/domaine/equilibrage.ts'
import { calculerGeste } from '../src/domaine/geste.ts'
import { DUELS_THEMATIQUES } from '../src/donnees/duels-thematiques.ts'
import { GESTES } from '../src/donnees/gestes.ts'
import type { Instantane } from '../src/donnees/referentiel.ts'
import { PARTIES_MEMORISEES } from '../src/navigateur/taille-memoire.ts'

const FICHIER = fileURLToPath(new URL('../src/donnees/coefficients.json', import.meta.url))
const instantane = JSON.parse(
  readFileSync(fileURLToPath(new URL('../src/donnees/instantane.json', import.meta.url)), 'utf8'),
) as Instantane
const gestes = GESTES.map((g) => calculerGeste(g, instantane))

const debut = Date.now()
console.log(`Calibrage des Coefficients d'équilibrage (${gestes.length} Gestes)…`)
const coefficients = calibrerCoefficients(gestes, {
  partiesMemorisees: PARTIES_MEMORISEES,
  thematiques: DUELS_THEMATIQUES,
  iterations: 8,
  partiesParIteration: 3000,
  graine: 1,
})
const calibrage: Calibrage = { empreinte: empreinteDuTirage(gestes, DUELS_THEMATIQUES), coefficients }
writeFileSync(FICHIER, JSON.stringify(calibrage, null, 2) + '\n', 'utf8')
console.log(`  ✓ ${Object.keys(coefficients).length} coefficients écrits en ${Math.round((Date.now() - debut) / 1000)} s`)

// Contrôle sur d'autres Parties que celles du calibrage
const controle = { parties: 4000, partiesMemorisees: PARTIES_MEMORISEES, graine: 99, thematiques: DUELS_THEMATIQUES }
const pourcent = (x: number) => `${(x * 100).toFixed(1)} %`
for (const [nom, c] of [
  ['sans coefficient', {}],
  ['avec coefficients', coefficients],
] as const) {
  const d = indicateursDeDiversite(frequencesDApparition(gestes, { ...controle, coefficients: c }))
  console.log(
    `  ${nom.padEnd(18)} moins vu : ${d.moinsVu.id} ${pourcent(d.moinsVu.frequence)} (${Math.round((d.moinsVu.frequence / d.moyenne) * 100)} % de la moyenne)` +
      ` · plus vu : ${d.plusVu.id} ${pourcent(d.plusVu.frequence)} · moyenne ${pourcent(d.moyenne)} · écart-type ${(d.ecartType * 100).toFixed(1)}`,
  )
}
const tries = Object.entries(coefficients).sort((a, b) => b[1] - a[1])
console.log(`  coefficients les plus forts : ${tries.slice(0, 3).map(([id, c]) => `${id} ×${c}`).join(', ')}`)
console.log(`  coefficients les plus faibles : ${tries.slice(-3).map(([id, c]) => `${id} ×${c}`).join(', ')}`)
