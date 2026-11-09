/**
 * npm run analyse:paires : le catalogue offre-t-il assez de paires dans chaque tranche de Difficulté ?
 * Compte les paires par tranche, puis simule 1 000 Parties pour voir combien de fois
 * le générateur doit assouplir les règles. Outil d'aide pour enrichir le catalogue (ticket #12).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { difficulteAttendue, type Difficulte } from '../src/domaine/difficulte.ts'
import { rapport } from '../src/domaine/duel.ts'
import { estCombinaisonInterdite, genererPartie, pairesJouables, type NiveauDeTirage } from '../src/domaine/generateur.ts'
import { calculerGeste } from '../src/domaine/geste.ts'
import { hasardReproductible } from '../src/domaine/hasard.ts'
import { REGLES } from '../src/domaine/regles.ts'
import { GESTES } from '../src/donnees/gestes.ts'
import type { Instantane } from '../src/donnees/referentiel.ts'

const instantane = JSON.parse(
  readFileSync(fileURLToPath(new URL('../src/donnees/instantane.json', import.meta.url)), 'utf8'),
) as Instantane
const gestes = GESTES.map((g) => calculerGeste(g, instantane))

// 1. Paires par tranche, telles que le générateur les voit (même fonction : les deux ne peuvent pas diverger)
const parTranche: Record<Difficulte, number> = { facile: 0, moyen: 0, difficile: 0, ultime: 0 }
for (const { rapport: r } of pairesJouables(gestes)) {
  const tranche = (Object.keys(REGLES.tranches) as Difficulte[]).find(
    (d) => r >= REGLES.tranches[d].min && r < REGLES.tranches[d].max,
  )
  if (tranche) parTranche[tranche]++
}
// Ce qui est écarté, pour comprendre les écarts avec le nombre total de paires
let interdites = 0
let sousLePlancher = 0
const tirables = gestes.filter((g) => !g.seulementEnDuelThematique)
for (let i = 0; i < tirables.length; i++) {
  for (let j = i + 1; j < tirables.length; j++) {
    const duel = { a: tirables[i], b: tirables[j] }
    if (estCombinaisonInterdite(duel)) interdites++
    else if (rapport(duel) < REGLES.plancher) sousLePlancher++
  }
}
const total = (gestes.length * (gestes.length - 1)) / 2
console.log(`${gestes.length} Gestes (dont ${gestes.length - tirables.length} réservé(s) aux Duels thématiques), ${total} paires possibles :`)
for (const [tranche, n] of Object.entries(parTranche)) console.log(`  ${tranche.padEnd(24)} ${String(n).padStart(4)} paires`)
console.log(`  ${'combinaisons interdites'.padEnd(24)} ${String(interdites).padStart(4)} paires`)
console.log(`  ${'sous le plancher'.padEnd(24)} ${String(sousLePlancher).padStart(4)} paires`)

// 2. Simulation de 1 000 Parties
const PARTIES = 1000
const niveaux: Record<NiveauDeTirage, number[]> = {
  regle: Array(REGLES.nombreDeDuels).fill(0),
  'paire-recente': Array(REGLES.nombreDeDuels).fill(0),
  'tranche-voisine': Array(REGLES.nombreDeDuels).fill(0),
}
for (let graine = 0; graine < PARTIES; graine++) {
  genererPartie({ gestes, hasard: hasardReproductible(graine) }).forEach((d, i) => niveaux[d.niveau][i]++)
}
console.log(`\nSur ${PARTIES} Parties simulées, part des Duels tirés hors de leur tranche (« tranche voisine ») :`)
for (let i = 0; i < REGLES.nombreDeDuels; i++) {
  const part = Math.round((niveaux['tranche-voisine'][i] / PARTIES) * 100)
  console.log(`  Duel ${String(i + 1).padStart(2)} (${difficulteAttendue(i).padEnd(9)}) : ${String(part).padStart(3)} %`)
}
